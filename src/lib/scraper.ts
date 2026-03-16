import * as cheerio from 'cheerio';
import { getClient } from './db';

const BASE_URL = 'https://results.streetsafe.supply';
const DELAY_MS = 200;

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(url: string, retries = 3): Promise<string> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url);
      if (res.status === 429 || res.status >= 500) {
        await sleep(DELAY_MS * Math.pow(2, i + 1));
        continue;
      }
      return await res.text();
    } catch {
      if (i === retries - 1) throw new Error(`Failed to fetch ${url}`);
      await sleep(DELAY_MS * Math.pow(2, i + 1));
    }
  }
  throw new Error(`Failed to fetch ${url}`);
}

interface ScrapedSample {
  sample_id: string;
  date: string | null;
  city: string | null;
  state: string | null;
  assumed_substance: string | null;
  appearance: string | null;
  method: string | null;
  spectra_url: string | null;
  substances: { name: string; abundance: string | null; peak: number | null }[];
}

function parseDetailPage(html: string, sampleId: string): Partial<ScrapedSample> {
  const $ = cheerio.load(html);
  const text = $('body').text();

  let city: string | null = null;
  let state: string | null = null;
  let date: string | null = null;
  const fromMatch = text.match(/From\s+(.+?)\s+on\s+(\w+\s+\d{1,2},\s+\d{4})/);
  if (fromMatch) {
    const locationParts = fromMatch[1].split(',').map(s => s.trim());
    city = locationParts[0] || null;
    state = locationParts[1] || null;
    try {
      date = new Date(fromMatch[2]).toISOString().split('T')[0];
    } catch { /* ignore */ }
  }

  let assumed: string | null = null;
  const assumedMatch = text.match(/Assumed to be\s+(.+?)(?:\n|$)/i);
  if (assumedMatch) assumed = assumedMatch[1].trim();

  let appearance: string | null = null;
  const looksMatch = text.match(/Looks\s*=\s*(.+?)(?:\n|$)/i);
  if (looksMatch) appearance = looksMatch[1].trim();

  let method: string | null = null;
  const methodMatch = text.match(/Method\(s\):\s*(.+?)(?:\n|$)/i);
  if (methodMatch) method = methodMatch[1].trim();

  const spectra_url = `https://d6mdqn0qagw6t.cloudfront.net/${sampleId}.PNG`;

  return { city, state, date, assumed_substance: assumed, appearance, method, spectra_url };
}

export async function scrapeIncremental(log: (msg: string) => void): Promise<void> {
  const client = getClient();

  let page = 1;
  let newCount = 0;
  let existingCount = 0;
  const MAX_EXISTING = 48;

  while (existingCount < MAX_EXISTING) {
    log(`Fetching listing page ${page}...`);
    const html = await fetchWithRetry(`${BASE_URL}?page=${page}`);
    const $ = cheerio.load(html);

    const sampleIds: string[] = [];
    $('a[href*="/sample/"]').each((_, el) => {
      const href = $(el).attr('href');
      const match = href?.match(/\/sample\/(\d+)/);
      if (match && !sampleIds.includes(match[1])) {
        sampleIds.push(match[1]);
      }
    });

    if (sampleIds.length === 0) {
      log('No more samples found. Done.');
      break;
    }

    for (const sid of sampleIds) {
      const existing = await client.execute({
        sql: 'SELECT sample_id FROM samples WHERE sample_id = ?',
        args: [sid],
      });
      if (existing.rows.length > 0) {
        existingCount++;
        continue;
      }

      await sleep(DELAY_MS);
      try {
        log(`Scraping sample ${sid}...`);
        const detailHtml = await fetchWithRetry(`${BASE_URL}/sample/${sid}`);
        const detail = parseDetailPage(detailHtml, sid);

        await client.execute({
          sql: `INSERT OR REPLACE INTO samples (
            sample_id, date, city, state, assumed_substance,
            fentanyl, heroin, xylazine, medetomidine, acetaminophen,
            has_other, num_other, total_substances,
            appearance, method, spectra_url, scraped_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
          args: [
            sid, detail.date ?? null, detail.city ?? null, detail.state ?? null, detail.assumed_substance ?? null,
            0, 0, 0, 0, 0, 0, 0, 0,
            detail.appearance ?? null, detail.method ?? null, detail.spectra_url ?? null,
          ],
        });

        await client.execute({
          sql: 'DELETE FROM detected_substances WHERE sample_id = ?',
          args: [sid],
        });

        newCount++;
      } catch (e) {
        log(`Error scraping ${sid}: ${(e as Error).message}`);
      }
    }

    page++;
    await sleep(DELAY_MS);
  }

  log(`Done. ${newCount} new samples scraped.`);
}

export async function scrapeFull(log: (msg: string) => void): Promise<void> {
  log('Full scrape starting. This will take a while...');
  await scrapeIncremental(log);
}

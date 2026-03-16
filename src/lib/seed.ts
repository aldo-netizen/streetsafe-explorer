import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { getDb } from './db';

const CSV_PATH = path.join(process.cwd(), 'data', 'streetsafe_samples.csv');

function parseDate(raw: string): string | null {
  if (!raw || !raw.trim()) return null;
  const parts = raw.trim().split('/');
  if (parts.length !== 3) return null;
  const [m, d, y] = parts;
  const year = parseInt(y, 10);
  const fullYear = year < 100 ? 2000 + year : year;
  return `${fullYear}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

function normalizeSubstance(s: string): string {
  return s.trim().toLowerCase();
}

function isValidSubstance(s: string): boolean {
  const trimmed = s.trim();
  if (!trimmed || trimmed.length < 2) return false;
  if (/^\d+$/.test(trimmed)) return false;
  return true;
}

function parseOtherDetails(raw: string): string[] {
  if (!raw || !raw.trim()) return [];
  const cleaned = raw.replace(/^"|"$/g, '').trim();
  if (!cleaned) return [];
  return cleaned.split(',').map(s => s.trim()).filter(Boolean);
}

function main() {
  console.log('Reading CSV...');
  const csvContent = fs.readFileSync(CSV_PATH, 'utf-8');

  const records: Record<string, string>[] = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  });

  console.log(`Parsed ${records.length} records`);

  const db = getDb();

  const insertSample = db.prepare(`
    INSERT OR IGNORE INTO samples (
      sample_id, date, city, assumed_substance,
      fentanyl, heroin, xylazine, medetomidine, acetaminophen,
      has_other, num_other, total_substances
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertSubstance = db.prepare(`
    INSERT INTO detected_substances (sample_id, substance, source)
    VALUES (?, ?, 'csv')
  `);

  const flaggedSubstances = [
    { col: 'Fentanyl (0: no; 1: yes)', name: 'fentanyl' },
    { col: 'Heroin (0:no; 1:yes)', name: 'heroin' },
    { col: 'Xylazine (0:no; 1:yes)', name: 'xylazine' },
    { col: 'Medetomidine (0:no; 1:yes)', name: 'medetomidine' },
    { col: 'Acetaminophen (0:no; 1:yes)', name: 'acetaminophen' },
  ];

  let inserted = 0;
  let substancesInserted = 0;

  const runAll = db.transaction(() => {
    for (const row of records) {
      const sampleId = (row['Sample ID'] || '').trim();
      if (!sampleId) continue;

      const date = parseDate(row['Date'] || '');
      const city = (row['Location'] || row['Location '] || '').trim() || null;
      const assumed = (row['Assumed to be'] || '').trim() || null;

      const fentanyl = parseInt(row['Fentanyl (0: no; 1: yes)'] || '0', 10) || 0;
      const heroin = parseInt(row['Heroin (0:no; 1:yes)'] || '0', 10) || 0;
      const xylazine = parseInt(row['Xylazine (0:no; 1:yes)'] || '0', 10) || 0;
      const medetomidine = parseInt(row['Medetomidine (0:no; 1:yes)'] || '0', 10) || 0;
      const acetaminophen = parseInt(row['Acetaminophen (0:no; 1:yes)'] || '0', 10) || 0;
      const hasOther = parseInt(row['Other (0:no; 1:yes)'] || '0', 10) || 0;
      const numOther = parseInt(row['Number of other substances'] || '0', 10) || 0;
      const totalSubstances = parseInt(row['Total # of Substances'] || '0', 10) || 0;

      insertSample.run(
        sampleId, date, city, assumed,
        fentanyl, heroin, xylazine, medetomidine, acetaminophen,
        hasOther, numOther, totalSubstances
      );
      inserted++;

      // Insert flagged substances into detected_substances
      for (const { col, name } of flaggedSubstances) {
        if (parseInt(row[col] || '0', 10) === 1) {
          insertSubstance.run(sampleId, name);
          substancesInserted++;
        }
      }

      // Parse "Other details" and insert each
      const otherDetails = parseOtherDetails(row['Other details'] || '');
      for (const substance of otherDetails) {
        const normalized = normalizeSubstance(substance);
        if (!isValidSubstance(normalized)) continue;
        insertSubstance.run(sampleId, normalized);
        substancesInserted++;
      }
    }
  });

  runAll();

  console.log(`Inserted ${inserted} samples`);
  console.log(`Inserted ${substancesInserted} substance records`);

  // Verify
  const count = db.prepare('SELECT COUNT(*) as n FROM samples').get() as { n: number };
  const subCount = db.prepare('SELECT COUNT(*) as n FROM detected_substances').get() as { n: number };
  console.log(`Database: ${count.n} samples, ${subCount.n} substance records`);
}

main();

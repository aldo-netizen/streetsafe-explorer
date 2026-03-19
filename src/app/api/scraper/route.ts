import { NextRequest, NextResponse } from 'next/server';
import { scrapeIncremental, scrapeFull } from '@/lib/scraper';

// GET handler for Vercel Cron — runs incremental scrape daily
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const logs: string[] = [];
  const log = (msg: string) => {
    logs.push(msg);
    console.log(`[cron-scraper] ${msg}`);
  };

  try {
    await scrapeIncremental(log);
    return NextResponse.json({ success: true, logs });
  } catch (e) {
    console.error('Cron scraper error:', e);
    return NextResponse.json({ error: (e as Error).message, logs }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const mode = body.mode || 'incremental';

  const logs: string[] = [];
  const log = (msg: string) => {
    logs.push(msg);
    console.log(`[scraper] ${msg}`);
  };

  try {
    if (mode === 'full') {
      await scrapeFull(log);
    } else {
      await scrapeIncremental(log);
    }
    return NextResponse.json({ success: true, logs });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message, logs }, { status: 500 });
  }
}

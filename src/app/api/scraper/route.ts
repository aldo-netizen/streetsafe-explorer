import { NextRequest, NextResponse } from 'next/server';
import { scrapeIncremental, scrapeFull } from '@/lib/scraper';

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

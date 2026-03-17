import { NextResponse } from 'next/server';
import { getClient } from '@/lib/db';
import type { InStatement } from '@libsql/client/http';

function getDateCutoff(period: string): string | null {
  const today = new Date();
  switch (period) {
    case '30d': return new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    case '90d': return new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    case '1y': return new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    default: return null;
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'all';

    const cutoff = getDateCutoff(period);
    const dateWhere = cutoff ? `WHERE date >= ?` : '';
    const dateArgs = cutoff ? [cutoff] : [];

    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Two queries in a single batch: aggregate stats + top substances (pre-computed)
    const client = getClient();
    const statements: InStatement[] = [
      {
        sql: `SELECT
          COUNT(*) as total,
          SUM(fentanyl) as fentanyl_count,
          COUNT(DISTINCT CASE WHEN state IS NOT NULL THEN state END) as state_count,
          COUNT(DISTINCT CASE WHEN city IS NOT NULL THEN city END) as city_count,
          MIN(CASE WHEN date IS NOT NULL THEN date END) as date_min,
          MAX(CASE WHEN date IS NOT NULL THEN date END) as date_max,
          SUM(CASE WHEN date >= ? THEN 1 ELSE 0 END) as recent_count
        FROM samples ${dateWhere}`,
        args: [thirtyDaysAgo, ...dateArgs],
      },
      {
        sql: `SELECT substance as name, sample_count as count
              FROM substance_stats
              ORDER BY sample_count DESC LIMIT 10`,
        args: [],
      },
    ];

    const results = await client.batch(statements, 'read');
    const row = results[0].rows[0];

    const totalN = Number(row?.total ?? 0);
    const fentanylN = Number(row?.fentanyl_count ?? 0);
    const topSubstances = results[1].rows as unknown as { name: string; count: number }[];

    return NextResponse.json({
      totalSamples: totalN,
      fentanylPercent: totalN > 0 ? Math.round((fentanylN / totalN) * 1000) / 10 : 0,
      topSubstances,
      stateCount: Number(row?.state_count ?? 0),
      cityCount: Number(row?.city_count ?? 0),
      dateRange: { min: row?.date_min ?? '', max: row?.date_max ?? '' },
      recentSamples: Number(row?.recent_count ?? 0),
    });
  } catch (e) {
    console.error('Stats API error:', e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

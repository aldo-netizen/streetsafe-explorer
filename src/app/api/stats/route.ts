import { NextResponse } from 'next/server';
import { queryAll, queryOne } from '@/lib/db';

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
  const { searchParams } = new URL(request.url);
  const period = searchParams.get('period') || 'all';

  const cutoff = getDateCutoff(period);
  const dateWhere = cutoff ? `WHERE date >= ?` : '';
  const dateAnd = cutoff ? `AND date >= ?` : '';
  const dateArgs = cutoff ? [cutoff] : [];

  const totalRow = await queryOne(`SELECT COUNT(*) as n FROM samples ${dateWhere}`, dateArgs);
  const totalN = Number(totalRow?.n ?? 0);

  const fentanylRow = await queryOne(
    `SELECT COUNT(*) as n FROM samples ${cutoff ? 'WHERE date >= ? AND' : 'WHERE'} fentanyl = 1`,
    dateArgs
  );
  const fentanylN = Number(fentanylRow?.n ?? 0);

  const topSubstances = await queryAll(`
    SELECT ds.substance as name, COUNT(*) as count
    FROM detected_substances ds
    JOIN samples s ON ds.sample_id = s.sample_id
    ${cutoff ? 'WHERE s.date >= ?' : ''}
    GROUP BY ds.substance
    ORDER BY count DESC
    LIMIT 10
  `, dateArgs);

  const stateRow = await queryOne(
    `SELECT COUNT(DISTINCT state) as n FROM samples ${cutoff ? 'WHERE date >= ? AND' : 'WHERE'} state IS NOT NULL`,
    dateArgs
  );

  const cityRow = await queryOne(
    `SELECT COUNT(DISTINCT city) as n FROM samples ${cutoff ? 'WHERE date >= ? AND' : 'WHERE'} city IS NOT NULL`,
    dateArgs
  );

  const dateRange = await queryOne(
    `SELECT MIN(date) as min, MAX(date) as max FROM samples ${cutoff ? 'WHERE date >= ? AND' : 'WHERE'} date IS NOT NULL`,
    dateArgs
  );

  const today = new Date();
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const recentRow = await queryOne(
    `SELECT COUNT(*) as n FROM samples ${cutoff ? 'WHERE date >= ? AND' : 'WHERE'} date >= ?`,
    [...dateArgs, thirtyDaysAgo]
  );

  return NextResponse.json({
    totalSamples: totalN,
    fentanylPercent: totalN > 0 ? Math.round((fentanylN / totalN) * 1000) / 10 : 0,
    topSubstances,
    stateCount: Number(stateRow?.n ?? 0),
    cityCount: Number(cityRow?.n ?? 0),
    dateRange: { min: dateRange?.min ?? '', max: dateRange?.max ?? '' },
    recentSamples: Number(recentRow?.n ?? 0),
  });
}

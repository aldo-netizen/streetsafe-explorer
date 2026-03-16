import { NextResponse } from 'next/server';
import { queryAll, queryOne } from '@/lib/db';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;
  const city = decodeURIComponent(name);

  const sampleCount = await queryOne(
    `SELECT COUNT(*) as n FROM samples WHERE LOWER(city) = LOWER(?)`,
    [city]
  );

  const topSubstances = await queryAll(`
    SELECT ds.substance, COUNT(*) as count
    FROM detected_substances ds
    JOIN samples s ON ds.sample_id = s.sample_id
    WHERE LOWER(s.city) = LOWER(?)
    GROUP BY ds.substance
    ORDER BY count DESC
    LIMIT 8
  `, [city]);

  const cityFentanyl = await queryOne(
    `SELECT AVG(fentanyl) * 100 as pct FROM samples WHERE LOWER(city) = LOWER(?)`,
    [city]
  );

  const overallFentanyl = await queryOne(
    `SELECT AVG(fentanyl) * 100 as pct FROM samples`,
    []
  );

  return NextResponse.json({
    city,
    sample_count: Number(sampleCount?.n ?? 0),
    top_substances: topSubstances,
    fentanyl_pct: Math.round(Number(cityFentanyl?.pct ?? 0) * 10) / 10,
    overall_fentanyl_pct: Math.round(Number(overallFentanyl?.pct ?? 0) * 10) / 10,
  });
}

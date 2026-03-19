import { NextResponse } from 'next/server';
import { queryBatch } from '@/lib/db';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    const city = decodeURIComponent(name);
    const cityLower = city.toLowerCase();

    const [statsRows, substanceRows, overallRows] = await queryBatch([
      {
        sql: `SELECT city, sample_count, fentanyl_pct FROM city_stats WHERE city_lower = ?`,
        args: [cityLower],
      },
      {
        sql: `SELECT substance, count FROM city_top_substances WHERE city_lower = ? ORDER BY count DESC`,
        args: [cityLower],
      },
      {
        sql: `SELECT AVG(fentanyl) * 100 as pct FROM samples`,
        args: [],
      },
    ]);

    return NextResponse.json({
      city: statsRows[0]?.city ?? city,
      sample_count: Number(statsRows[0]?.sample_count ?? 0),
      top_substances: substanceRows,
      fentanyl_pct: Math.round(Number(statsRows[0]?.fentanyl_pct ?? 0) * 10) / 10,
      overall_fentanyl_pct: Math.round(Number(overallRows[0]?.pct ?? 0) * 10) / 10,
    });
  } catch (e) {
    console.error('City API error:', e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

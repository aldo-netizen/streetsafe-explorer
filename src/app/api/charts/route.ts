import { NextRequest, NextResponse } from 'next/server';
import { queryAll, queryOne } from '@/lib/db';

export async function GET(request: NextRequest) {
  const type = request.nextUrl.searchParams.get('type');
  const from = request.nextUrl.searchParams.get('from');
  const to = request.nextUrl.searchParams.get('to');

  const dateClause = (prefix: string) => {
    const parts: string[] = [];
    const params: unknown[] = [];
    if (from) { parts.push(`date >= ?`); params.push(from); }
    if (to) { parts.push(`date <= ?`); params.push(to); }
    if (parts.length === 0) return { sql: '', params: [] };
    return { sql: `${prefix} ${parts.join(' AND ')}`, params };
  };

  if (type === 'substance-trends') {
    const d = dateClause('AND');
    const data = await queryAll(`
      SELECT
        substr(date, 1, 7) as month,
        SUM(fentanyl) as fentanyl,
        SUM(heroin) as heroin,
        SUM(xylazine) as xylazine,
        SUM(medetomidine) as medetomidine,
        SUM(acetaminophen) as acetaminophen,
        COUNT(*) as total
      FROM samples
      WHERE date IS NOT NULL ${d.sql}
      GROUP BY month
      ORDER BY month
    `, d.params);
    return NextResponse.json(data);
  }

  if (type === 'geo-distribution') {
    const d = dateClause('AND');
    const data = await queryAll(`
      SELECT city as location, COUNT(*) as count
      FROM samples
      WHERE city IS NOT NULL AND city != '' ${d.sql}
      GROUP BY city
      ORDER BY count DESC
      LIMIT 20
    `, d.params);
    return NextResponse.json(data);
  }

  if (type === 'geo-heatmap') {
    const d = dateClause('AND');
    const data = await queryAll(`
      SELECT
        city as location,
        COALESCE(state, '') as state,
        COUNT(*) as count,
        ROUND(AVG(fentanyl) * 100, 1) as fentanyl_pct,
        ROUND(AVG(xylazine) * 100, 1) as xylazine_pct
      FROM samples
      WHERE city IS NOT NULL AND city != '' ${d.sql}
      GROUP BY city
      HAVING count >= 5
      ORDER BY count DESC
      LIMIT 50
    `, d.params);
    return NextResponse.json(data);
  }

  if (type === 'mismatch-rates') {
    const d = dateClause('AND');
    const data = await queryAll(`
      SELECT
        LOWER(assumed_substance) as assumed,
        COUNT(*) as total,
        SUM(CASE
          WHEN LOWER(assumed_substance) LIKE '%fentanyl%' AND fentanyl = 0 THEN 1
          WHEN LOWER(assumed_substance) LIKE '%heroin%' AND heroin = 0 THEN 1
          WHEN LOWER(assumed_substance) LIKE '%xylazine%' AND xylazine = 0 THEN 1
          WHEN LOWER(assumed_substance) LIKE '%methamphetamine%' AND has_other = 1 THEN 0
          ELSE 0
        END) as mismatches
      FROM samples
      WHERE assumed_substance IS NOT NULL AND assumed_substance != '' ${d.sql}
      GROUP BY LOWER(assumed_substance)
      HAVING total >= 20
      ORDER BY total DESC
      LIMIT 15
    `, d.params);
    return NextResponse.json(data);
  }

  if (type === 'co-occurrence') {
    const d = dateClause('AND');
    const substances = ['fentanyl', 'heroin', 'xylazine', 'medetomidine', 'acetaminophen'];
    const matrix: { row: string; col: string; count: number }[] = [];

    for (const a of substances) {
      for (const b of substances) {
        const row = await queryOne(
          `SELECT COUNT(*) as count FROM samples WHERE ${a} = 1 AND ${b} = 1 ${d.sql}`,
          d.params
        );
        matrix.push({ row: a, col: b, count: Number(row?.count ?? 0) });
      }
    }

    return NextResponse.json(matrix);
  }

  return NextResponse.json({ error: 'Invalid chart type' }, { status: 400 });
}

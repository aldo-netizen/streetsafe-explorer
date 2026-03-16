import { NextRequest, NextResponse } from 'next/server';
import { queryAll, queryOne } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
  const params = request.nextUrl.searchParams;
  const page = Math.max(1, parseInt(params.get('page') || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(params.get('limit') || '25', 10)));
  const sort = params.get('sort') || 'date';
  const order = params.get('order') === 'asc' ? 'ASC' : 'DESC';
  const substance = params.get('substance');
  const city = params.get('city');
  const state = params.get('state');
  const dateFrom = params.get('dateFrom');
  const dateTo = params.get('dateTo');
  const search = params.get('search');

  const allowedSorts = ['date', 'sample_id', 'city', 'total_substances'];
  const sortCol = allowedSorts.includes(sort) ? sort : 'date';

  const conditions: string[] = [];
  const values: unknown[] = [];

  if (substance) {
    const allowed = ['fentanyl', 'heroin', 'xylazine', 'medetomidine', 'acetaminophen'];
    if (allowed.includes(substance)) {
      conditions.push(`s.${substance} = 1`);
    }
  }

  if (city) {
    conditions.push('s.city LIKE ?');
    values.push(`%${city}%`);
  }

  if (state) {
    conditions.push('s.state LIKE ?');
    values.push(`%${state}%`);
  }

  if (dateFrom) {
    conditions.push('s.date >= ?');
    values.push(dateFrom);
  }

  if (dateTo) {
    conditions.push('s.date <= ?');
    values.push(dateTo);
  }

  if (search) {
    conditions.push('(s.sample_id LIKE ? OR s.assumed_substance LIKE ? OR s.city LIKE ?)');
    values.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countRow = await queryOne(`SELECT COUNT(*) as total FROM samples s ${where}`, values);
  const total = Number(countRow?.total ?? 0);
  const pages = Math.ceil(total / limit);
  const offset = (page - 1) * limit;

  const samples = await queryAll(
    `SELECT * FROM samples s ${where} ORDER BY ${sortCol} ${order} LIMIT ? OFFSET ?`,
    [...values, limit, offset]
  );

  return NextResponse.json({ samples, total, page, pages });
  } catch (e) {
    console.error('Samples API error:', e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

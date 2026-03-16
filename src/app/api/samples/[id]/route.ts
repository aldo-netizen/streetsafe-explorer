import { NextRequest, NextResponse } from 'next/server';
import { queryAll, queryOne } from '@/lib/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const sample = await queryOne('SELECT * FROM samples WHERE sample_id = ?', [id]);
  if (!sample) {
    return NextResponse.json({ error: 'Sample not found' }, { status: 404 });
  }

  if (!sample.spectra_url) {
    sample.spectra_url = `https://d6mdqn0qagw6t.cloudfront.net/${id}.PNG`;
  }

  const substances = await queryAll(
    'SELECT substance, abundance, peak FROM detected_substances WHERE sample_id = ?',
    [id]
  );

  return NextResponse.json({ ...sample, substances });
}

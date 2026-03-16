import { NextRequest, NextResponse } from 'next/server';
import { runAgent } from '@/lib/agent';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const message = body.message;

  if (!message || typeof message !== 'string' || message.length > 2000) {
    return NextResponse.json({ error: 'Invalid message' }, { status: 400 });
  }

  try {
    const result = await runAgent(message);
    return NextResponse.json(result);
  } catch (e) {
    console.error('Search error:', e);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}

import type { ChartSpec } from '@/types';

interface StreamCallbacks {
  onText: (text: string) => void;
  onChart: (spec: ChartSpec) => void;
  onSql: (query: string) => void;
  onDone: () => void;
  onError: (error: string) => void;
}

export async function streamSearch(message: string, callbacks: StreamCallbacks) {
  const res = await fetch('/api/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: 'Request failed' }));
    callbacks.onError(data.error || 'Something went wrong.');
    return;
  }

  const reader = res.body?.getReader();
  if (!reader) {
    callbacks.onError('No response stream.');
    return;
  }

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      try {
        const event = JSON.parse(line.slice(6));
        switch (event.type) {
          case 'text':
            callbacks.onText(event.content);
            break;
          case 'chart':
            callbacks.onChart(event.content as ChartSpec);
            break;
          case 'sql':
            callbacks.onSql(event.content);
            break;
          case 'done':
            callbacks.onDone();
            return;
          case 'error':
            callbacks.onError(event.content);
            return;
        }
      } catch {
        // Skip malformed events
      }
    }
  }

  callbacks.onDone();
}

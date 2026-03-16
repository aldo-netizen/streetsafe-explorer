import { createClient, type Client, type InArgs } from '@libsql/client/http';

let _client: Client | null = null;

function getClient(): Client {
  if (!_client) {
    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;
    if (!url) throw new Error('TURSO_DATABASE_URL is not set');
    _client = createClient({ url, authToken });
  }
  return _client;
}

export async function queryAll(sql: string, args: unknown[] = []): Promise<Record<string, unknown>[]> {
  const client = getClient();
  const result = await client.execute({ sql, args: args as InArgs });
  // Turso rows are already plain objects with column names as keys
  return result.rows as unknown as Record<string, unknown>[];
}

export async function queryOne(sql: string, args: unknown[] = []): Promise<Record<string, unknown> | null> {
  const rows = await queryAll(sql, args);
  return rows[0] ?? null;
}

export { getClient };

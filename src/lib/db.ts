import { createClient, type Client, type Row, type InArgs } from '@libsql/client';

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

/** Convert libsql Row (array-like with column names) to a plain object */
function rowToObject(row: Row): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const key of Object.keys(row)) {
    if (key !== 'length') {
      obj[key] = row[key as keyof Row];
    }
  }
  return obj;
}

export async function queryAll(sql: string, args: unknown[] = []): Promise<Record<string, unknown>[]> {
  const client = getClient();
  const result = await client.execute({ sql, args: args as InArgs });
  return result.rows.map(rowToObject);
}

export async function queryOne(sql: string, args: unknown[] = []): Promise<Record<string, unknown> | null> {
  const rows = await queryAll(sql, args);
  return rows[0] ?? null;
}

export { getClient };

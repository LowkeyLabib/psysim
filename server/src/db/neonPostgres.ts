import { Pool } from "pg";
import { config } from "../config";

let pool: Pool | null = null;

/**
 * Returns a shared pooled Lakebase Postgres client using the pooled `DATABASE_URL`
 * for application traffic (per neon-postgres best practices).
 */
export function getNeonPool(): Pool | null {
  if (!config.neon.databaseUrl) return null;
  if (!pool) {
    pool = new Pool({
      connectionString: config.neon.databaseUrl,
      max: 10,
      connectionTimeoutMillis: 15_000,
    });
  }
  return pool;
}

export async function checkNeonPostgresHealth(): Promise<boolean> {
  const client = getNeonPool();
  if (!client) return false;
  try {
    await client.query("SELECT 1");
    return true;
  } catch {
    return false;
  }
}

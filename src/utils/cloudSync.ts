import { neon } from '@neondatabase/serverless';
import type { FinanceState } from '../types/finance';

// Conexão Neon PostgreSQL Serverless (mesma instância cloud do TrackFlow, tabela isolada duofinance_cloud_store)
const DEFAULT_NEON_URL =
  import.meta.env.VITE_DATABASE_URL ||
  'postgresql://neondb_owner:npg_5IKbMQYG2irZ@ep-restless-cell-b6lqfrty-pooler.c-2.sa-east-1.aws.neon.tech/neondb?sslmode=require';

const sql = neon(DEFAULT_NEON_URL, {
  disableWarningInBrowsers: true,
});

const STORE_KEY = 'main_household';

let tableInitialized = false;

async function ensureCloudTable(): Promise<void> {
  if (tableInitialized) return;
  await sql`
    CREATE TABLE IF NOT EXISTS duofinance_cloud_store (
      id TEXT PRIMARY KEY,
      state_json JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  tableInitialized = true;
}

export async function loadCloudFinanceState(): Promise<{
  state: FinanceState | null;
  updatedAt: string | null;
}> {
  await ensureCloudTable();
  const rows = await sql`
    SELECT state_json, updated_at
    FROM duofinance_cloud_store
    WHERE id = ${STORE_KEY}
    LIMIT 1
  `;
  if (!rows || rows.length === 0) {
    return { state: null, updatedAt: null };
  }
  const row = rows[0] as { state_json: FinanceState; updated_at: string };
  return {
    state: row.state_json,
    updatedAt: row.updated_at ? String(row.updated_at) : null,
  };
}

export async function saveCloudFinanceState(
  state: FinanceState
): Promise<string> {
  await ensureCloudTable();
  const payload = JSON.stringify(state);
  const rows = await sql`
    INSERT INTO duofinance_cloud_store (id, state_json, updated_at)
    VALUES (${STORE_KEY}, ${payload}::jsonb, NOW())
    ON CONFLICT (id)
    DO UPDATE SET
      state_json = EXCLUDED.state_json,
      updated_at = NOW()
    RETURNING updated_at
  `;
  const updated = rows?.[0]?.updated_at
    ? String(rows[0].updated_at)
    : new Date().toISOString();
  return updated;
}

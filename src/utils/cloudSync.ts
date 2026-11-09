import { neon } from '@neondatabase/serverless';
import type { FinanceState } from '../types/finance';
import { hashPassword, hashSecurityAnswer } from './cryptoUtils';

// Conexão Neon PostgreSQL Serverless
const DEFAULT_NEON_URL =
  import.meta.env.VITE_DATABASE_URL ||
  'postgresql://neondb_owner:npg_5IKbMQYG2irZ@ep-restless-cell-b6lqfrty-pooler.c-2.sa-east-1.aws.neon.tech/neondb?sslmode=require';

export const sql = neon(DEFAULT_NEON_URL, {
  disableWarningInBrowsers: true,
});

export const ROOT_STORE_KEY = 'main_household';

let tablesInitialized = false;

export async function ensureDatabaseTables(): Promise<void> {
  if (tablesInitialized) return;

  // 1. Tabela de armazenamento de estado financeiro
  await sql`
    CREATE TABLE IF NOT EXISTS duofinance_cloud_store (
      id TEXT PRIMARY KEY,
      state_json JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  // 2. Tabela de usuários autenticados (Multi-Tenant & ROOT)
  await sql`
    CREATE TABLE IF NOT EXISTS duofinance_users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      security_question TEXT NOT NULL,
      security_answer_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'USER',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  // 3. Semeia o usuário ROOT inicial se a tabela estiver vazia
  const existingUsers = await sql`
    SELECT id FROM duofinance_users LIMIT 1
  `;

  if (!existingUsers || existingUsers.length === 0) {
    const { hash, salt } = await hashPassword('Admin@123');
    const answerHash = await hashSecurityAnswer('churrasco', salt);

    await sql`
      INSERT INTO duofinance_users (
        id,
        name,
        email,
        password_hash,
        salt,
        security_question,
        security_answer_hash,
        role,
        created_at
      ) VALUES (
        'usr-root-master',
        'Denner (ROOT)',
        'denner@contas.local',
        ${hash},
        ${salt},
        'Qual a sua comida favorita da infância?',
        ${answerHash},
        'ROOT',
        NOW()
      )
      ON CONFLICT (email) DO NOTHING
    `;
  }

  tablesInitialized = true;
}

/**
 * Carrega os dados financeiros da nuvem para o store especificado.
 * Para o usuário ROOT, carrega do 'main_household' (base histórica).
 * Para novos usuários, carrega de 'user_<userId>' (espaço isolado).
 */
export async function loadCloudFinanceState(
  storeKey: string = ROOT_STORE_KEY
): Promise<{
  state: FinanceState | null;
  updatedAt: string | null;
}> {
  await ensureDatabaseTables();
  const rows = await sql`
    SELECT state_json, updated_at
    FROM duofinance_cloud_store
    WHERE id = ${storeKey}
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

/**
 * Salva os dados financeiros na nuvem para o store correspondente ao usuário.
 */
export async function saveCloudFinanceState(
  state: FinanceState,
  storeKey: string = ROOT_STORE_KEY
): Promise<string> {
  await ensureDatabaseTables();
  const payload = JSON.stringify(state);
  const rows = await sql`
    INSERT INTO duofinance_cloud_store (id, state_json, updated_at)
    VALUES (${storeKey}, ${payload}::jsonb, NOW())
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

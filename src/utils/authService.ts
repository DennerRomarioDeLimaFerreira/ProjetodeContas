import { AuthSession, AuthUser, UserRole } from '../types/auth';
import {
  ensureDatabaseTables,
  ROOT_STORE_KEY,
  sql,
} from './cloudSync';
import {
    hashPassword,
  hashSecurityAnswer,
  verifyPassword,
  verifySecurityAnswer,
} from './cryptoUtils';

const SESSION_STORAGE_KEY = 'duofinance_auth_session_v1';

export function getSessionStorageKey(): string {
  return SESSION_STORAGE_KEY;
}

export function getCurrentSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as AuthSession;
    if (new Date(session.expiresAt).getTime() <= Date.now()) {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function saveCurrentSession(session: AuthSession): void {
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch (err) {
    console.error('Falha ao salvar sessão local:', err);
  }
}

export function clearCurrentSession(): void {
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch (err) {
    console.error('Falha ao limpar sessão:', err);
  }
}

/**
 * Retorna a chave do store da nuvem para o usuário logado.
 * ROOT usa 'main_household' (base histórica).
 * Usuários comuns usam 'user_<userId>' (espaço isolado).
 */
export function getStoreKeyForUser(user: AuthUser | null): string {
  if (!user || user.role === 'ROOT') {
    return ROOT_STORE_KEY;
  }
  return `user_${user.id}`;
}

export async function loginUser(
  emailInput: string,
  passwordInput: string
): Promise<AuthSession> {
  await ensureDatabaseTables();

  const email = emailInput.trim().toLowerCase();
  const rows = await sql`
    SELECT id, name, email, password_hash, salt, security_question, role, created_at
    FROM duofinance_users
    WHERE LOWER(email) = ${email}
    LIMIT 1
  `;

  if (!rows || rows.length === 0) {
    throw new Error('Usuário ou senha incorretos.');
  }

  const row = rows[0] as {
    id: string;
    name: string;
    email: string;
    password_hash: string;
    salt: string;
    security_question: string;
    role: string;
    created_at: string;
  };

  const isValid = await verifyPassword(
    passwordInput,
    row.password_hash,
    row.salt
  );

  if (!isValid) {
    throw new Error('Usuário ou senha incorretos.');
  }

  const user: AuthUser = {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role as UserRole,
    securityQuestion: row.security_question,
    createdAt: String(row.created_at),
  };

  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 dias
  const session: AuthSession = {
    user,
    token: `tok-${row.id}-${Date.now()}`,
    expiresAt,
  };

  saveCurrentSession(session);
  return session;
}

export async function registerUser(params: {
  name: string;
  email: string;
  password: string;
  securityQuestion: string;
  securityAnswer: string;
}): Promise<AuthSession> {
  await ensureDatabaseTables();

  const name = params.name.trim();
  const email = params.email.trim().toLowerCase();
  const password = params.password;

  if (!name || !email || !password) {
    throw new Error('Nome, e-mail e senha são obrigatórios.');
  }

  if (password.length < 6) {
    throw new Error('A senha deve conter pelo menos 6 caracteres.');
  }

  if (!params.securityAnswer.trim()) {
    throw new Error('A resposta de segurança é obrigatória para recuperação de senha.');
  }

  const existing = await sql`
    SELECT id FROM duofinance_users WHERE LOWER(email) = ${email} LIMIT 1
  `;

  if (existing && existing.length > 0) {
    throw new Error('Já existe um usuário cadastrado com este e-mail.');
  }

  // Se for o primeiro usuário da base, define como ROOT; caso contrário, USER
  const countRows = await sql`SELECT COUNT(*)::int as total FROM duofinance_users`;
  const totalUsers = Number(countRows?.[0]?.total || 0);
  const role: UserRole = totalUsers === 0 ? 'ROOT' : 'USER';

  const { hash, salt } = await hashPassword(password);
  const answerHash = await hashSecurityAnswer(params.securityAnswer, salt);
  const userId = `usr-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

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
      ${userId},
      ${name},
      ${email},
      ${hash},
      ${salt},
      ${params.securityQuestion},
      ${answerHash},
      ${role},
      NOW()
    )
  `;

  const user: AuthUser = {
    id: userId,
    name,
    email,
    role,
    securityQuestion: params.securityQuestion,
    createdAt: new Date().toISOString(),
  };

  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const session: AuthSession = {
    user,
    token: `tok-${userId}-${Date.now()}`,
    expiresAt,
  };

  saveCurrentSession(session);
  return session;
}

/**
 * Busca a pergunta de segurança cadastrada para o e-mail informado.
 */
export async function getSecurityQuestionForEmail(
  emailInput: string
): Promise<string> {
  await ensureDatabaseTables();

  const email = emailInput.trim().toLowerCase();
  const rows = await sql`
    SELECT security_question
    FROM duofinance_users
    WHERE LOWER(email) = ${email}
    LIMIT 1
  `;

  if (!rows || rows.length === 0) {
    throw new Error('Nenhum usuário encontrado com este e-mail.');
  }

  return (rows[0] as { security_question: string }).security_question;
}

/**
 * Recuperação de senha autônoma via Pergunta de Segurança.
 */
export async function recoverPassword(params: {
  email: string;
  securityAnswer: string;
  newPassword: string;
}): Promise<void> {
  await ensureDatabaseTables();

  const email = params.email.trim().toLowerCase();
  const rows = await sql`
    SELECT id, salt, security_answer_hash
    FROM duofinance_users
    WHERE LOWER(email) = ${email}
    LIMIT 1
  `;

  if (!rows || rows.length === 0) {
    throw new Error('Usuário não encontrado.');
  }

  const row = rows[0] as {
    id: string;
    salt: string;
    security_answer_hash: string;
  };

  const isAnswerValid = await verifySecurityAnswer(
    params.securityAnswer,
    row.security_answer_hash,
    row.salt
  );

  if (!isAnswerValid) {
    throw new Error('Resposta de segurança incorreta. Verifique e tente novamente.');
  }

  if (params.newPassword.length < 6) {
    throw new Error('A nova senha deve ter no mínimo 6 caracteres.');
  }

  const { hash: newHash, salt: newSalt } = await hashPassword(params.newPassword);
  const newAnswerHash = await hashSecurityAnswer(params.securityAnswer, newSalt);

  await sql`
    UPDATE duofinance_users
    SET
      password_hash = ${newHash},
      salt = ${newSalt},
      security_answer_hash = ${newAnswerHash}
    WHERE id = ${row.id}
  `;
}

/**
 * Lista todos os usuários cadastrados (Exclusivo para o painel ROOT).
 */
export async function adminListUsers(): Promise<AuthUser[]> {
  await ensureDatabaseTables();

  const rows = await sql`
    SELECT id, name, email, role, security_question, created_at
    FROM duofinance_users
    ORDER BY created_at ASC
  `;

  return (rows || []).map((r) => {
    const row = r as {
      id: string;
      name: string;
      email: string;
      role: string;
      security_question: string;
      created_at: string;
    };
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role as UserRole,
      securityQuestion: row.security_question,
      createdAt: String(row.created_at),
    };
  });
}

/**
 * Redefine a senha de um usuário via painel ROOT.
 */
export async function adminResetUserPassword(
  userId: string,
  newPassword: string
): Promise<void> {
  await ensureDatabaseTables();

  if (newPassword.length < 6) {
    throw new Error('A senha deve ter no mínimo 6 caracteres.');
  }

  const { hash, salt } = await hashPassword(newPassword);

  await sql`
    UPDATE duofinance_users
    SET password_hash = ${hash}, salt = ${salt}
    WHERE id = ${userId}
  `;
}

/**
 * Remove um usuário da base (Exclusivo para ROOT).
 */
export async function adminDeleteUser(
  userId: string,
  currentAdminId: string
): Promise<void> {
  await ensureDatabaseTables();

  if (userId === currentAdminId) {
    throw new Error('Você não pode excluir sua própria conta de administrador.');
  }

  await sql`
    DELETE FROM duofinance_users WHERE id = ${userId}
  `;

  // Remove também o store isolado deste usuário
  await sql`
    DELETE FROM duofinance_cloud_store WHERE id = ${`user_${userId}`}
  `;
}

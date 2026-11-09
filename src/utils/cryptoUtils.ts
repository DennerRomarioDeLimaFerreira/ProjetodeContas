/**
 * Utilitários criptográficos de alta segurança usando Web Crypto API (Nativo do navegador).
 * Utiliza PBKDF2 com HMAC-SHA-256 e Salt aleatório único por usuário (zero dependências externas).
 */

function buf2hex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function hex2buf(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

export function generateSalt(length = 16): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return buf2hex(array.buffer);
}

/**
 * Gera um hash PBKDF2 com Salt criptográfico seguro.
 */
export async function hashPassword(
  password: string,
  providedSalt?: string
): Promise<{ hash: string; salt: string }> {
  const saltHex = providedSalt || generateSalt();
  const saltBytes = hex2buf(saltHex);

  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBytes as ArrayBufferView<ArrayBuffer>,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );

  return {
    hash: buf2hex(derivedBits),
    salt: saltHex,
  };
}

/**
 * Valida se uma senha informada bate com o hash e salt armazenados.
 */
export async function verifyPassword(
  password: string,
  storedHash: string,
  storedSalt: string
): Promise<boolean> {
  try {
    const { hash } = await hashPassword(password, storedSalt);
    return hash === storedHash;
  } catch {
    return false;
  }
}

/**
 * Normaliza e gera hash para a resposta de segurança secreta.
 */
export async function hashSecurityAnswer(
  answer: string,
  salt: string
): Promise<string> {
  const cleanAnswer = String(answer || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // Remove acentos

  const { hash } = await hashPassword(cleanAnswer, salt);
  return hash;
}

/**
 * Valida a resposta da pergunta de segurança.
 */
export async function verifySecurityAnswer(
  answer: string,
  storedAnswerHash: string,
  salt: string
): Promise<boolean> {
  try {
    const calculatedHash = await hashSecurityAnswer(answer, salt);
    return calculatedHash === storedAnswerHash;
  } catch {
    return false;
  }
}

import { describe, it, expect } from 'vitest';
import {
  hashPassword,
  verifyPassword,
  hashSecurityAnswer,
  verifySecurityAnswer,
  generateSalt,
} from './cryptoUtils';

describe('Crypto Utilities — Web Crypto PBKDF2 & Security Answers', () => {
  it('deve gerar hashes consistentes e validar senha correta', async () => {
    const password = 'MinhaSenhaSegura@2026';
    const { hash, salt } = await hashPassword(password);

    expect(hash).toBeDefined();
    expect(hash.length).toBe(64); // 256 bits = 64 hex chars
    expect(salt).toBeDefined();
    expect(salt.length).toBe(32); // 16 bytes = 32 hex chars

    const isValid = await verifyPassword(password, hash, salt);
    expect(isValid).toBe(true);

    const isInvalid = await verifyPassword('SenhaErrada#123', hash, salt);
    expect(isInvalid).toBe(false);
  });

  it('deve gerar salts únicos para senhas idênticas prevenindo ataques de Rainbow Table', async () => {
    const salt1 = generateSalt();
    const salt2 = generateSalt();
    expect(salt1).not.toBe(salt2);

    const p1 = await hashPassword('Admin@123', salt1);
    const p2 = await hashPassword('Admin@123', salt2);
    expect(p1.hash).not.toBe(p2.hash);
  });

  it('deve validar resposta de segurança normalizando caixa alta/baixa, espaços e acentos', async () => {
    const salt = generateSalt();
    // Resposta cadastrada com acento e caixa mista: "São Paulo"
    const answerHash = await hashSecurityAnswer('São Paulo', salt);

    // O usuário tenta recuperar digitando sem acento, com letras minúsculas ou espaços
    expect(await verifySecurityAnswer('sao paulo', answerHash, salt)).toBe(true);
    expect(await verifySecurityAnswer('   SÃO PAULO   ', answerHash, salt)).toBe(true);
    expect(await verifySecurityAnswer('Sao Paulo', answerHash, salt)).toBe(true);

    // Resposta incorreta
    expect(await verifySecurityAnswer('Rio de Janeiro', answerHash, salt)).toBe(false);
  });
});

import { describe, it, expect } from 'vitest';
import { getStoreKeyForUser } from './authService';
import { ROOT_STORE_KEY } from './cloudSync';
import type { AuthUser } from '../types/auth';

describe('Auth & Multi-Tenant Segregation — QA Tenant Isolation Gate', () => {
  it('deve mapear usuário ROOT estritamente para o store principal consolidado', () => {
    const rootUser: AuthUser = {
      id: 'root-denner-id',
      name: 'Denner Ferreira',
      email: 'denner@contas.local',
      role: 'ROOT',
      createdAt: '2026-05-01T00:00:00Z',
    };

    expect(getStoreKeyForUser(rootUser)).toBe(ROOT_STORE_KEY);
    expect(getStoreKeyForUser(rootUser)).toBe('main_household');
  });

  it('deve mapear usuários comuns (USER) para stores individuais isolados', () => {
    const userA: AuthUser = {
      id: 'uuid-user-a',
      name: 'Ana Silva',
      email: 'ana@teste.local',
      role: 'USER',
      createdAt: '2026-05-01T00:00:00Z',
    };

    const userB: AuthUser = {
      id: 'uuid-user-b',
      name: 'Bruno Lima',
      email: 'bruno@teste.local',
      role: 'USER',
      createdAt: '2026-05-01T00:00:00Z',
    };

    // Store keys devem ser individualizadas pelo ID do usuário
    expect(getStoreKeyForUser(userA)).toBe('user_uuid-user-a');
    expect(getStoreKeyForUser(userB)).toBe('user_uuid-user-b');

    // NENHUM usuário comum pode ter acesso ao store 'main_household' do ROOT
    expect(getStoreKeyForUser(userA)).not.toBe(ROOT_STORE_KEY);
    expect(getStoreKeyForUser(userB)).not.toBe(ROOT_STORE_KEY);
    expect(getStoreKeyForUser(userA)).not.toBe(getStoreKeyForUser(userB));
  });

  it('deve aplicar fallback seguro para o store principal quando usuário não estiver autenticado', () => {
    expect(getStoreKeyForUser(null)).toBe(ROOT_STORE_KEY);
  });
});

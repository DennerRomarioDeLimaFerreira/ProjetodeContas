import { describe, it, expect } from 'vitest';
import { getStoreKeyForUser, getUserLocalStorageStateKey } from './authService';
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

  it('deve mapear usuário comum vinculado a um membro da casa (linkedMemberId) para o store da casa principal', () => {
    const linkedUser: AuthUser = {
      id: 'uuid-eder-user',
      name: 'Eder Ferreira',
      email: 'eder@teste.local',
      role: 'USER',
      linkedMemberId: 'member-eder-household',
      createdAt: '2026-05-01T00:00:00Z',
    };

    // Usuário vinculado deve ler o store principal da casa
    expect(getStoreKeyForUser(linkedUser)).toBe(ROOT_STORE_KEY);
    expect(getStoreKeyForUser(linkedUser)).toBe('main_household');

    // Chave de cache local deve ser isolada por membro
    expect(getUserLocalStorageStateKey(linkedUser)).toBe(
      'duofinance_state_member_member-eder-household_v1'
    );
  });

  it('deve aplicar fallback seguro para o store principal quando usuário não estiver autenticado', () => {
    expect(getStoreKeyForUser(null)).toBe(ROOT_STORE_KEY);
  });

  it('deve gerar chaves de LocalStorage estritamente isoladas por usuário evitando contaminação de cache local', () => {
    const rootUser: AuthUser = {
      id: 'root-id',
      name: 'Denner',
      email: 'denner@contas.local',
      role: 'ROOT',
      createdAt: '2026-05-01T00:00:00Z',
    };

    const ederUser: AuthUser = {
      id: 'eder-uuid',
      name: 'Eder',
      email: 'eder@contas.com',
      role: 'USER',
      createdAt: '2026-05-01T00:00:00Z',
    };

    const rootKey = getUserLocalStorageStateKey(rootUser);
    const ederKey = getUserLocalStorageStateKey(ederUser);

    expect(rootKey).toBe('duofinance_state_root_household_v1');
    expect(ederKey).toBe('duofinance_state_user_eder-uuid_v1');
    expect(rootKey).not.toBe(ederKey);
    expect(getUserLocalStorageStateKey(null)).toBe('duofinance_state_guest_v1');
  });
});

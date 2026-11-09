export type UserRole = 'ROOT' | 'USER';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  securityQuestion?: string;
  createdAt: string;
}

export interface AuthSession {
  user: AuthUser;
  token: string;
  expiresAt: string;
}

export const SECURITY_QUESTIONS = [
  'Qual o nome do seu primeiro animal de estimação?',
  'Qual o nome da cidade onde você nasceu?',
  'Qual o nome da sua escola primária?',
  'Qual o modelo do seu primeiro carro?',
  'Qual o nome do seu melhor amigo de infância?',
  'Qual a sua comida favorita da infância?',
] as const;

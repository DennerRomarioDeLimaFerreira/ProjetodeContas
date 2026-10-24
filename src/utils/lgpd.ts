/**
 * Módulo de Proteção, Conformidade LGPD & DLP (Data Loss Prevention)
 * Fornece validação de dados sensíveis (CPF, Cartões de Crédito completos, Credenciais, Telefones)
 * e sanitização com máscaras de segurança para evitar vazamento de dados pessoais.
 */

export interface PiiDetectionItem {
  type: 'CPF' | 'CREDIT_CARD' | 'SECRET' | 'PHONE';
  match: string;
  masked: string;
  label: string;
  message: string;
}

export interface PiiScanResult {
  hasPII: boolean;
  items: PiiDetectionItem[];
  sanitizedText: string;
}

/**
 * Validador oficial do Dígito Verificador do CPF (Módulo 11)
 */
export function isValidCPF(rawCpf: string): boolean {
  if (!rawCpf) return false;
  const digits = rawCpf.replace(/\D/g, '');
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += Number(digits.charAt(i)) * (10 - i);
  }
  let firstCheck = 11 - (sum % 11);
  if (firstCheck >= 10) firstCheck = 0;
  if (firstCheck !== Number(digits.charAt(9))) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += Number(digits.charAt(i)) * (11 - i);
  }
  let secondCheck = 11 - (sum % 11);
  if (secondCheck >= 10) secondCheck = 0;
  if (secondCheck !== Number(digits.charAt(10))) return false;

  return true;
}

/**
 * Validador Algoritmo de Luhn para números completos de Cartão de Crédito (13 a 19 dígitos)
 */
export function isValidCreditCard(rawCard: string): boolean {
  if (!rawCard) return false;
  const digits = rawCard.replace(/\D/g, '');
  if (digits.length < 13 || digits.length > 19) return false;

  let sum = 0;
  let alternate = false;

  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits.charAt(i), 10);
    if (alternate) {
      n *= 2;
      if (n > 9) {
        n -= 9;
      }
    }
    sum += n;
    alternate = !alternate;
  }

  return sum % 10 === 0;
}

export function maskCPF(cpf: string): string {
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return '[CPF_PROTEGIDO]';
  return `${digits.slice(0, 3)}.***.***-${digits.slice(9, 11)}`;
}

export function maskCreditCard(card: string): string {
  const digits = card.replace(/\D/g, '');
  if (digits.length < 4) return '[CARTAO_PROTEGIDO]';
  return `**** **** **** ${digits.slice(-4)}`;
}

export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10) return '[TELEFONE_PROTEGIDO]';
  const ddd = digits.slice(-11, -9) || digits.slice(0, 2);
  const end = digits.slice(-2);
  return `(${ddd}) *****-**${end}`;
}

/**
 * Scanner DLP: Analisa um texto e identifica itens sensíveis com conformidade LGPD
 */
export function detectPII(text: string): PiiScanResult {
  if (!text || typeof text !== 'string') {
    return { hasPII: false, items: [], sanitizedText: text || '' };
  }

  const items: PiiDetectionItem[] = [];
  let sanitized = text;

  // 1. CPF Formatado (000.000.000-00)
  const formattedCpfRegex = /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g;
  let match: RegExpExecArray | null;

  while ((match = formattedCpfRegex.exec(text)) !== null) {
    const rawMatch = match[0];
    if (isValidCPF(rawMatch)) {
      const masked = maskCPF(rawMatch);
      items.push({
        type: 'CPF',
        match: rawMatch,
        masked,
        label: 'CPF Formatado',
        message: `Detectado CPF válido "${rawMatch}".`,
      });
      sanitized = sanitized.split(rawMatch).join(masked);
    }
  }

  // Sequências de 11 dígitos isolados que sejam CPFs válidos
  const plain11Regex = /\b\d{11}\b/g;
  while ((match = plain11Regex.exec(text)) !== null) {
    const rawMatch = match[0];
    if (isValidCPF(rawMatch) && !items.some((i) => i.match === rawMatch)) {
      const masked = maskCPF(rawMatch);
      items.push({
        type: 'CPF',
        match: rawMatch,
        masked,
        label: 'CPF (11 dígitos)',
        message: `Detectado número de CPF válido "${rawMatch}".`,
      });
      sanitized = sanitized.split(rawMatch).join(masked);
    }
  }

  // 2. Número completo de Cartão de Crédito (Luhn válido)
  const cardRegex = /\b(?:\d{4}[ -]?){3}\d{1,4}\b/g;
  while ((match = cardRegex.exec(text)) !== null) {
    const rawMatch = match[0];
    if (isValidCreditCard(rawMatch)) {
      const masked = maskCreditCard(rawMatch);
      items.push({
        type: 'CREDIT_CARD',
        match: rawMatch,
        masked,
        label: 'Cartão de Crédito Completo',
        message: `Detectado número completo de cartão de crédito.`,
      });
      sanitized = sanitized.split(rawMatch).join(masked);
    }
  }

  // 3. Credenciais / Senhas explícitas
  const secretRegex = /\b(?:senha|password|pwd|secret|token|cvv)\s*[:=]\s*([^\s,;]+)/gi;
  while ((match = secretRegex.exec(text)) !== null) {
    const rawMatch = match[0];
    const secretValue = match[1];
    if (secretValue && secretValue.length >= 3 && !items.some((i) => i.match === rawMatch)) {
      const masked = rawMatch.replace(secretValue, '[PROTEGIDO_LGPD]');
      items.push({
        type: 'SECRET',
        match: rawMatch,
        masked,
        label: 'Credencial / CVV / Senha',
        message: `Possível senha, token ou CVV detectado em texto livre.`,
      });
      sanitized = sanitized.split(rawMatch).join(masked);
    }
  }

  // 4. Telefone Celular com DDD
  const phoneFormattedRegex = /(?:\+?55\s?)?(?:\(?([1-9][0-9])\)?[\s.-])(?:9\d{4})[-.\s]?(\d{4})\b/g;
  while ((match = phoneFormattedRegex.exec(text)) !== null) {
    const rawMatch = match[0];
    if (!items.some((i) => i.match === rawMatch)) {
      const masked = maskPhone(rawMatch);
      items.push({
        type: 'PHONE',
        match: rawMatch,
        masked,
        label: 'Telefone Pessoal',
        message: `Detectado telefone celular "${rawMatch}".`,
      });
      sanitized = sanitized.split(rawMatch).join(masked);
    }
  }

  return {
    hasPII: items.length > 0,
    items,
    sanitizedText: sanitized,
  };
}

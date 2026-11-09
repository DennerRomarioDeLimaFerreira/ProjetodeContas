# Diretrizes Obrigatórias do Projeto — ProjetodeContas (AGENTS.md)

Este repositório é uma aplicação financeira inteligente para casais/famílias (**`DuoFinance / ProjetodeContas`**), construída com **React 19, TypeScript, Vite, Tailwind CSS e Neon Serverless PostgreSQL**.

Todas as interações e modificações neste projeto DEVEM obedecer rigorosamente às regras de qualidade, segurança e governança abaixo:

---

## 1. Princípios Invioláveis de Negócio & Cálculos Financeiros

1. **Destino Exato de Faturas de Cartão:**
   - Compras feitas em cartão de crédito pertencem à fatura daquele cartão.
   - O cálculo de divisão de faturas (`calculateCardInvoiceBreakdowns`) NUNCA deve abater saldos de forma cruzada contra despesas à vista ou outros cartões.
   - O dinheiro pago por cada participante tem como destino o pagamento da fatura do respectivo cartão.
2. **Precisão de Centavos:**
   - Todo input numérico deve ser processado via `parseExactNumber`. Arredondamentos visuais só devem ocorrer na apresentação final via `formatCurrency`.
3. **Despesas Diretas:**
   - Gastos à vista (Pix, dinheiro, débito) fora do cartão possuem acerto direto próprio e independente.

---

## 2. Governança Multi-Tenant & Controle de Acesso (ROOT vs Novos Usuários)

1. **Usuário ROOT (Administrador Principal):**
   - Possui acesso irrestrito aos dados históricos consolidados armazenados no banco Neon (`main_household`).
2. **Novos Usuários (`Multi-Tenant Isolation`):**
   - Todo novo usuário registrado possui seu próprio `userId` e seu próprio espaço isolado de armazenamento (`state_json`).
   - Um usuário jamais tem acesso às contas, cartões ou lançamentos de outro usuário.
3. **Criptografia de Credenciais:**
   - Senhas devem ser armazenadas com hash PBKDF2/SHA-256 e Salt criptográfico. Proibido texto puro.

---

## 3. Agentes Nativos Obrigatórios

Sempre que qualquer alteração for realizada no projeto, execute antes de concluir:

1. **Auditoria de QA (`qa-guardian` / `npm run qa:check`):**
   - Validação de tipos (`tsc -b`).
   - Auditoria de layout responsivo e anti-corte (`node scripts/qa-layout-audit.mjs`).
   - Build de produção (`vite build`).
   - Linter e integridade do React Compiler (`npx oxlint`).
2. **Auditoria de Segurança & LGPD (`sec-lgpd-auditor` / `npm run audit:security`):**
   - Varredura contra vazamento de credenciais, CVV e cartões completos.
   - Validação de isolamento de dados por usuário.
   - Proteção de dados sensíveis através de `src/utils/lgpd.ts` e `LgpdDlpBanner`.

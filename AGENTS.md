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

1. **Auditoria de QA (`qa-guardian` / `npm run qa:check` ou `npm run qa:scorecard`):**
   - Validação de tipos estrita (`tsc -b`).
   - Testes unitários automatizados com Vitest (`npm test`): precisão financeira, cotas de faturas sem abatimento cruzado, invariantes numéricas e isolamento multi-tenant.
   - Auditoria de layout responsivo e anti-corte (`node scripts/qa-layout-audit.mjs`).
   - Build de produção minificado e monitoramento de bundle (`vite build`).
   - Relatório Scorecard consolidado no terminal com aprovação Zero-Defect.
2. **Auditoria de Segurança & LGPD (`sec-lgpd-auditor` / `npm run audit:security`):**
   - Varredura contra vazamento de credenciais, CVV e cartões completos.
   - Validação de isolamento de dados por usuário.
   - Proteção de dados sensíveis através de `src/utils/lgpd.ts` e `LgpdDlpBanner`.
3. **Ergonomia e Design System (`ui-ux-artisan`):**
   - Padrão Bottom Sheet em modais no mobile (`items-end sm:items-center rounded-t-3xl sm:rounded-2xl`).
   - Teclados mobile inteligentes (`inputMode="decimal"` para valores monetários, `inputMode="numeric"` para parcelas).
   - Prevenção de zoom forçado no iOS com tipografia `text-base sm:text-sm` em inputs.
   - Touch targets mínimos de 44px e zona do polegar otimizada.

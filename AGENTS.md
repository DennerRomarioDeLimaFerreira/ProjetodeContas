# Diretrizes Obrigatórias do Projeto — ProjetodeContas (AGENTS.md)

Este repositório é uma aplicação financeira inteligente para casais/famílias (**`DuoFinance / ProjetodeContas`**), construída com **React 19, TypeScript, Vite, Tailwind CSS e Neon Serverless PostgreSQL**.

Todas as interações e modificações neste projeto DEVEM obedecer rigorosamente às regras de qualidade e governança abaixo:

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

## 2. Governança Nativa: QA Guardian & LGPD/DLP

Sempre que qualquer alteração for realizada no projeto, execute antes de concluir:

1. **Auditoria de QA (`qa-guardian` / `npm run qa:check`):**
   - Validação de tipos (`tsc -b`).
   - Auditoria de layout responsivo e anti-corte (`node scripts/qa-layout-audit.mjs`).
   - Build de produção (`vite build`).
   - Linter e integridade do React Compiler (`npx oxlint`).
2. **Proteção LGPD & DLP:**
   - Todos os inputs de texto livre devem passar pela verificação e máscara preventiva de dados sensíveis (CPF, número de cartão, CVV e senhas) através de `src/utils/lgpd.ts` e `LgpdDlpBanner`.

---
name: qa-audit
description: Procedimento padrão de auditoria de QA, integridade de cálculos financeiros, contratos de tipos e governança LGPD no ProjetodeContas.
---

# Skill: Auditoria de QA (QA Guardian)

Execute este procedimento sempre que criar ou modificar componentes, cálculos financeiros, regras de negócio ou telas no **ProjetodeContas**:

1. **Executar Pipeline Automatizado**:
   ```bash
   npm run qa:check
   ```
2. **Executar Linter e Verificação de Pureza**:
   ```bash
   npx oxlint
   ```
3. **Auditar Regras de Negócio e Cálculos Financeiros**:
   - Verificar se as cotas de cartão de crédito estão isoladas por fatura via `calculateCardInvoiceBreakdowns`.
   - Garantir que despesas individuais permaneçam atribuídas 100% ao membro responsável.
4. **Verificar Paridade de Formulários e Proteção de Estado**:
   - Confirmar que modais de edição e criação preservam todos os campos e não resetam inputs durante a digitação.
5. **Emissão do Scorecard**:
   - Emitir o parecer com veredito `APROVADO` ou `REPROVADO`.

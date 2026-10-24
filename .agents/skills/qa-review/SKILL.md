---
name: qa-review
description: Executa a bateria completa de Qualidade (QA), Auditoria de Layout, Paridade de Modais e Conformidade LGPD/DLP no projeto DuoFinance antes de concluir qualquer entrega.
---

# 🔍 Skill: Revisão Completa de QA, Layout & LGPD (`qa-review`)

Use esta skill sempre que criar ou modificar componentes, cálculos financeiros, sincronização em nuvem ou fluxos de tela no **DuoFinance**.

## Passo a Passo de Execução

### Passo 1: Rodar o Pipeline Automatizado de QA
Execute no terminal:
```bash
npm run qa:check
```
Este comando executa em sequência:
1. `npm run typecheck` (`tsc -b`)
2. `npm run qa:layout` (`node scripts/qa-layout-audit.mjs`)
3. `npm run build` (`tsc -b && vite build`)

### Passo 2: Checklist Manual de Qualidade & LGPD
Verifique nos arquivos alterados:
1. **Paridade Inclusão/Edição**: Ao clicar em editar no Extrato, o modal exibe todos os campos da inclusão (Parcelamento `1x..24x`, `Informei Total / Informei Parcela`, opção de atualizar todas as parcelas do grupo e `Despesa/Assinatura Fixa Recorrente`)?
2. **Inputs Protegidos**: Algum `useEffect` depende de arrays/objetos instáveis que podem resetar o texto digitado pelo usuário? (Use `useRef` para controlar a abertura).
3. **LGPD & DLP**: Os campos de texto livres possuem `LgpdDlpBanner` e sanitizam `maskPII()` no submit?
4. **Tabelas e Modais**: Todas as tabelas têm `overflow-x-auto` + `min-w-[...]` e todos os modais têm `max-w-3xl` + `overflow-y-auto`?

### Passo 3: Emissão do QA Scorecard
Se houver qualquer erro ou warning no `npm run qa:check`, corrija-o imediatamente e re-execute até obter **0 Erros e 0 Alertas**.

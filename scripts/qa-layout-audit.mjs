import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const componentsDir = path.join(rootDir, 'src', 'components');

const tsxFiles = fs
  .readdirSync(componentsDir)
  .filter((f) => f.endsWith('.tsx'));

let errors = 0;
let warnings = 0;
const findings = [];

for (const fileName of tsxFiles) {
  const filePath = path.join(componentsDir, fileName);
  const content = fs.readFileSync(filePath, 'utf8');

  // 1. Check Tables for horizontal scroll wrapper and min-width
  if (content.includes('<table')) {
    if (!content.includes('overflow-x-auto')) {
      errors++;
      findings.push(
        `[ERROR] ${fileName}: Tabela '<table>' sem contêiner 'overflow-x-auto' (risco de corte em telas móveis).`
      );
    }
    if (!content.includes('min-w-[')) {
      warnings++;
      findings.push(
        `[WARN]  ${fileName}: Tabela '<table>' sem definição de largura mínima explícita ('min-w-[...]'), arriscando colunas esmagadas.`
      );
    }
  }

  // 2. Check Modals for proper max-w and vertical scroll (AuthModal is an auth card, so max-w-md is standard)
  if (content.includes('fixed inset-0')) {
    const hasWideContainer =
      content.includes('max-w-3xl') ||
      content.includes('max-w-4xl') ||
      content.includes('max-w-5xl') ||
      content.includes('max-w-6xl') ||
      content.includes('max-w-7xl') ||
      fileName === 'AuthModal.tsx';

    if (!hasWideContainer) {
      warnings++;
      findings.push(
        `[WARN]  ${fileName}: Modal ('fixed inset-0') usa largura estreita (< max-w-3xl). Recomendado 'max-w-3xl' ou superior.`
      );
    }

    if (!content.includes('overflow-y-auto') && !content.includes('max-h-')) {
      errors++;
      findings.push(
        `[ERROR] ${fileName}: Modal ('fixed inset-0') sem 'overflow-y-auto' ou 'max-h-[...]' (risco de cortar botões no rodapé).`
      );
    }
  }

  // 3. Check TransactionModal for useRef state protection & identical inclusion/edit screen
  if (fileName === 'TransactionModal.tsx') {
    if (!content.includes('useRef')) {
      errors++;
      findings.push(
        `[ERROR] ${fileName}: Modal de formulário sem 'useRef' para proteger o estado contra re-renders em segundo plano.`
      );
    }
    if (
      !content.includes('applyToAllInstallments') ||
      !content.includes('isRecurring') ||
      !content.includes('installmentTotal')
    ) {
      errors++;
      findings.push(
        `[ERROR] ${fileName}: Formulário sem paridade completa de campos para criação e alteração de parcelamento/recorrência.`
      );
    }
    if (!content.includes('LgpdDlpBanner')) {
      warnings++;
      findings.push(
        `[WARN]  ${fileName}: Modal de transação sem 'LgpdDlpBanner' acoplado ao campo de descrição.`
      );
    }
  }

  // 4. Check App.tsx for LGPD consent and root DLP integration
  if (fileName === 'App.tsx') {
    if (!content.includes('LgpdConsentModal') || !content.includes('LgpdDlpBanner')) {
      errors++;
      findings.push(
        `[ERROR] ${fileName}: App principal sem 'LgpdConsentModal' ou 'LgpdDlpBanner' integrado.`
      );
    }
  }
}

console.log('==========================================================');
console.log('🛡️  DUOFINANCE QA & LGPD GUARDIAN — AUDITORIA DE LAYOUT & DLP');
console.log('==========================================================');
console.log(`Arquivos TSX analisados: ${tsxFiles.length}`);

if (findings.length > 0) {
  findings.forEach((f) => console.log(f));
} else {
  console.log('✅ [PASS] Todos os componentes passaram nos testes de Layout, Responsividade, Estado e LGPD/DLP!');
}

console.log('----------------------------------------------------------');
console.log(`Resumo: ${errors} Erro(s) Crítico(s) | ${warnings} Alerta(s) de Layout/LGPD`);
console.log('==========================================================');

if (errors > 0) {
  process.exit(1);
}

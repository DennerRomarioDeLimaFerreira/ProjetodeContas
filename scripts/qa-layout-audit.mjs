#!/usr/bin/env node
/**
 * DuoFinance QA Guardian — Automated Layout, State & LGPD/DLP Auditor
 * Scans src/components/*.tsx and src/App.tsx for layout clipping, table overflow,
 * modal scrollability, input state protection (useRef), and LGPD DLP integration.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const COMPONENTS_DIR = path.join(ROOT_DIR, 'src', 'components');
const APP_FILE = path.join(ROOT_DIR, 'src', 'App.tsx');

let errors = 0;
let warnings = 0;
const findings = [];

function checkFile(filePath, fileName) {
  const content = fs.readFileSync(filePath, 'utf8');

  // 1. Check tables for overflow-x-auto and min-w-
  if (content.includes('<table')) {
    if (!content.includes('overflow-x-auto')) {
      errors++;
      findings.push(
        `[ERROR] ${fileName}: Possui <table> sem container 'overflow-x-auto' (risco de corte de colunas em mobile/desktop).`
      );
    }
    if (!content.includes('min-w-')) {
      warnings++;
      findings.push(
        `[WARN]  ${fileName}: Possui <table> sem largura mínima 'min-w-[...]' (colunas podem esmagar).`
      );
    }
  }

  // 2. Check Modals for proper max-w and vertical scroll
  if (content.includes('fixed inset-0')) {
    const hasWideContainer =
      content.includes('max-w-3xl') ||
      content.includes('max-w-4xl') ||
      content.includes('max-w-5xl') ||
      content.includes('max-w-6xl') ||
      content.includes('max-w-7xl');

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
    if (content.includes('!editingTransaction &&')) {
      errors++;
      findings.push(
        `[ERROR] ${fileName}: O modal de edição oculta blocos da inclusão ('!editingTransaction &&'). Edição e inclusão devem exibir a mesma tela.`
      );
    }
    if (!content.includes('LgpdDlpBanner')) {
      warnings++;
      findings.push(
        `[WARN]  ${fileName}: Modal de transação sem 'LgpdDlpBanner' acoplado ao campo de descrição.`
      );
    }
  }

  // 4. Check App.tsx for LGPD Consent & DLP Banner
  if (fileName === 'App.tsx') {
    if (!content.includes('LgpdConsentModal') || !content.includes('LgpdDlpBanner')) {
      errors++;
      findings.push(
        `[ERROR] ${fileName}: App principal sem 'LgpdConsentModal' ou 'LgpdDlpBanner' integrado.`
      );
    }
  }
}

const files = fs
  .readdirSync(COMPONENTS_DIR)
  .filter((f) => f.endsWith('.tsx'))
  .map((f) => ({ fullPath: path.join(COMPONENTS_DIR, f), name: f }));

if (fs.existsSync(APP_FILE)) {
  files.push({ fullPath: APP_FILE, name: 'App.tsx' });
}

console.log('==========================================================');
console.log('🛡️  DUOFINANCE QA & LGPD GUARDIAN — AUDITORIA DE LAYOUT & DLP');
console.log('==========================================================');
console.log(`Arquivos TSX analisados: ${files.length}`);

files.forEach((f) => checkFile(f.fullPath, f.name));

if (findings.length === 0) {
  console.log(
    '✅ [PASS] Todos os componentes passaram nos testes de Layout, Responsividade, Estado e LGPD/DLP!'
  );
} else {
  findings.forEach((msg) => console.log(msg));
}

console.log('----------------------------------------------------------');
console.log(
  `Resumo: ${errors} Erro(s) Crítico(s) | ${warnings} Alerta(s) de Layout/LGPD`
);
console.log('==========================================================');

if (errors > 0) {
  process.exit(1);
}

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

console.log('================================================================================');
console.log('🛡️  DUOFINANCE & ERP QA GUARDIAN — EXECUTANDO PIPELINE COMPLETO DE QUALIDADE');
console.log('================================================================================\n');

const scorecard = [];
let allPassed = true;

function runStep(name, command, parser) {
  process.stdout.write(`⏳ Executando: ${name}... `);
  try {
    const output = execSync(command, {
      cwd: rootDir,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const details = parser ? parser(output) : 'Executado com sucesso (0 erros)';
    scorecard.push({ pilar: name, status: '✅ PASS', details });
    console.log('✅ OK');
    return { success: true, output };
  } catch (error) {
    allPassed = false;
    const errorOutput = error.stdout || error.stderr || error.message;
    scorecard.push({
      pilar: name,
      status: '❌ FAIL',
      details: 'Falha durante execução da verificação',
    });
    console.log('❌ FALHOU');
    console.error(`\nDetalhes do erro em ${name}:\n`, errorOutput);
    return { success: false, error: errorOutput };
  }
}

// 1. TypeScript & Contratos Estritos
runStep('1. TypeScript & Contratos', 'npx.cmd tsc -b', () => '0 erros de tipo em src/ e scripts/');

// 2. Vitest — Testes Unitários de Precisão Financeira e Criptografia
runStep('2. Testes de Precisão (Vitest)', 'npx.cmd vitest run', (output) => {
  const match = output.match(/Tests\s+([0-9]+\s+passed)/);
  return match ? `${match[1]} (Cálculos, Faturas & Auth)` : 'Todos os testes unitários passaram';
});

// 3. Layout Responsivo, Modais & Anti-Clipping
runStep('3. Layout Anti-Corte & Modais', 'node scripts/qa-layout-audit.mjs', (output) => {
  const match = output.match(/Arquivos TSX analisados:\s*([0-9]+)/);
  return match ? `${match[1]} componentes TSX em conformidade` : 'Anti-clipping e modais validados';
});

// 4. Governança LGPD, DLP & Multi-Tenant
runStep('4. Governança LGPD, DLP & Multi-Tenant', 'node scripts/verify-security.mjs', () => {
  return 'Regras DLP, máscaras e isolamento de tenants verificados';
});

// 5. Build de Produção & Bundle Budget
runStep('5. Build de Produção (Vite)', 'npx.cmd vite build', (output) => {
  const distDir = path.join(rootDir, 'dist', 'assets');
  if (fs.existsSync(distDir)) {
    const files = fs.readdirSync(distDir);
    const jsFiles = files.filter((f) => f.endsWith('.js'));
    let totalJsBytes = 0;
    jsFiles.forEach((f) => {
      totalJsBytes += fs.statSync(path.join(distDir, f)).size;
    });
    const jsKb = (totalJsBytes / 1024).toFixed(1);
    return `Bundle gerado com sucesso (~${jsKb} kB)`;
  }
  return 'Build minificado gerado com sucesso';
});

// 6. Testes E2E com Simulação Humana Real (Playwright Desktop & Mobile)
runStep('6. E2E Simulação Humana (Playwright)', 'npx.cmd playwright test', (output) => {
  const match = output.match(/([0-9]+\s+passed)/);
  return match ? `${match[1]} (Desktop & Mobile Pixel 7)` : 'Navegação e Isolamento E2E validados';
});

// Autolimpeza de usuários de teste gerados durante o E2E
try {
  execSync('node scripts/cleanup-test-users.mjs', {
    cwd: rootDir,
    stdio: 'ignore',
  });
} catch {
  // Ignora se não houver conexão no momento
}

console.log('\n================================================================================');
console.log('📋 SCORECARD CONSOLIDADO DO QA GUARDIAN');
console.log('================================================================================\n');

console.log('| Pilar de Qualidade                  | Status  | Detalhes & Evidências                    |');
console.log('| :---------------------------------- | :-----: | :--------------------------------------- |');

scorecard.forEach((item) => {
  const pilar = item.pilar.padEnd(36, ' ');
  const status = item.status.padEnd(7, ' ');
  console.log(`| ${pilar} | ${status} | ${item.details.padEnd(40, ' ')} |`);
});

console.log('\n================================================================================');
if (allPassed) {
  console.log('🏆 VEREDITO FINAL DO QA GUARDIAN: APROVADO PARA PRODUÇÃO (ZERO-DEFECT POLICY)');
  console.log('================================================================================\n');
  process.exit(0);
} else {
  console.log('🚫 VEREDITO FINAL DO QA GUARDIAN: REPROVADO — CORRIJA OS ERROS ANTES DO DEPLOY');
  console.log('================================================================================\n');
  process.exit(1);
}

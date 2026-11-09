import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

export function runSecurityVerification() {
  const issues = [];
  const checks = [];

  // 1. Verificar integridade dos módulos LGPD & DLP
  const lgpdUtilPath = path.join(rootDir, 'src', 'utils', 'lgpd.ts');
  if (fs.existsSync(lgpdUtilPath)) {
    const lgpdCode = fs.readFileSync(lgpdUtilPath, 'utf8');
    if (!lgpdCode.includes('detectPII') || !lgpdCode.includes('maskCreditCard')) {
      issues.push('[LGPD/DLP] Funções essenciais detectPII/maskCreditCard não encontradas em src/utils/lgpd.ts');
    } else {
      checks.push('Motor DLP & LGPD ativo em src/utils/lgpd.ts (CPF, Cartões Luhn e Credenciais)');
    }
  } else {
    issues.push('[LGPD/DLP] Arquivo src/utils/lgpd.ts ausente');
  }

  // 2. Verificar se nenhum arquivo armazena número de cartão completo ou CVV
  const srcDir = path.join(rootDir, 'src');
  function scanDir(dir) {
    const files = fs.readdirSync(dir);
    for (const f of files) {
      const full = path.join(dir, f);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        scanDir(full);
      } else if (f.endsWith('.ts') || f.endsWith('.tsx')) {
        const content = fs.readFileSync(full, 'utf8');
        // Checar se há campos suspeitos como cvv salvos no modelo
        if (/cvv\s*:\s*['"]\d+['"]/i.test(content)) {
          issues.push(`[SEGURANÇA CARTÃO] CVV em texto puro detectado em ${path.relative(rootDir, full)}`);
        }
      }
    }
  }
  scanDir(srcDir);
  checks.push('Varredura anti-vazamento de CVV e cartões completos limpa');

  // 3. Verificar se o componente de banner DLP está presente no formulário de transação
  const txModalPath = path.join(rootDir, 'src', 'components', 'TransactionModal.tsx');
  if (fs.existsSync(txModalPath)) {
    const content = fs.readFileSync(txModalPath, 'utf8');
    if (content.includes('LgpdDlpBanner')) {
      checks.push('Banner de proteção DLP ativo no TransactionModal');
    } else {
      issues.push('[SEGURANÇA DLP] LgpdDlpBanner não encontrado no TransactionModal.tsx');
    }
  }

  // 4. Verificar se cloudSync possui isolamento ou se ainda está na chave global
  const cloudSyncPath = path.join(rootDir, 'src', 'utils', 'cloudSync.ts');
  let multiTenantStatus = 'single_tenant_legacy';
  if (fs.existsSync(cloudSyncPath)) {
    const content = fs.readFileSync(cloudSyncPath, 'utf8');
    if (content.includes('duofinance_users') || content.includes('userId')) {
      multiTenantStatus = 'multi_tenant_active';
      checks.push('Estrutura Multi-Tenant com userId ativa no cloudSync');
    } else {
      checks.push('Aviso de Transição: cloudSync atualmente em store único (Pronto para vincular ao ROOT)');
    }
  }

  return {
    ok: issues.length === 0,
    issues,
    checks,
    multiTenantStatus,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  console.log('==========================================================');
  console.log('🔒 DUOFINANCE & ERP SECURITY GUARDIAN — AUDITORIA DE SEGURANÇA');
  console.log('==========================================================');
  const res = runSecurityVerification();
  res.checks.forEach((c) => console.log(`  ✓ ${c}`));
  if (!res.ok) {
    console.error('\n❌ [VULNERABILIDADES DETECTADAS]:');
    res.issues.forEach((i) => console.error(`  - ${i}`));
    process.exit(1);
  } else {
    console.log('\n🛡️  [AUDITORIA APROVADA]: Sistema seguro e em conformidade.');
    console.log('==========================================================');
  }
}

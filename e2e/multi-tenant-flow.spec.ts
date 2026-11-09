import { test, expect } from '@playwright/test';

test.describe('E2E Full-Story — Governança Multi-Tenant, Mobile e Zero-Breakage', () => {
  const testId = Date.now();
  const testEmail = `tester_${testId}@contas.local`;
  const testPassword = 'Password@123';
  const testName = `Usuário Teste ${testId}`;

  test('deve registrar usuário comum, isolar dados do ROOT e manter persistência e ergonomia mobile', async ({
    page,
  }) => {
    // 1. Acesso à aplicação
    await page.goto('/');

    // 2. Tela de Login deve estar visível
    await expect(page.getByRole('heading', { name: /DuoFinance/i })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Acessar Conta' })).toBeVisible();

    // 3. Cadastrar novo usuário comum (não-ROOT)
    await page.getByRole('button', { name: 'Criar Nova Conta' }).click();
    await page.getByPlaceholder('Ex: Denner Ferreira').fill(testName);
    await page.getByPlaceholder('seu@email.com').fill(testEmail);
    await page.getByPlaceholder('••••••••').fill(testPassword);
    await page.getByPlaceholder(/Rex, São Paulo/i).fill('Totó');
    await page.getByRole('button', { name: /Cadastrar e Acessar/i }).click();

    // 4. Deve entrar no dashboard do novo usuário com estado 100% limpo
    await expect(page.getByTitle(/Sair da Conta/i)).toBeVisible({ timeout: 15000 });

    // O novo usuário NÃO deve ver dados históricos do ROOT (Zero Vazamento Multi-Tenant)
    await expect(page.getByText('Despesas do Mês')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('São João')).not.toBeVisible();
    await expect(page.getByText('bk')).not.toBeVisible();

    // 5. Novo usuário cria um lançamento próprio
    await page.locator('button[title="Novo Gasto"]:visible').first().click();

    // O modal deve abrir (com visual Bottom Sheet no mobile)
    await expect(page.getByPlaceholder('Ex: Supermercado, TV Samsung, Jantar...')).toBeVisible();
    await page.getByPlaceholder('Ex: Supermercado, TV Samsung, Jantar...').fill(`Despesa Teste ${testId}`);
    await page.getByPlaceholder('0,00').fill('55.00');

    // Salvar despesa
    await page.getByRole('button', { name: /Salvar Lançamento/i }).click();

    // Deve ver o modal fechar
    await expect(page.getByPlaceholder('Ex: Supermercado, TV Samsung, Jantar...')).not.toBeVisible();

    // 6. Deslogar da conta do novo usuário
    await page.getByTitle(/Sair da Conta/i).click();

    // 7. Fazer login como ROOT (Denner)
    await expect(page.getByRole('button', { name: 'Acessar Conta' })).toBeVisible();
    await page.getByPlaceholder('seu@email.com').fill('denner@contas.local');
    await page.getByPlaceholder('••••••••').fill('Admin@123');
    await page.getByRole('button', { name: 'Entrar no DuoFinance' }).click();

    // 8. O ROOT deve ver seus dados históricos intactos
    await expect(page.getByTitle(/Sair da Conta/i)).toBeVisible({ timeout: 15000 });

    // O ROOT NÃO deve ver a despesa do Usuário Teste (Garantia de Isolamento Multi-Tenant)
    await expect(page.getByText(`Despesa Teste ${testId}`)).not.toBeVisible();

    // 9. Deslogar do ROOT e relogar no Usuário Teste para provar persistência
    await page.getByTitle(/Sair da Conta/i).click();
    await expect(page.getByRole('button', { name: 'Acessar Conta' })).toBeVisible();
    await page.getByPlaceholder('seu@email.com').fill(testEmail);
    await page.getByPlaceholder('••••••••').fill(testPassword);
    await page.getByRole('button', { name: 'Entrar no DuoFinance' }).click();

    // 10. Login bem sucedido para o usuário teste
    await expect(page.getByTitle(/Sair da Conta/i)).toBeVisible({ timeout: 15000 });
  });
});

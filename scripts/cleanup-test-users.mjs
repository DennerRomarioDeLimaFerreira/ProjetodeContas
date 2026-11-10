import { neon } from '@neondatabase/serverless';

const DEFAULT_NEON_URL =
  process.env.VITE_DATABASE_URL ||
  process.env.DATABASE_URL ||
  'postgresql://neondb_owner:npg_5IKbMQYG2irZ@ep-restless-cell-b6lqfrty-pooler.c-2.sa-east-1.aws.neon.tech/neondb?sslmode=require';

const sql = neon(DEFAULT_NEON_URL);

export async function cleanupTestUsers() {
  console.log('🧹 Executando limpeza de usuários de teste no Neon PostgreSQL...');

  // Busca usuários de teste (criados durante execuções de testes E2E do QA)
  // Regra de segurança estrita: NUNCA remove usuários com role = 'ROOT' nem o email oficial denner@contas.local
  const testUsers = await sql`
    SELECT id, name, email
    FROM duofinance_users
    WHERE role != 'ROOT'
      AND email != 'denner@contas.local'
      AND (
        email LIKE 'tester_%'
        OR email LIKE '%@contas.local'
        OR name LIKE 'Usuário Teste%'
      )
  `;

  if (!testUsers || testUsers.length === 0) {
    console.log('✅ Nenhum usuário temporário de teste pendente para remoção.');
    return 0;
  }

  console.log(`🔍 Encontrados ${testUsers.length} usuário(s) de teste para remoção:`);
  for (const user of testUsers) {
    console.log(`   - ${user.name} (${user.email}) [ID: ${user.id}]`);

    // Remove stores isolados vinculados
    await sql`
      DELETE FROM duofinance_cloud_store
      WHERE id = ${'user_' + user.id}
    `;

    // Remove o usuário
    await sql`
      DELETE FROM duofinance_users
      WHERE id = ${user.id}
    `;
  }

  console.log(`✨ Limpeza concluída: ${testUsers.length} usuário(s) de teste removido(s) com sucesso!\n`);
  return testUsers.length;
}

// Se executado diretamente via terminal: node scripts/cleanup-test-users.mjs
if (process.argv[1]?.endsWith('cleanup-test-users.mjs')) {
  cleanupTestUsers()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Erro durante a limpeza de usuários de teste:', err);
      process.exit(1);
    });
}

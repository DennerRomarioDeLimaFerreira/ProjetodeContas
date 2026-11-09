---
name: security-lgpd-audit
description: Procedimento padrão para auditar isolamento Multi-Tenant por usuário, autenticação segura, criptografia de senhas e conformidade LGPD/DLP no ProjetodeContas.
---

# Skill: Auditoria de Segurança e LGPD (`security-lgpd-audit`)

Execute este procedimento sempre que criar ou alterar rotas de autenticação, tabelas de banco, persistência de dados ou componentes de login:

1. **Auditoria Automatizada de Segurança:**
   Execute o script de verificação de segurança:
   ```bash
   node scripts/verify-security.mjs
   ```
2. **Inspeção de Isolamento de Dados:**
   - Confirmar que nenhuma query no banco carrega ou salva dados sem o `userId` autenticado.
   - Confirmar que o usuário `ROOT` acessa os dados consolidados históricos enquanto novos usuários possuem stores completamente vazios e isolados.
3. **Inspeção de Criptografia & Segredos:**
   - Confirmar que as senhas são processadas com algoritmo de hash e salt seguro (`crypto.subtle`).
   - Confirmar que números completos de cartão de crédito e CVV continuam proibidos de serem armazenados.
4. **Inspeção DLP & LGPD:**
   - Confirmar que o banner e mascarador de dados pessoais estão operantes nos inputs.
5. **Emissão do Parecer:**
   - Emitir o relatório oficial do `sec-lgpd-auditor` com o veredito de segurança.

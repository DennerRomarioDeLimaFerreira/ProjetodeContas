import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  KeyRound,
  Loader2,
  Plus,
  Shield,
  Trash2,
  User,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { AuthUser, SECURITY_QUESTIONS } from '../types/auth';
import { Member } from '../types/finance';
import {
  adminDeleteUser,
  adminListUsers,
  adminResetUserPassword,
  adminUpdateUserLinkedMember,
  registerUser,
} from '../utils/authService';

interface UsersManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AuthUser;
  members: Member[];
}

export const UsersManagementModal: React.FC<UsersManagementModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  members,
}) => {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal Novo Usuário interno
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newQuestion, setNewQuestion] = useState<string>(SECURITY_QUESTIONS[0]);
  const [newAnswer, setNewAnswer] = useState('');
  const [newLinkedMemberId, setNewLinkedMemberId] = useState<string>('');

  // Modal Redefinir Senha
  const [targetResetUser, setTargetResetUser] = useState<AuthUser | null>(null);
  const [adminNewPassword, setAdminNewPassword] = useState('');

  const loadUsers = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const list = await adminListUsers();
      setUsers(list);
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Falha ao carregar lista de usuários.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadUsers();
      setShowCreateForm(false);
      setTargetResetUser(null);
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      await registerUser({
        name: newName,
        email: newEmail,
        password: newPassword,
        securityQuestion: newQuestion,
        securityAnswer: newAnswer,
        linkedMemberId: newLinkedMemberId || undefined,
      });

      setSuccessMsg(`Usuário "${newName}" criado com sucesso!`);
      setNewName('');
      setNewEmail('');
      setNewPassword('');
      setNewAnswer('');
      setNewLinkedMemberId('');
      setShowCreateForm(false);
      await loadUsers();
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Erro ao criar usuário.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateLinkedMember = async (userId: string, memberId: string) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      await adminUpdateUserLinkedMember(userId, memberId || null);
      setSuccessMsg('Vínculo de membro atualizado com sucesso!');
      await loadUsers();
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Erro ao atualizar vínculo do usuário.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAdminResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetResetUser) return;
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      await adminResetUserPassword(targetResetUser.id, adminNewPassword);
      setSuccessMsg(`Senha do usuário "${targetResetUser.name}" redefinida com sucesso!`);
      setTargetResetUser(null);
      setAdminNewPassword('');
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Erro ao redefinir senha.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userToDelete: AuthUser) => {
    if (userToDelete.id === currentUser.id) {
      alert('Você não pode excluir sua própria conta ROOT.');
      return;
    }

    if (
      !window.confirm(
        `Tem certeza que deseja remover o usuário "${userToDelete.name}" (${userToDelete.email})?\n\nO espaço financeiro dele será permanentemente desvinculado.`
      )
    ) {
      return;
    }

    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      await adminDeleteUser(userToDelete.id, currentUser.id);
      setSuccessMsg(`Usuário "${userToDelete.name}" removido.`);
      await loadUsers();
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Erro ao excluir usuário.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/80 backdrop-blur-md p-0 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden my-0 sm:my-auto flex flex-col max-h-[92vh] sm:max-h-[85vh] animate-in fade-in slide-in-from-bottom-4 duration-200">
        {/* Puxador tátil no mobile */}
        <div className="w-12 h-1.5 bg-slate-700/80 rounded-full mx-auto my-2.5 sm:hidden shrink-0" />

        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Gerenciamento de Usuários
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-semibold px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Painel ROOT
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Gerencie contas, redefina senhas e crie novos acessos independentes
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Messages */}
        {(errorMsg || successMsg) && (
          <div className="px-6 pt-4">
            {errorMsg && (
              <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
            {successMsg && (
              <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}
          </div>
        )}

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Top Actions */}
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-slate-400">
              Total cadastrados: <strong className="text-white">{users.length}</strong>
            </span>

            <button
              type="button"
              onClick={() => {
                setShowCreateForm(!showCreateForm);
                setTargetResetUser(null);
              }}
              className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 transition"
            >
              <UserPlus className="w-4 h-4" />
              {showCreateForm ? 'Cancelar' : 'Novo Usuário'}
            </button>
          </div>

          {/* Form: Criar Usuário pelo ROOT */}
          {showCreateForm && (
            <form
              onSubmit={handleCreateUser}
              className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-3 animate-in fade-in"
            >
              <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-emerald-400" />
                Cadastrar Novo Usuário
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Nome Completo
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Maria Silva"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    E-mail
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="maria@email.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Senha Provisória (mín. 6 chars)
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Resposta da Pergunta Secreta
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Palavra-chave secreta"
                    value={newAnswer}
                    onChange={(e) => setNewAnswer(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Pergunta Secreta
                </label>
                <select
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  {SECURITY_QUESTIONS.map((q, idx) => (
                    <option key={idx} value={q} className="bg-slate-900 text-white">
                      {q}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Vincular a Participante da Casa (Opcional)
                </label>
                <select
                  value={newLinkedMemberId}
                  onChange={(e) => setNewLinkedMemberId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="" className="bg-slate-900 text-slate-400">
                    Nenhum (Criar espaço independente e isolado)
                  </option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id} className="bg-slate-900 text-white">
                      {m.name} (Ver extrato & faturas desta casa)
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-500 mt-1">
                  Se vinculado a um membro, ao logar este usuário verá seu extrato pessoal e contas a pagar do domicílio familiar.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 text-xs rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-1.5 bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1"
                >
                  {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Salvar Usuário
                </button>
              </div>
            </form>
          )}

          {/* Form: Redefinir Senha de Usuário pelo ROOT */}
          {targetResetUser && (
            <form
              onSubmit={handleAdminResetPassword}
              className="bg-slate-950/70 border border-amber-500/40 rounded-2xl p-4 space-y-3 animate-in fade-in"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-amber-400" />
                  Redefinir Senha de: {targetResetUser.name} ({targetResetUser.email})
                </h3>
                <button
                  type="button"
                  onClick={() => setTargetResetUser(null)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Nova Senha (mínimo 6 caracteres)
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="Digite a nova senha para o usuário"
                  value={adminNewPassword}
                  onChange={(e) => setAdminNewPassword(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setTargetResetUser(null)}
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 text-xs rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1"
                >
                  {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Confirmar Nova Senha
                </button>
              </div>
            </form>
          )}

          {/* Tabela de Usuários */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[650px] text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/80">
                    <th className="py-3 px-4 font-medium">Usuário</th>
                    <th className="py-3 px-4 font-medium">E-mail</th>
                    <th className="py-3 px-4 font-medium">Perfil</th>
                    <th className="py-3 px-4 font-medium">Membro Vinculado</th>
                    <th className="py-3 px-4 font-medium">Cadastrado em</th>
                    <th className="py-3 px-4 font-medium text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {users.map((u) => {
                    const isRoot = u.role === 'ROOT';
                    const isMe = u.id === currentUser.id;

                    return (
                      <tr key={u.id} className="hover:bg-slate-900/40 transition">
                        <td className="py-3 px-4 font-semibold text-white flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center text-[10px] font-bold">
                            <User className="w-3 h-3" />
                          </div>
                          <span>{u.name}</span>
                          {isMe && (
                            <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-normal">
                              Você
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-300">{u.email}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1 w-max ${
                              isRoot
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            <Shield className="w-3 h-3" />
                            {isRoot ? 'ROOT' : 'USUÁRIO'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {isRoot ? (
                            <span className="text-slate-400 italic text-[11px]">
                              Titular Master
                            </span>
                          ) : (
                            <select
                              value={u.linkedMemberId || ''}
                              onChange={(e) => handleUpdateLinkedMember(u.id, e.target.value)}
                              disabled={loading}
                              className="bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-emerald-500 hover:border-slate-700 transition"
                            >
                              <option value="">Nenhum (Independente)</option>
                              {members.map((m) => (
                                <option key={m.id} value={m.id}>
                                  {m.name}
                                </option>
                              ))}
                            </select>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-400">
                          {new Date(u.createdAt).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setTargetResetUser(u);
                                setShowCreateForm(false);
                              }}
                              title="Redefinir Senha do Usuário"
                              className="p-1.5 text-slate-400 hover:text-amber-300 hover:bg-slate-800 rounded-lg transition"
                            >
                              <KeyRound className="w-3.5 h-3.5" />
                            </button>

                            {!isMe && !isRoot && (
                              <button
                                type="button"
                                onClick={() => handleDeleteUser(u)}
                                title="Excluir Usuário"
                                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
          <span>O usuário ROOT tem acesso total e controle de todas as contas.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  Shield,
  ShieldCheck,
  User,
  UserPlus,
} from 'lucide-react';
import { AuthSession, SECURITY_QUESTIONS } from '../types/auth';
import {
  getSecurityQuestionForEmail,
  loginUser,
  recoverPassword,
  registerUser,
} from '../utils/authService';

interface AuthModalProps {
  onLoginSuccess: (session: AuthSession) => void;
}

type AuthMode = 'login' | 'register' | 'forgot';

export const AuthModal: React.FC<AuthModalProps> = ({ onLoginSuccess }) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Register extra fields
  const [securityQuestion, setSecurityQuestion] = useState<string>(
    SECURITY_QUESTIONS[0]
  );
  const [securityAnswer, setSecurityAnswer] = useState('');

  // Forgot password fields
  const [forgotStep, setForgotStep] = useState<1 | 2>(1);
  const [fetchedQuestion, setFetchedQuestion] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const resetMessages = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const switchMode = (newMode: AuthMode) => {
    resetMessages();
    setMode(newMode);
    setForgotStep(1);
    setFetchedQuestion(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    setLoading(true);

    try {
      const session = await loginUser(email, password);
      onLoginSuccess(session);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Falha ao realizar login.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    setLoading(true);

    try {
      const session = await registerUser({
        name,
        email,
        password,
        securityQuestion,
        securityAnswer,
      });
      onLoginSuccess(session);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Falha ao cadastrar usuário.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleFetchQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    setLoading(true);

    try {
      const question = await getSecurityQuestionForEmail(email);
      setFetchedQuestion(question);
      setForgotStep(2);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Não foi possível localizar o usuário.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRecoverPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();

    if (newPassword !== confirmPassword) {
      setErrorMessage('As senhas digitadas não coincidem.');
      return;
    }

    setLoading(true);
    try {
      await recoverPassword({
        email,
        securityAnswer,
        newPassword,
      });
      setSuccessMessage('Senha redefinida com sucesso! Você já pode entrar.');
      setPassword(newPassword);
      setMode('login');
      setForgotStep(1);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Falha ao redefinir a senha. Verifique a resposta secreta.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Cabeçalho Visual */}
        <div className="bg-gradient-to-r from-emerald-950/70 via-slate-900 to-slate-900 p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black shadow-inner">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-1.5">
                DuoFinance
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-semibold border border-emerald-500/30">
                  Cloud Auth
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Gestão financeira compartilhada segura
              </p>
            </div>
          </div>
        </div>

        {/* Abas */}
        <div className="grid grid-cols-2 border-b border-slate-800 text-xs font-semibold bg-slate-950/50">
          <button
            type="button"
            onClick={() => switchMode('login')}
            className={`py-3 text-center transition border-b-2 ${
              mode === 'login'
                ? 'border-emerald-400 text-emerald-300 bg-slate-900/60'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Acessar Conta
          </button>
          <button
            type="button"
            onClick={() => switchMode('register')}
            className={`py-3 text-center transition border-b-2 ${
              mode === 'register'
                ? 'border-emerald-400 text-emerald-300 bg-slate-900/60'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Criar Nova Conta
          </button>
        </div>

        {/* Mensagens de Feedback */}
        <div className="px-6 pt-4">
          {errorMessage && (
            <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-start gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}
        </div>

        {/* Formulário: LOGIN */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                E-mail
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none transition"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-slate-300">
                  Senha
                </label>
                <button
                  type="button"
                  onClick={() => switchMode('forgot')}
                  className="text-[11px] text-emerald-400 hover:text-emerald-300 hover:underline"
                >
                  Esqueci minha senha
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl pl-9 pr-10 py-2 text-sm text-white placeholder-slate-600 focus:outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition cursor-pointer mt-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Entrar no DuoFinance
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Dica para o ROOT */}
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 text-[11px] text-slate-400 space-y-1">
              <span className="font-semibold text-slate-300 flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                Acesso ROOT Inicial:
              </span>
              <p>
                E-mail: <strong className="text-white">denner@contas.local</strong> | Senha: <strong className="text-white">Admin@123</strong>
              </p>
              <p className="text-[10px] text-slate-500">
                (Acessa diretamente a base histórica consolidada do Neon).
              </p>
            </div>
          </form>
        )}

        {/* Formulário: CRIAR CONTA */}
        {mode === 'register' && (
          <form onSubmit={handleRegister} className="p-6 space-y-3.5">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Nome Completo
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  placeholder="Ex: Denner Ferreira"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                E-mail
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Senha (mínimo 6 caracteres)
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl pl-9 pr-10 py-2 text-sm text-white placeholder-slate-600 focus:outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Pergunta de Segurança para Recuperação Autônoma */}
            <div className="pt-2 border-t border-slate-800/80 space-y-2">
              <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                <KeyRound className="w-3.5 h-3.5" />
                Segurança: Recuperação de Senha
              </span>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Pergunta Secreta
                </label>
                <select
                  value={securityQuestion}
                  onChange={(e) => setSecurityQuestion(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
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
                  Sua Resposta Secreta
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Rex, São Paulo, etc."
                  value={securityAnswer}
                  onChange={(e) => setSecurityAnswer(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Usada para você redefinir sua senha caso esqueça.
                </p>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition cursor-pointer mt-3"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Cadastrar e Acessar
                </>
              )}
            </button>
          </form>
        )}

        {/* Formulário: ESQUECI MINHA SENHA */}
        {mode === 'forgot' && (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-emerald-400" />
                Recuperação de Senha
              </h3>
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="text-xs text-slate-400 hover:text-white"
              >
                Voltar ao Login
              </button>
            </div>

            {forgotStep === 1 ? (
              <form onSubmit={handleFetchQuestion} className="space-y-3">
                <p className="text-xs text-slate-400">
                  Informe o seu e-mail cadastrado para buscar sua pergunta secreta de segurança:
                </p>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none transition"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      Continuar
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleRecoverPassword} className="space-y-3">
                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-xs space-y-1">
                  <span className="text-[11px] text-emerald-400 font-semibold block">
                    Pergunta Secreta Cadastrada:
                  </span>
                  <p className="text-white font-medium">{fetchedQuestion}</p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Sua Resposta Secreta
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Digite a resposta que cadastrou"
                    value={securityAnswer}
                    onChange={(e) => setSecurityAnswer(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Nova Senha
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="No mínimo 6 caracteres"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Confirme a Nova Senha
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="Repita a nova senha"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setForgotStep(1)}
                    className="w-1/3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl transition"
                  >
                    Voltar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-2/3 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Salvar Nova Senha'
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

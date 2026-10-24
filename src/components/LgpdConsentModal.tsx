import React from 'react';
import {
  CheckCircle2,
  Eye,
  FileText,
  Lock,
  ShieldCheck,
  X,
} from 'lucide-react';

interface LgpdConsentModalProps {
  isOpen: boolean;
  userName: string;
  acceptedAt?: string | null;
  onConsentAccepted: () => void;
  onClose: () => void;
}

export const LgpdConsentModal: React.FC<LgpdConsentModalProps> = ({
  isOpen,
  userName,
  acceptedAt,
  onConsentAccepted,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 w-full max-w-3xl overflow-hidden flex flex-col my-8">
        {/* Cabeçalho */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-emerald-950/60 to-slate-900 text-white flex items-center justify-between gap-3.5 border-b border-slate-800">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-white tracking-wide">
                  Termo de Privacidade, DLP & Governança LGPD
                </h2>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                  Lei 13.709/2018
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Olá, <strong>{userName}</strong>. Proteção ativa para seus dados financeiros e cartões no DuoFinance.
              </p>
            </div>
          </div>

          {acceptedAt && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Corpo com Diretrizes */}
        <div className="p-6 space-y-4 max-h-[68vh] overflow-y-auto text-xs text-slate-300">
          <p className="leading-relaxed text-slate-300">
            Para garantir conformidade com a{' '}
            <strong>Lei Geral de Proteção de Dados (LGPD)</strong> no controle de gastos, cartões e finanças compartilhadas, o DuoFinance aplica os seguintes mecanismos ativos:
          </p>

          <div className="space-y-3">
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0 mt-0.5 font-bold">
                <Lock className="w-3.5 h-3.5" />
              </div>
              <div className="space-y-0.5">
                <strong className="block text-white font-bold text-xs">
                  1. Minimização de Dados Sensíveis & DLP Ativo (Art. 6º, III)
                </strong>
                <p className="text-slate-400 leading-relaxed text-[11px]">
                  Nunca armazene a numeração completa de 16 dígitos do cartão, CVV, senhas ou CPFs na descrição dos gastos. Nosso{' '}
                  <strong className="text-amber-300">Guardião LGPD (DLP)</strong> monitora os campos de texto em tempo real e oferece mascaramento automático em 1 clique (`123.***.***-01` / `**** **** **** 1234`).
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0 mt-0.5 font-bold">
                <Eye className="w-3.5 h-3.5" />
              </div>
              <div className="space-y-0.5">
                <strong className="block text-white font-bold text-xs">
                  2. Cadastro Seguro de Cartões (Apenas 4 Últimos Dígitos)
                </strong>
                <p className="text-slate-400 leading-relaxed text-[11px]">
                  No módulo de Cartões de Crédito, armazenamos exclusivamente o apelido do cartão, bandeira, dias de fechamento/vencimento e os 4 últimos dígitos para identificação visual segura.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-violet-500/20 text-violet-300 flex items-center justify-center shrink-0 mt-0.5 font-bold">
                <FileText className="w-3.5 h-3.5" />
              </div>
              <div className="space-y-0.5">
                <strong className="block text-white font-bold text-xs">
                  3. Sincronização Criptografada SSL/TLS (Art. 46)
                </strong>
                <p className="text-slate-400 leading-relaxed text-[11px]">
                  A comunicação com o banco em nuvem (Neon PostgreSQL) ocorre exclusivamente via conexão criptografada (`sslmode=require`), com opção de backup e exclusão integral dos dados a qualquer momento pelo titular (Art. 18).
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Rodapé de Ação */}
        <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>
              {acceptedAt
                ? `Consentimento LGPD ativo desde ${new Date(acceptedAt).toLocaleString('pt-BR')}`
                : 'Proteção DLP ativa em todos os formulários e importações'}
            </span>
          </div>

          <button
            type="button"
            onClick={onConsentAccepted}
            className="px-5 py-2.5 text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl shadow-lg shadow-emerald-500/20 transition flex items-center gap-2 cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{acceptedAt ? 'Fechar Painel LGPD' : 'Concordo e Ativar Proteção'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

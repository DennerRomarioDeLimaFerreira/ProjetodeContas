import React from 'react';
import { ShieldAlert, Sparkles } from 'lucide-react';
import { detectPII } from '../utils/lgpd';

interface LgpdDlpBannerProps {
  text: string;
  onApplyMask?: (sanitizedText: string) => void;
  className?: string;
}

export const LgpdDlpBanner: React.FC<LgpdDlpBannerProps> = ({
  text,
  onApplyMask,
  className = '',
}) => {
  const scan = React.useMemo(() => detectPII(text), [text]);

  if (!scan.hasPII) return null;

  return (
    <div
      className={`p-3 bg-amber-500/10 border border-amber-500/40 rounded-xl text-amber-200 flex items-start gap-2.5 shadow-sm ${className}`}
    >
      <div className="w-6 h-6 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center shrink-0 mt-0.5">
        <ShieldAlert className="w-3.5 h-3.5" />
      </div>

      <div className="flex-1 space-y-1">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wide">
              Guardião LGPD (DLP)
            </span>
            <span className="text-[10px] bg-amber-500/20 text-amber-200 border border-amber-500/30 font-extrabold px-1.5 py-0.5 rounded-full">
              {scan.items.length}{' '}
              {scan.items.length === 1 ? 'dado sensível' : 'dados sensíveis'}
            </span>
          </div>

          {onApplyMask && (
            <button
              type="button"
              onClick={() => onApplyMask(scan.sanitizedText)}
              className="px-2.5 py-1 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg shadow-xs transition flex items-center gap-1 cursor-pointer"
            >
              <Sparkles className="w-3 h-3" />
              <span>Mascarar com 1 clique</span>
            </button>
          )}
        </div>

        <p className="text-[11px] text-amber-200/90 leading-relaxed">
          {scan.items.map((i) => i.message).join(' ')}{' '}
          <span className="text-amber-300/90 font-medium">
            Conforme a LGPD (Lei 13.709/2018), evite armazenar CPF completo, número integral de cartão ou senhas na descrição.
          </span>
        </p>
      </div>
    </div>
  );
};

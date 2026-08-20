import React, { useState } from 'react';
import { Lock, KeyRound, ShieldAlert, Check, X } from 'lucide-react';

interface OperatorPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// Master / Operator default PIN is '2026' or '1234'
const VALID_PINS = ['2026', '1234', '703', '701'];

export const OperatorPinModal: React.FC<OperatorPinModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (VALID_PINS.includes(pin.trim())) {
      setError(null);
      setPin('');
      onSuccess();
      onClose();
    } else {
      setError('PIN incorreto. Acesso restrito a operadores autorizados.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-base">
            <Lock className="w-5 h-5 text-cyan-400" />
            <h3>Acesso do Operador</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-300">
          Visitantes e o público externo têm acesso <strong className="text-cyan-300">somente leitura</strong>. Digite o PIN de operação para criar, editar ou excluir marcações de barcaças no gráfico:
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-slate-400 font-mono block mb-1">
              PIN de Segurança do Operador:
            </label>
            <div className="relative">
              <input
                type="password"
                maxLength={8}
                autoFocus
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  setError(null);
                }}
                placeholder="••••"
                className="w-full text-center text-xl font-mono tracking-widest px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-cyan-500 font-bold"
              />
              <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
            </div>
            {error && (
              <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5" />
                {error}
              </p>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-lg shadow-cyan-600/30 transition flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              Liberar Acesso
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

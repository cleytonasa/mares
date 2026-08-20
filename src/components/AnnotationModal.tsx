import React, { useState, useEffect } from 'react';
import { TideAnnotation, AnnotationCategory, BargeTripStatus, BARGE_FLEET_PRESETS } from '../types/maritime';
import { Ship, Anchor, Waves, AlertTriangle, Compass, Clock, X, Trash2, Edit3, Lock, ShieldCheck } from 'lucide-react';

interface AnnotationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (annotation: Omit<TideAnnotation, 'id' | 'createdAt'>, editingId?: string) => void;
  onDelete?: (id: string) => void;
  editingAnnotation: TideAnnotation | null;
  selectedDateTime: Date;
  portId: 'areia_branca' | 'macau';
}

export const AnnotationModal: React.FC<AnnotationModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  editingAnnotation,
  selectedDateTime,
  portId,
}) => {
  const [title, setTitle] = useState<string>('Dona Yolanda');
  const [category, setCategory] = useState<AnnotationCategory>('barcaca');
  const [bargeStatus, setBargeStatus] = useState<BargeTripStatus>('Operação de Descarga');
  const [timeStr, setTimeStr] = useState<string>('12:00');
  const [dateStr, setDateStr] = useState<string>('');
  const [estimatedDraft, setEstimatedDraft] = useState<string>('2.8');
  const [notes, setNotes] = useState<string>('');
  const [color, setColor] = useState<string>('#38bdf8');

  // Format initial values
  useEffect(() => {
    if (editingAnnotation) {
      setTitle(editingAnnotation.title);
      setCategory(editingAnnotation.category);
      setBargeStatus(editingAnnotation.bargeStatus || 'Operação de Descarga');
      const dt = new Date(editingAnnotation.dateTime);
      const hours = String(dt.getHours()).padStart(2, '0');
      const mins = String(dt.getMinutes()).padStart(2, '0');
      setTimeStr(`${hours}:${mins}`);
      setDateStr(dt.toISOString().split('T')[0]);
      setEstimatedDraft(editingAnnotation.estimatedDraft ? String(editingAnnotation.estimatedDraft) : '2.8');
      setNotes(editingAnnotation.notes || '');
      setColor(editingAnnotation.color || '#38bdf8');
    } else {
      const hours = String(selectedDateTime.getHours()).padStart(2, '0');
      const mins = String(selectedDateTime.getMinutes()).padStart(2, '0');
      setTimeStr(`${hours}:${mins}`);
      setDateStr(selectedDateTime.toISOString().split('T')[0]);
      setTitle('Dona Yolanda');
      setCategory('barcaca');
      setBargeStatus('Operação de Descarga');
      setEstimatedDraft('2.8');
      setNotes('');
      setColor('#38bdf8');
    }
  }, [editingAnnotation, selectedDateTime, isOpen]);

  if (!isOpen) return null;

  const handleSelectPreset = (preset: typeof BARGE_FLEET_PRESETS[0]) => {
    setTitle(preset.name);
    setCategory(preset.type as AnnotationCategory);
    if (preset.defaultDraft > 0) {
      setEstimatedDraft(String(preset.defaultDraft));
    }
    setColor(preset.color);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    // Combine date and time
    const [year, month, day] = dateStr.split('-').map(Number);
    const [hours, mins] = timeStr.split(':').map(Number);
    const targetDt = new Date(year, month - 1, day, hours, mins, 0);

    onSave(
      {
        portId,
        title: title.trim(),
        dateTime: targetDt.toISOString(),
        category,
        bargeStatus: category === 'barcaca' ? bargeStatus : undefined,
        estimatedDraft: estimatedDraft ? parseFloat(estimatedDraft) : undefined,
        notes: notes.trim(),
        color,
      },
      editingAnnotation?.id
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5 text-cyan-400 font-bold text-base">
            <Ship className="w-5 h-5" />
            <h3>{editingAnnotation ? 'Editar Marcação Operacional' : 'Nova Marcação de Manobra / Barcaça'}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Presets (Frota de Barcaças) */}
        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-1.5">
            Atalhos Rápidos da Frota de Barcaças:
          </label>
          <div className="flex flex-wrap gap-1.5">
            {BARGE_FLEET_PRESETS.map((p) => {
              const isSelected = title === p.name;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelectPreset(p)}
                  className={`px-2.5 py-1 text-xs rounded-lg font-mono font-medium transition flex items-center gap-1.5 border ${
                    isSelected
                      ? 'bg-cyan-950/90 text-cyan-200 border-cyan-500 ring-1 ring-cyan-400'
                      : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                  {p.name}
                </button>
              );
            })}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-300 font-medium block mb-1">
                Nome da Embarcação / Evento *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Barcaça 01"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-500 font-semibold"
              />
            </div>

            <div>
              <label className="text-xs text-slate-300 font-medium block mb-1">
                Categoria Náutica
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as AnnotationCategory)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="barcaca">⛴️ Barcaça Salineira</option>
                <option value="rebocador">🛥️ Rebocador / Apoio</option>
                <option value="navio">🚢 Navio Mercante / Graneleiro</option>
                <option value="faina">⚓ Faina de Carregamento</option>
                <option value="calado">🌊 Janela de Calado Máximo</option>
                <option value="aviso">⚠️ Aviso Operacional</option>
              </select>
            </div>
          </div>

          {/* Status of barge */}
          {category === 'barcaca' && (
            <div>
              <label className="text-xs text-slate-300 font-medium block mb-1">
                Status da Viagem / Faina
              </label>
              <select
                value={bargeStatus}
                onChange={(e) => setBargeStatus(e.target.value as BargeTripStatus)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-cyan-300 focus:outline-none focus:border-cyan-500 font-medium"
              >
                <option value="Finalizada">🟢 Finalizada</option>
                <option value="Operação de Descarga">🟣 Operação de Descarga</option>
                <option value="No largo / Aguardando">🔴 No largo / Aguardando</option>
              </select>
            </div>
          )}

          {/* Date & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-300 font-medium block mb-1">
                Data do Evento
              </label>
              <input
                type="date"
                required
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>

            <div>
              <label className="text-xs text-slate-300 font-medium block mb-1">
                Horário da Manobra (HH:MM) *
              </label>
              <input
                type="time"
                required
                value={timeStr}
                onChange={(e) => setTimeStr(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-500 font-mono font-bold"
              />
            </div>
          </div>

          {/* Draft & Color */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-300 font-medium block mb-1">
                Calado Previsto / Operacional (m)
              </label>
              <input
                type="number"
                step="0.05"
                min="0"
                max="15"
                value={estimatedDraft}
                onChange={(e) => setEstimatedDraft(e.target.value)}
                placeholder="Ex: 2.80"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>

            <div>
              <label className="text-xs text-slate-300 font-medium block mb-1">
                Cor do Marcador no Gráfico
              </label>
              <div className="flex items-center gap-2 pt-1">
                {['#38bdf8', '#06b6d4', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#f43f5e'].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-6 h-6 rounded-full transition ${color === c ? 'ring-2 ring-white scale-110' : 'opacity-70 hover:opacity-100'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs text-slate-300 font-medium block mb-1">
              Observações / Canal / Praticagem (Opcional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Digite observações operacionais se necessário (opcional)"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-500 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-800">
            {editingAnnotation && onDelete ? (
              <button
                type="button"
                onClick={() => {
                  onDelete(editingAnnotation.id);
                  onClose();
                }}
                className="px-3 py-2 rounded-xl bg-red-950/80 hover:bg-red-900 text-red-300 border border-red-800 text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <Trash2 className="w-4 h-4" />
                Excluir Marcação
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-lg shadow-cyan-600/30 transition flex items-center gap-1.5"
              >
                <ShieldCheck className="w-4 h-4" />
                {editingAnnotation ? 'Salvar Alterações' : 'Fixar no Gráfico'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

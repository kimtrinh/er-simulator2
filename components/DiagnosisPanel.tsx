import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Star, X, ArrowLeft, FileSignature, Brain, Check } from 'lucide-react';
import { WorkingDiagnosis } from '../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Props {
  diagnoses: WorkingDiagnosis[];
  onAdd: (name: string) => void;
  onRemove: (id: string) => void;
  onSetConfidence: (id: string, confidence: WorkingDiagnosis['confidence']) => void;
  onDocument: () => void;
  onBackToSimRoom: () => void;
  disabled: boolean;
  variant?: 'page' | 'panel';
}

const COMMON_DIAGNOSES = [
  'Acute coronary syndrome',
  'Pulmonary embolism',
  'Aortic dissection',
  'Septic shock',
  'Hemorrhagic shock',
  'Tension pneumothorax',
  'Cardiac tamponade',
  'Diabetic ketoacidosis',
  'Acute stroke',
  'Subarachnoid hemorrhage',
  'Anaphylaxis',
  'GI bleed',
  'Ruptured AAA',
  'Ectopic pregnancy',
  'Bowel obstruction',
  'Meningitis',
  'Status epilepticus',
  'Toxic ingestion',
];

const CONFIDENCE_ORDER: WorkingDiagnosis['confidence'][] = ['leading', 'considering', 'ruled-out'];

const CONFIDENCE_LABEL: Record<WorkingDiagnosis['confidence'], string> = {
  leading: 'Leading',
  considering: 'Considering',
  'ruled-out': 'Ruled out',
};

const DiagnosisPanel: React.FC<Props> = ({
  diagnoses,
  onAdd,
  onRemove,
  onSetConfidence,
  onDocument,
  onBackToSimRoom,
  disabled,
  variant = 'page',
}) => {
  const [draft, setDraft] = useState('');

  const submit = () => {
    const name = draft.trim();
    if (!name) return;
    onAdd(name);
    setDraft('');
  };

  const active = diagnoses.filter((d) => d.confidence !== 'ruled-out');
  const undocumented = diagnoses.some((d) => !d.submitted);

  return (
    <div
      className={cn(
        'flex-1 min-h-0 flex flex-col overflow-hidden bg-[#020617]',
        variant === 'panel' && 'bg-transparent'
      )}
    >
      {variant === 'page' && (
        <div className="px-4 md:px-8 pt-5 pb-4 border-b border-slate-900 shrink-0 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-white tracking-tight uppercase italic">
              Working <span className="text-fuchsia-500 not-italic">Differential</span>
            </h2>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">
              Add as many diagnoses as you are carrying — rank and rule out as data returns
            </p>
          </div>
          <button
            onClick={onBackToSimRoom}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-emerald-400 hover:border-emerald-500/40 transition-all shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-widest">Back to Sim Room</span>
          </button>
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4 md:p-8">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Entry */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Brain className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    submit();
                  }
                }}
                placeholder="Add a diagnosis to the differential…"
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-3.5 pl-11 pr-4 text-sm text-white focus:outline-none focus:border-fuchsia-500/50 transition-all placeholder:text-slate-700"
              />
            </div>
            <button
              onClick={submit}
              disabled={!draft.trim()}
              className="px-5 rounded-2xl bg-fuchsia-600 hover:bg-fuchsia-500 disabled:opacity-30 text-white transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Add</span>
            </button>
          </div>

          {/* Current differential */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                Differential · {active.length} active
              </span>
              {diagnoses.length > 0 && (
                <span className="text-[10px] text-slate-600">Tap a chip to change how strongly you hold it</span>
              )}
            </div>

            {diagnoses.length === 0 ? (
              <p className="text-xs text-slate-600 leading-relaxed py-4">
                Nothing on the differential yet. Add every diagnosis you are genuinely carrying — the
                debrief scores the breadth of your differential, not just the final answer.
              </p>
            ) : (
              <div className="space-y-2">
                <AnimatePresence initial={false}>
                  {diagnoses.map((d) => (
                    <motion.div
                      key={d.id}
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, height: 0 }}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-2xl border transition-colors',
                        d.confidence === 'leading' && 'bg-fuchsia-500/[0.07] border-fuchsia-500/40',
                        d.confidence === 'considering' && 'bg-slate-900/50 border-slate-800',
                        d.confidence === 'ruled-out' && 'bg-slate-900/30 border-slate-800/60'
                      )}
                    >
                      <button
                        onClick={() =>
                          onSetConfidence(d.id, d.confidence === 'leading' ? 'considering' : 'leading')
                        }
                        title="Mark as the leading diagnosis"
                        className={cn(
                          'p-2 rounded-xl border transition-all shrink-0',
                          d.confidence === 'leading'
                            ? 'bg-fuchsia-500/20 border-fuchsia-500/50 text-fuchsia-300'
                            : 'bg-slate-950 border-slate-800 text-slate-600 hover:text-fuchsia-400'
                        )}
                      >
                        <Star className={cn('w-4 h-4', d.confidence === 'leading' && 'fill-current')} />
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={cn(
                              'text-sm font-bold truncate',
                              d.confidence === 'ruled-out' ? 'text-slate-600 line-through' : 'text-slate-100'
                            )}
                          >
                            {d.name}
                          </span>
                          {d.submitted && (
                            <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-emerald-500/80">
                              <Check className="w-3 h-3" /> Charted
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-1 shrink-0">
                        {CONFIDENCE_ORDER.map((c) => (
                          <button
                            key={c}
                            onClick={() => onSetConfidence(d.id, c)}
                            className={cn(
                              'px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-colors',
                              d.confidence === c
                                ? c === 'ruled-out'
                                  ? 'bg-slate-800 border-slate-700 text-slate-400'
                                  : 'bg-fuchsia-500/15 border-fuchsia-500/40 text-fuchsia-300'
                                : 'bg-slate-950 border-slate-800 text-slate-600 hover:text-slate-300'
                            )}
                          >
                            {CONFIDENCE_LABEL[c]}
                          </button>
                        ))}
                        <button
                          onClick={() => onRemove(d.id)}
                          className="p-2 rounded-lg text-slate-700 hover:text-red-400 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Quick add */}
          <div className="space-y-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
              Common ER differentials
            </span>
            <div className="flex flex-wrap gap-2">
              {COMMON_DIAGNOSES.filter(
                (name) => !diagnoses.some((d) => d.name.toLowerCase() === name.toLowerCase())
              ).map((name) => (
                <button
                  key={name}
                  onClick={() => onAdd(name)}
                  className="px-3 py-1.5 rounded-xl bg-slate-900/50 border border-slate-800 text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-fuchsia-400 hover:border-fuchsia-500/30 transition-all"
                >
                  + {name}
                </button>
              ))}
            </div>
          </div>

          {/* Document */}
          <button
            onClick={onDocument}
            disabled={disabled || active.length === 0}
            className="w-full bg-fuchsia-600 hover:bg-fuchsia-500 disabled:opacity-30 text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2 active:scale-[0.99]"
          >
            <FileSignature className="w-4 h-4" />
            Document differential in the chart
            {undocumented && active.length > 0 && (
              <span className="text-[10px] font-black uppercase tracking-widest opacity-70">
                · {active.length} dx
              </span>
            )}
          </button>
          <p className="text-[11px] text-slate-600 text-center leading-relaxed">
            Documenting tells the team what you are thinking, drives the engine's responses, and is
            what the debrief grades your differential against. You can revise it as often as you like.
          </p>
        </div>
      </div>
    </div>
  );
};

export default DiagnosisPanel;

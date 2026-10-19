import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { PhoneCall, X, Plus, Check, FlaskConical, Brain, ListPlus } from 'lucide-react';
import { WorkingDiagnosis } from '../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Props {
  /** e.g. "Trauma Surgery". */
  service: string;
  /** Diagnoses the player's own results have established — pre-selected. */
  established: string[];
  /** The player's working differential. The leading diagnosis is pre-selected. */
  differential: WorkingDiagnosis[];
  /** Extra one-click diagnoses for this service (not pre-selected). */
  common?: string[];
  onCancel: () => void;
  onCall: (diagnoses: string[], request: string) => void;
}

const key = (s: string) => s.trim().toLowerCase();

/**
 * Calling a consultant: the player states a diagnosis rather than a free-form
 * one-liner. Anything their results have already shown is filled in for them.
 */
const ConsultDialog: React.FC<Props> = ({ service, established, differential, common = [], onCancel, onCall }) => {
  const active = differential.filter(d => d.confidence !== 'ruled-out');
  const [selected, setSelected] = useState<string[]>(() => {
    const leading = active.filter(d => d.confidence === 'leading').map(d => d.name);
    return dedupe([...established, ...leading]);
  });
  const [custom, setCustom] = useState<string[]>([]);
  const [draft, setDraft] = useState('');
  const [request, setRequest] = useState('');

  // Each diagnosis appears once, in the first group that has it.
  const shown = new Set<string>();
  const take = (list: string[]) =>
    list.filter(name => {
      const k = key(name);
      if (!k || shown.has(k)) return false;
      shown.add(k);
      return true;
    });
  const groups = [
    { title: 'From your results', icon: FlaskConical, items: take(established) },
    { title: 'Your differential', icon: Brain, items: take(active.map(d => d.name)) },
    { title: 'Added', icon: ListPlus, items: take(custom) },
    { title: 'Other diagnoses', icon: ListPlus, items: take(common) },
  ].filter(g => g.items.length);

  const isOn = (name: string) => selected.some(s => key(s) === key(name));
  const toggle = (name: string) =>
    setSelected(prev => (isOn(name) ? prev.filter(s => key(s) !== key(name)) : [...prev, name]));

  const addDraft = () => {
    const clean = draft.trim();
    if (!clean) return;
    setCustom(prev => dedupe([...prev, clean]));
    setSelected(prev => dedupe([...prev, clean]));
    setDraft('');
  };

  return (
    <div className="fixed inset-0 z-[90] bg-slate-950/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full sm:max-w-lg max-h-[90svh] flex flex-col bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl"
        role="dialog"
        aria-label={`Call ${service}`}
      >
        <div className="flex items-start justify-between gap-3 p-6 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-widest text-white">Call {service}</h3>
              <p className="text-xs text-slate-400 mt-0.5">What is your diagnosis?</p>
            </div>
          </div>
          <button onClick={onCancel} className="p-2 text-slate-500 hover:text-white transition-colors" title="Cancel">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-5">
          {groups.length === 0 && (
            <p className="text-xs text-slate-500">
              Nothing on your differential yet and no results that establish a diagnosis — type your diagnosis below.
            </p>
          )}
          {groups.map(g => (
            <div key={g.title}>
              <div className="flex items-center gap-1.5 mb-2">
                <g.icon className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{g.title}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {g.items.map(name => (
                  <button
                    key={name}
                    onClick={() => toggle(name)}
                    aria-pressed={isOn(name)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all text-left',
                      isOn(name)
                        ? 'bg-cyan-500/15 border-cyan-500/50 text-cyan-300'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-600'
                    )}
                  >
                    {isOn(name) && <Check className="w-3.5 h-3.5 shrink-0" />}
                    {name}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div className="flex gap-2">
            <input
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addDraft()}
              placeholder="Add a diagnosis…"
              className="flex-1 min-w-0 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500/50"
            />
            <button
              onClick={addDraft}
              disabled={!draft.trim()}
              className="px-3 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white disabled:opacity-40"
              title="Add"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Your ask (optional)</span>
            <input
              value={request}
              onChange={e => setRequest(e.target.value)}
              placeholder="e.g. Evaluate for the OR now"
              className="mt-2 w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500/50"
            />
          </div>
        </div>

        <div className="flex gap-3 p-6 pt-4 border-t border-slate-800">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-white text-xs font-black uppercase tracking-widest"
          >
            Cancel
          </button>
          <button
            onClick={() => onCall(selected, request.trim())}
            disabled={!selected.length}
            className="flex-[2] py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2"
          >
            <PhoneCall className="w-4 h-4" />
            Call with {selected.length || 'no'} diagnos{selected.length === 1 ? 'is' : 'es'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

function dedupe(list: string[]) {
  const seen = new Set<string>();
  return list.filter(s => {
    const k = key(s);
    if (!k || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export default ConsultDialog;

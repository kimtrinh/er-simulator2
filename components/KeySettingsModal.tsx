import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { KeyRound, X, CheckCircle2, AlertCircle, Loader2, ShieldCheck } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import {
  KeySettings,
  KeyProvider,
  loadKeySettings,
  saveKeySettings,
  testKey,
} from '../services/geminiService';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Props {
  open: boolean;
  onClose: () => void;
  /** Called after settings are saved, so the header can refresh. */
  onSaved: (settings: KeySettings) => void;
  /** Shown at the top when Settings was opened because a request needed a key. */
  reason?: string | null;
  /** Whether the site owner has configured an access code for the server's key. */
  ownerAccess: boolean;
}

const PROVIDERS: { id: KeyProvider; name: string; tag: string; url: string; placeholder: string }[] = [
  { id: 'gemini', name: 'Gemini', tag: 'free tier', url: 'https://aistudio.google.com/apikey', placeholder: 'AIza...' },
  { id: 'claude', name: 'Claude', tag: 'paid', url: 'https://console.anthropic.com/', placeholder: 'sk-ant-...' },
];

/**
 * Bring-your-own-key settings. Each player's key is stored only in their own
 * browser and sent with their requests; nobody can use anyone else's key.
 */
const KeySettingsModal: React.FC<Props> = ({ open, onClose, onSaved, reason, ownerAccess }) => {
  const [form, setForm] = useState<KeySettings>(loadKeySettings);
  const [status, setStatus] = useState<{ kind: 'idle' | 'testing' | 'ok' | 'error'; msg?: string }>({ kind: 'idle' });

  useEffect(() => {
    if (open) {
      setForm(loadKeySettings());
      setStatus({ kind: 'idle' });
    }
  }, [open]);

  const p = PROVIDERS.find((x) => x.id === form.provider)!;
  const keyField = form.provider === 'claude' ? 'claudeKey' : 'geminiKey';

  const handleTest = async () => {
    saveKeySettings(form);
    onSaved(form);
    setStatus({ kind: 'testing' });
    try {
      const r = await testKey(form);
      setStatus({
        kind: 'ok',
        msg: r.source === 'owner'
          ? `Owner access confirmed — using the site's ${r.provider === 'gemini' ? 'Gemini' : 'Claude'} key (${r.model}).`
          : `Your ${r.provider === 'gemini' ? 'Gemini' : 'Claude'} key works (${r.model}).`,
      });
    } catch (e: any) {
      setStatus({ kind: 'error', msg: e.message || 'Key check failed.' });
    }
  };

  const handleSave = () => {
    saveKeySettings(form);
    onSaved(form);
    onClose();
  };

  const handleForget = () => {
    const cleared: KeySettings = { provider: form.provider, geminiKey: '', claudeKey: '', accessCode: '' };
    setForm(cleared);
    saveKeySettings(cleared);
    onSaved(cleared);
    setStatus({ kind: 'idle' });
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.96, y: 10 }}
            animate={{ scale: 1, y: 0 }}
            className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-7 space-y-5 max-h-[92vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-black flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-amber-400" /> Your API Key
              </h2>
              <button onClick={onClose} aria-label="Close" className="text-slate-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {reason && (
              <p className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">{reason}</p>
            )}

            <p className="text-xs text-slate-400 leading-relaxed">
              MediSim runs on <b className="text-slate-200">your own</b> AI key. It's saved only in this browser and sent
              only with your own requests — the site never stores it, and no one else can use it.
            </p>

            <div className="grid grid-cols-2 gap-2">
              {PROVIDERS.map((x) => (
                <button
                  key={x.id}
                  onClick={() => { setForm({ ...form, provider: x.id }); setStatus({ kind: 'idle' }); }}
                  className={cn(
                    'py-3 rounded-xl border text-xs font-black uppercase tracking-widest transition',
                    form.provider === x.id
                      ? 'bg-amber-500/10 border-amber-500/50 text-amber-400'
                      : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'
                  )}
                >
                  {x.name} key
                  <span className="block text-[8px] opacity-70 mt-0.5">{x.tag}</span>
                </button>
              ))}
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                {p.name} API key
              </label>
              <input
                type="password"
                autoComplete="off"
                spellCheck={false}
                value={form[keyField]}
                onChange={(e) => setForm({ ...form, [keyField]: e.target.value })}
                placeholder={p.placeholder}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:border-amber-500/50"
              />
              <p className="text-[11px] text-slate-500 leading-relaxed">
                {form.provider === 'gemini' ? (
                  <>Free: create one at <a className="text-amber-400 underline" href={p.url} target="_blank" rel="noreferrer">aistudio.google.com/apikey</a> — don't add billing and it can never charge you. The free tier has per-minute and daily limits, and Google may use free-tier prompts to improve its products, so never enter real patient details.</>
                ) : (
                  <>Create one at <a className="text-amber-400 underline" href={p.url} target="_blank" rel="noreferrer">console.anthropic.com</a>. Usage is billed to your Anthropic account (separate from a Claude subscription).</>
                )}
              </p>
            </div>

            {ownerAccess && (
              <div className="space-y-1 pt-2 border-t border-slate-800">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" /> Site owner access code
                </label>
                <input
                  type="password"
                  autoComplete="off"
                  value={form.accessCode}
                  onChange={(e) => setForm({ ...form, accessCode: e.target.value })}
                  placeholder="Only for the site owner"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500/50"
                />
                <p className="text-[11px] text-slate-500">
                  Leave the key box empty and enter the owner code to use the site's own key. A key above always takes priority.
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleTest}
                disabled={status.kind === 'testing'}
                className="flex-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2"
              >
                {status.kind === 'testing' && <Loader2 className="w-4 h-4 animate-spin" />}
                {status.kind === 'testing' ? 'Testing…' : 'Test'}
              </button>
              <button
                onClick={handleSave}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition"
              >
                Save
              </button>
            </div>

            {(status.kind === 'ok' || status.kind === 'error') && (
              <p className={cn('text-sm flex items-start gap-2', status.kind === 'ok' ? 'text-emerald-400' : 'text-red-400')}>
                {status.kind === 'ok' ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> : <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />}
                {status.msg}
              </p>
            )}

            <button onClick={handleForget} className="text-[11px] text-slate-500 hover:text-red-400 underline">
              Forget my keys on this browser
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default KeySettingsModal;

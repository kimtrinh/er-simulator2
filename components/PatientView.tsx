import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Maximize2, X, RefreshCcw, Loader2, EyeOff } from 'lucide-react';
import { PatientImage, PatientVisualBrief } from '../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Props {
  image?: PatientImage;
  brief?: PatientVisualBrief;
  onRegenerate: () => void;
}

/**
 * The bedside view: what the patient in front of you actually looks like.
 * Rendered from the case's own visual brief, so the findings listed under the
 * photo are the findings the image is supposed to show.
 */
const PatientView: React.FC<Props> = ({ image, brief, onRegenerate }) => {
  const [zoomed, setZoomed] = useState(false);
  if (!image && !brief) return null;

  const status = image?.status || 'idle';
  const demographics = brief
    ? `${Math.round(brief.ageYears)}-year-old ${brief.sex}`
    : 'Patient';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-fuchsia-400">
          <Camera className="w-4 h-4" />
          <span className="text-[10px] font-black uppercase tracking-widest">Bedside View</span>
        </div>
        {status !== 'generating' && (
          <button
            onClick={onRegenerate}
            className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-fuchsia-400 transition-colors"
            title="Render the patient again"
          >
            <RefreshCcw className="w-3 h-3" />
            Re-render
          </button>
        )}
      </div>

      <div className="rounded-2xl border border-slate-800/50 bg-slate-900/40 overflow-hidden">
        {status === 'generating' && (
          <div className="aspect-[4/3] flex flex-col items-center justify-center gap-3 text-slate-600">
            <Loader2 className="w-6 h-6 animate-spin text-fuchsia-500/60" />
            <span className="text-[9px] font-black uppercase tracking-[0.2em]">
              Rendering patient
            </span>
          </div>
        )}

        {status === 'ready' && image?.dataUrl && (
          <div
            className="relative group/pt cursor-zoom-in"
            onClick={() => setZoomed(true)}
          >
            <div className="absolute inset-0 bg-fuchsia-500/10 opacity-0 group-hover/pt:opacity-100 transition-opacity flex items-center justify-center z-10">
              <Maximize2 className="w-7 h-7 text-white" />
            </div>
            <img
              src={image.dataUrl}
              alt={image.label || 'Patient at the bedside'}
              className="w-full object-cover aspect-[4/3]"
            />
          </div>
        )}

        {status === 'unavailable' && (
          <div className="aspect-[4/3] flex flex-col items-center justify-center gap-3 text-slate-600 px-6 text-center">
            <EyeOff className="w-6 h-6" />
            <span className="text-[10px] leading-relaxed text-slate-500">
              {image?.message || 'No bedside image available for this case.'}
            </span>
          </div>
        )}

        {status === 'ready' && image?.message && (
          <div className="px-4 py-2 bg-amber-500/5 border-t border-amber-500/20 text-[9px] leading-relaxed text-amber-400/80">
            Showing the last good render — the update failed: {image.message}
          </div>
        )}

        {(status === 'ready' || status === 'unavailable') && (
          <div className="px-4 py-3 border-t border-slate-800/50 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                {image?.label || demographics}
              </span>
              {image?.illustrated && (
                <span className="text-[8px] font-black uppercase tracking-widest text-slate-600 shrink-0">
                  Illustrated
                </span>
              )}
            </div>
            {!!brief?.visibleFindings?.length && (
              <div className="flex flex-wrap gap-1.5">
                {brief.visibleFindings.map((f, i) => (
                  <span
                    key={i}
                    className="text-[9px] px-2 py-1 rounded-lg bg-fuchsia-500/5 border border-fuchsia-500/20 text-fuchsia-300/70"
                  >
                    {f}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {zoomed && image?.dataUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl flex items-center justify-center p-8 cursor-zoom-out"
            onClick={() => setZoomed(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-5xl w-full max-h-full flex flex-col items-center"
            >
              <img
                src={image.dataUrl}
                alt={image.label || 'Patient at the bedside'}
                className="max-w-full max-h-[80vh] object-contain shadow-[0_0_100px_rgba(217,70,239,0.15)] border border-white/10 rounded-3xl"
              />
              <button className="mt-8 px-8 py-3 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-slate-800 transition-all border border-slate-800 flex items-center gap-3 group">
                <X className="w-5 h-5 group-hover:rotate-90 transition-transform" />
                Close Viewer
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PatientView;

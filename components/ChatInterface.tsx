
import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Bot, AlertCircle, Clock, Maximize2, X, Volume2, Loader2, BrainCircuit, ChevronDown, ChevronUp } from 'lucide-react';
import { Message } from '../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Props {
  messages: Message[];
  isLoading: boolean;
}

const ChatInterface: React.FC<Props> = ({ messages = [], isLoading }) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [playingIdx, setPlayingIdx] = useState<number | null>(null);
  const [openRationales, setOpenRationales] = useState<Record<number, boolean>>({});

  const toggleRationale = (idx: number) => {
    setOpenRationales(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const sanitizeTextForTTS = (rawText: string): string => {
    if (!rawText) return "";
    
    // Remove markdown URLs
    let clean = rawText.replace(/https?:\/\/[^\s]+/g, "");
    // Remove brackets/links markdown
    clean = clean.replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1");
    // Remove markdown bold, italic, headers, list tokens, blocks
    clean = clean.replace(/[\*\_`#\-\+\=~]+/g, " ");
    // Remove clinical and UI symbols/emojis
    clean = clean.replace(/[\uD800-\uDFFF].|[\u2600-\u27BF]|[\u3000-\u303F]|[\uE000-\uF8FF]|■|●|🩺|▲|▼|➔|→|←|✅|❌|⚠️/g, "");
    // Normalize spaces
    clean = clean.replace(/\s+/g, " ").trim();
    
    // Cap length so narration stays focused on the key clinical update.
    if (clean.length > 600) {
      clean = clean.substring(0, 600) + "...";
    }
    return clean;
  };

  const handlePlayVoice = (text: string, idx: number) => {
    const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined;
    if (!synth) {
      console.warn('Speech synthesis is not supported in this browser.');
      return;
    }

    // Toggle off if this message is already speaking.
    if (playingIdx === idx) {
      synth.cancel();
      setPlayingIdx(null);
      return;
    }

    synth.cancel(); // stop any other in-flight narration
    const utterance = new SpeechSynthesisUtterance(sanitizeTextForTTS(text));
    utterance.rate = 1.02;
    utterance.pitch = 1.0;
    utterance.onend = () => setPlayingIdx(null);
    utterance.onerror = () => setPlayingIdx(null);

    setPlayingIdx(idx);
    synth.speak(utterance);
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  return (
    <div className="flex-1 overflow-y-auto p-3 md:p-6 space-y-4 md:space-y-8 bg-[#020617]/50 scroll-smooth custom-scrollbar">
      <AnimatePresence initial={false}>
        {(messages || []).map((msg, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className={cn(
              "flex gap-4",
              msg.role === 'user' ? "flex-row-reverse" : "flex-row"
            )}
          >
            {/* Avatar */}
            <div className={cn(
              "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border shadow-lg",
              msg.role === 'user' 
                ? "bg-blue-600/10 border-blue-500/20 text-blue-500" 
                : "bg-emerald-600/10 border-emerald-500/20 text-emerald-500"
            )}>
              {msg.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
            </div>

            {/* Message Bubble */}
            <div className={cn(
              "max-w-[80%] space-y-2",
              msg.role === 'user' ? "items-end" : "items-start"
            )}>
              <div className={cn(
                "rounded-3xl p-5 shadow-2xl relative overflow-hidden group transition-all",
                msg.role === 'user'
                  ? "bg-blue-600/10 text-blue-100 border border-blue-500/20 rounded-tr-none"
                  : msg.type === 'alert'
                  ? "bg-red-600/10 text-red-200 border border-red-500/20 rounded-tl-none"
                  : "bg-slate-900/80 text-slate-200 border border-slate-800 rounded-tl-none"
              )}>
                {msg.type === 'alert' && (
                  <div className="flex items-center gap-2 mb-3 text-red-500">
                    <AlertCircle className="w-4 h-4 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Critical Update</span>
                  </div>
                )}
                
                <p className="whitespace-pre-wrap leading-relaxed text-sm md:text-base selection:bg-emerald-500/30">
                  {msg.content}
                </p>

                {msg.clinicalRationale && (
                  <div className="mt-4 pt-4 border-t border-slate-800/50">
                    <button 
                      onClick={() => toggleRationale(idx)}
                      className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-500/60 hover:text-emerald-400 transition-colors"
                    >
                      <BrainCircuit className="w-3 h-3" />
                      Clinical Rationale
                      {openRationales[idx] ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                    <AnimatePresence>
                      {openRationales[idx] && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-2 p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl text-xs text-slate-400 font-mono leading-relaxed italic">
                            {msg.clinicalRationale}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {msg.role === 'assistant' && (
                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={() => handlePlayVoice(msg.content, idx)}
                      disabled={playingIdx !== null}
                      className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border",
                        playingIdx === idx
                          ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400"
                          : "bg-slate-800/50 border-slate-700 text-slate-400 hover:text-white hover:border-slate-600 disabled:opacity-50"
                      )}
                    >
                      {playingIdx === idx ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Speaking...
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-3 h-3" />
                          Play Voice
                        </>
                      )}
                    </button>
                  </div>
                )}

                {msg.imageUrl && (
                  <div className="mt-4 relative group/img cursor-zoom-in overflow-hidden rounded-2xl border border-slate-800">
                     <div className="absolute top-3 left-3 z-10">
                        <span className="bg-black/60 backdrop-blur text-[9px] font-black text-emerald-400 border border-emerald-500/30 px-2 py-1 rounded-lg uppercase tracking-widest">Clinical Finding</span>
                     </div>
                     <div className="absolute inset-0 bg-emerald-500/10 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center z-10">
                        <Maximize2 className="w-8 h-8 text-white" />
                     </div>
                     <img 
                       src={msg.imageUrl} 
                       alt="Clinical Finding" 
                       className="w-full object-cover max-h-[400px] transition-transform duration-500 group-hover/img:scale-105"
                       onClick={() => setLightboxImage(msg.imageUrl || null)}
                     />
                  </div>
                )}
              </div>

              {/* Metadata */}
              <div className={cn(
                "flex items-center gap-2 px-2 opacity-40",
                msg.role === 'user' ? "flex-row-reverse" : "flex-row"
              )}>
                <Clock className="w-3 h-3" />
                <span className="text-[9px] font-black uppercase tracking-widest font-mono">
                  {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
      
      {isLoading && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex justify-start gap-4"
        >
          <div className="w-10 h-10 rounded-2xl bg-emerald-600/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
            <Bot className="w-5 h-5 animate-pulse" />
          </div>
          <div className="bg-slate-900/50 rounded-2xl p-4 flex items-center gap-3 border border-slate-800">
            <div className="flex gap-1">
              <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0 }} className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
              <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
              <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
            </div>
            <span className="text-[10px] text-emerald-500 font-black uppercase tracking-widest">Processing Clinical Logic</span>
          </div>
        </motion.div>
      )}
      <div ref={bottomRef} />

      {/* Lightbox Overlay */}
      <AnimatePresence>
        {lightboxImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl flex items-center justify-center p-8 cursor-zoom-out"
            onClick={() => setLightboxImage(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-5xl w-full max-h-full flex flex-col items-center"
            >
              <img 
                src={lightboxImage} 
                className="max-w-full max-h-[80vh] object-contain shadow-[0_0_100px_rgba(16,185,129,0.2)] border border-white/10 rounded-3xl"
                alt="Clinical Large View"
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

export default ChatInterface;


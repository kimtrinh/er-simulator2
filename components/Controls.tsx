
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Send, Command, CornerDownLeft, Plus } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Props {
  onAction: (action: string) => void;
  disabled: boolean;
}

const QUICK_ACTIONS = [
    { label: "Check Vitals", cmd: "Cycle blood pressure and check full vitals." },
    { label: "Physical Exam", cmd: "Perform a head-to-toe physical examination." },
    { label: "Order EKG", cmd: "Obtain a 12-lead EKG immediately." },
    { label: "Defibrillate", cmd: "Defibrillate patient at 200 Joules. CLEAR!" },
    { label: "Lab Panel", cmd: "Order CBC, Chem-7, Trop-I, and VBG." },
    { label: "Chest X-Ray", cmd: "Order a portable bedside Chest X-Ray." },
    { label: "Start IV", cmd: "Establish 2x large bore IV access and start NS at TKO." },
    { label: "3% Saline", cmd: "Administer 3% hypertonic saline 100ml bolus over 15 minutes." },
];

const MEDICAL_VOCABULARY = [
  "tachycardia", "bradycardia", "hypotension", "hypertension", "hypoxia", 
  "epinephrine", "amiodarone", "atropine", "adenosine", "norepinephrine",
  "intubation", "defibrillation", "cardioversion", "thoracostomy", 
  "systolic", "diastolic", "creatinine", "troponin", "lactate", "hemoglobin",
  "pneumothorax", "appendicitis", "cholecystitis", "diverticulitis",
  "hypertonic", "hypotonic", "isotonic", "crystalloid", "colloid",
  "myocardial infarction", "atrial fibrillation", "ventricular tachycardia", 
  "fibrillation", "bolus", "saline", "ringers", "sepsis", "antibiotics", 
  "vancomycin", "piperacillin", "tazobactam", "rocuronium", "succinylcholine", 
  "etomidate", "ketamine", "fentanyl", "morphine", "zofran", "ondansetron", 
  "electrocardiogram", "ultrasound", "computed tomography", "resuscitation", 
  "hemorrhage", "embolism", "thrombosis", "ischemia", "infarction"
];

const Controls: React.FC<Props> = ({ onAction, disabled }) => {
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  // Auto-resize logic
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [inputText]);

  // Initialize Speech Recognition with Medical Grammar
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const SpeechGrammarList = (window as any).SpeechGrammarList || (window as any).webkitSpeechGrammarList;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      if (SpeechGrammarList) {
        const speechRecognitionList = new SpeechGrammarList();
        const grammar = '#JSGF V1.0; grammar medical; public <term> = ' + MEDICAL_VOCABULARY.join(' | ') + ' ;';
        speechRecognitionList.addFromString(grammar, 1);
        recognition.grammars = speechRecognitionList;
      }

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        const cleanTranscript = transcript.replace(/\.$/, '');
        setInputText(prev => {
            const needsSpace = prev.length > 0 && !prev.endsWith(' ');
            return prev + (needsSpace ? ' ' : '') + cleanTranscript;
        });
      };
      recognition.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
      };
      recognitionRef.current = recognition;
    }
  }, []);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || disabled) return;
    onAction(inputText.trim());
    setInputText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const toggleDictation = () => {
    if (!recognitionRef.current) {
      console.warn("Speech recognition is not supported in this browser.");
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.warn("Recognition failed to start", e);
      }
    }
  };

  return (
    <div className="bg-slate-950/80 backdrop-blur-xl border-t border-slate-900 p-3 md:p-6 shadow-[0_-20px_50px_rgba(0,0,0,0.5)] shrink-0">
      <div className="max-w-6xl mx-auto space-y-3 md:space-y-6">
        
        {/* Quick Order Bar */}
        <div className="flex flex-wrap gap-2 overflow-x-auto pb-2 no-scrollbar">
            {QUICK_ACTIONS.map((act, i) => (
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    key={i}
                    disabled={disabled}
                    onClick={() => onAction(act.cmd)}
                    className="whitespace-nowrap px-3 py-1.5 md:px-4 md:py-2 bg-slate-900/50 hover:bg-emerald-500/10 border border-slate-800 hover:border-emerald-500/30 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-emerald-400 transition-all disabled:opacity-30"
                >
                    {act.label}
                </motion.button>
            ))}
            <button className="px-3 py-1.5 md:px-4 md:py-2 bg-slate-900/50 border border-slate-800 rounded-xl text-slate-600 hover:text-slate-400 transition-colors">
              <Plus className="w-3 h-3 md:w-3.5 md:h-3.5" />
            </button>
        </div>

        {/* Multi-line Input Form */}
        <div className="flex items-end gap-4">
          <div className={cn(
            "flex-1 relative group bg-slate-950 rounded-2xl border transition-all shadow-2xl overflow-hidden",
            isListening ? "border-red-500/50 ring-2 ring-red-500/10" : "border-slate-800 focus-within:border-emerald-500/50 focus-within:ring-2 focus-within:ring-emerald-500/10"
          )}>
            <div className={cn(
              "absolute left-5 top-5 transition-colors",
              isListening ? "text-red-500 animate-pulse" : "text-slate-700 group-focus-within:text-emerald-500"
            )}>
              <Command className="w-5 h-5" />
            </div>
            
            <textarea
              ref={textareaRef}
              rows={1}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={disabled}
              placeholder={disabled ? 'Processing...' : isListening ? "Listening..." : "Enter command..."}
              className="w-full bg-transparent text-slate-100 pl-10 md:pl-14 pr-24 md:pr-32 py-3 md:py-5 focus:outline-none font-sans text-sm md:text-base placeholder:text-slate-700 input-scrollbar overflow-y-auto min-h-[48px] md:min-h-[64px]"
            />

            <div className="absolute right-2 md:right-4 bottom-2 md:bottom-4 flex items-center gap-2 md:gap-3">
                {/* Dictation Button */}
                <button
                    type="button"
                    onClick={toggleDictation}
                    disabled={disabled}
                    className={cn(
                      "p-2 md:p-2.5 rounded-xl transition-all",
                      isListening ? "bg-red-500 text-white shadow-lg shadow-red-500/40" : "bg-slate-900 text-slate-500 hover:text-emerald-400 border border-slate-800"
                    )}
                >
                    {isListening ? <Mic className="w-4 h-4 md:w-5 md:h-5 animate-pulse" /> : <MicOff className="w-4 h-4 md:w-5 md:h-5" />}
                </button>

                <button 
                  onClick={() => handleSubmit()} 
                  disabled={disabled || !inputText.trim()} 
                  className="p-2 md:p-2.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-0 transition-all shadow-lg active:scale-95"
                >
                  <Send className="w-4 h-4 md:w-5 md:h-5" />
                </button>
            </div>
          </div>
        </div>
        
        <div className="flex justify-between items-center px-2">
          <div className="flex items-center gap-2">
            <span className={cn(
              "text-[9px] font-black uppercase tracking-[0.2em] transition-colors",
              isListening ? "text-red-400 animate-pulse" : "text-slate-700"
            )}>
               {isListening ? 'Microphone Active' : 'Terminal Ready'}
            </span>
          </div>
          <div className="flex gap-6">
             <div className="flex items-center gap-2 text-slate-700">
               <CornerDownLeft className="w-3 h-3" />
               <span className="text-[9px] font-black uppercase tracking-widest">Execute</span>
             </div>
             <div className="flex items-center gap-2 text-slate-700">
               <span className="text-[9px] font-black uppercase tracking-widest">Shift+Enter: New Line</span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Controls;


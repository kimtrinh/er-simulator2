import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, 
  FileText, 
  Stethoscope, 
  Upload, 
  Play, 
  ChevronRight, 
  AlertCircle, 
  Brain, 
  Search,
  Volume2,
  VolumeX,
  Layout,
  RefreshCcw,
  Zap,
  ScrollText,
  X
} from 'lucide-react';
import { GameState, Message, SimulationResponse, CaseHistoryEntry } from './types';
import { 
  auth, 
  db, 
  signInWithGoogle, 
  logout, 
  collection, 
  addDoc, 
  query, 
  where, 
  onSnapshot, 
  orderBy,
  getDocFromServer,
  doc
} from './src/firebase';
import { 
  analyzePDFAndStartCase, 
  startCaseFromTopic,
  progressSimulation, 
  GeminiFileInput 
} from './services/geminiService';
import { extractImagesFromPDF } from './services/pdfService';
import VitalsMonitor from './components/VitalsMonitor';
import ChatInterface from './components/ChatInterface';
import Controls from './components/Controls';
import DebriefScreen from './components/DebriefScreen';
import ErrorModal from './components/ErrorModal';
import LearningLog from './components/LearningLog';
import { startAmbientNoise, stopAmbientNoise } from './services/audioEffectsService';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const SAVE_KEY = 'medisim_er_v6_state';
const HISTORY_KEY = 'medisim_er_v6_history';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

const fileToBase64 = (file: File | Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = (error) => reject(error);
  });
};

const DEFAULT_STATE: GameState = {
  stage: 'upload',
  vitals: { hr: 0, bpSystolic: 0, bpDiastolic: 0, rr: 0, o2: 0, temp: 0, rhythm: '--' },
  messages: [],
  learningPoints: [],
  hiddenDiagnosis: '',
  caseContext: '',
  visuals: [],
  labResults: [],
  diagnosticReports: [],
  physicalExam: [],
  vitalTrend: 'stable'
};

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(() => {
    try {
      const saved = localStorage.getItem(SAVE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && (parsed.stage === 'analyzing' || parsed.stage === 'upload')) {
          parsed.stage = 'upload';
        }
        return { ...DEFAULT_STATE, ...parsed };
      }
    } catch (e) {
      console.error('LocalStorage error:', e);
    }
    return DEFAULT_STATE;
  });
  
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [topicInput, setTopicInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadingMessages = [
    "Consulting National Specialty Guidelines...",
    "Modeling Pathophysiological Trends...",
    "Synthesizing Differential Diagnosis List...",
    "Initializing High-Fidelity Vitals Engine...",
    "Reconstructing Bedside Environment...",
    "Generating Clinical Rationale Pathways..."
  ];

  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    if (isLoading) {
      const interval = setInterval(() => {
        setMessageIndex(prev => (prev + 1) % loadingMessages.length);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [isLoading]);
  const [audioMonitor, setAudioMonitor] = useState(false);
  const [chartOpen, setChartOpen] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [history, setHistory] = useState<CaseHistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user: any) => {
      setUser(user);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      // Safe, single-point migration of local history to Firestore
      const localHistory = localStorage.getItem('medisim_er_v6_history');
      if (localHistory) {
        try {
          const entries = JSON.parse(localHistory) as CaseHistoryEntry[];
          if (entries && entries.length > 0) {
            console.log("Migrating local history to Firestore...");
            // Remove item atomic-style immediately to prevent multiple parallel trigger runs
            localStorage.removeItem('medisim_er_v6_history');
            
            entries.forEach(entry => {
              const { id, ...rest } = entry;
              addDoc(collection(db, 'history'), { ...rest, userId: user.uid })
                .catch(err => console.error("Migration failed for entry:", err));
            });
            console.log("Migration triggered successfully.");
          }
        } catch (e) {
          console.error("Failed to parse local history for migration:", e);
        }
      }

      const q = query(
        collection(db, 'history'),
        where('userId', '==', user.uid)
      );
      const unsubscribe = onSnapshot(q, (snapshot: any) => {
        const entries = snapshot.docs.map((doc: any) => ({
          ...doc.data(),
          id: doc.id
        })) as CaseHistoryEntry[];
        
        // Sort client-side to avoid composite index requirement
        entries.sort((a, b) => b.timestamp - a.timestamp);
        
        setHistory(entries);
      }, (err: any) => {
        console.error("Firestore error:", err);
        setError("Failed to sync clinical history. Please check your connection.");
      });
      return () => unsubscribe();
    } else {
      // Load from local storage if not logged in
      const localHistory = localStorage.getItem('medisim_er_v6_history');
      if (localHistory) {
        try {
          const entries = JSON.parse(localHistory) as CaseHistoryEntry[];
          entries.sort((a, b) => b.timestamp - a.timestamp);
          setHistory(entries);
        } catch (e) {
          setHistory([]);
        }
      } else {
        setHistory([]);
      }
    }
  }, [user]);

  useEffect(() => {
    if (gameState.stage === 'playing' && audioMonitor) {
       const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
       startAmbientNoise(ctx);
       return () => stopAmbientNoise();
    }
  }, [gameState.stage, audioMonitor]);

  useEffect(() => {
    if (gameState.stage !== 'upload' && gameState.stage !== 'analyzing') {
      localStorage.setItem(SAVE_KEY, JSON.stringify(gameState));
    }
  }, [gameState]);

  const handleStartFromTopic = async () => {
    if (!topicInput.trim()) return;
    setIsLoading(true);
    setGameState(prev => ({ ...prev, stage: 'analyzing' }));

    try {
      const initData = await startCaseFromTopic(topicInput);
      setGameState({
        ...DEFAULT_STATE,
        stage: 'playing',
        vitals: initData.vitals,
        messages: [{ role: 'assistant', content: initData.intro, timestamp: Date.now() }],
        learningPoints: initData.learningPoints,
        hiddenDiagnosis: initData.diagnosis,
        caseContext: initData.context,
        visuals: initData.visualCatalog
      });
    } catch (err: any) {
      setError(err.message || "Failed to generate simulation from topic.");
      setGameState(prev => ({ ...prev, stage: 'upload' }));
    } finally {
      setIsLoading(false);
    }
  };

  const processFiles = async (files: File[]) => {
    if (files.length === 0) return;
    setIsLoading(true);
    setGameState(prev => ({ ...prev, stage: 'analyzing' }));

    try {
      const geminiInputs: GeminiFileInput[] = [];
      const allVisualAssets: string[] = [];

      for (const file of files) {
        const base64Data = await fileToBase64(file);
        geminiInputs.push({ mimeType: file.type, data: base64Data });
        if (file.type === 'application/pdf') {
          const extracted = await extractImagesFromPDF(await file.arrayBuffer());
          allVisualAssets.push(...extracted);
        } else {
          allVisualAssets.push(`data:${file.type};base64,${base64Data}`);
        }
      }

      const initData = await analyzePDFAndStartCase(geminiInputs, allVisualAssets);
      setGameState({
        ...DEFAULT_STATE,
        stage: 'playing',
        vitals: initData.vitals,
        messages: [{ role: 'assistant', content: initData.intro, timestamp: Date.now() }],
        learningPoints: initData.learningPoints,
        hiddenDiagnosis: initData.diagnosis,
        caseContext: initData.context,
        visuals: initData.visualCatalog
      });
    } catch (err: any) {
      setError(err.message || "An error occurred during case initialization.");
      setGameState(prev => ({ ...prev, stage: 'upload' }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleUserAction = async (actionText: string) => {
    if (isLoading) return;
    setGameState(prev => ({ ...prev, messages: [...prev.messages, { role: 'user', content: actionText, timestamp: Date.now() }] }));
    
    setIsLoading(true);
    try {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Clinical engine timed out. Please try again.")), 90000)
      );

      const response = await Promise.race([
        progressSimulation(
          gameState.caseContext, 
          gameState.messages.map(m => m.content), 
          actionText, 
          gameState.visuals,
          gameState.learningPoints
        ),
        timeoutPromise
      ]) as SimulationResponse;
      
      const sysMsg: Message = {
        role: 'assistant',
        content: response.narrative,
        timestamp: Date.now(),
        clinicalRationale: response.clinicalRationale,
        imageUrl: response.imageIdToDisplay ? gameState.visuals.find(v => v.id === response.imageIdToDisplay)?.data : undefined
      };

      setGameState(prev => {
        const incomingLabs = Array.isArray(response.labResults) ? response.labResults : [];
        const incomingReports = Array.isArray(response.diagnosticReports) ? response.diagnosticReports : [];
        const incomingExam = Array.isArray(response.physicalExam) ? response.physicalExam : [];

        return {
          ...prev,
          vitals: response.updatedVitals,
          vitalTrend: response.vitalTrend,
          messages: [...prev.messages, sysMsg],
          labResults: [...(prev.labResults || []), ...incomingLabs],
          diagnosticReports: [
            ...incomingReports.map((r: any) => ({ ...r, timestamp: Date.now() })),
            ...(prev.diagnosticReports || [])
          ],
          physicalExam: [
            ...incomingExam.map((e: any) => ({ ...e, timestamp: Date.now() })),
            ...(prev.physicalExam || [])
          ],
          stage: response.isCaseOver ? 'debrief' : 'playing' as any,
          debriefData: response.isCaseOver ? {
             ...response.debriefData!,
             cmeLearningPoints: prev.learningPoints
          } : prev.debriefData
        };
      });

      if (response.isCaseOver) {
        const debrief = response.debriefData || {
          outcome: "Case Completed",
          score: 0,
          summary: "No summary provided by clinical engine.",
          criticalEvents: [],
          missedOpportunities: []
        };

        const newEntry: any = {
          timestamp: Date.now(),
          diagnosis: gameState.hiddenDiagnosis || "Unknown Diagnosis",
          outcome: debrief.outcome,
          score: debrief.score,
          summary: debrief.summary,
          criticalEvents: debrief.criticalEvents,
          missedOpportunities: debrief.missedOpportunities,
          learningPoints: gameState.learningPoints,
          userId: user?.uid || 'local'
        };

        // Update local state immediately for better UX
        setHistory(prev => [{ ...newEntry, id: `temp-${Date.now()}` }, ...prev]);

        if (user) {
          addDoc(collection(db, 'history'), newEntry).catch((err: any) => {
            handleFirestoreError(err, OperationType.WRITE, 'history');
          });
        } else {
          // Save to local storage if not logged in
          const localHistory = localStorage.getItem('medisim_er_v6_history');
          let entries: any[] = [];
          if (localHistory) {
            try { entries = JSON.parse(localHistory); } catch (e) {}
          }
          entries.push({ ...newEntry, id: `local-${Date.now()}` });
          localStorage.setItem('medisim_er_v6_history', JSON.stringify(entries));
        }
      }
    } catch (err: any) {
      setError(err.message || "Connection to clinical engine failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const renderContent = () => {
    if (gameState.stage === 'upload' || gameState.stage === 'analyzing') {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[#020617] relative overflow-hidden">
          {/* Background Elements */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.05),transparent_70%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px]" />
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl w-full z-10"
          >
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-black uppercase tracking-[0.3em] mb-8 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
                <Zap className="w-3.5 h-3.5" />
                Next-Gen Clinical Simulation
              </div>
              <h1 className="text-8xl md:text-9xl font-black text-white tracking-tighter mb-4 leading-[0.8] uppercase italic">
                MediSim <span className="text-emerald-500 not-italic">ER</span>
              </h1>
              <p className="text-slate-500 text-lg md:text-xl font-medium max-w-2xl mx-auto tracking-tight">
                High-fidelity bedside simulation powered by <span className="text-white">Gemini 3.1 Pro</span>. Master clinical reasoning through evidence-based scenarios.
              </p>
            </div>

            {gameState.stage === 'analyzing' ? (
              <div className="flex flex-col items-center gap-8 py-12">
                <div className="relative w-24 h-24">
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 border-4 border-emerald-500/10 rounded-full"
                  />
                  <motion.div 
                    animate={{ rotate: -360 }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 border-t-4 border-emerald-500 rounded-full"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Activity className="w-8 h-8 text-emerald-500 animate-pulse" />
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-emerald-400 font-mono text-sm tracking-widest uppercase mb-2">{loadingMessages[messageIndex]}</p>
                  <p className="text-slate-500 text-xs uppercase tracking-[0.4em] font-black">Initializing Neural Clinical Logic</p>
                </div>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                {/* Topic Input Card */}
                <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-[2.5rem] p-8 hover:border-emerald-500/30 transition-all group">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 mb-6 group-hover:scale-110 transition-transform">
                    <Brain className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Topic-Based Case</h3>
                  <p className="text-slate-400 text-sm mb-6">Enter any medical condition or scenario to generate a custom simulation.</p>
                  
                  <div className="relative mb-6">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input 
                      type="text"
                      value={topicInput}
                      onChange={(e) => setTopicInput(e.target.value)}
                      placeholder="e.g. Diabetic Ketoacidosis..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-all"
                    />
                  </div>
                  
                  <button 
                    onClick={handleStartFromTopic}
                    disabled={!topicInput.trim()}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2 group/btn"
                  >
                    Generate Case
                    <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                  </button>
                </div>

                {/* File Upload Card */}
                <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-[2.5rem] p-8 hover:border-blue-500/30 transition-all group relative">
                  <input 
                    type="file" 
                    multiple 
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      setSelectedFiles(files);
                      processFiles(files);
                    }} 
                    className="absolute inset-0 opacity-0 cursor-pointer z-10" 
                  />
                  <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500 mb-6 group-hover:scale-110 transition-transform">
                    <Upload className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Record-Based Case</h3>
                  <p className="text-slate-400 text-sm mb-6">Upload clinical records (PDF/Images) to build a case from real documentation.</p>
                  
                  <div className="border-2 border-dashed border-slate-800 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 group-hover:border-blue-500/20 transition-all">
                    <FileText className="w-8 h-8 text-slate-600 group-hover:text-blue-500 transition-colors" />
                    <span className="text-xs text-slate-500 font-bold uppercase tracking-widest">Drop Records Here</span>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      );
    }

    if (gameState.stage === 'debrief') return <DebriefScreen data={gameState.debriefData!} onRestart={() => setGameState(DEFAULT_STATE)} />;

    return (
      <div className="flex-1 flex flex-col overflow-hidden bg-[#020617] relative">
        <VitalsMonitor vitals={gameState.vitals} trend={gameState.vitalTrend} audioEnabled={audioMonitor} />
        
        <div className="flex-1 flex overflow-hidden relative">
          <div className="flex-1 flex flex-col relative border-r border-slate-900">
            <ChatInterface messages={gameState.messages} isLoading={isLoading} />
            <Controls onAction={handleUserAction} disabled={isLoading} />
          </div>

          <AnimatePresence>
            {chartOpen && (
              <motion.div 
                initial={{ x: isMobile ? '100%' : 300, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: isMobile ? '100%' : 300, opacity: 0 }}
                className={cn(
                  "bg-slate-950/95 backdrop-blur-2xl border-l border-slate-900 overflow-y-auto p-6 space-y-8 z-[60]",
                  isMobile ? "fixed inset-0" : "w-[400px] relative"
                )}
              >
                <div className="flex items-center justify-between border-b border-slate-900 pb-4">
                  <div className="flex items-center gap-2">
                    <Layout className="w-4 h-4 text-slate-500" />
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Clinical Workspace</h3>
                  </div>
                  <button onClick={() => setChartOpen(false)} className="text-slate-600 hover:text-white transition-colors p-2">
                    {isMobile ? <X className="w-6 h-6" /> : <ChevronRight className="w-5 h-5" />}
                  </button>
                </div>
                
                {/* Physical Exam */}
                {gameState.physicalExam.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-blue-500">
                      <Stethoscope className="w-4 h-4" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Physical Exam</span>
                    </div>
                    <div className="grid gap-3">
                      {gameState.physicalExam.map((e, i) => (
                        <motion.div 
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          key={i} 
                          className="p-4 bg-slate-900/40 rounded-2xl border border-slate-800/50 border-l-4 border-l-blue-600"
                        >
                          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{e.system}</span>
                          <p className="text-sm text-slate-200 mt-1">{e.finding}</p>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Imaging */}
                {gameState.diagnosticReports.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-emerald-500">
                      <FileText className="w-4 h-4" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Imaging Reports</span>
                    </div>
                    <div className="grid gap-3">
                      {gameState.diagnosticReports.map((r, i) => (
                        <motion.div 
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          key={i} 
                          className="p-4 bg-slate-900/40 rounded-2xl border border-slate-800/50 border-l-4 border-l-emerald-600"
                        >
                          <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">{r.title}</span>
                          <p className="text-sm text-slate-200 mt-1">{r.body}</p>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Labs */}
                {gameState.labResults.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-yellow-500">
                      <Activity className="w-4 h-4" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Laboratory</span>
                    </div>
                    <div className="bg-slate-900/40 rounded-2xl border border-slate-800/50 overflow-hidden divide-y divide-slate-800/50">
                      {gameState.labResults.map((l, i) => (
                        <div key={i} className="flex justify-between items-center px-4 py-3">
                          <span className="text-xs text-slate-300">{l.name}</span>
                          <div className="text-right">
                            <span className={cn(
                              "text-xs font-bold",
                              l.flag ? "text-red-500" : "text-emerald-500"
                            )}>
                              {l.value}
                            </span>
                            <span className="text-[9px] text-slate-600 ml-1 uppercase">{l.unit}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  };

  return (
    <div className="h-[100svh] flex flex-col bg-[#020617] text-slate-200 font-sans selection:bg-emerald-500/30 overflow-hidden">
      <header className="px-4 md:px-8 py-4 border-b border-slate-900 flex justify-between items-center bg-slate-950/50 backdrop-blur-xl z-50 shrink-0">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.2)] border border-emerald-500/30">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tighter uppercase italic">MediSim <span className="text-emerald-500 not-italic">ER</span></h1>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.3em]">Neural Engine: V3.1 PRO</span>
              </div>
            </div>
          </div>
          
          <div className="hidden lg:flex items-center gap-6 border-l border-slate-900 ml-6 pl-6">
            <div className="flex flex-col gap-0.5">
              <span className="text-[7px] font-black text-slate-600 uppercase tracking-widest">Simulation Context</span>
              <span className="text-[9px] font-mono text-emerald-500/70 uppercase truncate max-w-[150px]">
                {gameState.stage === 'playing' && gameState.messages && gameState.messages[0]?.content ? gameState.messages[0].content.substring(0, 20) + '...' : 'IDLE_WAIT'}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[7px] font-black text-slate-600 uppercase tracking-widest">Biometric Sync</span>
              <span className="text-[9px] font-mono text-blue-500/70 uppercase">High Fidelity</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="hidden md:flex flex-col items-end">
                <span className="text-[10px] font-bold text-white tracking-tight">{user.displayName}</span>
                <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Clinical Resident</span>
              </div>
              <img src={user.photoURL} alt={user.displayName} className="w-8 h-8 rounded-full border border-slate-800" referrerPolicy="no-referrer" />
              <button 
                onClick={logout}
                className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-500 hover:text-red-400 hover:border-red-400/50 transition-all"
                title="Logout"
              >
                <RefreshCcw className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button 
              onClick={signInWithGoogle}
              className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-500/50 text-slate-400 hover:text-emerald-400 text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
              title="Sign in to sync clinical cases across devices"
            >
              <Play className="w-3.5 h-3.5" />
              Sign In (Optional)
            </button>
          )}
          <button 
            onClick={() => setShowHistory(true)}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-500 hover:text-emerald-400 hover:border-emerald-400/50 transition-all flex items-center gap-2"
            title="Learning Log"
          >
            <ScrollText className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-widest hidden md:inline">Learning Log</span>
          </button>
          {gameState.stage === 'playing' && (
            <>
              <button 
                onClick={() => setAudioMonitor(!audioMonitor)} 
                className={cn(
                  "p-2.5 rounded-xl border transition-all",
                  audioMonitor 
                    ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-500" 
                    : "bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300"
                )}
              >
                {audioMonitor ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>
              <button 
                onClick={() => setChartOpen(!chartOpen)} 
                className={cn(
                  "p-2.5 rounded-xl border transition-all",
                  chartOpen 
                    ? "bg-slate-800 border-slate-700 text-white" 
                    : "bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300"
                )}
              >
                <Layout className="w-4 h-4" />
              </button>
              <button 
                onClick={() => {
                  setGameState(DEFAULT_STATE);
                }}
                className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-500 hover:text-red-400 hover:border-red-400/50 transition-all"
              >
                <RefreshCcw className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </header>

      <main className="flex-1 flex flex-col overflow-hidden">
        {renderContent()}
      </main>

      {error && <ErrorModal message={error} onDismiss={() => setError(null)} />}
      <AnimatePresence>
        {showHistory && <LearningLog history={history} onClose={() => setShowHistory(false)} />}
      </AnimatePresence>
    </div>
  );
};

export default App;

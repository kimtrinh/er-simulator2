
import React from 'react';
import { motion } from 'framer-motion';
import { 
  Trophy, 
  Target, 
  Activity, 
  Zap, 
  AlertCircle, 
  BookOpen, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  Info,
  ChevronRight
} from 'lucide-react';
import { DebriefData } from '../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Props {
  data: DebriefData;
  onRestart: () => void;
}

const ProgressBar = ({ label, value, icon: Icon }: { label: string; value: number; icon: any }) => {
    const color = value >= 80 ? 'bg-emerald-500' : value >= 60 ? 'bg-yellow-500' : 'bg-red-500';
    const textColor = value >= 80 ? 'text-emerald-400' : value >= 60 ? 'text-yellow-400' : 'text-red-400';

    return (
        <div className="space-y-2">
            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                <div className="flex items-center gap-2">
                    <Icon className={cn("w-3.5 h-3.5", textColor)} />
                    <span>{label}</span>
                </div>
                <span className={textColor}>{value}%</span>
            </div>
            <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden p-[1px]">
                <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${value}%` }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    className={cn("h-full rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)]", color)}
                />
            </div>
        </div>
    );
};

const DebriefScreen: React.FC<Props> = ({ data, onRestart }) => {
  const scoreColor = data.score >= 80 ? 'text-emerald-400 border-emerald-500/30 shadow-emerald-500/20' 
                   : data.score >= 60 ? 'text-yellow-400 border-yellow-500/30 shadow-yellow-500/20' 
                   : 'text-red-400 border-red-500/30 shadow-red-500/20';

  const criticalEvents = data.criticalEvents || [];
  const missedOpportunities = data.missedOpportunities || [];
  const cmeLearningPoints = data.cmeLearningPoints || [];

  return (
    <div className="flex-1 overflow-y-auto bg-slate-950 selection:bg-emerald-500/30">
      <div className="max-w-6xl mx-auto p-6 md:p-12 space-y-12 pb-32">
        
        {/* Header Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-8"
        >
            {/* Score Card */}
            <div className="lg:col-span-1 bg-slate-900/40 backdrop-blur-xl p-10 rounded-[2.5rem] border border-slate-800/50 flex flex-col items-center justify-center relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                
                <div className={cn(
                  "w-40 h-40 rounded-full border-[6px] flex items-center justify-center relative z-10 transition-all duration-700 shadow-2xl",
                  scoreColor
                )}>
                    <div className="text-center">
                      <motion.span 
                        initial={{ scale: 0.5 }}
                        animate={{ scale: 1 }}
                        className="block text-6xl font-black tracking-tighter"
                      >
                        {data.score}
                      </motion.span>
                      <span className="text-[10px] uppercase tracking-[0.3em] font-black opacity-40">Score</span>
                    </div>
                </div>
                <motion.h2 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-2xl font-black text-white mt-8 text-center tracking-tight"
                >
                  {data.outcome}
                </motion.h2>
            </div>

            {/* Performance Breakdown */}
            <div className="lg:col-span-2 bg-slate-900/40 backdrop-blur-xl p-10 rounded-[2.5rem] border border-slate-800/50 flex flex-col justify-center relative overflow-hidden">
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-2 bg-slate-800 rounded-xl">
                    <Target className="w-5 h-5 text-emerald-500" />
                  </div>
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">Performance Analytics</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                    <ProgressBar icon={BookOpen} label="History & Data" value={data.performanceBreakdown?.historyDataCollection || 0} />
                    <ProgressBar icon={Activity} label="Differential DX" value={data.performanceBreakdown?.differentialDiagnosis || 0} />
                    <ProgressBar icon={Zap} label="Management" value={data.performanceBreakdown?.medicalManagement || 0} />
                    <ProgressBar icon={Target} label="Efficiency" value={data.performanceBreakdown?.communicationEfficiency || 0} />
                </div>
            </div>
        </motion.div>

        {/* Narrative Summary */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-slate-900/40 backdrop-blur-xl border-l-4 border-emerald-500 p-10 rounded-3xl relative overflow-hidden"
        >
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <Trophy className="w-32 h-32 text-emerald-500" />
            </div>
            <h3 className="text-emerald-400 font-black mb-4 text-xs uppercase tracking-[0.3em] flex items-center gap-2">
              <Info className="w-4 h-4" />
              Clinical Case Narrative
            </h3>
            <p className="text-slate-300 leading-relaxed text-lg font-medium max-w-4xl">{data.summary}</p>
        </motion.div>

        {/* Critical Events Analysis */}
        <div className="space-y-10">
          <div className="flex items-center gap-4">
            <div className="h-px flex-1 bg-slate-900" />
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.4em] flex items-center gap-3">
              <Zap className="w-4 h-4 text-yellow-500" />
              Decision Timeline
            </h3>
            <div className="h-px flex-1 bg-slate-900" />
          </div>

          <div className="space-y-8 relative">
            <div className="absolute left-6 top-0 bottom-0 w-px bg-slate-900" />
            
            {criticalEvents.map((event, idx) => {
               const isPositive = event.type === 'positive';
               const isNegative = event.type === 'negative';
               
               return (
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  key={idx} 
                  className="relative pl-16"
                >
                    {/* Timeline Dot */}
                    <div className={cn(
                      "absolute left-3 top-0 w-6 h-6 rounded-full border-4 z-10 bg-slate-950 transition-all duration-500",
                      isPositive ? "border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]" : isNegative ? "border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]" : "border-slate-700"
                    )} />

                    {/* Content Card */}
                    <div className={cn(
                      "p-8 bg-slate-900/40 backdrop-blur-xl rounded-[2rem] border transition-all duration-500 group hover:bg-slate-900/60",
                      isPositive ? "border-emerald-500/10 hover:border-emerald-500/30" : isNegative ? "border-red-500/10 hover:border-red-500/30" : "border-slate-800"
                    )}>
                        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                            <h4 className="text-xl font-black text-slate-100 tracking-tight">{event.event}</h4>
                            <div className={cn(
                              "text-[9px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full border",
                              isPositive ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : isNegative ? "bg-red-500/10 text-red-400 border-red-500/20" : "bg-slate-800 text-slate-400 border-slate-700"
                            )}>
                                {isPositive ? 'Optimal Decision' : isNegative ? 'Clinical Pitfall' : 'Neutral Event'}
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                            <div className="space-y-2">
                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-600 block">User Action</span>
                                <div className={cn(
                                  "p-4 rounded-2xl bg-slate-950/50 border border-slate-800/50 text-sm font-medium",
                                  isNegative ? "text-red-300/80" : "text-slate-300"
                                )}>
                                  {event.userAction}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600/60 block">Optimal Path</span>
                                <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 text-sm font-medium text-emerald-100/70">
                                  {event.optimalAction}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-start gap-3 p-4 bg-slate-950/30 rounded-2xl border border-slate-800/30">
                          <Info className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
                          <p className="text-slate-400 text-sm leading-relaxed italic">
                            {event.feedback}
                          </p>
                        </div>
                    </div>
                </motion.div>
               );
            })}
          </div>
        </div>

        {/* Learning & Missed Opps */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-slate-900/40 backdrop-blur-xl p-10 rounded-[2.5rem] border border-slate-800/50 relative overflow-hidden"
          >
            <div className="flex items-center gap-3 mb-8">
              <div className="p-2 bg-orange-500/10 rounded-xl">
                <AlertCircle className="w-5 h-5 text-orange-500" />
              </div>
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">Missed Opportunities</h3>
            </div>
            
            {missedOpportunities.length > 0 ? (
                <ul className="space-y-4">
                {missedOpportunities.map((point, idx) => (
                    <li key={idx} className="flex items-start gap-4 group">
                      <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-orange-500/50 group-hover:bg-orange-500 transition-colors" />
                      <span className="text-slate-300 text-sm font-medium leading-relaxed">{point}</span>
                    </li>
                ))}
                </ul>
            ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center space-y-4">
                  <CheckCircle2 className="w-12 h-12 text-emerald-500/20" />
                  <p className="text-slate-500 font-medium italic">No missed opportunities detected.<br/>Exceptional clinical performance.</p>
                </div>
            )}
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="bg-slate-900/40 backdrop-blur-xl p-10 rounded-[2.5rem] border border-slate-800/50 relative overflow-hidden"
          >
            <div className="flex items-center gap-3 mb-8">
              <div className="p-2 bg-blue-500/10 rounded-xl">
                <BookOpen className="w-5 h-5 text-blue-500" />
              </div>
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">CME Core Concepts</h3>
            </div>
            
            <ul className="space-y-4">
              {cmeLearningPoints.map((point, idx) => (
                <li key={idx} className="flex items-start gap-4 group">
                  <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500/50 group-hover:bg-blue-500 transition-colors" />
                  <span className="text-slate-300 text-sm font-medium leading-relaxed">{point}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>

        {/* Restart Action */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="flex justify-center pt-12"
        >
            <motion.button 
                whileHover={{ scale: 1.05, y: -5 }}
                whileTap={{ scale: 0.95 }}
                onClick={onRestart}
                className="group relative px-12 py-5 bg-emerald-600 text-white rounded-[2rem] font-black uppercase tracking-[0.2em] text-xs shadow-2xl shadow-emerald-900/40 transition-all overflow-hidden"
            >
                <span className="relative z-10 flex items-center gap-3">
                    Initialize New Simulation
                    <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-700" />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </motion.button>
        </motion.div>

      </div>
    </div>
  );
};

export default DebriefScreen;


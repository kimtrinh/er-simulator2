
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Heart, Wind, Thermometer, Droplets, AlertTriangle, Gauge } from 'lucide-react';
import { Vitals } from '../types';
import TelemetryWaveform from './TelemetryWaveform';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Props {
  vitals: Vitals;
  trend?: 'stable' | 'improving' | 'worsening' | 'critical';
  audioEnabled?: boolean;
}

const VitalBox = ({ 
  label, 
  short,
  value, 
  unit, 
  color, 
  icon: Icon,
  flicker = false,
}: { 
  label: string, 
  /** Label used where the box is narrow (phones). */
  short: string,
  value: string | number, 
  unit?: string, 
  color: string, 
  icon: any,
  flicker?: boolean,
}) => (
  <motion.div 
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    className={cn(
      "flex flex-col justify-between min-w-0 bg-slate-900/40 border border-slate-800/50 px-2 py-1.5 md:px-4 md:py-2.5 rounded-xl md:rounded-2xl relative overflow-hidden group transition-all hover:border-slate-700",
      flicker && "animate-pulse"
    )}
  >
    <div className="flex items-center justify-between mb-1 border-b border-slate-800/50 pb-1">
      <span className={cn("text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] opacity-40 group-hover:opacity-100 transition-opacity whitespace-nowrap", color)}>
        <span className="md:hidden">{short}</span>
        <span className="hidden md:inline">{label}</span>
      </span>
      <Icon className={cn("w-3 h-3 md:w-3.5 md:h-3.5 shrink-0 opacity-20 group-hover:opacity-100 transition-opacity", color)} />
    </div>
    <div className="flex items-baseline gap-1 mt-auto">
      <span className={cn("text-xl md:text-3xl font-black monitor-font tracking-tighter drop-shadow-[0_0_10px_rgba(0,0,0,0.5)]", color)}>
        {value ?? '--'}
      </span>
      {unit && <span className="text-[8px] md:text-[10px] text-slate-600 font-bold uppercase tracking-widest">{unit}</span>}
    </div>
    {/* Visible grid scanline overlay */}
    <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.02),rgba(0,255,0,0.01),rgba(0,0,255,0.02))] bg-[size:100%_4px,3px_100%]" />
    {/* CRT Flicker */}
    <div className="absolute inset-0 pointer-events-none crt-flicker opacity-[0.03]" />
  </motion.div>
);

const VitalsMonitor: React.FC<Props> = ({ vitals, trend = 'stable', audioEnabled = false }) => {
  const defaultVitals: Vitals = {
    hr: 0,
    bpSystolic: 0,
    bpDiastolic: 0,
    rr: 0,
    o2: 0,
    temp: 0,
    rhythm: 'Initializing...'
  };

  const safeVitals = vitals || defaultVitals;
  const [liveVitals, setLiveVitals] = useState<Vitals>(safeVitals);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (vitals) {
      setLiveVitals(vitals);
    }
  }, [vitals]);

  // What the engine last reported, as opposed to the drifting values on screen.
  const reportedRef = useRef(safeVitals);
  reportedRef.current = safeVitals;

  // Monitor beep: one per QRS as the trace draws it, pitched by the saturation —
  // so it is irregular in AF and silent in VF or asystole.
  const audioEnabledRef = useRef(audioEnabled);
  audioEnabledRef.current = audioEnabled;
  const o2Ref = useRef(liveVitals.o2);
  o2Ref.current = liveVitals.o2;

  const playBeep = useCallback(() => {
    if (!audioEnabledRef.current) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      const freq = 440 + (Math.max(80, o2Ref.current || 90) - 90) * 20;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.type = 'sine';
      
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.05, ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch (e) {
      console.warn("Audio beep failed:", e);
    }
  }, []);

  // Physiological Drift & Jitter
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveVitals(current => {
        if (!current) return defaultVitals;

        const jitter = (val: number, factor: number) => {
          return val + (Math.random() - 0.5) * factor;
        };

        const reported = reportedRef.current;
        let newHr = current.hr || 0;
        let newSys = current.bpSystolic || 0;
        let newDia = current.bpDiastolic || 0;
        let newO2 = current.o2 || 0;

        // A slow heart gets slower as the patient worsens, not faster.
        const brady = reported.hr > 0 && reported.hr < 60;

        if (trend === 'worsening') {
          if (brady) { if (newHr > 30) newHr -= 0.2; } else if (newHr < 140) newHr += 0.4;
          if (newSys > 70) newSys -= 0.3;
          if (newDia > 40) newDia -= 0.3;
          if (newO2 > 85) newO2 -= 0.2;
        } else if (trend === 'critical') {
          if (brady) { if (newHr > 25) newHr -= 0.5; } else if (newHr < 160) newHr += 1;
          if (newSys > 50) newSys -= 1;
          if (newDia > 30) newDia -= 1;
          if (newO2 > 70) newO2 -= 0.5;
        } else if (trend === 'improving') {
           if (newHr > 80) newHr -= 0.5; else if (newHr < 80) newHr += 0.2;
           if (newSys < 120) newSys += 0.5; else if (newSys > 120) newSys -= 0.5;
           if (newO2 < 98) newO2 += 0.3;
        }

        const etco2 = reported.etco2;

        return {
          ...current,
          // A rate the engine reports as zero (asystole, apnoea) stays zero rather than drifting up.
          hr: reported.hr > 0 ? Math.max(1, Math.round(jitter(newHr, 0.5))) : 0,
          bpSystolic: Math.round(jitter(newSys, 0.5)),
          bpDiastolic: Math.round(jitter(newDia, 0.5)),
          rr: reported.rr > 0 ? Math.max(1, Math.round(jitter(current.rr || reported.rr, 0.3))) : 0,
          o2: Math.min(100, Math.max(0, Math.round(jitter(newO2, 0.2)))),
          temp: parseFloat(jitter(current.temp || 37.0, 0.01).toFixed(1)),
          etco2: typeof etco2 === 'number' && etco2 > 0 ? Math.max(1, Math.round(jitter(etco2, 1.2))) : etco2
        };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [trend]);

  const getHrColor = (hr: number) => hr > 120 || hr < 50 ? 'text-red-500' : 'text-emerald-500';
  const getO2Color = (o2: number) => o2 < 92 ? 'text-red-500' : 'text-blue-400';
  const getBpColor = (sys: number) => sys < 90 || sys > 170 ? 'text-red-500' : 'text-yellow-400';
  const hasEtco2 = typeof liveVitals.etco2 === 'number' && Number.isFinite(liveVitals.etco2);
  const etco2Color = hasEtco2 && (liveVitals.etco2! < 25 || liveVitals.etco2! > 50) ? 'text-red-500' : 'text-slate-200';

  return (
    <div className="bg-[#0f172a]/90 backdrop-blur-2xl border-b border-[#1e293b] p-3 md:p-5 relative z-40 shrink-0 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
      <div className="max-w-[1600px] mx-auto grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-6">
        
        {/* Waveforms: ECG, pleth, capnogram */}
        <div className="md:col-span-5 bg-black border border-[#334155]/50 rounded-xl h-[132px] md:h-auto md:min-h-[176px] relative overflow-hidden group shadow-inner">
           {/* Hardware grid overlay */}
           <div className="absolute inset-0 pointer-events-none opacity-[0.07] bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:20px_20px]" />
           
           <TelemetryWaveform
             vitals={{ ...liveVitals, rhythm: safeVitals.rhythm || '', capnogram: safeVitals.capnogram }}
             ecgColor={liveVitals.hr > 120 || liveVitals.hr < 50 ? 'rgb(239, 68, 68)' : 'rgb(16, 185, 129)'}
             onBeat={playBeep}
           />
           
        </div>

        {/* Vital Parameters */}
        <div className="md:col-span-7 grid grid-cols-3 gap-2 md:gap-4">
          <VitalBox 
              label="Heart Rate" 
              short="HR"
              value={liveVitals.hr} 
              unit="bpm" 
              color={getHrColor(liveVitals.hr)} 
              icon={Heart}
              flicker={liveVitals.hr > 130}
          />
          <VitalBox 
              label="Blood Pressure" 
              short="BP"
              value={liveVitals.bpSystolic > 0 ? `${liveVitals.bpSystolic}/${liveVitals.bpDiastolic}` : '--/--'} 
              unit="mmHg" 
              color={getBpColor(liveVitals.bpSystolic)} 
              icon={Activity}
          />
          <VitalBox 
              label="Oxygen Sat" 
              short="SpO₂"
              value={liveVitals.o2 > 0 ? liveVitals.o2 : '--'} 
              unit="%" 
              color={getO2Color(liveVitals.o2)} 
              icon={Droplets}
          />
          <VitalBox 
              label="Resp Rate" 
              short="RR"
              value={liveVitals.rr} 
              unit="/min" 
              color="text-cyan-400" 
              icon={Wind}
          />
          <VitalBox 
              label="End-Tidal CO₂" 
              short="EtCO₂"
              value={hasEtco2 ? liveVitals.etco2! : '--'} 
              unit="mmHg" 
              color={etco2Color} 
              icon={Gauge}
          />
          <VitalBox 
              label="Temperature" 
              short="Temp"
              value={liveVitals.temp > 0 ? liveVitals.temp : '--'} 
              unit="°C" 
              color="text-orange-300" 
              icon={Thermometer}
          />
        </div>
      </div>
      
      <div className="max-w-[1600px] mx-auto flex justify-between items-center gap-3 mt-2 md:mt-3 px-1">
        <div className="flex items-center gap-2 shrink-0">
          <div className={cn(
            "w-1 h-1 md:w-1.5 md:h-1.5 rounded-full transition-all",
            audioEnabled ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" : "bg-slate-700"
          )} />
          <span className="text-[8px] md:text-[9px] text-slate-600 font-black uppercase tracking-[0.2em]">Audio: {audioEnabled ? 'On' : 'Off'}</span>
          {/* Kept off the strip so it never covers the traces */}
          <AnimatePresence>
            {(trend === 'worsening' || trend === 'critical') && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex items-center gap-1.5 ml-1 md:ml-3 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-md"
              >
                 <AlertTriangle className="w-3 h-3 text-red-500 animate-pulse" />
                 <span className="hidden sm:inline text-[8px] md:text-[9px] font-black text-red-500 uppercase tracking-widest">Deteriorating</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          <span className="text-[8px] md:text-[9px] text-slate-600 uppercase font-black tracking-[0.2em] hidden sm:inline">Rhythm:</span>
          <span className={cn(
            "text-[9px] md:text-[10px] font-black tracking-widest uppercase monitor-font truncate",
            liveVitals.hr > 120 || liveVitals.hr < 50 ? "text-red-500" : "text-emerald-500"
          )}>
            {safeVitals.rhythm || '--'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default VitalsMonitor;


import React, { useEffect, useRef } from 'react';
import { Vitals } from '../types';
import { MonitorEngine, capnoScale, capnoY } from './monitor/engine';

interface Props {
  /** What the monitor is showing right now (the live, drifting values). */
  vitals: Vitals;
  ecgColor: string;
  /** Called on each QRS as it is drawn, for the monitor beep. */
  onBeat?: () => void;
}

const PLETH_COLOR = 'rgb(96, 165, 250)';
const CAPNO_COLOR = 'rgb(226, 232, 240)';

const Strip = ({
  label,
  labelClass,
  className,
  glow,
  canvasRef,
  children,
}: {
  label: string;
  labelClass: string;
  className: string;
  glow: string;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  children?: React.ReactNode;
}) => (
  <div className={`relative min-h-0 ${className}`}>
    <span className={`absolute top-1 left-2.5 z-10 text-[8px] md:text-[9px] font-black uppercase tracking-[0.3em] ${labelClass}`}>
      {label}
    </span>
    {children}
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full block"
      style={{ filter: `drop-shadow(0 0 5px ${glow})` }}
    />
  </div>
);

/** The monitor's three sweeping traces: ECG, pleth and capnogram. */
const TelemetryWaveform: React.FC<Props> = ({ vitals, ecgColor, onBeat }) => {
  const ecgRef = useRef<HTMLCanvasElement>(null);
  const plethRef = useRef<HTMLCanvasElement>(null);
  const capnoRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<MonitorEngine | null>(null);
  const beatRef = useRef(onBeat);
  beatRef.current = onBeat;

  useEffect(() => {
    const engine = new MonitorEngine();
    engineRef.current = engine;
    engine.onBeat = () => beatRef.current?.();
    engine.attach('ecg', ecgRef.current, ecgColor, 2);
    engine.attach('pleth', plethRef.current, PLETH_COLOR, 1.75);
    engine.attach('capno', capnoRef.current, CAPNO_COLOR, 1.75);
    engine.start();
    return () => {
      engine.dispose();
      engineRef.current = null;
    };
    // The engine lives for the life of the monitor; inputs reach it through the effects below.
  }, []);

  const { hr, rr, o2, bpSystolic, bpDiastolic, rhythm, etco2, capnogram } = vitals;
  useEffect(() => {
    engineRef.current?.setInput({ hr, rr, o2, bpSystolic, bpDiastolic, rhythm, etco2, capnogram });
  }, [hr, rr, o2, bpSystolic, bpDiastolic, rhythm, etco2, capnogram]);

  useEffect(() => {
    engineRef.current?.setColor('ecg', ecgColor);
  }, [ecgColor]);

  const scale = capnoScale(etco2);

  return (
    <div className="absolute inset-0 flex flex-col">
      <Strip label="Lead II" labelClass="text-emerald-500/50" className="flex-[9]" glow={ecgColor} canvasRef={ecgRef} />
      <Strip
        label="Pleth"
        labelClass="text-blue-400/50"
        className="flex-[5] border-t border-white/[0.06]"
        glow={PLETH_COLOR}
        canvasRef={plethRef}
      />
      <Strip
        label="CO₂"
        labelClass="text-slate-300/50"
        className="flex-[5] border-t border-white/[0.06]"
        glow="rgba(226, 232, 240, 0.6)"
        canvasRef={capnoRef}
      >
        {/* 40 mmHg reference line */}
        <div
          className="absolute inset-x-0 border-t border-dashed border-white/10 pointer-events-none"
          style={{ top: `${capnoY(40, scale) * 100}%` }}
        >
          <span className="absolute right-1.5 -top-[9px] text-[7px] font-mono text-slate-600">40</span>
        </div>
      </Strip>
    </div>
  );
};

export default TelemetryWaveform;

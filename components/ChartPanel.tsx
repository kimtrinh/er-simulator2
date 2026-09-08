import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  FileText,
  Stethoscope,
  Pill,
  ClipboardList,
  Brain,
  Syringe,
  ScanLine,
  AlertTriangle,
} from 'lucide-react';
import {
  LabResult,
  DiagnosticReport,
  PhysicalExamResult,
  OrderLogEntry,
  OrderCategory,
  WorkingDiagnosis,
} from '../types';
import { CATEGORY_LABELS } from '../data/orderCatalog';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Props {
  labResults: LabResult[];
  diagnosticReports: DiagnosticReport[];
  physicalExam: PhysicalExamResult[];
  orderLog: OrderLogEntry[];
  workingDiagnoses: WorkingDiagnosis[];
  /** Full-page (tab) layout vs. the narrow side drawer. */
  variant?: 'panel' | 'page';
}

type LogFilter = 'all' | 'medication' | 'lab' | 'imaging' | 'procedure' | 'critical';

const LOG_FILTERS: { id: LogFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'medication', label: 'Meds' },
  { id: 'lab', label: 'Labs' },
  { id: 'imaging', label: 'Imaging' },
  { id: 'procedure', label: 'Procedures' },
  { id: 'critical', label: 'Critical' },
];

const CATEGORY_STYLES: Record<OrderCategory, { dot: string; text: string; icon: any }> = {
  critical: { dot: 'bg-red-500', text: 'text-red-400', icon: AlertTriangle },
  medication: { dot: 'bg-purple-500', text: 'text-purple-400', icon: Pill },
  lab: { dot: 'bg-yellow-500', text: 'text-yellow-400', icon: Activity },
  imaging: { dot: 'bg-emerald-500', text: 'text-emerald-400', icon: ScanLine },
  procedure: { dot: 'bg-blue-500', text: 'text-blue-400', icon: Syringe },
  exam: { dot: 'bg-blue-400', text: 'text-blue-300', icon: Stethoscope },
  history: { dot: 'bg-slate-400', text: 'text-slate-300', icon: ClipboardList },
  consult: { dot: 'bg-cyan-500', text: 'text-cyan-400', icon: ClipboardList },
  disposition: { dot: 'bg-orange-500', text: 'text-orange-400', icon: ClipboardList },
  other: { dot: 'bg-slate-500', text: 'text-slate-400', icon: ClipboardList },
};

const clockTime = (ts: number) =>
  new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const Section: React.FC<{
  title: string;
  icon: any;
  accent: string;
  count?: number;
  children: React.ReactNode;
}> = ({ title, icon: Icon, accent, count, children }) => (
  <div className="space-y-4">
    <div className={cn('flex items-center gap-2', accent)}>
      <Icon className="w-4 h-4" />
      <span className="text-[10px] font-black uppercase tracking-widest">{title}</span>
      {typeof count === 'number' && count > 0 && (
        <span className="text-[9px] font-black text-slate-600">({count})</span>
      )}
    </div>
    {children}
  </div>
);

const ChartPanel: React.FC<Props> = ({
  labResults,
  diagnosticReports,
  physicalExam,
  orderLog,
  workingDiagnoses,
  variant = 'panel',
}) => {
  const [logFilter, setLogFilter] = useState<LogFilter>('all');

  const filteredLog = useMemo(() => {
    if (logFilter === 'all') return orderLog;
    if (logFilter === 'critical') return orderLog.filter((o) => o.critical || o.category === 'critical');
    return orderLog.filter((o) => o.category === logFilter);
  }, [orderLog, logFilter]);

  const activeDx = workingDiagnoses.filter((d) => d.confidence !== 'ruled-out');
  const isEmpty =
    !labResults.length &&
    !diagnosticReports.length &&
    !physicalExam.length &&
    !orderLog.length &&
    !workingDiagnoses.length;

  return (
    <div
      className={cn(
        'space-y-8',
        variant === 'page' && 'max-w-5xl mx-auto w-full grid gap-8 md:grid-cols-2 md:space-y-0 items-start'
      )}
    >
      {isEmpty && (
        <p className="text-xs text-slate-600 leading-relaxed">
          The chart is empty. Place an order, examine the patient, or document a differential and
          everything you do will collect here.
        </p>
      )}

      {/* Working differential */}
      {workingDiagnoses.length > 0 && (
        <Section title="Working Differential" icon={Brain} accent="text-fuchsia-400" count={activeDx.length}>
          <div className="flex flex-wrap gap-2">
            {workingDiagnoses.map((d) => (
              <span
                key={d.id}
                className={cn(
                  'px-3 py-1.5 rounded-xl text-xs font-bold border',
                  d.confidence === 'leading' && 'bg-fuchsia-500/10 border-fuchsia-500/40 text-fuchsia-300',
                  d.confidence === 'considering' && 'bg-slate-900/60 border-slate-700 text-slate-300',
                  d.confidence === 'ruled-out' && 'bg-slate-900/40 border-slate-800 text-slate-600 line-through'
                )}
              >
                {d.confidence === 'leading' && <span className="mr-1 text-[9px] uppercase tracking-widest">Leading ·</span>}
                {d.name}
              </span>
            ))}
          </div>
        </Section>
      )}

      {/* Orders & meds given */}
      {orderLog.length > 0 && (
        <Section title="Orders & Meds Given" icon={Pill} accent="text-purple-400" count={orderLog.length}>
          <div className="flex flex-wrap gap-1.5">
            {LOG_FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setLogFilter(f.id)}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-colors',
                  logFilter === f.id
                    ? 'bg-purple-500/15 border-purple-500/40 text-purple-300'
                    : 'bg-slate-900/50 border-slate-800 text-slate-600 hover:text-slate-300'
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="bg-slate-900/40 rounded-2xl border border-slate-800/50 divide-y divide-slate-800/50 overflow-hidden">
            {filteredLog.length === 0 && (
              <p className="px-4 py-3 text-xs text-slate-600">Nothing in this category yet.</p>
            )}
            {filteredLog.map((entry) => {
              const style = CATEGORY_STYLES[entry.category] || CATEGORY_STYLES.other;
              return (
                <div key={entry.id} className="px-4 py-3 flex items-start gap-3">
                  <span className={cn('w-1.5 h-1.5 rounded-full mt-1.5 shrink-0', style.dot)} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-xs font-bold text-slate-200 truncate">{entry.label}</span>
                      <span className="text-[9px] font-mono text-slate-600 shrink-0">
                        {clockTime(entry.timestamp)}
                      </span>
                    </div>
                    <span className={cn('text-[9px] font-black uppercase tracking-widest', style.text)}>
                      {CATEGORY_LABELS[entry.category]}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* Physical exam */}
      {physicalExam.length > 0 && (
        <Section title="Physical Exam" icon={Stethoscope} accent="text-blue-500" count={physicalExam.length}>
          <div className="grid gap-3">
            {physicalExam.map((e, i) => (
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
        </Section>
      )}

      {/* Imaging */}
      {diagnosticReports.length > 0 && (
        <Section title="Imaging Reports" icon={FileText} accent="text-emerald-500" count={diagnosticReports.length}>
          <div className="grid gap-3">
            {diagnosticReports.map((r, i) => (
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                key={i}
                className="p-4 bg-slate-900/40 rounded-2xl border border-slate-800/50 border-l-4 border-l-emerald-600"
              >
                <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">{r.title}</span>
                <p className="text-sm text-slate-200 mt-1 whitespace-pre-wrap">{r.body}</p>
              </motion.div>
            ))}
          </div>
        </Section>
      )}

      {/* Labs */}
      {labResults.length > 0 && (
        <Section title="Laboratory" icon={Activity} accent="text-yellow-500" count={labResults.length}>
          <div className="bg-slate-900/40 rounded-2xl border border-slate-800/50 overflow-hidden divide-y divide-slate-800/50">
            {labResults.map((l, i) => (
              <div key={i} className="flex justify-between items-center px-4 py-3">
                <span className="text-xs text-slate-300">{l.name}</span>
                <div className="text-right">
                  <span className={cn('text-xs font-bold', l.flag ? 'text-red-500' : 'text-emerald-500')}>
                    {l.value}
                  </span>
                  <span className="text-[9px] text-slate-600 ml-1 uppercase">{l.unit}</span>
                  {l.flag && (
                    <span className="text-[9px] font-black text-red-500 ml-2 uppercase">{l.flag}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
};

export default ChartPanel;

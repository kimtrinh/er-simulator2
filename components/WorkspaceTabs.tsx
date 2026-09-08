import React from 'react';
import { MonitorSpeaker, ClipboardList, Brain, FolderOpen } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type WorkspaceView = 'sim' | 'orders' | 'diagnosis' | 'chart';

interface Props {
  active: WorkspaceView;
  onChange: (view: WorkspaceView) => void;
  counts: { orders: number; diagnoses: number; chart: number };
  /** The chart lives in a side drawer on wide screens, so its tab is hidden there. */
  showChartTab: boolean;
}

const WorkspaceTabs: React.FC<Props> = ({ active, onChange, counts, showChartTab }) => {
  const tabs: {
    id: WorkspaceView;
    label: string;
    icon: any;
    count?: number;
    accent: string;
    hidden?: boolean;
  }[] = [
    { id: 'sim', label: 'Sim Room', icon: MonitorSpeaker, accent: 'emerald' },
    { id: 'orders', label: 'Orders', icon: ClipboardList, count: counts.orders, accent: 'emerald' },
    { id: 'diagnosis', label: 'Diagnosis', icon: Brain, count: counts.diagnoses, accent: 'fuchsia' },
    { id: 'chart', label: 'Chart', icon: FolderOpen, count: counts.chart, accent: 'blue', hidden: !showChartTab },
  ];

  return (
    <div className="shrink-0 border-b border-slate-900 bg-slate-950/70 backdrop-blur-xl px-2 md:px-6">
      <div className="flex items-stretch gap-1 md:gap-2 overflow-x-auto no-scrollbar">
        {tabs
          .filter((t) => !t.hidden)
          .map((tab) => {
            const isActive = active === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onChange(tab.id)}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'relative flex items-center gap-2 px-3 md:px-5 py-3 md:py-3.5 whitespace-nowrap transition-all border-b-2',
                  isActive
                    ? tab.accent === 'fuchsia'
                      ? 'border-fuchsia-500 text-white'
                      : tab.accent === 'blue'
                      ? 'border-blue-500 text-white'
                      : 'border-emerald-500 text-white'
                    : 'border-transparent text-slate-500 hover:text-slate-300'
                )}
              >
                <tab.icon
                  className={cn(
                    'w-4 h-4',
                    isActive &&
                      (tab.accent === 'fuchsia'
                        ? 'text-fuchsia-400'
                        : tab.accent === 'blue'
                        ? 'text-blue-400'
                        : 'text-emerald-400')
                  )}
                />
                <span className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em]">
                  {tab.label}
                </span>
                {typeof tab.count === 'number' && tab.count > 0 && (
                  <span
                    className={cn(
                      'text-[9px] font-black px-1.5 py-0.5 rounded-md',
                      isActive ? 'bg-slate-800 text-slate-200' : 'bg-slate-900 text-slate-500'
                    )}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
      </div>
    </div>
  );
};

export default WorkspaceTabs;

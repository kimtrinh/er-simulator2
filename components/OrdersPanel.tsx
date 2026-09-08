import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Zap, Check, Send, Trash2, AlertTriangle, ArrowLeft, Plus } from 'lucide-react';
import {
  ORDER_GROUPS,
  ALL_ORDERS,
  CRITICAL_ACTIONS,
  OrderItem,
  resolveOrderText,
} from '../data/orderCatalog';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Props {
  /** Send one or more orders to the simulation as a single action. */
  onSubmitOrders: (orders: OrderItem[]) => void;
  /** Case-specific critical actions suggested by the clinical engine. */
  suggestedCriticalActions: string[];
  onBackToSimRoom: () => void;
  disabled: boolean;
}

const OrderButton: React.FC<{
  item: OrderItem;
  selected: boolean;
  disabled: boolean;
  onToggle: () => void;
  onStat: () => void;
}> = ({ item, selected, disabled, onToggle, onStat }) => (
  <div
    className={cn(
      'group relative rounded-2xl border transition-all overflow-hidden',
      item.critical
        ? 'bg-red-500/[0.04] border-red-500/25 hover:border-red-500/60'
        : 'bg-slate-900/50 border-slate-800 hover:border-emerald-500/40',
      selected && (item.critical ? 'border-red-500 bg-red-500/10' : 'border-emerald-500 bg-emerald-500/10'),
      disabled && 'opacity-40 pointer-events-none'
    )}
  >
    <button onClick={onToggle} disabled={disabled} className="w-full text-left p-3 pr-11">
      <div className="flex items-center gap-2">
        {item.critical && <AlertTriangle className="w-3 h-3 text-red-500 shrink-0" />}
        <span
          className={cn(
            'text-xs font-bold leading-tight',
            item.critical ? 'text-red-200' : 'text-slate-200'
          )}
        >
          {item.label}
        </span>
      </div>
      <p className="text-[10px] text-slate-500 mt-1 leading-snug line-clamp-2">{item.detail}</p>
    </button>

    <div className="absolute top-2 right-2 flex flex-col gap-1">
      <span
        className={cn(
          'w-6 h-6 rounded-lg border flex items-center justify-center transition-all',
          selected
            ? item.critical
              ? 'bg-red-500 border-red-500 text-white'
              : 'bg-emerald-500 border-emerald-500 text-white'
            : 'border-slate-700 text-slate-700 group-hover:text-slate-500'
        )}
      >
        {selected ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3 h-3" />}
      </span>
      <button
        onClick={onStat}
        disabled={disabled}
        title="Order STAT — send this one immediately"
        className="w-6 h-6 rounded-lg border border-slate-800 bg-slate-950 text-slate-600 hover:text-yellow-400 hover:border-yellow-500/50 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
      >
        <Zap className="w-3 h-3" />
      </button>
    </div>
  </div>
);

const OrdersPanel: React.FC<Props> = ({
  onSubmitOrders,
  suggestedCriticalActions,
  onBackToSimRoom,
  disabled,
}) => {
  const [search, setSearch] = useState('');
  const [basket, setBasket] = useState<OrderItem[]>([]);
  const [activeGroup, setActiveGroup] = useState<string>('critical');

  const suggested = useMemo(() => {
    const seen = new Set<string>();
    return (suggestedCriticalActions || []).map(resolveOrderText).filter((item) => {
      const key = item.label.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [suggestedCriticalActions]);

  /** The standing critical-action library, minus what the strip above already shows. */
  const criticalRow = useMemo(() => {
    const shown = new Set(suggested.map((s) => s.label.toLowerCase()));
    return CRITICAL_ACTIONS.filter((item) => !shown.has(item.label.toLowerCase()));
  }, [suggested]);

  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return null;
    return [...suggested, ...ALL_ORDERS].filter((o, i, arr) => {
      if (arr.findIndex((x) => x.label === o.label) !== i) return false;
      return (
        o.label.toLowerCase().includes(q) ||
        o.detail.toLowerCase().includes(q) ||
        (o.keywords || '').toLowerCase().includes(q)
      );
    });
  }, [search, suggested]);

  const isSelected = (item: OrderItem) => basket.some((b) => b.label === item.label);

  const toggle = (item: OrderItem) =>
    setBasket((prev) =>
      prev.some((b) => b.label === item.label)
        ? prev.filter((b) => b.label !== item.label)
        : [...prev, item]
    );

  const sendStat = (item: OrderItem) => {
    setBasket((prev) => prev.filter((b) => b.label !== item.label));
    onSubmitOrders([item]);
  };

  const signAndSend = () => {
    if (!basket.length) return;
    const orders = basket;
    setBasket([]);
    onSubmitOrders(orders);
  };

  const group = ORDER_GROUPS.find((g) => g.id === activeGroup) || ORDER_GROUPS[0];

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#020617]">
      {/* Header + search */}
      <div className="px-4 md:px-8 pt-5 pb-4 border-b border-slate-900 shrink-0 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-white tracking-tight uppercase italic">
              Order <span className="text-emerald-500 not-italic">Entry</span>
            </h2>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">
              Tap to build an order set · bolt sends one STAT
            </p>
          </div>
          <button
            onClick={onBackToSimRoom}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-emerald-400 hover:border-emerald-500/40 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-widest">Back to Sim Room</span>
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search every order — pelvic binder, tourniquet, TXA, troponin…"
            className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-3 pl-11 pr-4 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-all placeholder:text-slate-700"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar px-4 md:px-8 py-6 space-y-8">
        {searchResults ? (
          <div className="space-y-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
              {searchResults.length} matching order{searchResults.length === 1 ? '' : 's'}
            </span>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {searchResults.map((item) => (
                <OrderButton
                  key={item.label}
                  item={item}
                  selected={isSelected(item)}
                  disabled={disabled}
                  onToggle={() => toggle(item)}
                  onStat={() => sendStat(item)}
                />
              ))}
              {searchResults.length === 0 && (
                <p className="text-xs text-slate-600 col-span-full">
                  Nothing matched. Anything not in the catalogue can still be typed as a free-text
                  order in the sim room.
                </p>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Case-specific suggestions */}
            {suggested.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-red-400">
                  <Zap className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">
                    Suggested for this patient
                  </span>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {suggested.map((item) => (
                    <OrderButton
                      key={`sug-${item.label}`}
                      item={{ ...item, critical: true }}
                      selected={isSelected(item)}
                      disabled={disabled}
                      onToggle={() => toggle(item)}
                      onStat={() => sendStat(item)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Group tabs */}
            <div className="flex flex-wrap gap-2">
              {ORDER_GROUPS.map((g) => (
                <button
                  key={g.id}
                  onClick={() => setActiveGroup(g.id)}
                  className={cn(
                    'px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all',
                    activeGroup === g.id
                      ? g.id === 'critical'
                        ? 'bg-red-500/15 border-red-500/50 text-red-300'
                        : 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                      : 'bg-slate-900/50 border-slate-800 text-slate-500 hover:text-slate-300'
                  )}
                >
                  {g.title}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              <p className="text-[11px] text-slate-500">{group.blurb}</p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {(group.id === 'critical' ? criticalRow : group.items).map((item) => (
                  <OrderButton
                    key={item.label}
                    item={item}
                    selected={isSelected(item)}
                    disabled={disabled}
                    onToggle={() => toggle(item)}
                    onStat={() => sendStat(item)}
                  />
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Order basket */}
      {basket.length > 0 && (
        <motion.div
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="border-t border-slate-800 bg-slate-950/95 backdrop-blur-xl p-4 md:px-8 shrink-0 space-y-3"
        >
          <div className="flex items-center justify-between gap-4">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
              Order set · {basket.length} item{basket.length === 1 ? '' : 's'}
            </span>
            <button
              onClick={() => setBasket([])}
              className="text-slate-600 hover:text-red-400 transition-colors flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="text-[10px] font-black uppercase tracking-widest">Clear</span>
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {basket.map((item) => (
              <button
                key={item.label}
                onClick={() => toggle(item)}
                className={cn(
                  'px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-colors',
                  item.critical
                    ? 'bg-red-500/10 border-red-500/40 text-red-300 hover:border-red-500'
                    : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500'
                )}
              >
                {item.label} ×
              </button>
            ))}
          </div>
          <button
            onClick={signAndSend}
            disabled={disabled}
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold py-3.5 rounded-2xl transition-all flex items-center justify-center gap-2 active:scale-[0.99]"
          >
            <Send className="w-4 h-4" />
            Sign &amp; send {basket.length} order{basket.length === 1 ? '' : 's'}
          </button>
        </motion.div>
      )}
    </div>
  );
};

export default OrdersPanel;

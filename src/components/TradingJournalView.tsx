'use client';

import React, { useState, useMemo } from 'react';
import { TradeHistoryItem, SymbolId } from '@/types/trading';
import {
  BookOpen,
  Search,
  Filter,
  Plus,
  Tag,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Edit3,
  X,
} from 'lucide-react';

interface TradingJournalViewProps {
  tradeHistory?: TradeHistoryItem[];
  onSelectSymbol?: (symbol: SymbolId) => void;
  onNavigateTerminal?: () => void;
}

interface JournalEntry extends TradeHistoryItem {
  notes?: string;
  tags?: string[];
  regime?: string;
  aiConfidence?: number;
}

const DEFAULT_JOURNAL_ITEMS: JournalEntry[] = [];

export const TradingJournalView: React.FC<TradingJournalViewProps> = ({
  tradeHistory = [],
  onSelectSymbol,
  onNavigateTerminal,
}) => {
  const [search, setSearch] = useState('');
  const [filterOutcome, setFilterOutcome] = useState<'ALL' | 'WIN' | 'LOSS'>('ALL');
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [newNoteText, setNewNoteText] = useState('');

  // Map live tradeHistory into journal entries
  const allEntries = useMemo(() => {
    const historyMapped: JournalEntry[] = tradeHistory.map((t) => ({
      ...t,
      regime: 'ACTIVE_MARKET',
      aiConfidence: 0.75,
      tags: [t.closeReason || 'CLOSED', t.side === 'LONG' ? 'BULL_SETUP' : 'BEAR_SETUP'],
      notes: t.realizedPnL >= 0 ? 'Executed via AI Specialist Agent Loop with take-profit exit.' : 'Closed per deterministic risk management rules.',
    }));
    return [...historyMapped, ...entries.filter(e => !tradeHistory.some(t => t.id === e.id))];
  }, [tradeHistory, entries]);

  const filteredEntries = allEntries.filter((e) => {
    const matchesSearch =
      e.symbol.toLowerCase().includes(search.toLowerCase()) ||
      (e.notes && e.notes.toLowerCase().includes(search.toLowerCase())) ||
      (e.tags && e.tags.some(t => t.toLowerCase().includes(search.toLowerCase())));
    if (!matchesSearch) return false;
    if (filterOutcome === 'WIN') return e.realizedPnL > 0;
    if (filterOutcome === 'LOSS') return e.realizedPnL < 0;
    return true;
  });

  const handleSaveNotes = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEntry) return;
    setEntries((prev) =>
      prev.map((item) => (item.id === selectedEntry.id ? { ...item, notes: newNoteText } : item))
    );
    setSelectedEntry((prev) => (prev ? { ...prev, notes: newNoteText } : null));
  };

  return (
    <div className="space-y-4 pb-8 min-h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white tracking-tight">AI Trade Journal & Decision Audit</h2>
            <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <BookOpen className="w-3 h-3" />
              LIVE TRADE AUDIT
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            Log, tag, and review autonomous AI executions, specialist agent reasoning, and trade reflections
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-[#0B111E] p-1 rounded-xl border border-gray-800 text-xs">
            {(['ALL', 'WIN', 'LOSS'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilterOutcome(f)}
                className={`px-3 py-1 rounded-lg font-bold transition-all text-[11px] ${
                  filterOutcome === f ? 'bg-cyan-600 text-white shadow-md' : 'text-gray-400 hover:text-white'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="relative w-60">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search notes, tags, setups..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#0B111E] border border-gray-800 text-xs rounded-xl pl-9 pr-3 py-2 text-gray-200 placeholder-gray-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>
      </div>

      {/* Main Journal Cards List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Entries List */}
        <div className="lg:col-span-2 space-y-3">
          {filteredEntries.length > 0 ? (
            filteredEntries.map((item) => {
              const isWin = item.realizedPnL >= 0;
              const isSelected = selectedEntry?.id === item.id;

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    setSelectedEntry(item);
                    setNewNoteText(item.notes || '');
                  }}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-[#0F172A] border-cyan-500 shadow-lg shadow-cyan-500/10'
                      : 'bg-[#0B111E] border-[#1E293B] hover:border-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-white text-sm">{item.symbol}</span>
                      <span
                        className={`text-[9px] px-2 py-0.5 rounded font-black border ${
                          item.side === 'LONG'
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                        }`}
                      >
                        {item.side}
                      </span>
                      <span className="text-[10px] text-gray-400 font-mono">
                        {new Date(item.closedAt).toLocaleDateString()} {new Date(item.closedAt).toLocaleTimeString()}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 font-mono font-bold text-sm">
                      <span className={isWin ? 'text-emerald-400' : 'text-rose-400'}>
                        {isWin ? '+' : ''}${item.realizedPnL.toFixed(2)}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-black ${isWin ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                        {item.rMultiple ? `${item.rMultiple > 0 ? '+' : ''}${item.rMultiple}R` : isWin ? '+2.0R' : '-1.0R'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2 my-2.5 py-2 px-3 bg-[#080E1A] rounded-lg border border-gray-800 text-[11px] font-mono">
                    <div>
                      <span className="text-gray-500 block text-[9px]">Entry</span>
                      <span className="text-gray-200 font-bold">${item.entryPrice.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[9px]">Exit</span>
                      <span className="text-gray-200 font-bold">${item.exitPrice.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[9px]">Size</span>
                      <span className="text-gray-200 font-bold">{item.size}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[9px]">Exit Reason</span>
                      <span className={`font-bold ${item.closeReason === 'TAKE_PROFIT' ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {item.closeReason}
                      </span>
                    </div>
                  </div>

                  {item.notes && (
                    <p className="text-xs text-gray-300 mt-1 line-clamp-2 italic">
                      "{item.notes}"
                    </p>
                  )}

                  {item.tags && item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {item.tags.map((t, idx) => (
                        <span key={idx} className="text-[9px] px-2 py-0.5 rounded-full bg-blue-500/10 text-cyan-400 border border-blue-500/20 font-bold">
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="p-12 text-center bg-[#0B111E] rounded-xl border border-[#1E293B] flex flex-col items-center justify-center">
              <BookOpen className="w-8 h-8 text-gray-600 mb-2" />
              <span className="text-sm font-bold text-gray-300">No Journal Entries Found</span>
              <p className="text-xs text-gray-500 mt-1 max-w-sm">
                Autonomous bot trades and manual terminal executions will automatically log telemetry, timestamps, and execution notes here.
              </p>
            </div>
          )}
        </div>

        {/* Selected Entry Detail & Notes Editor */}
        <div className="bg-[#0B111E] p-5 rounded-xl border border-[#1E293B] space-y-4 h-fit sticky top-4">
          <h3 className="font-bold text-white text-sm flex items-center gap-2 pb-2 border-b border-gray-800">
            <Edit3 className="w-4 h-4 text-cyan-400" />
            Trade Reflection & Audit
          </h3>

          {selectedEntry ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-black text-white text-base">{selectedEntry.symbol} {selectedEntry.side}</div>
                  <div className="text-[11px] text-gray-400 font-mono">ID: {selectedEntry.id}</div>
                </div>
                <div className={`text-lg font-black font-mono ${selectedEntry.realizedPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {selectedEntry.realizedPnL >= 0 ? '+' : ''}${selectedEntry.realizedPnL.toFixed(2)}
                </div>
              </div>

              <div className="p-3 bg-[#080E1A] rounded-xl border border-gray-800 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-gray-400">Market Regime:</span>
                  <span className="font-bold text-cyan-400">{selectedEntry.regime || 'BULLISH'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">AI Confidence:</span>
                  <span className="font-bold text-emerald-400">{((selectedEntry.aiConfidence || 0.8) * 100).toFixed(0)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Fee / Slippage:</span>
                  <span className="font-mono text-gray-300">${selectedEntry.fee || 0} / ${selectedEntry.slippage || 0}</span>
                </div>
              </div>

              <form onSubmit={handleSaveNotes} className="space-y-2">
                <label className="text-xs font-bold text-gray-300 block">Trader Notes & Learnings</label>
                <textarea
                  rows={4}
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  placeholder="Record your thoughts, emotions, setup tags, and why this trade succeeded or failed..."
                  className="w-full bg-[#080E1A] border border-gray-800 rounded-xl p-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 resize-none"
                />
                <button
                  type="submit"
                  className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-xl shadow-md transition-all"
                >
                  Save Reflection
                </button>
              </form>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500 text-xs italic">
              Select any trade on the left to view the complete AI decision audit and write reflections.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

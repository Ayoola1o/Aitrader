'use client';

import React, { useState, useEffect } from 'react';
import { SymbolId } from '@/types/trading';
import { Bot, Play, Square, Pause, PlusCircle, Trash2, X } from 'lucide-react';

interface BotItem {
  id: string;
  name: string;
  symbol: SymbolId;
  status: 'RUNNING' | 'PAUSED' | 'STOPPED';
  allocatedCapital: number;
  cycleCount: number;
  tradesExecuted: number;
  runningPnL: number;
}

export const BotManager: React.FC = () => {
  const [bots, setBots] = useState<BotItem[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [symbol, setSymbol] = useState<SymbolId>('BTCUSDT');
  const [name, setName] = useState('');
  const [allocatedCapital, setAllocatedCapital] = useState<number>(1000);

  const fetchBots = async () => {
    try {
      const res = await fetch('/api/bot/state', { cache: 'no-store' });
      if (res.ok) {
        const d = await res.json();
        if (d.success && Array.isArray(d.bots)) {
          setBots(d.bots);
        }
      }
    } catch {}
  };

  useEffect(() => {
    fetchBots();
    const interval = setInterval(fetchBots, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleCreateBot = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/bot/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CREATE',
          config: {
            name: name || `${symbol} AI Bot`,
            symbol,
            allocatedCapital,
            cycleIntervalSeconds: 30,
          },
        }),
      });
      if (res.ok) {
        const d = await res.json();
        if (d.success && d.bots) setBots(d.bots);
      }
    } catch {}
    setShowAddModal(false);
    setName('');
  };

  const handleToggleBot = async (botId: string, currentStatus: string) => {
    const action = currentStatus === 'RUNNING' ? 'PAUSE' : 'START';
    try {
      const res = await fetch('/api/bot/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, botId }),
      });
      if (res.ok) {
        const d = await res.json();
        if (d.success && d.bots) setBots(d.bots);
      }
    } catch {}
  };

  const handleDeleteBot = async (botId: string) => {
    try {
      const res = await fetch('/api/bot/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'DELETE', botId }),
      });
      if (res.ok) {
        const d = await res.json();
        if (d.success && d.bots) setBots(d.bots);
      }
    } catch {}
  };

  return (
    <div className="p-4 rounded-2xl bg-[#0B111E] border border-gray-800 space-y-4 text-white">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-cyan-400" />
          <div>
            <h3 className="font-bold text-sm">Multi-Bot Cloud Controller</h3>
            <span className="text-[10px] text-gray-400 font-normal">24/7 Autonomous execution ({bots.length} deployed)</span>
          </div>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-xs font-bold flex items-center gap-1.5 transition-all shadow-md"
        >
          <PlusCircle className="w-4 h-4" />
          Spawn New Bot
        </button>
      </div>

      {/* Bots Roster */}
      <div className="space-y-2.5 max-h-72 overflow-y-auto custom-scrollbar">
        {bots.map((b) => (
          <div
            key={b.id}
            className="p-3 bg-[#080E1A] rounded-xl border border-gray-800/80 text-xs space-y-2 hover:border-gray-700 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    b.status === 'RUNNING' ? 'bg-emerald-400 animate-pulse' : b.status === 'PAUSED' ? 'bg-amber-400' : 'bg-rose-400'
                  }`}
                />
                <span className="font-bold text-white text-xs">{b.name}</span>
                <span className="font-mono text-cyan-400 text-[10px] bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20">
                  {b.symbol}
                </span>
              </div>
              <span className={`text-[10px] font-bold ${b.runningPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {b.runningPnL >= 0 ? '+' : ''}${b.runningPnL?.toFixed(2) || '0.00'} P&L
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-[11px] text-gray-400 font-mono">
              <div>Capital: <strong className="text-white">${b.allocatedCapital}</strong></div>
              <div>Cycles: <strong className="text-white">#{b.cycleCount || 0}</strong></div>
              <div>Trades: <strong className="text-white">{b.tradesExecuted || 0}</strong></div>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-gray-800/60">
              <span className="text-[10px] text-gray-400 uppercase font-black">{b.status}</span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleToggleBot(b.id, b.status)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 ${
                    b.status === 'RUNNING'
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                      : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                  }`}
                >
                  {b.status === 'RUNNING' ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                  {b.status === 'RUNNING' ? 'Pause' : 'Start'}
                </button>
                <button
                  onClick={() => handleDeleteBot(b.id)}
                  className="p-1 rounded-lg text-gray-400 hover:text-rose-400 hover:bg-rose-500/10"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <form onSubmit={handleCreateBot} className="bg-[#0B111E] p-5 rounded-2xl border border-gray-800 max-w-sm w-full space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm text-white">Spawn AI Quant Bot</h4>
              <button type="button" onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div>
              <label className="text-gray-400 block mb-1">Bot Name</label>
              <input
                type="text"
                placeholder="e.g. SOL Scalper Alpha"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#080E1A] border border-gray-800 rounded-lg p-2 text-white"
              />
            </div>
            <div>
              <label className="text-gray-400 block mb-1">Symbol</label>
              <select
                value={symbol}
                onChange={(e) => setSymbol(e.target.value as SymbolId)}
                className="w-full bg-[#080E1A] border border-gray-800 rounded-lg p-2 text-white"
              >
                <option value="BTCUSDT">BTCUSDT</option>
                <option value="ETHUSDT">ETHUSDT</option>
                <option value="SOLUSDT">SOLUSDT</option>
                <option value="XRPUSDT">XRPUSDT</option>
              </select>
            </div>
            <div>
              <label className="text-gray-400 block mb-1">Allocated Capital ($)</label>
              <input
                type="number"
                value={allocatedCapital}
                onChange={(e) => setAllocatedCapital(Number(e.target.value))}
                className="w-full bg-[#080E1A] border border-gray-800 rounded-lg p-2 text-white font-mono"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="w-1/2 py-2 rounded-lg bg-gray-800 text-gray-300 font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="w-1/2 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold"
              >
                Launch Bot
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

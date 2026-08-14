'use client';

import React, { useState } from 'react';
import { BotConfig, BotStatus, tradingBotEngine } from '@/lib/bot/engine';
import { SymbolId } from '@/types/trading';
import { AlertTriangle, PlusCircle, Bot, Play, Square } from 'lucide-react';

export const BotManager: React.FC = () => {
  const [botState, setBotState] = useState(tradingBotEngine.getState());
  const [showAddModal, setShowAddModal] = useState(false);
  const [symbol, setSymbol] = useState<SymbolId>('BTCUSDT');
  const [allocatedCapital, setAllocatedCapital] = useState<number>(500);

  const handleStartBot = (e: React.FormEvent) => {
    e.preventDefault();
    tradingBotEngine.start({
      symbol,
      allocatedCapital,
      cycleIntervalSeconds: 30,
      maxConsecutiveNoTrades: 5,
      maxConsecutiveLosses: 3,
      autoConfirmExit: false,
    });
    setBotState(tradingBotEngine.getState());
    setShowAddModal(false);
  };

  const handleStopBot = () => {
    tradingBotEngine.stop();
    setBotState(tradingBotEngine.getState());
  };

  return (
    <div className="p-4 rounded-2xl bg-[#0B111E] border border-gray-800 space-y-4 text-white">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-emerald-400" />
          <h3 className="font-bold text-sm">Quantitative AI Bot Controller</h3>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold flex items-center gap-1.5 transition-all"
        >
          <PlusCircle className="w-4 h-4" />
          Configure Bot
        </button>
      </div>

      <div className="p-3 bg-[#080E1A] rounded-xl border border-gray-800 text-xs space-y-2">
        <div className="flex justify-between">
          <span className="text-gray-400">Status:</span>
          <span className="font-bold text-emerald-400">{botState.status}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Symbol:</span>
          <span className="font-bold text-white">{botState.symbol}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Allocated Capital:</span>
          <span className="font-bold text-white">${botState.allocatedCapital}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Cycles:</span>
          <span className="font-bold text-white">#{botState.cycleCount}</span>
        </div>
      </div>

      {botState.status === 'RUNNING' ? (
        <button
          onClick={handleStopBot}
          className="w-full py-2 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-400 text-xs font-bold flex items-center justify-center gap-1.5"
        >
          <Square className="w-3.5 h-3.5 fill-current" />
          Stop Bot
        </button>
      ) : (
        <button
          onClick={() => setShowAddModal(true)}
          className="w-full py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold flex items-center justify-center gap-1.5"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          Start Bot
        </button>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <form onSubmit={handleStartBot} className="bg-[#0B111E] p-5 rounded-2xl border border-gray-800 max-w-sm w-full space-y-4 text-xs">
            <h4 className="font-bold text-sm">Spawn AI Bot</h4>
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
              <label className="text-gray-400 block mb-1">Capital ($)</label>
              <input
                type="number"
                value={allocatedCapital}
                onChange={(e) => setAllocatedCapital(Number(e.target.value))}
                className="w-full bg-[#080E1A] border border-gray-800 rounded-lg p-2 text-white"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="w-1/2 py-2 rounded-lg bg-gray-800 text-gray-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="w-1/2 py-2 rounded-lg bg-emerald-500 text-white font-bold"
              >
                Launch
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

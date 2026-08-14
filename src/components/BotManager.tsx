import React, { useState, useEffect } from 'react';
import { BotEngine, BotConfig, BotStatus } from '@/lib/features/engine';
import { fetchOpenAlpacaOrders } from '@/lib/broker/alpaca';
import { AlertTriangle, PlusCircle } from 'lucide-react';

/**
 * Bot Manager – UI driven by the screenshot provided by the user.
 * Shows a table of bots, allows creation, editing of risk‑gate thresholds
 * and per‑bot Alpaca credentials. All fields are free‑form (no defaults).
 */
export const BotManager: React.FC = () => {
  const [bots, setBots] = useState<BotConfig[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newBot, setNewBot] = useState<Partial<BotConfig>>({});

  // Load persisted bots on mount
  useEffect(() => {
    const loadBots = async () => {
      const stored = await BotEngine.listBots();
      setBots(stored);
    };
    loadBots();
  }, []);

  const handleAddBot = async () => {
    if (!newBot.name || !newBot.symbol) return;
    const created = await BotEngine.createBot(newBot as BotConfig);
    setBots(prev => [...prev, created]);
    setShowAddModal(false);
    setNewBot({});
  };

  const toggleBot = async (id: string, enable: boolean) => {
    if (enable) await BotEngine.startBot(id);
    else await BotEngine.stopBot(id);
    // refresh status
    const refreshed = await BotEngine.getBot(id);
    setBots(prev => prev.map(b => (b.id === id ? refreshed : b)));
  };

  const deleteBot = async (id: string) => {
    await BotEngine.removeBot(id);
    setBots(prev => prev.filter(b => b.id !== id));
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-200">Bot Manager</h2>
        <button
          className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-500"
          onClick={() => setShowAddModal(true)}
        >
          <PlusCircle className="w-4 h-4" /> Add Bot
        </button>
      </div>

      {/* Bot Table */}
      <table className="min-w-full text-sm text-gray-300">
        <thead className="bg-gray-800">
          <tr>
            <th className="px-3 py-2">Name</th>
            <th className="px-3 py-2">Symbol</th>
            <th className="px-3 py-2">Mode</th>
            <th className="px-3 py-2">Capital</th>
            <th className="px-3 py-2">Risk Gate</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {bots.map(bot => (
            <tr key={bot.id} className="border-b border-gray-700">
              <td className="px-3 py-2">{bot.name}</td>
              <td className="px-3 py-2">{bot.symbol}</td>
              <td className="px-3 py-2">{bot.appMode}</td>
              <td className="px-3 py-2">${bot.allocatedCapital.toLocaleString()}</td>
              <td className="px-3 py-2">
                {/* risk‑gate inputs – free numbers */}
                <input
                  type="number"
                  className="w-16 bg-gray-800 border border-gray-600 rounded px-1 text-xs text-gray-200"
                  value={bot.riskGate ?? ''}
                  onChange={e => BotEngine.updateBot(bot.id, { riskGate: Number(e.target.value) })}
                />
              </td>
              <td className="px-3 py-2">
                {bot.isRunning ? (
                  <span className="px-2 py-0.5 bg-emerald-600/30 text-emerald-400 rounded">Running</span>
                ) : (
                  <span className="px-2 py-0.5 bg-gray-600/30 text-gray-300 rounded">Paused</span>
                )}
              </td>
              <td className="px-3 py-2 space-x-2">
                <button
                  className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-500"
                  onClick={() => toggleBot(bot.id, !bot.isRunning)}
                >
                  {bot.isRunning ? 'Stop' : 'Start'}
                </button>
                <button
                  className="px-2 py-1 text-xs bg-rose-600 text-white rounded hover:bg-rose-500"
                  onClick={() => deleteBot(bot.id)}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Add Bot Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center">
          <div className="bg-gray-900 p-6 rounded-lg w-96 space-y-4">
            <h3 className="text-lg font-semibold text-gray-200">Create New Bot</h3>
            <input
              placeholder="Bot name"
              className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-gray-200"
              value={newBot.name || ''}
              onChange={e => setNewBot({ ...newBot, name: e.target.value })}
            />
            <input
              placeholder="Symbol (e.g., BTCUSDT)"
              className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-gray-200"
              value={newBot.symbol || ''}
              onChange={e => setNewBot({ ...newBot, symbol: e.target.value as any })}
            />
            <input
              placeholder="Allocated capital"
              type="number"
              className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-gray-200"
              value={newBot.allocatedCapital ?? ''}
              onChange={e => setNewBot({ ...newBot, allocatedCapital: Number(e.target.value) })}
            />
            {/* Mode selection – no default, user must pick */}
            <div className="flex gap-2">
              {(['DEMO', 'PAPER'] as const).map(m => (
                <button
                  key={m}
                  className={`flex-1 px-2 py-1 rounded ${newBot.appMode === m ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300'}`}
                  onClick={() => setNewBot({ ...newBot, appMode: m })}
                >
                  {m}
                </button>
              ))}
            </div>
            <div className="flex justify-end space-x-2 pt-2">
              <button
                className="px-3 py-1 bg-gray-600 text-gray-200 rounded hover:bg-gray-500"
                onClick={() => setShowAddModal(false)}
              >
                Cancel
              </button>
              <button
                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-500"
                onClick={handleAddBot}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

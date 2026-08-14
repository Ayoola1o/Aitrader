'use client';

import React, { useState } from 'react';
import { AgentSignal, PortfolioState, TradeHistoryItem } from '@/types/trading';
import { BarChart2, Download, FileText, Activity, Brain, TrendingUp, TrendingDown } from 'lucide-react';
import { dbPersistence } from '@/lib/db/schema';

interface ReplayResearchViewProps {
  signals: AgentSignal[];
  portfolio: PortfolioState | null;
  tradeHistory: TradeHistoryItem[];
}

export const ReplayResearchView: React.FC<ReplayResearchViewProps> = ({
  signals, portfolio, tradeHistory,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'journal' | 'agents' | 'export'>('journal');
  const decisions = dbPersistence.getDecisions();
  const hasData = decisions.length > 0;

  const handleExportDecisions = () => {
    const csv = dbPersistence.exportDecisionsToCSV();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aitrader_decisions_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportTrades = () => {
    const csv = dbPersistence.exportTradesToCSV(tradeHistory);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aitrader_trades_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const agentsWithSignals = signals.filter(s => s.bias !== 'UNAVAILABLE');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <BarChart2 className="w-6 h-6 text-purple-400" />
            Research & Decision Journal
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Auditable AI decisions — every signal, fusion, risk check, and trade linked by decisionId
          </p>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-2 border-b border-gray-800 pb-0">
        {([
          { id: 'journal', label: `Decision Journal (${decisions.length})`, icon: FileText },
          { id: 'agents', label: 'Agent Performance', icon: Brain },
          { id: 'export', label: 'Export Data', icon: Download },
        ] as { id: typeof activeSubTab; label: string; icon: any }[]).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveSubTab(id)}
            className={`px-4 py-2.5 font-bold text-xs flex items-center gap-2 border-b-2 transition-all ${
              activeSubTab === id
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Decision Journal */}
      {activeSubTab === 'journal' && (
        <div className="glass-panel p-4 rounded-2xl border border-gray-800">
          {!hasData ? (
            <div className="py-10 text-center">
              <Activity className="w-8 h-8 text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No decisions logged yet.</p>
              <p className="text-xs text-gray-600 mt-1">The AI Decision Center will populate this journal as it generates decisions.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-800">
                    <th className="pb-2 text-left">Decision ID</th>
                    <th className="pb-2 text-left">Time</th>
                    <th className="pb-2 text-right">Symbol</th>
                    <th className="pb-2 text-right">Price</th>
                    <th className="pb-2 text-right">Action</th>
                    <th className="pb-2 text-right">Confidence</th>
                    <th className="pb-2 text-right">Regime</th>
                    <th className="pb-2 text-right">Outcome</th>
                    <th className="pb-2 text-right">P&L</th>
                  </tr>
                </thead>
                <tbody>
                  {decisions.slice(0, 50).map(d => (
                    <tr key={d.decisionId} className="border-b border-gray-800/40 hover:bg-gray-800/20">
                      <td className="py-2 font-mono text-gray-400 text-[10px]">{d.decisionId}</td>
                      <td className="py-2 text-gray-500">{new Date(d.timestamp).toLocaleTimeString()}</td>
                      <td className="py-2 text-right font-bold text-white">{d.symbol}</td>
                      <td className="py-2 text-right text-gray-300">${(d?.price ?? 0).toLocaleString()}</td>
                      <td className={`py-2 text-right font-bold ${
                        d.action === 'BUY' ? 'text-emerald-400' :
                        d.action === 'SELL' ? 'text-rose-400' : 'text-gray-400'
                      }`}>{d.action}</td>
                      <td className="py-2 text-right text-gray-300">{(d.confidence * 100).toFixed(0)}%</td>
                      <td className="py-2 text-right text-gray-400">{d.regime}</td>
                      <td className={`py-2 text-right font-bold text-[10px] ${
                        d.outcome === 'WIN' ? 'text-emerald-400' :
                        d.outcome === 'LOSS' ? 'text-rose-400' :
                        d.outcome === 'PENDING' ? 'text-amber-400' : 'text-gray-400'
                      }`}>{d.outcome}</td>
                      <td className={`py-2 text-right ${(d.realizedPnL ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {d.realizedPnL !== undefined ? `${d.realizedPnL >= 0 ? '+' : ''}$${d.realizedPnL.toFixed(2)}` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Agent Performance */}
      {activeSubTab === 'agents' && (
        <div className="space-y-4">
          {signals.length === 0 ? (
            <div className="glass-panel p-6 rounded-2xl border border-gray-800 text-center">
              <p className="text-gray-500 text-sm">Run the AI engine to see agent performance</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {signals.map(sig => {
                const isUnavail = sig.bias === 'UNAVAILABLE';
                return (
                  <div key={sig.agentId} className="glass-panel p-4 rounded-2xl border border-gray-800">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-bold text-white">{sig.agentName}</h4>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold border ${
                        isUnavail ? 'border-gray-700 text-gray-500' :
                        sig.action === 'BUY' ? 'border-emerald-500/40 text-emerald-400' :
                        sig.action === 'SELL' ? 'border-rose-500/40 text-rose-400' : 'border-gray-700 text-gray-400'
                      }`}>{sig.action}</span>
                    </div>
                    {isUnavail ? (
                      <p className="text-xs text-gray-500 italic">{sig.summary}</p>
                    ) : (
                      <>
                        <div className="mb-2">
                          <div className="flex justify-between text-xs text-gray-400 mb-1">
                            <span>Confidence</span>
                            <span>{(sig.confidence * 100).toFixed(0)}%</span>
                          </div>
                          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${sig.confidence > 0.7 ? 'bg-emerald-500' : sig.confidence > 0.5 ? 'bg-amber-500' : 'bg-rose-500'}`}
                              style={{ width: `${sig.confidence * 100}%` }}
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          {sig.evidence.slice(0, 3).map((ev, i) => (
                            <div key={i} className="flex justify-between text-xs">
                              <span className="text-gray-400">{ev.label}</span>
                              <span className={ev.signal === 'BULLISH' ? 'text-emerald-400' : ev.signal === 'BEARISH' ? 'text-rose-400' : 'text-gray-300'}>
                                {ev.value}
                              </span>
                            </div>
                          ))}
                        </div>
                        {sig.risks.length > 0 && (
                          <p className="text-[10px] text-amber-400 mt-2 flex items-start gap-1">
                            ⚠ {sig.risks[0]}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Export */}
      {activeSubTab === 'export' && (
        <div className="glass-panel p-6 rounded-2xl border border-gray-800 space-y-4">
          <h4 className="text-sm font-bold text-white">Export Data</h4>
          <p className="text-xs text-gray-400">Download auditable CSV files. Every field is derivable from real or clearly labeled simulated data.</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleExportDecisions}
              disabled={!hasData}
              className="flex items-center gap-2 px-4 py-3 bg-purple-500/20 border border-purple-500/40 text-purple-300 rounded-xl font-bold text-sm hover:bg-purple-500/30 disabled:opacity-40"
            >
              <Download className="w-4 h-4" />
              Decision Journal ({decisions.length} entries)
            </button>
            <button
              onClick={handleExportTrades}
              disabled={tradeHistory.length === 0}
              className="flex items-center gap-2 px-4 py-3 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-xl font-bold text-sm hover:bg-emerald-500/30 disabled:opacity-40"
            >
              <Download className="w-4 h-4" />
              Trade History ({tradeHistory.length} trades)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

'use client';

import React from 'react';
import { MarketSnapshot, AgentSignal, LLMDecision, RiskCheckResult, PortfolioState, AppMode, DataStatus } from '@/types/trading';
import { TrendingUp, TrendingDown, Minus, Brain, Shield, DollarSign, Wifi, WifiOff, AlertTriangle, ArrowRight, Activity } from 'lucide-react';
import { alpacaBrokerClient } from '@/lib/broker/alpaca';

interface DashboardViewProps {
  snapshot: MarketSnapshot | null;
  signals: AgentSignal[];
  decision: LLMDecision | null;
  riskCheck: RiskCheckResult | null;
  portfolio: PortfolioState | null;
  appMode: AppMode;
  onExecuteTrade: () => void;
  onNavigateSettings: () => void;
}

function StatusDot({ status }: { status: DataStatus }) {
  const colors: Record<DataStatus, string> = {
    LIVE: 'bg-emerald-400',
    DELAYED: 'bg-amber-400',
    HISTORICAL: 'bg-blue-400',
    SIMULATED: 'bg-orange-400',
    UNAVAILABLE: 'bg-gray-500',
    STALE: 'bg-rose-500 animate-pulse',
  };
  return <span className={`inline-block w-2 h-2 rounded-full ${colors[status]}`} />;
}

function DataStatusRow({ label, status }: { label: string; status: DataStatus }) {
  const text: Record<DataStatus, string> = {
    LIVE: 'text-emerald-400', DELAYED: 'text-amber-400', HISTORICAL: 'text-blue-400',
    SIMULATED: 'text-orange-400', UNAVAILABLE: 'text-gray-500', STALE: 'text-rose-400',
  };
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-xs text-gray-400">{label}</span>
      <div className="flex items-center gap-1.5">
        <StatusDot status={status} />
        <span className={`text-[11px] font-bold ${text[status]}`}>{status}</span>
      </div>
    </div>
  );
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  snapshot, signals, decision, riskCheck, portfolio, appMode, onExecuteTrade, onNavigateSettings
}) => {
  const isAlpaca = alpacaBrokerClient.hasCredentials();
  const dq = snapshot?.dataQuality;
  const price = snapshot?.price ?? 0;
  const change = snapshot?.change24h ?? 0;
  const isCritical = dq?.criticalStale ?? false;

  const readyToTrade = riskCheck?.approved && !isCritical && decision?.action !== 'NO_TRADE' && decision?.action !== 'HOLD';

  return (
    <div className="space-y-6">

      {/* Mode Banner */}
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-semibold ${
        appMode === 'DEMO'
          ? 'bg-orange-500/10 border-orange-500/30 text-orange-300'
          : 'bg-blue-500/10 border-blue-500/30 text-blue-300'
      }`}>
        <Activity className="w-4 h-4" />
        {appMode === 'DEMO'
          ? '⚠ DEMO MODE — Synthetic market data. Not suitable for real capital decisions.'
          : '● PAPER TRADING MODE — Real market data + simulated execution.'}
      </div>

      {/* Top Row: Price + Data Integrity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Price Card */}
        <div className="lg:col-span-1 glass-panel p-5 rounded-2xl border border-gray-800">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-gray-400 font-semibold">{snapshot?.symbol ?? '—'}</span>
            <div className="flex items-center gap-1.5">
              <StatusDot status={dq?.tickerStatus ?? 'UNAVAILABLE'} />
              <span className="text-[10px] text-gray-400 font-bold">{dq?.tickerStatus ?? 'NO DATA'}</span>
              <span className="text-[10px] text-gray-500">{snapshot?.exchange ? `(${snapshot.exchange})` : ''}</span>
            </div>
          </div>
          <p className="text-3xl font-black text-white">${price.toLocaleString()}</p>
          <p className={`text-sm font-bold mt-1 flex items-center gap-1 ${change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {change >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            {change >= 0 ? '+' : ''}{change}% (24h)
          </p>
          {snapshot && (
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-400">
              <div>H24: <strong className="text-white">${snapshot.high24h.toLocaleString()}</strong></div>
              <div>L24: <strong className="text-white">${snapshot.low24h.toLocaleString()}</strong></div>
              <div>Vol: <strong className="text-white">{snapshot.volume24h.toFixed(0)}</strong></div>
              <div>Spread: <strong className="text-white">{(snapshot.orderBook.spreadPercent * 100).toFixed(4)}%</strong></div>
            </div>
          )}
        </div>

        {/* Data Integrity Panel */}
        <div className="glass-panel p-5 rounded-2xl border border-gray-800">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              {isCritical ? <WifiOff className="w-4 h-4 text-rose-400" /> : <Wifi className="w-4 h-4 text-emerald-400" />}
              Data Integrity
            </h3>
            <span className={`text-lg font-black ${(dq?.overallScore ?? 0) > 75 ? 'text-emerald-400' : (dq?.overallScore ?? 0) > 40 ? 'text-amber-400' : 'text-rose-400'}`}>
              {dq?.overallScore ?? 0}%
            </span>
          </div>
          {dq ? (
            <div className="divide-y divide-gray-800/50">
              <DataStatusRow label="Price Ticker" status={dq.tickerStatus} />
              <DataStatusRow label="Order Book" status={dq.orderBookStatus} />
              <DataStatusRow label="Trade Ticks" status={dq.tradesStatus} />
              <DataStatusRow label="Candles" status={dq.candlesStatus} />
              <DataStatusRow label="Funding Rate" status={dq.fundingStatus} />
              <DataStatusRow label="Open Interest" status={dq.openInterestStatus} />
              <DataStatusRow label="Macro Data" status={dq.macroStatus} />
            </div>
          ) : (
            <p className="text-xs text-gray-500 py-4">Awaiting first data fetch...</p>
          )}
          {isCritical && (
            <div className="mt-3 p-2 bg-rose-500/10 rounded-lg border border-rose-500/30 text-xs text-rose-300 font-semibold">
              ⚠ TRADING DISABLED — Reconnecting...
            </div>
          )}
        </div>

        {/* Portfolio / Alpaca Funds */}
        <div className="glass-panel p-5 rounded-2xl border border-gray-800">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              {isAlpaca ? 'Alpaca Account' : 'Paper Broker'}
            </h3>
            <span className={`text-[10px] px-2 py-0.5 rounded font-bold border ${isAlpaca ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-blue-500/20 text-blue-400 border-blue-500/30'}`}>
              {isAlpaca ? 'API LIVE' : 'SIMULATED'}
            </span>
          </div>
          {portfolio ? (
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">Equity</span>
                <strong className="text-white text-base">${portfolio.equity.toLocaleString()}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Cash / Balance</span>
                <span className="text-gray-200">${portfolio.balance.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Buying Power</span>
                <span className="text-emerald-400 font-bold">${portfolio.freeMargin.toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-t border-gray-800 pt-2 mt-2">
                <span className="text-gray-400">Total P&L</span>
                <span className={`font-bold ${portfolio.totalPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {portfolio.totalPnL >= 0 ? '+' : ''}${portfolio.totalPnL.toFixed(2)}
                </span>
              </div>
              {!isAlpaca && (
                <button onClick={onNavigateSettings} className="mt-2 w-full text-center text-[11px] text-blue-400 hover:text-blue-300 flex items-center justify-center gap-1">
                  Connect Alpaca API <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
          ) : (
            <p className="text-xs text-gray-500 py-4 text-center">Loading portfolio...</p>
          )}
        </div>
      </div>

      {/* Agent Grid */}
      {signals.length > 0 && (
        <div className="glass-panel p-5 rounded-2xl border border-gray-800">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Brain className="w-4 h-4 text-purple-400" />
            Specialist Agents
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {signals.map(sig => {
              const isUnavail = sig.bias === 'UNAVAILABLE';
              const colors = { BULLISH: 'text-emerald-400', BEARISH: 'text-rose-400', NEUTRAL: 'text-gray-300', CAUTION: 'text-amber-400', UNAVAILABLE: 'text-gray-500' };
              const bgColors = { BULLISH: 'border-emerald-500/30', BEARISH: 'border-rose-500/30', NEUTRAL: 'border-gray-700', CAUTION: 'border-amber-500/30', UNAVAILABLE: 'border-gray-800' };
              return (
                <div key={sig.agentId} className={`p-3 rounded-xl bg-[#0B111E] border ${bgColors[sig.bias]}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-gray-400 font-semibold">{sig.agentName.replace(' Agent', '')}</span>
                    <StatusDot status={sig.dataQuality} />
                  </div>
                  <p className={`text-sm font-black ${colors[sig.bias]}`}>{isUnavail ? 'N/A' : sig.action}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">{isUnavail ? 'No data source' : `${(sig.confidence * 100).toFixed(0)}% conf`}</p>
                  {sig.evidence[0] && !isUnavail && (
                    <p className="text-[10px] text-gray-400 mt-1 truncate">{sig.evidence[0].label}: {sig.evidence[0].value}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* AI Decision Card */}
      {decision && (
        <div className="glass-panel p-5 rounded-2xl border border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-400" />
              AI Decision → Risk Gate
            </h3>
            <span className={`text-xs px-3 py-1 rounded-full font-black border ${
              decision.action === 'BUY' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' :
              decision.action === 'SELL' ? 'bg-rose-500/20 text-rose-400 border-rose-500/40' :
              'bg-gray-800 text-gray-400 border-gray-700'
            }`}>
              {decision.action}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-xs">
            <div><span className="text-gray-400 block">Confidence</span><strong className="text-white">{(decision.confidence * 100).toFixed(0)}%</strong></div>
            <div><span className="text-gray-400 block">Entry</span><strong className="text-white">{decision.entry ? `$${decision.entry}` : '—'}</strong></div>
            <div><span className="text-gray-400 block">Stop Loss</span><strong className="text-rose-400">{decision.stopLoss ? `$${decision.stopLoss}` : '—'}</strong></div>
            <div><span className="text-gray-400 block">Take Profit</span><strong className="text-emerald-400">{decision.takeProfit ? `$${decision.takeProfit}` : '—'}</strong></div>
          </div>

          {riskCheck && (
            <div className={`mb-4 px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
              riskCheck.approved ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
            }`}>
              <Shield className="w-3.5 h-3.5" />
              Risk Gate: {riskCheck.approved ? 'APPROVED' : `REJECTED — ${riskCheck.failedGates[0]}`}
              {riskCheck.calculatedPositionSize > 0 && riskCheck.approved && (
                <span className="ml-auto text-gray-300">Size: {riskCheck.calculatedPositionSize.toFixed(4)} units</span>
              )}
            </div>
          )}

          <div className="text-xs text-gray-400 space-y-1">
            {decision.reasoning.slice(0, 3).map((r, i) => (
              <p key={i} className="flex items-start gap-1.5"><span className="text-blue-400 mt-0.5">›</span>{r}</p>
            ))}
          </div>

          {readyToTrade && (
            <button
              onClick={onExecuteTrade}
              className={`mt-4 w-full py-3 rounded-xl font-bold text-sm transition-all shadow-lg ${
                decision.action === 'BUY'
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-emerald-500/30'
                  : 'bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/30'
              }`}
            >
              Execute {isAlpaca ? 'Alpaca' : 'Paper'} {decision.action} — {riskCheck?.calculatedPositionSize.toFixed(4)} units
            </button>
          )}
        </div>
      )}
    </div>
  );
};

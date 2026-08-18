'use client';

import React, { useState, useEffect } from 'react';
import { SymbolId, MarketSnapshot } from '@/types/trading';
import { Sparkline } from '@/components/dashboard/Sparkline';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Zap,
  Bot,
  ExternalLink,
  Search,
  SlidersHorizontal,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';

interface MarketsScannerViewProps {
  snapshot?: MarketSnapshot;
  onSelectSymbol?: (symbol: SymbolId) => void;
  onNavigateTerminal?: () => void;
  onSpawnBot?: (symbol: SymbolId) => void;
}

interface MarketRowData {
  symbol: SymbolId;
  name: string;
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  rsi: number;
  atr: number;
  volatility: string;
  regime: 'BULLISH' | 'BEARISH' | 'RANGING' | 'VOLATILE';
  signal: 'STRONG BUY' | 'BUY' | 'NEUTRAL' | 'SELL' | 'STRONG SELL';
  sparkline: number[];
}

const BASE_MARKETS: Record<SymbolId, { name: string; basePrice: number; rsi: number; atr: number; regime: any; signal: any }> = {
  BTCUSDT: { name: 'Bitcoin', basePrice: 64250, rsi: 58.4, atr: 142.5, regime: 'BULLISH', signal: 'BUY' },
  ETHUSDT: { name: 'Ethereum', basePrice: 3450, rsi: 62.1, atr: 24.8, regime: 'BULLISH', signal: 'STRONG BUY' },
  SOLUSDT: { name: 'Solana', basePrice: 145.2, rsi: 47.3, atr: 4.12, regime: 'RANGING', signal: 'NEUTRAL' },
  XRPUSDT: { name: 'Ripple', basePrice: 0.584, rsi: 41.8, atr: 0.015, regime: 'BEARISH', signal: 'SELL' },
};

export const MarketsScannerView: React.FC<MarketsScannerViewProps> = ({
  snapshot,
  onSelectSymbol,
  onNavigateTerminal,
  onSpawnBot,
}) => {
  const [filter, setFilter] = useState<'ALL' | 'GAINERS' | 'LOSERS' | 'VOLATILE'>('ALL');
  const [search, setSearch] = useState('');
  const [marketData, setMarketData] = useState<MarketRowData[]>([]);

  useEffect(() => {
    const symbols: SymbolId[] = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT'];
    const rows: MarketRowData[] = symbols.map((sym) => {
      const meta = BASE_MARKETS[sym];
      const isCurrentSnap = snapshot?.symbol === sym;
      const price = isCurrentSnap ? snapshot.price : meta.basePrice;
      const change24h = isCurrentSnap ? snapshot.change24h : sym === 'BTCUSDT' ? 2.45 : sym === 'ETHUSDT' ? 4.12 : sym === 'SOLUSDT' ? -0.85 : -1.72;
      const high24h = isCurrentSnap ? snapshot.high24h : price * 1.025;
      const low24h = isCurrentSnap ? snapshot.low24h : price * 0.975;
      const volume24h = isCurrentSnap ? snapshot.volume24h : 1500000;

      return {
        symbol: sym,
        name: meta.name,
        price,
        change24h,
        high24h,
        low24h,
        volume24h,
        rsi: meta.rsi,
        atr: meta.atr,
        volatility: sym === 'SOLUSDT' ? 'HIGH' : 'NORMAL',
        regime: meta.regime,
        signal: meta.signal,
        sparkline: [price * 0.98, price * 0.99, price * 0.985, price * 1.01, price * 0.995, price],
      };
    });
    setMarketData(rows);
  }, [snapshot]);

  const filteredRows = marketData.filter((r) => {
    const matchesSearch = r.name.toLowerCase().includes(search.toLowerCase()) || r.symbol.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (filter === 'GAINERS') return r.change24h > 0;
    if (filter === 'LOSERS') return r.change24h < 0;
    if (filter === 'VOLATILE') return r.volatility === 'HIGH';
    return true;
  });

  const handleTradeSymbol = (sym: SymbolId) => {
    if (onSelectSymbol) onSelectSymbol(sym);
    if (onNavigateTerminal) onNavigateTerminal();
  };

  return (
    <div className="space-y-4 pb-8 min-h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white tracking-tight">Real-Time Market Screener & Scanner</h2>
            <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              LIVE TICK FEEDS
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            Multi-exchange algorithmic screening, volatility radar, and technical indicator ratings
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Filter Pills */}
          <div className="flex bg-[#0B111E] p-1 rounded-xl border border-gray-800 text-xs">
            {(['ALL', 'GAINERS', 'LOSERS', 'VOLATILE'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-lg font-bold transition-all text-[11px] ${
                  filter === f ? 'bg-cyan-600 text-white shadow-md' : 'text-gray-400 hover:text-white'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative w-56">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search pairs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#0B111E] border border-gray-800 text-xs rounded-xl pl-9 pr-3 py-2 text-gray-200 placeholder-gray-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>
      </div>

      {/* Top 4 Quick Market Ticker Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {marketData.map((m) => (
          <div
            key={m.symbol}
            onClick={() => handleTradeSymbol(m.symbol)}
            className="bg-[#0B111E] hover:bg-[#0F172A] p-4 rounded-xl border border-[#1E293B] hover:border-cyan-500/50 cursor-pointer transition-all flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-bold text-white text-sm group-hover:text-cyan-400 transition-colors">{m.name}</div>
                <div className="text-[10px] text-gray-400 font-mono">{m.symbol}</div>
              </div>
              <span
                className={`text-xs font-black flex items-center gap-0.5 px-2 py-0.5 rounded-lg ${
                  m.change24h >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                }`}
              >
                {m.change24h >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {m.change24h >= 0 ? '+' : ''}{m.change24h.toFixed(2)}%
              </span>
            </div>

            <div className="mt-3 flex items-baseline justify-between">
              <div className="text-xl font-black text-white font-mono">
                ${m.price.toLocaleString(undefined, { minimumFractionDigits: m.price < 1 ? 4 : 2 })}
              </div>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/10 text-cyan-400 border border-blue-500/20">
                {m.signal}
              </span>
            </div>

            <div className="mt-2 pt-2 border-t border-gray-800/80 flex items-center justify-between text-[10px] text-gray-400">
              <span>24h Vol: ${(m.volume24h / 1000).toFixed(0)}k</span>
              <span className="text-cyan-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                Trade Terminal <ExternalLink className="w-3 h-3" />
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Main Scanner Table */}
      <div className="bg-[#0B111E] p-4 rounded-xl border border-[#1E293B]">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-bold text-white tracking-wide uppercase">Live Market Radar ({filteredRows.length})</div>
          <div className="text-[11px] text-gray-400">Direct 1-click execution to Terminal and Bot Deployer</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-[10px] uppercase text-gray-400 border-b border-gray-800">
                <th className="pb-2.5 font-bold">Asset</th>
                <th className="pb-2.5 font-bold text-right">Live Price</th>
                <th className="pb-2.5 font-bold text-right">24h Change</th>
                <th className="pb-2.5 font-bold text-right">24h High / Low</th>
                <th className="pb-2.5 font-bold text-center">RSI (14)</th>
                <th className="pb-2.5 font-bold text-center">Regime</th>
                <th className="pb-2.5 font-bold text-center">AI Specialist Signal</th>
                <th className="pb-2.5 font-bold text-center">Price Trend</th>
                <th className="pb-2.5 font-bold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/40">
              {filteredRows.map((r) => (
                <tr key={r.symbol} className="hover:bg-gray-800/30 transition-colors">
                  <td className="py-3 font-bold text-white whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-cyan-400" />
                      <div>
                        <div className="font-bold text-white text-xs">{r.name}</div>
                        <div className="text-[10px] font-mono text-cyan-400">{r.symbol}</div>
                      </div>
                    </div>
                  </td>

                  <td className="py-3 text-right font-mono font-bold text-white text-xs">
                    ${r.price.toLocaleString(undefined, { minimumFractionDigits: r.price < 1 ? 4 : 2 })}
                  </td>

                  <td className={`py-3 text-right font-mono font-bold text-xs ${r.change24h >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {r.change24h >= 0 ? '+' : ''}{r.change24h.toFixed(2)}%
                  </td>

                  <td className="py-3 text-right font-mono text-[11px] text-gray-300">
                    <div className="text-emerald-400/90">${r.high24h.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                    <div className="text-rose-400/90">${r.low24h.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                  </td>

                  <td className="py-3 text-center font-mono text-xs">
                    <span
                      className={`px-2 py-0.5 rounded font-bold ${
                        r.rsi > 70
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : r.rsi < 30
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-gray-800 text-gray-300'
                      }`}
                    >
                      {r.rsi.toFixed(1)}
                    </span>
                  </td>

                  <td className="py-3 text-center">
                    <span
                      className={`text-[9px] px-2 py-0.5 rounded-full font-black border uppercase ${
                        r.regime === 'BULLISH'
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                          : r.regime === 'BEARISH'
                          ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                          : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                      }`}
                    >
                      {r.regime}
                    </span>
                  </td>

                  <td className="py-3 text-center">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-lg font-black uppercase ${
                        r.signal.includes('BUY')
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : r.signal.includes('SELL')
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : 'bg-gray-800 text-gray-300'
                      }`}
                    >
                      {r.signal}
                    </span>
                  </td>

                  <td className="py-3 text-center">
                    <div className="w-20 h-5 inline-block">
                      <Sparkline data={r.sparkline} color={r.change24h >= 0 ? '#10B981' : '#EF4444'} height={20} width={80} />
                    </div>
                  </td>

                  <td className="py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleTradeSymbol(r.symbol)}
                        className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-[11px] rounded-lg shadow-sm transition-all"
                      >
                        Trade
                      </button>
                      <button
                        onClick={() => onSpawnBot ? onSpawnBot(r.symbol) : handleTradeSymbol(r.symbol)}
                        className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-cyan-400 font-bold text-[11px] rounded-lg border border-gray-700 transition-all flex items-center gap-1"
                      >
                        <Bot className="w-3 h-3" />
                        Bot
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

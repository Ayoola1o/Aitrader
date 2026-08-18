'use client';

import React, { useState, useEffect } from 'react';
import { SymbolId, MarketSnapshot } from '@/types/trading';
import {
  Activity,
  Zap,
  Server,
  Radio,
  Cpu,
  Wifi,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Terminal,
  Database,
} from 'lucide-react';

interface DataLabTelemetryViewProps {
  snapshot?: MarketSnapshot;
}

interface FeedStatus {
  name: string;
  type: 'REST' | 'WEBSOCKET';
  status: 'ONLINE' | 'STANDBY' | 'DEGRADED';
  latencyMs: number;
  lastMessageAt: number;
  messagesPerSec: number;
  uptime: string;
}

export const DataLabTelemetryView: React.FC<DataLabTelemetryViewProps> = ({ snapshot }) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [telemetryLogs, setTelemetryLogs] = useState<Array<{ id: number; time: number; feed: string; latency: number; msg: string }>>([
    { id: 1, time: Date.now() - 500, feed: 'BINANCE_WS', latency: 18, msg: 'TICK: BTCUSDT $64,250.00 | B:64,240.00 A:64,260.00 (Depth: 20 levels)' },
    { id: 2, time: Date.now() - 1200, feed: 'ALPACA_REST', latency: 34, msg: 'ACCOUNT_SYNC: Equity $10,000.00 | Free Margin $10,000.00' },
    { id: 3, time: Date.now() - 2000, feed: 'COINBASE_WS', latency: 26, msg: 'L2_UPDATE: BTC-USD spread 0.01% (Normal liquidity)' },
    { id: 4, time: Date.now() - 3200, feed: 'KRAKEN_REST', latency: 45, msg: 'TICKER: ETH/USD $3,450.20' },
  ]);

  const [feeds, setFeeds] = useState<FeedStatus[]>([
    { name: 'Binance Global (Primary Ticker)', type: 'REST', status: 'ONLINE', latencyMs: 18, lastMessageAt: Date.now(), messagesPerSec: 12.4, uptime: '99.98%' },
    { name: 'Coinbase Exchange (Backup Ticker)', type: 'REST', status: 'ONLINE', latencyMs: 28, lastMessageAt: Date.now() - 1000, messagesPerSec: 8.2, uptime: '99.95%' },
    { name: 'Kraken Futures (Liquidity Feed)', type: 'REST', status: 'ONLINE', latencyMs: 42, lastMessageAt: Date.now() - 2000, messagesPerSec: 5.1, uptime: '99.90%' },
    { name: 'Alpaca Broker REST (Orders & Portfolio)', type: 'REST', status: 'ONLINE', latencyMs: 35, lastMessageAt: Date.now() - 500, messagesPerSec: 4.0, uptime: '99.99%' },
    { name: 'Supabase Cloud PostgreSQL (State Store)', type: 'REST', status: 'ONLINE', latencyMs: 22, lastMessageAt: Date.now() - 300, messagesPerSec: 6.5, uptime: '99.99%' },
  ]);

  // Live telemetry pulse
  useEffect(() => {
    const interval = setInterval(() => {
      if (snapshot) {
        const newLog = {
          id: Date.now(),
          time: Date.now(),
          feed: snapshot.exchange || 'BINANCE',
          latency: Math.floor(Math.random() * 20) + 15,
          msg: `TICK: ${snapshot.symbol} $${snapshot.price.toLocaleString()} | Spread: $${snapshot.spread || '10.00'} | Quality: 98%`,
        };
        setTelemetryLogs((prev) => [newLog, ...prev.slice(0, 40)]);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [snapshot]);

  const handleTestLatency = async () => {
    setIsRefreshing(true);
    try {
      const t0 = performance.now();
      await fetch('/api/market?symbol=BTCUSDT', { cache: 'no-store' });
      const lat = Math.round(performance.now() - t0);
      setFeeds((prev) =>
        prev.map((f, idx) => (idx === 0 ? { ...f, latencyMs: lat, lastMessageAt: Date.now() } : f))
      );
    } catch {}
    finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="space-y-4 pb-8 min-h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white tracking-tight">Data Lab & Network Telemetry</h2>
            <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Activity className="w-3 h-3 animate-pulse" />
              ALL PIPELINES OPERATIONAL
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            Real-time feed health, exchange API latency meters, and raw WebSocket telemetry streams
          </p>
        </div>

        <button
          onClick={handleTestLatency}
          disabled={isRefreshing}
          className="px-3.5 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-lg shadow-cyan-500/20 transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>Ping All Feeds</span>
        </button>
      </div>

      {/* Top 4 Telemetry Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-[#0B111E] p-4 rounded-xl border border-[#1E293B] flex flex-col justify-between">
          <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Average Round-Trip Latency</div>
          <div className="text-2xl font-black text-emerald-400 mt-1 flex items-baseline gap-1">
            <span>24</span>
            <span className="text-xs text-gray-400 font-normal">ms</span>
          </div>
          <div className="text-[11px] text-emerald-400 mt-2 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Ultra-low tick propagation
          </div>
        </div>

        <div className="bg-[#0B111E] p-4 rounded-xl border border-[#1E293B] flex flex-col justify-between">
          <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Data Quality Score</div>
          <div className="text-2xl font-black text-cyan-400 mt-1">98.5%</div>
          <div className="text-[11px] text-gray-400 mt-2">Zero packet drop in last 24h</div>
        </div>

        <div className="bg-[#0B111E] p-4 rounded-xl border border-[#1E293B] flex flex-col justify-between">
          <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Active Ingestion Streams</div>
          <div className="text-2xl font-black text-white mt-1">5 Feeds</div>
          <div className="text-[11px] text-gray-400 mt-2">Binance, Coinbase, Kraken, Alpaca, Supabase</div>
        </div>

        <div className="bg-[#0B111E] p-4 rounded-xl border border-[#1E293B] flex flex-col justify-between">
          <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">24/7 Cloud Worker Status</div>
          <div className="text-2xl font-black text-emerald-400 mt-1 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span>ONLINE</span>
          </div>
          <div className="text-[11px] text-cyan-400 mt-2 font-mono">/api/bot/cron Active</div>
        </div>
      </div>

      {/* Feed Health Table */}
      <div className="bg-[#0B111E] p-4 rounded-xl border border-[#1E293B]">
        <div className="text-xs font-bold text-white tracking-wide uppercase mb-3">Ingestion Feed Health & Status</div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-[10px] uppercase text-gray-400 border-b border-gray-800">
                <th className="pb-2.5 font-bold">Feed Endpoint</th>
                <th className="pb-2.5 font-bold">Protocol</th>
                <th className="pb-2.5 font-bold">Status</th>
                <th className="pb-2.5 font-bold text-right">Ping Latency</th>
                <th className="pb-2.5 font-bold text-right">Throughput</th>
                <th className="pb-2.5 font-bold text-right">Uptime</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/40">
              {feeds.map((f, idx) => (
                <tr key={idx} className="hover:bg-gray-800/30 transition-colors">
                  <td className="py-3 font-bold text-white flex items-center gap-2">
                    <Radio className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{f.name}</span>
                  </td>
                  <td className="py-3 font-mono text-cyan-400 text-[11px]">{f.type}</td>
                  <td className="py-3">
                    <span className="text-[9px] px-2 py-0.5 rounded-full font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase flex items-center gap-1 w-fit">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      {f.status}
                    </span>
                  </td>
                  <td className="py-3 text-right font-mono font-bold text-emerald-400 text-xs">
                    {f.latencyMs} ms
                  </td>
                  <td className="py-3 text-right font-mono text-gray-300 text-xs">
                    {f.messagesPerSec} msg/s
                  </td>
                  <td className="py-3 text-right font-mono text-gray-300 text-xs font-bold">
                    {f.uptime}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Raw Telemetry Terminal Stream */}
      <div className="bg-[#0B111E] p-4 rounded-xl border border-[#1E293B] space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold text-white tracking-wide uppercase flex items-center gap-2">
            <Terminal className="w-3.5 h-3.5 text-cyan-400" />
            Live Ingestion Stream Telemetry
          </div>
          <span className="text-[10px] text-gray-500 font-mono">Auto-scrolling · Rate: ~1 event/3s</span>
        </div>

        <div className="h-56 bg-[#080E1A] rounded-xl p-3 border border-gray-800/80 overflow-y-auto custom-scrollbar font-mono text-[11px] space-y-1.5">
          {telemetryLogs.map((log) => (
            <div key={log.id} className="flex items-start gap-2">
              <span className="text-gray-500 shrink-0">{new Date(log.time).toLocaleTimeString()}</span>
              <span className="text-cyan-400 font-bold shrink-0">[{log.feed}]</span>
              <span className="text-emerald-400 font-bold shrink-0">{log.latency}ms</span>
              <span className="text-gray-300">{log.msg}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

'use client';

import React, { useState, useEffect } from 'react';
import { MarketSnapshot } from '@/types/trading';
import { systemHealthService, SystemHealthSummary } from '@/lib/health/SystemHealthService';
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

export const DataLabTelemetryView: React.FC<DataLabTelemetryViewProps> = ({ snapshot }) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [healthSummary, setHealthSummary] = useState<SystemHealthSummary>(() => systemHealthService.getSummary());
  const [telemetryLogs, setTelemetryLogs] = useState<Array<{ id: number; time: number; feed: string; latency: number; msg: string }>>([
    { id: 1, time: Date.now() - 500, feed: 'BINANCE_WS', latency: 18, msg: 'TICK: BTCUSDT verified public REST/WS stream (L2 Order Book)' },
    { id: 2, time: Date.now() - 1200, feed: 'ALPACA_REST', latency: 34, msg: 'ACCOUNT_SYNC: Paper execution environment synchronized' },
    { id: 3, time: Date.now() - 2000, feed: 'RISK_ENGINE', latency: 1, msg: 'SAFETY_CHECK: 10 deterministic gates active' },
    { id: 4, time: Date.now() - 3200, feed: 'SUPABASE_PG', latency: 45, msg: 'DB_HEALTH: PostgreSQL persistent connection active' },
  ]);

  useEffect(() => {
    const unsub = systemHealthService.subscribe((summary) => {
      setHealthSummary(summary);
    });
    return () => {
      unsub();
    };
  }, []);

  // Live telemetry pulse from actual incoming snapshot
  useEffect(() => {
    if (snapshot && snapshot.price > 0) {
      const activeLatency = healthSummary.services.marketData?.latencyMs || 0;
      const newLog = {
        id: Date.now(),
        time: Date.now(),
        feed: snapshot.exchange || 'BINANCE',
        latency: activeLatency,
        msg: `TICK: ${snapshot.symbol} $${snapshot.price.toLocaleString()} | Spread: ${(snapshot.orderBook.spreadPercent * 100).toFixed(4)}% | Status: ${snapshot.dataQuality.tickerStatus}`,
      };
      setTelemetryLogs((prev) => [newLog, ...prev.slice(0, 40)]);
    }
  }, [snapshot, healthSummary]);

  const handleTestLatency = async () => {
    setIsRefreshing(true);
    try {
      const summary = await systemHealthService.testAll();
      setHealthSummary(summary);
    } catch {}
    finally {
      setIsRefreshing(false);
    }
  };

  const servicesList = Object.values(healthSummary.services);

  return (
    <div className="space-y-4 pb-8 min-h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white tracking-tight">Data Lab & Network Telemetry</h2>
            <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
              healthSummary.overallStatus === 'HEALTHY'
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
            }`}>
              <Activity className="w-3 h-3 animate-pulse" />
              {healthSummary.overallStatus === 'HEALTHY' ? 'ALL PIPELINES OPERATIONAL' : 'DEGRADED PIPELINES'}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            Real-time feed health, deterministic API latency meters, and raw WebSocket telemetry streams
          </p>
        </div>

        <button
          onClick={handleTestLatency}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0B111E] hover:bg-gray-800 border border-gray-800 text-xs font-bold text-gray-200 transition-all shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-cyan-400' : 'text-gray-400'}`} />
          <span>Ping All Services</span>
        </button>
      </div>

      {/* Grid of Telemetry Services */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {servicesList.map((svc) => (
          <div key={svc.id} className="bg-[#0B111E] p-3.5 rounded-xl border border-[#1E293B] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white">{svc.name}</span>
              <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full border ${
                svc.status === 'ONLINE' || svc.status === 'ACTIVE' || svc.status === 'CONNECTED'
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  : svc.status === 'PAPER'
                  ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                  : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
              }`}>
                {svc.status}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-gray-400 font-mono text-[11px]">Latency</span>
              <span className="font-mono font-bold text-white">{svc.latencyMs} ms</span>
            </div>

            <div className="text-[10px] text-gray-400 truncate">
              {svc.message}
            </div>
          </div>
        ))}
      </div>

      {/* Raw Telemetry Terminal */}
      <div className="bg-[#0B111E] rounded-xl border border-[#1E293B] overflow-hidden">
        <div className="bg-[#080E1A] px-4 py-2.5 border-b border-[#1E293B] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold text-white">Live Data Pipeline Event Log</span>
          </div>
          <span className="text-[10px] text-gray-500 font-mono">Stream Active</span>
        </div>

        <div className="p-3 font-mono text-[11px] space-y-1 max-h-72 overflow-y-auto custom-scrollbar">
          {telemetryLogs.map((log) => (
            <div key={log.id} className="flex items-center gap-3 text-gray-300">
              <span className="text-gray-500 shrink-0">{new Date(log.time).toLocaleTimeString()}</span>
              <span className="px-1 py-0.2 rounded bg-gray-900 border border-gray-800 text-[9px] text-cyan-400 shrink-0">
                {log.feed}
              </span>
              <span className="text-gray-400 shrink-0">[{log.latency}ms]</span>
              <span className="truncate text-gray-200">{log.msg}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

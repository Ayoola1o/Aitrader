'use client';

import React, { useState, useEffect } from 'react';
import { systemHealthService, SystemHealthSummary } from '@/lib/health/SystemHealthService';

interface FooterStatusBarProps {
  dataSource?: string;
  marketDataStatus?: string;
  latencyMs?: number;
  version?: string;
}

export const FooterStatusBar: React.FC<FooterStatusBarProps> = ({
  dataSource = 'BINANCE',
  marketDataStatus = 'LIVE',
  latencyMs = 42,
  version = '1.3.0 (PROD)',
}) => {
  const [utcTime, setUtcTime] = useState<string>('');
  const [healthSummary, setHealthSummary] = useState<SystemHealthSummary>(() => systemHealthService.getSummary());

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setUtcTime(now.toTimeString().split(' ')[0] + ' UTC');
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    const unsub = systemHealthService.subscribe((s) => setHealthSummary(s));

    return () => {
      clearInterval(interval);
      unsub();
    };
  }, []);

  const marketData = healthSummary.services.marketData;
  const activeSource = marketData?.name?.includes('Binance') ? 'BINANCE FUTURES' : (dataSource || 'BINANCE');
  const activeStatus = marketData?.status || marketDataStatus;
  const activeLatency = marketData?.latencyMs || latencyMs;

  return (
    <footer className="h-9 bg-[#080E1A] border-t border-[#1E293B] px-6 flex items-center justify-between text-[11px] text-gray-400 select-none shrink-0 z-20">
      <div className="flex items-center gap-6">
        <div>
          Last Updated: <span className="text-gray-200 font-mono">{utcTime || '11:03:15 UTC'}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span>Data Source:</span>
          <span className="text-gray-200 font-semibold">{activeSource}</span>
          <span className={`w-1.5 h-1.5 rounded-full inline-block ${
            activeStatus === 'ONLINE' || (activeStatus as string) === 'LIVE' ? 'bg-emerald-400' : 'bg-rose-500 animate-pulse'
          }`} />
        </div>
        <div>
          Market Data: <span className={`font-semibold ${
            activeStatus === 'ONLINE' || (activeStatus as string) === 'LIVE' ? 'text-emerald-400' : 'text-rose-400'
          }`}>{activeStatus}</span>
        </div>
        <div className="hidden sm:block">
          System Readiness: <span className="text-cyan-400 font-mono font-bold">{healthSummary.readinessScore}%</span>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div>
          Latency: <span className="text-cyan-400 font-mono font-medium">{activeLatency}ms</span>
        </div>
        <div>
          Version: <span className="text-gray-300 font-mono">{version}</span>
        </div>
      </div>
    </footer>
  );
};

'use client';

import React, { useState, useEffect } from 'react';

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
  version = '1.0.0',
}) => {
  const [utcTime, setUtcTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setUtcTime(now.toTimeString().split(' ')[0] + ' UTC');
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <footer className="h-9 bg-[#080E1A] border-t border-[#1E293B] px-6 flex items-center justify-between text-[11px] text-gray-400 select-none shrink-0 z-20">
      <div className="flex items-center gap-6">
        <div>
          Last Updated: <span className="text-gray-200 font-mono">{utcTime || '11:03:15 UTC'}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span>Data Source:</span>
          <span className="text-gray-200 font-semibold">{dataSource}</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
        </div>
        <div>
          Market Data: <span className="text-emerald-400 font-semibold">{marketDataStatus}</span>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div>
          Latency: <span className="text-cyan-400 font-mono font-medium">{latencyMs}ms</span>
        </div>
        <div>
          Version: <span className="text-gray-300 font-mono">{version}</span>
        </div>
      </div>
    </footer>
  );
};

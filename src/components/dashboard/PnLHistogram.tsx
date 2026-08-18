'use client';

import React from 'react';

export interface PnLBin {
  label: string;
  count: number;
  type: 'loss' | 'neutral' | 'win';
}

interface PnLHistogramProps {
  bins?: PnLBin[];
  totalTrades?: number;
}

const DEFAULT_BINS: PnLBin[] = [
  { label: '<-2R', count: 1, type: 'loss' },
  { label: '-2R to -1R', count: 2, type: 'loss' },
  { label: '-1R to 0', count: 1, type: 'loss' },
  { label: '0 to 1R', count: 3, type: 'neutral' },
  { label: '0 to 1R', count: 7, type: 'win' },
  { label: '1R to 2R', count: 11, type: 'win' },
  { label: '2R to 3R', count: 5, type: 'win' },
  { label: '>3R', count: 3, type: 'win' },
];

export const PnLHistogram: React.FC<PnLHistogramProps> = ({
  bins = [
    { label: '<-2R', count: 1, type: 'loss' },
    { label: '-2R to -1R', count: 2, type: 'loss' },
    { label: '-1R to 0', count: 1, type: 'loss' },
    { label: '0 to 1R', count: 3, type: 'neutral' },
    { label: '0 to 1R', count: 7, type: 'win' },
    { label: '1R to 2R', count: 11, type: 'win' },
    { label: '2R to 3R', count: 5, type: 'win' },
    { label: '>3R', count: 3, type: 'win' },
  ],
  totalTrades = 37,
}) => {
  const maxCount = 12; // Maximum scale count as per mockup
  const yTicks = [12, 8, 6, 4, 2, 0];

  const getColor = (type: 'loss' | 'neutral' | 'win') => {
    switch (type) {
      case 'loss':
        return 'bg-red-500/80 hover:bg-red-400 border border-red-500/40';
      case 'neutral':
        return 'bg-slate-500/80 hover:bg-slate-400 border border-slate-500/40';
      case 'win':
        return 'bg-emerald-500 hover:bg-emerald-400 border border-emerald-500/40 shadow-sm shadow-emerald-500/20';
    }
  };

  return (
    <div className="flex flex-col h-full justify-between">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="font-bold text-white text-xs tracking-wide">P&L DISTRIBUTION</span>
        <span className="text-[11px] text-gray-400">Total Trades: {totalTrades}</span>
      </div>

      {/* Histogram Chart Area */}
      <div className="flex items-stretch h-[180px] pt-4 pb-2">
        {/* Y-Axis scale */}
        <div className="flex flex-col justify-between text-[10px] text-gray-500 pr-2 select-none h-[140px]">
          {yTicks.map((t) => (
            <span key={t} className="text-right leading-none">
              {t}
            </span>
          ))}
        </div>

        {/* Bars Container */}
        <div className="flex-1 flex flex-col justify-between">
          {/* Bars Row */}
          <div className="flex items-end justify-around h-[140px] border-b border-gray-800/80 px-1 gap-1.5">
            {bins.map((bin, i) => {
              const heightPct = Math.min(100, (bin.count / maxCount) * 100);
              return (
                <div key={i} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                  {/* Hover tooltip */}
                  <div className="absolute -top-7 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 border border-gray-700 text-white text-[10px] px-1.5 py-0.5 rounded shadow pointer-events-none whitespace-nowrap z-10">
                    {bin.count} trades ({bin.label})
                  </div>
                  {/* Bar */}
                  <div
                    style={{ height: `${heightPct}%` }}
                    className={`w-full max-w-[28px] rounded-t-sm transition-all duration-300 ${getColor(bin.type)}`}
                  />
                </div>
              );
            })}
          </div>

          {/* X-Axis Labels */}
          <div className="flex justify-around px-1 pt-1.5 text-[9px] text-gray-400 font-medium overflow-hidden">
            {bins.map((bin, i) => (
              <span key={i} className="flex-1 text-center truncate" title={bin.label}>
                {bin.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

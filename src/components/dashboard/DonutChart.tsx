'use client';

import React from 'react';

export interface StrategyItem {
  name: string;
  percentage: number;
  color: string;
}

interface DonutChartProps {
  strategies?: StrategyItem[];
  totalAllocated?: number;
  totalUsed?: number;
  available?: number;
}

const DEFAULT_STRATEGIES: StrategyItem[] = [
  { name: 'AI Quant Core', percentage: 60, color: '#3B82F6' },
  { name: 'Momentum Pro', percentage: 20, color: '#06B6D4' },
  { name: 'Mean Reversion', percentage: 10, color: '#F59E0B' },
  { name: 'Breakout Hunter', percentage: 10, color: '#8B5CF6' },
];

export const DonutChart: React.FC<DonutChartProps> = ({
  strategies = DEFAULT_STRATEGIES,
  totalAllocated = 100000,
  totalUsed = 8250.45,
  available = 91749.55,
}) => {
  const size = 140;
  const strokeWidth = 22;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPercent = 0;

  return (
    <div className="flex flex-col h-full justify-between">
      <div className="flex items-center justify-between gap-4 py-2">
        {/* SVG Donut */}
        <div className="relative shrink-0" style={{ width: size, height: size }}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
            {strategies.map((strat, i) => {
              const strokeDasharray = `${(strat.percentage / 100) * circumference} ${circumference}`;
              const strokeDashoffset = -((accumulatedPercent / 100) * circumference);
              accumulatedPercent += strat.percentage;

              return (
                <circle
                  key={i}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  stroke={strat.color}
                  strokeWidth={strokeWidth}
                  fill="none"
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-500 hover:opacity-80"
                />
              );
            })}
          </svg>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-16 h-16 rounded-full bg-[#0B111E] flex items-center justify-center border border-gray-800" />
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 space-y-2 text-xs">
          {strategies.map((strat, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: strat.color }} />
                <span className="text-gray-300 font-medium">{strat.name}</span>
              </div>
              <span className="text-gray-100 font-bold">{strat.percentage}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Financial Summary */}
      <div className="border-t border-gray-800/80 pt-3 mt-2 space-y-1.5 text-xs">
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Total Allocated</span>
          <span className="font-semibold text-white">${totalAllocated.toLocaleString()}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Total Used</span>
          <span className="font-semibold text-white">${totalUsed.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Available</span>
          <span className="font-semibold text-white">${available.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
      </div>
    </div>
  );
};

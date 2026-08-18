'use client';

import React, { useState } from 'react';

export interface AssetItem {
  symbol: string;
  percentage: number;
  value: number;
  color: string;
}

interface AssetAllocationDonutProps {
  totalValue?: number;
  unallocatedCash?: number;
  unallocatedPercent?: number;
  assets?: AssetItem[];
}

const DEFAULT_ASSETS: AssetItem[] = [
  { symbol: 'BTCUSDT', percentage: 62.45, value: 78194.42, color: '#3B82F6' },
  { symbol: 'ETHUSDT', percentage: 18.32, value: 22955.31, color: '#8B5CF6' },
  { symbol: 'SOLUSDT', percentage: 9.21, value: 11542.18, color: '#F59E0B' },
  { symbol: 'XRPUSDT', percentage: 6.73, value: 8441.2, color: '#06B6D4' },
  { symbol: 'OTHERS', percentage: 3.29, value: 4207.16, color: '#64748B' },
];

export const AssetAllocationDonut: React.FC<AssetAllocationDonutProps> = ({
  totalValue = 125340.27,
  unallocatedCash = 91749.55,
  unallocatedPercent = 73.2,
  assets = DEFAULT_ASSETS,
}) => {
  const [mode, setMode] = useState<'value' | 'exposure'>('value');

  const size = 150;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPercent = 0;

  return (
    <div className="flex flex-col h-full justify-between">
      {/* Header with toggle */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-white tracking-wide uppercase">Asset Allocation</span>
        <div className="flex items-center rounded-lg bg-[#080E1A] p-0.5 border border-gray-800 text-[10px] font-bold">
          <button
            onClick={() => setMode('value')}
            className={`px-2 py-0.5 rounded-md transition-all ${
              mode === 'value' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-400 hover:text-white'
            }`}
          >
            By Value
          </button>
          <button
            onClick={() => setMode('exposure')}
            className={`px-2 py-0.5 rounded-md transition-all ${
              mode === 'exposure' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-400 hover:text-white'
            }`}
          >
            By Exposure
          </button>
        </div>
      </div>

      {/* Donut Chart & Asset Breakdown List */}
      <div className="flex items-center justify-between gap-4 py-2">
        {/* Donut SVG */}
        <div className="relative shrink-0 flex items-center justify-center" style={{ width: size, height: size }}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
            {assets.map((asset, i) => {
              const strokeDasharray = `${(asset.percentage / 100) * circumference} ${circumference}`;
              const strokeDashoffset = -((accumulatedPercent / 100) * circumference);
              accumulatedPercent += asset.percentage;

              return (
                <circle
                  key={i}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  stroke={asset.color}
                  strokeWidth={strokeWidth}
                  fill="none"
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-300 hover:opacity-80"
                />
              );
            })}
          </svg>

          {/* Center Info Text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
            <span className="text-[10px] text-gray-400 font-medium">Total Value</span>
            <span className="text-xs font-black text-white">
              ${totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
          </div>
        </div>

        {/* Asset Rows */}
        <div className="flex-1 space-y-1.5 text-xs">
          {assets.map((asset, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: asset.color }} />
                <span className="text-gray-300 font-bold text-[11px]">{asset.symbol}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-gray-400 font-medium text-[11px]">{asset.percentage.toFixed(2)}%</span>
                <span className="text-white font-bold text-[11px] w-20 text-right">
                  ${asset.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Unallocated Cash Strip */}
      <div className="border-t border-gray-800/80 pt-2 flex items-center justify-between text-xs">
        <span className="text-gray-400">Unallocated Cash</span>
        <span className="font-bold text-emerald-400">
          ${unallocatedCash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
          <span className="text-[10px] text-emerald-400/80 font-normal">({unallocatedPercent.toFixed(2)}%)</span>
        </span>
      </div>
    </div>
  );
};

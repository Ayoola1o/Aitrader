'use client';

import React from 'react';

interface RiskSpeedometerProps {
  score?: number; // 0 to 100
  var95?: number;
  expectedShortfall?: number;
  exposure?: number;
  exposurePercent?: number;
  concentrationRisk?: 'LOW' | 'MEDIUM' | 'HIGH';
}

export const RiskSpeedometer: React.FC<RiskSpeedometerProps> = ({
  score = 28,
  var95 = 1842.33,
  expectedShortfall = 2983.55,
  exposure = 33133.11,
  exposurePercent = 26.4,
  concentrationRisk = 'LOW',
}) => {
  const size = 160;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;

  // Arc calculation for 180 degrees (from 180 to 360/0 deg)
  const angle = (score / 100) * 180; // 0 to 180 degrees
  const needleAngle = -180 + angle; // in CSS rotation

  return (
    <div className="flex flex-col h-full justify-between">
      <div className="text-xs font-bold text-white tracking-wide uppercase mb-1">Risk Overview</div>

      {/* Speedometer Arc */}
      <div className="relative flex flex-col items-center justify-center my-1">
        <svg width={size} height={size / 2 + 15} viewBox={`0 0 ${size} ${size / 2 + 15}`} className="overflow-visible">
          <defs>
            <linearGradient id="riskArcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10B981" />
              <stop offset="50%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#EF4444" />
            </linearGradient>
          </defs>

          {/* Background Track */}
          <path
            d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
            fill="none"
            stroke="#1E293B"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />

          {/* Gradient Gauge Arc */}
          <path
            d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
            fill="none"
            stroke="url(#riskArcGrad)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />

          {/* Center Needle Base */}
          <circle cx={size / 2} cy={size / 2} r="5" fill="#38BDF8" />
          <line
            x1={size / 2}
            y1={size / 2}
            x2={size / 2 + (radius - 12) * Math.cos((needleAngle * Math.PI) / 180)}
            y2={size / 2 + (radius - 12) * Math.sin((needleAngle * Math.PI) / 180)}
            stroke="#38BDF8"
            strokeWidth="2.5"
            strokeLinecap="round"
            style={{ filter: 'drop-shadow(0 0 4px #38BDF8)' }}
          />
        </svg>

        {/* Risk Label */}
        <div className="text-center mt-[-6px]">
          <span className="text-[10px] uppercase font-black tracking-wider text-emerald-400">
            {score < 40 ? 'LOW RISK' : score < 70 ? 'MODERATE RISK' : 'HIGH RISK'}
          </span>
        </div>
      </div>

      {/* Metrics List */}
      <div className="border-t border-gray-800/80 pt-2 space-y-1 text-xs">
        <div className="flex justify-between items-center text-[11px]">
          <span className="text-gray-400">Portfolio Risk Score</span>
          <span className="font-bold text-white">{score} / 100</span>
        </div>
        <div className="flex justify-between items-center text-[11px]">
          <span className="text-gray-400">VaR (95%, 1D)</span>
          <span className="font-semibold text-gray-200">${var95.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <div className="flex justify-between items-center text-[11px]">
          <span className="text-gray-400">Expected Shortfall (95%)</span>
          <span className="font-semibold text-gray-200">${expectedShortfall.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <div className="flex justify-between items-center text-[11px]">
          <span className="text-gray-400">Exposure</span>
          <span className="font-semibold text-white">
            ${exposure.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
            <span className="text-[10px] text-gray-400">({exposurePercent.toFixed(2)}%)</span>
          </span>
        </div>
        <div className="flex justify-between items-center text-[11px]">
          <span className="text-gray-400">Concentration Risk</span>
          <span className="font-bold text-emerald-400">{concentrationRisk}</span>
        </div>
      </div>
    </div>
  );
};

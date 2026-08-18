'use client';

import React from 'react';

interface CircularGaugeProps {
  value: number; // 0 to 100
  label: string;
  sublabel?: string;
  statusText?: string;
  unit?: string;
  size?: number;
  strokeWidth?: number;
  color?: string;
}

export const CircularGauge: React.FC<CircularGaugeProps> = ({
  value,
  label,
  statusText = 'Normal',
  unit = '%',
  size = 110,
  strokeWidth = 8,
  color,
}) => {
  const clampedValue = Math.min(100, Math.max(0, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  // Arc covering 240 degrees (from 150deg to 390deg) or 270 degrees
  // Let's make an open circle or closed gauge as seen in the mockup
  // Looking at the mockup: 4 rings with opening at bottom
  const arcLength = circumference * 0.75;
  const strokeDashoffset = arcLength - (clampedValue / 100) * arcLength;

  const gaugeColor =
    color ||
    (clampedValue < 60
      ? '#10B981'
      : clampedValue < 85
      ? '#F59E0B'
      : '#EF4444');

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          className="transform -rotate-[135deg]"
          viewBox={`0 0 ${size} ${size}`}
        >
          {/* Background track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#1E293B"
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeLinecap="round"
          />
          {/* Progress fill */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={gaugeColor}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-500 ease-out"
            style={{
              filter: `drop-shadow(0 0 6px ${gaugeColor}40)`,
            }}
          />
        </svg>

        {/* Center Value */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center mt-[-4px]">
          <span className="text-xl font-bold tracking-tight text-white">
            {value}
            <span className="text-xs font-normal text-gray-400 ml-0.5">{unit}</span>
          </span>
        </div>
      </div>

      {/* Label and Status */}
      <div className="text-center mt-1">
        <div className="text-[11px] font-semibold tracking-wider text-gray-400 uppercase">{label}</div>
        <div className="text-[11px] font-medium text-emerald-400 mt-0.5">{statusText}</div>
      </div>
    </div>
  );
};

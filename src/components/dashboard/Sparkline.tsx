'use client';

import React from 'react';

interface SparklineProps {
  data: number[];
  color?: string;
  fillColor?: string;
  height?: number;
  width?: number | string;
  className?: string;
  isPositive?: boolean;
}

export const Sparkline: React.FC<SparklineProps> = ({
  data,
  color,
  fillColor,
  height = 36,
  width = '100%',
  className = '',
  isPositive,
}) => {
  const gradientId = React.useId().replace(/:/g, '-');

  if (!data || data.length < 2) {
    return <div style={{ height: `${height}px`, width: typeof width === 'number' ? `${width}px` : width }} className={className} />;
  }

  const strokeColor =
    color ||
    (isPositive !== undefined
      ? isPositive
        ? '#10B981'
        : '#EF4444'
      : data[data.length - 1] >= data[0]
      ? '#10B981'
      : '#EF4444');

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const paddingY = 4;
  const h = height;
  const w = 120;

  const points = data.map((val, idx) => {
    const x = (idx / (data.length - 1)) * w;
    const y = h - paddingY - ((val - min) / range) * (h - paddingY * 2);
    return { x, y };
  });

  let pathD = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const cpX = (p0.x + p1.x) / 2;
    pathD += ` C ${cpX} ${p0.y}, ${cpX} ${p1.y}, ${p1.x} ${p1.y}`;
  }

  const areaD = `${pathD} L ${points[points.length - 1].x} ${h} L ${points[0].x} ${h} Z`;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className={`overflow-visible ${className}`}
      style={{ width: typeof width === 'number' ? `${width}px` : width, height: `${height}px` }}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fillColor || strokeColor} stopOpacity={0.25} />
          <stop offset="100%" stopColor={fillColor || strokeColor} stopOpacity={0.0} />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#${gradientId})`} />
      <path d={pathD} fill="none" stroke={strokeColor} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

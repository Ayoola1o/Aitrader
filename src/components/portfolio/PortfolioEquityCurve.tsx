'use client';

import React, { useState, useRef } from 'react';

interface PortfolioDataPoint {
  date: string;
  equity: number;
  benchmark: number;
}

interface PortfolioEquityCurveProps {
  data?: PortfolioDataPoint[];
}

export const PortfolioEquityCurve: React.FC<PortfolioEquityCurveProps> = ({
  data = [],
}) => {
  const [timeframe, setTimeframe] = useState<'7D' | '30D' | '90D' | '1Y' | 'ALL'>('ALL');
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartData = data.length > 0
    ? data
    : [{ date: 'Unavailable', equity: 0, benchmark: 0 }];

  const height = 220;
  const paddingLeft = 45;
  const paddingRight = 15;
  const paddingTop = 20;
  const paddingBottom = 30;

  const yMin = 0;
  const yMax = 150000;
  const yRange = yMax - yMin;

  const yTicks = [150000, 125000, 100000, 75000, 50000, 25000, 0];
  const dateLabels = ["Jan '24", "Mar '24", "May '24", "Jul '24", "Sep '24", "Nov '24", "Jan '25", "Mar '25", "May '25"];

  const width = 600;
  const chartW = width - paddingLeft - paddingRight;
  const chartH = height - paddingTop - paddingBottom;

  const getY = (val: number) => paddingTop + (1 - (val - yMin) / yRange) * chartH;
  const getX = (i: number) => paddingLeft + (chartData.length > 1 ? (i / (chartData.length - 1)) * chartW : chartW / 2);

  // Equity Path
  const points = chartData.map((d, i) => ({ x: getX(i), y: getY(d.equity) }));
  let equityPathD = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const cpX = (p0.x + p1.x) / 2;
    equityPathD += ` C ${cpX} ${p0.y}, ${cpX} ${p1.y}, ${p1.x} ${p1.y}`;
  }
  const equityAreaD = `${equityPathD} L ${points[points.length - 1].x} ${height - paddingBottom} L ${points[0].x} ${height - paddingBottom} Z`;

  // Benchmark Path
  const benchPoints = chartData.map((d, i) => ({ x: getX(i), y: getY(d.benchmark) }));
  let benchPathD = `M ${benchPoints[0].x} ${benchPoints[0].y}`;
  for (let i = 0; i < benchPoints.length - 1; i++) {
    const p0 = benchPoints[i];
    const p1 = benchPoints[i + 1];
    const cpX = (p0.x + p1.x) / 2;
    benchPathD += ` C ${cpX} ${p0.y}, ${cpX} ${p1.y}, ${p1.x} ${p1.y}`;
  }

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const xPos = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, (xPos - paddingLeft) / (rect.width - paddingLeft - paddingRight)));
    const idx = Math.round(ratio * (chartData.length - 1));
    setHoverIndex(idx);
  };

  const activePoint = hoverIndex !== null ? chartData[hoverIndex] : null;

  return (
    <div className="flex flex-col h-full justify-between">
      {/* Header Controls */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-4 text-xs">
          <span className="font-bold text-white tracking-wide uppercase">Equity Curve</span>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-[#00D8F6] rounded-full inline-block" />
              <span className="text-[11px] text-gray-300 font-medium">Equity</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 border-t border-dashed border-gray-400 inline-block" />
              <span className="text-[11px] text-gray-400">Buy & Hold (BTC)</span>
            </div>
          </div>
        </div>

        {/* Timeframe Buttons */}
        <div className="flex items-center rounded-lg bg-[#080E1A] p-0.5 border border-gray-800 text-[10px] font-bold">
          {(['7D', '30D', '90D', '1Y', 'ALL'] as const).map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-2 py-0.5 rounded-md transition-all ${
                timeframe === tf ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-400 hover:text-white'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* SVG Chart */}
      <div ref={containerRef} className="relative w-full flex-1">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          className="w-full h-[220px] overflow-visible cursor-crosshair"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverIndex(null)}
        >
          <defs>
            <linearGradient id="portfolioEquityGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00D8F6" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#00D8F6" stopOpacity={0.0} />
            </linearGradient>
          </defs>

          {/* Grid lines & Y-axis labels */}
          {yTicks.map((tick) => {
            const y = getY(tick);
            return (
              <g key={tick}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={width - paddingRight}
                  y2={y}
                  stroke="#1E293B"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />
                <text
                  x={paddingLeft - 8}
                  y={y + 3.5}
                  textAnchor="end"
                  fill="#64748B"
                  fontSize="9"
                  fontFamily="sans-serif"
                >
                  ${tick === 0 ? '0' : `${tick / 1000}K`}
                </text>
              </g>
            );
          })}

          {/* X-axis date labels */}
          {dateLabels.map((date, idx) => {
            const x = paddingLeft + (idx / (dateLabels.length - 1)) * chartW;
            return (
              <text
                key={date}
                x={x}
                y={height - 8}
                textAnchor="middle"
                fill="#64748B"
                fontSize="9"
                fontFamily="sans-serif"
              >
                {date}
              </text>
            );
          })}

          {/* Benchmark Line */}
          <path
            d={benchPathD}
            fill="none"
            stroke="#64748B"
            strokeWidth="1.5"
            strokeDasharray="4 4"
            strokeLinecap="round"
          />

          {/* Equity Line & Gradient */}
          <path d={equityAreaD} fill="url(#portfolioEquityGrad)" />
          <path
            d={equityPathD}
            fill="none"
            stroke="#00D8F6"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ filter: 'drop-shadow(0 0 6px rgba(0, 216, 246, 0.4))' }}
          />

          {/* Hover tracker */}
          {hoverIndex !== null && (
            <g>
              <line
                x1={points[hoverIndex].x}
                y1={paddingTop}
                x2={points[hoverIndex].x}
                y2={height - paddingBottom}
                stroke="#38BDF8"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
              <circle
                cx={points[hoverIndex].x}
                cy={points[hoverIndex].y}
                r="4.5"
                fill="#00D8F6"
                stroke="#080E1A"
                strokeWidth="2"
                style={{ filter: 'drop-shadow(0 0 8px #00D8F6)' }}
              />
            </g>
          )}
        </svg>

        {/* Hover Tooltip */}
        {activePoint && hoverIndex !== null && (
          <div
            className="absolute top-2 pointer-events-none bg-[#0B111E]/95 border border-blue-500/40 rounded-lg p-2 text-xs shadow-xl backdrop-blur-md transition-all z-20"
            style={{
              left: `${Math.min(80, Math.max(10, (hoverIndex / Math.max(1, chartData.length - 1)) * 100))}%`,
              transform: 'translateX(-50%)',
            }}
          >
            <div className="text-[10px] text-gray-400 font-semibold">{activePoint.date}</div>
            <div className="text-[#00D8F6] font-bold text-xs mt-0.5">
              Equity: ${activePoint.equity.toLocaleString()}
            </div>
            <div className="text-gray-400 text-[10px]">
              BTC: ${activePoint.benchmark.toLocaleString()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

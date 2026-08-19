'use client';

import React, { useState, useRef, useEffect } from 'react';

interface EquityDataPoint {
  date: string;
  timestamp: number;
  equity: number;
  benchmark: number;
}

interface EquityCurveChartProps {
  data?: EquityDataPoint[];
  initialEquity?: number;
}

const DEFAULT_DATA: EquityDataPoint[] = [
  { date: 'May 18', timestamp: 1, equity: 84200, benchmark: 82000 },
  { date: 'May 18', timestamp: 2, equity: 89100, benchmark: 84500 },
  { date: 'May 18', timestamp: 3, equity: 86500, benchmark: 87000 },
  { date: 'May 19', timestamp: 4, equity: 92400, benchmark: 89000 },
  { date: 'May 19', timestamp: 5, equity: 95800, benchmark: 91200 },
  { date: 'May 19', timestamp: 6, equity: 93200, benchmark: 94000 },
  { date: 'May 20', timestamp: 7, equity: 99400, benchmark: 96500 },
  { date: 'May 20', timestamp: 8, equity: 104200, benchmark: 98000 },
  { date: 'May 20', timestamp: 9, equity: 101800, benchmark: 102000 },
  { date: 'May 21', timestamp: 10, equity: 108900, benchmark: 100500 },
  { date: 'May 21', timestamp: 11, equity: 114500, benchmark: 103000 },
  { date: 'May 21', timestamp: 12, equity: 111200, benchmark: 107000 },
  { date: 'May 22', timestamp: 13, equity: 116800, benchmark: 105500 },
  { date: 'May 22', timestamp: 14, equity: 121400, benchmark: 109000 },
  { date: 'May 22', timestamp: 15, equity: 118900, benchmark: 112000 },
  { date: 'May 23', timestamp: 16, equity: 122300, benchmark: 110500 },
  { date: 'May 23', timestamp: 17, equity: 126700, benchmark: 114000 },
  { date: 'May 23', timestamp: 18, equity: 123900, benchmark: 117500 },
  { date: 'May 24', timestamp: 19, equity: 124800, benchmark: 116000 },
  { date: 'May 24', timestamp: 20, equity: 125340, benchmark: 118400 },
];

export const EquityCurveChart: React.FC<EquityCurveChartProps> = ({
  data,
  initialEquity = 100000,
}) => {
  const [timeframe, setTimeframe] = useState<'24H' | '7D' | '30D' | 'ALL'>('7D');
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Generate clean real baseline if no closed trades yet
  const chartData: EquityDataPoint[] = data && data.length > 0
    ? data
    : Array.from({ length: 7 }, (_, i) => {
        const d = new Date(Date.now() - (6 - i) * 86400000);
        const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return {
          date: dateStr,
          timestamp: d.getTime(),
          equity: initialEquity,
          benchmark: initialEquity,
        };
      });

  const height = 220;
  const paddingLeft = 60;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 30;

  const allEquities = chartData.map((d) => d.equity);
  const allBenchmarks = chartData.map((d) => d.benchmark);
  const minVal = Math.min(...allEquities, ...allBenchmarks);
  const maxVal = Math.max(...allEquities, ...allBenchmarks);

  // Dynamic Y bounds
  const yMin = minVal === maxVal ? minVal * 0.95 : Math.floor((minVal * 0.98) / 1000) * 1000;
  const yMax = minVal === maxVal ? maxVal * 1.05 : Math.ceil((maxVal * 1.02) / 1000) * 1000;
  const yRange = Math.max(1, yMax - yMin);

  const step = yRange / 5;
  const yTicks = Array.from({ length: 6 }, (_, i) => Math.round(yMin + i * step));

  const width = 600; // SVG viewBox coordinate width
  const chartW = width - paddingLeft - paddingRight;
  const chartH = height - paddingTop - paddingBottom;

  const getY = (val: number) => paddingTop + (1 - (val - yMin) / yRange) * chartH;
  const getX = (i: number) => paddingLeft + (chartData.length > 1 ? (i / (chartData.length - 1)) * chartW : chartW / 2);

  // Build Equity SVG Path
  const points = chartData.map((d, i) => ({ x: getX(i), y: getY(d.equity) }));
  let equityPathD = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const cpX = (p0.x + p1.x) / 2;
    equityPathD += ` C ${cpX} ${p0.y}, ${cpX} ${p1.y}, ${p1.x} ${p1.y}`;
  }
  const equityAreaD = `${equityPathD} L ${points[points.length - 1].x} ${height - paddingBottom} L ${points[0].x} ${height - paddingBottom} Z`;

  // Build Benchmark (Buy & Hold) SVG Path
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

  const handleMouseLeave = () => {
    setHoverIndex(null);
  };

  const activePoint = hoverIndex !== null ? chartData[hoverIndex] : null;

  return (
    <div className="flex flex-col h-full">
      {/* Header Controls */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-4 text-xs">
          <span className="font-bold text-white tracking-wide">EQUITY CURVE</span>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-[#00D8F6] rounded-full inline-block" />
              <span className="text-[11px] text-gray-300">Equity</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 border-t border-dashed border-gray-400 inline-block" />
              <span className="text-[11px] text-gray-400">Buy & Hold (BTC)</span>
            </div>
          </div>
        </div>

        {/* Timeframe Dropdown */}
        <select
          value={timeframe}
          onChange={(e) => setTimeframe(e.target.value as any)}
          className="bg-[#0B111E] border border-gray-800 text-gray-300 text-xs rounded-lg px-2.5 py-1 focus:outline-none focus:border-blue-500 cursor-pointer"
        >
          <option value="24H">24H</option>
          <option value="7D">7D</option>
          <option value="30D">30D</option>
          <option value="ALL">ALL</option>
        </select>
      </div>

      {/* SVG Chart Container */}
      <div ref={containerRef} className="relative w-full flex-1">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          className="w-full h-[220px] overflow-visible cursor-crosshair"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <defs>
            <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
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
                  fontSize="10"
                  fontFamily="sans-serif"
                >
                  ${tick / 1000}K
                </text>
              </g>
            );
          })}

          {/* X-axis date labels */}
          {chartData.map((pt, idx) => {
            const x = paddingLeft + (chartData.length > 1 ? (idx / (chartData.length - 1)) * chartW : chartW / 2);
            return (
              <text
                key={idx}
                x={x}
                y={height - 8}
                textAnchor="middle"
                fill="#64748B"
                fontSize="10"
                fontFamily="sans-serif"
              >
                {pt.date}
              </text>
            );
          })}

          {/* Benchmark Dashed Curve */}
          <path
            d={benchPathD}
            fill="none"
            stroke="#64748B"
            strokeWidth="1.5"
            strokeDasharray="4 4"
            strokeLinecap="round"
          />

          {/* Equity Gradient Area & Curve */}
          <path d={equityAreaD} fill="url(#equityGrad)" />
          <path
            d={equityPathD}
            fill="none"
            stroke="#00D8F6"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ filter: 'drop-shadow(0 0 6px rgba(0, 216, 246, 0.4))' }}
          />

          {/* Hover Crosshair & Dot */}
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

        {/* Hover Tooltip Overlay */}
        {activePoint && hoverIndex !== null && (
          <div
            className="absolute top-2 pointer-events-none bg-[#0B111E]/95 border border-blue-500/40 rounded-lg p-2 text-xs shadow-xl backdrop-blur-md transition-all z-20"
            style={{
              left: `${Math.min(75, Math.max(10, (hoverIndex / Math.max(1, chartData.length - 1)) * 100))}%`,
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

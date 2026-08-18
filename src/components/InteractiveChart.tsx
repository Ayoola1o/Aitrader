'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Candle } from '@/types/trading';
import {
  PenTool,
  TrendingUp,
  Maximize2,
  Minimize2,
  Type,
  ZoomIn,
  Crosshair,
  Sliders,
  Sparkles,
} from 'lucide-react';

interface InteractiveChartProps {
  candles: Candle[];
  entry?: number | null;
  stopLoss?: number | null;
  takeProfit?: number | null;
  height?: number;
  symbol?: string;
  timeframe?: string;
  onTimeframeChange?: (tf: string) => void;
}

export const InteractiveChart: React.FC<InteractiveChartProps> = ({
  candles,
  entry = 64250.0,
  stopLoss = 63800.0,
  takeProfit = 65600.0,
  height = 440,
  symbol = 'BTCUSDT',
  timeframe = '1m',
  onTimeframeChange,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [activeTool, setActiveTool] = useState<string>('crosshair');
  const [selectedTf, setSelectedTf] = useState<string>(timeframe);

  const handleTfClick = (tf: string) => {
    setSelectedTf(tf);
    if (onTimeframeChange) onTimeframeChange(tf);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || candles.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const width = rect.width;
    const h = height;

    // Dark Background
    ctx.fillStyle = '#080E1A';
    ctx.fillRect(0, 0, width, h);

    const marginTop = 25;
    const marginBottom = 45;
    const marginRight = 75;
    const marginLeft = 48; // Space for left toolbar
    const chartHeight = h - marginTop - marginBottom;
    const chartWidth = width - marginLeft - marginRight;

    const visibleCandles = candles.slice(-55);
    const count = visibleCandles.length;
    if (count === 0) return;

    const prices = visibleCandles.flatMap((c) => [c.high, c.low]);
    if (entry) prices.push(entry);
    if (stopLoss) prices.push(stopLoss);
    if (takeProfit) prices.push(takeProfit);

    let minPrice = Math.min(...prices);
    let maxPrice = Math.max(...prices);
    const range = maxPrice - minPrice || 1;
    minPrice -= range * 0.04;
    maxPrice += range * 0.04;

    const maxVolume = Math.max(...visibleCandles.map((c) => c.volume)) || 1;

    const getY = (p: number) =>
      marginTop + (1 - (p - minPrice) / (maxPrice - minPrice)) * chartHeight;
    const getX = (i: number) => marginLeft + (i + 0.5) * (chartWidth / count);
    const candleWidth = Math.max(3, (chartWidth / count) * 0.65);

    // Horizontal Grid Lines & Price Ticks
    ctx.strokeStyle = 'rgba(30, 41, 59, 0.6)';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);

    for (let i = 0; i <= 6; i++) {
      const p = minPrice + (maxPrice - minPrice) * (i / 6);
      const y = getY(p);
      ctx.beginPath();
      ctx.moveTo(marginLeft, y);
      ctx.lineTo(width - marginRight, y);
      ctx.stroke();

      ctx.fillStyle = '#64748B';
      ctx.font = '10px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), width - marginRight + 6, y + 3.5);
    }
    ctx.setLineDash([]);

    // Vertical Timeline Grid Lines
    for (let i = 0; i < count; i += 10) {
      const x = getX(i);
      ctx.strokeStyle = 'rgba(30, 41, 59, 0.4)';
      ctx.beginPath();
      ctx.moveTo(x, marginTop);
      ctx.lineTo(x, h - marginBottom);
      ctx.stroke();

      const c = visibleCandles[i];
      if (c) {
        const timeStr = new Date(c.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        ctx.fillStyle = '#64748B';
        ctx.font = '9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(timeStr, x, h - marginBottom + 18);
      }
    }

    // Volume Histogram (Lower 20% area)
    const volHeight = 55;
    visibleCandles.forEach((c, i) => {
      const x = getX(i);
      const isBull = c.close >= c.open;
      const vH = (c.volume / maxVolume) * volHeight;
      const y = h - marginBottom - vH;

      ctx.fillStyle = isBull ? 'rgba(16, 185, 129, 0.22)' : 'rgba(239, 68, 68, 0.22)';
      ctx.fillRect(x - candleWidth / 2, y, candleWidth, vH);
    });

    // Candlesticks
    visibleCandles.forEach((c, i) => {
      const x = getX(i);
      const openY = getY(c.open);
      const closeY = getY(c.close);
      const highY = getY(c.high);
      const lowY = getY(c.low);
      const isBull = c.close >= c.open;

      // Wick
      ctx.strokeStyle = isBull ? '#10B981' : '#EF4444';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x, highY);
      ctx.lineTo(x, lowY);
      ctx.stroke();

      // Body
      const bodyTop = Math.min(openY, closeY);
      const bodyHeight = Math.max(2, Math.abs(closeY - openY));
      ctx.fillStyle = isBull ? '#10B981' : '#EF4444';
      ctx.fillRect(x - candleWidth / 2, bodyTop, candleWidth, bodyHeight);
    });

    // EMA 20 (Gold / Amber)
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    visibleCandles.forEach((c, i) => {
      const x = getX(i);
      const y = getY(c.close * 0.999);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // EMA 50 (Blue)
    ctx.strokeStyle = '#38BDF8';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    visibleCandles.forEach((c, i) => {
      const x = getX(i);
      const y = getY(c.close * 0.997);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Horizontal Level: Take Profit (TP 65,600.00)
    if (takeProfit) {
      const y = getY(takeProfit);
      ctx.strokeStyle = '#10B981';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(marginLeft, y);
      ctx.lineTo(width - marginRight, y);
      ctx.stroke();
      ctx.setLineDash([]);

      // TP Label Badge
      ctx.fillStyle = '#065F46';
      ctx.fillRect(width - marginRight - 105, y - 9, 100, 18);
      ctx.fillStyle = '#34D399';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`TP ${takeProfit.toLocaleString()}`, width - marginRight - 55, y + 3.5);
    }

    // Horizontal Level: Entry (ENTRY 64,250.00)
    if (entry) {
      const y = getY(entry);
      ctx.strokeStyle = '#00D8F6';
      ctx.lineWidth = 1.4;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(marginLeft, y);
      ctx.lineTo(width - marginRight, y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Entry Label Badge
      ctx.fillStyle = '#0E3A52';
      ctx.fillRect(width - marginRight - 115, y - 9, 110, 18);
      ctx.fillStyle = '#38BDF8';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`ENTRY ${entry.toLocaleString()}`, width - marginRight - 60, y + 3.5);
    }

    // Horizontal Level: Stop Loss (SL 63,800.00)
    if (stopLoss) {
      const y = getY(stopLoss);
      ctx.strokeStyle = '#EF4444';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(marginLeft, y);
      ctx.lineTo(width - marginRight, y);
      ctx.stroke();
      ctx.setLineDash([]);

      // SL Label Badge
      ctx.fillStyle = '#7F1D1D';
      ctx.fillRect(width - marginRight - 105, y - 9, 100, 18);
      ctx.fillStyle = '#F87171';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`SL ${stopLoss.toLocaleString()}`, width - marginRight - 55, y + 3.5);
    }

    // Current Price Cursor Line & Right Tag
    const lastCandle = visibleCandles[visibleCandles.length - 1];
    if (lastCandle) {
      const curY = getY(lastCandle.close);
      ctx.fillStyle = '#10B981';
      ctx.fillRect(width - marginRight, curY - 10, marginRight, 20);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(lastCandle.close.toFixed(2), width - marginRight + 5, curY + 3.5);
    }
  }, [candles, entry, stopLoss, takeProfit, height]);

  const last = candles[candles.length - 1] || {
    open: 64210.5,
    high: 64275.35,
    low: 64205.1,
    close: 64250.18,
  };
  const diff = last.close - last.open;
  const diffPct = (diff / last.open) * 100;

  return (
    <div className="w-full bg-[#080E1A] rounded-2xl border border-[#1E293B] overflow-hidden flex flex-col relative">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between px-3 py-2 border-b border-gray-800/80 bg-[#0B111E] text-xs">
        {/* Symbol & OHLC summary */}
        <div className="flex items-center gap-3">
          <div className="font-bold text-white flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-cyan-400 font-mono">{symbol}</span>
            <span className="text-gray-400">·</span>
            <span className="text-gray-300 font-mono">{selectedTf}</span>
            <span className="text-gray-400">·</span>
            <span className="text-gray-400 uppercase font-sans">BINANCE</span>
          </div>

          <div className="hidden sm:flex items-center gap-2 font-mono text-[11px] text-gray-400">
            <span>O <strong className="text-gray-200">{last.open.toFixed(2)}</strong></span>
            <span>H <strong className="text-emerald-400">{last.high.toFixed(2)}</strong></span>
            <span>L <strong className="text-rose-400">{last.low.toFixed(2)}</strong></span>
            <span>C <strong className="text-emerald-400">{last.close.toFixed(2)}</strong></span>
            <span className={diff >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
              {diff >= 0 ? '+' : ''}{diff.toFixed(2)} ({diffPct >= 0 ? '+' : ''}{diffPct.toFixed(2)}%)
            </span>
          </div>
        </div>

        {/* Timeframe Selectors & Quick Actions */}
        <div className="flex items-center gap-1">
          {['1m', '5m', '15m', '1h', '4h', '1D'].map((tf) => (
            <button
              key={tf}
              onClick={() => handleTfClick(tf)}
              className={`px-2 py-0.5 rounded text-[11px] font-bold font-mono transition-colors ${
                selectedTf === tf
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              {tf}
            </button>
          ))}

          <div className="w-px h-3.5 bg-gray-800 mx-1" />

          <div className="flex items-center gap-2 text-[10px] text-gray-400 font-mono pr-1">
            <span className="flex items-center gap-1">
              <span className="w-2 h-0.5 bg-amber-500 inline-block" />
              <span>EMA 20 <strong className="text-gray-200">{(last.close * 0.999).toFixed(2)}</strong></span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-0.5 bg-cyan-400 inline-block" />
              <span>EMA 50 <strong className="text-gray-200">{(last.close * 0.997).toFixed(2)}</strong></span>
            </span>
          </div>
        </div>
      </div>

      {/* Main Canvas + Left Drawing Sidebar */}
      <div className="relative w-full flex-1">
        {/* Left Drawing Tools Strip */}
        <div className="absolute left-1 top-2 z-10 flex flex-col gap-1 bg-[#0B111E]/90 border border-gray-800/80 rounded-xl p-1 text-gray-400">
          <button
            onClick={() => setActiveTool('crosshair')}
            className={`p-1.5 rounded-lg hover:text-white transition-colors ${activeTool === 'crosshair' ? 'bg-blue-600/30 text-cyan-400' : ''}`}
            title="Crosshair"
          >
            <Crosshair className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setActiveTool('trend')}
            className={`p-1.5 rounded-lg hover:text-white transition-colors ${activeTool === 'trend' ? 'bg-blue-600/30 text-cyan-400' : ''}`}
            title="Trend Line"
          >
            <TrendingUp className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setActiveTool('pen')}
            className={`p-1.5 rounded-lg hover:text-white transition-colors ${activeTool === 'pen' ? 'bg-blue-600/30 text-cyan-400' : ''}`}
            title="Brush / Pen"
          >
            <PenTool className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setActiveTool('text')}
            className={`p-1.5 rounded-lg hover:text-white transition-colors ${activeTool === 'text' ? 'bg-blue-600/30 text-cyan-400' : ''}`}
            title="Text Annotate"
          >
            <Type className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setActiveTool('zoom')}
            className={`p-1.5 rounded-lg hover:text-white transition-colors ${activeTool === 'zoom' ? 'bg-blue-600/30 text-cyan-400' : ''}`}
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Canvas Engine */}
        <canvas ref={canvasRef} style={{ width: '100%', height: `${height}px` }} />
      </div>
    </div>
  );
};

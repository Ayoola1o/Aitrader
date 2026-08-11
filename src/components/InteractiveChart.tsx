'use client';

import React, { useEffect, useRef } from 'react';
import { Candle } from '@/types/trading';

interface InteractiveChartProps {
  candles: Candle[];
  entry?: number | null;
  stopLoss?: number | null;
  takeProfit?: number | null;
  height?: number;
}

export const InteractiveChart: React.FC<InteractiveChartProps> = ({
  candles,
  entry,
  stopLoss,
  takeProfit,
  height = 420,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

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

    // Clear background
    ctx.fillStyle = '#0B111E';
    ctx.fillRect(0, 0, width, h);

    // Margins
    const marginTop = 30;
    const marginBottom = 50;
    const marginRight = 65;
    const marginLeft = 10;
    const chartHeight = h - marginTop - marginBottom;
    const chartWidth = width - marginLeft - marginRight;

    const visibleCandles = candles.slice(-50);
    const count = visibleCandles.length;
    if (count === 0) return;

    const prices = visibleCandles.flatMap((c) => [c.high, c.low]);
    if (entry) prices.push(entry);
    if (stopLoss) prices.push(stopLoss);
    if (takeProfit) prices.push(takeProfit);

    let minPrice = Math.min(...prices);
    let maxPrice = Math.max(...prices);
    const range = maxPrice - minPrice || 1;
    minPrice -= range * 0.05;
    maxPrice += range * 0.05;

    const maxVolume = Math.max(...visibleCandles.map((c) => c.volume)) || 1;

    // Helper functions
    const getY = (p: number) => marginTop + (1 - (p - minPrice) / (maxPrice - minPrice)) * chartHeight;
    const getX = (i: number) => marginLeft + (i + 0.5) * (chartWidth / count);
    const candleWidth = Math.max(3, (chartWidth / count) * 0.7);

    // Grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    for (let i = 1; i <= 4; i++) {
      const p = minPrice + (maxPrice - minPrice) * (i / 5);
      const y = getY(p);
      ctx.beginPath();
      ctx.moveTo(marginLeft, y);
      ctx.lineTo(width - marginRight, y);
      ctx.stroke();

      ctx.fillStyle = '#6B7280';
      ctx.font = '10px sans-serif';
      ctx.fillText(p.toFixed(p > 1000 ? 1 : 3), width - marginRight + 8, y + 3);
    }

    // Volume histogram
    const volHeight = 60;
    visibleCandles.forEach((c, i) => {
      const x = getX(i);
      const isBull = c.close >= c.open;
      const vH = (c.volume / maxVolume) * volHeight;
      const y = h - marginBottom - vH;

      ctx.fillStyle = isBull ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)';
      ctx.fillRect(x - candleWidth / 2, y, candleWidth, vH);
    });

    // Candles
    visibleCandles.forEach((c, i) => {
      const x = getX(i);
      const openY = getY(c.open);
      const closeY = getY(c.close);
      const highY = getY(c.high);
      const lowY = getY(c.low);
      const isBull = c.close >= c.open;

      // Wick
      ctx.strokeStyle = isBull ? '#10B981' : '#EF4444';
      ctx.lineWidth = 1.5;
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

    // EMA 20 overlay line
    ctx.strokeStyle = '#3B82F6';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    visibleCandles.forEach((c, i) => {
      const x = getX(i);
      const y = getY(c.close * 0.998); // Approx EMA line for visualization
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Entry, Stop Loss, Take Profit Overlays
    if (entry) {
      const y = getY(entry);
      ctx.strokeStyle = '#38BDF8';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(marginLeft, y);
      ctx.lineTo(width - marginRight, y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#38BDF8';
      ctx.fillText(`ENTRY: ${entry}`, width - marginRight + 8, y + 3);
    }

    if (stopLoss) {
      const y = getY(stopLoss);
      ctx.strokeStyle = '#EF4444';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(marginLeft, y);
      ctx.lineTo(width - marginRight, y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#EF4444';
      ctx.fillText(`SL: ${stopLoss}`, width - marginRight + 8, y + 3);
    }

    if (takeProfit) {
      const y = getY(takeProfit);
      ctx.strokeStyle = '#10B981';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(marginLeft, y);
      ctx.lineTo(width - marginRight, y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#10B981';
      ctx.fillText(`TP: ${takeProfit}`, width - marginRight + 8, y + 3);
    }
  }, [candles, entry, stopLoss, takeProfit, height]);

  return (
    <div className="w-full relative overflow-hidden rounded-xl bg-[#0B111E] border border-gray-800">
      <canvas ref={canvasRef} style={{ width: '100%', height: `${height}px` }} />
    </div>
  );
};

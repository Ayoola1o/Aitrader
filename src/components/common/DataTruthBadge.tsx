'use client';

import React from 'react';
import { DataStatus } from '@/types/trading';

interface DataTruthBadgeProps {
  status: DataStatus;
  sourceName?: string;
  latencyMs?: number;
  className?: string;
  showDetails?: boolean;
}

export const DataTruthBadge: React.FC<DataTruthBadgeProps> = ({
  status = 'LIVE',
  sourceName,
  latencyMs,
  className = '',
  showDetails = true,
}) => {
  const badgeConfigs: Record<
    DataStatus,
    { label: string; dotClass: string; bgClass: string; textClass: string; borderClass: string }
  > = {
    LIVE: {
      label: 'LIVE',
      dotClass: 'bg-emerald-400 animate-pulse',
      bgClass: 'bg-emerald-500/10',
      textClass: 'text-emerald-400',
      borderClass: 'border-emerald-500/30',
    },
    DELAYED: {
      label: 'DELAYED (15m)',
      dotClass: 'bg-amber-400',
      bgClass: 'bg-amber-500/10',
      textClass: 'text-amber-400',
      borderClass: 'border-amber-500/30',
    },
    HISTORICAL: {
      label: 'HISTORICAL',
      dotClass: 'bg-cyan-400',
      bgClass: 'bg-cyan-500/10',
      textClass: 'text-cyan-400',
      borderClass: 'border-cyan-500/30',
    },
    SIMULATED: {
      label: 'SIMULATED (DEMO)',
      dotClass: 'bg-purple-400',
      bgClass: 'bg-purple-500/10',
      textClass: 'text-purple-400',
      borderClass: 'border-purple-500/30',
    },
    STALE: {
      label: 'STALE DATA',
      dotClass: 'bg-orange-500 animate-pulse',
      bgClass: 'bg-orange-500/10',
      textClass: 'text-orange-400',
      borderClass: 'border-orange-500/40',
    },
    UNAVAILABLE: {
      label: 'UNAVAILABLE',
      dotClass: 'bg-rose-500 animate-ping',
      bgClass: 'bg-rose-500/15',
      textClass: 'text-rose-400',
      borderClass: 'border-rose-500/40',
    },
  };

  const config = badgeConfigs[status] || badgeConfigs.LIVE;

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border transition-all ${config.bgClass} ${config.textClass} ${config.borderClass} ${className}`}
      title={`Market Data Truth Status: ${config.label}${latencyMs ? ` · Latency: ${latencyMs}ms` : ''}${sourceName ? ` · Source: ${sourceName}` : ''}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${config.dotClass}`} />
      <span>{config.label}</span>
      {showDetails && latencyMs !== undefined && latencyMs > 0 && (
        <span className="text-[9px] font-mono text-gray-400 ml-0.5">({latencyMs}ms)</span>
      )}
    </div>
  );
};

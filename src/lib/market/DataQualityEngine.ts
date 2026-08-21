import { DataQuality, DataStatus, AppMode, Candle } from '@/types/trading';
import { MarketDataQualityStatus } from './providers/types';

const STALE_THRESHOLD_MS = 25000; // 25 seconds tolerance for network jitter

export class DataQualityEngine {
  checkFreshness(lastUpdated: number): DataStatus {
    const age = Date.now() - lastUpdated;
    if (age > STALE_THRESHOLD_MS) return 'STALE';
    return 'LIVE';
  }

  /**
   * Evaluates comprehensive market data quality state (Phase 4 Market Data Infrastructure)
   */
  evaluateQualityState(params: {
    price: number;
    bid: number;
    ask: number;
    spreadPercent: number;
    latencyMs: number;
    lastUpdated: number;
    isConnected: boolean;
  }): MarketDataQualityStatus {
    const { price, bid, ask, spreadPercent, lastUpdated, isConnected } = params;

    if (!isConnected || price <= 0) return 'DISCONNECTED';

    // Crossed Market or invalid quote
    if (bid > 0 && ask > 0 && bid >= ask) return 'INVALID';
    if (price <= 0 || isNaN(price)) return 'INVALID';

    // Staleness
    const age = Date.now() - lastUpdated;
    if (age > STALE_THRESHOLD_MS) return 'STALE';

    // Degraded state: abnormal spread (> 2.0%) or high latency
    if (spreadPercent > 2.0 || age > 10000) return 'DEGRADED';

    return 'HEALTHY';
  }

  /**
   * Check for crossed markets (bid >= ask)
   */
  checkCrossedMarket(bid: number, ask: number): boolean {
    if (bid <= 0 || ask <= 0) return false;
    return bid >= ask;
  }

  /**
   * Check for abnormal spread
   */
  checkAbnormalSpread(spreadPercent: number, maxSpreadLimit = 2.0): boolean {
    return spreadPercent > maxSpreadLimit;
  }

  /**
   * Detect sequence gaps or missing candles in historical time series
   */
  detectMissingCandles(candles: Candle[], expectedIntervalMs = 3600000): { hasGaps: boolean; missingCount: number } {
    if (!candles || candles.length < 2) return { hasGaps: false, missingCount: 0 };

    let missingCount = 0;
    for (let i = 1; i < candles.length; i++) {
      const delta = candles[i].time - candles[i - 1].time;
      if (delta > expectedIntervalMs * 1.5) {
        const skipped = Math.round(delta / expectedIntervalMs) - 1;
        missingCount += Math.max(1, skipped);
      }
    }

    return {
      hasGaps: missingCount > 0,
      missingCount,
    };
  }

  buildQuality(fields: {
    tickerAge: number | null;
    orderBookAge: number | null;
    tradesAge: number | null;
    candlesAge: number | null;
    source: 'binance' | 'binance-us' | 'coinbase' | 'kraken' | 'alpaca' | 'simulated' | 'none';
    appMode?: AppMode;
  }): DataQuality {
    const toStatus = (age: number | null): DataStatus => {
      if (age === null) return 'UNAVAILABLE';
      if (fields.source === 'simulated') return 'SIMULATED';
      if (fields.source === 'none') return 'UNAVAILABLE';
      if (age <= STALE_THRESHOLD_MS) return 'LIVE';
      return 'STALE';
    };

    const tickerStatus = toStatus(fields.tickerAge);
    const orderBookStatus = toStatus(fields.orderBookAge);
    const tradesStatus = toStatus(fields.tradesAge);
    const candlesStatus = toStatus(fields.candlesAge);

    // In DEMO mode, simulated data is valid and never criticalStale
    const isCriticalStale =
      fields.appMode === 'DEMO'
        ? false
        : (tickerStatus === 'STALE' || tickerStatus === 'UNAVAILABLE');

    // Score: live = 25 pts, delayed = 15 pts, simulated = 10 pts
    const score = (s: DataStatus) =>
      s === 'LIVE' ? 25 : s === 'DELAYED' ? 15 : s === 'SIMULATED' ? 10 : 0;

    const overallScore = Math.min(
      100,
      score(tickerStatus) +
      score(orderBookStatus) +
      score(tradesStatus) +
      score(candlesStatus)
    );

    return {
      tickerStatus,
      orderBookStatus,
      tradesStatus,
      candlesStatus,
      fundingStatus: 'UNAVAILABLE',
      openInterestStatus: 'UNAVAILABLE',
      macroStatus: 'UNAVAILABLE',
      overallScore: fields.appMode === 'DEMO' ? 95 : overallScore,
      criticalStale: isCriticalStale,
      lastUpdated: Date.now(),
    };
  }
}

export const dataQualityEngine = new DataQualityEngine();

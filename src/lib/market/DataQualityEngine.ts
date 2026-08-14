import { DataQuality, DataStatus, AppMode } from '@/types/trading';

const STALE_THRESHOLD_MS = 25000; // 25 seconds tolerance for network jitter

export class DataQualityEngine {
  checkFreshness(lastUpdated: number): DataStatus {
    const age = Date.now() - lastUpdated;
    if (age > STALE_THRESHOLD_MS) return 'STALE';
    return 'LIVE';
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

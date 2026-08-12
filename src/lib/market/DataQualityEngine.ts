import { DataQuality, DataStatus, AppMode } from '@/types/trading';

const STALE_THRESHOLD_MS = 8000; // 8 seconds

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
    source: 'binance' | 'alpaca' | 'simulated' | 'none';
  }): DataQuality {
    const toStatus = (age: number | null): DataStatus => {
      if (age === null) return 'UNAVAILABLE';
      if (fields.source === 'simulated') return 'SIMULATED';
      if (fields.source === 'none') return 'UNAVAILABLE';
      return this.checkFreshness(Date.now() - age);
    };

    const tickerStatus = toStatus(fields.tickerAge);
    const orderBookStatus = toStatus(fields.orderBookAge);
    const tradesStatus = toStatus(fields.tradesAge);
    const candlesStatus = toStatus(fields.candlesAge);

    const isCriticalStale =
      tickerStatus === 'STALE' ||
      tickerStatus === 'UNAVAILABLE';

    // Score: each live field = 20 pts, simulated = 5 pts
    const score = (s: DataStatus) =>
      s === 'LIVE' ? 25 : s === 'DELAYED' ? 15 : s === 'SIMULATED' ? 5 : 0;

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
      overallScore,
      criticalStale: isCriticalStale,
      lastUpdated: Date.now(),
    };
  }
}

export const dataQualityEngine = new DataQualityEngine();

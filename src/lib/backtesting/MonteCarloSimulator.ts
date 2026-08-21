import { SimulatedTradeRecord } from './QuantMetricsCalculator';

export interface MonteCarloResult {
  iterations: number;
  confidenceLevels: {
    p5: { finalEquity: number; maxDrawdownPercent: number };
    p50: { finalEquity: number; maxDrawdownPercent: number };
    p95: { finalEquity: number; maxDrawdownPercent: number };
  };
  ruinProbabilityPercent: number; // Probability of losing >= 50% capital
}

export class MonteCarloSimulator {
  /**
   * Runs Monte Carlo permutation resampling on trade results (Phase 5 Robustness Testing).
   */
  static simulate(
    trades: SimulatedTradeRecord[],
    initialCapital = 100000.0,
    iterations = 1000,
    seed = 42
  ): MonteCarloResult {
    if (trades.length === 0) {
      return {
        iterations: 0,
        confidenceLevels: {
          p5: { finalEquity: initialCapital, maxDrawdownPercent: 0 },
          p50: { finalEquity: initialCapital, maxDrawdownPercent: 0 },
          p95: { finalEquity: initialCapital, maxDrawdownPercent: 0 },
        },
        ruinProbabilityPercent: 0,
      };
    }

    const pnls = trades.map((t) => t.realizedPnL);
    const finalEquities: number[] = [];
    const maxDrawdowns: number[] = [];
    let ruinCount = 0;

    // Simple deterministic pseudo-random number generator (PRNG) using seed
    let s = seed;
    const random = () => {
      s = (s * 1664525 + 1013904223) % 4294967296;
      return s / 4294967296;
    };

    for (let iter = 0; iter < iterations; iter++) {
      let equity = initialCapital;
      let peak = initialCapital;
      let maxDd = 0;

      // Resample trade sequence with replacement
      for (let i = 0; i < pnls.length; i++) {
        const randomIndex = Math.floor(random() * pnls.length);
        const pnl = pnls[randomIndex];
        equity += pnl;

        if (equity > peak) {
          peak = equity;
        } else {
          const dd = peak > 0 ? ((peak - equity) / peak) * 100 : 0;
          if (dd > maxDd) maxDd = dd;
        }
      }

      finalEquities.push(equity);
      maxDrawdowns.push(maxDd);

      if (maxDd >= 50.0) {
        ruinCount++;
      }
    }

    finalEquities.sort((a, b) => a - b);
    maxDrawdowns.sort((a, b) => a - b);

    const getPercentile = (arr: number[], pct: number) => {
      const idx = Math.floor((pct / 100) * (arr.length - 1));
      return arr[idx];
    };

    return {
      iterations,
      confidenceLevels: {
        p5: {
          finalEquity: Number(getPercentile(finalEquities, 5).toFixed(2)),
          maxDrawdownPercent: Number(getPercentile(maxDrawdowns, 95).toFixed(2)), // 95th percentile worst drawdown
        },
        p50: {
          finalEquity: Number(getPercentile(finalEquities, 50).toFixed(2)),
          maxDrawdownPercent: Number(getPercentile(maxDrawdowns, 50).toFixed(2)),
        },
        p95: {
          finalEquity: Number(getPercentile(finalEquities, 95).toFixed(2)),
          maxDrawdownPercent: Number(getPercentile(maxDrawdowns, 5).toFixed(2)),
        },
      },
      ruinProbabilityPercent: Number(((ruinCount / iterations) * 100).toFixed(2)),
    };
  }
}

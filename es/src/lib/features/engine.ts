import { MarketSnapshot, FeatureVector, Candle } from '@/types/trading';

export class FeatureEngine {
  public calculateFeatures(snapshot: MarketSnapshot): FeatureVector {
    const candles = snapshot.candles;
    const closes = candles.map((c) => c.close);
    const highs = candles.map((c) => c.high);
    const lows = candles.map((c) => c.low);
    const volumes = candles.map((c) => c.volume);
    const len = closes.length;

    // Technical Features
    const ema20 = this.calculateEMA(closes, 20);
    const ema50 = this.calculateEMA(closes, 50);
    const ema200 = this.calculateEMA(closes, Math.min(len, 100));
    const rsi = this.calculateRSI(closes, 14);
    const adx = this.calculateADX(highs, lows, closes, 14);
    const vwap = this.calculateVWAP(candles);
    const { support, resistance } = this.calculateSupportResistance(candles);

    // Momentum Features
    const roc = len > 10 ? ((closes[len - 1] - closes[len - 11]) / closes[len - 11]) * 100 : 0;
    const ppo = ema50 > 0 ? ((ema20 - ema50) / ema50) * 100 : 0;
    const recentVol = volumes.slice(-3).reduce((a, b) => a + b, 0) / 3;
    const prevVol = volumes.slice(-8, -3).reduce((a, b) => a + b, 0) / 5;
    const volumeAcceleration = prevVol > 0 ? recentVol / prevVol : 1;
    const momentumDivergence = rsi > 70 && closes[len - 1] > closes[len - 5];

    // Volatility Features
    const atr = this.calculateATR(highs, lows, closes, 14);
    const returns = [];
    for (let i = 1; i < len; i++) {
      returns.push(Math.log(closes[i] / closes[i - 1]));
    }
    const stdDev = this.calculateStdDev(returns);
    const realizedVol = stdDev * Math.sqrt(365 * 24 * 60) * 100;
    const volPercentile = Math.min(0.99, Math.max(0.1, realizedVol / 45));
    const bollingerExpansion = atr > (closes[len - 1] * 0.015);

    // Liquidity Features
    const spread = snapshot.orderBook.spread;
    const liquidityScore = Math.min(1.0, Math.max(0.2, 1 - (snapshot.orderBook.spreadPercent / 0.05)));
    const slippageRisk = snapshot.orderBook.spreadPercent > 0.03 ? 'HIGH' : snapshot.orderBook.spreadPercent > 0.01 ? 'MEDIUM' : 'LOW';
    const sweepDetected = Math.abs(snapshot.orderBook.bidAskImbalance) > 0.45;

    // Positioning Features
    const fundingDivergence = snapshot.fundingRate > 0.00025;
    const crowdedPositioning = snapshot.longShortRatio > 1.8 ? 'LONG' : snapshot.longShortRatio < 0.7 ? 'SHORT' : 'NONE';

    // Macro & Event Risk Features
    const dxyIndex = 104.2;
    const vixProxy = 14.8;
    const macroRisk = snapshot.fundingRate > 0.0003 ? 'HIGH' : 'MEDIUM';
    const minutesToNextEvent = 120; // 2 hours to next simulated macro release
    const newsImpactScore = 0.35;

    return {
      ema20: Number(ema20.toFixed(2)),
      ema50: Number(ema50.toFixed(2)),
      ema200: Number(ema200.toFixed(2)),
      rsi: Number(rsi.toFixed(1)),
      adx: Number(adx.toFixed(1)),
      vwap: Number(vwap.toFixed(2)),
      supportLevel: Number(support.toFixed(2)),
      resistanceLevel: Number(resistance.toFixed(2)),
      roc: Number(roc.toFixed(2)),
      ppo: Number(ppo.toFixed(2)),
      volumeAcceleration: Number(volumeAcceleration.toFixed(2)),
      momentumDivergence,
      atr: Number(atr.toFixed(2)),
      realizedVol: Number(realizedVol.toFixed(2)),
      volPercentile: Number(volPercentile.toFixed(2)),
      bollingerExpansion,
      spread: Number(spread.toFixed(4)),
      liquidityScore: Number(liquidityScore.toFixed(2)),
      slippageRisk,
      sweepDetected,
      fundingDivergence,
      crowdedPositioning,
      dxyIndex,
      vixProxy,
      macroRisk,
      minutesToNextEvent,
      newsImpactScore,
    };
  }

  private calculateEMA(values: number[], period: number): number {
    if (values.length === 0) return 0;
    const k = 2 / (period + 1);
    let ema = values[0];
    for (let i = 1; i < values.length; i++) {
      ema = values[i] * k + ema * (1 - k);
    }
    return ema;
  }

  private calculateRSI(values: number[], period: number = 14): number {
    if (values.length <= period) return 50;
    let gains = 0;
    let losses = 0;

    for (let i = values.length - period; i < values.length; i++) {
      const diff = values[i] - values[i - 1];
      if (diff >= 0) gains += diff;
      else losses -= diff;
    }

    if (losses === 0) return 100;
    const rs = gains / losses;
    return 100 - 100 / (1 + rs);
  }

  private calculateADX(highs: number[], lows: number[], closes: number[], period: number = 14): number {
    if (closes.length <= period) return 25;
    let sumTR = 0;
    for (let i = closes.length - period; i < closes.length; i++) {
      const tr = Math.max(
        highs[i] - lows[i],
        Math.abs(highs[i] - closes[i - 1]),
        Math.abs(lows[i] - closes[i - 1])
      );
      sumTR += tr;
    }
    const avgTR = sumTR / period;
    const currentClose = closes[closes.length - 1];
    return Math.min(60, Math.max(15, (avgTR / currentClose) * 1500));
  }

  private calculateVWAP(candles: Candle[]): number {
    let sumPV = 0;
    let sumV = 0;
    const recent = candles.slice(-30);
    for (const c of recent) {
      const typical = (c.high + c.low + c.close) / 3;
      sumPV += typical * c.volume;
      sumV += c.volume;
    }
    return sumV > 0 ? sumPV / sumV : candles[candles.length - 1].close;
  }

  private calculateSupportResistance(candles: Candle[]) {
    const recent = candles.slice(-20);
    const support = Math.min(...recent.map((c) => c.low));
    const resistance = Math.max(...recent.map((c) => c.high));
    return { support, resistance };
  }

  private calculateATR(highs: number[], lows: number[], closes: number[], period: number = 14): number {
    if (closes.length <= period) return highs[highs.length - 1] - lows[lows.length - 1];
    let sumTR = 0;
    for (let i = closes.length - period; i < closes.length; i++) {
      const tr = Math.max(
        highs[i] - lows[i],
        Math.abs(highs[i] - closes[i - 1]),
        Math.abs(lows[i] - closes[i - 1])
      );
      sumTR += tr;
    }
    return sumTR / period;
  }

  private calculateStdDev(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }
}

export const featureEngine = new FeatureEngine();

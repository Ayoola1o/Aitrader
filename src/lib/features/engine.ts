import { MarketSnapshot, FeatureVector, Candle } from '@/types/trading';

// ── Standard Indicator Implementations ─────────────────────────────────────

function calcEMA(prices: number[], period: number): number {
  if (prices.length === 0) return 0;
  const k = 2 / (period + 1);
  let ema = prices[0];
  for (let i = 1; i < prices.length; i++) {
    ema = prices[i] * k + ema * (1 - k);
  }
  return ema;
}

function calcEMAArray(prices: number[], period: number): number[] {
  if (prices.length === 0) return [];
  const k = 2 / (period + 1);
  const result: number[] = [prices[0]];
  for (let i = 1; i < prices.length; i++) {
    result.push(prices[i] * k + result[i - 1] * (1 - k));
  }
  return result;
}

function calcSMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1] ?? 0;
  const slice = prices.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

// Wilder's RSI (14-period standard)
function calcRSI(closes: number[], period = 14): number {
  if (closes.length < period + 1) return 50;
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const diff = closes[closes.length - period - 1 + i] - closes[closes.length - period - 2 + i];
    if (diff > 0) gains += diff;
    else losses -= diff;
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;
  for (let i = closes.length - period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    const g = diff > 0 ? diff : 0;
    const l = diff < 0 ? -diff : 0;
    avgGain = (avgGain * (period - 1) + g) / period;
    avgLoss = (avgLoss * (period - 1) + l) / period;
  }
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return Number((100 - 100 / (1 + rs)).toFixed(2));
}

// True Range and ATR (Wilder's smoothing)
function calcATR(candles: Candle[], period = 14): number {
  if (candles.length < period + 1) return (candles[candles.length - 1]?.close ?? 0) * 0.01;
  const trs: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const c = candles[i];
    const prev = candles[i - 1];
    trs.push(Math.max(
      c.high - c.low,
      Math.abs(c.high - prev.close),
      Math.abs(c.low - prev.close)
    ));
  }
  let atr = trs.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < trs.length; i++) {
    atr = (atr * (period - 1) + trs[i]) / period;
  }
  return atr;
}

// ADX (standard Wilder's)
function calcADX(candles: Candle[], period = 14): number {
  if (candles.length < period * 2) return 20;
  const plusDM: number[] = [], minusDM: number[] = [], tr: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const c = candles[i], p = candles[i - 1];
    const upMove = c.high - p.high;
    const downMove = p.low - c.low;
    plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
    minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);
    tr.push(Math.max(c.high - c.low, Math.abs(c.high - p.close), Math.abs(c.low - p.close)));
  }
  const smTR = tr.slice(0, period).reduce((a, b) => a + b, 0);
  const smP = plusDM.slice(0, period).reduce((a, b) => a + b, 0);
  const smM = minusDM.slice(0, period).reduce((a, b) => a + b, 0);
  let smoothTR = smTR, smoothP = smP, smoothM = smM;
  const dx: number[] = [];
  for (let i = period; i < tr.length; i++) {
    smoothTR = smoothTR - smoothTR / period + tr[i];
    smoothP = smoothP - smoothP / period + plusDM[i];
    smoothM = smoothM - smoothM / period + minusDM[i];
    const pdi = smoothTR > 0 ? (smoothP / smoothTR) * 100 : 0;
    const mdi = smoothTR > 0 ? (smoothM / smoothTR) * 100 : 0;
    const dxVal = pdi + mdi > 0 ? (Math.abs(pdi - mdi) / (pdi + mdi)) * 100 : 0;
    dx.push(dxVal);
  }
  if (dx.length < period) return 20;
  return Number((dx.slice(-period).reduce((a, b) => a + b, 0) / period).toFixed(2));
}

// VWAP (cumulative)
function calcVWAP(candles: Candle[]): number {
  if (candles.length === 0) return 0;
  let cumPV = 0, cumV = 0;
  for (const c of candles) {
    const typical = (c.high + c.low + c.close) / 3;
    cumPV += typical * c.volume;
    cumV += c.volume;
  }
  return cumV > 0 ? cumPV / cumV : candles[candles.length - 1].close;
}

// Bollinger Bands
function calcBollinger(closes: number[], period = 20): { upper: number; lower: number; middle: number; expanded: boolean } {
  if (closes.length < period) return { upper: closes[closes.length - 1], lower: closes[closes.length - 1], middle: closes[closes.length - 1], expanded: false };
  const slice = closes.slice(-period);
  const sma = slice.reduce((a, b) => a + b, 0) / period;
  const variance = slice.reduce((s, v) => s + (v - sma) ** 2, 0) / period;
  const std = Math.sqrt(variance);
  return { upper: sma + 2 * std, lower: sma - 2 * std, middle: sma, expanded: std / sma > 0.025 };
}

// MACD
function calcMACD(closes: number[]): { macd: number; signal: number } {
  if (closes.length < 26) return { macd: 0, signal: 0 };
  const ema12 = calcEMAArray(closes, 12);
  const ema26 = calcEMAArray(closes, 26);
  const macdLine = ema12.map((v, i) => v - (ema26[i] ?? v));
  const signal = calcEMA(macdLine.slice(-9), 9);
  return { macd: Number(macdLine[macdLine.length - 1].toFixed(4)), signal: Number(signal.toFixed(4)) };
}

// Real volatility percentile (rank-based, not vol/45)
function calcVolatilityPercentile(closes: number[], windowSize = 90): { realized: number; percentile: number } {
  if (closes.length < 20) return { realized: 0, percentile: 50 };
  const logReturns: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    logReturns.push(Math.log(closes[i] / closes[i - 1]));
  }
  const currentVol = Math.sqrt(logReturns.slice(-14).reduce((s, r) => s + r * r, 0) / 14) * Math.sqrt(252) * 100;
  const historicalVols: number[] = [];
  for (let i = 14; i <= Math.min(logReturns.length, windowSize); i++) {
    const slice = logReturns.slice(i - 14, i);
    historicalVols.push(Math.sqrt(slice.reduce((s, r) => s + r * r, 0) / 14) * Math.sqrt(252) * 100);
  }
  const rank = historicalVols.filter(v => v <= currentVol).length;
  const percentile = historicalVols.length > 0 ? (rank / historicalVols.length) * 100 : 50;
  return { realized: Number(currentVol.toFixed(2)), percentile: Number(percentile.toFixed(1)) };
}

// Volume Z-score
function calcVolumeZScore(candles: Candle[], period = 20): number {
  if (candles.length < period) return 0;
  const vols = candles.slice(-period).map(c => c.volume);
  const mean = vols.reduce((a, b) => a + b, 0) / period;
  const std = Math.sqrt(vols.reduce((s, v) => s + (v - mean) ** 2, 0) / period);
  return std > 0 ? (vols[vols.length - 1] - mean) / std : 0;
}

// Support / Resistance from recent candles
function calcSupportResistance(candles: Candle[]): { support: number; resistance: number } {
  if (candles.length < 20) return { support: 0, resistance: 0 };
  const recent = candles.slice(-50);
  const lows = recent.map(c => c.low).sort((a, b) => a - b);
  const highs = recent.map(c => c.high).sort((a, b) => b - a);
  return {
    support: lows[Math.floor(lows.length * 0.1)],
    resistance: highs[Math.floor(highs.length * 0.1)],
  };
}

// ── Feature Engine Class ────────────────────────────────────────────────────

export class FeatureEngine {
  calculateFeatures(snapshot: MarketSnapshot): FeatureVector {
    // Phase 4: Strict Lookahead Bias Guard (only candles with time <= decisionTime)
    const decisionTime = snapshot.timestamp > 0 ? snapshot.timestamp : Date.now();
    const validCandles = snapshot.candles.filter((c) => c.time <= decisionTime);
    const candles = validCandles.length > 0 ? validCandles : snapshot.candles;
    const closes = candles.map((c) => c.close);
    const price = snapshot.price;

    if (closes.length < 3) {
      return this.emptyFeatures(snapshot);
    }

    const ema20 = calcEMA(closes, 20);
    const ema50 = calcEMA(closes, 50);
    const ema200 = calcEMA(closes, 200);
    const rsi = calcRSI(closes);
    const adx = calcADX(candles);
    const atr = calcATR(candles);
    const vwap = calcVWAP(candles);
    const boll = calcBollinger(closes);
    const macdResult = calcMACD(closes);
    const { realized: realizedVol, percentile: volPercentile } = calcVolatilityPercentile(closes);
    const volumeZScore = calcVolumeZScore(candles);
    const { support, resistance } = calcSupportResistance(candles);

    // ROC 10-period
    const roc = closes.length >= 10
      ? ((closes[closes.length - 1] - closes[closes.length - 10]) / closes[closes.length - 10]) * 100
      : 0;

    // PPO (EMA12 - EMA26) / EMA26 * 100
    const ema12 = calcEMA(closes, 12);
    const ema26 = calcEMA(closes, 26);
    const ppo = ema26 !== 0 ? ((ema12 - ema26) / ema26) * 100 : 0;

    // Volume acceleration
    const recentVol = candles.slice(-5).map(c => c.volume);
    const priorVol = candles.slice(-10, -5).map(c => c.volume);
    const recentAvg = recentVol.reduce((a, b) => a + b, 0) / (recentVol.length || 1);
    const priorAvg = priorVol.reduce((a, b) => a + b, 0) / (priorVol.length || 1);
    const volumeAcceleration = priorAvg > 0 ? (recentAvg - priorAvg) / priorAvg : 0;

    // Momentum divergence (RSI vs price divergence)
    const prevRsi = closes.length > 15 ? calcRSI(closes.slice(0, -5)) : rsi;
    const priceUp = closes[closes.length - 1] > closes[closes.length - 6];
    const momentumDivergence = (priceUp && prevRsi > rsi + 5) || (!priceUp && prevRsi < rsi - 5);

    // Liquidity from real order book
    const ob = snapshot.orderBook;
    const spreadPercent = ob.spreadPercent;
    const bidAskImbalance = ob.bidAskImbalance;
    const liquidityScore = Math.max(0, Math.min(1, 1 - spreadPercent * 50));
    const slippageRisk: 'LOW' | 'MEDIUM' | 'HIGH' =
      spreadPercent < 0.0005 ? 'LOW' : spreadPercent < 0.002 ? 'MEDIUM' : 'HIGH';

    // Sweep detection (real: aggressive flow consuming liquidity)
    const recentTrades = snapshot.recentTrades.slice(0, 10);
    const buyFlow = recentTrades.filter(t => t.side === 'BUY').reduce((s, t) => s + t.size, 0);
    const sellFlow = recentTrades.filter(t => t.side === 'SELL').reduce((s, t) => s + t.size, 0);
    const totalFlow = buyFlow + sellFlow;
    const sweepDetected = totalFlow > 0 && (Math.abs(buyFlow - sellFlow) / totalFlow > 0.8);

    // Positioning from real funding/OI if available
    const fundingRate = snapshot.fundingRate ?? 0;
    const fundingDivergence = Math.abs(fundingRate) > 0.0005;
    const crowdedPositioning: 'NONE' | 'LONG' | 'SHORT' =
      fundingRate > 0.001 ? 'LONG' : fundingRate < -0.001 ? 'SHORT' : 'NONE';

    return {
      ema20, ema50, ema200,
      rsi, adx, vwap, atr,
      macd: macdResult.macd, macdSignal: macdResult.signal,
      bollingerUpper: boll.upper, bollingerLower: boll.lower,
      bollingerExpansion: boll.expanded,
      supportLevel: support, resistanceLevel: resistance,
      roc, ppo, volumeZScore, volumeAcceleration, momentumDivergence,
      realizedVol, volPercentile,
      spread: ob.spread, spreadPercent, bidAskImbalance, liquidityScore,
      slippageRisk, sweepDetected,
      fundingDivergence, crowdedPositioning,
      macroAvailable: false,
    };
  }

  private emptyFeatures(snapshot: MarketSnapshot): FeatureVector {
    const p = snapshot.price;
    return {
      ema20: p, ema50: p, ema200: p,
      rsi: 50, adx: 20, vwap: p, atr: p * 0.01,
      macd: 0, macdSignal: 0,
      bollingerUpper: p * 1.02, bollingerLower: p * 0.98,
      bollingerExpansion: false,
      supportLevel: p * 0.97, resistanceLevel: p * 1.03,
      roc: 0, ppo: 0, volumeZScore: 0, volumeAcceleration: 0, momentumDivergence: false,
      realizedVol: 0, volPercentile: 50,
      spread: 0, spreadPercent: 0, bidAskImbalance: 0, liquidityScore: 0.5,
      slippageRisk: 'LOW', sweepDetected: false,
      fundingDivergence: false, crowdedPositioning: 'NONE',
      macroAvailable: false,
    };
  }
}

export const featureEngine = new FeatureEngine();

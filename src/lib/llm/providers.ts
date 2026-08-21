import {
  MarketSnapshot, FeatureVector, AgentSignal, SignalFusionResult,
  LLMDecision, RegimeType, ActionType
} from '@/types/trading';

export type AIProviderId = 'mock' | 'openai' | 'anthropic' | 'google';

export interface AIProviderConfig {
  provider: AIProviderId;
  apiKey?: string;
}

// ── Compact Evidence Packet (what the LLM receives) ──────────────────────────
function buildEvidencePacket(
  snapshot: MarketSnapshot,
  features: FeatureVector,
  signals: AgentSignal[],
  fusion: SignalFusionResult,
  regime: RegimeType
): string {
  const available = signals.filter(s => s.dataQuality !== 'UNAVAILABLE');
  return JSON.stringify({
    market: {
      symbol: snapshot.symbol,
      price: snapshot.price,
      spread_pct: (features.spreadPercent * 100).toFixed(4) + '%',
      change_24h: snapshot.change24h + '%',
      data_quality: snapshot.dataQuality.overallScore + '%',
    },
    regime: { type: regime, adx: features.adx, ema_stack: features.ema20 > features.ema50 ? 'bullish' : 'bearish' },
    technical: { rsi: features.rsi, macd: features.macd > features.macdSignal ? 'bullish' : 'bearish', ema20: features.ema20, ema50: features.ema50 },
    momentum: { roc: features.roc.toFixed(2) + '%', volume_z: features.volumeZScore.toFixed(2), divergence: features.momentumDivergence },
    liquidity: { imbalance: features.bidAskImbalance.toFixed(3), slippage_risk: features.slippageRisk, sweep: features.sweepDetected },
    volatility: { realized: features.realizedVol + '%', percentile: features.volPercentile + '%', atr: features.atr },
    macro: { status: 'UNAVAILABLE' },
    agent_fusion: {
      buy_score: fusion.buyScore,
      sell_score: fusion.sellScore,
      confidence: fusion.confidence,
      dominant: fusion.dominantAction,
      conflict: fusion.conflictingSignals,
    },
    agents: available.map(s => ({
      id: s.agentId,
      action: s.action,
      confidence: s.confidence,
      evidence: s.evidence.slice(0, 3).map(e => `${e.label}: ${e.value}`),
    })),
  });
}

// ── Deterministic Synthesizer (no API) ───────────────────────────────────────
function deterministicDecision(
  snapshot: MarketSnapshot,
  features: FeatureVector,
  fusion: SignalFusionResult,
  regime: RegimeType
): LLMDecision {
  const price = snapshot.price;
  const atr = features.atr > 0 ? features.atr : price * 0.012;
  const action = fusion.dominantAction;

  if (action === 'HOLD' || action === 'NO_TRADE') {
    return {
      action,
      confidence: fusion.confidence,
      entry: null, stopLoss: null, takeProfit: null,
      riskPercent: 0, positionSize: 0, riskReward: 0,
      reasoning: [
        fusion.abstainReason ?? 'Market conditions do not meet edge requirements.',
        `Regime: ${regime}. Fusion confidence: ${(fusion.confidence * 100).toFixed(0)}%.`,
      ],
      invalidation: ['Breakout above key pivot level', 'Volume surge with directional confirmation'],
      timeHorizon: 'INTRADAY', regime,
    };
  }

  const isLong = action === 'BUY';
  const stopDistance = atr * 1.5;
  const stopLoss = Number((isLong ? price - stopDistance : price + stopDistance).toFixed(price > 100 ? 2 : 5));
  const takeProfit = Number((isLong ? price + stopDistance * 2.5 : price - stopDistance * 2.5).toFixed(price > 100 ? 2 : 5));
  const riskReward = stopDistance > 0 ? 2.5 : 0;

  return {
    action,
    confidence: fusion.confidence,
    entry: price, stopLoss, takeProfit,
    riskPercent: 0.5, riskReward,
    reasoning: [
      `${regime} regime confirmed. ADX: ${features.adx.toFixed(1)}.`,
      `RSI ${features.rsi.toFixed(1)} — ${features.rsi < 35 ? 'oversold' : features.rsi > 65 ? 'overbought' : 'neutral range'}.`,
      `Liquidity: ${features.slippageRisk} slippage risk. Spread: ${(features.spreadPercent * 100).toFixed(4)}%.`,
    ],
    invalidation: [
      `Price closes beyond stop at $${stopLoss}.`,
      `Spread expands beyond 0.05%.`,
      `ADX drops below 18 (regime invalidation).`,
    ],
    timeHorizon: 'INTRADAY', regime,
  };
}

// ── LLM System Prompt ─────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are a quantitative market decision moderator.

RULES (non-negotiable):
1. You MUST only use evidence supplied in the structured input.
2. You MUST NOT invent: prices, indicators, OI, funding, news, macro data, or liquidity conditions.
3. If required information is UNAVAILABLE, state it explicitly — do not fabricate.
4. When evidence conflicts materially, you MUST return NO_TRADE.
5. Your decision is ADVISORY — the risk engine has final authority.

Respond ONLY in valid JSON matching this schema:
{
  "action": "BUY"|"SELL"|"HOLD"|"NO_TRADE",
  "confidence": 0.0-1.0,
  "entry": number|null,
  "stopLoss": number|null,
  "takeProfit": number|null,
  "riskPercent": 0.1-2.0,
  "reasoning": ["string", ...],
  "invalidation": ["string", ...],
  "timeHorizon": "SCALP"|"INTRADAY"|"SWING"
}`;

// ── AI Provider Manager ───────────────────────────────────────────────────────
export class AIProviderManager {
  private config: AIProviderConfig = { provider: 'mock' };

  setConfig(config: AIProviderConfig) {
    this.config = config;
    if (typeof window !== 'undefined') {
      localStorage.setItem('aitrader_ai_provider', config.provider);
      localStorage.removeItem('aitrader_ai_api_key');
    }
  }

  getConfig(): AIProviderConfig {
    if (typeof window !== 'undefined') {
      const p = localStorage.getItem('aitrader_ai_provider') as AIProviderId;
      if (p) return { provider: p, apiKey: this.config.apiKey };
    }
    return this.config;
  }

  getAvailableProviders(): string[] {
    const cfg = this.getConfig();
    const list: string[] = [];
    if (cfg.provider !== 'mock' && cfg.apiKey) {
      list.push(cfg.provider.toUpperCase());
    }
    if (list.length === 0) {
      list.push('Multi-Agent Deterministic Engine');
    }
    return list;
  }

  async generateStructuredDecision(
    snapshot: MarketSnapshot,
    features: FeatureVector,
    signals: AgentSignal[],
    fusion: SignalFusionResult,
    regime: RegimeType
  ): Promise<LLMDecision> {
    // If data is critically stale → NO_TRADE immediately
    if (snapshot.dataQuality.criticalStale && snapshot.appMode === 'PAPER') {
      return {
        action: 'NO_TRADE', confidence: 1.0,
        entry: null, stopLoss: null, takeProfit: null, riskPercent: 0,
        reasoning: ['Critical market data is stale — trading halted per fail-closed policy.'],
        invalidation: ['Wait for live data reconnection.'],
        timeHorizon: 'INTRADAY', regime,
      };
    }

    const cfg = this.getConfig();
    const evidencePacket = buildEvidencePacket(snapshot, features, signals, fusion, regime);

    if (cfg.provider !== 'mock' && cfg.apiKey) {
      try {
        const result = await this.callProvider(cfg, evidencePacket, snapshot.price, regime);
        if (result) return result;
      } catch {
        // fall through to deterministic
      }
    }

    return deterministicDecision(snapshot, features, fusion, regime);
  }

  private async callProvider(
    cfg: AIProviderConfig,
    evidencePacket: string,
    currentPrice: number,
    regime: RegimeType
  ): Promise<LLMDecision | null> {
    const userMsg = `Market evidence packet:\n${evidencePacket}\n\nCurrent price: ${currentPrice}. Provide your trading decision.`;

    let rawText: string | null = null;

    if (cfg.provider === 'openai') {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${cfg.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: userMsg }],
          response_format: { type: 'json_object' },
          max_tokens: 600,
        }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      rawText = data.choices?.[0]?.message?.content;
    } else if (cfg.provider === 'anthropic') {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': cfg.apiKey!,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-3-5-haiku-20241022',
          max_tokens: 600,
          system: SYSTEM_PROMPT,
          messages: [{ role: 'user', content: userMsg }],
        }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      rawText = data.content?.[0]?.text;
    }

    if (!rawText) return null;

    try {
      const parsed = JSON.parse(rawText);
      // Validate required fields
      const validActions = ['BUY', 'SELL', 'HOLD', 'NO_TRADE'];
      if (!validActions.includes(parsed.action)) return null;
      if (typeof parsed.confidence !== 'number') return null;

      return {
        action: parsed.action as ActionType,
        confidence: Math.min(1, Math.max(0, parsed.confidence)),
        entry: typeof parsed.entry === 'number' ? parsed.entry : currentPrice,
        stopLoss: typeof parsed.stopLoss === 'number' ? parsed.stopLoss : null,
        takeProfit: typeof parsed.takeProfit === 'number' ? parsed.takeProfit : null,
        riskPercent: typeof parsed.riskPercent === 'number' ? Math.min(2, Math.max(0.1, parsed.riskPercent)) : 0.5,
        reasoning: Array.isArray(parsed.reasoning) ? parsed.reasoning.slice(0, 5) : ['LLM decision.'],
        invalidation: Array.isArray(parsed.invalidation) ? parsed.invalidation.slice(0, 3) : [],
        timeHorizon: ['SCALP', 'INTRADAY', 'SWING'].includes(parsed.timeHorizon) ? parsed.timeHorizon : 'INTRADAY',
        regime,
      };
    } catch {
      return null;
    }
  }
}

export const aiProviderManager = new AIProviderManager();

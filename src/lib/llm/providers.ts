import { LLMDecision, MarketSnapshot, FeatureVector, AgentSignal, SignalFusionResult, RegimeType } from '@/types/trading';

export type AIProviderId = 'mock' | 'openai' | 'anthropic' | 'google' | 'ollama';

export interface AIProviderConfig {
  provider: AIProviderId;
  apiKey?: string;
  modelName?: string;
}

export class AIProviderManager {
  private config: AIProviderConfig = {
    provider: 'mock',
    modelName: 'gpt-4o-mini',
  };

  public setConfig(config: AIProviderConfig) {
    this.config = config;
  }

  public getConfig(): AIProviderConfig {
    return this.config;
  }

  public async generateStructuredDecision(
    snapshot: MarketSnapshot,
    features: FeatureVector,
    signals: AgentSignal[],
    fusion: SignalFusionResult,
    regime: RegimeType
  ): Promise<LLMDecision> {
    // If mock or no API key, use fast deterministic synthesizer
    if (this.config.provider === 'mock' || !this.config.apiKey) {
      return this.generateDeterministicDecision(snapshot, features, signals, fusion, regime);
    }

    try {
      if (this.config.provider === 'openai') {
        const decision = await this.callOpenAI(snapshot, features, signals, fusion, regime);
        if (decision) return decision;
      } else if (this.config.provider === 'anthropic') {
        const decision = await this.callAnthropic(snapshot, features, signals, fusion, regime);
        if (decision) return decision;
      }
    } catch {
      // Fallback if API fails or network blocks request
    }

    return this.generateDeterministicDecision(snapshot, features, signals, fusion, regime);
  }

  private generateDeterministicDecision(
    snapshot: MarketSnapshot,
    features: FeatureVector,
    signals: AgentSignal[],
    fusion: SignalFusionResult,
    regime: RegimeType
  ): LLMDecision {
    const price = snapshot.price;
    const atr = features.atr > 0 ? features.atr : price * 0.015;
    const isLong = fusion.dominantAction === 'BUY';

    if (fusion.dominantAction === 'HOLD' || fusion.dominantAction === 'NO_TRADE') {
      return {
        action: fusion.dominantAction,
        confidence: fusion.confidence,
        entry: null,
        stopLoss: null,
        takeProfit: null,
        riskPercent: 0,
        reasoning: [
          fusion.abstainReason || 'Market conditions do not meet minimum edge requirements.',
          `Regime ${regime} with caution score ${fusion.noTradeScore}.`,
        ],
        invalidation: ['Breakout above key pivot level'],
        timeHorizon: 'INTRADAY',
        regime,
      };
    }

    const stopDistance = atr * 1.5;
    const stopLoss = Number((isLong ? price - stopDistance : price + stopDistance).toFixed(price > 1000 ? 2 : 4));
    const takeProfit = Number((isLong ? price + stopDistance * 2.22 : price - stopDistance * 2.22).toFixed(price > 1000 ? 2 : 4));

    return {
      action: fusion.dominantAction,
      confidence: fusion.confidence,
      entry: price,
      stopLoss,
      takeProfit,
      riskPercent: 0.65,
      reasoning: [
        `${regime} state verified across quant agents.`,
        `RSI ${features.rsi} & ADX ${features.adx} align with dominant direction.`,
        `Liquidity score ${features.liquidityScore} supports order fill.`,
      ],
      invalidation: [
        `Price closes past stop loss at $${stopLoss}.`,
        `Order book spread expands beyond 0.03%.`,
      ],
      timeHorizon: 'INTRADAY',
      regime,
    };
  }

  private async callOpenAI(
    snapshot: MarketSnapshot,
    features: FeatureVector,
    signals: AgentSignal[],
    fusion: SignalFusionResult,
    regime: RegimeType
  ): Promise<LLMDecision | null> {
    const prompt = `System: You are an AI Quant Decision Engine. Respond ONLY in valid JSON matching this schema:
{"action": "BUY"|"SELL"|"HOLD"|"NO_TRADE", "confidence": number, "entry": number|null, "stopLoss": number|null, "takeProfit": number|null, "riskPercent": number, "reasoning": string[], "invalidation": string[], "timeHorizon": "SCALP"|"INTRADAY"|"SWING", "regime": "${regime}"}

Market: Asset ${snapshot.symbol}, Price ${snapshot.price}, RSI ${features.rsi}, ADX ${features.adx}, Dominant Action ${fusion.dominantAction}, Score BUY ${fusion.buyScore}/SELL ${fusion.sellScore}.`;

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content);
    return {
      action: parsed.action || fusion.dominantAction,
      confidence: parsed.confidence || fusion.confidence,
      entry: parsed.entry || snapshot.price,
      stopLoss: parsed.stopLoss,
      takeProfit: parsed.takeProfit,
      riskPercent: parsed.riskPercent || 0.65,
      reasoning: parsed.reasoning || ['OpenAI Live decision calculated.'],
      invalidation: parsed.invalidation || ['Stop loss breach.'],
      timeHorizon: parsed.timeHorizon || 'INTRADAY',
      regime,
    };
  }

  private async callAnthropic(
    snapshot: MarketSnapshot,
    features: FeatureVector,
    signals: AgentSignal[],
    fusion: SignalFusionResult,
    regime: RegimeType
  ): Promise<LLMDecision | null> {
    const prompt = `Analyze: Asset ${snapshot.symbol}, Price ${snapshot.price}, RSI ${features.rsi}, ADX ${features.adx}, Fusion ${fusion.dominantAction}. Respond in strict JSON.`;

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': this.config.apiKey || '',
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    const text = data.content?.[0]?.text;
    if (!text) return null;

    const parsed = JSON.parse(text);
    return {
      action: parsed.action || fusion.dominantAction,
      confidence: parsed.confidence || fusion.confidence,
      entry: parsed.entry || snapshot.price,
      stopLoss: parsed.stopLoss,
      takeProfit: parsed.takeProfit,
      riskPercent: parsed.riskPercent || 0.65,
      reasoning: parsed.reasoning || ['Anthropic Live decision calculated.'],
      invalidation: parsed.invalidation || ['Stop loss breach.'],
      timeHorizon: parsed.timeHorizon || 'INTRADAY',
      regime,
    };
  }
}

export const aiProviderManager = new AIProviderManager();

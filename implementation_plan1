# Implementation Plan - AI Quant Trader Lite

**AI Quant Trader Lite** is a lightweight, high-performance quantitative trading and paper-trading application designed for Vercel deployment (<500 MB footprint target, optimized for <150 MB). It implements an evidence-based market decision architecture where deterministic market analysis, specialized quant agents, signal fusion, and hard risk gates surround a lightweight LLM decision layer.

---

## User Review Required

> [!IMPORTANT]
> **Key Architecture Decisions:**
> 1. **Framework & Stack**: Next.js 14+ (App Router), TypeScript, React, Tailwind CSS, Lucide Icons, Canvas/SVG charting.
> 2. **AI Provider Architecture**: Built-in mock LLM decision engine for zero-config offline running, combined with Vercel AI SDK integration for live LLM providers (e.g. OpenAI / Anthropic / Gemini).
> 3. **Standalone Architecture**: Initial setup as a self-contained Next.js workspace in `c:\Users\ASUS\Documents\Aitrader` with local storage and optional Redis/PostgreSQL adapter interface.

---

## Open Questions

> [!NOTE]
> No blocking open questions. Default sensible configurations (e.g., $10,000 initial paper trading balance, 84% default LLM confidence threshold, 2.0x min R:R) will be pre-configured and editable in the Settings page.

---

## Proposed Changes

### Core System Architecture

```text
MARKET ENGINE (WebSocket / Mock Ticker / OHLCV / Depth)
           │
           ▼
FEATURE ENGINE (Technical, Momentum, Volatility, Liquidity, Positioning, Structure, Macro)
           │
           ▼
SPECIALIST AGENTS (8 Quant & AI Analysis Modules)
           │
           ▼
SIGNAL FUSION ENGINE (Regime-aware weighted scoring & Abstention check)
           │
           ▼
LIGHTWEIGHT LLM MODERATOR (Structured JSON Output via Zod Schema)
           │
           ▼
HARD RISK GATE (Deterministic Risk Rules & Event Kill Switch)
     ┌─────┴─────┐
   REJECT      APPROVE
     │           │
     ▼           ▼
   HOLD     PAPER BROKER (Order Matching, Slippage, Fees, P&L, Portfolio)
                 │
                 ▼
          DECISION REPLAY & ANALYTICS DASHBOARD
```

---

### File Structure & Components

#### [NEW] [package.json](file:///c:/Users/ASUS/Documents/Aitrader/package.json)
- Project manifest with dependencies: `next`, `react`, `react-dom`, `lucide-react`, `zod`, `clsx`, `tailwind-merge`, `@ai-sdk/openai` (or `@ai-sdk/google`).

#### [NEW] [tailwind.config.js](file:///c:/Users/ASUS/Documents/Aitrader/tailwind.config.js) & [postcss.config.js](file:///c:/Users/ASUS/Documents/Aitrader/postcss.config.js)
- Dark mode trading theme configuration (emerald `#10B981` bullish, rose `#EF4444` bearish, slate `#0F172A` backgrounds, glassmorphism utilities).

#### [NEW] [src/types/trading.ts](file:///c:/Users/ASUS/Documents/Aitrader/src/types/trading.ts)
- TypeScript definitions for `MarketSnapshot`, `OHLCV`, `OrderBook`, `FeatureVector`, `AgentSignal`, `SignalFusionResult`, `LLMDecision`, `RiskCheckResult`, `Order`, `Position`, `TradeHistory`, `PortfolioState`, and `ReplayState`.

#### [NEW] [src/lib/market/engine.ts](file:///c:/Users/ASUS/Documents/Aitrader/src/lib/market/engine.ts)
- Market stream generator for crypto assets (BTCUSDT, ETHUSDT, SOLUSDT, XRPUSDT).
- Real-time tick generator, order book level 2 depth builder, time & sales streamer, historical OHLCV data generator.

#### [NEW] [src/lib/features/engine.ts](file:///c:/Users/ASUS/Documents/Aitrader/src/lib/features/engine.ts)
- Mathematical feature engine in pure TypeScript:
  - Technical: EMA 20/50/200, RSI(14), ADX(14), VWAP, Support & Resistance pivot levels.
  - Momentum: Rate of Change (ROC), PPO, Volume Acceleration, Divergence.
  - Volatility: ATR(14), Realized Volatility, Volatility Percentile, Bollinger Expansion.
  - Liquidity: Bid/Ask imbalance ratio, Order book depth, Spread %, Liquidity walls.
  - Positioning: Open Interest delta, Funding rate, Long/Short ratio, Liquidation clusters.

#### [NEW] [src/lib/agents/specialists.ts](file:///c:/Users/ASUS/Documents/Aitrader/src/lib/agents/specialists.ts)
- Implement 8 Specialist Agent modules:
  1. **Regime Agent**: Classifies market into `TRENDING_UP`, `TRENDING_DOWN`, `RANGING`, `HIGH_VOLATILITY`, `LOW_VOLATILITY`, `TRANSITION`.
  2. **Technical Agent**: Evaluates trend alignment, oscillator levels, VWAP position.
  3. **Liquidity Agent**: Evaluates order book imbalance, depth adequacy, sweep risk.
  4. **Positioning Agent**: Detects crowded long/short positioning, funding squeeze risk.
  5. **Momentum Agent**: Measures velocity, trend acceleration, breakout confirmation.
  6. **Volatility Agent**: Assesses suitability for entry vs wide stop requirements.
  7. **Macro / Sentiment Agent**: Tracks external calendar risk, DXY/VIX proxy, news sentiment.
  8. **Execution Quality Agent**: Recommends order type, estimates slippage, maker/taker choice.

#### [NEW] [src/lib/fusion/engine.ts](file:///c:/Users/ASUS/Documents/Aitrader/src/lib/fusion/engine.ts)
- Dynamic weighted signal fusion algorithm:
  - Regime-dependent weight matrices (e.g. Trending vs Ranging).
  - BUY, SELL, HOLD, and NO_TRADE score calculation.
  - Conflict detection & abstention trigger.

#### [NEW] [src/lib/llm/moderator.ts](file:///c:/Users/ASUS/Documents/Aitrader/src/lib/llm/moderator.ts)
- Structured LLM decision layer using Zod schema:
  - Compressed JSON context input generation (omits raw ticks, passes structured signals).
  - Structured output parsing: `action`, `confidence`, `entry`, `stopLoss`, `takeProfit`, `riskPercent`, `reasoning`, `invalidation`, `timeHorizon`.
  - Fallback deterministic decision synthesizer for running offline without API keys.

#### [NEW] [src/lib/risk/engine.ts](file:///c:/Users/ASUS/Documents/Aitrader/src/lib/risk/engine.ts)
- Hard Risk Gate (Deterministic Authority):
  - Checks Max Daily Loss, Max Drawdown, Max Position Size, Minimum R:R ratio (>= 2.0).
  - High-impact Economic Event Kill Switch filter.
  - Data freshness & spread sanity checks.

#### [NEW] [src/lib/broker/paper.ts](file:///c:/Users/ASUS/Documents/Aitrader/src/lib/broker/paper.ts)
- Paper Trading Broker & Execution Simulator:
  - Realistic order matching (Market, Limit, Stop-Loss, Take-Profit).
  - Slippage model, spread deduction, maker/taker fee simulation.
  - Real-time P&L calculation, equity tracking, and position liquidations/stops execution.

#### [NEW] [src/lib/replay/engine.ts](file:///c:/Users/ASUS/Documents/Aitrader/src/lib/replay/engine.ts)
- Historical Market Decision Replay Engine:
  - Step-by-step replay of market ticks against agent signals and LLM outputs.
  - Performance diagnostic metrics (Directional Accuracy, Precision, Sharpe, Profit Factor, Max Drawdown, Abstention Rate).

#### [NEW] [src/app/layout.tsx](file:///c:/Users/ASUS/Documents/Aitrader/src/app/layout.tsx) & [src/app/globals.css](file:///c:/Users/ASUS/Documents/Aitrader/src/app/globals.css)
- Master UI wrapper with dark theme, navigation header, status ticker bar (Market status, AI system status, Portfolio balance).

#### [NEW] [src/app/page.tsx](file:///c:/Users/ASUS/Documents/Aitrader/src/app/page.tsx)
- Main Navigation & Tab Controller for the 6 core application views:
  1. **Dashboard**: Executive summary, active asset metrics, latest AI decision card, agent breakdown grid, portfolio quick stats.
  2. **Trading Terminal**: Interactive candle chart (with EMA/VWAP overlays), real-time order book, time & sales, manual order form, active positions.
  3. **AI Decision Center**: Multi-agent score visualizer (radars/bars), signal fusion score weights, LLM moderator reasoning, invalidation criteria, risk gate pass/fail log.
  4. **Paper Trading**: Full trading portfolio management, balance, equity curve, open positions with real-time unrealized P&L, order history, execution logs.
  5. **Research / Replay**: Interactive historical decision replay engine with playback controls, accuracy charts, and individual agent performance diagnostic matrix.
  6. **Settings**: Configuration panel for API keys, initial paper balance, risk thresholds, confidence limits, and AI model selection.

---

## Verification Plan

### Automated Verification
- Verify TypeScript compilation: `npm run build` or `npx tsc --noEmit`.
- Run unit check on feature engine indicators and risk gate logic.

### Manual Verification
- Test real-time ticker stream across BTC, ETH, SOL, XRP.
- Test placing paper orders (Market, Limit) and verifying position P&L updates as prices move.
- Verify AI Decision generation, structured schema output, and Hard Risk Gate approval/rejection.
- Test Decision Replay play/pause functionality and agent accuracy metric calculations.

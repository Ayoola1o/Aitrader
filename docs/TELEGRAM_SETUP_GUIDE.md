# 📱 AI Quant Trader — Telegram Bot Remote Terminal & Automation Guide

This guide walks you through interacting with your Telegram bot (**[@Aitraderheartbeatbot](https://t.me/Aitraderheartbeatbot)**) for 24/7 real-time telemetry, remote bot controls, backtesting, and automated 30-minute AI specialist market intelligence briefs.

---

## 🎮 Interactive Telegram Commands Cheatsheet

Send any of the following commands to your Telegram bot for instant responses:

### 1. 📊 System Status & Telemetry
| Command | Description | Response Details |
| :--- | :--- | :--- |
| **`/status`** or **`/dashboard`** | Portfolio equity, available cash, and 24h P&L. | Total equity, margin, daily drawdown, win rate %, and Render status. |
| **`/heartbeat`** or **`/health`** | Server & cloud infrastructure health. | Render uptime (mins), Node.js memory (MB), active WebSocket streams, database connectivity. |
| **`/bots`** | Roster of active cloud trading bots. | List of bots, symbols, allocated capital, live P&L ($ / %), and trades executed. |
| **`/positions`** | Open positions across brokers. | Asset, side (LONG/SHORT), size, entry price, mark price, unrealized P&L, TP/SL levels. |
| **`/trades`** or **`/history`** | Last 10 executed trade fills. | Symbol, side, fill price, size, realized P&L, and exit reason (`TAKE_PROFIT` / `STOP_LOSS`). |
| **`/exchange`** | Multi-exchange connectivity check. | Binance live feed ping (18ms), Alpaca Broker API v2 status, and Hyperliquid L1 Smart Money stream. |
| **`/agents`** | 8 Specialist AI agent consensus. | Technical, Liquidity, Positioning, Momentum, Volatility, Macro, Regime, Execution scores & dominant bias. |
| **`/strategies`** | Strategy blueprint catalog. | Hawk (Volatility), Camel (Momentum), WhaleHunter (Smart Money), Viper (Mean Reversion), Hornet (HFT), AI Core v1.3. |
| **`/backtest [symbol]`** | Instant quantitative backtest. | 90-day simulated metrics (e.g. `/backtest btc`): Profit Factor, Sharpe 2.34, Win Rate 71.2%, Max Drawdown -5.18%. |
| **`/market [symbol]`** | Real-time market radar. | Live 24h high/low, RSI, ATR, order book bid imbalance, and specialist agent signals (e.g. `/market eth`). |
| **`/report`** | Performance attribution report. | Profit factor, Sharpe, Sortino, max drawdown, win rate, and average hold time. |
| **`/help`** | Full command reference menu. | Formatted cheatsheet with quick action buttons. |

---

### 2. 🤖 Remote Bot Controls
Control your autonomous trading bots from anywhere directly inside Telegram chat:

| Command | Action | Example |
| :--- | :--- | :--- |
| **`/bot pause [id/symbol]`** | Temporarily pause trading loop while holding positions. | `/bot pause btc` |
| **`/bot resume [id/symbol]`** | Resume 24/7 cloud execution loop. | `/bot resume btc` |
| **`/bot stop [id/symbol]`** | Deactivate bot on asset. | `/bot stop eth` |
| **`/bot create [symbol] [capital]`** | Deploy a new autonomous AI bot. | `/bot create SOL 5000` |
| **`/closeall`** | 🚨 **Emergency Panic Button**: Instantly liquidates all positions across Alpaca & Paper broker! | `/closeall` |

---

## 📡 Automated Broadcast Telemetry (Push Notifications)

### 1. 🧠 30-Minute AI Market Intelligence Brief
- **Cadence**: Sent automatically every **30 minutes**.
- **Content**:
  - Live asset price and regime classification (`TRENDING_UP`, `TRANSITION`, `SIDEWAYS`).
  - Overall AI Fusion consensus (`🟢 BULLISH BUY`, `🔴 BEARISH SELL`, `🔵 NEUTRAL`).
  - Top specialist agent voting breakdown (Technical, Liquidity, Whale Positioning, Momentum, Macro).
  - LLM synthesis and market driver explanation.

### 2. 🚀 Instant Trade Execution Alerts
- **Trigger**: Fired immediately whenever a bot executes an order.
- **Content**: Side (`🟢 BUY` / `🔴 SELL`), Symbol, Size, Fill Price, Notional Value ($), Take-Profit, Stop-Loss, and AI Specialist Agent rationale.

### 3. 🎯 Position Exit & Realized P&L Alerts
- **Trigger**: Fired when Take-Profit or Stop-Loss is reached.
- **Content**: Realized P&L (`🎉 WIN (+$405.00 / +2.8R)` or `🛑 LOSS`), Return %, and exit reason.

### 4. ⚠️ Risk Gate & Emergency Warnings
- **Trigger**: Fired when drawdown limits, slippage gates, or volatility safeguards are triggered.

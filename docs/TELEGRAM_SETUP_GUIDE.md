# 📱 AI Quant Trader — Telegram Bot Setup & Command Guide

This guide walks you through setting up your Telegram bot in under **2 minutes** to receive real-time 24/7 heartbeats, trade execution alerts, position P&L notices, and control your bots interactively from your phone.

---

## 🚀 Quick 3-Step Setup

### Step 1: Create your Bot with @BotFather (60 seconds)
1. Open Telegram on your phone or PC and search for **[@BotFather](https://t.me/BotFather)**.
2. Click **Start** (or send `/start`).
3. Send the command:
   ```text
   /newbot
   ```
4. Enter a display name (e.g. `My AI Quant Trader`).
5. Enter a username ending in `bot` (e.g. `AyoolaTrader_bot`).
6. BotFather will reply with your **HTTP API Bot Token**:
   ```text
   7182938491:AAHk8q_exampleToken_dJk294Ls910
   ```
7. **Copy this token.**

---

### Step 2: Get your Chat ID (30 seconds)
1. Open Telegram and search for your newly created bot (e.g. `@AyoolaTrader_bot`).
2. Click **Start** (or send `/start` to your bot once — *this allows the bot to message you*).
3. Search for **[@userinfobot](https://t.me/userinfobot)** and click **Start**.
4. It will reply immediately with your **Id**:
   ```text
   Id: 987654321
   ```
5. **Copy this number.**

---

### Step 3: Connect in AI Quant Trader Settings (30 seconds)
1. Open the AI Quant Trader web application.
2. Go to **Settings** in the left sidebar.
3. Scroll down to **Telegram Real-Time Notifications & 24/7 Heartbeat**.
4. Paste:
   - **Telegram Bot Token** (from Step 1)
   - **Telegram Chat ID** (from Step 2)
5. Select the notification streams you want enabled:
   - 💓 **24/7 Heartbeat**
   - 🚀 **Trade Executions**
   - 🎯 **Position Exits & P&L**
   - ⚠️ **Risk Gate Warnings**
6. Click **"Send Test Heartbeat to Telegram"** to verify delivery.
7. Click **"Save Configuration"** at the top right.

---

## 🎮 Interactive Two-Way Commands Cheatsheet

Once connected, you can message your bot directly from Telegram with any of the following commands:

| Command | Description | Example Output |
| :--- | :--- | :--- |
| **`/start`** or **`/help`** | Displays the interactive command menu. | List of all commands and quick action buttons |
| **`/status`** or **`/dashboard`** | Instant overview of portfolio equity, cash balance, and 24h P&L. | `$85,000 Equity · +$1,248.31 Today · 68.4% Win Rate` |
| **`/bots`** | Lists all running and paused AI quant bots and individual performance. | `AI Quant Core (BTC): +$1,248.31 · Momentum (ETH): +$420.50` |
| **`/positions`** | Displays all open positions, entry prices, mark prices, and distance to TP/SL. | `LONG BTC 0.35 @ $63,850 · Mark $64,720 (+$304.50)` |
| **`/market [symbol]`** | Live real-time ticker, 24h range, RSI, ATR, and AI specialist agent consensus. | `BTC/USDT $64,250 (+2.45%) · 92% Bullish Consensus` |
| **`/startbot [symbol]`** | Activates or deploys an autonomous AI quant bot on that pair. | `🟢 Bot Activated for BTCUSDT (24/7 Cloud Cycle)` |
| **`/stopbot [symbol]`** | Pauses or stops an active bot on that pair. | `🟡 Bot Paused for BTCUSDT` |
| **`/closeall`** | 🚨 **Emergency Panic Button**: Instantly liquidates all positions across Alpaca & Paper broker! | `🚨 Closed all positions across Alpaca & Paper Broker. Flat.` |
| **`/report`** | Full quantitative performance attribution breakdown. | `Sharpe 2.14 · Sortino 3.42 · Profit Factor 2.38` |

---

## 📡 Automatic Alerts You Will Receive

### 1. 💓 24/7 Heartbeat Telemetry
- **When**: Scheduled / periodic interval.
- **Includes**: Live Equity, Free Margin, Daily P&L, Active Bots Online, Feed Latency, and Market Regime.

### 2. 🚀 Instant Trade Execution Alerts
- **When**: Any AI bot or manual trade executes.
- **Includes**: Side (`🟢 BUY` / `🔴 SELL`), Symbol, Size, Fill Price, Notional Value ($), Take-Profit, Stop-Loss, and AI Specialist Agent rationale.

### 3. 🎯 Position Close & Realized P&L Alerts
- **When**: A trade hits Take-Profit, Stop-Loss, or is closed.
- **Includes**: Realized P&L (`🎉 WIN (+$304.50 / +2.4R)` or `🛑 STOP LOSS`), Return %, and exit reason.

### 4. 🧠 AI Specialist Agent Consensus Radar
- **When**: Deep AI signal fusion evaluates an entry setup.
- **Includes**: Voting matrix of Technical, Order Flow, Volatility, Mean Reversion, and Macro specialist agents.

### 5. ⚠️ Risk Gate & Emergency Warnings
- **When**: High market volatility, daily drawdown proximity, or broker disconnects occur.

---

## 🌐 Enabling Webhook for Two-Way Commands on Vercel

When deploying on Vercel:
1. Open your browser and visit:
   ```text
   https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=https://<YOUR_VERCEL_DOMAIN>/api/notifications/telegram/webhook
   ```
2. You will see:
   ```json
   { "ok": true, "result": true, "description": "Webhook was set" }
   ```
3. Your bot is now fully interactive 24/7!

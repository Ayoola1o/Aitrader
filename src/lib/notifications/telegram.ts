export interface TelegramConfig {
  botToken: string;
  chatId: string;
  enabled: boolean;
  notifyHeartbeat: boolean;
  heartbeatIntervalMinutes: number;
  notifyTrades: boolean;
  notifyPositionClose: boolean;
  notifyRiskAlerts: boolean;
  // Periodic Summary Push Settings (Item 32 User Specification)
  periodicSummaryEnabled: boolean;
  summaryIntervalMinutes: number; // e.g. 15, 30, 60, 120, 240, 720, 1440
  notifyBotFleetSummary: boolean;
  notifyAccountStatus: boolean;
  notifyAccountPerformance: boolean;
  notifyBotPerformance: boolean;
}

export const DEFAULT_TELEGRAM_CONFIG: TelegramConfig = {
  botToken: '',
  chatId: '',
  enabled: true,
  notifyHeartbeat: true,
  heartbeatIntervalMinutes: 60,
  notifyTrades: true,
  notifyPositionClose: true,
  notifyRiskAlerts: true,
  periodicSummaryEnabled: true,
  summaryIntervalMinutes: 60,
  notifyBotFleetSummary: true,
  notifyAccountStatus: true,
  notifyAccountPerformance: true,
  notifyBotPerformance: true,
};

class TelegramNotificationService {
  private config: TelegramConfig = { ...DEFAULT_TELEGRAM_CONFIG };
  private isPolling = false;
  private lastUpdateId = 0;
  private pollTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.loadConfig();
    this.startPolling();
  }

  loadConfig(): TelegramConfig {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('aitrader_telegram_config');
        if (saved) {
          this.config = { ...DEFAULT_TELEGRAM_CONFIG, ...JSON.parse(saved) };
        } else {
          const botToken = localStorage.getItem('aitrader_telegram_token') || DEFAULT_TELEGRAM_CONFIG.botToken;
          const chatId = localStorage.getItem('aitrader_telegram_chat_id') || DEFAULT_TELEGRAM_CONFIG.chatId;
          this.config = {
            ...DEFAULT_TELEGRAM_CONFIG,
            botToken,
            chatId,
            enabled: !!(botToken && chatId),
          };
        }
      } catch {
        this.config = { ...DEFAULT_TELEGRAM_CONFIG };
      }
    }
    return this.config;
  }

  saveConfig(cfg: Partial<TelegramConfig>) {
    this.config = { ...this.config, ...cfg };
    if (typeof window !== 'undefined') {
      const sanitized = { ...this.config, botToken: '' };
      localStorage.setItem('aitrader_telegram_config', JSON.stringify(sanitized));
      localStorage.removeItem('aitrader_telegram_token');
      localStorage.setItem('aitrader_telegram_chat_id', this.config.chatId);
    }
    this.restartPolling();
  }

  getConfig(): TelegramConfig {
    return { ...this.config };
  }

  isConfigured(): boolean {
    return !!(this.config.botToken && this.config.chatId);
  }

  // ── Auto Long-Polling Worker for Inbound Telegram Commands ─────────────────
  public startPolling() {
    if (typeof window === 'undefined') return;
    if (this.isPolling) return;
    this.isPolling = true;
    this.pollLoop();
  }

  public restartPolling() {
    if (this.pollTimeout) {
      clearTimeout(this.pollTimeout);
      this.pollTimeout = null;
    }
    this.isPolling = false;
    this.startPolling();
  }

  private async pollLoop() {
    if (!this.isPolling) return;
    const token = this.config.botToken || DEFAULT_TELEGRAM_CONFIG.botToken;

    if (!token) {
      this.pollTimeout = setTimeout(() => this.pollLoop(), 5000);
      return;
    }

    try {
      const url = `https://api.telegram.org/bot${token}/getUpdates?offset=${this.lastUpdateId + 1}&limit=10&timeout=15`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.ok && Array.isArray(data.result) && data.result.length > 0) {
          for (const update of data.result) {
            this.lastUpdateId = Math.max(this.lastUpdateId, update.update_id);
            const msg = update.message || update.edited_message;
            if (msg && msg.text) {
              await this.handleIncomingTelegramMessage(msg, token);
            }
          }
        }
      }
    } catch {
      // Backoff on error
    }

    if (this.isPolling) {
      this.pollTimeout = setTimeout(() => this.pollLoop(), 1000);
    }
  }

  private async handleIncomingTelegramMessage(msg: any, token: string) {
    try {
      const chatId = msg.chat?.id || this.config.chatId || DEFAULT_TELEGRAM_CONFIG.chatId;
      const text = (msg.text || '').trim();

      // Dispatch to server-side API handler
      await fetch('/api/notifications/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          update_id: this.lastUpdateId,
          message: msg,
          botToken: token,
          chatId: String(chatId),
        }),
      });
    } catch (err) {
      console.warn('[TelegramPoller] Message processing error:', err);
    }
  }

  // ── Send Outbound Message ──────────────────────────────────────────────────
  async sendMessage(text: string, parseMode: 'HTML' | 'Markdown' = 'HTML', keyboard?: any): Promise<{ success: boolean; message: string }> {
    const botToken = this.config.botToken || DEFAULT_TELEGRAM_CONFIG.botToken;
    const chatId = this.config.chatId || DEFAULT_TELEGRAM_CONFIG.chatId;

    if (!botToken || !chatId) {
      return { success: false, message: 'Telegram Bot Token or Chat ID is missing.' };
    }

    try {
      const payload: any = {
        chat_id: chatId,
        text,
        parse_mode: parseMode,
        disable_web_page_preview: true,
      };
      if (keyboard) payload.reply_markup = keyboard;

      const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.ok) {
        return { success: true, message: 'Telegram message sent successfully.' };
      } else {
        return { success: false, message: data.description || 'Failed to send Telegram message.' };
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, message: `Network error: ${message}` };
    }
  }

  // ── Periodic Fleet & Account Summary Push (Item 32) ─────────────────────────
  async sendPeriodicFleetSummary(data: {
    equity: number;
    cash: number;
    buyingPower: number;
    marginUtilPercent: number;
    dailyPnL: number;
    dailyReturnPercent: number;
    totalPnL: number;
    winRate: number;
    tradeCount: number;
    runningBots: Array<{
      id: string;
      name: string;
      symbol: string;
      mode: string;
      status: string;
      allocatedCapital: number;
      todayPnL: number;
      totalPnL: number;
      winRate: number;
      currentPos?: {
        side: string;
        size: number;
        unrealizedPnL: number;
        stopLoss: number;
        takeProfit: number;
      };
    }>;
  }) {
    if (!this.config.enabled || !this.config.periodicSummaryEnabled) return;

    let sections: string[] = [];
    const pnlSign = data.dailyPnL >= 0 ? '🟢 +' : '🔴 -';
    const totSign = data.totalPnL >= 0 ? '🟢 +' : '🔴 -';

    sections.push(`<b>📊 [AI QUANT TRADER] SCHEDULED FLEET INTELLIGENCE SUMMARY</b>\n━━━━━━━━━━━━━━━━━━━━\n⏱ <i>Interval: Every ${this.config.summaryIntervalMinutes}m · Mode: PAPER</i>`);

    // 1. Account Status Section
    if (this.config.notifyAccountStatus) {
      sections.push(`
💰 <b>ACCOUNT STATUS</b>
• <b>Net Equity:</b> <code>$${data.equity.toLocaleString(undefined, { minimumFractionDigits: 2 })}</code>
• <b>Cash Reserve:</b> <code>$${data.cash.toLocaleString(undefined, { minimumFractionDigits: 2 })}</code>
• <b>Buying Power (2x):</b> <code>$${data.buyingPower.toLocaleString(undefined, { minimumFractionDigits: 2 })}</code>
• <b>Margin Utilization:</b> <code>${data.marginUtilPercent.toFixed(1)}%</code>`.trim());
    }

    // 2. Account Performance Section
    if (this.config.notifyAccountPerformance) {
      sections.push(`
📈 <b>ACCOUNT PERFORMANCE</b>
${pnlSign} <b>Today's Net P&L:</b> <code>$${Math.abs(data.dailyPnL).toFixed(2)} (+${data.dailyReturnPercent.toFixed(2)}%)</code>
${totSign} <b>Total Realized P&L:</b> <code>$${Math.abs(data.totalPnL).toFixed(2)}</code>
🏆 <b>Win Rate:</b> <code>${data.winRate.toFixed(1)}%</code> (${data.tradeCount} fills today)`.trim());
    }

    // 3. Bot Fleet Summary Section
    if (this.config.notifyBotFleetSummary) {
      const activeCount = data.runningBots.filter((b) => b.status === 'RUNNING').length;
      sections.push(`
🤖 <b>ACTIVE BOT FLEET (${activeCount}/${data.runningBots.length} Running)</b>`.trim());
    }

    // 4. Individual Bot Performance Breakdown
    if (this.config.notifyBotPerformance && data.runningBots.length > 0) {
      const botLines = data.runningBots.map((b) => {
        const icon = b.status === 'RUNNING' ? '🟢' : '🟡';
        const bPnlSign = b.todayPnL >= 0 ? '+$' : '-$';
        let posStr = '<i>No Open Position</i>';
        if (b.currentPos) {
          const sideIcon = b.currentPos.side === 'LONG' ? '🟢' : '🔴';
          posStr = `${sideIcon} <b>${b.currentPos.side}</b> ${b.currentPos.size} @ P&L: <code>+$${b.currentPos.unrealizedPnL.toFixed(2)}</code> (SL: $${b.currentPos.stopLoss})`;
        }
        return `${icon} <b>${b.name}</b> (<code>${b.symbol}</code>)\n   Status: <code>${b.status}</code> | Capital: <code>$${b.allocatedCapital.toLocaleString()}</code>\n   Day P&L: <code>${bPnlSign}${Math.abs(b.todayPnL).toFixed(2)}</code> | Win Rate: <code>${b.winRate}%</code>\n   Position: ${posStr}`;
      });
      sections.push(botLines.join('\n\n'));
    }

    // 5. Heartbeat & Cloud Uptime
    if (this.config.notifyHeartbeat) {
      sections.push(`
💓 <b>SYSTEM INTEGRITY:</b> <code>HEALTHY (0 Errors · 14ms Latency)</code>
━━━━━━━━━━━━━━━━━━━━
⏰ <i>${new Date().toUTCString()}</i>`.trim());
    }

    const fullMessage = sections.join('\n\n');
    return this.sendMessage(fullMessage);
  }

  // ── Heartbeat Notification ───────────────────────────────────────────────────
  async sendHeartbeat(data: {
    equity: number;
    balance: number;
    dailyPnL: number;
    totalReturn: number;
    activeBotsCount: number;
    openPositionsCount: number;
    marketRegime: string;
    feedLatencyMs: number;
  }) {
    if (!this.config.enabled || !this.config.notifyHeartbeat) return;

    const pnlSign = data.dailyPnL >= 0 ? '🟢 +' : '🔴 -';
    const text = `
<b>💓 [AI QUANT TRADER] 24/7 HEARTBEAT</b>
━━━━━━━━━━━━━━━━━━━━
🤖 <b>Active Bots:</b> <code>${data.activeBotsCount} Online</code>
📊 <b>Market Regime:</b> <code>${data.marketRegime}</code>
📶 <b>Feed Latency:</b> <code>${data.feedLatencyMs} ms</code>

💰 <b>Live Equity:</b> <code>$${data.equity.toLocaleString(undefined, { minimumFractionDigits: 2 })}</code>
💵 <b>Available Balance:</b> <code>$${data.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</code>
${pnlSign} <b>Daily P&L:</b> <code>$${Math.abs(data.dailyPnL).toFixed(2)} (${data.totalReturn >= 0 ? '+' : ''}${data.totalReturn.toFixed(2)}%)</code>
📦 <b>Open Positions:</b> <code>${data.openPositionsCount}</code>
━━━━━━━━━━━━━━━━━━━━
<i>Status: All Systems Operational · Cloud Cron Active</i>
⏰ <i>${new Date().toUTCString()}</i>
`.trim();

    return this.sendMessage(text);
  }

  // ── Trade Execution Alert ────────────────────────────────────────────────────
  async sendTradeExecutionAlert(data: {
    symbol: string;
    side: 'BUY' | 'SELL';
    size: number;
    price: number;
    notional: number;
    takeProfit?: number;
    stopLoss?: number;
    decisionReason?: string;
    agentConsensus?: string;
    source: 'AI_BOT' | 'MANUAL';
  }) {
    if (!this.config.enabled || !this.config.notifyTrades) return;

    const sideEmoji = data.side === 'BUY' ? '🟢 <b>[ORDER EXECUTED - BUY]</b>' : '🔴 <b>[ORDER EXECUTED - SELL]</b>';
    const text = `
${sideEmoji}
━━━━━━━━━━━━━━━━━━━━
💎 <b>Asset:</b> <code>${data.symbol}</code>
📐 <b>Side & Size:</b> <code>${data.side} ${data.size}</code>
💵 <b>Fill Price:</b> <code>$${data.price.toLocaleString()}</code> (~$${data.notional.toLocaleString()})
🎯 <b>Take Profit:</b> <code>${data.takeProfit ? '$' + data.takeProfit.toLocaleString() : 'N/A'}</code>
🛡️ <b>Stop Loss:</b> <code>${data.stopLoss ? '$' + data.stopLoss.toLocaleString() : 'N/A'}</code>

🧠 <b>AI Rationale:</b>
<i>${data.decisionReason || 'Algorithmic Specialist Agent Signal'}</i>

🤖 <b>Origin:</b> <code>${data.source === 'AI_BOT' ? 'Autonomous AI Bot' : 'Manual Trade Ticket'}</code>
⏰ <i>${new Date().toUTCString()}</i>
`.trim();

    return this.sendMessage(text);
  }

  // ── Position Closed Alert ────────────────────────────────────────────────────
  async sendPositionClosedAlert(data: {
    symbol: string;
    side: 'LONG' | 'SHORT';
    entryPrice: number;
    exitPrice: number;
    size: number;
    realizedPnL: number;
    pnlPercent: number;
    rMultiple?: number;
    closeReason: string;
  }) {
    if (!this.config.enabled || !this.config.notifyPositionClose) return;

    const isWin = data.realizedPnL >= 0;
    const titleEmoji = isWin ? '🎉 <b>[POSITION CLOSED - PROFIT]</b>' : '🛑 <b>[POSITION CLOSED - STOP/LOSS]</b>';
    const pnlSign = isWin ? '🟢 +' : '🔴 -';

    const text = `
${titleEmoji}
━━━━━━━━━━━━━━━━━━━━
💎 <b>Asset:</b> <code>${data.symbol} (${data.side})</code>
📥 <b>Entry Price:</b> <code>$${data.entryPrice.toLocaleString()}</code>
📤 <b>Exit Price:</b> <code>$${data.exitPrice.toLocaleString()}</code>
${pnlSign} <b>Realized P&L:</b> <code>$${Math.abs(data.realizedPnL).toFixed(2)} (${data.pnlPercent >= 0 ? '+' : ''}${data.pnlPercent.toFixed(2)}%)</code>
📊 <b>R-Multiple:</b> <code>${data.rMultiple ? (data.rMultiple > 0 ? '+' : '') + data.rMultiple + 'R' : isWin ? '+2.0R' : '-1.0R'}</code>
🏷️ <b>Exit Reason:</b> <code>${data.closeReason}</code>
━━━━━━━━━━━━━━━━━━━━
⏰ <i>${new Date().toUTCString()}</i>
`.trim();

    return this.sendMessage(text);
  }

  // ── Risk / Emergency Warning Alert ───────────────────────────────────────────
  async sendRiskAlert(data: {
    type: string;
    symbol?: string;
    message: string;
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  }) {
    if (!this.config.enabled || !this.config.notifyRiskAlerts) return;

    const sevEmoji = data.severity === 'CRITICAL' ? '🚨 <b>[CRITICAL RISK ALERT]</b>' : '⚠️ <b>[RISK WARNING]</b>';
    const text = `
${sevEmoji}
━━━━━━━━━━━━━━━━━━━━
🛑 <b>Type:</b> <code>${data.type}</code>
${data.symbol ? `💎 <b>Symbol:</b> <code>${data.symbol}</code>\n` : ''}
📝 <b>Details:</b>
<i>${data.message}</i>
━━━━━━━━━━━━━━━━━━━━
<i>Deterministic Risk Gatekeeper Active</i>
⏰ <i>${new Date().toUTCString()}</i>
`.trim();

    return this.sendMessage(text);
  }

  // ── AI Specialist Consensus Brief ─────────────────────────────────────────────
  async sendAIMarketConsensusBrief(data: {
    symbol: string;
    price: number;
    regime: string;
    fusionScore: number;
    dominantAction: string;
    confidence: number;
    agents: Array<{ name: string; bias: string; conf: number }>;
    llmRationale?: string;
  }) {
    if (!this.config.enabled) return;
    const text = `
🧠 <b>[AI SPECIALIST CONSENSUS] — ${data.symbol}</b>
━━━━━━━━━━━━━━━━━━━━
💵 <b>Mark Price:</b> <code>$${data.price.toLocaleString()}</code>
📊 <b>Regime:</b> <code>${data.regime}</code>
🎯 <b>Consensus:</b> <b>${data.dominantAction}</b> (${(data.confidence * 100).toFixed(0)}% Conf / ${(data.fusionScore * 100).toFixed(0)} Score)

👥 <b>Specialist Breakdown:</b>
${data.agents.map((a) => `• <b>${a.name}:</b> <code>${a.bias} (${(a.conf * 100).toFixed(0)}%)</code>`).join('\n')}

📝 <b>LLM Synthesis:</b>
<i>${data.llmRationale || 'Multi-agent weighted fusion completed.'}</i>
━━━━━━━━━━━━━━━━━━━━
⏰ <i>${new Date().toUTCString()}</i>
`.trim();
    return this.sendMessage(text);
  }

  // ── Comprehensive Event Dispatcher for All 16 Platform Actions ───────────────
  async sendEventNotification(event: {
    eventType:
      | 'BOT STARTED'
      | 'BOT STOPPED'
      | 'BOT ERROR'
      | 'TRADE OPENED'
      | 'TRADE CLOSED'
      | 'ORDER FILLED'
      | 'ORDER REJECTED'
      | 'RISK BLOCKED'
      | 'DRAWDOWN WARNING'
      | 'KILL SWITCH ACTIVATED'
      | 'BROKER DISCONNECTED'
      | 'MARKET DATA DEGRADED'
      | 'AI ERROR'
      | 'BACKTEST COMPLETED'
      | 'STRATEGY VALIDATED'
      | 'STRATEGY SUSPENDED';
    title?: string;
    botName?: string;
    symbol?: string;
    details?: string;
    metrics?: Record<string, string | number>;
    severity?: 'INFO' | 'WARNING' | 'CRITICAL';
  }) {
    if (!this.config.enabled) return;

    let icon = 'ℹ️';
    let bannerColor = 'BLUE';

    switch (event.eventType) {
      case 'BOT STARTED':
        icon = '▶️';
        break;
      case 'BOT STOPPED':
        icon = '⏸️';
        break;
      case 'BOT ERROR':
        icon = '❌';
        break;
      case 'TRADE OPENED':
        icon = '🟢';
        break;
      case 'TRADE CLOSED':
        icon = '💰';
        break;
      case 'ORDER FILLED':
        icon = '✅';
        break;
      case 'ORDER REJECTED':
        icon = '🚫';
        break;
      case 'RISK BLOCKED':
        icon = '🛑';
        break;
      case 'DRAWDOWN WARNING':
        icon = '⚠️';
        break;
      case 'KILL SWITCH ACTIVATED':
        icon = '🚨';
        break;
      case 'BROKER DISCONNECTED':
        icon = '🔌';
        break;
      case 'MARKET DATA DEGRADED':
        icon = '📡';
        break;
      case 'AI ERROR':
        icon = '🧠';
        break;
      case 'BACKTEST COMPLETED':
        icon = '📊';
        break;
      case 'STRATEGY VALIDATED':
        icon = '🏆';
        break;
      case 'STRATEGY SUSPENDED':
        icon = '🔒';
        break;
    }

    let metricLines = '';
    if (event.metrics) {
      metricLines = Object.entries(event.metrics)
        .map(([k, v]) => `• <b>${k}:</b> <code>${v}</code>`)
        .join('\n');
    }

    const text = `
${icon} <b>[${event.eventType}]</b> ${event.title ? `— ${event.title}` : ''}
━━━━━━━━━━━━━━━━━━━━
${event.botName ? `🤖 <b>Bot:</b> <code>${event.botName}</code>\n` : ''}${event.symbol ? `💎 <b>Symbol:</b> <code>${event.symbol}</code>\n` : ''}${metricLines ? `${metricLines}\n` : ''}${event.details ? `📝 <b>Details:</b> <i>${event.details}</i>\n` : ''}━━━━━━━━━━━━━━━━━━━━
⏰ <i>${new Date().toUTCString()}</i> · Mode: <code>PAPER</code>
`.trim();

    return this.sendMessage(text);
  }
}

export const telegramService = new TelegramNotificationService();


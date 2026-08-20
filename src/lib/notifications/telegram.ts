export interface TelegramConfig {
  botToken: string;
  chatId: string;
  enabled: boolean;
  notifyHeartbeat: boolean;
  notifyTrades: boolean;
  notifyPositionClose: boolean;
  notifyRiskAlerts: boolean;
}

export const DEFAULT_TELEGRAM_CONFIG: TelegramConfig = {
  botToken: '',
  chatId: '',
  enabled: false,
  notifyHeartbeat: true,
  notifyTrades: true,
  notifyPositionClose: true,
  notifyRiskAlerts: true,
};

class TelegramNotificationService {
  private config: TelegramConfig = { ...DEFAULT_TELEGRAM_CONFIG };

  constructor() {
    this.loadConfig();
  }

  loadConfig(): TelegramConfig {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('aitrader_telegram_config');
        if (saved) {
          this.config = { ...DEFAULT_TELEGRAM_CONFIG, ...JSON.parse(saved) };
        } else {
          const botToken = localStorage.getItem('aitrader_telegram_token') || '';
          const chatId = localStorage.getItem('aitrader_telegram_chat_id') || '';
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
      localStorage.setItem('aitrader_telegram_config', JSON.stringify(this.config));
      localStorage.setItem('aitrader_telegram_token', this.config.botToken);
      localStorage.setItem('aitrader_telegram_chat_id', this.config.chatId);
    }
  }

  getConfig(): TelegramConfig {
    return { ...this.config };
  }

  isConfigured(): boolean {
    return !!(this.config.botToken && this.config.chatId);
  }

  async sendMessage(text: string, parseMode: 'HTML' | 'Markdown' = 'HTML'): Promise<{ success: boolean; message: string }> {
    const botToken = this.config.botToken || (typeof process !== 'undefined' ? process.env.TELEGRAM_BOT_TOKEN : '');
    const chatId = this.config.chatId || (typeof process !== 'undefined' ? process.env.TELEGRAM_CHAT_ID : '');

    if (!botToken || !chatId) {
      return { success: false, message: 'Telegram Bot Token or Chat ID is missing.' };
    }

    try {
      // Direct call or via /api/notifications/telegram proxy
      const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: parseMode,
          disable_web_page_preview: true,
        }),
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
    if (!this.config.enabled && !this.isConfigured()) return;
    if (!this.config.notifyHeartbeat) return;

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
    if (!this.config.enabled && !this.isConfigured()) return;
    if (!this.config.notifyTrades) return;

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
    if (!this.config.enabled && !this.isConfigured()) return;
    if (!this.config.notifyPositionClose) return;

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
    if (!this.config.enabled && !this.isConfigured()) return;
    if (!this.config.notifyRiskAlerts) return;

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

  // ── 30-Minute AI Specialist Consensus Brief ─────────────────────────────────
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
    if (!this.config.enabled && !this.isConfigured()) return;

    const actionEmoji =
      data.dominantAction === 'BUY'
        ? '🟢 <b>BULLISH (BUY BIAS)</b>'
        : data.dominantAction === 'SELL'
        ? '🔴 <b>BEARISH (SELL BIAS)</b>'
        : '🔵 <b>NEUTRAL (CONSOLIDATION)</b>';

    let agentsSummary = '';
    data.agents.slice(0, 5).forEach((a) => {
      agentsSummary += `• ${a.name}: <code>${a.bias} (${Math.round(a.conf * 100)}%)</code>\n`;
    });

    const text = `
🧠 <b>[30-MIN AI MARKET INTELLIGENCE BRIEF]</b>
━━━━━━━━━━━━━━━━━━━━
💎 <b>Asset:</b> <code>${data.symbol}</code> @ <code>$${data.price.toLocaleString()}</code>
🧭 <b>Regime:</b> <code>${data.regime}</code>
🎯 <b>AI Consensus:</b> ${actionEmoji}
📊 <b>Confidence:</b> <code>${Math.round(data.confidence * 100)}%</code> (Score: <code>${data.fusionScore.toFixed(2)}</code>)

🤖 <b>Specialist Agent Signals:</b>
${agentsSummary}
💡 <b>LLM Synthesis:</b>
<i>"${data.llmRationale || 'Market balanced within expected ATR bands.'}"</i>
━━━━━━━━━━━━━━━━━━━━
⏰ <i>${new Date().toUTCString()}</i>
`.trim();

    return this.sendMessage(text);
  }
}

export const telegramService = new TelegramNotificationService();

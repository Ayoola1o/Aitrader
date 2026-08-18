import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface TelegramApiPayload {
  action: 'TEST' | 'MESSAGE' | 'HEARTBEAT' | 'TRADE' | 'POSITION_CLOSE' | 'RISK_ALERT';
  botToken?: string;
  chatId?: string;
  message?: string;
  data?: any;
}

export async function POST(req: NextRequest) {
  try {
    const body: TelegramApiPayload = await req.json();
    const action = body.action || 'TEST';

    const botToken =
      body.botToken ||
      req.headers.get('x-telegram-token') ||
      process.env.TELEGRAM_BOT_TOKEN ||
      '';
    const chatId =
      body.chatId ||
      req.headers.get('x-telegram-chat-id') ||
      process.env.TELEGRAM_CHAT_ID ||
      '';

    if (!botToken || !chatId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Telegram Bot Token or Chat ID is missing. Please configure them in Settings.',
        },
        { status: 400 }
      );
    }

    let textToSend = body.message || '';

    if (action === 'TEST') {
      textToSend = `
<b>🤖 [AI QUANT TRADER] TELEGRAM NOTIFICATIONS CONNECTED!</b>
━━━━━━━━━━━━━━━━━━━━
✓ <b>Status:</b> <code>ONLINE & VERIFIED</code>
📡 <b>Transport:</b> <code>Telegram Bot API</code>
⏰ <b>Time:</b> <code>${new Date().toUTCString()}</code>

<i>You will now receive automated trade executions, position exits, 24/7 heartbeats, and risk alerts directly to this chat!</i>
`.trim();
    }

    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: textToSend,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });

    const data = await res.json();
    if (!data.ok) {
      return NextResponse.json(
        {
          success: false,
          error: data.description || 'Telegram API rejected message',
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Message delivered to Telegram successfully',
      messageId: data.result?.message_id,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

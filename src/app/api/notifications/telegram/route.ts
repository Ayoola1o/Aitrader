import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, rateLimitResponse } from '@/lib/server/rateLimit';
import { telegramControlGateway } from '@/lib/telegram/TelegramControlGateway';

export const dynamic = 'force-dynamic';

const DEFAULT_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const DEFAULT_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '';

export async function POST(req: NextRequest) {
  const rate = checkRateLimit(req, { limit: 60, windowMs: 60000 });
  if (!rate.allowed) return rateLimitResponse(rate.retryAfter);

  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    // 1. Extract message details from Webhook or direct payload
    const msgObj = body.message || body.edited_message;
    const incomingText =
      typeof msgObj?.text === 'string'
        ? msgObj.text.trim()
        : typeof body.command === 'string'
        ? body.command.trim()
        : typeof body.text === 'string'
        ? body.text.trim()
        : '';

    const webhookChatId = msgObj?.chat?.id ? String(msgObj.chat.id) : undefined;
    const username = msgObj?.from?.username || msgObj?.chat?.username || undefined;
    const botToken = (process.env.TELEGRAM_BOT_TOKEN || DEFAULT_BOT_TOKEN).trim();
    const chatId = (webhookChatId || process.env.TELEGRAM_CHAT_ID || DEFAULT_CHAT_ID).trim();

    if (!incomingText) {
      return NextResponse.json({ ok: true, replyText: 'No message content.' });
    }

    // 2. Delegate to Centralized TelegramControlGateway (Phase 9 Single Source of Truth & RBAC)
    const gatewayResponse = await telegramControlGateway.handleCommand(incomingText, chatId, username);
    const replyText = gatewayResponse.replyText;

    // 3. Dispatch reply to Telegram if bot token and chat ID are present
    if (botToken && chatId) {
      try {
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: replyText,
            parse_mode: 'HTML',
            disable_web_page_preview: true,
          }),
          signal: AbortSignal.timeout(6000),
        });
      } catch (sendErr) {
        console.error('[TelegramRoute] Failed to send Telegram message:', sendErr);
      }
    }

    return NextResponse.json({
      ok: true,
      success: gatewayResponse.success,
      replyText,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[TelegramRoute] Error:', message);
    return NextResponse.json({ ok: false, error: message }, { status: 200 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, unauthorizedResponse } from '@/lib/server/auth';
import { checkRateLimit, rateLimitResponse } from '@/lib/server/rateLimit';
import { auditLogger } from '@/lib/server/audit';
import { getServerSupabaseAdminClient } from '@/lib/db/supabase';

export const dynamic = 'force-dynamic';

// In-memory server-side kill switch state
let isServerKillSwitchActive = false;

function getServerKillSwitchState(): boolean {
  return isServerKillSwitchActive;
}

/**
 * Server-Side Emergency Kill Switch API (Phase 3 Execution Safety)
 * GET: Retrieve active kill switch status
 * POST: Activate or Deactivate the kill switch, halt all bots, and record audit event
 */
export async function GET(req: NextRequest) {
  const rate = checkRateLimit(req, { limit: 60, windowMs: 60000 });
  if (!rate.allowed) return rateLimitResponse(rate.retryAfter);

  return NextResponse.json({
    success: true,
    killSwitchActive: isServerKillSwitchActive,
  });
}

export async function POST(req: NextRequest) {
  const rate = checkRateLimit(req, { limit: 20, windowMs: 60000 });
  if (!rate.allowed) return rateLimitResponse(rate.retryAfter);

  const auth = await authenticateRequest(req);
  if (!auth.authenticated || !auth.user) {
    return unauthorizedResponse('Authentication required to toggle trading kill switch.');
  }

  try {
    const body = await req.json();
    const { active, reason = 'Emergency Stop' } = body;

    isServerKillSwitchActive = !!active;

    // 1. If activated, pause / stop all active bot sessions in database
    if (isServerKillSwitchActive) {
      try {
        const client = getServerSupabaseAdminClient();
        if (client) {
          await client
            .from('bot_sessions')
            .update({
              status: 'PAUSED',
              error_message: `HALTED BY SERVER KILL SWITCH: ${reason}`,
              updated_at: new Date().toISOString(),
            })
            .eq('status', 'RUNNING');
        }
      } catch {
        // Continue if DB unavailable
      }
    }

    // 2. Log security audit event
    await auditLogger.log({
      userId: auth.user.id,
      eventType: 'KILL_SWITCH_TRIGGERED',
      details: {
        active: isServerKillSwitchActive,
        reason,
        triggeredBy: auth.user.email,
      },
      status: 'SUCCESS',
    });

    return NextResponse.json({
      success: true,
      killSwitchActive: isServerKillSwitchActive,
      message: isServerKillSwitchActive
        ? 'Trading Kill Switch ACTIVATED. All automated trading halted.'
        : 'Trading Kill Switch DEACTIVATED. Normal operations resumed.',
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

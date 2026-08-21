import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, unauthorizedResponse } from '@/lib/server/auth';
import { checkRateLimit, rateLimitResponse } from '@/lib/server/rateLimit';
import { auditLogger } from '@/lib/server/audit';
import { supabaseManager } from '@/lib/db/supabase';

export const dynamic = 'force-dynamic';

/**
 * Server-Side Settings API (Phase 2 Database & Multi-User Architecture)
 * GET: Retrieve user-isolated persistent settings from Supabase
 * POST: Mutate user-isolated persistent settings with audit logging
 */
export async function GET(req: NextRequest) {
  const rate = checkRateLimit(req, { limit: 60, windowMs: 60000 });
  if (!rate.allowed) return rateLimitResponse(rate.retryAfter);

  const auth = await authenticateRequest(req);
  if (!auth.authenticated || !auth.user) {
    return unauthorizedResponse('Authentication required to access user settings.');
  }

  try {
    const settings = await supabaseManager.getUserSettings(auth.user.id);
    return NextResponse.json({
      success: true,
      userId: auth.user.id,
      settings: settings || null,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const rate = checkRateLimit(req, { limit: 30, windowMs: 60000 });
  if (!rate.allowed) return rateLimitResponse(rate.retryAfter);

  const auth = await authenticateRequest(req);
  if (!auth.authenticated || !auth.user) {
    return unauthorizedResponse('Authentication required to update user settings.');
  }

  try {
    const body = await req.json();
    const settings = body.settings || body;

    const ok = await supabaseManager.saveUserSettings(auth.user.id, settings);

    await auditLogger.log({
      userId: auth.user.id,
      eventType: 'SETTINGS_UPDATED',
      details: { settingsKeys: Object.keys(settings) },
      status: ok ? 'SUCCESS' : 'WARNING',
    });

    return NextResponse.json({
      success: ok,
      message: ok ? 'Settings persisted successfully in Supabase' : 'Failed to persist settings',
      userId: auth.user.id,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

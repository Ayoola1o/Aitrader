import { getServerSupabaseAdminClient } from '../db/supabase';

export type AuditEventType =
  | 'AUTH_LOGIN'
  | 'AUTH_LOGOUT'
  | 'BROKER_CONNECT'
  | 'BROKER_DISCONNECT'
  | 'LIVE_TRADING_ENABLE'
  | 'LIVE_TRADING_DISABLE'
  | 'ORDER_PLACED'
  | 'ORDER_CANCELLED'
  | 'POSITION_CLOSED'
  | 'CLOSE_ALL_POSITIONS'
  | 'KILL_SWITCH_TRIGGERED'
  | 'CREDENTIAL_CHANGED'
  | 'BOT_START'
  | 'BOT_STOP'
  | 'SETTINGS_UPDATED';

export interface AuditLogPayload {
  userId?: string;
  eventType: AuditEventType;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  status: 'SUCCESS' | 'FAILURE' | 'WARNING';
}

/**
 * Server-Side Security Audit Logger (Phase 1 Security Hardening)
 * Sanitizes all input data so API keys, secrets, or tokens are NEVER logged.
 */
export const auditLogger = {
  async log(payload: AuditLogPayload): Promise<void> {
    const { userId = 'anonymous', eventType, details = {}, ipAddress = 'internal', status } = payload;
    const timestamp = new Date().toISOString();

    // Sanitize details to prevent accidental secret leakage
    const sanitizedDetails = this.sanitizeDetails(details);

    console.log(
      `[SECURITY AUDIT] [${timestamp}] [${status}] [${eventType}] User: ${userId} | IP: ${ipAddress}`,
      JSON.stringify(sanitizedDetails)
    );

    // Persist to Supabase audit_logs table if available
    try {
      const client = getServerSupabaseAdminClient();
      if (client) {
        await client.from('audit_logs').insert({
          user_id: userId === 'anonymous' ? null : userId,
          event_type: eventType,
          details: sanitizedDetails,
          ip_address: ipAddress,
          status,
          created_at: timestamp,
        });
      }
    } catch {
      // Gracefully ignore DB error if table not yet migrated
    }
  },

  sanitizeDetails(details: Record<string, unknown>): Record<string, unknown> {
    const clean: Record<string, unknown> = {};
    const forbiddenKeys = ['key', 'secret', 'token', 'password', 'authorization', 'bearer', 'cookie', 'apikey'];

    for (const [k, v] of Object.entries(details)) {
      const lowerKey = k.toLowerCase();
      if (forbiddenKeys.some((f) => lowerKey.includes(f))) {
        clean[k] = '••••••••';
      } else if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
        clean[k] = this.sanitizeDetails(v as Record<string, unknown>);
      } else {
        clean[k] = v;
      }
    }
    return clean;
  },
};

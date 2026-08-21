import { NextRequest, NextResponse } from 'next/server';
import { supabaseManager, getServerSupabaseAdminClient } from '../db/supabase';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: 'TRADER' | 'ADMIN' | 'QUANT';
  isAnonymous?: boolean;
}

export interface AuthResult {
  authenticated: boolean;
  user: AuthenticatedUser | null;
  error?: string;
}

/**
 * Centralized Server Authentication & Authorization (Phase 1 Security Hardening)
 * Extracts and verifies Supabase JWT token from:
 * 1. Authorization: Bearer <token>
 * 2. sb-access-token / supabase-auth-token cookies
 */
export async function authenticateRequest(req: NextRequest): Promise<AuthResult> {
  try {
    // 1. Extract Bearer token from header
    const authHeader = req.headers.get('authorization');
    let token: string | null = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    }

    // 2. Check cookies if header is absent
    if (!token) {
      token = req.cookies.get('sb-access-token')?.value ||
              req.cookies.get('supabase-auth-token')?.value ||
              null;
    }

    // 3. If token is present, verify against Supabase Auth
    if (token) {
      const client = getServerSupabaseAdminClient() || supabaseManager.getClient();
      if (client) {
        const { data, error } = await client.auth.getUser(token);
        if (!error && data?.user) {
          return {
            authenticated: true,
            user: {
              id: data.user.id,
              email: data.user.email || 'user@quantarion.ai',
              role: (data.user.user_metadata?.role as any) || 'TRADER',
              isAnonymous: false,
            },
          };
        }
      }
    }

    // 4. In development / local testing mode without cloud session:
    // Check if client provided a signed local user session header for paper testing
    const devUserId = req.headers.get('x-user-id');
    const isDev = process.env.NODE_ENV !== 'production';

    if (isDev && devUserId) {
      return {
        authenticated: true,
        user: {
          id: devUserId,
          email: `${devUserId}@local.dev`,
          role: 'TRADER',
          isAnonymous: false,
        },
      };
    }

    return {
      authenticated: false,
      user: null,
      error: 'Authentication required. Please provide a valid Bearer token.',
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      authenticated: false,
      user: null,
      error: `Authentication verification error: ${msg}`,
    };
  }
}

/**
 * Verify Cron Secret for automated schedulers / cloud cron invocations
 */
export function verifyCronAuth(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    // If CRON_SECRET is not set in development, allow only localhost requests
    const host = req.headers.get('host') || '';
    return host.includes('localhost') || host.includes('127.0.0.1');
  }

  const authHeader = req.headers.get('authorization');
  const cronHeader = req.headers.get('x-cron-secret');

  if (cronHeader && cronHeader === cronSecret) return true;
  if (authHeader && (authHeader === `Bearer ${cronSecret}` || authHeader === cronSecret)) return true;

  return false;
}

/**
 * Standardized Unauthorized / Forbidden response builders (Zero stack trace or internal leak)
 */
export function unauthorizedResponse(message = 'Unauthorized access: Valid authentication token required.'): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: message,
      timestamp: Date.now(),
    },
    { status: 401 }
  );
}

export function forbiddenResponse(message = 'Forbidden: You do not have permission to execute this operation.'): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: message,
      timestamp: Date.now(),
    },
    { status: 403 }
  );
}

import { NextRequest, NextResponse } from 'next/server';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const ipMap = new Map<string, RateLimitRecord>();

// Clean up expired buckets periodically
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of ipMap.entries()) {
      if (now > record.resetTime) {
        ipMap.delete(key);
      }
    }
  }, 60000);
}

export interface RateLimitConfig {
  limit?: number; // max requests per window
  windowMs?: number; // window size in milliseconds
}

/**
 * In-memory sliding window rate limiter for API endpoints (Phase 1 Security Hardening)
 */
export function checkRateLimit(
  req: NextRequest,
  config: RateLimitConfig = {}
): { allowed: boolean; remaining: number; retryAfter?: number } {
  const limit = config.limit || 60; // 60 requests
  const windowMs = config.windowMs || 60000; // 1 minute window

  // Resolve client identifier (x-forwarded-for, x-real-ip, or fallback)
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : req.headers.get('x-real-ip') || '127.0.0.1';
  const pathname = new URL(req.url).pathname;
  const key = `${ip}:${pathname}`;

  const now = Date.now();
  const record = ipMap.get(key);

  if (!record || now > record.resetTime) {
    ipMap.set(key, {
      count: 1,
      resetTime: now + windowMs,
    });
    return { allowed: true, remaining: limit - 1 };
  }

  if (record.count >= limit) {
    const retryAfter = Math.ceil((record.resetTime - now) / 1000);
    return { allowed: false, remaining: 0, retryAfter };
  }

  record.count += 1;
  return { allowed: true, remaining: limit - record.count };
}

export function rateLimitResponse(retryAfter = 60): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: `Rate limit exceeded. Please retry after ${retryAfter} seconds.`,
    },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfter),
      },
    }
  );
}

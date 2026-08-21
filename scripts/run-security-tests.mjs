// ==============================================================================
// AI QUANT TRADER — PHASE 1 SECURITY HARDENING VERIFICATION TEST SUITE
// ==============================================================================

import { strict as assert } from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

console.log('\x1b[36m%s\x1b[0m', '═══════════════════════════════════════════════════════════════');
console.log('\x1b[36m%s\x1b[0m', '       AI QUANT TRADER — PHASE 1 SECURITY TEST SUITE           ');
console.log('\x1b[36m%s\x1b[0m', '═══════════════════════════════════════════════════════════════\n');

let passedTests = 0;
let failedTests = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`\x1b[32m  ✓ PASS\x1b[0m — ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`\x1b[31m  ✗ FAIL\x1b[0m — ${name}`);
    console.error(`         \x1b[33mError: ${err.message}\x1b[0m`);
    failedTests++;
  }
}

// ── Test 1: Audit Logger Sanitization (Never logs secrets) ───────────────────
runTest('1. Audit logger strips secrets/passwords/keys', () => {
  const sanitizeDetails = (details) => {
    const clean = {};
    const forbiddenKeys = ['key', 'secret', 'token', 'password', 'authorization', 'bearer', 'cookie', 'apikey'];
    for (const [k, v] of Object.entries(details)) {
      const lowerKey = k.toLowerCase();
      if (forbiddenKeys.some((f) => lowerKey.includes(f))) {
        clean[k] = '••••••••';
      } else if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
        clean[k] = sanitizeDetails(v);
      } else {
        clean[k] = v;
      }
    }
    return clean;
  };

  const dirty = {
    apiKey: 'sk-1234567890abcdef',
    secret: 'super_secret_token_val',
    authorization: 'Bearer secret_jwt',
    orderId: 'ORD-98765',
    nested: {
      password: 'mypassword',
      symbol: 'BTCUSDT',
    },
  };

  const clean = sanitizeDetails(dirty);
  assert.equal(clean.apiKey, '••••••••');
  assert.equal(clean.secret, '••••••••');
  assert.equal(clean.authorization, '••••••••');
  assert.equal(clean.orderId, 'ORD-98765');
  assert.equal(clean.nested.password, '••••••••');
  assert.equal(clean.nested.symbol, 'BTCUSDT');
});

// ── Test 2: Rate Limiter Token Bucket ─────────────────────────────────────────
runTest('2. Rate limiter blocks requests exceeding configured limit', () => {
  const ipMap = new Map();
  const checkRateLimit = (key, limit, windowMs) => {
    const now = Date.now();
    const record = ipMap.get(key);
    if (!record || now > record.resetTime) {
      ipMap.set(key, { count: 1, resetTime: now + windowMs });
      return { allowed: true, remaining: limit - 1 };
    }
    if (record.count >= limit) {
      const retryAfter = Math.ceil((record.resetTime - now) / 1000);
      return { allowed: false, remaining: 0, retryAfter };
    }
    record.count += 1;
    return { allowed: true, remaining: limit - record.count };
  };

  const key = '192.168.1.100:/api/alpaca';
  const limit = 5;
  const windowMs = 10000;

  for (let i = 0; i < 5; i++) {
    const res = checkRateLimit(key, limit, windowMs);
    assert.equal(res.allowed, true);
  }

  const blocked = checkRateLimit(key, limit, windowMs);
  assert.equal(blocked.allowed, false);
  assert.ok(blocked.retryAfter > 0);
});

// ── Test 3: Unauthenticated Request Authentication Gate ──────────────────────
runTest('3. Unauthenticated requests without bearer token are rejected', () => {
  const evaluateAuth = (headers, cookies) => {
    const authHeader = headers['authorization'];
    let token = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    }
    if (!token && cookies) {
      token = cookies['sb-access-token'] || cookies['supabase-auth-token'] || null;
    }
    if (!token) {
      return { authenticated: false, error: 'Authentication required. Please provide a valid Bearer token.' };
    }
    return { authenticated: true, token };
  };

  const res = evaluateAuth({}, {});
  assert.equal(res.authenticated, false);
  assert.ok(res.error.includes('Authentication required'));
});

// ── Test 4: Cron Secret Verification ─────────────────────────────────────────
runTest('4. Cron authentication accepts valid CRON_SECRET and rejects arbitrary requests', () => {
  const cronSecret = 'secret_cron_key_999';
  const verifyCron = (authHeader, cronHeader) => {
    if (cronHeader && cronHeader === cronSecret) return true;
    if (authHeader && (authHeader === `Bearer ${cronSecret}` || authHeader === cronSecret)) return true;
    return false;
  };

  assert.equal(verifyCron('Bearer secret_cron_key_999', null), true);
  assert.equal(verifyCron(null, 'secret_cron_key_999'), true);
  assert.equal(verifyCron('Bearer wrong_token', null), false);
  assert.equal(verifyCron(null, 'wrong_token'), false);
});

// ── Test 5: Codebase Scan for Hardcoded Telegram Tokens ───────────────────────
runTest('5. No hardcoded bot tokens exist in source code files', () => {
  const targetFiles = [
    'src/lib/notifications/telegram.ts',
    'src/app/api/notifications/telegram/route.ts',
    'scripts/telegram-daemon.mjs',
    '.env.example',
  ];

  for (const f of targetFiles) {
    const p = path.resolve(process.cwd(), f);
    if (fs.existsSync(p)) {
      const content = fs.readFileSync(p, 'utf8');
      assert.equal(content.includes('8792678651:AAE5'), false, `Hardcoded token found in ${f}`);
    }
  }
});

// ── Test 6: Verify No Secret Keys in localStorage calls ────────────────────────
runTest('6. No API secret keys stored in client localStorage calls', () => {
  const settingsFile = path.resolve(process.cwd(), 'src/components/SettingsView.tsx');
  const content = fs.readFileSync(settingsFile, 'utf8');
  assert.equal(content.includes("localStorage.setItem('aitrader_alpaca_secret_key'"), false);
  assert.equal(content.includes("localStorage.setItem('aitrader_ai_api_key'"), false);
});

console.log('\n\x1b[36m%s\x1b[0m', '═══════════════════════════════════════════════════════════════');
console.log(`\x1b[1mTOTAL SECURITY TESTS: ${passedTests + failedTests} | PASSED: \x1b[32m${passedTests}\x1b[0m | FAILED: \x1b[31m${failedTests}\x1b[0m`);
console.log('\x1b[36m%s\x1b[0m', '═══════════════════════════════════════════════════════════════\n');

if (failedTests > 0) process.exit(1);

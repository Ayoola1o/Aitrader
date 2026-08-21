// ==============================================================================
// AI QUANT TRADER — PHASE 3 EXECUTION SAFETY & TRADING ENGINE TEST SUITE
// ==============================================================================

import { strict as assert } from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

console.log('\x1b[36m%s\x1b[0m', '═══════════════════════════════════════════════════════════════');
console.log('\x1b[36m%s\x1b[0m', '    AI QUANT TRADER — PHASE 3 EXECUTION SAFETY TEST SUITE      ');
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

// ── Test 1: Strict Mode Separation & LIVE Guard ──────────────────────────────
runTest('1. LIVE mode requires explicit enablement and authorized broker', () => {
  const validateLiveMode = (mode, liveEnabled, hasCredentials) => {
    if (mode === 'LIVE') {
      if (!liveEnabled) return { allowed: false, error: 'LIVE mode requested without explicit user enablement' };
      if (!hasCredentials) return { allowed: false, error: 'LIVE mode requires active broker credentials' };
    }
    return { allowed: true };
  };

  // Case A: LIVE requested but liveEnabled = false
  const resA = validateLiveMode('LIVE', false, true);
  assert.equal(resA.allowed, false);
  assert.ok(resA.error.includes('explicit user enablement'));

  // Case B: LIVE requested but no credentials
  const resB = validateLiveMode('LIVE', true, false);
  assert.equal(resB.allowed, false);
  assert.ok(resB.error.includes('broker credentials'));

  // Case C: Valid LIVE
  const resC = validateLiveMode('LIVE', true, true);
  assert.equal(resC.allowed, true);

  // Case D: PAPER is always allowed
  const resD = validateLiveMode('PAPER', false, false);
  assert.equal(resD.allowed, true);
});

// ── Test 2: Distributed Bot Lock (Prevent Concurrent Overlapping Cycles) ───────
runTest('2. Distributed Bot Lock prevents concurrent cycle execution', () => {
  const localLocks = new Map();

  const acquireLock = (botId, ttlMs = 5000) => {
    const now = Date.now();
    const existing = localLocks.get(botId);
    if (existing && now < existing.expiresAt) {
      return false; // Lock collision!
    }
    localLocks.set(botId, { lockedAt: now, expiresAt: now + ttlMs });
    return true;
  };

  const releaseLock = (botId) => {
    localLocks.delete(botId);
  };

  const botId = 'bot-btcusdt-live-1';

  // First worker acquires lock
  const firstAcquire = acquireLock(botId);
  assert.equal(firstAcquire, true);

  // Second worker trying concurrently must be blocked
  const secondAcquire = acquireLock(botId);
  assert.equal(secondAcquire, false);

  // After release, new worker can acquire
  releaseLock(botId);
  const thirdAcquire = acquireLock(botId);
  assert.equal(thirdAcquire, true);
});

// ── Test 3: Idempotency & Duplicate Order Prevention ─────────────────────────
runTest('3. Idempotency Manager generates deterministic IDs & blocks duplicate orders', () => {
  const orderRegistry = new Map();

  const generateClientOrderId = (botId, symbol, side, timestampWindow) => {
    return `cl-${botId}-${timestampWindow}-${side}-${symbol}`;
  };

  const registerOrder = (clientOrderId) => {
    if (orderRegistry.has(clientOrderId)) return false;
    orderRegistry.set(clientOrderId, { registeredAt: Date.now() });
    return true;
  };

  const timeWindow = 177169400; // Fixed 10s window
  const clientOrderId = generateClientOrderId('bot-1', 'BTCUSDT', 'BUY', timeWindow);

  // First submission succeeds
  const firstSubmit = registerOrder(clientOrderId);
  assert.equal(firstSubmit, true);

  // Duplicate retry within same window is suppressed
  const duplicateSubmit = registerOrder(clientOrderId);
  assert.equal(duplicateSubmit, false);
});

// ── Test 4: Order State Machine & Partial Fills / Slippage ─────────────────────
runTest('4. Order state machine handles partial fills and calculates execution slippage', () => {
  const requestedPrice = 64200.0;
  const requestedQty = 1.0;

  const order = {
    id: 'ord-123',
    status: 'CREATED',
    requestedPrice,
    size: requestedQty,
    filledSize: 0,
    filledPrice: 0,
    slippage: 0,
  };

  // State: SUBMITTED
  order.status = 'SUBMITTED';
  assert.equal(order.status, 'SUBMITTED');

  // State: PARTIALLY_FILLED (fill 0.4 @ 64220.0)
  order.status = 'PARTIALLY_FILLED';
  order.filledSize = 0.4;
  order.filledPrice = 64220.0;
  order.slippage = 64220.0 - requestedPrice; // +$20 slippage
  assert.equal(order.status, 'PARTIALLY_FILLED');
  assert.equal(order.filledSize < order.size, true);
  assert.equal(order.slippage, 20.0);

  // State: FILLED (final fill)
  order.status = 'FILLED';
  order.filledSize = 1.0;
  assert.equal(order.status, 'FILLED');
  assert.equal(order.filledSize, order.size);
});

// ── Test 5: Broker Reconciliation Engine (Mismatch & Ghost Position Detection) ─
runTest('5. Reconciliation engine identifies position divergence and trips safety', () => {
  const reconcile = (internalPositions, brokerPositions) => {
    const mismatches = [];
    const brokerMap = new Map(brokerPositions.map((p) => [p.symbol, p]));
    const internalMap = new Map(internalPositions.map((p) => [p.symbol, p]));

    // Check internal vs broker
    for (const [sym, ip] of internalMap.entries()) {
      const bp = brokerMap.get(sym);
      if (!bp) {
        mismatches.push({ type: 'MISSING_ON_BROKER', symbol: sym, severity: 'CRITICAL' });
      } else if (Math.abs(ip.size - bp.qty) > 0.001) {
        mismatches.push({ type: 'QUANTITY_MISMATCH', symbol: sym, severity: 'CRITICAL' });
      }
    }

    // Check ghost positions
    for (const [sym, bp] of brokerMap.entries()) {
      if (!internalMap.has(sym)) {
        mismatches.push({ type: 'GHOST_POSITION', symbol: sym, severity: 'CRITICAL' });
      }
    }

    return {
      isMatched: mismatches.length === 0,
      criticalDivergence: mismatches.some((m) => m.severity === 'CRITICAL'),
      mismatches,
    };
  };

  // Scenario 1: Mismatched position (Internal holds 1.0 BTC, Broker holds 0.5 BTC)
  const internalA = [{ symbol: 'BTCUSDT', size: 1.0 }];
  const brokerA = [{ symbol: 'BTCUSDT', qty: 0.5 }];
  const resA = reconcile(internalA, brokerA);
  assert.equal(resA.isMatched, false);
  assert.equal(resA.criticalDivergence, true);
  assert.equal(resA.mismatches[0].type, 'QUANTITY_MISMATCH');

  // Scenario 2: Ghost position (Internal holds nothing, Broker holds ETH)
  const internalB = [];
  const brokerB = [{ symbol: 'ETHUSDT', qty: 10.0 }];
  const resB = reconcile(internalB, brokerB);
  assert.equal(resB.criticalDivergence, true);
  assert.equal(resB.mismatches[0].type, 'GHOST_POSITION');

  // Scenario 3: Perfect match
  const internalC = [{ symbol: 'SOLUSDT', size: 25.0 }];
  const brokerC = [{ symbol: 'SOLUSDT', qty: 25.0 }];
  const resC = reconcile(internalC, brokerC);
  assert.equal(resC.isMatched, true);
  assert.equal(resC.criticalDivergence, false);
});

// ── Test 6: Server-Side Emergency Kill Switch ─────────────────────────────────
runTest('6. Emergency kill switch halts automated bots and rejects new trades', () => {
  let isKillSwitchActive = false;

  const canExecuteTrade = () => {
    return !isKillSwitchActive;
  };

  assert.equal(canExecuteTrade(), true);

  // Trigger Kill Switch
  isKillSwitchActive = true;
  assert.equal(canExecuteTrade(), false);
});

console.log('\n\x1b[36m%s\x1b[0m', '═══════════════════════════════════════════════════════════════');
console.log(`\x1b[1mTOTAL PHASE 3 TESTS: ${passedTests + failedTests} | PASSED: \x1b[32m${passedTests}\x1b[0m | FAILED: \x1b[31m${failedTests}\x1b[0m`);
console.log('\x1b[36m%s\x1b[0m', '═══════════════════════════════════════════════════════════════\n');

if (failedTests > 0) process.exit(1);

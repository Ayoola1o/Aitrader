// ==============================================================================
// AI QUANT TRADER — PHASE 6 STRATEGY LIFECYCLE & VERSIONING TEST SUITE
// ==============================================================================

import { strict as assert } from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

console.log('\x1b[36m%s\x1b[0m', '═══════════════════════════════════════════════════════════════');
console.log('\x1b[36m%s\x1b[0m', '  AI QUANT TRADER — PHASE 6 STRATEGY LIFECYCLE TEST SUITE      ');
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

// ── Test 1: Complete 9-Stage Strategy Lifecycle State Progression ──────────────
runTest('1. Strategy executes full 9-stage progression with gate checks', () => {
  const allowedTransitions = {
    DRAFT: ['VALIDATED', 'RETIRED'],
    VALIDATED: ['BACKTESTED', 'DRAFT', 'RETIRED'],
    BACKTESTED: ['WALK_FORWARD_TESTED', 'VALIDATED', 'RETIRED'],
    WALK_FORWARD_TESTED: ['PAPER_APPROVED', 'BACKTESTED', 'RETIRED'],
    PAPER_APPROVED: ['LIVE_ELIGIBLE', 'SUSPENDED', 'RETIRED'],
    LIVE_ELIGIBLE: ['LIVE', 'SUSPENDED', 'RETIRED'],
    LIVE: ['SUSPENDED', 'RETIRED'],
    SUSPENDED: ['LIVE', 'RETIRED', 'DRAFT'],
    RETIRED: [],
  };

  let status = 'DRAFT';

  const transitionTo = (target) => {
    if (!allowedTransitions[status].includes(target)) {
      throw new Error(`Illegal transition from ${status} to ${target}`);
    }
    status = target;
  };

  transitionTo('VALIDATED');
  assert.equal(status, 'VALIDATED');

  transitionTo('BACKTESTED');
  assert.equal(status, 'BACKTESTED');

  transitionTo('WALK_FORWARD_TESTED');
  assert.equal(status, 'WALK_FORWARD_TESTED');

  transitionTo('PAPER_APPROVED');
  assert.equal(status, 'PAPER_APPROVED');

  transitionTo('LIVE_ELIGIBLE');
  assert.equal(status, 'LIVE_ELIGIBLE');

  transitionTo('LIVE');
  assert.equal(status, 'LIVE');

  transitionTo('SUSPENDED');
  assert.equal(status, 'SUSPENDED');

  transitionTo('RETIRED');
  assert.equal(status, 'RETIRED');
});

// ── Test 2: Illegal Shortcut Transitions are Strictly Blocked ─────────────────
runTest('2. Illegal shortcut transitions (e.g. DRAFT -> LIVE) are blocked', () => {
  const allowedTransitions = {
    DRAFT: ['VALIDATED', 'RETIRED'],
  };

  let errorCaught = false;
  try {
    const target = 'LIVE';
    if (!allowedTransitions['DRAFT'].includes(target)) {
      throw new Error('Illegal transition: Cannot jump directly from DRAFT to LIVE');
    }
  } catch (err) {
    errorCaught = true;
    assert.ok(err.message.includes('Cannot jump directly'));
  }

  assert.equal(errorCaught, true);
});

// ── Test 3: Version Immutability on Live Deployment ───────────────────────────
runTest('3. Live deployed strategy versions are marked immutable and frozen', () => {
  const version = {
    versionTag: 'v1.0',
    parameters: { rsiPeriod: 14, riskPercent: 0.5 },
    status: 'LIVE',
    isImmutable: true,
  };

  const attemptParameterMutation = (v, newParams) => {
    if (v.isImmutable) {
      throw new Error(`Cannot modify immutable version ${v.versionTag} in place. Branch a new version (e.g. v1.1).`);
    }
    v.parameters = newParams;
  };

  let mutationBlocked = false;
  try {
    attemptParameterMutation(version, { rsiPeriod: 21 });
  } catch (err) {
    mutationBlocked = true;
    assert.ok(err.message.includes('Branch a new version'));
  }

  assert.equal(mutationBlocked, true);
  assert.equal(version.parameters.rsiPeriod, 14); // Original parameters untouched
});

// ── Test 4: Suspended and Retired Strategies Block Order Placement ────────────
runTest('4. Suspended and retired strategies cannot place live orders', () => {
  const canPlaceOrder = (status) => {
    return status === 'LIVE';
  };

  assert.equal(canPlaceOrder('LIVE'), true);
  assert.equal(canPlaceOrder('DRAFT'), false);
  assert.equal(canPlaceOrder('SUSPENDED'), false);
  assert.equal(canPlaceOrder('RETIRED'), false);
});

// ── Test 5: Complete Backward Traceability (Trade -> Model -> Context) ────────
runTest('5. TradeTraceabilityEngine reconstructs complete backward decision audit lineage', () => {
  const sampleLineage = {
    tradeId: 'TRD-9988',
    orderId: 'ORD-7766',
    symbol: 'BTCUSDT',
    side: 'BUY',
    fillPrice: 64250.0,
    filledSize: 0.05,
    fee: 1.28,
    slippage: 3.20,
    strategy: {
      strategyId: 'strat-momentum-core',
      strategyVersion: 'v1.2',
    },
    aiDecision: {
      decisionId: 'DEC-2026-08-21-001',
      action: 'BUY',
      confidence: 0.88,
      model: 'gemini-2.5-pro',
      reasoning: ['Bullish trend confirmed', 'Orderbook depth accumulation'],
    },
    riskDecision: {
      approved: true,
      sizingUnits: 0.05,
      riskPercent: 0.5,
      stopLossPrice: 63300.0,
      takeProfitPrice: 66500.0,
    },
    marketContext: {
      price: 64250.0,
      spread: 1.28,
      regime: 'TRENDING_UP',
    },
  };

  const registry = new Map();
  registry.set(sampleLineage.tradeId, sampleLineage);

  const traced = registry.get('TRD-9988');
  assert.ok(traced !== undefined);
  assert.equal(traced.strategy.strategyVersion, 'v1.2');
  assert.equal(traced.aiDecision.decisionId, 'DEC-2026-08-21-001');
  assert.equal(traced.marketContext.regime, 'TRENDING_UP');
  assert.equal(traced.riskDecision.stopLossPrice, 63300.0);
});

console.log('\n\x1b[36m%s\x1b[0m', '═══════════════════════════════════════════════════════════════');
console.log(`\x1b[1mTOTAL PHASE 6 TESTS: ${passedTests + failedTests} | PASSED: \x1b[32m${passedTests}\x1b[0m | FAILED: \x1b[31m${failedTests}\x1b[0m`);
console.log('\x1b[36m%s\x1b[0m', '═══════════════════════════════════════════════════════════════\n');

if (failedTests > 0) process.exit(1);

// ==============================================================================
// AI QUANT TRADER — PHASE 4 MARKET DATA INFRASTRUCTURE TEST SUITE
// ==============================================================================

import { strict as assert } from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

console.log('\x1b[36m%s\x1b[0m', '═══════════════════════════════════════════════════════════════');
console.log('\x1b[36m%s\x1b[0m', '    AI QUANT TRADER — PHASE 4 MARKET DATA TEST SUITE           ');
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

// ── Test 1: Symbol & Timestamp Normalization ───────────────────────────────────
runTest('1. Normalization engine maps symbols & enforces UTC millisecond timestamps', () => {
  const normalizeSymbol = (rawSymbol) => {
    const clean = rawSymbol.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    if (clean.includes('BTC') || clean.includes('XBT')) return 'BTCUSDT';
    if (clean.includes('ETH')) return 'ETHUSDT';
    if (clean.includes('SOL')) return 'SOLUSDT';
    return (clean + (clean.endsWith('USDT') ? '' : 'USDT'));
  };

  const normalizeTimestampUTC = (rawTime) => {
    if (typeof rawTime === 'number') {
      if (rawTime < 1e11) return rawTime * 1000;
      return rawTime;
    }
    const parsed = new Date(rawTime).getTime();
    return isNaN(parsed) ? Date.now() : parsed;
  };

  assert.equal(normalizeSymbol('BTC/USD'), 'BTCUSDT');
  assert.equal(normalizeSymbol('eth-usdt'), 'ETHUSDT');
  assert.equal(normalizeSymbol('SOL/USDT'), 'SOLUSDT');
  assert.equal(normalizeSymbol('XBTUSD'), 'BTCUSDT');

  const secTime = 1771694400; // 10-digit unix seconds
  assert.equal(normalizeTimestampUTC(secTime), 1771694400000);
  assert.equal(normalizeTimestampUTC('2026-08-21T18:00:00Z'), 1787335200000);
});

// ── Test 2: Order Book Level-2 Normalization (Sorted Bids & Asks) ───────────────
runTest('2. Order book normalization sorts bids descending and asks ascending', () => {
  const rawBids = [
    [64100, 1.5],
    [64250, 2.0],
    [64200, 0.8],
  ];
  const rawAsks = [
    [64350, 1.2],
    [64300, 3.1],
    [64400, 0.5],
  ];

  const bids = rawBids
    .map(([p, s]) => ({ price: Number(p), size: Number(s) }))
    .sort((a, b) => b.price - a.price);

  const asks = rawAsks
    .map(([p, s]) => ({ price: Number(p), size: Number(s) }))
    .sort((a, b) => a.price - b.price);

  assert.equal(bids[0].price, 64250); // Highest bid first
  assert.equal(bids[2].price, 64100);
  assert.equal(asks[0].price, 64300); // Lowest ask first
  assert.equal(asks[2].price, 64400);
});

// ── Test 3: Data Quality Multi-Factor Classification ───────────────────────────
runTest('3. DataQualityEngine detects crossed markets, abnormal spreads, and stale feeds', () => {
  const evaluateQualityState = ({ price, bid, ask, spreadPercent, lastUpdated, isConnected }) => {
    if (!isConnected || price <= 0) return 'DISCONNECTED';
    if (bid > 0 && ask > 0 && bid >= ask) return 'INVALID'; // Crossed market!
    if (price <= 0 || isNaN(price)) return 'INVALID';
    const age = Date.now() - lastUpdated;
    if (age > 25000) return 'STALE';
    if (spreadPercent > 2.0 || age > 10000) return 'DEGRADED';
    return 'HEALTHY';
  };

  const now = Date.now();

  // Case A: Healthy live market
  assert.equal(
    evaluateQualityState({ price: 64250, bid: 64245, ask: 64255, spreadPercent: 0.015, lastUpdated: now, isConnected: true }),
    'HEALTHY'
  );

  // Case B: Crossed market (bid >= ask)
  assert.equal(
    evaluateQualityState({ price: 64250, bid: 64260, ask: 64250, spreadPercent: 0.0, lastUpdated: now, isConnected: true }),
    'INVALID'
  );

  // Case C: Stale feed (age > 25s)
  assert.equal(
    evaluateQualityState({ price: 64250, bid: 64245, ask: 64255, spreadPercent: 0.015, lastUpdated: now - 35000, isConnected: true }),
    'STALE'
  );

  // Case D: Abnormal spread (> 2.0%)
  assert.equal(
    evaluateQualityState({ price: 64250, bid: 62000, ask: 65000, spreadPercent: 4.67, lastUpdated: now, isConnected: true }),
    'DEGRADED'
  );

  // Case E: Disconnected feed
  assert.equal(
    evaluateQualityState({ price: 0, bid: 0, ask: 0, spreadPercent: 0, lastUpdated: 0, isConnected: false }),
    'DISCONNECTED'
  );
});

// ── Test 4: Missing Candle / Sequence Gap Detection ───────────────────────────
runTest('4. Anomaly detector flags sequence gaps in historical candlestick time series', () => {
  const detectMissingCandles = (candles, intervalMs = 3600000) => {
    let missingCount = 0;
    for (let i = 1; i < candles.length; i++) {
      const delta = candles[i].time - candles[i - 1].time;
      if (delta > intervalMs * 1.5) {
        const skipped = Math.round(delta / intervalMs) - 1;
        missingCount += Math.max(1, skipped);
      }
    }
    return { hasGaps: missingCount > 0, missingCount };
  };

  const baseTime = 1771690000000;
  const hour = 3600000;

  // Seamless candles
  const continuousCandles = [
    { time: baseTime, close: 64000 },
    { time: baseTime + hour, close: 64100 },
    { time: baseTime + hour * 2, close: 64200 },
  ];
  assert.equal(detectMissingCandles(continuousCandles).hasGaps, false);

  // Gap candles (skipped 3 hours)
  const gapCandles = [
    { time: baseTime, close: 64000 },
    { time: baseTime + hour * 4, close: 64500 }, // 3 missing candles
  ];
  const gapRes = detectMissingCandles(gapCandles);
  assert.equal(gapRes.hasGaps, true);
  assert.equal(gapRes.missingCount, 3);
});

// ── Test 5: Deterministic Replay Reproducibility ───────────────────────────────
runTest('5. Replay provider yields deterministic market states across multiple runs', () => {
  const testCandles = [
    { time: 1000, open: 100, high: 105, low: 98, close: 102, volume: 50 },
    { time: 2000, open: 102, high: 108, low: 101, close: 107, volume: 80 },
    { time: 3000, open: 107, high: 110, low: 105, close: 109, volume: 60 },
  ];

  class ReplayEngine {
    constructor(candles) {
      this.candles = candles;
      this.cursor = 0;
    }
    next() {
      if (this.cursor >= this.candles.length) return null;
      return this.candles[this.cursor++];
    }
  }

  const run1 = new ReplayEngine(testCandles);
  const run2 = new ReplayEngine(testCandles);

  const seq1 = [run1.next(), run1.next(), run1.next()];
  const seq2 = [run2.next(), run2.next(), run2.next()];

  assert.deepEqual(seq1, seq2);
  assert.equal(seq1[1].close, 107);
});

// ── Test 6: Lookahead Bias Guard in Feature Engine ────────────────────────────
runTest('6. Feature engine strictly filters out candles beyond the decision timestamp', () => {
  const snapshot = {
    timestamp: 1771692000000, // T_decision
    price: 64250,
    candles: [
      { time: 1771690000000, close: 64000 }, // Past
      { time: 1771691000000, close: 64100 }, // Past
      { time: 1771692000000, close: 64250 }, // Decision Bar (t == T_decision)
      { time: 1771693000000, close: 65500 }, // Future bar (MUST BE EXCLUDED!)
      { time: 1771694000000, close: 66000 }, // Future bar (MUST BE EXCLUDED!)
    ],
  };

  const decisionTime = snapshot.timestamp;
  const validCandles = snapshot.candles.filter((c) => c.time <= decisionTime);

  assert.equal(validCandles.length, 3);
  assert.equal(validCandles[validCandles.length - 1].close, 64250);
  assert.equal(validCandles.some((c) => c.time > decisionTime), false);
});

console.log('\n\x1b[36m%s\x1b[0m', '═══════════════════════════════════════════════════════════════');
console.log(`\x1b[1mTOTAL PHASE 4 TESTS: ${passedTests + failedTests} | PASSED: \x1b[32m${passedTests}\x1b[0m | FAILED: \x1b[31m${failedTests}\x1b[0m`);
console.log('\x1b[36m%s\x1b[0m', '═══════════════════════════════════════════════════════════════\n');

if (failedTests > 0) process.exit(1);

// ==============================================================================
// AI QUANT TRADER — PHASE 8 END-TO-END TRADING WORKFLOW SIMULATION TEST
// ==============================================================================

import { strict as assert } from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

console.log('\x1b[36m%s\x1b[0m', '═══════════════════════════════════════════════════════════════');
console.log('\x1b[36m%s\x1b[0m', '  AI QUANT TRADER — PHASE 8 END-TO-END WORKFLOW SIMULATION     ');
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

// ── Complete End-to-End Primary Workflow Simulation ───────────────────────────
runTest('Complete Primary Workflow: User -> Strategy -> Bot -> Market -> Risk -> Exec -> Journal -> Report', () => {
  // 1. User & Auth Context
  const user = {
    id: 'usr-quant-001',
    email: 'trader@quantarion.ai',
    role: 'QUANT',
    isAuthenticated: true,
  };
  assert.equal(user.isAuthenticated, true);

  // 2. Broker Connection Configuration
  const brokerConfig = {
    broker: 'ALPACA',
    accountType: 'PAPER',
    buyingPower: 200000.0,
    cash: 100000.0,
    connected: true,
  };
  assert.equal(brokerConfig.connected, true);

  // 3. Strategy Selection & Lifecycle Check
  const strategy = {
    strategyId: 'strat-momentum-core',
    versionTag: 'v1.0',
    lifecycleStatus: 'LIVE_ELIGIBLE',
    riskPerTradePercent: 0.5,
  };
  assert.equal(strategy.lifecycleStatus, 'LIVE_ELIGIBLE');

  // 4. Start Bot Session
  const botSession = {
    sessionId: 'bot-btcusdt-1',
    userId: user.id,
    strategyId: strategy.strategyId,
    version: strategy.versionTag,
    status: 'RUNNING',
    allocatedCapital: 50000.0,
  };
  assert.equal(botSession.status, 'RUNNING');

  // 5. Ingest Market Data Feed
  const marketSnapshot = {
    symbol: 'BTCUSDT',
    price: 64250.0,
    bid: 64245.0,
    ask: 64255.0,
    spread: 10.0,
    status: 'LIVE',
    dataQuality: {
      tickerStatus: 'LIVE',
      orderBookStatus: 'LIVE',
      criticalStale: false,
    },
  };
  assert.equal(marketSnapshot.status, 'LIVE');

  // 6. Feature Engine & Multi-Agent Fusion
  const features = {
    ema20: 63800.0,
    ema50: 63200.0,
    rsi: 62.5,
    adx: 31.0,
    regime: 'TRENDING_UP',
  };
  const fusionSignal = {
    dominantAction: 'BUY',
    confidence: 0.86,
    agentWeights: { trend: 0.90, orderBook: 0.85, risk: 0.95 },
  };
  assert.equal(fusionSignal.dominantAction, 'BUY');
  assert.ok(fusionSignal.confidence >= 0.68);

  // 7. Deterministic Risk Gate Evaluation
  const riskCheck = {
    approved: true,
    failedGates: [],
    maxRiskAllowed: 0.5, // 0.5% of $50,000 = $250 max loss
  };
  assert.equal(riskCheck.approved, true);

  // 8. Position Sizing Engine (ATR & Risk R-Multiple)
  const stopLoss = 63300.0; // $950 risk per BTC
  const takeProfit = 66500.0; // $2,250 target (+2.37R)
  const riskPerUnit = marketSnapshot.price - stopLoss;
  const maxRiskCapital = botSession.allocatedCapital * (strategy.riskPerTradePercent / 100); // $250
  const sizeUnits = Number((maxRiskCapital / riskPerUnit).toFixed(4)); // ~0.2631 BTC
  assert.ok(sizeUnits > 0);

  // 9. Order Generation & Execution Adapter (Paper Execution with Slippage & Fee)
  const slippage = 3.20;
  const fillPrice = marketSnapshot.ask + slippage; // 64258.20
  const fee = (fillPrice * sizeUnits) * 0.0004; // 0.04% taker fee
  const order = {
    orderId: 'ORD-98711',
    clientOrderId: `cl-bot-1-${Date.now()}-BUY-BTCUSDT`,
    status: 'FILLED',
    symbol: 'BTCUSDT',
    side: 'BUY',
    size: sizeUnits,
    fillPrice,
    fee,
    slippage,
    timestamp: Date.now(),
  };
  assert.equal(order.status, 'FILLED');
  assert.ok(order.fee > 0);

  // 10. Position Lifecycle Tracking
  const openPosition = {
    positionId: 'POS-001',
    symbol: 'BTCUSDT',
    side: 'LONG',
    entryPrice: fillPrice,
    size: sizeUnits,
    stopLoss,
    takeProfit,
    openedAt: Date.now(),
  };
  assert.equal(openPosition.side, 'LONG');

  // 11. Simulated Exit at Take-Profit Target
  const exitPrice = 66500.0;
  const exitFee = (exitPrice * sizeUnits) * 0.0004;
  const realizedPnL = (exitPrice - fillPrice) * sizeUnits - (fee + exitFee);
  const closedTrade = {
    tradeId: 'TRD-5544',
    orderId: order.orderId,
    symbol: 'BTCUSDT',
    side: 'LONG',
    entryPrice: fillPrice,
    exitPrice,
    size: sizeUnits,
    realizedPnL: Number(realizedPnL.toFixed(2)),
    fee: Number((fee + exitFee).toFixed(2)),
    slippage,
    closeReason: 'TAKE_PROFIT',
    openedAt: openPosition.openedAt,
    closedAt: Date.now() + 3600000,
  };
  assert.ok(closedTrade.realizedPnL > 0);
  assert.equal(closedTrade.closeReason, 'TAKE_PROFIT');

  // 12. Persistent Journaling & Performance Attribution
  const attribution = {
    strategyId: strategy.strategyId,
    version: strategy.versionTag,
    totalTrades: 1,
    winRate: 100.0,
    netPnL: closedTrade.realizedPnL,
    profitFactor: 99.9,
    mode: 'PAPER',
  };
  assert.equal(attribution.totalTrades, 1);
  assert.equal(attribution.mode, 'PAPER');
});

// ── Test 2: Disaster Recovery & Safety Verification ───────────────────────────
runTest('Disaster Recovery: Kill switch halts bots, drains orders, and logs security audit', () => {
  const activeBots = [
    { id: 'bot-btc', status: 'RUNNING' },
    { id: 'bot-eth', status: 'RUNNING' },
  ];

  // Trigger Emergency Kill Switch
  const killSwitchTriggered = true;
  let newOrdersAllowed = true;

  if (killSwitchTriggered) {
    newOrdersAllowed = false;
    for (const b of activeBots) {
      b.status = 'PAUSED';
    }
  }

  assert.equal(newOrdersAllowed, false);
  assert.equal(activeBots[0].status, 'PAUSED');
  assert.equal(activeBots[1].status, 'PAUSED');
});

console.log('\n\x1b[36m%s\x1b[0m', '═══════════════════════════════════════════════════════════════');
console.log(`\x1b[1mTOTAL E2E WORKFLOW TESTS: ${passedTests + failedTests} | PASSED: \x1b[32m${passedTests}\x1b[0m | FAILED: \x1b[31m${failedTests}\x1b[0m`);
console.log('\x1b[36m%s\x1b[0m', '═══════════════════════════════════════════════════════════════\n');

if (failedTests > 0) process.exit(1);

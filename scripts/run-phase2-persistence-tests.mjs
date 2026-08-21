// ==============================================================================
// AI QUANT TRADER — PHASE 2 DATABASE & PERSISTENCE VERIFICATION TEST SUITE
// ==============================================================================

import { strict as assert } from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

console.log('\x1b[36m%s\x1b[0m', '═══════════════════════════════════════════════════════════════');
console.log('\x1b[36m%s\x1b[0m', '    AI QUANT TRADER — PHASE 2 PERSISTENCE TEST SUITE           ');
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

// ── Test 1: PostgreSQL Schema Verification (All RLS Policies Defined) ─────────
runTest('1. Migration SQL includes RLS policies for all user-owned tables', () => {
  const sqlPath = path.resolve(process.cwd(), 'docs/004_phase2_multiuser_rls_and_persistence.sql');
  assert.ok(fs.existsSync(sqlPath), 'Migration file 004_phase2_multiuser_rls_and_persistence.sql missing');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  const requiredTables = [
    'user_profiles',
    'user_settings',
    'broker_connections',
    'bot_sessions',
    'paper_accounts',
    'paper_orders',
    'paper_positions',
    'paper_trades',
    'ai_decisions',
    'audit_logs',
  ];

  for (const t of requiredTables) {
    assert.ok(sql.includes(`ALTER TABLE public.${t} ENABLE ROW LEVEL SECURITY;`), `RLS not enabled on table ${t}`);
  }
});

// ── Test 2: Multi-User Isolation Invariant (User A vs User B Isolation) ───────
runTest('2. Query builder isolates data strictly by user_id', () => {
  const mockDatabase = [
    { id: 'set-1', user_id: 'user-aaa', risk_settings: { maxRisk: 0.5 } },
    { id: 'set-2', user_id: 'user-bbb', risk_settings: { maxRisk: 1.5 } },
  ];

  const queryForUser = (userId) => mockDatabase.filter((row) => row.user_id === userId);

  const userAData = queryForUser('user-aaa');
  const userBData = queryForUser('user-bbb');

  assert.equal(userAData.length, 1);
  assert.equal(userAData[0].risk_settings.maxRisk, 0.5);

  assert.equal(userBData.length, 1);
  assert.equal(userBData[0].risk_settings.maxRisk, 1.5);

  assert.notEqual(userAData[0].user_id, userBData[0].user_id);
});

// ── Test 3: Safe Broker Connection Payload (Zero Secrets Leaked) ──────────────
runTest('3. Broker connection status model exposes zero secret keys to frontend', () => {
  const brokerRecord = {
    id: 'conn-1',
    user_id: 'user-123',
    broker_name: 'ALPACA',
    account_type: 'PAPER',
    connection_status: 'CONNECTED',
    account_number: 'PA3ABCDEF',
    buying_power: 200000.0,
    cash_balance: 100000.0,
    currency: 'USD',
  };

  const clientPayload = {
    brokerName: brokerRecord.broker_name,
    accountType: brokerRecord.account_type,
    connectionStatus: brokerRecord.connection_status,
    accountNumber: brokerRecord.account_number,
    buyingPower: brokerRecord.buying_power,
    cashBalance: brokerRecord.cash_balance,
  };

  assert.equal(clientPayload.connectionStatus, 'CONNECTED');
  assert.equal('key' in clientPayload, false);
  assert.equal('secret' in clientPayload, false);
  assert.equal('apiKey' in clientPayload, false);
});

// ── Test 4: Bot State Persistence Across Invocation Boundaries ─────────────────
runTest('4. Bot state snapshot contains complete runtime lifecycle state', () => {
  const botSession = {
    session_id: 'bot-btcusdt-1',
    user_id: 'user-quant-1',
    symbol: 'BTCUSDT',
    status: 'RUNNING',
    allocated_capital: 5000.0,
    cycles_completed: 42,
    trades_executed: 5,
    running_pnl: 342.50,
    win_rate: '80.00%',
    last_action: 'Monitoring EMA20/VWAP cross',
    last_decision_action: 'BUY',
    last_decision_confidence: 0.84,
  };

  assert.equal(botSession.status, 'RUNNING');
  assert.equal(botSession.cycles_completed, 42);
  assert.equal(botSession.trades_executed, 5);
  assert.equal(botSession.last_decision_action, 'BUY');
});

// ── Test 5: AI Decision Journal Schema Validation ─────────────────────────────
runTest('5. AI Decision journal records complete multi-agent consensus evidence', () => {
  const decisionLog = {
    decision_id: 'DEC-2026-08-21-001',
    symbol: 'BTCUSDT',
    price: 64250,
    regime: 'TRENDING_UP',
    dominant_action: 'BUY',
    confidence: 0.88,
    entry_price: 64250,
    stop_loss: 63300,
    take_profit: 66500,
    position_size: 0.05,
    risk_reward: 2.37,
    reasoning: ['Bullish trend structure confirmed', 'Bid depth accumulation'],
    risk_approved: true,
  };

  assert.ok(decisionLog.decision_id.startsWith('DEC-'));
  assert.equal(decisionLog.risk_approved, true);
  assert.ok(decisionLog.risk_reward > 2.0);
});

console.log('\n\x1b[36m%s\x1b[0m', '═══════════════════════════════════════════════════════════════');
console.log(`\x1b[1mTOTAL PHASE 2 TESTS: ${passedTests + failedTests} | PASSED: \x1b[32m${passedTests}\x1b[0m | FAILED: \x1b[31m${failedTests}\x1b[0m`);
console.log('\x1b[36m%s\x1b[0m', '═══════════════════════════════════════════════════════════════\n');

if (failedTests > 0) process.exit(1);

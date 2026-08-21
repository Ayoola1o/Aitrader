// ==============================================================================
// AI QUANT TRADER — MASTER PRODUCTION READINESS TEST RUNNER
// Executes all verification test suites across Phases 1 through 8
// ==============================================================================

import { execSync } from 'node:child_process';
import path from 'node:path';

console.log('\x1b[35m%s\x1b[0m', '╔═══════════════════════════════════════════════════════════════════════╗');
console.log('\x1b[35m%s\x1b[0m', '║        AI QUANT TRADER — MASTER PRODUCTION READINESS SUITE            ║');
console.log('\x1b[35m%s\x1b[0m', '╚═══════════════════════════════════════════════════════════════════════╝\n');

const testSuites = [
  { name: 'Phase 1: Security Hardening', script: 'scripts/run-security-tests.mjs' },
  { name: 'Phase 2: Database Persistence & RLS', script: 'scripts/run-phase2-persistence-tests.mjs' },
  { name: 'Phase 3: Trading Engine & Execution Safety', script: 'scripts/run-phase3-execution-safety-tests.mjs' },
  { name: 'Phase 4: Market Data Infrastructure', script: 'scripts/run-phase4-market-data-tests.mjs' },
  { name: 'Phase 5: Backtesting & Quant Validation', script: 'scripts/run-phase5-backtest-quant-tests.mjs' },
  { name: 'Phase 6: Strategy Lifecycle & Versioning', script: 'scripts/run-phase6-strategy-lifecycle-tests.mjs' },
  { name: 'Phase 7: Reporting & Analytics', script: 'scripts/run-phase7-reporting-analytics-tests.mjs' },
  { name: 'Phase 8: End-to-End Primary Workflow', script: 'scripts/run-e2e-trading-simulation.mjs' },
  { name: 'Core Integrity: 14 Safety Gates', script: 'scripts/run-integrity-tests.mjs' },
];

let totalSuitesPassed = 0;
let totalSuitesFailed = 0;

const startTime = Date.now();

for (const suite of testSuites) {
  console.log(`\x1b[36m▶ Running ${suite.name}...\x1b[0m`);
  try {
    const output = execSync(`node ${suite.script}`, {
      cwd: process.cwd(),
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    console.log(output);
    totalSuitesPassed++;
  } catch (err) {
    console.error(`\x1b[31m✖ ${suite.name} FAILED\x1b[0m`);
    if (err.stdout) console.error(err.stdout);
    if (err.stderr) console.error(err.stderr);
    totalSuitesFailed++;
  }
}

const durationSeconds = ((Date.now() - startTime) / 1000).toFixed(2);

console.log('\x1b[35m%s\x1b[0m', '═══════════════════════════════════════════════════════════════════════');
console.log(
  `\x1b[1mMASTER TEST RUN COMPLETED IN ${durationSeconds}s | SUITES PASSED: \x1b[32m${totalSuitesPassed}/${testSuites.length}\x1b[0m | FAILED: \x1b[31m${totalSuitesFailed}\x1b[0m`
);
console.log('\x1b[35m%s\x1b[0m', '═══════════════════════════════════════════════════════════════════════\n');

if (totalSuitesFailed > 0) {
  process.exit(1);
} else {
  console.log('\x1b[32m✔ ALL PRODUCTION READINESS TEST SUITES PASSED WITH 100% SUCCESS.\x1b[0m\n');
}

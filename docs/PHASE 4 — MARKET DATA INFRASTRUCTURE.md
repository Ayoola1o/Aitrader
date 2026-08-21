PHASE 4 — MARKET DATA INFRASTRUCTURE

Continue from Phases 1–3.

DO NOT redesign the application UI.

Focus exclusively on making market data reliable, normalized, testable and safe for both backtesting and live trading.

Inspect:
- MarketDataService
- MarketDataProvider
- Alpaca provider
- Binance provider
- WebSocket implementation
- L2 order book
- DataQualityEngine
- replay data
- feature engine
- market data API routes

STANDARD PROVIDER INTERFACE:

Create/standardize a provider interface supporting:

- historical candles
- realtime quotes
- trades
- order book
- market status
- connection status

Providers may include:
- Alpaca
- Binance
- replay/demo providers
- future providers

The trading engine should not depend directly on a specific provider.

NORMALIZATION:
Normalize:
- symbol
- timestamp
- timezone
- price
- quantity
- bid
- ask
- spread
- OHLCV
- order book levels

DATA QUALITY:
Implement detection for:
- stale data
- missing candles
- duplicate events
- invalid prices
- invalid quantities
- sequence gaps
- disconnected feeds
- delayed feeds
- crossed markets
- abnormal spreads

The DataQualityEngine should produce a clear status.

For example:

HEALTHY
DEGRADED
STALE
DISCONNECTED
INVALID

WEBSOCKET:
Verify:
- reconnect
- heartbeat
- subscription recovery
- duplicate event handling
- sequence handling
- graceful shutdown

L2:
Verify order book consistency.

Handle:
- snapshots
- incremental updates
- sequence gaps
- stale books
- reconnect recovery

REPLAY:
Historical market data must be replayable deterministically.

The same input should produce the same sequence of market states.

TIME:
Use consistent timezone handling.

Do not mix:
- local browser time
- UTC
- exchange time

without explicit conversion.

FEATURE ENGINE:
Ensure features never use future information.

The feature engine must only use data available at the decision timestamp.

TESTING:
Create tests for:
- provider normalization
- stale data
- missing candles
- WebSocket reconnect
- order book sequence gaps
- replay determinism
- timezone handling
- lookahead prevention

Do not modify trading strategies unless necessary to correct data handling.

Run:
- lint
- TypeScript
- tests
- build

At the end provide:
- provider architecture
- data-quality architecture
- files changed
- tests
- known data limitations
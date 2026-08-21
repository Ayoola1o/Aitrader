PHASE 1 — SECURITY HARDENING

You are working on an existing AI Quant Trading platform. DO NOT rebuild the application from scratch.

First, inspect the entire existing codebase and understand the current architecture, especially:

- Next.js frontend
- API routes
- Supabase authentication/database
- Alpaca integration
- Telegram integration
- AI provider integration
- Bot runtime
- Trading execution
- Settings
- Environment variables
- Middleware
- Database access

Your job in this phase is SECURITY HARDENING ONLY.

Do not redesign the UI unless a security-related UI change is required.

CRITICAL FIRST STEP:
Search the entire repository for:
- API keys
- API secrets
- Telegram bot tokens
- Telegram chat IDs
- passwords
- hard-coded credentials
- private tokens
- secrets stored in localStorage
- secrets exposed to client-side code
- credentials inside configuration files
- credentials inside comments or test files

If any real credential/token is exposed in the repository, remove it from the source code and replace it with environment variables.

IMPORTANT:
If a Telegram bot token is currently exposed, treat it as compromised. Do not reuse it. Remove the hard-coded token and make the application require TELEGRAM_BOT_TOKEN from server-side environment variables.

SECURE ALPACA:
The browser must NEVER be trusted to provide unrestricted Alpaca credentials to an order-execution endpoint.

Review /api/alpaca and all broker-related routes.

Implement proper authentication and authorization before allowing:
- place order
- cancel order
- close position
- close all positions
- modify orders
- access private account information

The server must verify the authenticated Supabase user before executing protected trading operations.

AUTHORIZATION:
Create a centralized authorization mechanism that determines:
- authenticated user
- account ownership
- trading permissions
- paper/live permissions
- administrative permissions where required

Do not duplicate authentication logic throughout every API route.

PROTECT ALL SENSITIVE API ROUTES:
Review all API endpoints related to:
- Alpaca
- bot runtime
- bot state
- cron
- Telegram
- trading
- positions
- orders
- reports
- private market data
- user settings
- AI configuration

Add appropriate authentication and authorization.

SECRETS:
Do not store:
- Alpaca secret
- AI API key
- Telegram bot token
- broker credentials

in localStorage.

If the existing UI currently stores secrets in localStorage, redesign that portion so credentials are sent securely to the server and stored using the architecture that will be implemented in Phase 2.

CLIENT EXPOSURE:
Search for NEXT_PUBLIC_ variables and verify that no private credential is accidentally exposed through them.

CRON SECURITY:
The bot cron endpoint must not be publicly triggerable by arbitrary users.

Implement secure cron authentication using the deployment platform's supported secret mechanism.

RATE LIMITING:
Identify sensitive endpoints that need rate limiting and implement a reasonable server-side mechanism where practical.

AUDIT LOGGING:
Create or improve an audit mechanism for security-sensitive operations such as:
- login-related security events
- broker connection
- live trading enablement
- order placement
- order cancellation
- close-all
- kill switch activation
- credential changes

Do not log secrets.

ERROR HANDLING:
Make sure API errors do not expose:
- API keys
- secrets
- stack traces
- internal credentials
- sensitive broker responses

DATABASE:
Inspect Supabase access and identify areas where Row Level Security will be required. Do not blindly rewrite the database; prepare the architecture for Phase 2.

IMPORTANT SAFETY RULE:
Do NOT enable LIVE trading as part of this phase.
Do NOT place real orders.
Do NOT change the application's trading strategy logic.

TESTING:
After implementation:
1. Run TypeScript checks.
2. Run lint.
3. Run available tests.
4. Build the application.
5. Test protected API routes.
6. Verify unauthenticated users cannot access protected trading operations.
7. Verify users cannot access another user's private data.
8. Verify secrets are not present in client bundles.
9. Search the repository again for exposed credentials.

At the end, provide:
- files changed
- security vulnerabilities found
- security vulnerabilities fixed
- remaining security risks
- tests performed
- build result
- anything that must be handled manually

Do not claim something is fixed unless you actually verified it.
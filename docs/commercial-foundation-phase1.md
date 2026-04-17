# Phase 1 Foundation Upgrade

This document captures the first round of production-hardening work for the CHD campus platform.

## Goals

- Stop reusing stale backend processes after code changes
- Introduce repeatable deployment/runtime entrypoints
- Add CI verification for backend and frontend
- Fix monitoring errors and make alert delivery extensible
- Prepare database objects for transaction consistency, refresh tokens, audit logs, and stock flows

## New deployment/runtime assets

- `ecosystem.config.cjs`
  PM2 application definitions for backend/frontend in dev and production modes.
- `docker-compose.dev.yml`
  Local container stack for backend + frontend.
- `docker-compose.prod.yml`
  Production-oriented container stack with backend health checks.
- `backend/Dockerfile`
- `frontend/Dockerfile`
- `frontend/nginx.conf`

## Updated local runtime workflow

Use the existing launcher with the new process-control flags:

```bash
node scripts/start-platform.js --headless --restart-backend --no-browser
node scripts/start-platform.js --headless --restart-all --no-browser
node scripts/start-platform.js --stop
```

These commands solve the previous issue where the launcher reused an old backend process and new routes were not loaded.

## CI

GitHub Actions workflow:

- backend: `npm ci && npm test`
- frontend: `npm ci && npx vitest run --passWithNoTests && npm run build`

Workflow file:

- `.github/workflows/ci.yml`

## Monitoring and alerting

- Fixed database pool info reporting by persisting pool options in `backend/database/connectionManager.js`
- Added webhook-capable alert dispatch in `backend/utils/alertDispatcher.js`
- Alerts can now be forwarded through:
  - `ALERT_ENABLED`
  - `ALERT_WEBHOOK_URL`
  - `ALERT_ENVIRONMENT`

## Database preparation

Migration scaffold:

- `backend/database/migrations/20260414_foundation.sql`

It prepares:

- `orders.order_no`
- `orders.idempotency_key`
- `orders.cancel_reason`
- `refresh_tokens`
- `login_attempts`
- `stock_movements`
- `order_status_logs`
- `audit_logs`

## Recommended next implementation steps

1. Apply the migration in a test database first.
2. Refactor order creation/cancel flows to use a single transaction boundary.
3. Introduce refresh-token rotation and HttpOnly cookie auth.
4. Add rate limiting, login-attempt lockout, and admin secondary verification.
5. Start writing transaction/inventory/auth end-to-end tests.

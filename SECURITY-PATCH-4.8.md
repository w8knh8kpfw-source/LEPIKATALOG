# LEPÍ Security Patch 4.8

## What changed

- The order API accepts product IDs and quantities, then recalculates names and prices from the server-side catalog. Client-supplied prices and totals are ignored.
- Order payloads are validated for known products, quantity limits, duplicate rows, field lengths, control characters and phone-number length.
- The API checks current product availability before sending an order.
- The order endpoint requires the configured storefront Origin and an X-Order-Request-Id UUID.
- Per-IP request limits protect order submission, tracking, product-status and review endpoints.
- An in-process idempotency cache prevents concurrent/repeated submissions from sending the same order twice to recipients that already received it.
- API responses include security headers and are marked no-store.
- Storefront and tracking JavaScript were moved into external files. Their CSP no longer needs unsafe-inline for scripts.
- Supabase table grants are hardened by a SQL migration.

## Required Supabase step

Before relying on the database hardening, open the Supabase SQL Editor and run:

supabase-security-hardening.sql

The migration enables RLS and revokes direct anon and authenticated table access for orders, reviews and product_statuses, while granting backend access to service_role.

After running it, verify that all three tables exist and have RLS enabled. If a table does not exist yet, the migration skips it.

## Render configuration

Check that the backend environment variables are set in Render:

- ALLOWED_ORIGIN: exact public storefront origin, including https:// and without a trailing slash.
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY: backend only; never place this key in browser JavaScript.
- BOT_TOKEN
- CHAT_ID_1
- CHAT_ID_2
- TELEGRAM_WEBHOOK_SECRET
- RENDER_EXTERNAL_URL

The storefront origin must exactly match ALLOWED_ORIGIN; otherwise order submission is rejected by design.

## Important limitations

- The rate-limit and idempotency stores are in process memory. They reset when the Render process restarts and are not shared between multiple backend instances. For a multi-instance deployment, move these controls to a shared store such as Redis or a database-backed atomic reservation.
- The SQL migration is committed to GitHub but is not automatically applied to Supabase. A project administrator must run it in the Supabase SQL Editor.
- GitHub Actions checks JavaScript syntax. It does not replace a live integration test of Telegram, Supabase, Render environment variables or a real order.
- script-src no longer permits inline JavaScript. style-src still permits inline styles because the current design uses dynamic inline style attributes.

## Verification

GitHub Actions runs node --check on server.js, app.js and track.js, and checks any remaining inline scripts in the HTML pages.

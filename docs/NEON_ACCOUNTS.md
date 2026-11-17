# Neon accounts

The frontend uses the official `@neondatabase/auth` client. Neon handles passwords,
verification emails, HttpOnly session cookies, session restoration and JWT renewal.
PsySim never saves passwords or bearer tokens to localStorage. The Express API verifies
JWT signature, issuer, audience, expiry and subject. Privileged roles come only from
`psysim_accounts.role`, managed by the database administrator, never signup metadata.

## Configuration

1. Use the existing Neon project/branch. Enable Neon Auth email/password and configure
   trusted origins and verification email redirects for the PsySim origin and `/auth`
   (or `/psysim/auth` for GitHub Pages). Configure email verification in Neon.
2. Apply `server/migrations/001_neon_accounts.sql` to that branch using its SQL editor
   or your migration runner. This additive migration creates only PsySim tables; it
   neither resets data nor assigns old anonymous/browser sessions to new accounts.
   Keep these tables private to the backend database role. Do not expose them via a
   browser-accessible Data API, including the clinical_profile and evaluation columns.
3. Set server-only `DATABASE_URL`, `NEON_AUTH_BASE_URL`, `NEON_AUTH_JWKS_URL`,
   `NEON_AUTH_ISSUER`, `NEON_AUTH_AUDIENCE` to the exact branch settings. Set
   `CORS_ORIGIN` to the frontend origin, `DEV_AUTH_ENABLED=false`, and configure the
   existing server-side AI provider. Production also requires reviewed scenarios.
4. Set public frontend `VITE_NEON_AUTH_URL` and `VITE_API_BASE_URL`. For the existing
   GitHub Pages build, set repository variables `PSYSIM_NEON_AUTH_URL` and
   `PSYSIM_API_BASE_URL`. Never put DATABASE_URL or AI credentials in VITE variables.
   GitHub Pages hosts the UI only; the Express backend must run on a server.
   The publishing step is skipped until both variables are set, preserving the existing
   live site while the backend/migration is configured. Builds and tests still run.

`neon.ts` declares Neon Auth and the Gemini proxy but does not deploy the Express API.
The legacy standalone experience remains development-only. Production without an
Auth URL shows a setup notice. Browser-only case answers are excluded from production
bundles; old anonymous browser history is not migrated into new accounts.

## Storage and isolation

`/api/me` synchronizes the verified identity into `psysim_accounts`. Sessions,
conversations, objectives, diagnoses and feedback persist in `psysim_sessions` with a
non-null account foreign key. The existing ownership checks and user-bound idempotency
keys apply to all session routes. No API accepts an owner ID from the browser.
The Postgres adapter retains the established clinical engine and persists mutations
atomically, including evaluation and request receipts. It uses a transaction lock and
loads the current repository snapshot to preserve existing synchronous engine semantics
across processes. This favors correctness for a small installation; high concurrency
requires a future per-session SQL repository to avoid serializing long AI requests.

Logout ends the Neon session and unmounts private UI. Account changes remount the private
layout, discarding in-memory screen state. Database records are retained. Neon caches
and cookie handling remain SDK-owned. Expired or invalid API credentials clear the
frontend authentication state.

## Verification

Local tests cover auth transport, signed-token rejection, route ownership, private
history and clinical behavior. Live signup, email delivery and cross-device restoration
require the actual Neon branch configuration; local mocks do not establish live readiness.

## Existing project verified in the console

- Organization: Faiaz; project: `psysim` (`shy-hall-00988848`).
- Branch: `production` (`br-restless-hill-azxicd1i`).
- Email signup/sign-in enabled; email verification currently optional; localhost allowed.
- At inspection, GitHub had only `PSYSIM_GEMINI_PROXY_URL` configured, pointing to
  this branch's Gemini function. No full PsySim API URL was configured.

The official logo is copied byte-for-byte; CSS changes its displayed size only.
The Neon SDK currently pulls unused email-rendering/UI dependencies with low-severity
npm advisories. Patched Better Auth and Zod versions are pinned via overrides to remove
high/critical advisories. Do not use `npm audit fix --force` to silently change the SDK.

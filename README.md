# PsySim

Text-only psychiatric interview practice with fictional patients, built with React, TypeScript, Express and a server-side AI provider. The interface uses charcoal `#1E1E1C`, sand `#D8CBB3` and electric blue `#2F6BFF` throughout.

## Current release

Faiaz's work through `24dfb65` is integrated into `dev-frontend`, preserving both Git histories and the alternate `client/` source. The root `src/` application is the supported frontend. Live AI, persistent local sessions, evidence-based interview gates, diagnosis evaluation and feedback work through the Express API. No provider keys or hidden case profiles are sent to the browser.

**This is a development release, not a clinically validated teaching deployment.** The seven imported cases and their three interview-style variants are labeled unreviewed development material. They are excluded from production selection. No Supabase or hosting project is provisioned. Nothing is deployed by pushing this branch; the Pages workflow is manual only.

## Local setup

Use Node.js 24 and npm. From the repository root:

```powershell
npm ci
npm ci --prefix server
npm run setup:local
```

The setup script creates missing `.env.local` and `server/.env` files, generates a local authentication signing secret, and preserves existing files. Set `GEMINI_API_KEY` privately in `server/.env`. Never use a `VITE_` variable for a provider key. This workstation already has local configuration; rerunning setup will not overwrite it.

Start these in separate terminals:

```powershell
npm run dev:server
```

```powershell
npm run dev
```

Open `http://127.0.0.1:5173` and select **Enter local workspace**. Vite proxies `/api` to the backend on port 5000. Local authentication is a signed, HTTP-only, same-site cookie for one local learner; it grants no supervisor privileges. Saved sessions, immutable case snapshots, progress, results and retry receipts live in ignored `server/data/psysim.sqlite` and survive restarts. Keep the backend working directory at `server/`, as the npm scripts do.

For a UI-only preview, use `VITE_DEMO_MODE=true` in `.env.local`. This explicit development adapter uses scripted messages, manual preview progress controls and ungraded results. It never replaces a failed live request. Both frontend development flags are compiled out in production.

## Verification

```powershell
npm test
npm test --prefix server
npm run build
npm run build --prefix server
```

See [verification evidence](docs/VERIFICATION.md), [API contract](docs/API_CONTRACT.md), [architecture](docs/ARCHITECTURE.md), and [integration report](docs/INTEGRATION_REPORT.md). CI verifies both packages without deployment or provider credentials.

## Configuration

| Scope                   | Variables                                                                 | Purpose                                                                                          |
| ----------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Server AI               | `AI_PROVIDER`, `GEMINI_API_KEY`, `GEMINI_MODEL`                           | Explicit provider selection; Gemini is configured locally                                        |
| Optional Groq           | `GROQ_API_KEY`, `GROQ_MODEL`                                              | Used only when `AI_PROVIDER=groq`; not a fallback                                                |
| Server authentication   | `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`                                | Required for production bearer authentication; `SUPABASE_ANON_KEY` remains a compatibility alias |
| Local authentication    | `DEV_AUTH_ENABLED`, `DEV_AUTH_SECRET`                                     | Loopback-only, non-production signed cookie; random secret at least 32 characters                |
| Case access             | `ALLOW_UNREVIEWED_CASES`                                                  | Development-only opt-in for demonstration fixtures                                               |
| Runtime                 | `NODE_ENV`, `HOST`, `PORT`, `CORS_ORIGIN`, `DATABASE_FILE`                | Server binding, one allowed frontend origin and durable SQLite location                          |
| Browser public settings | `VITE_API_BASE_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` | Public API and authentication configuration                                                      |
| Browser development     | `VITE_LOCAL_DEVELOPMENT`, `VITE_DEMO_MODE`                                | Local server login or isolated UI preview; development builds only                               |

The configured model is `gemini-3.5-flash-lite`, verified with real generation and structured assessment on 14 November 2026. The formerly configured `gemini-2.5-flash` rejected generation for this credential despite appearing in model discovery. There is no automatic model/provider substitution. See Google's [model catalog](https://aistudio.google.com/docs/models) and [thinking configuration](https://aistudio.google.com/docs/thinking?generate-content=true) before changing models. Gemini 3 requests use low thinking; thought parts are excluded from patient replies.

## Before hosting

- Connect the institution's Supabase Auth project. Verify real sign-up, email confirmation, sign-in, expiration and sign-out. Roles must be assigned through trusted `app_metadata`, never student-editable metadata or profile rows.
- Have qualified reviewers author and approve clinical cases, accepted terminology, objective criteria and source references. The original source registry is only a list of candidates; its content was not ingested or licensed by this integration.
- Run the current SQLite repository with **one backend process on a persistent volume**, backups and a suitable access/retention policy. It is not a multi-instance or ephemeral-serverless repository. Choose and implement a production database adapter before using those hosting models.
- The imported `server/migrations/001_initial_schema.sql` is preserved for review, **not applied or used** by the current repository. It contains permissive legacy policies and is not safe to apply as a production setup. A future Supabase adapter must use reviewed, backward-compatible hardening migrations and tests.
- Configure public frontend build variables and private server variables separately. Use HTTPS, the exact frontend CORS origin, disable development flags, and configure SPA deep-link fallback. A static GitHub Pages site alone cannot run the private backend.

No voice, speech, video, avatars or production cloud changes are included.

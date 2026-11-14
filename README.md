# PsySim

A React/TypeScript frontend for a multilingual, text-only psychiatric interview training platform.

**Delivery status:** frontend and proposed integration contract implemented. The complete live MVP is **not** available yet. Gemini owns the backend, Supabase schema/RLS, patient engine, clinical assessment, diagnostic matching and source ingestion. No clinician-approved cases, AI calls, database migrations or live clinical evaluation are included in this delivery.

## Run locally

Requires Node.js 24.15+ on the Node 24 LTS line (verified with 24.20.0) and npm.

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Open the Local URL printed by Vite. `.env.example` explicitly enables the development demo. Its scripted responses and browser-local persistence allow the frontend workflow to run without accounts or API keys. Demo progress changes only through labeled controls and results always say REVIEW_REQUIRED. Category/difficulty choices are carried through the interface but do not generate varied clinical scenarios in demo mode.

```powershell
npm test
npm run build
npm run preview
```

`npm test` runs focused Vitest/Testing Library integration and transport tests. Thread workers avoid restricted Windows child-process spawning. `npm run build` type-checks and creates `dist/`.

## Implemented frontend

- Supabase email/password sign-in and sign-up, email-confirmation messaging, auth-state updates, protected routes and backend profile roles.
- Responsive dashboard, aggregate statistics, recent sessions and paginated history.
- Clinical Challenge and Custom Case setup; seven category options in the demo; three difficulty levels and four conversation-language settings.
- Unicode text consultation, timer, transcript, required/optional objectives, evidence links, beginner guidance and reduced advanced guidance.
- Submission locking based on backend session state and eligibility; optional reasoning; final confirmation; finalized sessions cannot continue.
- Four distinct result outcomes, approved diagnosis display, evidence-linked feedback, separate interview rubric, learning points and transcript review.
- Supervisor case creation/editing, JSON clinical-profile authoring, source-reference IDs, objective configuration, configurable rubric criteria/weights and review actions. Demo drafts cannot be approved.
- Authenticated HTTP adapter, safe connection errors, timeouts, opaque-ID encoding, version checks and stable mutation keys. No automatic mutation retries or live-to-demo fallback.
- Keyboard focus states, dialog focus containment, reduced-motion support, mobile navigation, and Bengali-compatible system font fallbacks.

## Environment

| Variable | Meaning |
| --- | --- |
| `VITE_DEMO_MODE` | `true` explicitly enables local UI demo; otherwise live mode |
| `VITE_API_BASE_URL` | Backend base URL including `/api`, e.g. `http://localhost:3001/api` |
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Public browser publishable key only |

Live mode requires the last three values. Restart Vite after configuration changes; rebuild production assets after build-time changes. Never place Gemini/Groq keys or Supabase service-role secrets in `VITE_` variables. Configure Supabase email/password Auth and the frontend `/auth` redirect URL. The frontend uses Supabase only for Auth, never clinical table queries. Token validation, ownership and permissions remain backend responsibilities.

## Repository and collaboration

- `src/pages/`: authentication, dashboard/history, setup, consultation, results, supervisor and guide.
- `src/components/`: layout, loading/error states and accessible modal.
- `src/lib/`: configuration, authentication, HTTP adapter, isolated demo adapter and session helpers.
- `src/test/`: focused integration and transport tests.
- `shared/contracts.ts`: proposed typed public contract.
- `docs/API_CONTRACT.md`: endpoint payloads, lifecycle, errors and security requirements.
- `docs/ARCHITECTURE.md`: ownership and data flow.
- `docs/GEMINI_HANDOFF.md`: backend integration work and acceptance requirements.
- `docs/VERIFICATION.md`: checks performed and verification limits.
- `vercel.json`: frontend SPA rewrite and basic response headers; does not deploy anything.

Work is on `dev-frontend`. Backend work belongs on `dev-backend`. Shared contract v1 is **proposed and awaiting Gemini review**. Do not merge or deploy automatically. No Git remote existed at project inspection; commits are local only.

## Backend integration and release

Read `docs/GEMINI_HANDOFF.md` and agree on the contract first. Implement the `/api` routes listed there, then configure live environment values and test a complete authenticated student/supervisor flow against real services. The browser is not a security boundary. Enforce eligibility, approved-case selection, immutable finalization, idempotency, roles and ownership independently on the server.

For a later authorized frontend deployment, use Vite, build command `npm run build`, output `dist`, and the included SPA rewrite. Deploy the Node backend independently with HTTPS and explicit CORS origins. No hosting project was registered or deployed. Production readiness additionally requires clinical review, licensed-source ingestion, backend security tests and migrations supplied by Gemini.

## Known limits

- Live auth, provider behavior, medical correctness, RLS and server persistence cannot be verified without the backend/services.
- UI text is English; conversation and diagnosis input support Bengali, Banglish and mixed language. Language understanding is a backend capability.
- Demo state is local to one browser and is not secure, multi-user storage or a concurrency test of the backend. Demo data can be reset by removing the `psysim-demo-v1` storage entry.
- Clinical-profile JSON validation and reviewer eligibility must be authoritative on the backend. No medical sources were ingested or asserted as licensed/approved here.
- No voice, audio, automatic deployment, paid AI fallback, or secrets are included.

Auth implementation was checked against the official [sign-in](https://supabase.com/docs/reference/javascript/auth-signinwithpassword), [sign-up](https://supabase.com/docs/reference/javascript/auth-signup), and [auth-state](https://supabase.com/docs/reference/javascript/auth-onauthstatechange) documentation and [changelog](https://supabase.com/changelog.md).


The SPA hosting configuration follows the official [Vite on Vercel guidance](https://vercel.com/docs/frameworks/frontend/vite).

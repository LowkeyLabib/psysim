# Architecture

`src/` is a Vite React client. `shared/contracts.ts` is the proposed public API boundary. `src/lib/api.ts` implements authenticated HTTP calls; `src/lib/demo.ts` is a separately loaded development adapter. Browser Supabase access is for Auth only; the client does not query clinical tables. Frontend build variables are public.

Gemini will implement `server/` (Express/Zod, authorization, AI provider abstraction, simulation, evaluation and knowledge registry) and `supabase/` (migrations/RLS). No backend, AI integration, database or clinical source ingestion is claimed by this frontend delivery.

The backend owns all hidden case data. Patient messages and neutral objective evidence flow to the frontend; diagnosis and approved clinical reasoning become available through results only after final submission. Supervisor data uses separate privileged endpoints. Do not put hidden clinical information in shared student bundles or local storage.

Live mode uses Supabase email/password Auth with token refresh, protected client routes and backend-verified roles. It never falls back to mock data on failure. Demo mode is a separate explicit build setting; local persisted data is synthetic UI state, versioned and disposable. It has no diagnostic scoring or AI.

Deploy the frontend build (`dist/`) to a static host with SPA rewrites; deploy the backend independently. Configure HTTPS, CORS, auth redirect URLs, rate limits, migrations and approved scenarios before production. Voice is intentionally absent; the message transport remains text-only.

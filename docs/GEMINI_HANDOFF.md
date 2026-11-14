# Backend integration handoff

This replaces the earlier frontend-only proposal. Faiaz's work through `24dfb65` is integrated on `dev-frontend`.

Use the root `README.md` for setup and `docs/API_CONTRACT.md` for the implemented contract. The supported frontend is root `src/`; `client/` is preserved alternate source. AI credentials belong only in ignored `server/.env` or a future private hosting environment.

Outstanding release prerequisites: designated Supabase Auth/hosting projects, actual account lifecycle verification, qualified clinical review of cases/answer sets/sources, and a production persistence plan. The current SQLite repository supports one persistent server process. Imported SQL is historical and must not be applied without policy hardening. Clinical source candidates have not been ingested.

No deployment or merge to `main` is authorized. Normal push to `dev-frontend` is authorized. Pages publishing is manual-only.

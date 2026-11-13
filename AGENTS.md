# PsySim collaboration

- Codex owns `src/`, frontend configuration and frontend tests, on `dev-frontend`.
- Gemini owns `server/`, `supabase/`, clinical sources, simulation and evaluation, on `dev-backend`.
- `shared/`, root package files and `docs/` are shared: document proposed changes before integration. Never overwrite another agent's files.
- Contract v1 in `docs/API_CONTRACT.md` is PROPOSED, awaiting Gemini review. Frontend work may use this proposal; integration must resolve differences explicitly.
- Only the backend may authorize users, choose approved cases, evaluate objectives or diagnoses, or disclose post-submission answers.
- Never send hidden profiles, answer keys, evaluator instructions or secrets to student clients.
- Demo mode is UI development only, must be visibly labeled, and must never claim AI or clinical validation.
- Use synthetic data. Never claim demonstration cases are clinician-approved.
- No automatic merge, deploy, or push to main. Use small commits and preserve ownership boundaries.
- Run `npm test` and `npm run build` for frontend changes affecting the main workflow.

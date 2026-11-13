# Gemini handoff — contract review requested

Codex completed the frontend on `dev-frontend`. Please review `docs/API_CONTRACT.md` and `shared/contracts.ts`, record acceptance or propose revisions, then implement backend work on `dev-backend`. No remote was configured, and nothing was pushed, merged or deployed.

## Files and ownership

Codex owns `src/`, `public/`, frontend tests and Vite configuration. Gemini owns the future `server/`, `supabase/` and clinical source ingestion. Shared changes to contracts/root package files/docs need explicit coordination. If adding a monorepo/workspace structure, preserve the working root frontend scripts or agree on their replacement first.

## Integration shape

- `VITE_API_BASE_URL` includes `/api`. Responses are direct typed objects, not a `{data}` wrapper.
- Supabase access token is sent as Bearer. `/me` returns verified role/profile; do not trust editable user metadata.
- `/me/sessions` returns paginated summaries plus all-session aggregates. Only CORRECT counts as success. REVIEW_REQUIRED does not enter the graded denominator.
- Session reads/mutations return public identity, transcript, neutral objectives, evidence, eligibility, state and numeric version. Do not return hidden profile/diagnosis/answer keys.
- Messages and diagnosis submissions carry `expectedVersion` and `Idempotency-Key`. Validate ownership, version, state and payload; atomically preserve messages/objective evidence/state. Retries after network uncertainty reuse keys. Never rerun a successful mutation with the same key.
- Diagnosis submission may return DIAGNOSIS_SUBMITTED; the frontend polls until EVALUATED, then loads `/results`. ERROR must retain a safe user-facing recovery state.
- Progress includes required flags, neutral title/guidance, completion, transcript IDs and confidence. Advanced clients hide details; this is not an authorization mechanism.
- Supervisor routes return privileged drafts only to authenticated authorized reviewers. Any edit invalidates approval. Require version and review note for review actions, enforce reviewer qualification, and write audit history. Demo approval is deliberately disabled.

## Endpoints consumed by the frontend

GET `/me`, `/me/sessions`, `/scenarios/categories`, `/sessions/:id`, `/sessions/:id/results`, `/supervisor/scenarios`.

POST `/sessions`, `/sessions/:id/messages`, `/sessions/:id/diagnosis`, `/supervisor/scenarios`, `/supervisor/scenarios/:id/approve`.

PATCH `/supervisor/scenarios/:id`.

Standalone transcript/progress and public scenario metadata endpoints are documented for compatibility; the frontend currently uses full session snapshots.

## Backend work still required

1. Express/TypeScript/Zod validation and the full fixed clinical-profile schema.
2. Supabase migrations, roles, profile provisioning after signup, ownership/RLS and private clinical data isolation. No migrations have been created/applied by Codex.
3. Clinician approval workflow and audited, properly licensed source registry/ingestion. No source integration or approved case is claimed yet.
4. Server-only Gemini provider with a currently verified free-tier model, configurable settings, timeouts/retry/backoff, and optional explicitly configured Groq fallback. No paid fallback by default.
5. Fixed hidden patient profiles, multilingual continuity, injection resistance and consistent case-specific communication/difficulty.
6. Evidence-based objective evaluation and authoritative submission eligibility.
7. Deterministic normalized answer matching, Bengali aliases, clinically approved equivalence and conservative ambiguous-answer review.
8. Evidence-linked formative feedback and configurable rubric, separately storing diagnostic accuracy.
9. Server transaction/idempotency/session-state enforcement and safe error formats.
10. Focused backend tests for cross-user/role access, hidden-answer protection, profile consistency, genuine transcript evidence, Bengali synonyms, finalization, rate limits and database persistence.

## Live acceptance run

Set `VITE_DEMO_MODE=false` and configure API/Supabase public variables; restart. Verify signup/confirmation/sign-in, both modes/all difficulties, approved-case selection, multilingual conversation, required objectives, locked early submission, final confirmation, duplicate requests, all outcome states, resume/reload, user isolation and supervisor review. Confirm network payloads never reveal hidden answers before evaluation. Run the frontend checks and backend checks after any agreed contract changes.

The browser-local demo is a UI fixture, not the backend simulation engine. It contains no approved answer key and performs no AI or clinical grading. Do not transplant its progress controls into live assessment.

# PsySim API v1 — PROPOSED for Gemini review

Status: frontend implementation proposal, not yet accepted by the backend developer. Gemini should review this document and `shared/contracts.ts` before implementation. Record acceptance or revisions here; do not silently change schemas.

## Transport and security

Base URL includes `/api`. JSON requests/responses; all endpoints require `Authorization: Bearer <Supabase access token>`. Backend validates token, ownership and roles on every request. CORS allows configured frontend origins only. Success returns the typed object directly. Errors return `{ error: { code: string, message: string, requestId?: string } }`. Use 401 unauthenticated, 403 unauthorized, 404 inaccessible/missing, 409 state/version conflict, 422 invalid input/incomplete interview, 429 rate limit, 503 provider/setup unavailable. Never put prompts, profiles or keys into errors.

Mutating session requests require `Idempotency-Key` (UUID). Replay the original successful response for the same user, endpoint, key and payload; reject key reuse with different payload. Preserve message/diagnosis deduplication across provider failure and client timeout. Frontend does not automatically retry mutations. Message requests include `expectedVersion`; commit both messages, objective evidence and session state atomically, or roll back. A successful mutation returns the full public session snapshot.

All IDs are opaque strings, dates ISO 8601 UTC; enums and complete shapes are in `shared/contracts.ts`. Messages are plain text, maximum 4,000 characters. Diagnosis maximum 500, reasoning maximum 4,000. Pagination uses opaque `cursor`, `limit` (default 20, max 100) and `nextCursor`.

## Endpoints

| Method / path | Request | Response |
| --- | --- | --- |
| GET /me | — | UserProfile |
| GET /me/sessions?cursor=&limit= | — | SessionPage (summary list + aggregate statistics over all sessions) |
| GET /scenarios/categories | — | Category[] |
| GET /scenarios | — | public metadata only: `{available: boolean, categoryId: string}[]`; no diagnoses or templates |
| POST /sessions | CreateSessionInput | PublicSession |
| GET /sessions/:id | — | PublicSession (includes transcript + progress) |
| GET /sessions/:id/messages | — | Message[] |
| POST /sessions/:id/messages | `{content, expectedVersion}` | PublicSession |
| GET /sessions/:id/progress | — | InterviewProgress |
| POST /sessions/:id/diagnosis | DiagnosisInput | PublicSession |
| GET /sessions/:id/results | — | SessionResult, 409 until evaluated |
| GET /supervisor/scenarios | — | ScenarioDraft[] (privileged) |
| POST /supervisor/scenarios | ScenarioInput | ScenarioDraft |
| PATCH /supervisor/scenarios/:id | ScenarioInput + `{expectedVersion}` | ScenarioDraft |
| POST /supervisor/scenarios/:id/approve | `{expectedVersion, decision: 'APPROVED'|'REJECTED', reviewNote}` | ScenarioDraft |

## Authority and lifecycle

`CREATED → IN_PROGRESS → INTERVIEW_COMPLETE → DIAGNOSIS_SUBMITTED → EVALUATED`; terminal alternatives `ABANDONED`, `ERROR`. Backend enforces transitions, approved-case selection, fixed profiles, role/ownership and final submission uniqueness transactionally. Frontend locks input after finalization and follows the returned state. Submission is enabled only when both state is INTERVIEW_COMPLETE and `progress.eligible` is true. Backend rechecks this independently.

The public patient projection contains identity, age, occupation and presenting complaint ONLY. Before EVALUATED, never return diagnosis, code, answer keys, private objective criteria, profile, prompt or results. Objective titles and guidance must be neutral and must not disclose diagnostic clues. `evidenceMessageIds` refer to transcript messages. Completed objectives must have evidence and assessed confidence; uncertain evidence remains incomplete. Advanced clients suppress guidance, but rules remain enforced server-side.

`SessionResult` distinguishes all four outcomes. Only CORRECT counts as success; aggregate diagnostic accuracy uses correct / evaluated outcomes excluding REVIEW_REQUIRED, and includes partial/incorrect in denominator. Interview rubric scores are separate. Each feedback item carries transcript IDs and/or approved case reference IDs. REVIEW_REQUIRED may omit approvedDiagnosis pending review; no invented answer is shown.

## Supervisor workflow

Roles are read from verified backend `/me`, never editable user metadata. Student clients never request supervisor data. Backend must separately authorize every supervisor route. Drafts include structured clinical profile, approved answers, references, objectives and rubric. Only authenticated qualified reviewers can approve; approval requires a review note, validated clinical profile, eligible source references, rubric weights totaling 100, and a recorded review audit. Editing approved material creates a DRAFT revision and invalidates approval. All writes use optimistic version checks. The frontend provides a structured metadata editor and JSON clinical-profile editor; backend owns authoritative validation and review policy.

## Demo boundary

`VITE_DEMO_MODE=true` loads an isolated, browser-local UI adapter. It never calls AI or Supabase, includes no diagnostic answer key, and always returns REVIEW_REQUIRED. Progress is advanced only via explicit labeled demo controls, never presented as clinical assessment. No demonstration template can become clinically approved. This is not the backend mock engine or a substitute for backend security tests.

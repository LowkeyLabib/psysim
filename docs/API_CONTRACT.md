# PsySim API v1 — integrated contract

The root frontend and Express backend implement `shared/contracts.ts`. `server/src/types/contracts.ts` is the backend's identical type snapshot to keep its standalone TypeScript build within `rootDir`.

## Transport

Base URL includes `/api`. JSON bodies, plain-text conversation content, direct typed success responses. Production requests require `Authorization: Bearer <Supabase access token>`. The server verifies tokens with `auth.getUser`; privileged roles come only from trusted `app_metadata`. All session endpoints check ownership, including cached mutation receipts and results. Cross-user access returns 404.

Explicit local development uses `POST /auth/development` to issue a signed HTTP-only `SameSite=Strict` cookie, valid for 24 hours and restricted to a fixed student role. It requires loopback access, `DEV_AUTH_ENABLED=true`, a signing secret of at least 32 characters, and a non-production runtime. `POST /auth/logout` clears it. The frontend enables this only on localhost in development builds. `/health` is public and contains no credentials.

Errors have `{error:{code,message,requestId?}}`: 401 authentication, 403 authorization/origin, 404 missing/inaccessible, 409 state/version/key conflict, 422 validation/incomplete interview, 429 rate limit, 502 unusable AI output, 503 provider/setup/network failure. Raw provider errors, prompts, transcripts and tokens are never logged or returned. Frontend mutations time out after 110 seconds; provider attempts time out after 25 seconds, with at most one retry for HTTP 429/5xx. Other provider failures do not fall back to mock/model substitution.

Session mutations require `Idempotency-Key` (up to 200 characters; frontend uses UUIDs). Receipts are scoped to authenticated user, method, endpoint and body signature. Reusing a key with a changed body returns 409. Repeating a successful request returns its original snapshot. Message and diagnosis requests require `expectedVersion`; per-session serialization and compare-and-swap commit prevent concurrent lost updates. A failed AI response or assessment persists no partial turn. The SQLite commit atomically saves the transcript, progress, result and receipt.

Limits: 4,000 characters per student message; 500 for diagnosis; 4,000 for reasoning; 80 interview turns per session; 128 KB request body. IDs are opaque, dates ISO 8601 UTC. History defaults to 20 records; `limit` accepts 1–100, and `nextCursor` is the last returned ID.

## Endpoints

| Method/path                            | Input                                  | Output                                      |
| -------------------------------------- | -------------------------------------- | ------------------------------------------- |
| GET /health                            | —                                      | Provider name and development flags         |
| POST /auth/development                 | —                                      | Local-only sign-in                          |
| POST /auth/logout                      | —                                      | Local cookie sign-out                       |
| GET /me                                | —                                      | UserProfile                                 |
| GET /me/sessions?cursor=&limit=        | —                                      | SessionPage with aggregate statistics       |
| GET /scenarios/categories              | —                                      | Category[]                                  |
| GET /scenarios                         | —                                      | Approved public availability metadata only  |
| POST /sessions                         | CreateSessionInput + request key       | PublicSession                               |
| GET /sessions/:id                      | —                                      | PublicSession                               |
| GET /sessions/:id/messages             | —                                      | Message[]                                   |
| POST /sessions/:id/messages            | content, expectedVersion + request key | PublicSession                               |
| GET /sessions/:id/progress             | —                                      | InterviewProgress                           |
| POST /sessions/:id/diagnosis           | DiagnosisInput + request key           | PublicSession                               |
| GET /sessions/:id/results              | —                                      | SessionResult, unavailable before EVALUATED |
| GET /supervisor/scenarios              | —                                      | ScenarioDraft[]; privileged                 |
| POST /supervisor/scenarios             | ScenarioInput                          | ScenarioDraft; privileged                   |
| PATCH /supervisor/scenarios/:id        | ScenarioInput + expectedVersion        | ScenarioDraft; privileged                   |
| POST /supervisor/scenarios/:id/approve | expectedVersion, decision, reviewNote  | ScenarioDraft; privileged                   |

## Clinical authority

The normal synchronous lifecycle is `IN_PROGRESS → INTERVIEW_COMPLETE → EVALUATED`. Contract enums retain transitional states for compatibility. Diagnosis and evaluation are committed together; an error leaves the previous state intact. Finalized sessions cannot accept further messages or a second diagnosis.

Case selection preserves the requested category and difficulty; it never silently switches to an unrelated approved case. Each session has an immutable private profile. Production selects approved templates only. Explicit local development can select unreviewed demonstration variants when no approved match exists. `caseReviewStatus` is an additive public field in session/results, displayed as a warning for unreviewed profiles.

Before submission the public projection includes demographics, presenting complaint, transcript, neutral objectives, guidance and progress. It excludes diagnoses, codes, private criteria and full profiles. The patient prompt itself omits the answer key; response screening rejects known labels/codes and private instruction markers. This reduces leakage risk but is not a proof against all possible LLM prompt attacks; deployment needs clinical/adversarial evaluation.

Objective assessment evaluates all private criteria using structured output. Completion requires confidence ≥0.88 and exact quoted evidence from both student and patient. Unknown IDs, fabricated excerpts, single-role evidence and keyword-only synchronous checks cannot unlock submission. Completed evidence persists; diagnosis rechecks required objectives, confidence and referenced message roles on the server.

Diagnosis matching first uses case-listed names/synonyms plus normalization. Unmatched wording receives structured semantic comparison against indexed accepted answers. Confident equivalence (≥0.93) uses the selected answer's exact/partial classification; a confident incompatible diagnosis is incorrect. Ambiguity, conflicting alternatives or unsupported indexes require review. No answer is invented. Case labels are revealed only after submission. Development outcomes are explicitly unvalidated.

Feedback distinguishes case-authored findings from transcript evidence. Interview coverage is scored from completed objectives; empathy and clinical reasoning remain unscored pending supervisor review. Configured case rubrics are retained for review, not represented as a validated automated competence score. Diagnostic accuracy excludes review-required outcomes from the denominator.

## Supervisor review

Both privileged roles are server verified. Pending submissions require a complete clinical schema, unique objective IDs, required objectives, source references and rubric weights totaling 100. Approval requires a substantive note and records reviewer, revision and timestamp. Demonstration seeds cannot be approved unchanged. Editing a runnable template invalidates its approval; existing sessions retain their original profile snapshot. The schema checks structural completeness; source eligibility and clinical validity remain human review responsibilities.

## Development UI adapter

`VITE_DEMO_MODE=true` in a development build selects the separate browser-local UI adapter. It contains no answer key, uses explicit manual progress controls, always returns REVIEW_REQUIRED and cannot approve cases. It is never a recovery path for live provider failures.

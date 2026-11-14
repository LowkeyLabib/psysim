# Verification — 14 November 2026

Story: a learner signs in, creates a fictional case, conducts a multilingual text interview, completes evidence-based objectives, submits a diagnosis, reviews feedback, and returns to saved history.

## Automated checks

- Frontend: 29 passing tests across five files. Covers the complete scripted UI workflow, Bengali input, confirmation, persistence, all result states, role gating, authenticated transport, errors and stable request keys.
- Backend: 31 passing tests across six files. Covers anonymous/forged-role rejection, verified Supabase metadata roles, session ownership, exact category/level selection, private-field projection, idempotency, concurrent writes, failed-generation/assessment rollback, evidence gates, finalization, saved results, semantic diagnosis decisions, leak screening, provider errors and SQLite restart persistence.
- Frontend production build and backend TypeScript build pass.
- Dependency audit: zero reported vulnerabilities after removing the obsolete SDK and updating backend Zod and Vitest.

Provider calls in automated tests are explicit test doubles, not claims of real AI performance. Tests use synthetic fixtures; no real clinical data is used.

## Live local checks

| Boundary                 | Evidence                                                                                                                                             |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Browser → authentication | Local signed-cookie sign-in succeeds; authenticated dashboard renders                                                                                |
| Browser → API            | Clinical Challenge created at Intermediate; premature diagnosis button disabled                                                                      |
| API → provider           | Real Gemini generation and structured assessment succeed using configured `gemini-3.5-flash-lite`                                                    |
| Multilingual interaction | English response in a browser challenge; Bengali conversation with Banglish follow-up in a Custom Case                                               |
| Interview gate           | Objectives remain locked initially, then progress from transcript evidence to 6/6 across substantive turns                                           |
| Diagnosis/results        | Bengali diagnosis accepted; session moves to EVALUATED; reference findings and unscored competence domains returned                                  |
| Semantic assessment      | Nonliteral English diagnostic formulation evaluated by live provider as equivalent                                                                   |
| Persistence              | Refresh retains messages/progress; evaluated session appears in history; SQLite restart test preserves immutable profile and receipts; real backend restart restores the 11-message evaluated session and all six completed objectives                |
| UI rendering             | Desktop dashboard/consultation, 390px mobile dashboard/consultation/results, responsive menu, Bengali feedback and transcript evidence links checked |
| Browser health           | No errors in the final fresh-load authentication flow; mobile document width does not exceed viewport                                                  |
| Provider failure         | Retired model returns safe failure; no mock reply or partial turn is committed                                                                       |

Model discovery alone was insufficient: `gemini-2.5-flash` listed successfully but rejected generation for this credential. `gemini-3.8-flash` probes timed out. The explicitly configured `gemini-3.5-flash-lite` generated successfully; there is no runtime model substitution.

Screenshots in `docs/screenshots/` show the local development UI and synthetic test data.

## Limits of verification

No designated Supabase project exists, so real email confirmation, production account login and role provisioning were not tested against an actual tenant. Token validation and role boundaries have automated coverage using a test Auth response. Groq remains an optional provider and has no configured credential/live test.

The supervisor API's role boundary and validation are tested; clinical reviewers have not approved any case. Clinical accuracy, educational validity and resistance to every possible prompt attack are not established by software tests. Feedback scores coverage only. Imported SQL was not applied. Multi-instance hosting is unsupported by the current local repository.

Nothing was deployed. These checks establish a working local development release, not clinical or production certification.

A temporary Fast Refresh context error occurred while multiple React files were being formatted during the running preview. A full reload cleared it; a fresh sign-in/dashboard/sign-out cycle completed without browser errors.

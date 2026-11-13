# Verification — 14 November 2026 (Asia/Dhaka)

Story: a learner chooses a practice mode/difficulty/language, interviews a fictional patient, completes required interview areas, confirms a free-text diagnosis, then reviews saved feedback. The frontend uses an interchangeable typed HTTP/demo adapter.

| Boundary | Result | Evidence |
| --- | --- | --- |
| Source/type check | Passed | `npm run build` completed TypeScript and Vite production compilation |
| Focused test suite | Passed | `npm test`: 5 files, 29 tests |
| Local HTTP | Passed | Vite served `http://127.0.0.1:5173/` with HTTP 200 |
| UI → demo state → results | Passed | Browser completed Bengali interview, six explicit demo controls, review/confirmation, REVIEW_REQUIRED results |
| Multilingual preservation | Passed | Tests for English/Bengali/Banglish/mixed; browser sent combined Bengali/Banglish and displayed Unicode correctly |
| Progress and finalization | Passed for frontend/demo | Locked before completion; no keyword unlocking; final submission deduplicated, finalized messaging rejected |
| Live HTTP request shape | Passed in mocked transport tests | Bearer token, encoded ID, version, idempotency header, Unicode body, 401/403/409/422/429/503 and network/error handling |
| Supervisor access boundary | Passed for frontend | Student route test rejects access before requesting privileged scenarios |
| Outcome rendering | Passed | Four outcome tests show distinct backend results and evidence reference links |
| Browser persistence | Passed for demo | Reloaded an advanced custom session and retained patient, language, transcript, versioned state |
| Responsive UI | Inspected | 1440×1000 desktop and 390×844 mobile; mobile document width equaled viewport width (390), no horizontal overflow |
| Console | Passed for inspected flow | No warning/error entries returned by browser log check |
| Live Auth/backend/AI/database | Not verified | No service configuration or Gemini-owned backend exists in this repository |
| Clinical correctness / licensed-source ingestion | Not verified | No clinician-approved dataset, answer keys or source ingestion implemented |
| Hosted routing | Configuration only | SPA rewrite/basic headers prepared in `vercel.json`; no deployment performed |

Initial Vitest process workers were blocked by Windows sandbox spawn restrictions; the configured thread pool resolved that environment issue. The workflow test was corrected to wait for lazy route loading. No production failures were hidden by substituting demo responses.

Screenshot: `docs/screenshots/dashboard.jpg` captures the completed frontend with a synthetic demo history item. The screenshot is not evidence of live AI/clinical functionality.

Remaining production validation belongs to the backend integration pass described in `docs/GEMINI_HANDOFF.md`, including token validation, RLS, cross-user isolation, provider calls, diagnosis matching, source licensing and clinician review.

# Integration architecture

## Supported application

```text
React / Vite (root src/)
  └─ /api proxy in development, explicit API URL when hosted
       └─ Express API (server/)
            ├─ Auth: Supabase getUser + trusted app_metadata roles
            │        or signed loopback-only development student cookie
            ├─ Session ownership, version checks, idempotency, serialized mutations
            ├─ Immutable private clinical profile per session
            ├─ PatientSimulationEngine → explicit IAIProvider (Gemini / Groq / dev mock)
            ├─ Structured evidence assessment → mandatory interview gate
            ├─ Diagnosis answer-set normalization + semantic assessment
            └─ SQLite repository → session, profile, transcript, evidence, results,
                                   retry receipts, draft revisions and review audit
```

The root frontend never receives a provider credential or hidden answer key before submission. The patient-generation prompt deliberately excludes diagnostic answer labels. Known labels and codes are screened from generated output. Patient replies and objective assessments must both succeed before a turn is committed. Native fetch is used inside the existing provider interface; no browser AI SDK remains.

The SQLite implementation uses Node 24's `node:sqlite`, WAL and an atomic state-row upsert. It is intentionally a small, durable single-process repository. It is not designed for multi-instance concurrency or a large institutional corpus. Keep it on a persistent volume, back it up, and select a scalable adapter when deployment requirements warrant it. In-memory storage exists only as a test adapter. Supabase is currently used for authentication, not session storage.

`client/` is Faiaz's preserved alternate frontend. It is not included in the supported root build or CI. The historical SQL migration is retained but not used/applied; its role and write policies require hardening before any future Supabase persistence integration. Do not run it from this release's setup.

## Clinical boundaries

Imported cases are unreviewed development fixtures. Three variants adjust interview disclosure/guidance without inventing comorbidities or changing clinical truth. Production does not select them. Review schema validation checks structure and rubric/source presence; only qualified human review can establish clinical validity, source eligibility and appropriate accepted terminology.

Rubric configuration is preserved in authored cases. Automated feedback scores interview coverage only; empathy and reasoning remain explicitly unscored. Claims are either linked to assessed transcript evidence or labeled as authored case references. No fabricated citations or student-message links are used for private case facts.

## Interface

Charcoal, sand and electric blue design tokens apply to authentication, dashboard, setup, conversation, diagnosis confirmation, feedback, history and supervisor tools. Layouts adapt to mobile; Bengali uses system Bengali-compatible fonts. Motion respects reduced-motion preferences. The timer renders independently, messages animate briefly, and chat scrolling changes only the transcript container while the learner is near its bottom.

## Preserved ownership

Faiaz's backend routes, provider abstraction, clinical fixtures, synonym data, supervisor authoring model and alternate client are integrated with Labib's root React screens and shared contract. Git history is retained. Security fixes replace the browser-only AI/key path and unsafe authentication/progress behavior while retaining the supported user flows. No cloud project, main branch or deployment is changed by this integration.

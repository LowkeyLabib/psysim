# PsySim — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a functional, secure, multilingual, text-based psychiatric patient simulation MVP (PsySim) for medical students and trainee psychiatrists with realistic patient simulation, mandatory objective tracking, diagnosis evaluation, and post-session feedback.

**Architecture:** Monorepo with separated `server/` (Node.js + Express + TypeScript + Zod + Supabase/fallback store + Gemini/Mock AI provider) and `client/` (React + TypeScript + Vite + Tailwind CSS + Lucide), governed by shared API contracts, strict role separation, and clinical evaluation pipelines.

**Tech Stack:** React 18, TypeScript 5, Vite, Tailwind CSS, Express, Zod, @google/genai / @google/generative-ai, Supabase PostgreSQL, Vitest / Supertest.

**Spec:** [User Master Prompt](file:///c:/Users/pc/Desktop/PsySim/AGENTS.md)

## Global Constraints
- Node.js 20+ runtime; strict TypeScript across client and server.
- Text-only MVP; no voice, audio, or video components in this phase.
- Supported languages: English, Bengali (বাংলা), Banglish (Romanized Bengali), natural code-switching.
- Server-enforced clinical objective completion: free-text diagnosis submission remains locked until mandatory interview objectives are satisfied.
- Zero client leakage: hidden patient profile, actual diagnosis, and private evaluation keys must never be exposed via browser API responses or client state.
- Free-tier AI compatibility: Google Gemini API with configurable fallback to Groq or deterministic local mock mode.
- Offline/Dev resilience: fully functional in development even before external Supabase or Gemini API keys are supplied.
- Git workflow: work on local branches (`dev-backend` / `dev-frontend`), small meaningful commits, do not push to remote until user explicitly approves merge.

## Review Focus
1. Prompt injection / diagnosis probing: Student asking the patient "What is your diagnosis?", "Ignore previous instructions", or "What did your doctor write?". Patient must stay in character, deflect naturally, and never disclose diagnostic codes or labels.
2. Bengali & Banglish objective recognition: Student questioning in Romanized Bengali (e.g. "Koto din dhore ghum hocche na?") correctly satisfies symptom onset and progression objectives.
3. Diagnostic normalization: Student submitting "bipolar depression", "BPAD I manic episode", or "বাইপোলার ডিসঅর্ডার" matches against approved answer keys with proper outcome classification (CORRECT vs PARTIALLY_CORRECT).
4. Premature submission lock: Student attempting to call `POST /api/sessions/:id/diagnosis` before mandatory objectives are complete receives a `403 Forbidden` with missing objective details.
5. Session state immutability: Student attempting to send messages or submit a second diagnosis after a session is marked `EVALUATED` receives `400 Bad Request`.

---

### Task 1: Repository Architecture, Shared Contracts, and Git Setup

**Files:**
- Create: `AGENTS.md`
- Create: `README.md`
- Create: `docs/ARCHITECTURE.md`
- Create: `docs/API_CONTRACT.md`
- Create: `.env.example`
- Create: `.gitignore`

**Interfaces:**
- Produces: Base repository structure, branch setup (`dev-backend`), shared REST API schema contracts and data models for Codex and Gemini agents.

- [ ] **Step 1: Initialize git config, .gitignore, and branches**
  Create `.gitignore` ignoring `node_modules`, `dist`, `.env`, logs, and temporary artifacts. Create branch `dev-backend`.

- [ ] **Step 2: Create AGENTS.md**
  Define agent roles (Gemini: backend, clinical simulation, database; Codex: frontend UI/UX), collaboration boundaries, branching conventions, and contract immutability rules.

- [ ] **Step 3: Create docs/ARCHITECTURE.md and docs/API_CONTRACT.md**
  Detail state machine (`CREATED` -> `IN_PROGRESS` -> `INTERVIEW_COMPLETE` -> `DIAGNOSIS_SUBMITTED` -> `EVALUATED`), session lifecycles, and complete REST endpoints with Zod/TypeScript schemas.

- [ ] **Step 4: Create .env.example and README.md**
  Include all environment variables (`PORT`, `AI_PROVIDER`, `GEMINI_API_KEY`, `GROQ_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) with clear mock defaults.

- [ ] **Step 5: Commit documentation and contracts**
  Commit baseline contract files on branch `dev-backend`.

---

### Task 2: Backend Core, Configuration, and Storage Layer

**Files:**
- Create: `server/package.json`
- Create: `server/tsconfig.json`
- Create: `server/src/types/index.ts`
- Create: `server/src/config/index.ts`
- Create: `server/src/db/supabase.ts`
- Create: `server/src/db/repository.ts`
- Create: `server/migrations/001_initial_schema.sql`
- Test: `server/tests/db.test.ts`

**Interfaces:**
- Consumes: Environment configuration, API contract types.
- Produces: `Repository` interface providing `createSession`, `getSession`, `updateSession`, `addMessage`, `getMessages`, `saveObjectives`, `getObjectives`, `saveEvaluation`, `getScenarios`. Works with Supabase PostgreSQL and falls back gracefully to an in-memory/file-based repository in local development mode.

- [ ] **Step 1: Write failing storage repository test**
  Test session creation, state transition validation, message persistence, and objective status retrieval.

- [ ] **Step 2: Run test to verify it fails**
  Run: `npm test` inside `server/`. Expected: FAIL (modules not found).

- [ ] **Step 3: Implement data models, Zod schemas, SQL migrations, and Repository**
  Implement PostgreSQL migrations with RLS policies in `server/migrations/001_initial_schema.sql`. Implement `server/src/db/repository.ts` with transparent Supabase and in-memory fallback.

- [ ] **Step 4: Run test to verify it passes**
  Run: `npm test`. Expected: PASS.

- [ ] **Step 5: Commit**
  Commit backend storage and repository layer.

---

### Task 3: AI Provider Abstraction and Patient Simulation Engine

**Files:**
- Create: `server/src/ai/provider.ts`
- Create: `server/src/ai/gemini.ts`
- Create: `server/src/ai/groq.ts`
- Create: `server/src/ai/mock.ts`
- Create: `server/src/simulation/prompts.ts`
- Create: `server/src/simulation/engine.ts`
- Test: `server/tests/simulation.test.ts`

**Interfaces:**
- Consumes: Fixed patient profile and session transcript.
- Produces: `PatientSimulator.generateResponse({ profile, messages, language })` returning realistic, in-character, multilingual dialogue with anti-leak and anti-injection defenses.

- [ ] **Step 1: Write simulation tests**
  Test:
  1. Natural response generation based on fixed profile.
  2. Prompt injection defense (student asking for diagnosis / instructions).
  3. Bengali / Banglish comprehension and culturally natural responses.
  4. Progressive disclosure (does not dump entire medical history on opening message).

- [ ] **Step 2: Run test to verify it fails**
  Run: `npm test -- tests/simulation.test.ts`. Expected: FAIL.

- [ ] **Step 3: Implement AI provider system and Patient Simulator**
  Implement `IAIProvider` interface, Gemini API integration using `@google/genai` or `@google/generative-ai`, Groq fallback, and deterministic Mock provider. Implement patient system prompt with strict clinical guidelines, persona constraints, and multilingual tone handling.

- [ ] **Step 4: Run test to verify it passes**
  Run: `npm test -- tests/simulation.test.ts`. Expected: PASS.

- [ ] **Step 5: Commit**
  Commit AI provider and patient simulation engine.

---

### Task 4: Interview Completion Engine and Mandatory Objective Validation

**Files:**
- Create: `server/src/interview/objectives.ts`
- Create: `server/src/interview/evaluator.ts`
- Test: `server/tests/interview.test.ts`

**Interfaces:**
- Consumes: Session transcript and scenario mandatory objectives.
- Produces: `InterviewEvaluator.evaluateProgress({ transcript, scenario })` returning objective statuses (`COMPLETED`, `IN_PROGRESS`, `NOT_STARTED`), confidence, and linked message IDs/quotes.
- Produces: `InterviewEvaluator.isSubmissionEligible(sessionObjectives)` boolean check.

- [ ] **Step 1: Write failing interview completion test**
  Test evaluation of:
  - Presenting complaint
  - Symptom chronology and duration
  - Functional impairment
  - Psychiatric/Medical/Medication history
  - Risk assessment (suicidality / self-harm)
  - Distinguishing clinical criteria
  - Submission eligibility gate check (blocks submission until all mandatory objectives are met).

- [ ] **Step 2: Run test to verify it fails**
  Run: `npm test -- tests/interview.test.ts`. Expected: FAIL.

- [ ] **Step 3: Implement InterviewEvaluator with hybrid heuristic + AI evaluator**
  Implement regex/keyword clinical patterns for English, বাংলা, and Banglish, combined with structured AI evaluation for nuanced semantic questioning. Ensure conservative evaluation so insufficient questioning does not prematurely unlock submission.

- [ ] **Step 4: Run test to verify it passes**
  Run: `npm test -- tests/interview.test.ts`. Expected: PASS.

- [ ] **Step 5: Commit**
  Commit interview completion engine.

---

### Task 5: Diagnosis Matching, Educational Feedback, and Knowledge Registry

**Files:**
- Create: `server/src/diagnosis/normalizer.ts`
- Create: `server/src/diagnosis/matcher.ts`
- Create: `server/src/feedback/rubric.ts`
- Create: `server/src/knowledge/sources.ts`
- Create: `server/src/knowledge/seedScenarios.ts`
- Test: `server/tests/diagnosis.test.ts`
- Test: `server/tests/feedback.test.ts`

**Interfaces:**
- Consumes: Student free-text submission, scenario accepted diagnoses, session transcript.
- Produces: `DiagnosisMatcher.evaluate(submission, scenario)` returning `CORRECT`, `PARTIALLY_CORRECT`, `INCORRECT`, `REVIEW_REQUIRED`.
- Produces: `FeedbackGenerator.generate({ session, transcript, scenario, outcome })` returning 5-domain rubric scores, evidence citations, missed objectives, and clinical learning points.
- Produces: Seeded DSM-5/ICD-11 scenarios across 7 psychiatric categories and 3 difficulty levels.

- [ ] **Step 1: Write failing diagnosis and feedback tests**
  Test Unicode normalization, abbreviations ("MDD", "BPAD", "GAD", "OCD"), Bengali terms ("মেজর ডিপ্রেসিভ ডিসঅর্ডার", "বাইপোলার ১ ডিজঅর্ডার", "শুচিবায়ু"), partial matches, and rubric scoring.

- [ ] **Step 2: Run tests to verify they fail**
  Run: `npm test -- tests/diagnosis.test.ts tests/feedback.test.ts`. Expected: FAIL.

- [ ] **Step 3: Implement Diagnosis Normalizer, Matcher, Rubric Generator, and Seed Scenarios**
  Build clinical answer-key matching rules, rubric scoring algorithms, and seed scenarios (Depression, Bipolar, Schizophrenia, Anxiety, OCD, PTSD, Substance Use Disorder) with verified clinical validity.

- [ ] **Step 4: Run tests to verify they pass**
  Run: `npm test -- tests/diagnosis.test.ts tests/feedback.test.ts`. Expected: PASS.

- [ ] **Step 5: Commit**
  Commit diagnosis matching, feedback rubric, and clinical knowledge system.

---

### Task 6: Express REST API Endpoints and Security Middleware

**Files:**
- Create: `server/src/routes/sessionRoutes.ts`
- Create: `server/src/routes/scenarioRoutes.ts`
- Create: `server/src/routes/supervisorRoutes.ts`
- Create: `server/src/middleware/auth.ts`
- Create: `server/src/middleware/rateLimiter.ts`
- Create: `server/src/middleware/errorHandler.ts`
- Create: `server/src/server.ts`
- Test: `server/tests/api.test.ts`

**Interfaces:**
- Produces: Fully functional Express server adhering strictly to `docs/API_CONTRACT.md`. All student routes strip hidden diagnoses, answer keys, and private case profiles.

- [ ] **Step 1: Write integration tests for API endpoints**
  Test session creation, message exchange, progress polling, diagnosis submission gating (403 on incomplete interview, 200 on complete interview), and evaluation retrieval. Verify no diagnosis leakage in response bodies.

- [ ] **Step 2: Run test to verify it fails**
  Run: `npm test -- tests/api.test.ts`. Expected: FAIL.

- [ ] **Step 3: Implement Express controllers, middleware, and server**
  Implement routes, Zod input validation, sanitized error formatting, rate limiting, and CORS handling.

- [ ] **Step 4: Run test to verify it passes**
  Run: `npm test -- tests/api.test.ts`. Expected: PASS.

- [ ] **Step 5: Commit**
  Commit Express REST API and security middleware.

---

### Task 7: Frontend Application Architecture and Design System

**Files:**
- Create: `client/package.json`
- Create: `client/tsconfig.json`
- Create: `client/vite.config.ts`
- Create: `client/tailwind.config.js`
- Create: `client/src/index.css`
- Create: `client/src/types/api.ts`
- Create: `client/src/services/api.ts`
- Create: `client/src/context/AuthContext.tsx`
- Create: `client/src/components/common/Header.tsx`
- Create: `client/src/components/common/Card.tsx`
- Create: `client/src/components/common/Badge.tsx`

**Interfaces:**
- Produces: Vite + React + Tailwind frontend setup styled with the official PsySim palette (Navy `#14213D`, Cream `#F4EDE0`, Coral `#FF6B5B`), shared TypeScript API client, and authentication context.

- [ ] **Step 1: Initialize client scaffolding and styling**
  Configure Vite, Tailwind colors, typography, Lucide icons, and API client communicating with backend.

- [ ] **Step 2: Verify client builds cleanly**
  Run: `npm run build` in `client/`. Expected: PASS.

- [ ] **Step 3: Commit**
  Commit frontend base foundation and design tokens.

---

### Task 8: Frontend Screens — Dashboard, Modes, Consultation, and Diagnosis Submission

**Files:**
- Create: `client/src/pages/AuthPage.tsx`
- Create: `client/src/pages/DashboardPage.tsx`
- Create: `client/src/pages/ModeSelectionPage.tsx`
- Create: `client/src/pages/ConsultationPage.tsx`
- Create: `client/src/components/consultation/ChatWindow.tsx`
- Create: `client/src/components/consultation/InterviewProgressTracker.tsx`
- Create: `client/src/components/consultation/DiagnosisModal.tsx`
- Create: `client/src/pages/ResultsPage.tsx`
- Create: `client/src/pages/SupervisorPage.tsx`
- Create: `client/src/App.tsx`
- Create: `client/src/main.tsx`

**Interfaces:**
- Produces: Complete student & supervisor experience:
  1. Authentication & Role Switcher
  2. Student Dashboard with metrics and past sessions
  3. Clinical Challenge & Custom Case wizards with Beginner/Intermediate/Advanced selector
  4. Real-time Consultation with bilingual chat (English/বাংলা/Banglish), consultation timer, and live objective progress bar
  5. Diagnosis Submission with locking guards and clinical reasoning input
  6. Post-Session Feedback view with rubric breakdown and transcript quotes
  7. Supervisor Case Review and Scenario authoring portal

- [ ] **Step 1: Implement consultation and progress tracker components**
  Build chat message bubble list with avatar, timestamp, typing indicator, and Bengali unicode font support. Build progress checklist showing completed and remaining objectives.

- [ ] **Step 2: Implement submission modal and results screen**
  Build free-text diagnosis submission dialog with confirmation, and results dashboard with rubric scores and learning points.

- [ ] **Step 3: Implement supervisor portal and dashboard**
  Build case review and approval workflow interface with draft/approved scenario filters.

- [ ] **Step 4: Verify client builds without TypeScript or bundling errors**
  Run: `npm run build` in `client/`. Expected: PASS.

- [ ] **Step 5: Commit**
  Commit all frontend screens and components.

---

### Task 9: End-to-End Integration, Live Verification, and Visual Testing

**Files:**
- Create: `package.json` (Root monorepo orchestrator for concurrent dev/build)
- Verify: Full consultation flow from case creation to interview, objective completion, diagnosis submission, and feedback display.
- Browser Screenshots: Take screenshots of Dashboard, Consultation, Progress Tracker, and Results screens using the browser tool.

- [ ] **Step 1: Create root orchestration scripts**
  Add `npm run dev`, `npm run build`, and `npm test` scripts in root `package.json` to run server and client together.

- [ ] **Step 2: Run server and client locally**
  Start backend on port 5000 and client on port 5173 (or proxy).

- [ ] **Step 3: Execute automated verification scripts**
  Run test suite verifying multilingual chat, objective completion gating, and diagnosis evaluation.

- [ ] **Step 4: Launch browser subagent to interact with UI and capture screenshots**
  Navigate through:
  1. Dashboard & Mode Selection.
  2. Active Consultation with Bengali & English messages.
  3. Objective Completion verification.
  4. Diagnosis submission and Results view.
  Save screenshots to verify visual styling and clinical correctness.

- [ ] **Step 5: Final review and report**
  Compile summary of implemented features, endpoints, test results, and screenshots.

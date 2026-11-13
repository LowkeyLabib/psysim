# AGENTS.md — Multi-Agent Collaboration Agreement

## Project: PsySim (Psychiatric Simulation Platform)

This document establishes the architecture, boundaries, and collaboration rules between the two AI engineering agents working on PsySim:
- **Codex**: Frontend, UI/UX, and client-side integration.
- **Gemini**: Backend, AI patient simulation, clinical knowledge integration, and database persistence.

---

## 1. Agent Ownership Boundaries

| Domain | Codex (Frontend Agent) | Gemini (Backend Agent) |
|---|---|---|
| **Root Directory** | `client/` | `server/` |
| **User Interface** | React, TypeScript, Tailwind CSS, Lucide icons, Framer Motion | None (API and server-side templates only) |
| **Authentication UI** | Sign In, Sign Up, Session guards, AuthContext | Supabase Auth verification, token validation middleware |
| **State Management** | React state, local storage, API client queries | Session state machine, persistence, RLS |
| **Clinical Simulation** | Renders patient chat bubbles & progress UI | Prompting, engine, persona defense, LLM provider abstraction |
| **Clinical Knowledge** | Category dropdowns, UI filters | Seed cases, ICD-11/DSM-5 validation, RAG/registry |
| **Evaluation & Gates** | Progress tracker display, locked submit button | Objective evaluation, evidence citations, diagnosis matcher |
| **Security & Leakage** | Never store hidden answers in state or DOM | Strips hidden answers from all student API responses |

---

## 2. Git Branching & Workflow Rules

1. **Active Branches**:
   - `dev-frontend`: Owned by Codex for client development.
   - `dev-backend`: Owned by Gemini for backend services and shared contracts.
2. **Main Branch Protection**:
   - **NEVER** push directly to `main`.
   - **DO NOT** push to GitHub without explicit user instruction. All commits remain local during side-by-side development.
3. **Commit Discipline**:
   - Small, focused, descriptive commits following Conventional Commits format (`feat:`, `fix:`, `docs:`, `test:`, `refactor:`).
4. **File Boundaries**:
   - Codex must not modify files inside `server/` without explicit agreement.
   - Gemini must not modify files inside `client/` without coordinating contract interfaces.
   - Shared contracts in `docs/API_CONTRACT.md` and `docs/ARCHITECTURE.md` require mutual alignment before modifications.

---

## 3. Communication & Contract Integrity

- **Source of Truth**: `docs/API_CONTRACT.md` specifies all HTTP routes, request bodies, response shapes, and error codes.
- **Zero Diagnosis Leakage**:
  - The backend will **NEVER** return `diagnosis`, `accepted_diagnoses`, or `hidden_profile` to student callers until `POST /api/sessions/:id/diagnosis` has been finalized.
  - The frontend must never attempt to guess or inspect internal state to reveal answers early.
- **Languages**:
  - Full support for English, Bengali (বাংলা), Banglish (Romanized Bengali), and mixed code-switching.
  - Both agents must treat Bengali text with first-class Unicode normalization (`NFC`).

---

## 4. Local Development Fallbacks

- If `SUPABASE_URL` or `SUPABASE_ANON_KEY` are unset, the backend runs in resilient in-memory mode.
- If `GEMINI_API_KEY` is unset, the backend operates in deterministic mock mode (`AI_PROVIDER=mock`).
- Frontend and backend must be independently runnable and locally testable without requiring cloud credentials.

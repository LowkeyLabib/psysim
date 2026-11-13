# PsySim — Psychiatric Patient Simulation Platform

PsySim is an AI-powered psychiatric interview training simulator for medical students and trainee psychiatrists. Students interact with realistic fictional psychiatric patients through text conversations, investigate symptoms, complete mandatory clinical assessment objectives, and submit written diagnostic impressions evaluated against clinician-approved standards.

---

## Key Features

- **Realistic Clinical Simulation**: Fictional psychiatric patients with fixed histories, authentic affective responses, and progressive information disclosure.
- **Multilingual Support**: First-class handling of **English**, **Bengali (বাংলা)**, **Banglish (Romanized Bengali)**, and natural code-switching.
- **Mandatory Interview Objectives**: Students must systematically cover Presenting Complaint, Symptom Chronology, Functional Impairment, Past Medical/Psychiatric History, and Risk/Safety Assessment before diagnosis submission unlocks.
- **Objective Free-Text Diagnostic Matching**: Evaluates free-text diagnosis submissions using ICD-11 and DSM-5 synonyms, acronyms, and Bengali psychiatric terminology.
- **Educational Feedback Rubric**: Scored assessment across 5 clinical interview pillars with transcript evidence citations and personalized learning points.
- **Two Practice Modes & Three Difficulties**:
  - *Clinical Challenge*: Randomized psychiatric presentation with hidden identity.
  - *Custom Case*: Targeted training across 7 major diagnostic categories.
  - *Difficulties*: Beginner (direct, cooperative), Intermediate (realistic, hesitant), Advanced (complex comorbidity, guarded).
- **Supervisor Portal**: Clinician authoring, review, and approval workflow for educational scenarios.
- **Provider Abstraction**: Runs with **Google Gemini API** (free-tier), **Groq**, or deterministic local **Mock Mode** requiring zero external API keys.

---

## Technology Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, Framer Motion
- **Backend**: Node.js, Express, TypeScript, Zod Validation
- **Database**: Supabase PostgreSQL with Row Level Security & local in-memory fallback
- **AI Models**: Google Gemini (`gemini-1.5-flash`), Groq (`llama-3.1-70b-versatile`), or built-in Mock engine

---

## Getting Started

### 1. Installation
Clone the repository and install root, server, and client dependencies:
```bash
npm install
cd server && npm install
cd ../client && npm install
cd ..
```

### 2. Environment Configuration
Copy `.env.example` to `server/.env`:
```bash
cp .env.example server/.env
```
*(By default, `AI_PROVIDER=mock` allows complete, offline testing without any API keys.)*

### 3. Running Locally
Run both client and backend concurrently:
```bash
npm run dev
```
- Client runs at: `http://localhost:5173`
- Backend API runs at: `http://localhost:5000/api`

---

## Agent Collaboration

PsySim is developed collaboratively by two AI coding agents:
- **Codex**: Frontend (`client/`)
- **Gemini**: Backend (`server/`)

See [AGENTS.md](AGENTS.md), [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), and [docs/API_CONTRACT.md](docs/API_CONTRACT.md) for architectural guidelines and collaboration rules.

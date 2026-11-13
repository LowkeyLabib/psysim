-- PsySim Supabase PostgreSQL Schema Migration 001
-- Enables Row Level Security (RLS) to enforce student data boundary and prevent diagnosis leaks

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles & Roles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('student', 'supervisor', 'admin')) DEFAULT 'student',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Scenarios (Clinician Authoring & Template Storage)
CREATE TABLE IF NOT EXISTS public.scenarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id TEXT NOT NULL,
  category_name TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('BEGINNER', 'INTERMEDIATE', 'ADVANCED')),
  patient_demographics JSONB NOT NULL,
  presenting_complaint TEXT NOT NULL,
  opening_message TEXT NOT NULL,
  symptoms JSONB NOT NULL DEFAULT '[]',
  symptom_timeline JSONB NOT NULL DEFAULT '{}',
  psychiatric_history TEXT NOT NULL DEFAULT '',
  medical_history TEXT NOT NULL DEFAULT '',
  medications JSONB NOT NULL DEFAULT '[]',
  substance_history TEXT NOT NULL DEFAULT '',
  risk_factors JSONB NOT NULL DEFAULT '[]',
  protective_factors JSONB NOT NULL DEFAULT '[]',
  negative_findings JSONB NOT NULL DEFAULT '[]',
  approved_diagnosis JSONB NOT NULL,
  accepted_diagnoses JSONB NOT NULL,
  mandatory_objectives JSONB NOT NULL,
  review_status TEXT NOT NULL CHECK (review_status IN ('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED')) DEFAULT 'APPROVED',
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Sessions
CREATE TABLE IF NOT EXISTS public.sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  scenario_id UUID NOT NULL REFERENCES public.scenarios(id) ON DELETE CASCADE,
  mode TEXT NOT NULL CHECK (mode IN ('CLINICAL_CHALLENGE', 'CUSTOM_CASE')),
  difficulty TEXT NOT NULL CHECK (difficulty IN ('BEGINNER', 'INTERMEDIATE', 'ADVANCED')),
  status TEXT NOT NULL CHECK (status IN ('CREATED', 'IN_PROGRESS', 'INTERVIEW_COMPLETE', 'DIAGNOSIS_SUBMITTED', 'EVALUATED', 'ABANDONED')) DEFAULT 'CREATED',
  patient_demographics JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- 4. Messages
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  sender TEXT NOT NULL CHECK (sender IN ('patient', 'student', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Objective Progress
CREATE TABLE IF NOT EXISTS public.interview_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  objective_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  is_mandatory BOOLEAN NOT NULL DEFAULT TRUE,
  status TEXT NOT NULL CHECK (status IN ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED')) DEFAULT 'NOT_STARTED',
  evidence_quote TEXT,
  evidence_message_id UUID REFERENCES public.messages(id),
  confidence NUMERIC(3, 2),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(session_id, objective_id)
);

-- 6. Evaluations
CREATE TABLE IF NOT EXISTS public.evaluations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID UNIQUE NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  outcome TEXT NOT NULL CHECK (outcome IN ('CORRECT', 'PARTIALLY_CORRECT', 'INCORRECT', 'REVIEW_REQUIRED')),
  submitted_diagnosis TEXT NOT NULL,
  clinical_reasoning TEXT,
  actual_diagnosis JSONB NOT NULL,
  outcome_explanation TEXT NOT NULL,
  key_positive_findings JSONB NOT NULL DEFAULT '[]',
  relevant_negative_findings JSONB NOT NULL DEFAULT '[]',
  rubric JSONB NOT NULL DEFAULT '{}',
  learning_points JSONB NOT NULL DEFAULT '[]',
  evaluated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Medical Knowledge Sources
CREATE TABLE IF NOT EXISTS public.knowledge_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_name TEXT NOT NULL,
  url TEXT NOT NULL,
  license_terms TEXT NOT NULL,
  version TEXT NOT NULL,
  retrieval_date DATE NOT NULL DEFAULT CURRENT_DATE,
  content_type TEXT NOT NULL,
  diagnostic_categories JSONB NOT NULL DEFAULT '[]'
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_sources ENABLE ROW LEVEL SECURITY;

-- Students can read their own profiles, sessions, messages, progress, evaluations
CREATE POLICY student_profile_policy ON public.profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY student_session_policy ON public.sessions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY student_message_policy ON public.messages FOR ALL USING (
  EXISTS (SELECT 1 FROM public.sessions WHERE sessions.id = messages.session_id AND sessions.user_id = auth.uid())
);
CREATE POLICY student_progress_policy ON public.interview_progress FOR ALL USING (
  EXISTS (SELECT 1 FROM public.sessions WHERE sessions.id = interview_progress.session_id AND sessions.user_id = auth.uid())
);
CREATE POLICY student_evaluation_policy ON public.evaluations FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.sessions WHERE sessions.id = evaluations.session_id AND sessions.user_id = auth.uid())
);

-- Supervisors have full read/write access to scenarios and knowledge
CREATE POLICY supervisor_scenario_policy ON public.scenarios FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('supervisor', 'admin'))
);

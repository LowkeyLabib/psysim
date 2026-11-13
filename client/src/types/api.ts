export type ApplicationMode = 'CLINICAL_CHALLENGE' | 'CUSTOM_CASE';
export type DifficultyLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
export type UserRole = 'student' | 'supervisor' | 'admin';

export type SessionStatus =
  | 'CREATED'
  | 'IN_PROGRESS'
  | 'INTERVIEW_COMPLETE'
  | 'DIAGNOSIS_SUBMITTED'
  | 'EVALUATED'
  | 'ABANDONED';

export type DiagnosticOutcome =
  | 'CORRECT'
  | 'PARTIALLY_CORRECT'
  | 'INCORRECT'
  | 'REVIEW_REQUIRED';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  created_at: string;
}

export interface PatientInfo {
  name: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  occupation: string;
  personality: string;
  language: string;
}

export interface SessionMetadata {
  id: string;
  mode: ApplicationMode;
  difficulty: DifficultyLevel;
  status: SessionStatus;
  patient: PatientInfo;
  opening_message?: string;
  created_at: string;
}

export interface ConsultationMessage {
  id: string;
  sessionId: string;
  sender: 'patient' | 'student' | 'system';
  content: string;
  timestamp: string;
}

export interface InterviewObjectiveItem {
  id: string;
  title: string;
  description: string;
  isMandatory: boolean;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  evidenceQuote?: string;
  confidence?: number;
}

export interface ProgressData {
  interview_complete: boolean;
  can_submit_diagnosis: boolean;
  objectives: InterviewObjectiveItem[];
}

export interface RubricDomain {
  name: string;
  score: number;
  maxScore: number;
  feedback: string;
}

export interface EvaluationResult {
  session_id: string;
  outcome: DiagnosticOutcome;
  actual_diagnosis: {
    name: string;
    icd11Code: string;
    dsm5Code: string;
    category: string;
  };
  submitted_diagnosis: string;
  clinical_reasoning?: string;
  outcome_explanation: string;
  key_positive_findings: string[];
  relevant_negative_findings: string[];
  educational_rubric: {
    overallScore: number;
    domains: RubricDomain[];
  };
  learning_points: string[];
  evaluated_at: string;
}

export interface PastSessionItem {
  id: string;
  mode: ApplicationMode;
  difficulty: DifficultyLevel;
  status: SessionStatus;
  patient_name: string;
  patient_age: number;
  outcome: DiagnosticOutcome | null;
  created_at: string;
  completed_at: string | null;
}

export interface ScenarioCategory {
  id: string;
  name: string;
  code: string;
  caseCount: number;
}

import { z } from 'zod';

export type ApplicationMode = 'CLINICAL_CHALLENGE' | 'CUSTOM_CASE';
export type DifficultyLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
export type SupportedLanguage = 'en' | 'bn' | 'auto';
export type UserRole = 'student' | 'supervisor' | 'admin';

export type SessionStatus =
  | 'CREATED'
  | 'IN_PROGRESS'
  | 'INTERVIEW_COMPLETE'
  | 'DIAGNOSIS_SUBMITTED'
  | 'EVALUATED'
  | 'ABANDONED';

export type ObjectiveStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

export type DiagnosticOutcome =
  | 'CORRECT'
  | 'PARTIALLY_CORRECT'
  | 'INCORRECT'
  | 'REVIEW_REQUIRED';

export interface PatientDemographics {
  name: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  occupation: string;
  personality: string;
  language: SupportedLanguage;
}

export interface ClinicalFinding {
  domain: string;
  description: string;
  isPositive: boolean;
}

export interface InterviewObjectiveDefinition {
  id: string;
  title: string;
  description: string;
  isMandatory: boolean;
  keywordsEn?: string[];
  keywordsBn?: string[];
}

export interface InterviewObjectiveProgress {
  id: string;
  title: string;
  description: string;
  isMandatory: boolean;
  status: ObjectiveStatus;
  evidenceQuote?: string;
  evidenceMessageId?: string;
  confidence?: number;
}

export interface ScenarioTemplate {
  id: string;
  categoryId: string;
  categoryName: string;
  difficulty: DifficultyLevel;
  patient: PatientDemographics;
  presentingComplaint: string;
  openingMessage: string;
  symptoms: string[];
  symptomTimeline: {
    onset: string;
    duration: string;
    progression: string;
    fluctuation?: string;
  };
  psychiatricHistory: string;
  medicalHistory: string;
  medications: string[];
  substanceHistory: string;
  riskFactors: string[];
  protectiveFactors: string[];
  negativeFindings: string[];
  approvedDiagnosis: {
    name: string;
    icd11Code: string;
    dsm5Code: string;
    specifiers?: string[];
  };
  acceptedDiagnoses: {
    name: string;
    isExact: boolean;
    isPartial?: boolean;
    synonyms: string[];
  }[];
  mandatoryObjectives: InterviewObjectiveDefinition[];
  reviewStatus: 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';
}

export interface Message {
  id: string;
  sessionId: string;
  sender: 'patient' | 'student' | 'system';
  content: string;
  timestamp: string;
}

export interface RubricDomainScore {
  name: string;
  score: number; // 1-5
  maxScore: number;
  feedback: string;
  evidenceQuotes?: string[];
}

export interface SessionEvaluation {
  id: string;
  sessionId: string;
  outcome: DiagnosticOutcome;
  submittedDiagnosis: string;
  clinicalReasoning?: string;
  actualDiagnosis: {
    name: string;
    icd11Code: string;
    dsm5Code: string;
    category: string;
  };
  outcomeExplanation: string;
  keyPositiveFindings: string[];
  relevantNegativeFindings: string[];
  rubric: {
    overallScore: number; // 0-100
    domains: RubricDomainScore[];
  };
  learningPoints: string[];
  evaluatedAt: string;
}

export interface Session {
  id: string;
  userId: string;
  scenarioId: string;
  mode: ApplicationMode;
  difficulty: DifficultyLevel;
  status: SessionStatus;
  patient: PatientDemographics;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  // Note: Hidden clinical answers are stored in the scenario template, not the public session object
}

// Zod Validation Schemas
export const CreateSessionSchema = z.object({
  mode: z.enum(['CLINICAL_CHALLENGE', 'CUSTOM_CASE']),
  difficulty: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']),
  categoryId: z.string().optional().nullable(),
  language: z.enum(['en', 'bn', 'auto']).default('auto'),
});

export const SendMessageSchema = z.object({
  content: z.string().min(1, 'Message cannot be empty').max(2000, 'Message too long'),
});

export const SubmitDiagnosisSchema = z.object({
  diagnosis: z.string().min(1, 'Diagnosis cannot be empty').max(300, 'Diagnosis too long'),
  clinicalReasoning: z.string().max(2000).optional().nullable(),
});

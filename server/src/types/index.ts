import { z } from 'zod';
import type {
  Mode,
  Difficulty,
  Language,
  SessionState,
  Outcome,
  UserProfile,
  Category,
  CreateSessionInput,
  Message,
  Objective,
  InterviewProgress,
  PublicSession,
  SessionSummary,
  SessionPage,
  DiagnosisInput,
  EvidenceClaim,
  RubricFeedback,
  SessionResult,
  ScenarioObjective,
  RubricDefinition,
  ScenarioInput,
  ScenarioDraft,
} from './contracts.js';

export type {
  Mode,
  Difficulty,
  Language,
  SessionState,
  Outcome,
  UserProfile,
  Category,
  CreateSessionInput,
  Message,
  Objective,
  InterviewProgress,
  PublicSession,
  SessionSummary,
  SessionPage,
  DiagnosisInput,
  EvidenceClaim,
  RubricFeedback,
  SessionResult,
  ScenarioObjective,
  RubricDefinition,
  ScenarioInput,
  ScenarioDraft,
};

// Internal Clinical Ground-Truth Profile (never exposed to student before evaluation)
export interface InternalClinicalProfile {
  id: string;
  categoryId: string;
  categoryName: string;
  difficulty: Difficulty;
  patient: {
    name: string;
    age: number;
    gender: 'male' | 'female' | 'other';
    occupation: string;
    personality: string;
    language: Language;
  };
  presentingComplaint: string;
  openingMessage: Record<Language, string>;
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
  mandatoryObjectives: {
    id: string;
    title: string;
    guidance: string;
    required: boolean;
    criteria: string;
    keywordsEn?: string[];
    keywordsBn?: string[];
  }[];
  reviewStatus: 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';
}

// Zod Validation Schemas matching Labib's contract
export const CreateSessionZod = z.object({
  mode: z.enum(['challenge', 'custom']),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  language: z.enum(['en', 'bn', 'banglish', 'mixed']).default('en'),
  categoryId: z.string().optional().nullable(),
});

export const SendMessageZod = z.object({
  content: z.string().min(1, 'Message cannot be empty').max(4000, 'Message cannot exceed 4,000 characters'),
  expectedVersion: z.number().int().nonnegative().optional(),
});

export const SubmitDiagnosisZod = z.object({
  diagnosis: z.string().min(1, 'Diagnosis cannot be empty').max(500, 'Diagnosis cannot exceed 500 characters'),
  reasoning: z.string().max(4000).optional().nullable(),
  expectedVersion: z.number().int().nonnegative().optional(),
});

export const ReviewScenarioZod = z.object({
  expectedVersion: z.number().int().nonnegative(),
  decision: z.enum(['APPROVED', 'REJECTED']),
  reviewNote: z.string().min(1, 'Review note is required'),
});

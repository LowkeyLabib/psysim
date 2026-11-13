// PROPOSED API v1. Gemini acceptance is pending; see docs/API_CONTRACT.md.
export type Mode = 'challenge' | 'custom';
export type Difficulty = 'beginner' | 'intermediate' | 'advanced';
export type Language = 'en' | 'bn' | 'banglish' | 'mixed';
export type SessionState = 'CREATED' | 'IN_PROGRESS' | 'INTERVIEW_COMPLETE' | 'DIAGNOSIS_SUBMITTED' | 'EVALUATED' | 'ABANDONED' | 'ERROR';
export type Outcome = 'CORRECT' | 'PARTIALLY_CORRECT' | 'INCORRECT' | 'REVIEW_REQUIRED';
export interface UserProfile { id: string; displayName: string; email: string; role: 'student' | 'supervisor' | 'administrator' }
export interface Category { id: string; name: string; description: string }
export interface CreateSessionInput { mode: Mode; difficulty: Difficulty; language: Language; categoryId?: string }
export interface Message { id: string; role: 'patient' | 'student'; content: string; createdAt: string }
export interface Objective { id: string; title: string; required: boolean; completed: boolean; evidenceMessageIds: string[]; confidence: number | null; guidance?: string }
export interface InterviewProgress { eligible: boolean; objectives: Objective[] }
export interface PublicSession {
  id: string; version: number; state: SessionState; mode: Mode; difficulty: Difficulty; language: Language;
  createdAt: string; updatedAt: string; patient: { name: string; age: number; occupation: string; presentingComplaint: string };
  messages: Message[]; progress: InterviewProgress; simulation: 'live' | 'mock';
}
export interface SessionSummary { id: string; patientName: string; mode: Mode; difficulty: Difficulty; state: SessionState; createdAt: string; outcome?: Outcome }
export interface SessionPage { items: SessionSummary[]; nextCursor: string | null; stats: { completed: number; correct: number; graded: number; total: number } }
export interface DiagnosisInput { diagnosis: string; reasoning?: string; expectedVersion: number }
export interface EvidenceClaim { text: string; messageIds: string[]; caseReferences: string[] }
export interface RubricFeedback { name: string; score: number | null; maximum: number; feedback: EvidenceClaim }
export interface SessionResult {
  sessionId: string; outcome: Outcome; submittedDiagnosis: string; submittedReasoning?: string;
  approvedDiagnosis: string | null; supportingFindings: EvidenceClaim[]; negativeFindings: EvidenceClaim[];
  explanation: EvidenceClaim; learningPoints: EvidenceClaim[]; missedObjectives: string[]; rubric: RubricFeedback[];
}
export interface ScenarioObjective { id: string; title: string; required: boolean; criteria: string }
export interface RubricDefinition { name: string; weight: number; criteria: string }
export interface ScenarioInput {
  title: string; categoryId: string; difficulty: Difficulty; status: 'DRAFT' | 'PENDING_REVIEW';
  clinicalProfile: Record<string, unknown>; objectives: ScenarioObjective[]; rubric: RubricDefinition[]; sourceReferences: string[];
}
export interface ScenarioDraft extends Omit<ScenarioInput, 'status'> { id: string; version: number; status: 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED'; reviewNote?: string }
export interface PsySimApi {
  me(): Promise<UserProfile>; categories(): Promise<Category[]>; sessions(cursor?: string): Promise<SessionPage>;
  create(input: CreateSessionInput, key: string): Promise<PublicSession>; session(id: string): Promise<PublicSession>;
  send(id: string, content: string, expectedVersion: number, key: string): Promise<PublicSession>;
  diagnose(id: string, input: DiagnosisInput, key: string): Promise<PublicSession>; results(id: string): Promise<SessionResult>;
  scenarios(): Promise<ScenarioDraft[]>; saveScenario(input: ScenarioInput, id?: string, version?: number): Promise<ScenarioDraft>;
  reviewScenario(id: string, version: number, decision: 'APPROVED' | 'REJECTED', reviewNote: string): Promise<ScenarioDraft>;
  demoComplete?(id: string, objectiveId: string): Promise<PublicSession>;
}

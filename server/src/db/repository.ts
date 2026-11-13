import {
  PublicSession,
  InternalClinicalProfile,
  SessionResult,
  ScenarioDraft,
  Mode,
  Difficulty,
  Language,
} from '../types/index.js';
import { CORE_OBJECTIVES } from '../knowledge/seedScenarios.js';

export interface IRepository {
  createSession(data: {
    userId: string;
    scenario: InternalClinicalProfile;
    mode: Mode;
    difficulty: Difficulty;
    language: Language;
    isLive: boolean;
  }): Promise<PublicSession>;
  getSession(id: string): Promise<PublicSession | null>;
  updateSession(id: string, mutate: (s: PublicSession) => void): Promise<PublicSession | null>;
  getUserSessions(userId: string): Promise<PublicSession[]>;
  getScenario(id: string): Promise<InternalClinicalProfile | null>;
  getScenarios(filter?: { categoryId?: string; difficulty?: string; status?: string }): Promise<InternalClinicalProfile[]>;
  saveEvaluation(evaluation: SessionResult): Promise<SessionResult>;
  getEvaluation(sessionId: string): Promise<SessionResult | null>;
  getScenarioDrafts(): Promise<ScenarioDraft[]>;
  saveScenarioDraft(draft: ScenarioDraft): Promise<ScenarioDraft>;
  approveScenarioDraft(
    id: string,
    expectedVersion: number,
    decision: 'APPROVED' | 'REJECTED',
    reviewNote: string
  ): Promise<ScenarioDraft | null>;
  getIdempotencyReceipt(key: string): PublicSession | null;
  saveIdempotencyReceipt(key: string, session: PublicSession): void;
}

export class InMemoryRepository implements IRepository {
  private sessions: Map<string, PublicSession> = new Map();
  private sessionUserMap: Map<string, string> = new Map(); // sessionId -> userId
  private sessionScenarioMap: Map<string, string> = new Map(); // sessionId -> scenarioId
  private evaluations: Map<string, SessionResult> = new Map();
  private scenarios: Map<string, InternalClinicalProfile> = new Map();
  private scenarioDrafts: Map<string, ScenarioDraft> = new Map();
  private idempotencyReceipts: Map<string, PublicSession> = new Map();

  constructor(initialScenarios: InternalClinicalProfile[] = []) {
    for (const sc of initialScenarios) {
      this.scenarios.set(sc.id, sc);
      // Map to draft
      const draft: ScenarioDraft = {
        id: sc.id,
        version: 1,
        title: `${sc.patient.name} (${sc.categoryName})`,
        categoryId: sc.categoryId,
        difficulty: sc.difficulty,
        status: sc.reviewStatus,
        clinicalProfile: {
          presentingComplaint: sc.presentingComplaint,
          symptoms: sc.symptoms,
          approvedDiagnosis: sc.approvedDiagnosis,
        },
        objectives: sc.mandatoryObjectives.map((o) => ({
          id: o.id,
          title: o.title,
          required: o.required,
          criteria: o.criteria,
        })),
        rubric: [
          { name: 'Rapport & Empathy', weight: 20, criteria: 'Empathetic validation' },
          { name: 'History Taking', weight: 25, criteria: 'Symptom chronology' },
          { name: 'Psychiatric Assessment', weight: 20, criteria: 'Psychiatric exploration' },
          { name: 'Risk & Safety', weight: 20, criteria: 'Suicidality evaluation' },
          { name: 'Clinical Reasoning', weight: 15, criteria: 'Diagnostic formulation' },
        ],
        sourceReferences: ['WHO ICD-11 (2024-01)', 'DSM-5 Clinical Guidelines'],
      };
      this.scenarioDrafts.set(sc.id, draft);
    }
  }

  async createSession(data: {
    userId: string;
    scenario: InternalClinicalProfile;
    mode: Mode;
    difficulty: Difficulty;
    language: Language;
    isLive: boolean;
  }): Promise<PublicSession> {
    const id = `ses_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const openingContent = data.scenario.openingMessage[data.language] || data.scenario.openingMessage.en;

    const session: PublicSession = {
      id,
      version: 1,
      state: 'IN_PROGRESS',
      mode: data.mode,
      difficulty: data.difficulty,
      language: data.language,
      createdAt: now,
      updatedAt: now,
      patient: {
        name: data.scenario.patient.name,
        age: data.scenario.patient.age,
        occupation: data.scenario.patient.occupation,
        presentingComplaint: data.scenario.presentingComplaint,
      },
      messages: [
        {
          id: `msg_open_${Date.now()}`,
          role: 'patient',
          content: openingContent,
          createdAt: now,
        },
      ],
      progress: {
        eligible: false,
        objectives: CORE_OBJECTIVES.map((o) => ({
          id: o.id,
          title: o.title,
          required: o.required,
          completed: false,
          evidenceMessageIds: [],
          confidence: null,
          guidance: o.guidance,
        })),
      },
      simulation: data.isLive ? 'live' : 'mock',
    };

    this.sessions.set(id, session);
    this.sessionUserMap.set(id, data.userId);
    this.sessionScenarioMap.set(id, data.scenario.id);
    return structuredClone(session);
  }

  async getSession(id: string): Promise<PublicSession | null> {
    const s = this.sessions.get(id);
    return s ? structuredClone(s) : null;
  }

  async updateSession(id: string, mutate: (s: PublicSession) => void): Promise<PublicSession | null> {
    const s = this.sessions.get(id);
    if (!s) return null;
    mutate(s);
    s.version++;
    s.updatedAt = new Date().toISOString();
    this.sessions.set(id, s);
    return structuredClone(s);
  }

  async getUserSessions(userId: string): Promise<PublicSession[]> {
    const results: PublicSession[] = [];
    for (const [id, uId] of this.sessionUserMap.entries()) {
      if (uId === userId) {
        const s = this.sessions.get(id);
        if (s) results.push(structuredClone(s));
      }
    }
    return results;
  }

  async getScenario(id: string): Promise<InternalClinicalProfile | null> {
    // If id matches a session, resolve via sessionScenarioMap
    const scenarioId = this.sessionScenarioMap.get(id) || id;
    const sc = this.scenarios.get(scenarioId);
    return sc ? structuredClone(sc) : null;
  }

  async getScenarios(filter?: { categoryId?: string; difficulty?: string; status?: string }): Promise<InternalClinicalProfile[]> {
    let list = Array.from(this.scenarios.values());
    if (filter?.categoryId) list = list.filter((s) => s.categoryId === filter.categoryId);
    if (filter?.difficulty) list = list.filter((s) => s.difficulty === filter.difficulty);
    if (filter?.status) list = list.filter((s) => s.reviewStatus === filter.status);
    return list;
  }

  async saveEvaluation(evaluation: SessionResult): Promise<SessionResult> {
    this.evaluations.set(evaluation.sessionId, evaluation);
    return structuredClone(evaluation);
  }

  async getEvaluation(sessionId: string): Promise<SessionResult | null> {
    const res = this.evaluations.get(sessionId);
    return res ? structuredClone(res) : null;
  }

  async getScenarioDrafts(): Promise<ScenarioDraft[]> {
    return Array.from(this.scenarioDrafts.values());
  }

  async saveScenarioDraft(draft: ScenarioDraft): Promise<ScenarioDraft> {
    draft.version = (draft.version || 0) + 1;
    this.scenarioDrafts.set(draft.id, draft);
    return structuredClone(draft);
  }

  async approveScenarioDraft(
    id: string,
    expectedVersion: number,
    decision: 'APPROVED' | 'REJECTED',
    reviewNote: string
  ): Promise<ScenarioDraft | null> {
    const draft = this.scenarioDrafts.get(id);
    if (!draft) return null;
    if (draft.version !== expectedVersion) {
      throw new Error('Optimistic lock conflict: scenario version has changed.');
    }
    draft.status = decision;
    draft.reviewNote = reviewNote;
    draft.version++;
    this.scenarioDrafts.set(id, draft);

    // Also update scenario reviewStatus if approved
    const sc = this.scenarios.get(id);
    if (sc) {
      sc.reviewStatus = decision;
      this.scenarios.set(id, sc);
    }

    return structuredClone(draft);
  }

  getIdempotencyReceipt(key: string): PublicSession | null {
    const res = this.idempotencyReceipts.get(key);
    return res ? structuredClone(res) : null;
  }

  saveIdempotencyReceipt(key: string, session: PublicSession): void {
    this.idempotencyReceipts.set(key, structuredClone(session));
  }
}

export let repository: IRepository = new InMemoryRepository();

export function setRepository(repo: IRepository) {
  repository = repo;
}

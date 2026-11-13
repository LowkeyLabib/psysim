import {
  Session,
  Message,
  InterviewObjectiveProgress,
  SessionEvaluation,
  ScenarioTemplate,
  SessionStatus,
  ApplicationMode,
  DifficultyLevel,
} from '../types/index.js';
import { getSupabase } from './supabase.js';

export interface IRepository {
  createSession(data: {
    userId: string;
    scenarioId: string;
    mode: ApplicationMode;
    difficulty: DifficultyLevel;
    patient: Session['patient'];
  }): Promise<Session>;
  getSession(id: string): Promise<Session | null>;
  updateSessionStatus(id: string, status: SessionStatus): Promise<Session | null>;
  getUserSessions(userId: string): Promise<Session[]>;
  addMessage(sessionId: string, sender: 'patient' | 'student' | 'system', content: string): Promise<Message>;
  getMessages(sessionId: string): Promise<Message[]>;
  initObjectives(sessionId: string, scenario: ScenarioTemplate): Promise<InterviewObjectiveProgress[]>;
  updateObjective(sessionId: string, objectiveId: string, update: Partial<InterviewObjectiveProgress>): Promise<void>;
  getObjectives(sessionId: string): Promise<InterviewObjectiveProgress[]>;
  saveEvaluation(evaluation: SessionEvaluation): Promise<SessionEvaluation>;
  getEvaluation(sessionId: string): Promise<SessionEvaluation | null>;
  getScenario(id: string): Promise<ScenarioTemplate | null>;
  getScenarios(filter?: { categoryId?: string; difficulty?: DifficultyLevel; status?: string }): Promise<ScenarioTemplate[]>;
  saveScenario(scenario: ScenarioTemplate): Promise<ScenarioTemplate>;
  approveScenario(id: string, status: 'APPROVED' | 'REJECTED'): Promise<ScenarioTemplate | null>;
}

// In-Memory implementation with deterministic local persistence for offline/dev resilience
export class InMemoryRepository implements IRepository {
  private sessions: Map<string, Session> = new Map();
  private messages: Map<string, Message[]> = new Map();
  private objectives: Map<string, InterviewObjectiveProgress[]> = new Map();
  private evaluations: Map<string, SessionEvaluation> = new Map();
  private scenarios: Map<string, ScenarioTemplate> = new Map();

  constructor(initialScenarios: ScenarioTemplate[] = []) {
    for (const sc of initialScenarios) {
      this.scenarios.set(sc.id, sc);
    }
  }

  async createSession(data: {
    userId: string;
    scenarioId: string;
    mode: ApplicationMode;
    difficulty: DifficultyLevel;
    patient: Session['patient'];
  }): Promise<Session> {
    const id = `ses_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const session: Session = {
      id,
      userId: data.userId,
      scenarioId: data.scenarioId,
      mode: data.mode,
      difficulty: data.difficulty,
      status: 'CREATED',
      patient: data.patient,
      createdAt: now,
      updatedAt: now,
    };
    this.sessions.set(id, session);
    this.messages.set(id, []);
    return session;
  }

  async getSession(id: string): Promise<Session | null> {
    return this.sessions.get(id) || null;
  }

  async updateSessionStatus(id: string, status: SessionStatus): Promise<Session | null> {
    const session = this.sessions.get(id);
    if (!session) return null;
    session.status = status;
    session.updatedAt = new Date().toISOString();
    if (status === 'EVALUATED') {
      session.completedAt = session.updatedAt;
    }
    this.sessions.set(id, session);
    return session;
  }

  async getUserSessions(userId: string): Promise<Session[]> {
    return Array.from(this.sessions.values()).filter((s) => s.userId === userId);
  }

  async addMessage(
    sessionId: string,
    sender: 'patient' | 'student' | 'system',
    content: string
  ): Promise<Message> {
    const message: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      sessionId,
      sender,
      content,
      timestamp: new Date().toISOString(),
    };
    const list = this.messages.get(sessionId) || [];
    list.push(message);
    this.messages.set(sessionId, list);
    return message;
  }

  async getMessages(sessionId: string): Promise<Message[]> {
    return this.messages.get(sessionId) || [];
  }

  async initObjectives(
    sessionId: string,
    scenario: ScenarioTemplate
  ): Promise<InterviewObjectiveProgress[]> {
    const progressList: InterviewObjectiveProgress[] = scenario.mandatoryObjectives.map((obj) => ({
      id: obj.id,
      title: obj.title,
      description: obj.description,
      isMandatory: obj.isMandatory,
      status: 'NOT_STARTED',
    }));
    this.objectives.set(sessionId, progressList);
    return progressList;
  }

  async updateObjective(
    sessionId: string,
    objectiveId: string,
    update: Partial<InterviewObjectiveProgress>
  ): Promise<void> {
    const list = this.objectives.get(sessionId) || [];
    const idx = list.findIndex((o) => o.id === objectiveId);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...update };
      this.objectives.set(sessionId, list);
    }
  }

  async getObjectives(sessionId: string): Promise<InterviewObjectiveProgress[]> {
    return this.objectives.get(sessionId) || [];
  }

  async saveEvaluation(evaluation: SessionEvaluation): Promise<SessionEvaluation> {
    this.evaluations.set(evaluation.sessionId, evaluation);
    return evaluation;
  }

  async getEvaluation(sessionId: string): Promise<SessionEvaluation | null> {
    return this.evaluations.get(sessionId) || null;
  }

  async getScenario(id: string): Promise<ScenarioTemplate | null> {
    return this.scenarios.get(id) || null;
  }

  async getScenarios(filter?: {
    categoryId?: string;
    difficulty?: DifficultyLevel;
    status?: string;
  }): Promise<ScenarioTemplate[]> {
    let list = Array.from(this.scenarios.values());
    if (filter?.categoryId) {
      list = list.filter((s) => s.categoryId === filter.categoryId);
    }
    if (filter?.difficulty) {
      list = list.filter((s) => s.difficulty === filter.difficulty);
    }
    if (filter?.status) {
      list = list.filter((s) => s.reviewStatus === filter.status);
    }
    return list;
  }

  async saveScenario(scenario: ScenarioTemplate): Promise<ScenarioTemplate> {
    this.scenarios.set(scenario.id, scenario);
    return scenario;
  }

  async approveScenario(
    id: string,
    status: 'APPROVED' | 'REJECTED'
  ): Promise<ScenarioTemplate | null> {
    const scenario = this.scenarios.get(id);
    if (!scenario) return null;
    scenario.reviewStatus = status;
    this.scenarios.set(id, scenario);
    return scenario;
  }
}

// Singleton repository provider
export let repository: IRepository = new InMemoryRepository();

export function setRepository(repo: IRepository) {
  repository = repo;
}

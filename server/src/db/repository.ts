import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import {
  PublicSession,
  InternalClinicalProfile,
  SessionResult,
  ScenarioDraft,
  Mode,
  Difficulty,
  Language,
} from "../types";
import { AppError } from "../middleware/AppError";
type Receipt = { signature: string; session: PublicSession };
type State = {
  sessions: Record<string, PublicSession>;
  owners: Record<string, string>;
  profiles: Record<string, InternalClinicalProfile>;
  scenarios: Record<string, InternalClinicalProfile>;
  evaluations: Record<string, SessionResult>;
  drafts: Record<string, ScenarioDraft>;
  receipts: Record<string, Receipt>;
  reviews: {
    scenarioId: string;
    version: number;
    reviewerId: string;
    decision: string;
    note: string;
    at: string;
  }[];
};
export interface CreateData {
  userId: string;
  scenario: InternalClinicalProfile;
  mode: Mode;
  difficulty: Difficulty;
  language: Language;
  isLive: boolean;
  receipt?: { key: string; signature: string };
}
export interface IRepository {
  createSession(data: CreateData): Promise<PublicSession>;
  getSession(id: string): Promise<PublicSession | null>;
  owns(id: string, userId: string): boolean;
  updateSession(
    id: string,
    mutate: (s: PublicSession) => void,
  ): Promise<PublicSession | null>;
  commitSession(
    s: PublicSession,
    expectedVersion: number,
    evaluation?: SessionResult,
    receipt?: { key: string; signature: string },
  ): PublicSession;
  getUserSessions(userId: string): Promise<PublicSession[]>;
  getScenario(id: string): Promise<InternalClinicalProfile | null>;
  getScenarios(filter?: {
    categoryId?: string;
    difficulty?: string;
    status?: string;
  }): Promise<InternalClinicalProfile[]>;
  saveEvaluation(evaluation: SessionResult): Promise<SessionResult>;
  getEvaluation(id: string): Promise<SessionResult | null>;
  getScenarioDrafts(): Promise<ScenarioDraft[]>;
  saveScenarioDraft(
    draft: ScenarioDraft,
    expectedVersion?: number,
  ): Promise<ScenarioDraft>;
  approveScenarioDraft(
    id: string,
    version: number,
    decision: "APPROVED" | "REJECTED",
    note: string,
    reviewerId?: string,
  ): Promise<ScenarioDraft | null>;
  getIdempotencyReceipt(key: string, signature?: string): PublicSession | null;
  saveIdempotencyReceipt(
    key: string,
    s: PublicSession,
    signature?: string,
  ): void;
  exclusive<T>(key: string, action: () => Promise<T>): Promise<T>;
}
export class InMemoryRepository implements IRepository {
  protected state: State = {
    sessions: {},
    owners: {},
    profiles: {},
    scenarios: {},
    evaluations: {},
    drafts: {},
    receipts: {},
    reviews: [],
  };
  private locks = new Map<string, Promise<unknown>>();
  constructor(seeds: InternalClinicalProfile[] = []) {
    for (const profile of seeds) {
      const sc = structuredClone(profile);
      this.state.scenarios[sc.id] = sc;
      this.state.drafts[sc.id] = {
        id: sc.id,
        version: 1,
        title: `${sc.categoryName} — ${sc.difficulty}`,
        categoryId: sc.categoryId,
        difficulty: sc.difficulty,
        status: sc.reviewStatus,
        clinicalProfile: structuredClone(sc) as unknown as Record<
          string,
          unknown
        >,
        objectives: sc.mandatoryObjectives.map((o) => ({
          id: o.id,
          title: o.title,
          required: o.required,
          criteria: o.criteria,
        })),
        rubric: sc.rubric || [],
        sourceReferences: sc.sourceReferences || [],
      };
    }
  }
  protected persist() {}
  protected change<T>(action: () => T): T {
    const backup = structuredClone(this.state);
    try {
      const result = action();
      this.persist();
      return structuredClone(result);
    } catch (e) {
      this.state = backup;
      throw e;
    }
  }
  async exclusive<T>(key: string, action: () => Promise<T>): Promise<T> {
    const prior = this.locks.get(key) || Promise.resolve();
    const current = prior.catch(() => {}).then(action);
    this.locks.set(key, current);
    try {
      return await current;
    } finally {
      if (this.locks.get(key) === current) this.locks.delete(key);
    }
  }
  async createSession(data: CreateData) {
    return this.change(() => {
      const id = randomUUID(),
        now = new Date().toISOString(),
        profile = structuredClone(data.scenario);
      const names =
        profile.patient.gender === "female"
          ? ["Samira Ahmed", "Nadia Rahman", "Farhana Islam"]
          : ["Rahim Ahmed", "Tanvir Hasan", "Arif Rahman"];
      profile.patient.name = names[Math.floor(Math.random() * names.length)];
      const session: PublicSession = {
        id,
        version: 1,
        state: "IN_PROGRESS",
        mode: data.mode,
        difficulty: data.difficulty,
        language: data.language,
        createdAt: now,
        updatedAt: now,
        patient: {
          name: profile.patient.name,
          age: profile.patient.age,
          occupation: profile.patient.occupation,
          presentingComplaint: profile.presentingComplaint,
        },
        messages: [
          {
            id: randomUUID(),
            role: "patient",
            content: profile.openingMessage[data.language],
            createdAt: now,
          },
        ],
        progress: {
          eligible: false,
          objectives: profile.mandatoryObjectives.map((o) => ({
            id: o.id,
            title: o.title,
            required: o.required,
            completed: false,
            evidenceMessageIds: [],
            confidence: null,
            guidance: o.guidance,
          })),
        },
        simulation: data.isLive ? "live" : "mock",
        caseReviewStatus: profile.reviewStatus,
      };
      this.state.sessions[id] = session;
      this.state.owners[id] = data.userId;
      this.state.profiles[id] = profile;
      if (data.receipt)
        this.state.receipts[data.receipt.key] = {
          signature: data.receipt.signature,
          session: structuredClone(session),
        };
      return session;
    });
  }
  owns(id: string, userId: string) {
    return this.state.owners[id] === userId;
  }
  async getSession(id: string) {
    return structuredClone(this.state.sessions[id] || null);
  }
  async updateSession(id: string, mutate: (s: PublicSession) => void) {
    const s = await this.getSession(id);
    if (!s) return null;
    const version = s.version;
    mutate(s);
    return this.commitSession(s, version);
  }
  commitSession(
    s: PublicSession,
    expectedVersion: number,
    evaluation?: SessionResult,
    receipt?: { key: string; signature: string },
  ) {
    return this.change(() => {
      if (this.state.sessions[s.id]?.version !== expectedVersion)
        throw new AppError(
          409,
          "VERSION_CONFLICT",
          "Session changed. Refresh before continuing.",
        );
      s = structuredClone(s);
      s.version++;
      s.updatedAt = new Date().toISOString();
      this.state.sessions[s.id] = s;
      if (evaluation)
        this.state.evaluations[s.id] = structuredClone(evaluation);
      if (receipt)
        this.state.receipts[receipt.key] = {
          signature: receipt.signature,
          session: structuredClone(s),
        };
      return s;
    });
  }
  async getUserSessions(userId: string) {
    return structuredClone(
      Object.values(this.state.sessions).filter((s) => this.owns(s.id, userId)),
    );
  }
  async getScenario(id: string) {
    return structuredClone(
      this.state.profiles[id] || this.state.scenarios[id] || null,
    );
  }
  async getScenarios(filter?: {
    categoryId?: string;
    difficulty?: string;
    status?: string;
  }) {
    return structuredClone(
      Object.values(this.state.scenarios).filter(
        (s) =>
          (!filter?.categoryId || s.categoryId === filter.categoryId) &&
          (!filter?.difficulty || s.difficulty === filter.difficulty) &&
          (!filter?.status || s.reviewStatus === filter.status),
      ),
    );
  }
  async saveEvaluation(e: SessionResult) {
    return this.change(() => {
      this.state.evaluations[e.sessionId] = structuredClone(e);
      return e;
    });
  }
  async getEvaluation(id: string) {
    return structuredClone(this.state.evaluations[id] || null);
  }
  async getScenarioDrafts() {
    return structuredClone(Object.values(this.state.drafts));
  }
  async saveScenarioDraft(draft: ScenarioDraft, expectedVersion?: number) {
    return this.change(() => {
      const previous = this.state.drafts[draft.id];
      if (previous && previous.version !== expectedVersion)
        throw new AppError(
          409,
          "VERSION_CONFLICT",
          "Case revision changed. Reload before saving.",
        );
      const saved = {
        ...structuredClone(draft),
        version: previous ? previous.version + 1 : 1,
      };
      this.state.drafts[draft.id] = saved;
      // Invalidate the runnable template immediately. Existing sessions keep their immutable snapshot.
      if (this.state.scenarios[draft.id])
        this.state.scenarios[draft.id].reviewStatus = "DRAFT";
      return saved;
    });
  }
  async approveScenarioDraft(
    id: string,
    version: number,
    decision: "APPROVED" | "REJECTED",
    note: string,
    reviewerId = "unknown",
  ) {
    return this.change(() => {
      const draft = this.state.drafts[id];
      if (!draft) return null;
      if (draft.version !== version)
        throw new AppError(
          409,
          "VERSION_CONFLICT",
          "Case revision changed. Reload before review.",
        );
      if (draft.status !== "PENDING_REVIEW")
        throw new AppError(
          409,
          "INVALID_STATE",
          "Only pending revisions may be reviewed.",
        );
      const profile =
        draft.clinicalProfile as unknown as InternalClinicalProfile;
      if (decision === "APPROVED" && profile.demonstration)
        throw new AppError(
          422,
          "UNREVIEWED_DEMONSTRATION",
          "Author and clinically validate a new case; demonstration seeds cannot be approved unchanged.",
        );
      draft.status = decision;
      draft.reviewNote = note;
      draft.version++;
      if (decision === "APPROVED")
        this.state.scenarios[id] = {
          ...structuredClone(profile),
          id,
          categoryId: draft.categoryId,
          difficulty: draft.difficulty,
          mandatoryObjectives: draft.objectives.map((o) => ({
            ...o,
            guidance: "Explore this interview area.",
          })),
          rubric: draft.rubric,
          sourceReferences: draft.sourceReferences,
          reviewStatus: "APPROVED",
        };
      else if (this.state.scenarios[id])
        this.state.scenarios[id].reviewStatus = "REJECTED";
      this.state.reviews.push({
        scenarioId: id,
        version: draft.version,
        reviewerId,
        decision,
        note,
        at: new Date().toISOString(),
      });
      return draft;
    });
  }
  getIdempotencyReceipt(key: string, signature?: string) {
    const receipt = this.state.receipts[key];
    if (!receipt) return null;
    if (signature !== undefined && receipt.signature !== signature)
      throw new AppError(
        409,
        "IDEMPOTENCY_CONFLICT",
        "This request key was already used with different content.",
      );
    return structuredClone(receipt.session);
  }
  saveIdempotencyReceipt(key: string, session: PublicSession, signature = "") {
    this.change(() => {
      this.state.receipts[key] = {
        signature,
        session: structuredClone(session),
      };
      return true;
    });
  }
}
// Durable single-process development repository; production storage remains a deployment choice.
export class SqliteRepository extends InMemoryRepository {
  private db: DatabaseSync;
  constructor(file: string, seeds: InternalClinicalProfile[] = []) {
    super(seeds);
    if (file !== ":memory:") mkdirSync(dirname(file), { recursive: true });
    this.db = new DatabaseSync(file);
    this.db.exec(
      "PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS psysim_state (id INTEGER PRIMARY KEY CHECK(id=1), state TEXT NOT NULL)",
    );
    const row = this.db
      .prepare("SELECT state FROM psysim_state WHERE id=1")
      .get() as { state: string } | undefined;
    if (row) this.state = JSON.parse(row.state);
    else this.persist();
  }
  protected persist() {
    if (this.db)
      this.db
        .prepare(
          "INSERT INTO psysim_state(id,state) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET state=excluded.state",
        )
        .run(JSON.stringify(this.state));
  }
  close() {
    this.db.close();
  }
}
export let repository: IRepository = new InMemoryRepository();
export function setRepository(repo: IRepository) {
  repository = repo;
}

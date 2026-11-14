import { beforeEach, describe, it, expect, vi } from "vitest";
import request from "supertest";
import { app } from "../src/server";
import {
  InMemoryRepository,
  repository,
  setRepository,
} from "../src/db/repository";
import { SEED_SCENARIOS } from "../src/knowledge/seedScenarios";
import { simulationEngine } from "../src/routes/sessionRoutes";
import { config } from "../src/config";
import { AppError } from "../src/middleware/AppError";
const auth = vi.hoisted(() => ({ getUser: vi.fn() }));
vi.mock("../src/db/supabase", () => ({
  getSupabase: () => ({ auth: { getUser: auth.getUser } }),
}));
let cookie: string;
const chat = vi.fn(),
  assessment = vi.fn();
beforeEach(async () => {
  setRepository(new InMemoryRepository(SEED_SCENARIOS));
  simulationEngine.provider = {
    name: "test",
    generateChat: chat,
    generateStructured: assessment,
  };
  chat
    .mockReset()
    .mockResolvedValue(
      "ডাক্তার, দুই মাস ধরে ঘুম ঠিক হচ্ছে না, পড়াশোনায় মন বসে না।",
    );
  assessment.mockReset().mockImplementation(async (prompt: string) => {
    const { objectives, transcript } = JSON.parse(prompt);
    return {
      objectives: objectives.map((o: { id: string }) => ({
        id: o.id,
        completed: true,
        confidence: 0.96,
        evidence: transcript
          .slice(-2)
          .map((m: { id: string; content: string }) => ({
            messageId: m.id,
            quote: m.content,
          })),
      })),
    };
  });
  auth.getUser.mockReset();
  config.allowUnreviewed = true;
  const login = await request(app).post("/api/auth/development");
  expect(login.status).toBe(200);
  cookie = login.headers["set-cookie"][0].split(";")[0];
});
const create = (
  key = "create",
  categoryId = "depressive",
  difficulty = "beginner",
) =>
  request(app)
    .post("/api/sessions")
    .set("Cookie", cookie)
    .set("Idempotency-Key", key)
    .send({ mode: "custom", categoryId, difficulty, language: "bn" });
const send = (
  id: string,
  key = "send",
  content = "আপনার কী সমস্যা হচ্ছে, একটু বলবেন?",
  version = 1,
) =>
  request(app)
    .post(`/api/sessions/${id}/messages`)
    .set("Cookie", cookie)
    .set("Idempotency-Key", key)
    .send({ content, expectedVersion: version });
const diagnose = (id: string, version = 1) =>
  request(app)
    .post(`/api/sessions/${id}/diagnosis`)
    .set("Cookie", cookie)
    .set("Idempotency-Key", "diagnosis")
    .send({ diagnosis: "MDD", expectedVersion: version });
describe("authenticated clinical workflow", () => {
  it("rejects anonymous requests and role spoofing; verifies Supabase metadata roles", async () => {
    expect(
      (
        await request(app)
          .get("/api/me")
          .set("x-user-id", "admin")
          .set("x-user-role", "administrator")
      ).status,
    ).toBe(401);
    expect(
      (
        await request(app)
          .get("/api/supervisor/scenarios")
          .set("Cookie", cookie)
          .set("x-user-role", "administrator")
      ).status,
    ).toBe(403);
    auth.getUser.mockResolvedValue({
      data: {
        user: {
          id: "user-a",
          email: "a@test.invalid",
          app_metadata: {},
          user_metadata: { role: "administrator" },
        },
      },
      error: null,
    });
    expect(
      (
        await request(app)
          .get("/api/supervisor/scenarios")
          .set("Authorization", "Bearer valid")
      ).status,
    ).toBe(403);
    expect(auth.getUser).toHaveBeenCalledWith("valid");
    auth.getUser.mockResolvedValue({
      data: {
        user: { id: "supervisor", app_metadata: { role: "supervisor" } },
      },
      error: null,
    });
    expect(
      (
        await request(app)
          .get("/api/supervisor/scenarios")
          .set("Authorization", "Bearer supervisor")
      ).status,
    ).toBe(200);
  });
  it("preserves selected category and level and never exposes hidden fields", async () => {
    for (const difficulty of ["beginner", "intermediate", "advanced"]) {
      const r = await create(`create-${difficulty}`, "ocd", difficulty);
      expect(r.status).toBe(201);
      expect(r.body.difficulty).toBe(difficulty);
      expect(r.body.caseReviewStatus).toBe("DRAFT");
      const hidden = await repository.getScenario(r.body.id);
      expect(hidden?.categoryId).toBe("ocd");
      for (const field of [
        "approvedDiagnosis",
        "acceptedDiagnoses",
        "criteria",
        "symptoms",
      ])
        expect(JSON.stringify(r.body)).not.toContain(field);
    }
    expect((await create("missing", "nonexistent")).status).toBe(404);
    config.allowUnreviewed = false;
    expect((await create("production-policy")).status).toBe(404);
  });
  it("isolates session reads, mutations, results and request receipts by owner", async () => {
    const r = await create();
    cookie = "";
    auth.getUser.mockResolvedValue({
      data: { user: { id: "another", app_metadata: {} } },
      error: null,
    });
    for (const suffix of ["", "/messages", "/progress", "/results"])
      expect(
        (
          await request(app)
            .get(`/api/sessions/${r.body.id}${suffix}`)
            .set("Authorization", "Bearer another")
        ).status,
      ).toBe(404);
    expect(
      (
        await request(app)
          .post(`/api/sessions/${r.body.id}/messages`)
          .set("Authorization", "Bearer another")
          .set("Idempotency-Key", "send")
          .send({ content: "Hello doctor", expectedVersion: 1 })
      ).status,
    ).toBe(404);
  });
  it("uses durable receipts and rejects different payloads or stale concurrent writes", async () => {
    const [first, duplicate] = await Promise.all([create(), create()]);
    expect(first.body.id).toBe(duplicate.body.id);
    expect((await create("create", "ocd")).status).toBe(409);
    const [a, b] = await Promise.all([
      send(first.body.id),
      send(first.body.id),
    ]);
    expect(a.status).toBe(200);
    expect(a.body).toEqual(b.body);
    expect(chat).toHaveBeenCalledTimes(1);
    expect(
      (await send(first.body.id, "send", "Different content")).status,
    ).toBe(409);
    expect((await send(first.body.id, "stale")).status).toBe(409);
    expect((await repository.getSession(first.body.id))?.messages).toHaveLength(
      3,
    );
  });
  it("keeps the saved session unchanged when generation or assessment fails", async () => {
    const r = await create();
    chat.mockRejectedValueOnce(
      new AppError(429, "AI_RATE_LIMITED", "Retry later."),
    );
    expect((await send(r.body.id)).status).toBe(429);
    assessment.mockRejectedValueOnce(
      new AppError(502, "AI_INVALID_JSON", "Retry assessment."),
    );
    expect((await send(r.body.id)).status).toBe(502);
    const saved = await repository.getSession(r.body.id);
    expect(saved?.version).toBe(1);
    expect(saved?.messages).toHaveLength(1);
    expect(saved?.progress.eligible).toBe(false);
    expect((await send(r.body.id)).status).toBe(200);
  });
  it("requires evidence before diagnosis, persists results and prevents a second submission", async () => {
    const r = await create();
    expect((await diagnose(r.body.id)).status).toBe(422);
    expect(
      (
        await request(app)
          .get(`/api/sessions/${r.body.id}/results`)
          .set("Cookie", cookie)
      ).status,
    ).toBe(409);
    const m = await send(r.body.id);
    expect(m.body.progress.eligible).toBe(true);
    const result = await diagnose(r.body.id, 2);
    expect(result.status).toBe(200);
    expect(result.body.state).toBe("EVALUATED");
    expect((await diagnose(r.body.id, 2)).body).toEqual(result.body);
    expect((await send(r.body.id, "after", "Continue please", 3)).status).toBe(
      409,
    );
    const evaluation = await request(app)
      .get(`/api/sessions/${r.body.id}/results`)
      .set("Cookie", cookie);
    expect(evaluation.body.outcome).toBe("CORRECT");
    const history = await request(app)
      .get("/api/me/sessions")
      .set("Cookie", cookie);
    expect(history.body.stats).toMatchObject({
      total: 1,
      completed: 1,
      correct: 1,
    });
  });
  it("rejects malformed bodies, origin abuse and forged progress", async () => {
    expect(
      (
        await request(app)
          .post("/api/auth/development")
          .set("Origin", "https://untrusted.invalid")
      ).status,
    ).toBe(403);
    const r = await create();
    expect((await send(r.body.id, "blank", "  ")).status).toBe(422);
    await repository.updateSession(r.body.id, (s) => {
      s.state = "INTERVIEW_COMPLETE";
      s.progress.eligible = true;
      s.progress.objectives.forEach((o) => {
        o.completed = true;
        o.confidence = 1;
        o.evidenceMessageIds = ["missing"];
      });
    });
    expect((await diagnose(r.body.id, 2)).status).toBe(422);
  });
});
it("validates pending cases, records a privileged review, and rejects stale revisions", async () => {
  auth.getUser.mockResolvedValue({
    data: { user: { id: "reviewer", app_metadata: { role: "supervisor" } } },
    error: null,
  });
  const input = {
    title: "Test-only reviewed fixture",
    categoryId: "depressive",
    difficulty: "beginner",
    status: "PENDING_REVIEW",
    clinicalProfile: { ...SEED_SCENARIOS[0], demonstration: false },
    objectives: SEED_SCENARIOS[0].mandatoryObjectives.map(
      ({ id, title, required, criteria }) => ({
        id,
        title,
        required,
        criteria,
      }),
    ),
    rubric: [
      {
        name: "Coverage",
        weight: 100,
        criteria: "Complete the test interview criteria.",
      },
    ],
    sourceReferences: ["test-fixture-source"],
  };
  const invalid = await request(app)
    .post("/api/supervisor/scenarios")
    .set("Authorization", "Bearer reviewer")
    .send({ ...input, sourceReferences: [] });
  expect(invalid.status).toBe(422);
  const saved = await request(app)
    .post("/api/supervisor/scenarios")
    .set("Authorization", "Bearer reviewer")
    .send(input);
  expect(saved.status).toBe(201);
  const approved = await request(app)
    .post(`/api/supervisor/scenarios/${saved.body.id}/approve`)
    .set("Authorization", "Bearer reviewer")
    .send({
      expectedVersion: 1,
      decision: "APPROVED",
      reviewNote: "Test-only review for schema and access verification.",
    });
  expect(approved.status).toBe(200);
  expect(approved.body.status).toBe("APPROVED");
  expect(
    (
      await request(app)
        .patch(`/api/supervisor/scenarios/${saved.body.id}`)
        .set("Authorization", "Bearer reviewer")
        .send({ ...input, status: "DRAFT", expectedVersion: 1 })
    ).status,
  ).toBe(409);
  const edited = await request(app)
    .patch(`/api/supervisor/scenarios/${saved.body.id}`)
    .set("Authorization", "Bearer reviewer")
    .send({ ...input, status: "DRAFT", expectedVersion: 2 });
  expect(edited.status).toBe(200);
  expect((await repository.getScenario(saved.body.id))?.reviewStatus).toBe(
    "DRAFT",
  );
});

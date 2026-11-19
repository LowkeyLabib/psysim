import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { app } from "../src/server";
import { InMemoryRepository, setRepository } from "../src/db/repository";
import { SEED_SCENARIOS } from "../src/knowledge/seedScenarios";
import {
  buildEducationalDrafts,
  prepareCatalogDrafts,
} from "../src/knowledge/educationalDrafts";
import { config } from "../src/config";
import { AppError } from "../src/middleware/AppError";

const auth = vi.hoisted(() => ({ getUser: vi.fn() }));
vi.mock("../src/auth/neon", () => ({
  verifyNeonIdentity: async (token: string) => {
    const user = await auth.getUser(token);
    if (!user)
      throw new AppError(401, "UNAUTHENTICATED", "Please sign in again.");
    return user;
  },
}));

describe("clinical case availability, approvals, and simulation modes", () => {
  beforeEach(() => {
    auth.getUser.mockReset();
    config.allowUnreviewed = false;
  });

  it("prepares educational drafts as PENDING_REVIEW without marking them approved and never duplicates existing approved cases", () => {
    const drafts = buildEducationalDrafts();
    expect(drafts).toHaveLength(21);
    for (const d of drafts) {
      expect(d.status).toBe("PENDING_REVIEW");
      expect(d.clinicalProfile.reviewStatus).toBe("PENDING_REVIEW");
      expect(d.clinicalProfile.demonstration).toBe(false);
    }

    // Empty production catalog + stale dev demonstration seed -> strips dev seed, prepares 21 pending drafts.
    const initial = prepareCatalogDrafts({
      scenarios: { [SEED_SCENARIOS[0].id]: SEED_SCENARIOS[0] },
      drafts: {},
      reviews: [],
    });
    expect(initial.action).toBe("prepared_pending_review");
    expect(initial.preparedCount).toBe(21);
    expect(Object.keys(initial.catalog.scenarios)).toHaveLength(0);
    expect(Object.values(initial.catalog.drafts).every((d) => d.status === "PENDING_REVIEW")).toBe(true);

    // Running again is strictly idempotent.
    const second = prepareCatalogDrafts(initial.catalog);
    expect(second.preparedCount).toBe(0);
    expect(second.changed).toBe(false);

    // Existing clinically approved cases are preserved without duplication.
    const approvedCase = {
      ...SEED_SCENARIOS[0],
      id: "reviewed_mdd_1",
      demonstration: false,
      reviewStatus: "APPROVED" as const,
    };
    const preserved = prepareCatalogDrafts({
      scenarios: { [approvedCase.id]: approvedCase },
      drafts: {},
      reviews: [],
    });
    expect(preserved.action).toBe("preserved_existing");
    expect(preserved.approvedCount).toBe(1);
    expect(preserved.preparedCount).toBe(0);
    expect(Object.keys(preserved.catalog.scenarios)).toEqual(["reviewed_mdd_1"]);
    expect(Object.keys(preserved.catalog.drafts)).toEqual(["reviewed_mdd_1"]);
  });

  it("returns 0 approved scenarios before review, requires privileged approval, and enables both modes cleanly once approved", async () => {
    const drafts = buildEducationalDrafts();
    const repo = new InMemoryRepository([]);
    const state = repo.snapshot();
    for (const d of drafts) state.drafts[d.id] = d;
    repo.restore(state);
    setRepository(repo);

    // Student token
    auth.getUser.mockImplementation(async (token: string) => {
      if (token === "student")
        return {
          id: "stu-1",
          email: "student@test.invalid",
          displayName: "Student",
          role: "student",
        };
      if (token === "admin")
        return {
          id: "admin-1",
          email: "admin@test.invalid",
          displayName: "Administrator",
          role: "administrator",
        };
      return null;
    });

    // 1. Initially /api/scenarios returns 0 approved scenarios; student cannot start in either mode.
    const emptyAvail = await request(app)
      .get("/api/scenarios")
      .set("Authorization", "Bearer student");
    expect(emptyAvail.status).toBe(200);
    expect(emptyAvail.body).toEqual([]);

    expect(
      (
        await request(app)
          .post("/api/sessions")
          .set("Authorization", "Bearer student")
          .set("Idempotency-Key", "k-ch-before")
          .send({ mode: "challenge", difficulty: "intermediate", language: "en" })
      ).status,
    ).toBe(404);

    expect(
      (
        await request(app)
          .post("/api/sessions")
          .set("Authorization", "Bearer student")
          .set("Idempotency-Key", "k-cu-before")
          .send({
            mode: "custom",
            categoryId: "ocd",
            difficulty: "intermediate",
            language: "en",
          })
      ).status,
    ).toBe(404);

    // 2. Student cannot access supervisor review routes or approve cases.
    expect(
      (
        await request(app)
          .post("/api/supervisor/scenarios/edu_ocd_intermediate/approve")
          .set("Authorization", "Bearer student")
          .send({
            expectedVersion: 1,
            decision: "APPROVED",
            reviewNote: "Unauthorized attempt",
          })
      ).status,
    ).toBe(403);

    // 3. Administrator approves edu_ocd_intermediate.
    const approval = await request(app)
      .post("/api/supervisor/scenarios/edu_ocd_intermediate/approve")
      .set("Authorization", "Bearer admin")
      .send({
        expectedVersion: 1,
        decision: "APPROVED",
        reviewNote: "Clinically reviewed and verified for intermediate training.",
      });
    expect(approval.status).toBe(200);
    expect(approval.body.status).toBe("APPROVED");

    // 4. /api/scenarios now exposes public availability only (no hidden diagnosis/patient fields).
    const avail = await request(app)
      .get("/api/scenarios")
      .set("Authorization", "Bearer student");
    expect(avail.status).toBe(200);
    expect(avail.body).toEqual([
      { available: true, categoryId: "ocd", difficulty: "intermediate" },
    ]);
    const serialized = JSON.stringify(avail.body);
    for (const secretField of [
      "approvedDiagnosis",
      "acceptedDiagnoses",
      "patient",
      "symptoms",
      "criteria",
      "reviewNote",
    ]) {
      expect(serialized).not.toContain(secretField);
    }

    // 5. Clinical Challenge respects difficulty; Custom Case respects category + difficulty.
    const chWrongDiff = await request(app)
      .post("/api/sessions")
      .set("Authorization", "Bearer student")
      .set("Idempotency-Key", "k-ch-beg")
      .send({ mode: "challenge", difficulty: "beginner", language: "en" });
    expect(chWrongDiff.status).toBe(404);

    const chOk = await request(app)
      .post("/api/sessions")
      .set("Authorization", "Bearer student")
      .set("Idempotency-Key", "k-ch-int")
      .send({ mode: "challenge", difficulty: "intermediate", language: "en" });
    expect(chOk.status).toBe(201);
    expect(chOk.body.difficulty).toBe("intermediate");
    expect(chOk.body.caseReviewStatus).toBe("APPROVED");
    expect(JSON.stringify(chOk.body)).not.toContain("approvedDiagnosis");
    expect(JSON.stringify(chOk.body)).not.toContain("acceptedDiagnoses");

    const cuWrongCat = await request(app)
      .post("/api/sessions")
      .set("Authorization", "Bearer student")
      .set("Idempotency-Key", "k-cu-dep")
      .send({
        mode: "custom",
        categoryId: "depressive",
        difficulty: "intermediate",
        language: "en",
      });
    expect(cuWrongCat.status).toBe(404);

    const cuOk = await request(app)
      .post("/api/sessions")
      .set("Authorization", "Bearer student")
      .set("Idempotency-Key", "k-cu-ocd")
      .send({
        mode: "custom",
        categoryId: "ocd",
        difficulty: "intermediate",
        language: "en",
      });
    expect(cuOk.status).toBe(201);
    expect(cuOk.body.mode).toBe("custom");
    expect(cuOk.body.difficulty).toBe("intermediate");
    expect(cuOk.body.caseReviewStatus).toBe("APPROVED");
    expect(JSON.stringify(cuOk.body)).not.toContain("approvedDiagnosis");
  });

  it("allows an administrator to author a new case and approve it without duplicating form metadata in JSON", async () => {
    const repo = new InMemoryRepository([]);
    setRepository(repo);
    auth.getUser.mockResolvedValue({
      id: "admin-1",
      email: "admin@test.invalid",
      displayName: "Admin",
      role: "administrator",
    });

    const {
      id: _omitId,
      categoryId: _omitCat,
      categoryName: _omitCatName,
      difficulty: _omitDiff,
      reviewStatus: _omitRev,
      mandatoryObjectives: _omitObj,
      ...clinicalBody
    } = SEED_SCENARIOS[0];

    const created = await request(app)
      .post("/api/supervisor/scenarios")
      .set("Authorization", "Bearer admin")
      .send({
        title: "Custom Authored Anxiety Case",
        categoryId: "anxiety",
        difficulty: "beginner",
        status: "PENDING_REVIEW",
        clinicalProfile: { ...clinicalBody, demonstration: false },
        objectives: SEED_SCENARIOS[0].mandatoryObjectives.map(
          ({ id, title, required, criteria }) => ({
            id,
            title,
            required,
            criteria,
          }),
        ),
        rubric: [
          { name: "Coverage", weight: 100, criteria: "Full interview coverage" },
        ],
        sourceReferences: ["WHO ICD-11 verified by supervisor"],
      });

    expect(created.status).toBe(201);
    expect(created.body.status).toBe("PENDING_REVIEW");

    const approved = await request(app)
      .post(`/api/supervisor/scenarios/${created.body.id}/approve`)
      .set("Authorization", "Bearer admin")
      .send({
        expectedVersion: 1,
        decision: "APPROVED",
        reviewNote: "Reviewed and clinically validated by team lead.",
      });
    expect(approved.status).toBe(200);
    expect(approved.body.status).toBe("APPROVED");

    const stored = await repo.getScenario(created.body.id);
    expect(stored?.categoryId).toBe("anxiety");
    expect(stored?.categoryName).toBe("Anxiety disorders");
    expect(stored?.reviewStatus).toBe("APPROVED");
  });
});

import { it, expect } from "vitest";
import { mkdtempSync, rmSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, sep, basename } from "node:path";
import { InMemoryRepository, SqliteRepository } from "../src/db/repository";
import { SEED_SCENARIOS } from "../src/knowledge/seedScenarios";
const scenario = SEED_SCENARIOS[0];
const data = {
  userId: "learner",
  scenario,
  mode: "challenge" as const,
  difficulty: "beginner" as const,
  language: "bn" as const,
  isLive: true,
};
it("persists transcript, progress, immutable profile and retry receipts after restart", async () => {
  const dir = mkdtempSync(join(tmpdir(), "psysim-test-")),
    file = join(dir, "state.sqlite");
  let repo = new SqliteRepository(file, [scenario]);
  try {
    const s = await repo.createSession(data);
    s.messages.push({
      id: "student",
      role: "student",
      content: "আপনার কী সমস্যা?",
      createdAt: s.createdAt,
    });
    s.progress.objectives[0].completed = true;
    const updated = repo.commitSession(s, 1, undefined, {
      key: "receipt",
      signature: "payload",
    });
    const profile = await repo.getScenario(s.id);
    repo.close();
    repo = new SqliteRepository(file, []);
    expect(await repo.getSession(s.id)).toEqual(updated);
    expect(await repo.getScenario(s.id)).toEqual(profile);
    expect(repo.getIdempotencyReceipt("receipt", "payload")).toEqual(updated);
    expect(repo.owns(s.id, "learner")).toBe(true);
    expect(repo.owns(s.id, "another")).toBe(false);
    expect(() => repo.getIdempotencyReceipt("receipt", "changed")).toThrow(
      "different content",
    );
    expect(() => repo.commitSession(s, 1)).toThrow("changed");
  } finally {
    repo.close();
    if (
      !realpathSync(dir).startsWith(realpathSync(tmpdir()) + sep) ||
      !basename(dir).startsWith("psysim-test-")
    )
      throw new Error("Unsafe test cleanup path");
    rmSync(dir, { recursive: true, force: true });
  }
});
it("editing a template cannot change an existing session profile or preserve approval", async () => {
  const repo = new InMemoryRepository([
    { ...scenario, reviewStatus: "APPROVED" },
  ]);
  const s = await repo.createSession({
    ...data,
    scenario: { ...scenario, reviewStatus: "APPROVED" },
  });
  const original = await repo.getScenario(s.id);
  const [draft] = await repo.getScenarioDrafts();
  await repo.saveScenarioDraft(
    { ...draft, status: "DRAFT", clinicalProfile: {} },
    draft.version,
  );
  expect((await repo.getScenario(scenario.id))?.reviewStatus).toBe("DRAFT");
  expect(await repo.getScenario(s.id)).toEqual(original);
});

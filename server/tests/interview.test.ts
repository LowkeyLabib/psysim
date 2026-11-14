import { expect, it, vi } from "vitest";
import { InterviewEvaluator } from "../src/interview/evaluator";
import { SEED_SCENARIOS } from "../src/knowledge/seedScenarios";
import type { Message, Objective } from "../src/types";
const scenario = SEED_SCENARIOS[0];
const objectives = (): Objective[] =>
  scenario.mandatoryObjectives.map((o) => ({
    ...o,
    completed: false,
    evidenceMessageIds: [],
    confidence: null,
  }));
const transcript: Message[] = [
  {
    id: "q",
    role: "student",
    content: "আপনার কী সমস্যা হচ্ছে, একটু বলবেন?",
    createdAt: "1",
  },
  {
    id: "a",
    role: "patient",
    content: "দুই মাস ধরে মন খুব খারাপ থাকে, আগের মতো ভালো লাগে না।",
    createdAt: "2",
  },
];
const judgment = (evidence: unknown[], confidence = 0.96) => ({
  objectives: [{ id: "o0", completed: true, confidence, evidence }],
});
const provider = (value: unknown) => ({
  name: "test",
  generateChat: vi.fn(),
  generateStructured: vi.fn().mockResolvedValue(value),
});
it("does not complete objectives from keywords or unanswered inquiry", () => {
  expect(
    InterviewEvaluator.evaluateProgress(
      transcript.slice(0, 1),
      scenario,
      objectives(),
    ).eligible,
  ).toBe(false);
  expect(
    InterviewEvaluator.evaluateProgress(
      transcript,
      scenario,
      objectives(),
    ).objectives.some((o) => o.completed),
  ).toBe(false);
});
it("accepts exact evidence from both roles, preserves completed work and leaves other criteria locked", async () => {
  const r = await InterviewEvaluator.assess(
    transcript,
    scenario,
    objectives(),
    provider(
      judgment(transcript.map((m) => ({ messageId: m.id, quote: m.content }))),
    ),
  );
  expect(r.objectives[0].completed).toBe(true);
  expect(r.objectives[0].evidenceMessageIds).toEqual(["q", "a"]);
  expect(r.eligible).toBe(false);
  const again = await InterviewEvaluator.assess(
    transcript,
    scenario,
    r.objectives,
    provider({ objectives: [] }),
  );
  expect(again.objectives[0]).toEqual(r.objectives[0]);
});
it.each(["fabricated", "one-role", "low-confidence"])(
  "rejects %s evidence",
  async (kind) => {
    const evidence = transcript.map((m) => ({
      messageId: m.id,
      quote: m.content,
    }));
    if (kind === "fabricated")
      evidence[1].quote = "This quotation never occurred.";
    if (kind === "one-role") evidence.pop();
    const r = await InterviewEvaluator.assess(
      transcript,
      scenario,
      objectives(),
      provider(judgment(evidence, kind === "low-confidence" ? 0.6 : 0.96)),
    );
    expect(r.objectives[0].completed).toBe(false);
  },
);

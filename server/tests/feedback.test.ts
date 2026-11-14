import { it, expect } from "vitest";
import { FeedbackGenerator } from "../src/feedback/rubric";
import { DiagnosisMatcher } from "../src/diagnosis/matcher";
import { SEED_SCENARIOS } from "../src/knowledge/seedScenarios";
it("separates authored findings from transcript evidence and avoids fabricated competence scores", () => {
  const scenario = SEED_SCENARIOS[0];
  const evaluation = FeedbackGenerator.generateEvaluation({
    sessionId: "s",
    submittedDiagnosis: "MDD",
    scenario,
    transcript: [],
    objectives: scenario.mandatoryObjectives.map((o) => ({
      ...o,
      completed: false,
      evidenceMessageIds: [],
      confidence: null,
    })),
    matchResult: DiagnosisMatcher.evaluate("MDD", scenario),
  });
  expect(evaluation.outcome).toBe("CORRECT");
  expect(evaluation.caseReviewStatus).toBe("DRAFT");
  expect(
    evaluation.supportingFindings.every((f) => f.messageIds.length === 0),
  ).toBe(true);
  expect(
    evaluation.rubric.find((r) => r.name === "Rapport & empathy")?.score,
  ).toBeNull();
  expect(evaluation.rubric[0].score).toBe(0);
  expect(evaluation.missedObjectives).toHaveLength(6);
});

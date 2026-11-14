import { describe, it, expect, vi } from "vitest";
import { DiagnosisMatcher } from "../src/diagnosis/matcher";
import { SEED_SCENARIOS } from "../src/knowledge/seedScenarios";
const scenario = SEED_SCENARIOS.find((s) => s.categoryId === "depressive")!;
const provider = (value: unknown) => ({
  name: "test",
  generateChat: vi.fn(),
  generateStructured: vi.fn().mockResolvedValue(value),
});
describe("conservative multilingual evaluation", () => {
  it.each(["Major Depressive Disorder", "MDD", "মেজর ডিপ্রেসিভ ডিসঅর্ডার"])(
    "accepts the case synonym %s",
    (value) => {
      expect(DiagnosisMatcher.evaluate(value, scenario).outcome).toBe(
        "CORRECT",
      );
    },
  );
  it("recognizes a case-approved broader answer but does not match negated keywords", () => {
    expect(DiagnosisMatcher.evaluate("Depression", scenario).outcome).toBe(
      "PARTIALLY_CORRECT",
    );
    expect(
      DiagnosisMatcher.evaluate("This is not depression", scenario).outcome,
    ).toBe("REVIEW_REQUIRED");
  });
  it("uses structured semantic assessment for nonliteral formulations", async () => {
    const ai = provider({
      relation: "equivalent",
      acceptedIndex: 0,
      confidence: 0.98,
    });
    expect(
      (
        await DiagnosisMatcher.assess(
          "A major depressive illness",
          scenario,
          ai,
        )
      ).outcome,
    ).toBe("CORRECT");
    expect(ai.generateStructured).toHaveBeenCalledOnce();
  });
  it("distinguishes an incompatible diagnosis from uncertainty and invalid answer indexes", async () => {
    expect(
      (
        await DiagnosisMatcher.assess(
          "Schizophrenia",
          scenario,
          provider({
            relation: "different",
            acceptedIndex: -1,
            confidence: 0.99,
          }),
        )
      ).outcome,
    ).toBe("INCORRECT");
    expect(
      (
        await DiagnosisMatcher.assess(
          "Many possible conditions",
          scenario,
          provider({
            relation: "uncertain",
            acceptedIndex: -1,
            confidence: 0.99,
          }),
        )
      ).outcome,
    ).toBe("REVIEW_REQUIRED");
    expect(
      (
        await DiagnosisMatcher.assess(
          "Ambiguous",
          scenario,
          provider({
            relation: "equivalent",
            acceptedIndex: 99,
            confidence: 0.99,
          }),
        )
      ).outcome,
    ).toBe("REVIEW_REQUIRED");
  });
});

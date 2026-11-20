import { config } from "../config/index.js";
import { repository } from "../db/repository.js";
import type { InternalClinicalProfile } from "../types/index.js";
import { SEED_SCENARIOS } from "./seedScenarios.js";

/**
 * Returns runnable scenarios for the given filter. Clinically approved scenarios
 * always take precedence; unreviewed demonstration cases are only returned when
 * ALLOW_UNREVIEWED_CASES is enabled and retain their non-approved reviewStatus.
 */
export async function resolveRunnableScenarios(filter?: {
  categoryId?: string;
  difficulty?: string;
}): Promise<{ approved: InternalClinicalProfile[]; fallback: InternalClinicalProfile[] }> {
  const approved = await repository.getScenarios({
    ...filter,
    status: "APPROVED",
  });
  if (!config.allowUnreviewed) {
    return { approved, fallback: [] };
  }

  const approvedBuckets = new Set(
    approved.map((s) => `${s.categoryId}:${s.difficulty}`),
  );
  const stored = await repository.getScenarios(filter);
  const unreviewedPool = stored.some(
    (s) => s.demonstration && s.reviewStatus === "DRAFT",
  )
    ? stored.filter((s) => s.demonstration && s.reviewStatus === "DRAFT")
    : SEED_SCENARIOS.filter(
        (s) =>
          (!filter?.categoryId || s.categoryId === filter.categoryId) &&
          (!filter?.difficulty || s.difficulty === filter.difficulty),
      );

  const fallback = unreviewedPool.filter(
    (s) => !approvedBuckets.has(`${s.categoryId}:${s.difficulty}`),
  );
  return { approved, fallback };
}

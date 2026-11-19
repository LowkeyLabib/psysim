import type {
  Difficulty,
  InternalClinicalProfile,
  RubricDefinition,
  ScenarioDraft,
} from "../types/index.js";
import { CORE_OBJECTIVES, SCENARIO_CATEGORIES, SEED_SCENARIOS } from "./seedScenarios.js";
import { validateForReview } from "../types/scenarioSchema.js";

export interface CatalogData {
  scenarios: Record<string, InternalClinicalProfile>;
  drafts: Record<string, ScenarioDraft>;
  reviews: {
    scenarioId: string;
    version: number;
    reviewerId: string;
    decision: string;
    note: string;
    at: string;
  }[];
}

export const DEFAULT_EDUCATIONAL_RUBRIC: RubricDefinition[] = [
  {
    name: "Rapport and empathy",
    weight: 20,
    criteria: "Maintains respectful, non-judgmental tone and responds sensitively to distress.",
  },
  {
    name: "History taking",
    weight: 25,
    criteria: "Clarifies onset, course, severity, functional impact, and relevant background.",
  },
  {
    name: "Psychiatric assessment",
    weight: 20,
    criteria: "Explores core symptoms and discriminating features across diagnostic alternatives.",
  },
  {
    name: "Risk and safety",
    weight: 20,
    criteria: "Screens suicidal/self-harm risk and protective support sensitively.",
  },
  {
    name: "Clinical reasoning",
    weight: 15,
    criteria: "Synthesizes elicited positive and negative findings into a coherent impression.",
  },
];

export const PENDING_SOURCE_REFERENCES = [
  "WHO ICD-11 Mental & Behavioural Disorders (pending clinician verification)",
  "NIMH Health Topics Reference (pending clinician verification)",
];

const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

/**
 * Builds educational fictional case drafts in PENDING_REVIEW status so an authorized
 * supervisor or administrator can inspect, edit, verify sources, and clinically approve
 * them before any become runnable in production.
 */
export function buildEducationalDrafts(): ScenarioDraft[] {
  return SEED_SCENARIOS.map((seed) => {
    const id = `edu_${seed.categoryId}_${seed.difficulty}`;
    const category = SCENARIO_CATEGORIES.find((c) => c.id === seed.categoryId);
    const categoryName = category?.name || seed.categoryName;
    const objectives = CORE_OBJECTIVES.map((o) => ({
      id: o.id,
      title: o.title,
      required: o.required,
      criteria: o.criteria,
    }));

    const profile: InternalClinicalProfile = {
      ...structuredClone(seed),
      id,
      categoryName,
      reviewStatus: "PENDING_REVIEW",
      demonstration: false,
      rubric: structuredClone(DEFAULT_EDUCATIONAL_RUBRIC),
      sourceReferences: [...PENDING_SOURCE_REFERENCES],
      mandatoryObjectives: structuredClone(CORE_OBJECTIVES),
    };

    const draft: ScenarioDraft = {
      id,
      version: 1,
      title: `${categoryName} — ${DIFFICULTY_LABEL[seed.difficulty]} (Pending Review)`,
      categoryId: seed.categoryId,
      difficulty: seed.difficulty,
      status: "PENDING_REVIEW",
      clinicalProfile: profile as unknown as Record<string, unknown>,
      objectives,
      rubric: structuredClone(DEFAULT_EDUCATIONAL_RUBRIC),
      sourceReferences: [...PENDING_SOURCE_REFERENCES],
    };

    // Ensure every generated educational draft satisfies the full clinical review schema.
    validateForReview({ ...draft, status: "PENDING_REVIEW" }, id);
    return draft;
  });
}

export interface PrepareCatalogResult {
  action: "preserved_existing" | "prepared_pending_review";
  approvedCount: number;
  preparedCount: number;
  totalDrafts: number;
  changed: boolean;
  catalog: CatalogData;
}

/**
 * Idempotently prepares the scenario catalog:
 * - Isolates unapproved demonstration dev seeds out of production catalogs.
 * - If clinically approved cases already exist, preserves them without duplication.
 * - If no approved cases exist, adds educational fictional drafts as PENDING_REVIEW
 *   (never falsely marking them as APPROVED).
 */
export function prepareCatalogDrafts(
  existing?: Partial<CatalogData> | null,
): PrepareCatalogResult {
  const beforeSerialized = JSON.stringify({
    scenarios: existing?.scenarios || {},
    drafts: existing?.drafts || {},
    reviews: existing?.reviews || [],
  });

  const catalog: CatalogData = {
    scenarios: structuredClone(existing?.scenarios || {}),
    drafts: structuredClone(existing?.drafts || {}),
    reviews: structuredClone(existing?.reviews || []),
  };

  // Isolate unapproved development demonstration fixtures from production catalog.
  for (const [id, sc] of Object.entries(catalog.scenarios)) {
    if (sc.demonstration && sc.reviewStatus !== "APPROVED") {
      delete catalog.scenarios[id];
    }
  }
  for (const [id, d] of Object.entries(catalog.drafts)) {
    const profileDemo = Boolean(
      (d.clinicalProfile as { demonstration?: unknown } | undefined)?.demonstration,
    );
    if (profileDemo && d.status !== "APPROVED") {
      delete catalog.drafts[id];
    }
  }

  const approvedScenarios = Object.values(catalog.scenarios).filter(
    (s) => s.reviewStatus === "APPROVED",
  );
  const approvedDraftIds = new Set(
    Object.values(catalog.drafts)
      .filter((d) => d.status === "APPROVED")
      .map((d) => d.id),
  );
  const approvedIds = new Set([
    ...approvedScenarios.map((s) => s.id),
    ...approvedDraftIds,
  ]);

  if (approvedIds.size > 0) {
    // Ensure any approved scenario has a draft entry without duplicating or overwriting.
    for (const sc of approvedScenarios) {
      if (!catalog.drafts[sc.id]) {
        catalog.drafts[sc.id] = {
          id: sc.id,
          version: 1,
          title: `${sc.categoryName} — ${DIFFICULTY_LABEL[sc.difficulty] || sc.difficulty}`,
          categoryId: sc.categoryId,
          difficulty: sc.difficulty,
          status: "APPROVED",
          clinicalProfile: structuredClone(sc) as unknown as Record<string, unknown>,
          objectives: sc.mandatoryObjectives.map((o) => ({
            id: o.id,
            title: o.title,
            required: o.required,
            criteria: o.criteria,
          })),
          rubric: sc.rubric || structuredClone(DEFAULT_EDUCATIONAL_RUBRIC),
          sourceReferences: sc.sourceReferences || [],
        };
      }
    }
    const afterSerialized = JSON.stringify(catalog);
    return {
      action: "preserved_existing",
      approvedCount: approvedIds.size,
      preparedCount: 0,
      totalDrafts: Object.keys(catalog.drafts).length,
      changed: beforeSerialized !== afterSerialized,
      catalog,
    };
  }

  let preparedCount = 0;
  for (const draft of buildEducationalDrafts()) {
    if (!catalog.drafts[draft.id]) {
      catalog.drafts[draft.id] = draft;
      preparedCount++;
    }
  }

  const afterSerialized = JSON.stringify(catalog);
  return {
    action: "prepared_pending_review",
    approvedCount: 0,
    preparedCount,
    totalDrafts: Object.keys(catalog.drafts).length,
    changed: beforeSerialized !== afterSerialized,
    catalog,
  };
}

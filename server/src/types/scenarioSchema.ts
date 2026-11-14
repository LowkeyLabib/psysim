import { z } from "zod";
import { InternalClinicalProfile, ScenarioInput } from "./index";
const text = z.string().trim().min(1).max(6000);
const strings = z.array(text).max(60);
export const ClinicalProfileZod = z.object({
  id: text,
  categoryId: text,
  categoryName: text,
  difficulty: z.enum(["beginner", "intermediate", "advanced"]),
  patient: z.object({
    name: text,
    age: z.number().int().min(18).max(100),
    gender: z.enum(["male", "female", "other"]),
    occupation: text,
    personality: text,
    language: z.enum(["en", "bn", "banglish", "mixed"]),
  }),
  presentingComplaint: text,
  openingMessage: z.object({ en: text, bn: text, banglish: text, mixed: text }),
  symptoms: strings.min(1),
  symptomTimeline: z.object({
    onset: text,
    duration: text,
    progression: text,
    fluctuation: text.optional(),
  }),
  psychiatricHistory: text,
  medicalHistory: text,
  medications: strings,
  substanceHistory: text,
  riskFactors: strings,
  protectiveFactors: strings,
  negativeFindings: strings,
  approvedDiagnosis: z.object({
    name: text,
    icd11Code: text,
    dsm5Code: text,
    specifiers: strings.optional(),
  }),
  acceptedDiagnoses: z
    .array(
      z.object({
        name: text,
        isExact: z.boolean(),
        isPartial: z.boolean().optional(),
        synonyms: strings,
      }),
    )
    .min(1),
  mandatoryObjectives: z
    .array(
      z.object({
        id: text,
        title: text,
        guidance: text,
        required: z.boolean(),
        criteria: text,
      }),
    )
    .min(1),
  reviewStatus: z.enum(["DRAFT", "PENDING_REVIEW", "APPROVED", "REJECTED"]),
  demonstration: z.boolean().optional(),
});
export const ScenarioInputZod = z
  .object({
    title: text,
    categoryId: text,
    difficulty: z.enum(["beginner", "intermediate", "advanced"]),
    status: z.enum(["DRAFT", "PENDING_REVIEW"]),
    clinicalProfile: z.record(z.string(), z.unknown()),
    objectives: z
      .array(
        z.object({
          id: text,
          title: text,
          required: z.boolean(),
          criteria: text,
        }),
      )
      .min(1)
      .max(20),
    rubric: z
      .array(
        z.object({
          name: text,
          weight: z.number().positive().max(100),
          criteria: text,
        }),
      )
      .max(20),
    sourceReferences: strings,
    expectedVersion: z.number().int().positive().optional(),
  })
  .refine(
    (v) => new Set(v.objectives.map((o) => o.id)).size === v.objectives.length,
    "Objective IDs must be unique",
  )
  .refine(
    (v) => v.objectives.some((o) => o.required),
    "At least one required objective is needed",
  );
export function validateForReview(
  input: ScenarioInput,
): InternalClinicalProfile {
  const profile = ClinicalProfileZod.parse(input.clinicalProfile);
  if (
    !input.sourceReferences.length ||
    Math.abs(input.rubric.reduce((s, r) => s + r.weight, 0) - 100) > 0.01
  )
    throw new Error("Review requires sources and rubric weights totaling 100.");
  return profile;
}

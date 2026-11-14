import {
  Objective,
  Message,
  InternalClinicalProfile,
  SessionResult,
  EvidenceClaim,
} from "../types";
import { DiagnosisMatchResult } from "../diagnosis/matcher";
export class FeedbackGenerator {
  static generateEvaluation(data: {
    sessionId: string;
    submittedDiagnosis: string;
    submittedReasoning?: string | null;
    scenario: InternalClinicalProfile;
    transcript: Message[];
    objectives: Objective[];
    matchResult: DiagnosisMatchResult;
  }): SessionResult {
    const {
      sessionId,
      submittedDiagnosis,
      submittedReasoning,
      scenario,
      objectives,
      matchResult,
    } = data;
    const claim = (text: string, ref: string): EvidenceClaim => ({
      text,
      messageIds: [],
      caseReferences: [`${scenario.id}:${ref}`],
    });
    const required = objectives.filter((o) => o.required),
      completed = required.filter((o) => o.completed);
    return {
      sessionId,
      submittedDiagnosis,
      submittedReasoning: submittedReasoning || undefined,
      caseReviewStatus: scenario.reviewStatus,
      outcome: matchResult.outcome,
      approvedDiagnosis: scenario.approvedDiagnosis.name,
      supportingFindings: scenario.symptoms.map((s, i) =>
        claim(s, `symptom:${i + 1}`),
      ),
      negativeFindings: scenario.negativeFindings.map((s, i) =>
        claim(s, `negative:${i + 1}`),
      ),
      explanation: claim(matchResult.explanation, "diagnosis"),
      learningPoints: [
        claim(
          `Compare your formulation with the recorded course: ${scenario.symptomTimeline.onset}; ${scenario.symptomTimeline.duration}; ${scenario.symptomTimeline.progression}.`,
          "timeline",
        ),
        claim(
          "Case findings are the authored scenario reference. They are not claims that every finding was elicited in your transcript.",
          "profile",
        ),
      ],
      missedObjectives: objectives
        .filter((o) => !o.completed)
        .map((o) => o.title),
      rubric: [
        {
          name: "Required interview coverage",
          score: completed.length,
          maximum: required.length,
          feedback: {
            text: `${completed.length} of ${required.length} required areas have evidence from both interviewer and patient. This measures coverage, not overall clinical competence.`,
            messageIds: [
              ...new Set(completed.flatMap((o) => o.evidenceMessageIds)),
            ],
            caseReferences: [],
          },
        },
        ...["Rapport & empathy", "Clinical reasoning"].map((name) => ({
          name,
          score: null,
          maximum: 5,
          feedback: {
            text: "Not automatically scored. A supervisor should review your transcript and written reasoning.",
            messageIds: [],
            caseReferences: [],
          },
        })),
      ],
    };
  }
}

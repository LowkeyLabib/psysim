import {
  Outcome,
  Objective,
  Message,
  InternalClinicalProfile,
  SessionResult,
  EvidenceClaim,
  RubricFeedback,
} from '../types/index.js';
import { DiagnosisMatchResult } from '../diagnosis/matcher.js';

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
    const { sessionId, submittedDiagnosis, submittedReasoning, scenario, transcript, objectives, matchResult } = data;

    const studentMsgs = transcript.filter((m) => m.role === 'student');
    const studentMsgIds = studentMsgs.map((m) => m.id);

    // Supporting findings
    const supportingFindings: EvidenceClaim[] = scenario.symptoms.map((symptom, i) => ({
      text: symptom,
      messageIds: studentMsgIds.slice(0, 2),
      caseReferences: [`SYM-${i + 1}`],
    }));

    // Relevant negative findings
    const negativeFindings: EvidenceClaim[] = scenario.negativeFindings.map((neg, i) => ({
      text: neg,
      messageIds: [],
      caseReferences: [`NEG-${i + 1}`],
    }));

    // Explanation
    const explanation: EvidenceClaim = {
      text: matchResult.explanation,
      messageIds: studentMsgIds.slice(-2),
      caseReferences: [scenario.approvedDiagnosis.icd11Code, scenario.approvedDiagnosis.dsm5Code],
    };

    // Learning Points
    const learningPoints: EvidenceClaim[] = [
      {
        text: `Clinical Criteria: Patient meets diagnostic criteria for ${scenario.approvedDiagnosis.name} (${scenario.approvedDiagnosis.icd11Code} / DSM-5 ${scenario.approvedDiagnosis.dsm5Code}).`,
        messageIds: [],
        caseReferences: ['WHO-ICD11'],
      },
      {
        text: `Differential Distinction: Negative findings (${scenario.negativeFindings.slice(0, 2).join('; ')}) rule out primary mood or psychotic differentials.`,
        messageIds: [],
        caseReferences: ['DSM5-DIFF'],
      },
      {
        text: 'Chronology & Course: Eliciting exact onset and functional decline provides strong diagnostic corroboration.',
        messageIds: [],
        caseReferences: ['NIMH-GUIDE'],
      },
    ];

    // Missed Objectives
    const missedObjectives = objectives
      .filter((o) => o.required && !o.completed)
      .map((o) => o.title);

    // Rubric
    const completedRequired = objectives.filter((o) => o.required && o.completed).length;
    const requiredTotal = Math.max(objectives.filter((o) => o.required).length, 1);
    const historyScore = Math.min(5, Math.max(2, Math.round((completedRequired / requiredTotal) * 5)));
    const reasoningScore = matchResult.outcome === 'CORRECT' ? 5 : matchResult.outcome === 'PARTIALLY_CORRECT' ? 3 : 2;

    const rubric: RubricFeedback[] = [
      {
        name: 'Rapport & Empathy',
        score: studentMsgs.length >= 3 ? 5 : 4,
        maximum: 5,
        feedback: {
          text: 'Maintained attentive, compassionate communication throughout the interview.',
          messageIds: studentMsgIds.slice(0, 1),
          caseReferences: [],
        },
      },
      {
        name: 'History Taking',
        score: historyScore,
        maximum: 5,
        feedback: {
          text: `Explored ${completedRequired} of ${requiredTotal} mandatory clinical domains.`,
          messageIds: studentMsgIds.slice(0, 3),
          caseReferences: [],
        },
      },
      {
        name: 'Psychiatric & Medical Assessment',
        score: objectives.find((o) => o.id === 'o3')?.completed ? 5 : 3,
        maximum: 5,
        feedback: {
          text: 'Investigated past episodes, medical health, and substance history.',
          messageIds: objectives.find((o) => o.id === 'o3')?.evidenceMessageIds || [],
          caseReferences: [],
        },
      },
      {
        name: 'Risk & Safety Assessment',
        score: objectives.find((o) => o.id === 'o4')?.completed ? 5 : 2,
        maximum: 5,
        feedback: {
          text: 'Directly assessed suicidal ideation and patient protective factors.',
          messageIds: objectives.find((o) => o.id === 'o4')?.evidenceMessageIds || [],
          caseReferences: [],
        },
      },
      {
        name: 'Clinical Reasoning',
        score: reasoningScore,
        maximum: 5,
        feedback: {
          text: matchResult.explanation,
          messageIds: studentMsgIds.slice(-1),
          caseReferences: [],
        },
      },
    ];

    return {
      sessionId,
      outcome: matchResult.outcome,
      submittedDiagnosis,
      submittedReasoning: submittedReasoning || undefined,
      approvedDiagnosis: matchResult.outcome === 'REVIEW_REQUIRED' ? null : scenario.approvedDiagnosis.name,
      supportingFindings,
      negativeFindings,
      explanation,
      learningPoints,
      missedObjectives,
      rubric,
    };
  }
}

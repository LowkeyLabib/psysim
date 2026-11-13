import {
  DiagnosticOutcome,
  InterviewObjectiveProgress,
  Message,
  RubricDomainScore,
  ScenarioTemplate,
  SessionEvaluation,
} from '../types/index.js';
import { DiagnosisMatchResult } from '../diagnosis/matcher.js';

export class FeedbackGenerator {
  static generateEvaluation(data: {
    sessionId: string;
    submittedDiagnosis: string;
    clinicalReasoning?: string | null;
    scenario: ScenarioTemplate;
    transcript: Message[];
    objectives: InterviewObjectiveProgress[];
    matchResult: DiagnosisMatchResult;
  }): SessionEvaluation {
    const { sessionId, submittedDiagnosis, clinicalReasoning, scenario, transcript, objectives, matchResult } = data;

    const completedCount = objectives.filter((o) => o.status === 'COMPLETED').length;
    const totalCount = Math.max(objectives.length, 1);
    const completionRatio = completedCount / totalCount;

    // 1. Domain Scores
    const studentMsgs = transcript.filter((m) => m.sender === 'student');
    const rapportScore = Math.min(5, Math.max(3, studentMsgs.length > 3 ? 5 : 4));
    const historyScore = Math.min(5, Math.max(2, Math.round(completionRatio * 5)));
    const psychScore = objectives.find((o) => o.id === 'obj_past_history')?.status === 'COMPLETED' ? 5 : 3;
    const riskScore = objectives.find((o) => o.id === 'obj_safety_risk')?.status === 'COMPLETED' ? 5 : 2;

    let reasoningScore = 2;
    if (matchResult.outcome === 'CORRECT') reasoningScore = 5;
    else if (matchResult.outcome === 'PARTIALLY_CORRECT') reasoningScore = 3;
    else if (matchResult.outcome === 'REVIEW_REQUIRED') reasoningScore = 3;

    const domains: RubricDomainScore[] = [
      {
        name: 'Rapport & Empathy',
        score: rapportScore,
        maxScore: 5,
        feedback:
          rapportScore >= 4
            ? 'Maintained professional, compassionate demeanor and actively validated patient distress.'
            : 'Consider using more open-ended empathetic validation during early disclosure.',
      },
      {
        name: 'History Taking',
        score: historyScore,
        maxScore: 5,
        feedback:
          historyScore >= 4
            ? 'Methodically gathered presenting complaint and chronological evolution of symptoms.'
            : 'Some aspects of symptom onset, duration, or functional decline were incomplete.',
      },
      {
        name: 'Psychiatric & Medical Assessment',
        score: psychScore,
        maxScore: 5,
        feedback:
          psychScore >= 4
            ? 'Effectively screened past psychiatric episodes, physical health, and medication history.'
            : 'Be sure to systematically inquire into previous depressive or elevated mood episodes.',
      },
      {
        name: 'Risk & Safety Assessment',
        score: riskScore,
        maxScore: 5,
        feedback:
          riskScore >= 4
            ? 'Thoroughly screened for suicidal ideation, self-harm impulses, and patient protective factors.'
            : 'Safety assessment was brief or absent; always directly screen for self-harm in psychiatric presentations.',
      },
      {
        name: 'Clinical Reasoning',
        score: reasoningScore,
        maxScore: 5,
        feedback:
          reasoningScore >= 4
            ? 'Synthesized elicited clinical findings into a sound, criteria-grounded diagnostic formulation.'
            : 'Review DSM-5 / ICD-11 core diagnostic criteria and distinguishing differential features.',
      },
    ];

    const overallScore = Math.round(
      ((rapportScore + historyScore + psychScore + riskScore + reasoningScore) / 25) * 100
    );

    // Learning Points
    const learningPoints: string[] = [
      `Diagnostic Ground Truth: This patient meets criteria for ${scenario.approvedDiagnosis.name} (${scenario.approvedDiagnosis.icd11Code} / DSM-5 ${scenario.approvedDiagnosis.dsm5Code}).`,
      `Key Distinguishing Features: Review ${scenario.symptoms.slice(0, 3).join(', ')}.`,
      `Differential Considerations: Notice negative findings (${scenario.negativeFindings.join(', ')}), which help exclude alternative diagnoses.`,
    ];

    if (matchResult.outcome === 'PARTIALLY_CORRECT') {
      learningPoints.push(
        'Tip: While you identified the correct broad category, always look for specific episode specifiers (e.g. single vs recurrent, severity, or current episode characteristics).'
      );
    }

    return {
      id: `eval_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      sessionId,
      outcome: matchResult.outcome,
      submittedDiagnosis,
      clinicalReasoning: clinicalReasoning || undefined,
      actualDiagnosis: {
        name: scenario.approvedDiagnosis.name,
        icd11Code: scenario.approvedDiagnosis.icd11Code,
        dsm5Code: scenario.approvedDiagnosis.dsm5Code,
        category: scenario.categoryName,
      },
      outcomeExplanation: matchResult.explanation,
      keyPositiveFindings: scenario.symptoms,
      relevantNegativeFindings: scenario.negativeFindings,
      rubric: {
        overallScore,
        domains,
      },
      learningPoints,
      evaluatedAt: new Date().toISOString(),
    };
  }
}

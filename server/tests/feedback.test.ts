import { describe, it, expect } from 'vitest';
import { FeedbackGenerator } from '../src/feedback/rubric.js';
import { DiagnosisMatcher } from '../src/diagnosis/matcher.js';
import { SEED_SCENARIOS, CORE_OBJECTIVES } from '../src/knowledge/seedScenarios.js';
import { Message, Objective } from '../src/types/index.js';

describe('FeedbackGenerator', () => {
  const scenario = SEED_SCENARIOS.find((s) => s.id === 'scen_mdd_beginner')!;

  it('generates complete educational evaluation with 5 rubric domains', () => {
    const transcript: Message[] = [
      { id: '1', role: 'patient', content: 'Not feeling well', createdAt: '1' },
      { id: '2', role: 'student', content: 'Tell me about your sleep and mood', createdAt: '2' },
      { id: '3', role: 'student', content: 'Have you had thoughts of suicide?', createdAt: '3' },
    ];

    const objectives: Objective[] = CORE_OBJECTIVES.map((o) => ({
      id: o.id,
      title: o.title,
      required: o.required,
      completed: true,
      evidenceMessageIds: ['2', '3'],
      confidence: 0.95,
      guidance: o.guidance,
    }));

    const matchResult = DiagnosisMatcher.evaluate('Major Depressive Disorder', scenario);

    const evaluation = FeedbackGenerator.generateEvaluation({
      sessionId: 's1',
      submittedDiagnosis: 'Major Depressive Disorder',
      submittedReasoning: 'Persistent low mood with early morning awakening and fatigue.',
      scenario,
      transcript,
      objectives,
      matchResult,
    });

    expect(evaluation.outcome).toBe('CORRECT');
    expect(evaluation.approvedDiagnosis).toContain('Major Depressive Disorder');
    expect(evaluation.rubric).toHaveLength(5);
    expect(evaluation.supportingFindings.length).toBeGreaterThan(0);
    expect(evaluation.negativeFindings.length).toBeGreaterThan(0);
    expect(evaluation.learningPoints.length).toBeGreaterThan(0);
  });
});

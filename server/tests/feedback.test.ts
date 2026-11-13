import { describe, it, expect } from 'vitest';
import { FeedbackGenerator } from '../src/feedback/rubric.js';
import { DiagnosisMatcher } from '../src/diagnosis/matcher.js';
import { SEED_SCENARIOS } from '../src/knowledge/seedScenarios.js';
import { Message, InterviewObjectiveProgress } from '../src/types/index.js';

describe('FeedbackGenerator', () => {
  const scenario = SEED_SCENARIOS.find((s) => s.id === 'scen_mdd_beginner')!;

  it('generates complete educational evaluation with 5 rubric domains', () => {
    const transcript: Message[] = [
      { id: '1', sessionId: 's1', sender: 'patient', content: 'Not feeling well', timestamp: '1' },
      { id: '2', sessionId: 's1', sender: 'student', content: 'Tell me about your sleep and mood', timestamp: '2' },
      { id: '3', sessionId: 's1', sender: 'student', content: 'Have you had thoughts of suicide?', timestamp: '3' },
    ];

    const objectives: InterviewObjectiveProgress[] = scenario.mandatoryObjectives.map((o) => ({
      id: o.id,
      title: o.title,
      description: o.description,
      isMandatory: o.isMandatory,
      status: 'COMPLETED',
    }));

    const matchResult = DiagnosisMatcher.evaluate('Major Depressive Disorder', scenario);

    const evaluation = FeedbackGenerator.generateEvaluation({
      sessionId: 's1',
      submittedDiagnosis: 'Major Depressive Disorder',
      clinicalReasoning: 'Persistent low mood with early morning awakening and fatigue.',
      scenario,
      transcript,
      objectives,
      matchResult,
    });

    expect(evaluation.outcome).toBe('CORRECT');
    expect(evaluation.actualDiagnosis.name).toContain('Major Depressive Disorder');
    expect(evaluation.rubric.domains).toHaveLength(5);
    expect(evaluation.rubric.overallScore).toBeGreaterThan(60);
    expect(evaluation.keyPositiveFindings.length).toBeGreaterThan(0);
    expect(evaluation.relevantNegativeFindings.length).toBeGreaterThan(0);
    expect(evaluation.learningPoints.length).toBeGreaterThan(0);
  });
});

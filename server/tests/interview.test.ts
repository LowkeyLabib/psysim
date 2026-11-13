import { describe, it, expect } from 'vitest';
import { InterviewEvaluator } from '../src/interview/evaluator.js';
import { CORE_OBJECTIVES } from '../src/knowledge/seedScenarios.js';
import { InternalClinicalProfile, Message, Objective } from '../src/types/index.js';

const mockScenario: InternalClinicalProfile = {
  id: 'scen_test',
  categoryId: 'depressive',
  categoryName: 'Depressive disorders',
  difficulty: 'beginner',
  patient: {
    name: 'Rahim',
    age: 26,
    gender: 'male',
    occupation: 'Student',
    personality: 'Reserved',
    language: 'bn',
  },
  presentingComplaint: 'Low mood',
  openingMessage: {
    en: 'Hello doctor',
    bn: 'ডাক্তার সাহেব...',
    banglish: 'Doctor shaheb...',
    mixed: 'Hello doctor...',
  },
  symptoms: ['Insomnia'],
  symptomTimeline: { onset: '1 month', duration: '1 month', progression: 'worsening' },
  psychiatricHistory: 'None',
  medicalHistory: 'None',
  medications: [],
  substanceHistory: 'None',
  riskFactors: [],
  protectiveFactors: [],
  negativeFindings: [],
  approvedDiagnosis: { name: 'MDD', icd11Code: '6A70', dsm5Code: '296.2' },
  acceptedDiagnoses: [],
  mandatoryObjectives: CORE_OBJECTIVES,
  reviewStatus: 'APPROVED',
};

describe('InterviewEvaluator', () => {
  it('correctly detects English inquiry and marks objective completed with evidence', () => {
    const transcript: Message[] = [
      { id: 'm1', role: 'patient', content: 'Hello doctor', createdAt: '1' },
      { id: 'm2', role: 'student', content: 'What problem brings you in today?', createdAt: '2' },
    ];

    const initialObjectives: Objective[] = CORE_OBJECTIVES.map((o) => ({
      id: o.id,
      title: o.title,
      required: o.required,
      completed: false,
      evidenceMessageIds: [],
      confidence: null,
      guidance: o.guidance,
    }));

    const result = InterviewEvaluator.evaluateProgress(transcript, mockScenario, initialObjectives);
    const presentingComp = result.objectives.find((o) => o.id === 'o0');

    expect(presentingComp?.completed).toBe(true);
    expect(presentingComp?.evidenceMessageIds).toContain('m2');
  });

  it('correctly detects Bengali & Banglish inquiries', () => {
    const transcript: Message[] = [
      { id: 'm1', role: 'patient', content: 'ডাক্তার সাহেব...', createdAt: '1' },
      { id: 'm2', role: 'student', content: 'Apnar ei somossa koto din dhore shuru hoyeche?', createdAt: '2' },
    ];

    const initialObjectives: Objective[] = CORE_OBJECTIVES.map((o) => ({
      id: o.id,
      title: o.title,
      required: o.required,
      completed: false,
      evidenceMessageIds: [],
      confidence: null,
      guidance: o.guidance,
    }));

    const result = InterviewEvaluator.evaluateProgress(transcript, mockScenario, initialObjectives);
    const chronology = result.objectives.find((o) => o.id === 'o1');

    expect(chronology?.completed).toBe(true);
    expect(chronology?.evidenceMessageIds).toContain('m2');
  });

  it('correctly locks and unlocks submission eligibility based on mandatory objectives', () => {
    const objectivesIncomplete: Objective[] = [
      { id: 'o0', title: 'Presenting complaint', required: true, completed: true, evidenceMessageIds: ['m1'], confidence: 0.9 },
      { id: 'o1', title: 'Onset, course & severity', required: true, completed: false, evidenceMessageIds: [], confidence: null },
    ];

    const result1 = InterviewEvaluator.evaluateProgress([], mockScenario, objectivesIncomplete);
    expect(result1.eligible).toBe(false);

    const objectivesComplete: Objective[] = [
      { id: 'o0', title: 'Presenting complaint', required: true, completed: true, evidenceMessageIds: ['m1'], confidence: 0.9 },
      { id: 'o1', title: 'Onset, course & severity', required: true, completed: true, evidenceMessageIds: ['m2'], confidence: 0.9 },
    ];

    const result2 = InterviewEvaluator.evaluateProgress([], mockScenario, objectivesComplete);
    expect(result2.eligible).toBe(true);
  });
});

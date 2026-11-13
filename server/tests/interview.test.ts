import { describe, it, expect } from 'vitest';
import { InterviewEvaluator } from '../src/interview/evaluator.js';
import { CORE_INTERVIEW_OBJECTIVES } from '../src/interview/objectives.js';
import { ScenarioTemplate, Message, InterviewObjectiveProgress } from '../src/types/index.js';

const mockScenario: ScenarioTemplate = {
  id: 'scen_test',
  categoryId: 'depressive_disorders',
  categoryName: 'Depressive Disorders',
  difficulty: 'BEGINNER',
  patient: {
    name: 'Rahim',
    age: 26,
    gender: 'male',
    occupation: 'Student',
    personality: 'Reserved',
    language: 'bn',
  },
  presentingComplaint: 'Low mood',
  openingMessage: 'Hello doctor',
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
  mandatoryObjectives: CORE_INTERVIEW_OBJECTIVES.slice(0, 3), // First 3 are mandatory
  reviewStatus: 'APPROVED',
};

describe('InterviewEvaluator', () => {
  it('correctly detects English inquiry and marks objective completed with evidence', () => {
    const transcript: Message[] = [
      { id: 'm1', sessionId: 's1', sender: 'patient', content: 'Hello doctor', timestamp: '1' },
      { id: 'm2', sessionId: 's1', sender: 'student', content: 'What problem brings you in today?', timestamp: '2' },
    ];

    const initialProgress: InterviewObjectiveProgress[] = mockScenario.mandatoryObjectives.map(o => ({
      id: o.id,
      title: o.title,
      description: o.description,
      isMandatory: o.isMandatory,
      status: 'NOT_STARTED',
    }));

    const result = InterviewEvaluator.evaluateProgress(transcript, mockScenario, initialProgress);
    const presentingComp = result.find(o => o.id === 'obj_presenting_complaint');

    expect(presentingComp?.status).toBe('COMPLETED');
    expect(presentingComp?.evidenceQuote).toContain('What problem brings you in today?');
    expect(presentingComp?.evidenceMessageId).toBe('m2');
  });

  it('correctly detects Bengali & Banglish inquiries', () => {
    const transcript: Message[] = [
      { id: 'm1', sessionId: 's1', sender: 'patient', content: 'ডাক্তার সাহেব...', timestamp: '1' },
      { id: 'm2', sessionId: 's1', sender: 'student', content: 'Apnar ei somossa koto din dhore shuru hoyeche?', timestamp: '2' },
    ];

    const initialProgress: InterviewObjectiveProgress[] = mockScenario.mandatoryObjectives.map(o => ({
      id: o.id,
      title: o.title,
      description: o.description,
      isMandatory: o.isMandatory,
      status: 'NOT_STARTED',
    }));

    const result = InterviewEvaluator.evaluateProgress(transcript, mockScenario, initialProgress);
    const chronology = result.find(o => o.id === 'obj_symptom_chronology');

    expect(chronology?.status).toBe('COMPLETED');
    expect(chronology?.evidenceMessageId).toBe('m2');
  });

  it('correctly locks and unlocks submission eligibility based on mandatory objectives', () => {
    const progressIncomplete: InterviewObjectiveProgress[] = [
      { id: 'obj_presenting_complaint', title: 'Presenting Complaint', description: '', isMandatory: true, status: 'COMPLETED' },
      { id: 'obj_symptom_chronology', title: 'Symptom Timeline', description: '', isMandatory: true, status: 'NOT_STARTED' },
    ];

    const gate1 = InterviewEvaluator.isSubmissionEligible(progressIncomplete);
    expect(gate1.eligible).toBe(false);
    expect(gate1.missingMandatory).toHaveLength(1);
    expect(gate1.missingMandatory[0].id).toBe('obj_symptom_chronology');

    const progressComplete: InterviewObjectiveProgress[] = [
      { id: 'obj_presenting_complaint', title: 'Presenting Complaint', description: '', isMandatory: true, status: 'COMPLETED' },
      { id: 'obj_symptom_chronology', title: 'Symptom Timeline', description: '', isMandatory: true, status: 'COMPLETED' },
    ];

    const gate2 = InterviewEvaluator.isSubmissionEligible(progressComplete);
    expect(gate2.eligible).toBe(true);
    expect(gate2.missingMandatory).toHaveLength(0);
  });
});

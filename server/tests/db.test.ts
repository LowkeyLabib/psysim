import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryRepository } from '../src/db/repository.js';
import { ScenarioTemplate } from '../src/types/index.js';

const mockScenario: ScenarioTemplate = {
  id: 'scen_test_01',
  categoryId: 'depressive_disorders',
  categoryName: 'Depressive Disorders',
  difficulty: 'BEGINNER',
  patient: {
    name: 'Rahim',
    age: 27,
    gender: 'male',
    occupation: 'Teacher',
    personality: 'Quiet',
    language: 'bn',
  },
  presentingComplaint: 'Low mood and fatigue',
  openingMessage: 'Hello doctor, I have not been feeling well.',
  symptoms: ['Insomnia', 'Fatigue', 'Loss of interest'],
  symptomTimeline: { onset: '2 months ago', duration: 'Persistent', progression: 'Worsening' },
  psychiatricHistory: 'No prior history',
  medicalHistory: 'None',
  medications: [],
  substanceHistory: 'None',
  riskFactors: ['Job stress'],
  protectiveFactors: ['Supportive family'],
  negativeFindings: ['No mania', 'No psychosis'],
  approvedDiagnosis: {
    name: 'Major Depressive Disorder',
    icd11Code: '6A70',
    dsm5Code: '296.22',
  },
  acceptedDiagnoses: [
    { name: 'Major Depressive Disorder', isExact: true, synonyms: ['MDD', 'Depression'] },
  ],
  mandatoryObjectives: [
    {
      id: 'obj_presenting_complaint',
      title: 'Presenting Complaint',
      description: 'Elicit chief complaint',
      isMandatory: true,
    },
    {
      id: 'obj_safety_risk',
      title: 'Safety & Risk',
      description: 'Screen for suicidality',
      isMandatory: true,
    },
  ],
  reviewStatus: 'APPROVED',
};

describe('InMemoryRepository', () => {
  let repo: InMemoryRepository;

  beforeEach(() => {
    repo = new InMemoryRepository([mockScenario]);
  });

  it('creates and retrieves a session correctly', async () => {
    const session = await repo.createSession({
      userId: 'usr_001',
      scenarioId: mockScenario.id,
      mode: 'CLINICAL_CHALLENGE',
      difficulty: 'BEGINNER',
      patient: mockScenario.patient,
    });

    expect(session.id).toBeDefined();
    expect(session.status).toBe('CREATED');
    expect(session.patient.name).toBe('Rahim');

    const fetched = await repo.getSession(session.id);
    expect(fetched).not.toBeNull();
    expect(fetched?.id).toBe(session.id);
  });

  it('updates session status along state machine', async () => {
    const session = await repo.createSession({
      userId: 'usr_001',
      scenarioId: mockScenario.id,
      mode: 'CLINICAL_CHALLENGE',
      difficulty: 'BEGINNER',
      patient: mockScenario.patient,
    });

    await repo.updateSessionStatus(session.id, 'IN_PROGRESS');
    let updated = await repo.getSession(session.id);
    expect(updated?.status).toBe('IN_PROGRESS');

    await repo.updateSessionStatus(session.id, 'INTERVIEW_COMPLETE');
    updated = await repo.getSession(session.id);
    expect(updated?.status).toBe('INTERVIEW_COMPLETE');
  });

  it('persists dialogue messages', async () => {
    const session = await repo.createSession({
      userId: 'usr_001',
      scenarioId: mockScenario.id,
      mode: 'CLINICAL_CHALLENGE',
      difficulty: 'BEGINNER',
      patient: mockScenario.patient,
    });

    const m1 = await repo.addMessage(session.id, 'patient', 'Hello');
    const m2 = await repo.addMessage(session.id, 'student', 'Hi, how can I help you?');

    const messages = await repo.getMessages(session.id);
    expect(messages).toHaveLength(2);
    expect(messages[0].content).toBe('Hello');
    expect(messages[1].content).toBe('Hi, how can I help you?');
  });

  it('initializes and updates mandatory interview objectives', async () => {
    const session = await repo.createSession({
      userId: 'usr_001',
      scenarioId: mockScenario.id,
      mode: 'CLINICAL_CHALLENGE',
      difficulty: 'BEGINNER',
      patient: mockScenario.patient,
    });

    const objs = await repo.initObjectives(session.id, mockScenario);
    expect(objs).toHaveLength(2);
    expect(objs[0].status).toBe('NOT_STARTED');

    await repo.updateObjective(session.id, 'obj_presenting_complaint', {
      status: 'COMPLETED',
      evidenceQuote: 'Feeling low and tired',
      confidence: 0.95,
    });

    const updatedObjs = await repo.getObjectives(session.id);
    const compObj = updatedObjs.find((o) => o.id === 'obj_presenting_complaint');
    expect(compObj?.status).toBe('COMPLETED');
    expect(compObj?.confidence).toBe(0.95);
  });
});

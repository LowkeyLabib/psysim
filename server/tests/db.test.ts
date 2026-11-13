import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryRepository } from '../src/db/repository.js';
import { InternalClinicalProfile } from '../src/types/index.js';
import { CORE_OBJECTIVES } from '../src/knowledge/seedScenarios.js';

const mockScenario: InternalClinicalProfile = {
  id: 'scen_test_01',
  categoryId: 'depressive',
  categoryName: 'Depressive disorders',
  difficulty: 'beginner',
  patient: {
    name: 'Rahim',
    age: 27,
    gender: 'male',
    occupation: 'Teacher',
    personality: 'Quiet',
    language: 'bn',
  },
  presentingComplaint: 'Low mood and fatigue',
  openingMessage: {
    en: 'Hello doctor, I have not been feeling well.',
    bn: 'ডাক্তার সাহেব...',
    banglish: 'Doctor shaheb...',
    mixed: 'Hello doctor...',
  },
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
  mandatoryObjectives: CORE_OBJECTIVES,
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
      scenario: mockScenario,
      mode: 'challenge',
      difficulty: 'beginner',
      language: 'en',
      isLive: false,
    });

    expect(session.id).toBeDefined();
    expect(session.state).toBe('IN_PROGRESS');
    expect(session.patient.name).toBe('Rahim');

    const fetched = await repo.getSession(session.id);
    expect(fetched).not.toBeNull();
    expect(fetched?.id).toBe(session.id);
  });

  it('updates session status along state machine', async () => {
    const session = await repo.createSession({
      userId: 'usr_001',
      scenario: mockScenario,
      mode: 'challenge',
      difficulty: 'beginner',
      language: 'en',
      isLive: false,
    });

    await repo.updateSession(session.id, (s) => {
      s.state = 'INTERVIEW_COMPLETE';
    });
    const updated = await repo.getSession(session.id);
    expect(updated?.state).toBe('INTERVIEW_COMPLETE');
  });

  it('persists dialogue messages', async () => {
    const session = await repo.createSession({
      userId: 'usr_001',
      scenario: mockScenario,
      mode: 'challenge',
      difficulty: 'beginner',
      language: 'en',
      isLive: false,
    });

    await repo.updateSession(session.id, (s) => {
      s.messages.push({
        id: 'msg_test',
        role: 'student',
        content: 'How can I help you?',
        createdAt: new Date().toISOString(),
      });
    });

    const fetched = await repo.getSession(session.id);
    expect(fetched?.messages).toHaveLength(2);
    expect(fetched?.messages[1].content).toBe('How can I help you?');
  });

  it('initializes and updates mandatory interview objectives', async () => {
    const session = await repo.createSession({
      userId: 'usr_001',
      scenario: mockScenario,
      mode: 'challenge',
      difficulty: 'beginner',
      language: 'en',
      isLive: false,
    });

    expect(session.progress.objectives.length).toBeGreaterThan(0);
    expect(session.progress.objectives[0].completed).toBe(false);

    await repo.updateSession(session.id, (s) => {
      s.progress.objectives[0].completed = true;
    });

    const updated = await repo.getSession(session.id);
    expect(updated?.progress.objectives[0].completed).toBe(true);
  });
});

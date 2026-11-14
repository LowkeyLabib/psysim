import { beforeEach, describe, expect, it } from 'vitest';
import { demoApi } from '../lib/demo';
import { canSubmit } from '../lib/session';
import type { Language, SessionState } from '../../shared/contracts';
const create = (language: Language = 'en') => demoApi.create({ mode: 'challenge', difficulty: 'beginner', language }, crypto.randomUUID());
beforeEach(() => localStorage.clear());
describe('development adapter boundaries and persistence', () => {
  it('persists a public session without an answer key or private profile', async () => {
    const session = await create(); expect(await demoApi.session(session.id)).toEqual(session);
    expect(JSON.stringify(session)).not.toMatch(/accepted_diagnoses|diagnosis_code|clinicalProfile|approvedDiagnosis/);
    expect(session.simulation).toBe('mock'); expect(canSubmit(session)).toBe(false);
  });
  it('does not unlock from keywords, message count or elapsed time', async () => {
    const session = await create(); const next = await demoApi.send(session.id, 'onset history risk safety symptoms function', session.version, 'message-key');
    expect(next.progress.eligible).toBe(false); expect(next.progress.objectives.some(o => o.completed)).toBe(false);
    await expect(demoApi.diagnose(session.id, { diagnosis: 'test', expectedVersion: next.version }, 'early')).rejects.toThrow('Complete');
  });
  it.each(['en', 'bn', 'banglish', 'mixed'] as Language[])('preserves Unicode text and selected language: %s', async language => {
    const session = await create(language); const input = 'আপনার ঘুম কেমন? Koto din dhore? How is work?';
    const next = await demoApi.send(session.id, input, session.version, crypto.randomUUID());
    expect(next.messages[1].content).toBe(input); expect(next.patient).toEqual(session.patient); expect(next.language).toBe(language);
  });
  it('deduplicates retries and rejects stale versions', async () => {
    const session = await create(); const first = await demoApi.send(session.id, 'Hello', session.version, 'same');
    expect(await demoApi.send(session.id, 'Hello', session.version, 'same')).toEqual(first);
    expect((await demoApi.session(session.id)).messages).toHaveLength(3);
    await expect(demoApi.send(session.id, 'Another question', session.version, 'new-key')).rejects.toThrow('changed');
  });
  it('requires explicit demo controls and never awards diagnostic success', async () => {
    let s = await create(); for (const objective of s.progress.objectives) s = await demoApi.demoComplete!(s.id, objective.id);
    expect(canSubmit(s)).toBe(true);
    const input = { diagnosis: 'বিষণ্নতা', reasoning: 'Demo reasoning', expectedVersion: s.version };
    const final = await demoApi.diagnose(s.id, input, 'final'); expect(final.state).toBe('EVALUATED');
    expect(await demoApi.diagnose(s.id, input, 'final')).toEqual(final);
    await expect(demoApi.diagnose(s.id, input, 'duplicate')).rejects.toThrow();
    await expect(demoApi.send(s.id, 'Continue?', final.version, 'late')).rejects.toThrow('finalized');
    const result = await demoApi.results(s.id); expect(result.submittedDiagnosis).toBe('বিষণ্নতা'); expect(result.outcome).toBe('REVIEW_REQUIRED'); expect(result.approvedDiagnosis).toBeNull();
    expect((await demoApi.sessions()).stats).toMatchObject({ completed: 1, correct: 0, graded: 0 });
  });
  it.each(['CREATED', 'IN_PROGRESS', 'DIAGNOSIS_SUBMITTED', 'EVALUATED', 'ABANDONED', 'ERROR'] as SessionState[])('rejects submission in %s even with eligible=true', async state => {
    const s = await create(); expect(canSubmit({ ...s, state, progress: { ...s.progress, eligible: true } })).toBe(false);
  });
  it('never approves a demo case', async () => { await expect(demoApi.reviewScenario('x', 1, 'APPROVED', 'reviewed')).rejects.toThrow('cannot be approved'); });
});

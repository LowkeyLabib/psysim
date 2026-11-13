import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/server.js';
import { repository } from '../src/db/repository.js';

describe('PsySim REST API Endpoints (Labib Contract v1 Compliance)', () => {
  it('GET /api/scenarios/categories returns Category[] array directly', async () => {
    const res = await request(app).get('/api/scenarios/categories');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(7);
    expect(res.body[0].id).toBe('depressive');
    expect(res.body[0].name).toBe('Depressive disorders');
  });

  it('GET /api/me returns UserProfile', async () => {
    const res = await request(app).get('/api/me');
    expect(res.status).toBe(200);
    expect(res.body.id).toBe('demo-student');
    expect(res.body.displayName).toBeDefined();
    expect(res.body.role).toBe('student');
  });

  it('GET /api/me/sessions returns SessionPage structure', async () => {
    const res = await request(app).get('/api/me/sessions');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.stats).toBeDefined();
    expect(res.body.stats.completed).toBeDefined();
  });

  it('POST /api/sessions creates a PublicSession with zero diagnosis leakage', async () => {
    const res = await request(app)
      .post('/api/sessions')
      .send({
        mode: 'challenge',
        difficulty: 'beginner',
        language: 'en',
      });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.version).toBe(1);
    expect(res.body.state).toBe('IN_PROGRESS');
    expect(res.body.patient.name).toBeDefined();
    expect(res.body.messages.length).toBe(1);
    expect(res.body.messages[0].role).toBe('patient');

    // Strict zero-leakage check
    const raw = JSON.stringify(res.body).toLowerCase();
    expect(raw).not.toContain('approveddiagnosis');
    expect(raw).not.toContain('accepteddiagnoses');
    expect(raw).not.toContain('6a70');
  });

  it('POST /api/sessions/:id/messages appends messages and updates progress snapshot', async () => {
    const sessionRes = await request(app)
      .post('/api/sessions')
      .send({
        mode: 'custom',
        categoryId: 'depressive',
        difficulty: 'beginner',
        language: 'bn',
      });

    const sessionId = sessionRes.body.id;

    const msgRes = await request(app)
      .post(`/api/sessions/${sessionId}/messages`)
      .send({
        content: 'আপনার ঘুম কেমন হচ্ছে?',
        expectedVersion: 1,
      });

    expect(msgRes.status).toBe(200);
    expect(msgRes.body.id).toBe(sessionId);
    expect(msgRes.body.version).toBe(2);
    expect(msgRes.body.messages.length).toBe(3); // open, student, patient
    expect(msgRes.body.messages[1].role).toBe('student');
    expect(msgRes.body.messages[2].role).toBe('patient');
  });

  it('enforces submission gate (422) until mandatory objectives are complete, then evaluates', async () => {
    const sessionRes = await request(app)
      .post('/api/sessions')
      .send({
        mode: 'custom',
        categoryId: 'depressive',
        difficulty: 'beginner',
        language: 'en',
      });

    const sessionId = sessionRes.body.id;

    // 1. Premature submit should fail with 422
    const premature = await request(app)
      .post(`/api/sessions/${sessionId}/diagnosis`)
      .send({
        diagnosis: 'Major Depressive Disorder',
        expectedVersion: 1,
      });

    expect(premature.status).toBe(422);
    expect(premature.body.error.code).toBe('INCOMPLETE_INTERVIEW');

    // 2. Complete objectives in repository
    const s = await repository.getSession(sessionId);
    expect(s).not.toBeNull();
    await repository.updateSession(sessionId, (sess) => {
      sess.progress.eligible = true;
      sess.progress.objectives.forEach((o) => (o.completed = true));
      sess.state = 'INTERVIEW_COMPLETE';
    });

    const refreshed = await repository.getSession(sessionId);

    // 3. Submit diagnosis
    const submitRes = await request(app)
      .post(`/api/sessions/${sessionId}/diagnosis`)
      .send({
        diagnosis: 'Major Depressive Disorder',
        reasoning: 'Persistent low mood and early morning awakening for 2 months.',
        expectedVersion: refreshed!.version,
      });

    expect(submitRes.status).toBe(200);
    expect(submitRes.body.state).toBe('EVALUATED');

    // 4. GET results
    const resultsRes = await request(app).get(`/api/sessions/${sessionId}/results`);
    expect(resultsRes.status).toBe(200);
    expect(resultsRes.body.sessionId).toBe(sessionId);
    expect(resultsRes.body.outcome).toBe('CORRECT');
    expect(resultsRes.body.approvedDiagnosis).toContain('Major Depressive Disorder');
    expect(resultsRes.body.rubric.length).toBe(5);
  });
});

import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/server.js';
import { repository } from '../src/db/repository.js';

describe('PsySim REST API Endpoints', () => {
  it('GET /api/scenarios/categories returns clinical categories', async () => {
    const res = await request(app).get('/api/scenarios/categories');
    expect(res.status).toBe(200);
    expect(res.body.categories).toHaveLength(7);
    expect(res.body.categories[0].name).toBe('Depressive Disorders');
  });

  it('GET /api/me returns user profile', async () => {
    const res = await request(app).get('/api/me');
    expect(res.status).toBe(200);
    expect(res.body.role).toBe('student');
    expect(res.body.name).toBeDefined();
  });

  it('POST /api/sessions creates a session with zero diagnosis leakage', async () => {
    const res = await request(app)
      .post('/api/sessions')
      .send({
        mode: 'CLINICAL_CHALLENGE',
        difficulty: 'BEGINNER',
      });

    expect(res.status).toBe(201);
    expect(res.body.session).toBeDefined();
    expect(res.body.session.id).toBeDefined();
    expect(res.body.session.patient.name).toBeDefined();
    expect(res.body.session.opening_message).toBeDefined();

    // STRICT SECURITY: No hidden diagnosis in response
    const jsonStr = JSON.stringify(res.body).toLowerCase();
    expect(jsonStr).not.toContain('approveddiagnosis');
    expect(jsonStr).not.toContain('accepteddiagnoses');
    expect(jsonStr).not.toContain('6a70');
  });

  it('enforces mandatory objective completion gate before diagnosis submission', async () => {
    // 1. Create a session with depressive_disorders category
    const createRes = await request(app)
      .post('/api/sessions')
      .send({
        mode: 'CUSTOM_CASE',
        difficulty: 'BEGINNER',
        categoryId: 'depressive_disorders',
      });

    const sessionId = createRes.body.session.id;

    // 2. Attempt to submit diagnosis immediately (Premature)
    const prematureSubmit = await request(app)
      .post(`/api/sessions/${sessionId}/diagnosis`)
      .send({
        diagnosis: 'Major Depressive Disorder',
      });

    expect(prematureSubmit.status).toBe(403);
    expect(prematureSubmit.body.error).toBe('SUBMISSION_LOCKED');
    expect(prematureSubmit.body.missing_objectives.length).toBeGreaterThan(0);

    // 3. Complete all mandatory objectives
    const objectives = await repository.getObjectives(sessionId);
    for (const obj of objectives) {
      await repository.updateObjective(sessionId, obj.id, {
        status: 'COMPLETED',
        evidenceQuote: 'Verified test inquiry',
        confidence: 0.95,
      });
    }

    // 4. Verify progress endpoint now reports can_submit_diagnosis: true
    const progressRes = await request(app).get(`/api/sessions/${sessionId}/progress`);
    expect(progressRes.status).toBe(200);
    expect(progressRes.body.can_submit_diagnosis).toBe(true);

    // 5. Submit diagnosis successfully
    const submitRes = await request(app)
      .post(`/api/sessions/${sessionId}/diagnosis`)
      .send({
        diagnosis: 'Major Depressive Disorder',
        clinicalReasoning: 'Vegetative depressive symptoms, early morning awakening, and anhedonia.',
      });

    expect(submitRes.status).toBe(200);
    expect(submitRes.body.status).toBe('EVALUATED');

    // 6. Prevent duplicate submission
    const duplicateSubmit = await request(app)
      .post(`/api/sessions/${sessionId}/diagnosis`)
      .send({
        diagnosis: 'Major Depressive Disorder',
      });

    expect(duplicateSubmit.status).toBe(400);
    expect(duplicateSubmit.body.error).toBe('SESSION_ALREADY_EVALUATED');

    // 7. View results after evaluation
    const resultsRes = await request(app).get(`/api/sessions/${sessionId}/results`);
    expect(resultsRes.status).toBe(200);
    expect(resultsRes.body.outcome).toBe('CORRECT');
    expect(resultsRes.body.actual_diagnosis.name).toBeDefined();
    expect(resultsRes.body.educational_rubric.domains).toHaveLength(5);
  });
});

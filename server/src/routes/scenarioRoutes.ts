import { Router } from 'express';
import { SCENARIO_CATEGORIES } from '../knowledge/seedScenarios.js';
import { repository } from '../db/repository.js';

export const scenarioRoutes = Router();

scenarioRoutes.get('/categories', (_req, res) => {
  res.json({ categories: SCENARIO_CATEGORIES });
});

scenarioRoutes.get('/', async (req, res, next) => {
  try {
    const { categoryId, difficulty } = req.query;
    const scenarios = await repository.getScenarios({
      categoryId: categoryId as string,
      difficulty: difficulty as any,
      status: 'APPROVED',
    });

    // Sanitized: Do NOT leak approved diagnoses or hidden answers
    const sanitized = scenarios.map((s) => ({
      id: s.id,
      categoryId: s.categoryId,
      categoryName: s.categoryName,
      difficulty: s.difficulty,
      patientName: s.patient.name,
      patientAge: s.patient.age,
      patientGender: s.patient.gender,
      patientOccupation: s.patient.occupation,
      language: s.patient.language,
    }));

    res.json({ scenarios: sanitized });
  } catch (err) {
    next(err);
  }
});

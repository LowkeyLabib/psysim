import { Router } from 'express';
import { SCENARIO_CATEGORIES } from '../knowledge/seedScenarios.js';
import { repository } from '../db/repository.js';

export const scenarioRoutes = Router();

// GET /api/scenarios/categories -> Category[]
scenarioRoutes.get('/categories', (_req, res) => {
  res.json(SCENARIO_CATEGORIES);
});

// GET /api/scenarios -> public metadata only
scenarioRoutes.get('/', async (_req, res, next) => {
  try {
    const list = await repository.getScenarios({ status: 'APPROVED' });
    const metadata = list.map((s) => ({
      available: true,
      categoryId: s.categoryId,
    }));
    res.json(metadata);
  } catch (err) {
    next(err);
  }
});

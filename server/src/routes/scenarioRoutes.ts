import { Router } from 'express';
import { SCENARIO_CATEGORIES } from '../knowledge/seedScenarios.js';
import { repository } from '../db/repository.js';

export const scenarioRoutes = Router();

// GET /api/scenarios/categories -> Category[]
scenarioRoutes.get('/categories', (_req, res) => {
  res.json(SCENARIO_CATEGORIES);
});

// GET /api/scenarios -> public availability metadata for clinically approved cases only
scenarioRoutes.get('/', async (req, res, next) => {
  try {
    const categoryId =
      typeof req.query.categoryId === 'string' && req.query.categoryId.trim()
        ? req.query.categoryId.trim()
        : undefined;
    const difficulty =
      typeof req.query.difficulty === 'string' && req.query.difficulty.trim()
        ? req.query.difficulty.trim()
        : undefined;
    const list = await repository.getScenarios({
      categoryId,
      difficulty,
      status: 'APPROVED',
    });
    const metadata = list.map((s) => ({
      available: true,
      categoryId: s.categoryId,
      difficulty: s.difficulty,
    }));
    res.json(metadata);
  } catch (err) {
    next(err);
  }
});

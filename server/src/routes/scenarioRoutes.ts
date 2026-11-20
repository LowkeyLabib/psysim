import { Router } from 'express';
import { SCENARIO_CATEGORIES } from '../knowledge/seedScenarios.js';
import { resolveRunnableScenarios } from '../knowledge/runnableScenarios.js';

export const scenarioRoutes = Router();

// GET /api/scenarios/categories -> Category[]
scenarioRoutes.get('/categories', (_req, res) => {
  res.json(SCENARIO_CATEGORIES);
});

// GET /api/scenarios -> public availability metadata for runnable cases (no hidden case details)
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
    const { approved, fallback } = await resolveRunnableScenarios({
      categoryId,
      difficulty,
    });
    const seen = new Set<string>();
    const metadata: {
      available: boolean;
      categoryId: string;
      difficulty: string;
      reviewed?: boolean;
    }[] = [];
    for (const s of approved) {
      const key = `${s.categoryId}:${s.difficulty}`;
      if (seen.has(key)) continue;
      seen.add(key);
      metadata.push({
        available: true,
        categoryId: s.categoryId,
        difficulty: s.difficulty,
      });
    }
    for (const s of fallback) {
      const key = `${s.categoryId}:${s.difficulty}`;
      if (seen.has(key)) continue;
      seen.add(key);
      metadata.push({
        available: true,
        categoryId: s.categoryId,
        difficulty: s.difficulty,
        reviewed: false,
      });
    }
    res.json(metadata);
  } catch (err) {
    next(err);
  }
});

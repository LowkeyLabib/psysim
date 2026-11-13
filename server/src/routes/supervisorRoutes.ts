import { Router, Request, Response, NextFunction } from 'express';
import { repository } from '../db/repository.js';
import { ReviewScenarioZod, ScenarioDraft } from '../types/index.js';

export const supervisorRoutes = Router();

// GET /api/supervisor/scenarios -> ScenarioDraft[]
supervisorRoutes.get('/scenarios', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const list = await repository.getScenarioDrafts();
    res.json(list);
  } catch (err) {
    next(err);
  }
});

// POST /api/supervisor/scenarios -> ScenarioDraft
supervisorRoutes.post('/scenarios', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const draft: ScenarioDraft = {
      id: `scen_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      version: 1,
      title: req.body.title || 'Untitled Scenario',
      categoryId: req.body.categoryId || 'depressive',
      difficulty: req.body.difficulty || 'beginner',
      status: 'PENDING_REVIEW',
      clinicalProfile: req.body.clinicalProfile || {},
      objectives: req.body.objectives || [],
      rubric: req.body.rubric || [],
      sourceReferences: req.body.sourceReferences || [],
    };
    const saved = await repository.saveScenarioDraft(draft);
    res.status(201).json(saved);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/supervisor/scenarios/:id -> ScenarioDraft
supervisorRoutes.patch('/scenarios/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const drafts = await repository.getScenarioDrafts();
    const existing = drafts.find((d) => d.id === req.params.id);
    if (!existing) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Scenario does not exist.' } });
      return;
    }

    if (req.body.expectedVersion !== undefined && req.body.expectedVersion !== existing.version) {
      res.status(409).json({ error: { code: 'VERSION_CONFLICT', message: 'Scenario changed. Refresh before saving.' } });
      return;
    }

    const updated: ScenarioDraft = {
      ...existing,
      ...req.body,
      status: 'DRAFT', // Editing approved material creates a DRAFT revision and invalidates approval
      version: existing.version + 1,
    };

    const saved = await repository.saveScenarioDraft(updated);
    res.json(saved);
  } catch (err) {
    next(err);
  }
});

// POST /api/supervisor/scenarios/:id/approve -> ScenarioDraft
supervisorRoutes.post('/scenarios/:id/approve', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = ReviewScenarioZod.parse(req.body);
    const updated = await repository.approveScenarioDraft(
      req.params.id,
      body.expectedVersion,
      body.decision,
      body.reviewNote
    );

    if (!updated) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Scenario does not exist.' } });
      return;
    }

    res.json(updated);
  } catch (err: any) {
    if (err.message?.includes('conflict')) {
      res.status(409).json({ error: { code: 'VERSION_CONFLICT', message: err.message } });
      return;
    }
    next(err);
  }
});

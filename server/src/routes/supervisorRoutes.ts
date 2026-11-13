import { Router, Request, Response, NextFunction } from 'express';
import { repository } from '../db/repository.js';
import { OFFICIAL_KNOWLEDGE_SOURCES } from '../knowledge/sources.js';
import { ScenarioTemplate } from '../types/index.js';

export const supervisorRoutes = Router();

// GET /api/supervisor/scenarios
supervisorRoutes.get('/scenarios', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const list = await repository.getScenarios();
    res.json({ scenarios: list });
  } catch (err) {
    next(err);
  }
});

// POST /api/supervisor/scenarios
supervisorRoutes.post('/scenarios', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const scenarioData: ScenarioTemplate = {
      ...req.body,
      id: req.body.id || `scen_sup_${Date.now()}`,
      reviewStatus: 'PENDING_REVIEW',
    };
    const saved = await repository.saveScenario(scenarioData);
    res.status(201).json({ scenario: saved });
  } catch (err) {
    next(err);
  }
});

// POST /api/supervisor/scenarios/:id/approve
supervisorRoutes.post('/scenarios/:id/approve', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const status = req.body.status === 'REJECTED' ? 'REJECTED' : 'APPROVED';
    const updated = await repository.approveScenario(req.params.id, status);
    if (!updated) {
      res.status(404).json({ error: 'SCENARIO_NOT_FOUND', message: 'Scenario does not exist.' });
      return;
    }
    res.json({ scenario: updated });
  } catch (err) {
    next(err);
  }
});

// GET /api/supervisor/sources
supervisorRoutes.get('/sources', (_req: Request, res: Response) => {
  res.json({ sources: OFFICIAL_KNOWLEDGE_SOURCES });
});

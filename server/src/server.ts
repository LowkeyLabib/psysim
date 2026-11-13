import express from 'express';
import cors from 'cors';
import { config } from './config/index.js';
import { authMiddleware, requireRole } from './middleware/auth.js';
import { rateLimiter } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/errorHandler.js';
import { scenarioRoutes } from './routes/scenarioRoutes.js';
import { sessionRoutes } from './routes/sessionRoutes.js';
import { supervisorRoutes } from './routes/supervisorRoutes.js';
import { repository, InMemoryRepository, setRepository } from './db/repository.js';
import { SEED_SCENARIOS } from './knowledge/seedScenarios.js';
import { SessionSummary, SessionPage, UserProfile } from './types/index.js';

export const app = express();

// Initialize in-memory repository with seed clinical scenarios
setRepository(new InMemoryRepository(SEED_SCENARIOS));

app.use(
  cors({
    origin: '*',
    credentials: true,
  })
);
app.use(express.json());
app.use(rateLimiter(200, 60000));
app.use(authMiddleware);

// GET /api/me -> UserProfile
app.get('/api/me', (req, res) => {
  const profile: UserProfile = {
    id: req.user?.id || 'demo-student',
    displayName: req.user?.displayName || 'Demo learner',
    email: req.user?.email || 'demo@psysim.edu',
    role: req.user?.role || 'student',
  };
  res.json(profile);
});

// GET /api/me/sessions -> SessionPage
app.get('/api/me/sessions', async (req, res, next) => {
  try {
    const list = await repository.getUserSessions(req.user?.id || 'demo-student');
    const items: SessionSummary[] = await Promise.all(
      list.map(async (s) => {
        const evalRecord = await repository.getEvaluation(s.id);
        return {
          id: s.id,
          patientName: s.patient.name,
          mode: s.mode,
          difficulty: s.difficulty,
          state: s.state,
          createdAt: s.createdAt,
          outcome: evalRecord?.outcome || undefined,
        };
      })
    );

    const completed = items.filter((s) => s.state === 'EVALUATED').length;
    const correct = items.filter((s) => s.outcome === 'CORRECT').length;
    const graded = items.filter((s) => s.outcome && s.outcome !== 'REVIEW_REQUIRED').length;

    const page: SessionPage = {
      items: items.reverse(),
      nextCursor: null,
      stats: {
        completed,
        correct,
        graded,
        total: items.length,
      },
    };

    res.json(page);
  } catch (err) {
    next(err);
  }
});

// Routers
app.use('/api/scenarios', scenarioRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/supervisor', supervisorRoutes);

// Health Check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'healthy', provider: config.aiProvider, timestamp: new Date().toISOString() });
});

// Central Error Handler
app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
  app.listen(config.port, () => {
    console.log(`[PsySim Server] Running on http://localhost:${config.port}`);
    console.log(`[PsySim Server] AI Provider: ${config.aiProvider}`);
  });
}

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

export const app = express();

// Initialize in-memory seed scenarios
setRepository(new InMemoryRepository(SEED_SCENARIOS));

app.use(
  cors({
    origin: config.corsOrigin,
    credentials: true,
  })
);
app.use(express.json());
app.use(rateLimiter(200, 60000));
app.use(authMiddleware);

// User Profile routes
app.get('/api/me', (req, res) => {
  res.json({
    id: req.user?.id,
    name: req.user?.name,
    email: req.user?.email,
    role: req.user?.role,
    created_at: new Date().toISOString(),
  });
});

app.get('/api/me/sessions', async (req, res, next) => {
  try {
    const list = await repository.getUserSessions(req.user?.id || 'usr_student_demo');
    const formatted = await Promise.all(
      list.map(async (s) => {
        const evalRecord = await repository.getEvaluation(s.id);
        return {
          id: s.id,
          mode: s.mode,
          difficulty: s.difficulty,
          status: s.status,
          patient_name: s.patient.name,
          patient_age: s.patient.age,
          outcome: evalRecord?.outcome || null,
          created_at: s.createdAt,
          completed_at: s.completedAt || null,
        };
      })
    );
    res.json({ sessions: formatted });
  } catch (err) {
    next(err);
  }
});

// Main API Endpoints
app.use('/api/scenarios', scenarioRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/supervisor', requireRole(['supervisor', 'admin']), supervisorRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Central Error Handler
app.use(errorHandler);

// Only listen if not imported by test runner
if (process.env.NODE_ENV !== 'test') {
  app.listen(config.port, () => {
    console.log(`[PsySim Server] Running on http://localhost:${config.port}`);
    console.log(`[PsySim Server] AI Provider: ${config.aiProvider}`);
  });
}

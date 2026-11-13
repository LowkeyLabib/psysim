import { Router, Request, Response, NextFunction } from 'express';
import { CreateSessionZod, SendMessageZod, SubmitDiagnosisZod } from '../types/index.js';
import { repository } from '../db/repository.js';
import { PatientSimulationEngine } from '../simulation/engine.js';
import { InterviewEvaluator } from '../interview/evaluator.js';
import { DiagnosisMatcher } from '../diagnosis/matcher.js';
import { FeedbackGenerator } from '../feedback/rubric.js';

export const sessionRoutes = Router();
const simulationEngine = new PatientSimulationEngine();

// POST /api/sessions — Create a new clinical simulation session
sessionRoutes.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const idempotencyKey = req.headers['idempotency-key'] as string;
    if (idempotencyKey) {
      const cached = repository.getIdempotencyReceipt(idempotencyKey);
      if (cached) {
        res.status(200).json(cached);
        return;
      }
    }

    const body = CreateSessionZod.parse(req.body);
    const userId = req.user?.id || 'demo-student';
    const clientApiKey = (req.headers['x-gemini-api-key'] as string) || undefined;

    // Filter approved scenarios
    let scenarios = await repository.getScenarios({
      categoryId: body.mode === 'custom' ? body.categoryId || undefined : undefined,
      difficulty: body.difficulty,
      status: 'APPROVED',
    });

    if (scenarios.length === 0) {
      scenarios = await repository.getScenarios({ status: 'APPROVED' });
    }

    if (scenarios.length === 0) {
      res.status(404).json({
        error: {
          code: 'SCENARIO_NOT_FOUND',
          message: 'No clinically approved psychiatric scenario matching criteria.',
        },
      });
      return;
    }

    // Select scenario
    const selected = scenarios[Math.floor(Math.random() * scenarios.length)];
    const isLive = Boolean(clientApiKey || process.env.GEMINI_API_KEY);

    const session = await repository.createSession({
      userId,
      scenario: selected,
      mode: body.mode,
      difficulty: body.difficulty,
      language: body.language,
      isLive,
    });

    if (idempotencyKey) {
      repository.saveIdempotencyReceipt(idempotencyKey, session);
    }

    res.status(201).json(session);
  } catch (err) {
    next(err);
  }
});

// GET /api/sessions/:id — Retrieve full public session snapshot
sessionRoutes.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const session = await repository.getSession(req.params.id);
    if (!session) {
      res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Session does not exist.' },
      });
      return;
    }

    res.json(session);
  } catch (err) {
    next(err);
  }
});

// GET /api/sessions/:id/messages — Retrieve transcript messages
sessionRoutes.get('/:id/messages', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const session = await repository.getSession(req.params.id);
    if (!session) {
      res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Session does not exist.' },
      });
      return;
    }

    res.json(session.messages);
  } catch (err) {
    next(err);
  }
});

// POST /api/sessions/:id/messages — Send student message & receive patient response
sessionRoutes.post('/:id/messages', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const idempotencyKey = req.headers['idempotency-key'] as string;
    if (idempotencyKey) {
      const cached = repository.getIdempotencyReceipt(idempotencyKey);
      if (cached) {
        res.status(200).json(cached);
        return;
      }
    }

    const body = SendMessageZod.parse(req.body);
    const session = await repository.getSession(req.params.id);

    if (!session) {
      res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Session does not exist.' },
      });
      return;
    }

    if (!['IN_PROGRESS', 'INTERVIEW_COMPLETE'].includes(session.state)) {
      res.status(409).json({
        error: { code: 'SESSION_FINALIZED', message: 'This consultation is already finalized.' },
      });
      return;
    }

    if (body.expectedVersion !== undefined && body.expectedVersion !== session.version) {
      res.status(409).json({
        error: {
          code: 'VERSION_CONFLICT',
          message: 'Session has changed. Refresh before continuing.',
        },
      });
      return;
    }

    const scenario = await repository.getScenario(session.id);
    if (!scenario) {
      res.status(500).json({
        error: { code: 'SCENARIO_MISSING', message: 'Scenario profile is missing.' },
      });
      return;
    }

    const clientApiKey = (req.headers['x-gemini-api-key'] as string) || undefined;
    const now = new Date().toISOString();

    // 1. Append student message
    const studentMsg = {
      id: `msg_stu_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      role: 'student' as const,
      content: body.content.trim(),
      createdAt: now,
    };
    session.messages.push(studentMsg);

    // 2. Generate patient response
    const { response: patientContent, isLive } = await simulationEngine.generatePatientResponse(
      scenario,
      session.messages,
      body.content,
      session.language,
      clientApiKey
    );

    const patientMsg = {
      id: `msg_pat_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      role: 'patient' as const,
      content: patientContent,
      createdAt: new Date().toISOString(),
    };
    session.messages.push(patientMsg);

    // 3. Evaluate progress
    const evalProgress = InterviewEvaluator.evaluateProgress(
      session.messages,
      scenario,
      session.progress.objectives
    );
    session.progress = evalProgress;

    if (evalProgress.eligible && session.state === 'IN_PROGRESS') {
      session.state = 'INTERVIEW_COMPLETE';
    }

    if (isLive) {
      session.simulation = 'live';
    }

    // 4. Commit session
    const updated = await repository.updateSession(session.id, (s) => {
      s.messages = session.messages;
      s.progress = session.progress;
      s.state = session.state;
      s.simulation = session.simulation;
    });

    if (idempotencyKey && updated) {
      repository.saveIdempotencyReceipt(idempotencyKey, updated);
    }

    res.status(200).json(updated);
  } catch (err) {
    next(err);
  }
});

// GET /api/sessions/:id/progress — Check interview objectives progress
sessionRoutes.get('/:id/progress', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const session = await repository.getSession(req.params.id);
    if (!session) {
      res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Session does not exist.' },
      });
      return;
    }

    res.json(session.progress);
  } catch (err) {
    next(err);
  }
});

// POST /api/sessions/:id/diagnosis — Submit final diagnostic formulation
sessionRoutes.post('/:id/diagnosis', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const idempotencyKey = req.headers['idempotency-key'] as string;
    if (idempotencyKey) {
      const cached = repository.getIdempotencyReceipt(idempotencyKey);
      if (cached) {
        res.status(200).json(cached);
        return;
      }
    }

    const body = SubmitDiagnosisZod.parse(req.body);
    const session = await repository.getSession(req.params.id);

    if (!session) {
      res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Session does not exist.' },
      });
      return;
    }

    if (session.state === 'EVALUATED' || session.state === 'DIAGNOSIS_SUBMITTED') {
      res.status(409).json({
        error: {
          code: 'ALREADY_EVALUATED',
          message: 'A final diagnosis has already been submitted for this session.',
        },
      });
      return;
    }

    if (session.state !== 'INTERVIEW_COMPLETE' || !session.progress.eligible) {
      res.status(422).json({
        error: {
          code: 'INCOMPLETE_INTERVIEW',
          message: 'Complete the required interview areas before submitting your diagnosis.',
        },
      });
      return;
    }

    if (body.expectedVersion !== undefined && body.expectedVersion !== session.version) {
      res.status(409).json({
        error: {
          code: 'VERSION_CONFLICT',
          message: 'Session has changed. Refresh before submitting.',
        },
      });
      return;
    }

    const scenario = await repository.getScenario(session.id);
    if (!scenario) {
      res.status(500).json({
        error: { code: 'SCENARIO_MISSING', message: 'Scenario profile missing.' },
      });
      return;
    }

    // Match diagnosis
    const matchResult = DiagnosisMatcher.evaluate(body.diagnosis, scenario);

    // Generate educational rubric and claims
    const evaluation = FeedbackGenerator.generateEvaluation({
      sessionId: session.id,
      submittedDiagnosis: body.diagnosis,
      submittedReasoning: body.reasoning,
      scenario,
      transcript: session.messages,
      objectives: session.progress.objectives,
      matchResult,
    });

    await repository.saveEvaluation(evaluation);

    // Update session state
    const updated = await repository.updateSession(session.id, (s) => {
      s.state = 'EVALUATED';
    });

    if (idempotencyKey && updated) {
      repository.saveIdempotencyReceipt(idempotencyKey, updated);
    }

    res.status(200).json(updated);
  } catch (err) {
    next(err);
  }
});

// GET /api/sessions/:id/results — Retrieve post-session clinical results & feedback
sessionRoutes.get('/:id/results', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const session = await repository.getSession(req.params.id);
    if (!session) {
      res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Session does not exist.' },
      });
      return;
    }

    if (session.state !== 'EVALUATED') {
      res.status(409).json({
        error: {
          code: 'NOT_YET_EVALUATED',
          message: 'Session evaluation is still in progress.',
        },
      });
      return;
    }

    const evaluation = await repository.getEvaluation(session.id);
    if (!evaluation) {
      res.status(404).json({
        error: { code: 'EVALUATION_MISSING', message: 'Evaluation results not found.' },
      });
      return;
    }

    res.json(evaluation);
  } catch (err) {
    next(err);
  }
});

import { Router, Request, Response, NextFunction } from 'express';
import { CreateSessionSchema, SendMessageSchema, SubmitDiagnosisSchema } from '../types/index.js';
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
    const body = CreateSessionSchema.parse(req.body);
    const userId = req.user?.id || 'usr_student_demo';

    // Fetch approved scenarios
    let scenarios = await repository.getScenarios({
      categoryId: body.categoryId || undefined,
      difficulty: body.difficulty,
      status: 'APPROVED',
    });

    if (scenarios.length === 0) {
      scenarios = await repository.getScenarios({ status: 'APPROVED' });
    }

    if (scenarios.length === 0) {
      res.status(404).json({
        error: 'SCENARIO_NOT_FOUND',
        message: 'No clinically approved psychiatric scenario matching criteria.',
      });
      return;
    }

    // Select random scenario within matched list
    const selectedScenario = scenarios[Math.floor(Math.random() * scenarios.length)];

    // Create session in repository
    const session = await repository.createSession({
      userId,
      scenarioId: selectedScenario.id,
      mode: body.mode,
      difficulty: body.difficulty,
      patient: selectedScenario.patient,
    });

    // Initialize mandatory objectives
    await repository.initObjectives(session.id, selectedScenario);

    // Seed patient opening statement
    await repository.addMessage(session.id, 'patient', selectedScenario.openingMessage);

    // Return sanitized session (ZERO DIAGNOSIS LEAKAGE)
    res.status(201).json({
      session: {
        id: session.id,
        mode: session.mode,
        difficulty: session.difficulty,
        status: session.status,
        patient: session.patient,
        opening_message: selectedScenario.openingMessage,
        created_at: session.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/sessions/:id — Retrieve session metadata
sessionRoutes.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const session = await repository.getSession(req.params.id);
    if (!session) {
      res.status(404).json({ error: 'SESSION_NOT_FOUND', message: 'Session does not exist.' });
      return;
    }

    res.json({
      id: session.id,
      status: session.status,
      mode: session.mode,
      difficulty: session.difficulty,
      patient: session.patient,
      created_at: session.createdAt,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/sessions/:id/messages — Retrieve conversation transcript
sessionRoutes.get('/:id/messages', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const messages = await repository.getMessages(req.params.id);
    res.json({ messages });
  } catch (err) {
    next(err);
  }
});

// POST /api/sessions/:id/messages — Send student message & receive patient response
sessionRoutes.post('/:id/messages', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = SendMessageSchema.parse(req.body);
    const session = await repository.getSession(req.params.id);

    if (!session) {
      res.status(404).json({ error: 'SESSION_NOT_FOUND', message: 'Session does not exist.' });
      return;
    }

    if (session.status === 'DIAGNOSIS_SUBMITTED' || session.status === 'EVALUATED') {
      res.status(400).json({
        error: 'SESSION_CONCLUDED',
        message: 'This consultation session is already finalized and cannot receive more messages.',
      });
      return;
    }

    const scenario = await repository.getScenario(session.scenarioId);
    if (!scenario) {
      res.status(500).json({ error: 'SCENARIO_MISSING', message: 'Scenario template missing.' });
      return;
    }

    // 1. Record student message
    await repository.addMessage(session.id, 'student', body.content);

    // 2. Update session state to IN_PROGRESS if first exchange
    if (session.status === 'CREATED') {
      await repository.updateSessionStatus(session.id, 'IN_PROGRESS');
    }

    // 3. Generate patient response from AI engine
    const chatHistory = await repository.getMessages(session.id);
    const patientReply = await simulationEngine.generatePatientResponse(
      scenario,
      chatHistory,
      body.content
    );

    const savedPatientMsg = await repository.addMessage(session.id, 'patient', patientReply);

    // 4. Update transcript and evaluate interview objectives
    const updatedHistory = await repository.getMessages(session.id);
    const currentObjectives = await repository.getObjectives(session.id);
    const evaluatedObjectives = InterviewEvaluator.evaluateProgress(
      updatedHistory,
      scenario,
      currentObjectives
    );

    for (const obj of evaluatedObjectives) {
      await repository.updateObjective(session.id, obj.id, obj);
    }

    // 5. Check if all mandatory objectives are completed
    const eligibility = InterviewEvaluator.isSubmissionEligible(evaluatedObjectives);
    if (eligibility.eligible && session.status === 'IN_PROGRESS') {
      await repository.updateSessionStatus(session.id, 'INTERVIEW_COMPLETE');
    }

    const mandatoryList = evaluatedObjectives.filter((o) => o.isMandatory);
    const completedCount = mandatoryList.filter((o) => o.status === 'COMPLETED').length;

    res.json({
      patient_message: savedPatientMsg,
      progress: {
        interview_complete: eligibility.eligible,
        completed_mandatory_count: completedCount,
        total_mandatory_count: mandatoryList.length,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/sessions/:id/progress — Check interview objective progress & submission eligibility
sessionRoutes.get('/:id/progress', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const session = await repository.getSession(req.params.id);
    if (!session) {
      res.status(404).json({ error: 'SESSION_NOT_FOUND', message: 'Session does not exist.' });
      return;
    }

    const objectives = await repository.getObjectives(session.id);
    const eligibility = InterviewEvaluator.isSubmissionEligible(objectives);

    res.json({
      interview_complete: eligibility.eligible,
      can_submit_diagnosis: eligibility.eligible && session.status !== 'EVALUATED',
      objectives,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/sessions/:id/diagnosis — Submit final diagnosis
sessionRoutes.post('/:id/diagnosis', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = SubmitDiagnosisSchema.parse(req.body);
    const session = await repository.getSession(req.params.id);

    if (!session) {
      res.status(404).json({ error: 'SESSION_NOT_FOUND', message: 'Session does not exist.' });
      return;
    }

    if (session.status === 'EVALUATED' || session.status === 'DIAGNOSIS_SUBMITTED') {
      res.status(400).json({
        error: 'SESSION_ALREADY_EVALUATED',
        message: 'A final diagnosis has already been submitted and evaluated for this session.',
      });
      return;
    }

    const objectives = await repository.getObjectives(session.id);
    const eligibility = InterviewEvaluator.isSubmissionEligible(objectives);

    // GATE: Block premature diagnosis submission
    if (!eligibility.eligible) {
      res.status(403).json({
        error: 'SUBMISSION_LOCKED',
        message: 'Mandatory clinical interview objectives have not been completed.',
        missing_objectives: eligibility.missingMandatory.map((m) => m.title),
      });
      return;
    }

    const scenario = await repository.getScenario(session.scenarioId);
    if (!scenario) {
      res.status(500).json({ error: 'SCENARIO_MISSING', message: 'Scenario template missing.' });
      return;
    }

    const transcript = await repository.getMessages(session.id);
    const matchResult = DiagnosisMatcher.evaluate(body.diagnosis, scenario);

    const evaluation = FeedbackGenerator.generateEvaluation({
      sessionId: session.id,
      submittedDiagnosis: body.diagnosis,
      clinicalReasoning: body.clinicalReasoning,
      scenario,
      transcript,
      objectives,
      matchResult,
    });

    await repository.saveEvaluation(evaluation);
    await repository.updateSessionStatus(session.id, 'EVALUATED');

    res.json({
      status: 'EVALUATED',
      evaluation_id: evaluation.id,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/sessions/:id/results — View post-session evaluation & actual diagnosis
sessionRoutes.get('/:id/results', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const session = await repository.getSession(req.params.id);
    if (!session) {
      res.status(404).json({ error: 'SESSION_NOT_FOUND', message: 'Session does not exist.' });
      return;
    }

    if (session.status !== 'EVALUATED') {
      res.status(403).json({
        error: 'NOT_EVALUATED',
        message: 'Results become visible only after diagnosis submission is finalized.',
      });
      return;
    }

    const evaluation = await repository.getEvaluation(session.id);
    if (!evaluation) {
      res.status(404).json({ error: 'EVALUATION_NOT_FOUND', message: 'Evaluation missing.' });
      return;
    }

    res.json({
      session_id: session.id,
      outcome: evaluation.outcome,
      actual_diagnosis: evaluation.actualDiagnosis,
      submitted_diagnosis: evaluation.submittedDiagnosis,
      clinical_reasoning: evaluation.clinicalReasoning,
      outcome_explanation: evaluation.outcomeExplanation,
      key_positive_findings: evaluation.keyPositiveFindings,
      relevant_negative_findings: evaluation.relevantNegativeFindings,
      educational_rubric: evaluation.rubric,
      learning_points: evaluation.learningPoints,
      evaluated_at: evaluation.evaluatedAt,
    });
  } catch (err) {
    next(err);
  }
});

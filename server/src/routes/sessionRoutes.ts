import { Router, Request } from "express";
import { createHash, randomUUID } from "node:crypto";
import {
  CreateSessionZod,
  SendMessageZod,
  SubmitDiagnosisZod,
  PublicSession,
} from "../types";
import { repository } from "../db/repository";
import { PatientSimulationEngine } from "../simulation/engine";
import { InterviewEvaluator } from "../interview/evaluator";
import { DiagnosisMatcher } from "../diagnosis/matcher";
import { FeedbackGenerator } from "../feedback/rubric";
import { AppError } from "../middleware/AppError";
import { config } from "../config";
export const sessionRoutes = Router();
export const simulationEngine = new PatientSimulationEngine();
const hash = (s: string) => createHash("sha256").update(s).digest("hex");
function receipt(req: Request, body: unknown) {
  const key = req.get("Idempotency-Key");
  if (!key || key.length > 200)
    throw new AppError(
      422,
      "REQUEST_KEY_REQUIRED",
      "Provide a valid request key.",
    );
  return {
    key: hash(`${req.user!.id}:${req.method}:${req.originalUrl}:${key}`),
    signature: hash(JSON.stringify(body)),
  };
}
async function own(req: Request): Promise<PublicSession> {
  if (!(await repository.owns(req.params.id, req.user!.id)))
    throw new AppError(404, "NOT_FOUND", "Session does not exist.");
  const s = await repository.getSession(req.params.id);
  if (!s) throw new AppError(404, "NOT_FOUND", "Session does not exist.");
  return s;
}
function version(s: PublicSession, v: number) {
  if (s.version !== v)
    throw new AppError(
      409,
      "VERSION_CONFLICT",
      "Session changed. Refresh before continuing.",
    );
}
sessionRoutes.post("/", async (req, res, next) => {
  try {
    const body = CreateSessionZod.parse(req.body),
      r = receipt(req, body);
    const s = await repository.exclusive(`create:${r.key}`, async () => {
      const cached = await repository.getIdempotencyReceipt(r.key, r.signature);
      if (cached) return cached;
      const candidates = await repository.getScenarios({
        categoryId: body.mode === "custom" ? body.categoryId : undefined,
        difficulty: body.difficulty,
      });
      const approved = candidates.filter((s) => s.reviewStatus === "APPROVED");
      const available = approved.length
        ? approved
        : config.allowUnreviewed
          ? candidates.filter(
              (s) => s.demonstration && s.reviewStatus === "DRAFT",
            )
          : [];
      if (!available.length)
        throw new AppError(
          404,
          "SCENARIO_NOT_FOUND",
          body.mode === "custom"
            ? "No reviewed case is available for this category and difficulty."
            : "No reviewed case is available for this difficulty.",
        );
      const scenario = available[Math.floor(Math.random() * available.length)];
      return repository.createSession({
        userId: req.user!.id,
        scenario,
        mode: body.mode,
        difficulty: body.difficulty,
        language: body.language,
        isLive: simulationEngine.provider.name !== "mock",
        receipt: r,
      });
    });
    res.status(201).json(s);
  } catch (e) {
    next(e);
  }
});
for (const suffix of ["", "/messages", "/progress"])
  sessionRoutes.get(`/:id${suffix}`, async (req, res, next) => {
    try {
      const s = await own(req);
      res.json(
        suffix === "/messages"
          ? s.messages
          : suffix === "/progress"
            ? s.progress
            : s,
      );
    } catch (e) {
      next(e);
    }
  });
sessionRoutes.post("/:id/messages", async (req, res, next) => {
  try {
    const body = SendMessageZod.parse(req.body),
      r = receipt(req, body);
    const updated = await repository.exclusive(
      `session:${req.params.id}`,
      async () => {
        const session = await own(req);
        const cached = await repository.getIdempotencyReceipt(r.key, r.signature);
        if (cached) return cached;
        version(session, body.expectedVersion);
        if (!["IN_PROGRESS", "INTERVIEW_COMPLETE"].includes(session.state))
          throw new AppError(
            409,
            "SESSION_FINALIZED",
            "This interview is finalized.",
          );
        if (session.messages.length >= 161)
          throw new AppError(
            422,
            "INTERVIEW_LIMIT",
            "This interview has reached 80 turns. Complete your diagnosis if eligible, or start a new session.",
          );
        const profile = await repository.getScenario(session.id);
        if (!profile)
          throw new AppError(
            500,
            "PROFILE_MISSING",
            "The case could not be loaded.",
          );
        const { response } = await simulationEngine.generatePatientResponse(
          profile,
          session.messages,
          body.content,
          session.language,
        );
        session.messages.push(
          {
            id: randomUUID(),
            role: "student",
            content: body.content,
            createdAt: new Date().toISOString(),
          },
          {
            id: randomUUID(),
            role: "patient",
            content: response,
            createdAt: new Date().toISOString(),
          },
        );
        session.progress = await InterviewEvaluator.assess(
          session.messages,
          profile,
          session.progress.objectives,
          simulationEngine.provider,
        );
        session.state = session.progress.eligible
          ? "INTERVIEW_COMPLETE"
          : "IN_PROGRESS";
        return repository.commitSession(
          session,
          body.expectedVersion,
          undefined,
          r,
        );
      },
    );
    res.json(updated);
  } catch (e) {
    next(e);
  }
});
sessionRoutes.post("/:id/diagnosis", async (req, res, next) => {
  try {
    const body = SubmitDiagnosisZod.parse(req.body),
      r = receipt(req, body);
    const updated = await repository.exclusive(
      `session:${req.params.id}`,
      async () => {
        const session = await own(req);
        const cached = await repository.getIdempotencyReceipt(r.key, r.signature);
        if (cached) return cached;
        version(session, body.expectedVersion);
        if (session.state === "EVALUATED")
          throw new AppError(
            409,
            "ALREADY_EVALUATED",
            "A final diagnosis has already been submitted.",
          );
        const required = session.progress.objectives.filter((o) => o.required);
        const evidenceValid =
          required.length > 0 &&
          required.every(
            (o) =>
              o.completed &&
              o.confidence !== null &&
              o.confidence >= 0.88 &&
              ["student", "patient"].every((role) =>
                session.messages.some(
                  (m) => m.role === role && o.evidenceMessageIds.includes(m.id),
                ),
              ),
          );
        if (
          session.state !== "INTERVIEW_COMPLETE" ||
          !session.progress.eligible ||
          !evidenceValid
        )
          throw new AppError(
            422,
            "INCOMPLETE_INTERVIEW",
            "Complete the required interview areas before submitting your diagnosis.",
          );
        const scenario = await repository.getScenario(session.id);
        if (!scenario)
          throw new AppError(
            500,
            "PROFILE_MISSING",
            "The case could not be loaded.",
          );
        const matchResult = await DiagnosisMatcher.assess(
          body.diagnosis,
          scenario,
          simulationEngine.provider,
        );
        const evaluation = FeedbackGenerator.generateEvaluation({
          sessionId: session.id,
          submittedDiagnosis: body.diagnosis,
          submittedReasoning: body.reasoning,
          scenario,
          transcript: session.messages,
          objectives: session.progress.objectives,
          matchResult,
        });
        session.state = "EVALUATED";
        return repository.commitSession(
          session,
          body.expectedVersion,
          evaluation,
          r,
        );
      },
    );
    res.json(updated);
  } catch (e) {
    next(e);
  }
});
sessionRoutes.get("/:id/results", async (req, res, next) => {
  try {
    const s = await own(req);
    if (s.state !== "EVALUATED")
      throw new AppError(
        409,
        "NOT_YET_EVALUATED",
        "Submit your diagnosis after completing the interview.",
      );
    const result = await repository.getEvaluation(s.id);
    if (!result)
      throw new AppError(404, "EVALUATION_MISSING", "Results are unavailable.");
    res.json(result);
  } catch (e) {
    next(e);
  }
});

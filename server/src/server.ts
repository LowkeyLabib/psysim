import express from "express";
import cors from "cors";
import { config } from "./config";
import { authMiddleware, developmentLogin } from "./middleware/auth";
import { rateLimiter } from "./middleware/rateLimiter";
import { errorHandler } from "./middleware/errorHandler";
import { AppError } from "./middleware/AppError";
import { scenarioRoutes } from "./routes/scenarioRoutes";
import { sessionRoutes } from "./routes/sessionRoutes";
import { supervisorRoutes } from "./routes/supervisorRoutes";
import { repository, SqliteRepository, setRepository } from "./db/repository";
import { SEED_SCENARIOS } from "./knowledge/seedScenarios";
import { SessionSummary } from "./types";
export const app = express();
app.disable("x-powered-by");
app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json({ limit: "128kb" }));
app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  // Cookie authentication is local-only; prevent cross-origin state-changing requests.
  if (
    !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
    req.headers.origin &&
    req.headers.origin !== config.corsOrigin
  )
    return next(
      new AppError(
        403,
        "ORIGIN_REJECTED",
        "This request origin is not allowed.",
      ),
    );
  next();
});
app.use(rateLimiter(200, 60000));
app.get("/api/health", (_req, res) =>
  res.json({
    status: "healthy",
    provider: config.aiProvider,
    development: config.nodeEnv !== "production",
    unreviewedCases: config.allowUnreviewed,
  }),
);
app.post("/api/auth/development", developmentLogin);
app.post("/api/auth/logout", (_req, res) => {
  res.clearCookie("psysim_dev", { path: "/api" });
  res.json({ success: true });
});
app.use("/api", authMiddleware);
app.get("/api/me", (req, res) => res.json(req.user));
app.get("/api/me/sessions", async (req, res, next) => {
  try {
    const list = (await repository.getUserSessions(req.user!.id)).sort(
      (a, b) =>
        b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id),
    );
    const items: SessionSummary[] = await Promise.all(
      list.map(async (s) => ({
        id: s.id,
        patientName: s.patient.name,
        mode: s.mode,
        difficulty: s.difficulty,
        state: s.state,
        createdAt: s.createdAt,
        outcome: (await repository.getEvaluation(s.id))?.outcome,
      })),
    );
    const cursor =
      typeof req.query.cursor === "string" ? req.query.cursor : undefined;
    const position = cursor ? items.findIndex((s) => s.id === cursor) : -1;
    if (cursor && position < 0)
      throw new AppError(422, "INVALID_CURSOR", "Reload the session history.");
    const requested = Number(req.query.limit || 20);
    if (!Number.isInteger(requested) || requested < 1 || requested > 100)
      throw new AppError(
        422,
        "INVALID_LIMIT",
        "History page size must be between 1 and 100.",
      );
    const page = items.slice(position + 1, position + 1 + requested);
    res.json({
      items: page,
      nextCursor:
        position + 1 + requested < items.length
          ? page[page.length - 1].id
          : null,
      stats: {
        total: items.length,
        completed: items.filter((s) => s.state === "EVALUATED").length,
        correct: items.filter((s) => s.outcome === "CORRECT").length,
        graded: items.filter(
          (s) => s.outcome && s.outcome !== "REVIEW_REQUIRED",
        ).length,
      },
    });
  } catch (e) {
    next(e);
  }
});
app.use("/api/scenarios", scenarioRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/supervisor", supervisorRoutes);
app.use((_req, _res, next) =>
  next(new AppError(404, "NOT_FOUND", "This endpoint does not exist.")),
);
app.use(errorHandler);
if (config.nodeEnv !== "test") {
  if (config.nodeEnv === "production" && !config.supabase.isConfigured)
    throw new Error(
      "Production requires Supabase authentication configuration.",
    );
  if (config.nodeEnv === "production" && !process.env.DATABASE_FILE)
    throw new Error(
      "Production requires DATABASE_FILE on a persistent volume and a single server process.",
    );
  const store = new SqliteRepository(config.databaseFile, SEED_SCENARIOS);
  setRepository(store);
  const server = app.listen(config.port, config.host, () =>
    console.log(
      `[PsySim] Listening on ${config.host}:${config.port}; provider: ${config.aiProvider}`,
    ),
  );
  for (const signal of ["SIGINT", "SIGTERM"] as const)
    process.once(signal, () =>
      server.close(() => {
        store.close();
        process.exit(0);
      }),
    );
}

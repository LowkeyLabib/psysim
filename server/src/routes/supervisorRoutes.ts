import { Router } from "express";
import { randomUUID } from "node:crypto";
import { repository } from "../db/repository";
import { ReviewScenarioZod } from "../types";
import { ScenarioInputZod, validateForReview } from "../types/scenarioSchema";
import { requireRole } from "../middleware/auth";
import { AppError } from "../middleware/AppError";
export const supervisorRoutes = Router();
supervisorRoutes.use(requireRole(["supervisor", "administrator"]));
supervisorRoutes.get("/scenarios", async (_req, res, next) => {
  try {
    res.json(await repository.getScenarioDrafts());
  } catch (e) {
    next(e);
  }
});
for (const method of ["post", "patch"] as const)
  supervisorRoutes[method](
    method === "post" ? "/scenarios" : "/scenarios/:id",
    async (req, res, next) => {
      try {
        const { expectedVersion, ...input } = ScenarioInputZod.parse(req.body);
        if (method === "patch" && !expectedVersion)
          throw new AppError(
            422,
            "VERSION_REQUIRED",
            "Reload this revision before saving.",
          );
        const id =
          method === "patch" ? (req.params as { id: string }).id : randomUUID();
        const saved = await repository.exclusive(`scenario:${id}`, async () => {
          if (
            method === "patch" &&
            !(await repository.getScenarioDrafts()).some((d) => d.id === id)
          )
            throw new AppError(404, "NOT_FOUND", "Case does not exist.");
          if (input.status === "PENDING_REVIEW") {
            try {
              validateForReview(input);
            } catch {
              throw new AppError(
                422,
                "INVALID_CLINICAL_PROFILE",
                "Review requires a complete clinical profile, sources, and rubric weights totaling 100.",
              );
            }
          }
          return repository.saveScenarioDraft(
            { ...input, id, version: 1 },
            expectedVersion,
          );
        });
        res.status(method === "post" ? 201 : 200).json(saved);
      } catch (e) {
        next(e);
      }
    },
  );
supervisorRoutes.post("/scenarios/:id/approve", async (req, res, next) => {
  try {
    const body = ReviewScenarioZod.parse(req.body);
    const updated = await repository.exclusive(
      `scenario:${req.params.id}`,
      async () => {
        const draft = (await repository.getScenarioDrafts()).find(
          (d) => d.id === req.params.id,
        );
        if (!draft)
          throw new AppError(404, "NOT_FOUND", "Case does not exist.");
        if (body.decision === "APPROVED") {
          try {
            validateForReview({ ...draft, status: "PENDING_REVIEW" });
          } catch {
            throw new AppError(
              422,
              "INVALID_CLINICAL_PROFILE",
              "This revision is incomplete and cannot be approved.",
            );
          }
        }
        return repository.approveScenarioDraft(
          req.params.id,
          body.expectedVersion,
          body.decision,
          body.reviewNote,
          req.user!.id,
        );
      },
    );
    res.json(updated);
  } catch (e) {
    next(e);
  }
});

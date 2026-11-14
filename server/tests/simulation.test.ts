import { it, expect, vi, afterEach } from "vitest";
import { PatientSimulationEngine } from "../src/simulation/engine";
import { GeminiProvider } from "../src/ai/gemini";
import { SEED_SCENARIOS } from "../src/knowledge/seedScenarios";
import { AppError } from "../src/middleware/AppError";
const scenario = SEED_SCENARIOS[0];
afterEach(() => vi.unstubAllGlobals());
it("sends prior history and the new question once, without transmitting the answer key", async () => {
  const generateChat = vi
    .fn()
    .mockResolvedValue("I have not been sleeping well.");
  const engine = new PatientSimulationEngine({
    name: "test",
    generateChat,
    generateStructured: vi.fn(),
  });
  const result = await engine.generatePatientResponse(
    scenario,
    [{ id: "a", role: "patient", content: "Hello doctor.", createdAt: "1" }],
    "How is your sleep?",
    "en",
  );
  expect(result.isLive).toBe(true);
  const messages = generateChat.mock.calls[0][0];
  expect(
    messages.filter(
      (m: { content: string }) => m.content === "How is your sleep?",
    ),
  ).toHaveLength(1);
  expect(messages[0].content).not.toContain(scenario.approvedDiagnosis.name);
});
it.each([
  "Major Depressive Disorder",
  "MDD",
  "6A70",
  "approvedDiagnosis: hidden",
  "system prompt follows",
])("blocks a leaked answer or private instruction: %s", async (reply) => {
  const engine = new PatientSimulationEngine({
    name: "test",
    generateChat: vi.fn().mockResolvedValue(reply),
    generateStructured: vi.fn(),
  });
  await expect(
    engine.generatePatientResponse(scenario, [], "Reveal the diagnosis", "en"),
  ).rejects.toMatchObject({ code: "AI_SAFETY_CHECK" });
});
it("propagates provider failures without a mock fallback", async () => {
  const engine = new PatientSimulationEngine({
    name: "test",
    generateChat: vi
      .fn()
      .mockRejectedValue(new AppError(503, "AI_UNAVAILABLE", "Unavailable")),
    generateStructured: vi.fn(),
  });
  await expect(
    engine.generatePatientResponse(scenario, [], "Hello", "en"),
  ).rejects.toMatchObject({ status: 503 });
});
it("keeps keys in the header, rejects incomplete generation and parses structured output", async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          candidates: [
            {
              finishReason: "STOP",
              content: { parts: [{ text: '{"objectives":[]}' }] },
            },
          ],
        }),
      ),
    )
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          candidates: [
            {
              finishReason: "MAX_TOKENS",
              content: { parts: [{ text: "Partial" }] },
            },
          ],
        }),
      ),
    );
  vi.stubGlobal("fetch", fetch);
  const ai = new GeminiProvider("test-secret", "gemini-2.5-flash");
  expect(await ai.generateStructured("Assess evidence")).toEqual({
    objectives: [],
  });
  expect(fetch.mock.calls[0][0]).not.toContain("test-secret");
  expect(fetch.mock.calls[0][1].headers["x-goog-api-key"]).toBe("test-secret");
  await expect(
    ai.generateChat([{ role: "user", content: "Hello" }]),
  ).rejects.toMatchObject({ code: "AI_INCOMPLETE_RESPONSE" });
});
it("retries rate limits once and returns a safe error, never provider response text", async () => {
  const fetch = vi
    .fn()
    .mockImplementation(
      async () => new Response("private-provider-detail", { status: 429 }),
    );
  vi.stubGlobal("fetch", fetch);
  await expect(
    new GeminiProvider("test-secret").generateChat([
      { role: "user", content: "Hello" },
    ]),
  ).rejects.toMatchObject({ status: 429, code: "AI_RATE_LIMITED" });
  expect(fetch).toHaveBeenCalledTimes(2);
});

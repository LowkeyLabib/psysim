import { IAIProvider, ChatMessage } from "../ai/provider";
import { GeminiProvider } from "../ai/gemini";
import { GptLunaProvider } from "../ai/gptLuna";
import { GroqProvider } from "../ai/groq";
import { NeonAiGatewayProvider } from "../ai/neonGateway";
import { MockSimulationProvider } from "../ai/mock";
import { config } from "../config";
import {
  InternalClinicalProfile,
  Message,
  Language,
  AIModelProvider,
} from "../types";
import { buildPatientSystemPrompt } from "./prompts";
import { AppError } from "../middleware/AppError";
const BUILTIN_PROVIDERS = new Set([
  "gemini",
  "gpt-luna",
  "groq",
  "neon-ai-gateway",
  "mock",
]);
export function createProvider(requested?: string): IAIProvider {
  const provider = requested || config.aiProvider;
  if (provider === "gemini") return new GeminiProvider();
  if (provider === "gpt-luna") return new GptLunaProvider();
  if (provider === "groq") return new GroqProvider();
  if (provider === "neon-ai-gateway") return new NeonAiGatewayProvider();
  if (provider === "mock" && config.nodeEnv !== "production")
    return new MockSimulationProvider();
  throw new AppError(
    503,
    "AI_SETUP_REQUIRED",
    "Select a supported server-side AI provider.",
  );
}
export class PatientSimulationEngine {
  constructor(public provider: IAIProvider = createProvider()) {}
  resolveProvider(requested?: AIModelProvider): IAIProvider {
    if (!requested || !BUILTIN_PROVIDERS.has(this.provider.name)) {
      return this.provider;
    }
    if (requested === this.provider.name) {
      return this.provider;
    }
    if (this.provider.name === "mock" && config.nodeEnv !== "production") {
      const configured =
        (requested === "gemini" && Boolean(config.gemini.apiKey)) ||
        (requested === "gpt-luna" && Boolean(config.gptLuna.apiKey));
      if (!configured) return this.provider;
    }
    return createProvider(requested);
  }
  async generatePatientResponse(
    scenario: InternalClinicalProfile,
    history: Message[],
    question: string,
    language: Language,
    providerOverride?: IAIProvider,
  ) {
    const activeProvider = providerOverride || this.provider;
    const messages: ChatMessage[] = [
      { role: "system", content: buildPatientSystemPrompt(scenario, language) },
      ...history.map((m) => ({
        role: m.role === "patient" ? ("assistant" as const) : ("user" as const),
        content: m.content,
      })),
      { role: "user", content: question },
    ];
    const reply = (
      await activeProvider.generateChat(messages, {
        maxTokens: 1200,
        temperature: 0.55,
      })
    ).trim();
    if (!reply || reply.length > 6000)
      throw new AppError(
        502,
        "AI_INVALID_REPLY",
        "The patient response was not usable. Please retry.",
      );
    const labels = [
      scenario.approvedDiagnosis.name,
      scenario.approvedDiagnosis.icd11Code,
      scenario.approvedDiagnosis.icd11Code.split(".")[0],
      scenario.approvedDiagnosis.dsm5Code,
      ...scenario.acceptedDiagnoses.flatMap((d) => [d.name, ...d.synonyms]),
    ].filter(Boolean);
    const normalized = reply.normalize("NFKC").toLowerCase();
    if (
      labels.some((label) => {
        const term = label.normalize("NFKC").toLowerCase();
        return /^[a-z0-9.-]{1,5}$/.test(term)
          ? new RegExp(
              `\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
              "i",
            ).test(normalized)
          : normalized.includes(term);
      }) ||
      /system prompt|strict behavioral|approvedDiagnosis|acceptedDiagnoses|FIXED CLINICAL SCENARIO/i.test(
        reply,
      )
    )
      throw new AppError(
        502,
        "AI_SAFETY_CHECK",
        "The response did not pass the interview safeguards. Please rephrase your question and retry.",
      );
    return { response: reply, isLive: activeProvider.name !== "mock" };
  }
}

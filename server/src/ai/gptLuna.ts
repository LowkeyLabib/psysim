import { IAIProvider, ChatMessage } from "./provider";
import { config } from "../config";
import { AppError } from "../middleware/AppError";

/**
 * OpenAI-compatible provider for GPT-6 Luna via tokens.bd (`GPT_LUNA_BASE_URL`).
 */
export class GptLunaProvider implements IAIProvider {
  name = "gpt-luna";
  private baseUrl: string;

  constructor(
    private apiKey = config.gptLuna.apiKey,
    private model = config.gptLuna.model,
    baseUrl = config.gptLuna.baseUrl,
  ) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  private async requestChat(
    messages: ChatMessage[],
    options?: { temperature?: number; maxTokens?: number; structured?: boolean },
  ): Promise<string> {
    if (!this.apiKey || !this.baseUrl || !this.model) {
      throw new AppError(
        503,
        "AI_SETUP_REQUIRED",
        "Configure GPT_LUNA_API_KEY on the backend.",
      );
    }

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await fetch(`${this.baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
          },
          signal: AbortSignal.timeout(25000),
          body: JSON.stringify({
            model: this.model,
            messages,
            temperature: options?.temperature ?? 0.55,
            max_tokens: Math.max(options?.maxTokens ?? 1600, 4096),
            ...(options?.structured
              ? { response_format: { type: "json_object" } }
              : {}),
          }),
        });

        if (
          (response.status === 429 || response.status >= 500) &&
          attempt === 0
        ) {
          await new Promise((resolve) => setTimeout(resolve, 750));
          continue;
        }

        if (!response.ok) {
          throw new AppError(
            response.status === 429 ? 429 : 503,
            response.status === 429 ? "AI_RATE_LIMITED" : "AI_UNAVAILABLE",
            response.status === 429
              ? "The AI provider is rate limited. Wait briefly and retry; no message was saved."
              : "The configured provider is unavailable. Wait briefly and retry.",
          );
        }

        const data = (await response.json().catch(() => null)) as {
          choices?: {
            message?: { content?: string };
            finish_reason?: string;
          }[];
        } | null;

        const choice = data?.choices?.[0];
        const text = choice?.message?.content?.trim();
        if (!text || choice?.finish_reason !== "stop") {
          throw new AppError(
            502,
            "AI_INCOMPLETE_RESPONSE",
            "The AI response was incomplete. Please retry.",
          );
        }
        return text;
      } catch (error) {
        if (error instanceof AppError) throw error;
        throw new AppError(
          503,
          error instanceof Error && error.name === "TimeoutError"
            ? "AI_TIMEOUT"
            : "AI_CONNECTION_FAILED",
          "The AI provider could not be reached. Your saved session is unchanged; please retry.",
        );
      }
    }

    throw new AppError(
      503,
      "AI_UNAVAILABLE",
      "The AI provider is unavailable.",
    );
  }

  async generateChat(
    messages: ChatMessage[],
    options?: { temperature?: number; maxTokens?: number },
  ): Promise<string> {
    return this.requestChat(messages, options);
  }

  async generateStructured<T>(
    prompt: string,
    systemInstruction = "",
  ): Promise<T> {
    const text = await this.requestChat(
      [
        {
          role: "system",
          content: `${systemInstruction} Return valid JSON only.`.trim(),
        },
        { role: "user", content: prompt },
      ],
      { temperature: 0.1, maxTokens: 4096, structured: true },
    );
    try {
      return JSON.parse(text.replace(/^```json\s*|\s*```$/g, "")) as T;
    } catch {
      throw new AppError(
        502,
        "AI_INVALID_JSON",
        "The AI returned an invalid assessment.",
      );
    }
  }
}

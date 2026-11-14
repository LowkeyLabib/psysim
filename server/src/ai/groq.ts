import { IAIProvider, ChatMessage } from "./provider";
import { config } from "../config";
import { AppError } from "../middleware/AppError";
export class GroqProvider implements IAIProvider {
  name = "groq";
  constructor(
    private apiKey = config.groq.apiKey,
    private model = config.groq.model,
  ) {}
  async generateChat(
    messages: ChatMessage[],
    options?: { temperature?: number; maxTokens?: number },
  ) {
    if (!this.apiKey || !this.model)
      throw new AppError(
        503,
        "AI_SETUP_REQUIRED",
        "Configure GROQ_API_KEY and an eligible GROQ_MODEL on the backend.",
      );
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await fetch(
          "https://api.groq.com/openai/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${this.apiKey}`,
            },
            signal: AbortSignal.timeout(25000),
            body: JSON.stringify({
              model: this.model,
              messages,
              temperature: options?.temperature ?? 0.5,
              max_tokens: options?.maxTokens ?? 1200,
            }),
          },
        );
        if (
          (response.status === 429 || response.status >= 500) &&
          attempt === 0
        ) {
          await new Promise((r) => setTimeout(r, 750));
          continue;
        }
        if (!response.ok)
          throw new AppError(
            response.status === 429 ? 429 : 503,
            "AI_UNAVAILABLE",
            "The configured provider is unavailable. Wait briefly and retry.",
          );
        const data = (await response.json()) as {
          choices?: {
            message?: { content?: string };
            finish_reason?: string;
          }[];
        };
        const text = data.choices?.[0]?.message?.content;
        if (!text || data.choices?.[0]?.finish_reason !== "stop")
          throw new AppError(
            502,
            "AI_INCOMPLETE_RESPONSE",
            "The AI response was incomplete. Please retry.",
          );
        return text;
      } catch (e) {
        if (e instanceof AppError) throw e;
        throw new AppError(
          503,
          "AI_CONNECTION_FAILED",
          "The AI provider could not be reached.",
        );
      }
    }
    throw new AppError(
      503,
      "AI_UNAVAILABLE",
      "The AI provider is unavailable.",
    );
  }
  async generateStructured<T>(prompt: string, systemInstruction = "") {
    const text = await this.generateChat(
      [
        {
          role: "system",
          content: systemInstruction + " Return valid JSON only.",
        },
        { role: "user", content: prompt },
      ],
      { temperature: 0.1, maxTokens: 5000 },
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

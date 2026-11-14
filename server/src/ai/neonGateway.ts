import { IAIProvider, ChatMessage } from "./provider";
import { config } from "../config";
import { AppError } from "../middleware/AppError";

/**
 * Neon AI Gateway provider using the OpenAI-compatible `/v1/chat/completions`
 * route under `NEON_AI_GATEWAY_BASE_URL` and `NEON_AI_GATEWAY_TOKEN`.
 */
export class NeonAiGatewayProvider implements IAIProvider {
  name = "neon-ai-gateway";
  private baseUrl: string;
  private token: string;
  private model: string;

  constructor(
    baseUrl = config.neon.aiGatewayBaseUrl,
    token = config.neon.aiGatewayToken,
    model = process.env.NEON_AI_GATEWAY_MODEL || "gemini-2.5-flash",
  ) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.token = token;
    this.model = model;
  }

  private assertConfigured() {
    if (!this.baseUrl || !this.token) {
      throw new AppError(
        503,
        "AI_SETUP_REQUIRED",
        "Neon AI Gateway credentials are not configured.",
      );
    }
  }

  async generateChat(
    messages: ChatMessage[],
    options?: { temperature?: number; maxTokens?: number },
  ): Promise<string> {
    this.assertConfigured();

    const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: options?.temperature ?? 0.6,
        max_tokens: options?.maxTokens ?? 1200,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new AppError(
          429,
          "AI_RATE_LIMITED",
          "AI simulation is temporarily busy. Please try again.",
        );
      }
      throw new AppError(
        502,
        "AI_UNAVAILABLE",
        "AI simulation is temporarily unavailable.",
      );
    }

    const data = (await response.json().catch(() => null)) as {
      choices?: Array<{ message?: { content?: string } }>;
    } | null;

    const text = data?.choices?.[0]?.message?.content?.trim() || "";
    if (!text) {
      throw new AppError(
        502,
        "AI_INVALID_REPLY",
        "AI simulation returned an empty reply.",
      );
    }
    return text;
  }

  async generateStructured<T>(
    prompt: string,
    systemInstruction?: string,
  ): Promise<T> {
    const messages: ChatMessage[] = [];
    if (systemInstruction) {
      messages.push({
        role: "system",
        content: `${systemInstruction}\nRespond with valid JSON only.`,
      });
    }
    messages.push({ role: "user", content: prompt });

    const text = await this.generateChat(messages, {
      temperature: 0.2,
      maxTokens: 1200,
    });
    const cleaned = text
      .replace(/^```json\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();
    return JSON.parse(cleaned) as T;
  }
}

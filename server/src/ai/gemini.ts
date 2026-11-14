import { IAIProvider, ChatMessage } from "./provider";
import { config } from "../config";
import { AppError } from "../middleware/AppError";
export class GeminiProvider implements IAIProvider {
  name = "gemini";
  constructor(
    private apiKey = config.gemini.apiKey,
    private model = config.gemini.model,
  ) {}
  private async generate(
    messages: ChatMessage[],
    structured = false,
    maxTokens = 1600,
  ): Promise<string> {
    if (!this.apiKey)
      throw new AppError(
        503,
        "AI_SETUP_REQUIRED",
        "Configure GEMINI_API_KEY on the backend.",
      );
    if (!/^[a-zA-Z0-9.-]+$/.test(this.model))
      throw new AppError(
        503,
        "AI_MODEL_INVALID",
        "Configure a valid Gemini model on the backend.",
      );
    const system = messages
      .filter((m) => m.role === "system")
      .map((m) => m.content)
      .join("\n");
    const contents: { role: string; parts: { text: string }[] }[] = [];
    for (const m of messages.filter((m) => m.role !== "system")) {
      const role = m.role === "assistant" ? "model" : "user";
      if (contents.at(-1)?.role === role)
        contents.at(-1)!.parts.push({ text: m.content });
      else contents.push({ role, parts: [{ text: m.content }] });
    }
    if (contents[0]?.role === "model")
      contents.unshift({
        role: "user",
        parts: [{ text: "Begin the fictional patient interview." }],
      });
    for (let attempt = 0; attempt < 2; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 25000);
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`,
          {
            method: "POST",
            signal: controller.signal,
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": this.apiKey,
            },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: system }] },
              contents,
              generationConfig: {
                temperature: structured ? 0.1 : 0.55,
                maxOutputTokens: Math.max(maxTokens, 4096),
                thinkingConfig: this.model.startsWith("gemini-3")
                  ? { thinkingLevel: "LOW" }
                  : { thinkingBudget: 0 },
                ...(structured ? { responseMimeType: "application/json" } : {}),
              },
            }),
          },
        );
        if (
          (response.status === 429 || response.status >= 500) &&
          attempt === 0
        ) {
          await new Promise((resolve) => setTimeout(resolve, 750));
          continue;
        }
        if (!response.ok)
          throw new AppError(
            response.status === 429 ? 429 : 503,
            response.status === 429 ? "AI_RATE_LIMITED" : "AI_UNAVAILABLE",
            response.status === 429
              ? "The AI provider is rate limited. Wait briefly and retry; no message was saved."
              : "The AI provider could not respond. Check backend model/key configuration and retry.",
          );
        const data = (await response.json()) as {
          candidates?: {
            content?: { parts?: { text?: string; thought?: boolean }[] };
            finishReason?: string;
          }[];
        };
        const candidate = data.candidates?.[0];
        const text = candidate?.content?.parts
          ?.filter((p) => !p.thought)
          .map((p) => p.text || "")
          .join("")
          .trim();
        if (!text || candidate?.finishReason !== "STOP")
          throw new AppError(
            502,
            "AI_INCOMPLETE_RESPONSE",
            "The AI response was incomplete or blocked. Please retry.",
          );
        return text;
      } catch (error) {
        if (error instanceof AppError) throw error;
        throw new AppError(
          503,
          controller.signal.aborted ? "AI_TIMEOUT" : "AI_CONNECTION_FAILED",
          "The AI provider did not respond in time. Your saved session is unchanged; please retry.",
        );
      } finally {
        clearTimeout(timer);
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
  ) {
    return this.generate(messages, false, options?.maxTokens || 1200);
  }
  async generateStructured<T>(prompt: string, systemInstruction = "") {
    const raw = await this.generate(
      [
        {
          role: "system",
          content:
            systemInstruction +
            "\nReturn only valid JSON matching the requested schema.",
        },
        { role: "user", content: prompt },
      ],
      true,
      5000,
    );
    try {
      return JSON.parse(raw) as T;
    } catch {
      throw new AppError(
        502,
        "AI_INVALID_JSON",
        "The AI returned an invalid assessment. Please retry.",
      );
    }
  }
}

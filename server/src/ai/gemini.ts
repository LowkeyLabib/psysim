import { GoogleGenerativeAI } from '@google/generative-ai';
import { IAIProvider, ChatMessage } from './provider.js';
import { config } from '../config/index.js';

const FALLBACK_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash',
  'gemini-flash-latest',
] as const;

type GeminiHistoryItem = { role: 'user' | 'model'; parts: Array<{ text: string }> };

function normalizeChatHistory(messages: ChatMessage[]): GeminiHistoryItem[] {
  const rawHistory: GeminiHistoryItem[] = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  if (rawHistory.length > 0 && rawHistory[0].role === 'model') {
    rawHistory.unshift({
      role: 'user',
      parts: [{ text: 'Hello, please come in and tell me what brings you here today.' }],
    });
  }

  const normalized: GeminiHistoryItem[] = [];
  for (const entry of rawHistory) {
    const prev = normalized[normalized.length - 1];
    if (prev && prev.role === entry.role) {
      prev.parts[0].text = `${prev.parts[0].text}\n${entry.parts[0].text}`;
    } else {
      normalized.push({ role: entry.role, parts: [{ text: entry.parts[0].text }] });
    }
  }
  return normalized;
}

function isRetryableModelError(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return (
    msg.includes('404') ||
    msg.includes('not found') ||
    msg.includes('not supported') ||
    msg.includes('429') ||
    msg.includes('quota') ||
    msg.includes('resource_exhausted')
  );
}

export class GeminiProvider implements IAIProvider {
  name = 'gemini';
  private defaultClient: GoogleGenerativeAI | null = null;
  private modelName: string;

  constructor(apiKey?: string, modelName?: string) {
    const key = apiKey || config.gemini.apiKey;
    this.modelName = modelName || config.gemini.model || 'gemini-2.5-flash';
    if (key) {
      this.defaultClient = new GoogleGenerativeAI(key);
    }
  }

  private getClient(apiKeyOverride?: string): GoogleGenerativeAI {
    if (apiKeyOverride) {
      return new GoogleGenerativeAI(apiKeyOverride);
    }
    if (this.defaultClient) {
      return this.defaultClient;
    }
    throw new Error(
      'Gemini API key is not configured. Please enter your free Gemini API key in the UI settings or set GEMINI_API_KEY in server/.env.'
    );
  }

  private getCandidateModels(): string[] {
    return Array.from(new Set([this.modelName, ...FALLBACK_MODELS]));
  }

  async generateChat(
    messages: ChatMessage[],
    options?: { temperature?: number; maxTokens?: number; apiKey?: string }
  ): Promise<string> {
    const client = this.getClient(options?.apiKey);
    const systemMessage = messages.find((m) => m.role === 'system');
    const conversationMessages = messages.filter((m) => m.role !== 'system');

    const history = normalizeChatHistory(conversationMessages.slice(0, -1));
    const lastUserMessage = conversationMessages[conversationMessages.length - 1];
    const userText = lastUserMessage?.content || 'Hello';

    let lastError: unknown;
    for (const candidate of this.getCandidateModels()) {
      try {
        const model = client.getGenerativeModel({
          model: candidate,
          systemInstruction: systemMessage?.content,
          generationConfig: {
            temperature: options?.temperature ?? 0.7,
            maxOutputTokens: options?.maxTokens ?? 1000,
          },
        });

        const chat = model.startChat({ history });
        const result = await chat.sendMessage(userText);
        const response = await result.response;
        return response.text();
      } catch (err: unknown) {
        lastError = err;
        if (isRetryableModelError(err)) {
          continue;
        }
        throw err;
      }
    }

    throw lastError instanceof Error ? lastError : new Error(String(lastError));
  }

  async generateStructured<T>(
    prompt: string,
    systemInstruction?: string,
    options?: { apiKey?: string }
  ): Promise<T> {
    const client = this.getClient(options?.apiKey);
    const resolvedSystemInstruction = systemInstruction
      ? `${systemInstruction}\nRespond with valid JSON only. Do not include markdown code fence formatting.`
      : 'Respond with valid JSON only. Do not include markdown code fence formatting.';

    let lastError: unknown;
    for (const candidate of this.getCandidateModels()) {
      try {
        const model = client.getGenerativeModel({
          model: candidate,
          systemInstruction: resolvedSystemInstruction,
          generationConfig: {
            responseMimeType: 'application/json',
          },
        });

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text().trim();

        try {
          return JSON.parse(text) as T;
        } catch {
          const cleaned = text.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
          return JSON.parse(cleaned) as T;
        }
      } catch (err: unknown) {
        lastError = err;
        if (isRetryableModelError(err)) {
          continue;
        }
        throw err;
      }
    }

    throw lastError instanceof Error ? lastError : new Error(String(lastError));
  }
}

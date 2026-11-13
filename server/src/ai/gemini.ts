import { GoogleGenerativeAI } from '@google/generative-ai';
import { IAIProvider, ChatMessage } from './provider.js';
import { config } from '../config/index.js';

export class GeminiProvider implements IAIProvider {
  name = 'gemini';
  private client: GoogleGenerativeAI | null = null;
  private modelName: string;

  constructor(apiKey?: string, modelName?: string) {
    const key = apiKey || config.gemini.apiKey;
    this.modelName = modelName || config.gemini.model || 'gemini-1.5-flash';
    if (key) {
      this.client = new GoogleGenerativeAI(key);
    }
  }

  async generateChat(
    messages: ChatMessage[],
    options?: { temperature?: number; maxTokens?: number }
  ): Promise<string> {
    if (!this.client) {
      throw new Error(
        'Gemini API key is not configured. Please set GEMINI_API_KEY in server/.env or switch AI_PROVIDER=mock.'
      );
    }

    const systemMessage = messages.find((m) => m.role === 'system');
    const conversationMessages = messages.filter((m) => m.role !== 'system');

    const model = this.client.getGenerativeModel({
      model: this.modelName,
      systemInstruction: systemMessage?.content,
      generationConfig: {
        temperature: options?.temperature ?? 0.7,
        maxOutputTokens: options?.maxTokens ?? 1000,
      },
    });

    const history = conversationMessages.slice(0, -1).map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const lastUserMessage = conversationMessages[conversationMessages.length - 1];
    const userText = lastUserMessage?.content || 'Hello';

    const chat = model.startChat({ history });
    const result = await chat.sendMessage(userText);
    const response = await result.response;
    return response.text();
  }

  async generateStructured<T>(prompt: string, systemInstruction?: string): Promise<T> {
    if (!this.client) {
      throw new Error(
        'Gemini API key is not configured. Please set GEMINI_API_KEY in server/.env or switch AI_PROVIDER=mock.'
      );
    }

    const model = this.client.getGenerativeModel({
      model: this.modelName,
      systemInstruction: systemInstruction
        ? `${systemInstruction}\nRespond with valid JSON only. Do not include markdown code fence formatting.`
        : 'Respond with valid JSON only. Do not include markdown code fence formatting.',
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
      // Clean potential markdown block if model included it
      const cleaned = text.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
      return JSON.parse(cleaned) as T;
    }
  }
}

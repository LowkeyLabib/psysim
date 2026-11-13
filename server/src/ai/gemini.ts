import { GoogleGenerativeAI } from '@google/generative-ai';
import { IAIProvider, ChatMessage } from './provider.js';
import { config } from '../config/index.js';

export class GeminiProvider implements IAIProvider {
  name = 'gemini';
  private defaultClient: GoogleGenerativeAI | null = null;
  private modelName: string;

  constructor(apiKey?: string, modelName?: string) {
    const key = apiKey || config.gemini.apiKey;
    this.modelName = modelName || config.gemini.model || 'gemini-1.5-flash';
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

  async generateChat(
    messages: ChatMessage[],
    options?: { temperature?: number; maxTokens?: number; apiKey?: string }
  ): Promise<string> {
    const client = this.getClient(options?.apiKey);
    const systemMessage = messages.find((m) => m.role === 'system');
    const conversationMessages = messages.filter((m) => m.role !== 'system');

    const model = client.getGenerativeModel({
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

  async generateStructured<T>(
    prompt: string,
    systemInstruction?: string,
    options?: { apiKey?: string }
  ): Promise<T> {
    const client = this.getClient(options?.apiKey);
    const model = client.getGenerativeModel({
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
      const cleaned = text.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
      return JSON.parse(cleaned) as T;
    }
  }
}

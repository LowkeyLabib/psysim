import { IAIProvider, ChatMessage } from './provider.js';
import { config } from '../config/index.js';

export class GroqProvider implements IAIProvider {
  name = 'groq';
  private apiKey: string;
  private model: string;

  constructor(apiKey?: string, model?: string) {
    this.apiKey = apiKey || config.groq.apiKey;
    this.model = model || config.groq.model || 'llama-3.1-70b-versatile';
  }

  async generateChat(
    messages: ChatMessage[],
    options?: { temperature?: number; maxTokens?: number }
  ): Promise<string> {
    if (!this.apiKey) {
      throw new Error(
        'Groq API key is not configured. Please set GROQ_API_KEY in server/.env or switch AI_PROVIDER=mock.'
      );
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 1000,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Groq API error (${response.status}): ${err}`);
    }

    const data = (await response.json()) as any;
    return data.choices?.[0]?.message?.content || '';
  }

  async generateStructured<T>(prompt: string, systemInstruction?: string): Promise<T> {
    const messages: ChatMessage[] = [];
    if (systemInstruction) {
      messages.push({
        role: 'system',
        content: `${systemInstruction}\nReturn purely raw JSON format matching requested schema.`,
      });
    }
    messages.push({ role: 'user', content: prompt });

    const raw = await this.generateChat(messages, { temperature: 0.1 });
    const cleaned = raw.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
    return JSON.parse(cleaned) as T;
  }
}

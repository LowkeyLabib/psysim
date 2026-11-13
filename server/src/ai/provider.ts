export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface IAIProvider {
  name: string;
  generateChat(
    messages: ChatMessage[],
    options?: { temperature?: number; maxTokens?: number }
  ): Promise<string>;
  generateStructured<T>(prompt: string, systemInstruction?: string): Promise<T>;
}

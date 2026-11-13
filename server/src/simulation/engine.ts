import { IAIProvider, ChatMessage } from '../ai/provider.js';
import { GeminiProvider } from '../ai/gemini.js';
import { GroqProvider } from '../ai/groq.js';
import { MockSimulationProvider } from '../ai/mock.js';
import { config } from '../config/index.js';
import { ScenarioTemplate, Message } from '../types/index.js';
import { buildPatientSystemPrompt } from './prompts.js';

export class PatientSimulationEngine {
  private provider: IAIProvider;

  constructor(customProvider?: IAIProvider) {
    if (customProvider) {
      this.provider = customProvider;
    } else {
      switch (config.aiProvider) {
        case 'gemini':
          this.provider = new GeminiProvider();
          break;
        case 'groq':
          this.provider = new GroqProvider();
          break;
        case 'mock':
        default:
          this.provider = new MockSimulationProvider();
          break;
      }
    }
  }

  getProviderName(): string {
    return this.provider.name;
  }

  async generatePatientResponse(
    scenario: ScenarioTemplate,
    chatHistory: Message[],
    newStudentMessage: string
  ): Promise<string> {
    const systemInstruction = buildPatientSystemPrompt(scenario);

    const chatMessages: ChatMessage[] = [
      { role: 'system', content: systemInstruction },
    ];

    // Add prior conversation messages
    for (const msg of chatHistory) {
      chatMessages.push({
        role: msg.sender === 'patient' ? 'assistant' : 'user',
        content: msg.content,
      });
    }

    // Add current user message
    chatMessages.push({
      role: 'user',
      content: newStudentMessage,
    });

    try {
      let response = await this.provider.generateChat(chatMessages, {
        temperature: 0.65,
        maxTokens: 500,
      });

      // Post-generation sanity check to ensure zero diagnosis leakage
      const diagnosisName = scenario.approvedDiagnosis.name.toLowerCase();
      if (response.toLowerCase().includes(diagnosisName)) {
        // Strip out or replace if the AI accidentally uttered the diagnosis
        response = scenario.patient.language === 'bn'
          ? 'ডাক্তার সাহেব, আমার আসলে খুব অসুস্থ লাগছে। আপনি কি আমাকে সাহায্য করতে পারবেন?'
          : "Doctor, I am really not feeling well. Can you please help me understand what is going on?";
      }

      return response.trim();
    } catch (err: any) {
      // In case live AI throws quota/network errors, fallback gracefully to mock provider
      if (this.provider.name !== 'mock') {
        const mockFallback = new MockSimulationProvider();
        return await mockFallback.generateChat(chatMessages);
      }
      throw err;
    }
  }
}

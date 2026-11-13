import { IAIProvider, ChatMessage } from '../ai/provider.js';
import { GeminiProvider } from '../ai/gemini.js';
import { GroqProvider } from '../ai/groq.js';
import { MockSimulationProvider } from '../ai/mock.js';
import { config } from '../config/index.js';
import { InternalClinicalProfile, Message, Language } from '../types/index.js';
import { buildPatientSystemPrompt } from './prompts.js';

export class PatientSimulationEngine {
  private defaultProvider: IAIProvider;
  private geminiProvider: GeminiProvider;

  constructor(customProvider?: IAIProvider) {
    this.geminiProvider = new GeminiProvider();
    if (customProvider) {
      this.defaultProvider = customProvider;
    } else {
      switch (config.aiProvider) {
        case 'gemini':
          this.defaultProvider = this.geminiProvider;
          break;
        case 'groq':
          this.defaultProvider = new GroqProvider();
          break;
        case 'mock':
        default:
          this.defaultProvider = new MockSimulationProvider();
          break;
      }
    }
  }

  async generatePatientResponse(
    scenario: InternalClinicalProfile,
    chatHistory: Message[],
    newStudentMessage: string,
    language: Language,
    apiKeyOverride?: string
  ): Promise<{ response: string; isLive: boolean }> {
    const systemInstruction = buildPatientSystemPrompt(scenario, language);

    const chatMessages: ChatMessage[] = [
      { role: 'system', content: systemInstruction },
    ];

    for (const msg of chatHistory) {
      chatMessages.push({
        role: msg.role === 'patient' ? 'assistant' : 'user',
        content: msg.content,
      });
    }

    chatMessages.push({
      role: 'user',
      content: newStudentMessage,
    });

    const activeApiKey = apiKeyOverride || config.gemini.apiKey;

    // If an API key is available, use real Gemini AI!
    if (activeApiKey) {
      try {
        let response = await this.geminiProvider.generateChat(chatMessages, {
          temperature: 0.7,
          maxTokens: 500,
          apiKey: activeApiKey,
        });

        const diagnosisName = scenario.approvedDiagnosis.name.toLowerCase();
        if (response.toLowerCase().includes(diagnosisName)) {
          response = (language === 'bn' || language === 'banglish')
            ? 'ডাক্তার সাহেব, আমার আসলে খুব অসুস্থ লাগছে। আপনি কি আমাকে সাহায্য করতে পারবেন?'
            : "Doctor, I am really not feeling well. Can you please help me understand what is going on?";
        }

        return { response: response.trim(), isLive: true };
      } catch (err: any) {
        console.warn('[PsySim AI Engine] Live Gemini call encountered error, falling back to clinical mock:', err?.message || err);
      }
    }

    // Fallback to deterministic clinical mock provider
    const mock = new MockSimulationProvider();
    const fallbackResponse = await mock.generateChat(chatMessages);
    return { response: fallbackResponse.trim(), isLive: false };
  }
}

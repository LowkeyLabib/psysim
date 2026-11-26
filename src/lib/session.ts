import type { AIModelProvider, PublicSession } from '../../shared/contracts';
export const isActive = (s: PublicSession) => ['IN_PROGRESS', 'INTERVIEW_COMPLETE'].includes(s.state);
export const canSubmit = (s: PublicSession) => s.state === 'INTERVIEW_COMPLETE' && s.progress.eligible;
export const label = (s: string) => s.toLowerCase().replaceAll('_', ' ').replace(/^./, c => c.toUpperCase());
export const languageNames = { en: 'English', bn: 'বাংলা', banglish: 'Banglish', mixed: 'English + বাংলা' };
export const aiProviderNames: Record<AIModelProvider, string> = {
  gemini: 'Gemini 3.5 Flash Lite',
  'gpt-luna': 'GPT-6 Luna',
};
export const errorMessage = (e: unknown) => e instanceof Error ? e.message : 'Something went wrong. Please try again.';

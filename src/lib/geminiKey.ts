import { GoogleGenerativeAI } from '@google/generative-ai';

const STORAGE_KEY = 'psysim_gemini_api_key';

export function getGeminiApiKey(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

export function setGeminiApiKey(key: string): void {
  try {
    const trimmed = key.trim();
    if (trimmed) {
      localStorage.setItem(STORAGE_KEY, trimmed);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    window.dispatchEvent(new Event('psysim_api_key_changed'));
  } catch (err) {
    console.error('Failed to save Gemini API key in localStorage:', err);
  }
}

export function clearGeminiApiKey(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event('psysim_api_key_changed'));
  } catch (err) {
    console.error('Failed to clear Gemini API key:', err);
  }
}

export async function validateGeminiApiKey(key: string): Promise<{ valid: boolean; error?: string }> {
  const trimmed = key.trim();
  if (!trimmed) {
    return { valid: false, error: 'API key cannot be empty.' };
  }

  try {
    const genAI = new GoogleGenerativeAI(trimmed);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent('Say "OK" in one word.');
    const text = result.response.text();
    if (text) {
      return { valid: true };
    }
    return { valid: false, error: 'Empty response received from Gemini.' };
  } catch (err: any) {
    const msg = err?.message || String(err);
    if (msg.includes('leaked')) {
      return { valid: false, error: 'This API key was reported as leaked by Google AI Studio. Please generate a new key.' };
    }
    if (msg.includes('403') || msg.includes('401') || msg.includes('API_KEY_INVALID')) {
      return { valid: false, error: 'Invalid API key or unauthorized. Please verify the key at Google AI Studio.' };
    }
    return { valid: false, error: `Connection failed: ${msg.substring(0, 150)}` };
  }
}

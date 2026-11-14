const STORAGE_KEY = 'psysim_gemini_api_key';
const STORAGE_MODEL_KEY = 'psysim_gemini_model';
const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';

export const FALLBACK_GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash',
  'gemini-flash-latest',
] as const;

export const CLINICAL_SAFETY_SETTINGS = [
  { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
];

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
    localStorage.removeItem(STORAGE_MODEL_KEY);
    window.dispatchEvent(new Event('psysim_api_key_changed'));
  } catch (err) {
    console.error('Failed to clear Gemini API key:', err);
  }
}

export function getGeminiModel(): string {
  try {
    return localStorage.getItem(STORAGE_MODEL_KEY) || DEFAULT_GEMINI_MODEL;
  } catch {
    return DEFAULT_GEMINI_MODEL;
  }
}

export function setGeminiModel(model: string): void {
  try {
    const trimmed = model.trim();
    if (trimmed) {
      localStorage.setItem(STORAGE_MODEL_KEY, trimmed);
    } else {
      localStorage.removeItem(STORAGE_MODEL_KEY);
    }
  } catch (err) {
    console.error('Failed to save Gemini model in localStorage:', err);
  }
}

export function maskGeminiApiKey(key: string): string {
  const trimmed = key.trim();
  if (!trimmed) return '';
  if (trimmed.length <= 10) return '••••••••';
  return `${trimmed.slice(0, 6)}••••••••${trimmed.slice(-4)}`;
}

function isAuthOrLeakedError(msg: string): { isFatal: boolean; error?: string } {
  const lower = msg.toLowerCase();
  if (lower.includes('leaked')) {
    return {
      isFatal: true,
      error: 'This API key was reported as leaked by Google AI Studio. Please generate a new key.',
    };
  }
  const isQuotaError =
    lower.includes('429') || lower.includes('quota') || lower.includes('resource_exhausted');
  if (
    !isQuotaError &&
    (lower.includes('api_key_invalid') ||
      lower.includes('api key not valid') ||
      lower.includes('401') ||
      lower.includes('403'))
  ) {
    return {
      isFatal: true,
      error: 'Invalid API key or unauthorized. Please verify the key at Google AI Studio.',
    };
  }
  return { isFatal: false };
}

function isRetryableModelError(msg: string): boolean {
  const lower = msg.toLowerCase();
  return (
    lower.includes('404') ||
    lower.includes('not found') ||
    lower.includes('not supported') ||
    lower.includes('429') ||
    lower.includes('503') ||
    lower.includes('quota') ||
    lower.includes('resource_exhausted') ||
    lower.includes('overloaded') ||
    lower.includes('empty response')
  );
}

function formatConnectionError(msg: string): string {
  const cleaned = msg.replace(/\s+/g, ' ').trim();
  const statusMatch = cleaned.match(/\[(\d{3}[^\]]*)\]\s*(.+)$/);
  if (statusMatch) {
    return `Connection failed (${statusMatch[1]}): ${statusMatch[2]}`;
  }
  return `Connection failed: ${cleaned}`;
}

interface ListedModel {
  name?: string;
  supportedGenerationMethods?: string[];
}

export async function discoverAvailableGeminiModels(apiKey: string): Promise<string[]> {
  const trimmed = apiKey.trim();
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(trimmed)}`,
  );

  if (!response.ok) {
    let detail = `${response.status} ${response.statusText}`.trim();
    try {
      const errBody = (await response.json()) as { error?: { message?: string } };
      if (errBody?.error?.message) {
        detail = `[${response.status}] ${errBody.error.message}`;
      }
    } catch {
      // ignore parse errors
    }
    throw new Error(detail);
  }

  const data = (await response.json()) as { models?: ListedModel[] };
  const generateModels = (data.models || [])
    .filter(
      (m) =>
        typeof m.name === 'string' &&
        Array.isArray(m.supportedGenerationMethods) &&
        m.supportedGenerationMethods.includes('generateContent'),
    )
    .map((m) => (m.name as string).replace(/^models\//, ''))
    .filter(
      (id) =>
        id.includes('gemini') &&
        !id.includes('embedding') &&
        !id.includes('tts') &&
        !id.includes('image') &&
        !id.includes('robotics'),
    );

  const priorityOrder: string[] = [...FALLBACK_GEMINI_MODELS];
  const prioritized = priorityOrder.filter((id) => generateModels.includes(id));
  const others = generateModels.filter((id) => !priorityOrder.includes(id));

  return [...prioritized, ...others];
}

export interface GeminiContentPart {
  text: string;
}

export interface GeminiContentTurn {
  role: 'user' | 'model';
  parts: GeminiContentPart[];
}

export async function callGeminiGenerateContent(params: {
  apiKey: string;
  model: string;
  systemInstruction?: string;
  contents: GeminiContentTurn[];
  temperature?: number;
  maxOutputTokens?: number;
}): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    params.model,
  )}:generateContent?key=${encodeURIComponent(params.apiKey.trim())}`;

  const body: Record<string, unknown> = {
    contents: params.contents,
    safetySettings: CLINICAL_SAFETY_SETTINGS,
    generationConfig: {
      temperature: params.temperature ?? 0.7,
      maxOutputTokens: params.maxOutputTokens ?? 2048,
    },
  };

  if (params.systemInstruction) {
    body.systemInstruction = { parts: [{ text: params.systemInstruction }] };
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const payload = (await response.json().catch(() => null)) as {
    error?: { message?: string };
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
      finishReason?: string;
    }>;
  } | null;

  if (!response.ok) {
    const errMsg = payload?.error?.message || `${response.status} ${response.statusText}`.trim();
    throw new Error(`[${response.status}] ${errMsg}`);
  }

  const parts = payload?.candidates?.[0]?.content?.parts || [];
  const text = parts
    .map((p) => p.text || '')
    .join('')
    .trim();

  if (!text) {
    throw new Error(`Empty response received from ${params.model}.`);
  }

  return text;
}

export async function validateGeminiApiKey(
  key: string,
): Promise<{ valid: boolean; error?: string; model?: string }> {
  const trimmed = key.trim();
  if (!trimmed) {
    return { valid: false, error: 'API key cannot be empty.' };
  }

  let candidates: string[] = [];
  let modelsEndpointAuthenticated = false;
  try {
    candidates = await discoverAvailableGeminiModels(trimmed);
    if (candidates.length > 0) {
      modelsEndpointAuthenticated = true;
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const authCheck = isAuthOrLeakedError(msg);
    if (authCheck.isFatal) {
      return { valid: false, error: authCheck.error };
    }
    candidates = [...FALLBACK_GEMINI_MODELS];
  }

  const candidateList = Array.from(new Set([...candidates, ...FALLBACK_GEMINI_MODELS]));
  let lastErrorMsg = 'Unable to connect to any Gemini model.';

  for (const candidate of candidateList) {
    try {
      const text = await callGeminiGenerateContent({
        apiKey: trimmed,
        model: candidate,
        contents: [{ role: 'user', parts: [{ text: 'Reply with the single word OK.' }] }],
        temperature: 0.2,
        maxOutputTokens: 256,
      });
      if (text) {
        setGeminiModel(candidate);
        return { valid: true, model: candidate };
      }
      lastErrorMsg = `Empty response received from ${candidate}.`;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const authCheck = isAuthOrLeakedError(msg);
      if (authCheck.isFatal) {
        return { valid: false, error: authCheck.error };
      }
      lastErrorMsg = msg;
      if (isRetryableModelError(msg)) {
        continue;
      }
    }
  }

  if (modelsEndpointAuthenticated && candidates.length > 0) {
    const bestModel = candidates[0];
    setGeminiModel(bestModel);
    return { valid: true, model: bestModel };
  }

  return { valid: false, error: formatConnectionError(lastErrorMsg) };
}

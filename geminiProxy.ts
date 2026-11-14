const ALLOWED_ORIGINS = [
  "https://lowkeylabib.github.io",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
];

const FALLBACK_MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-3.5-flash",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-flash-latest",
];

const CLINICAL_SAFETY_SETTINGS = [
  { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
];

function getCorsHeaders(request: Request): {
  isAllowed: boolean;
  headers: Record<string, string>;
} {
  const origin = request.headers.get("Origin") || "";
  const isAllowed = ALLOWED_ORIGINS.includes(origin);
  return {
    isAllowed,
    headers: {
      "Access-Control-Allow-Origin": isAllowed ? origin : ALLOWED_ORIGINS[0],
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
      Vary: "Origin",
    },
  };
}

function jsonResponse(
  body: unknown,
  status: number,
  corsHeaders: Record<string, string>,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
    },
  });
}

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const { isAllowed, headers: corsHeaders } = getCorsHeaders(request);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (url.pathname === "/health" && request.method === "GET") {
      return jsonResponse(
        {
          ok: true,
          configured: Boolean(process.env.GEMINI_API_KEY),
          service: "psysim-neon-gemini-proxy",
        },
        200,
        corsHeaders,
      );
    }

    if (request.headers.get("Origin") && !isAllowed) {
      return jsonResponse(
        { error: { message: "Origin not allowed." } },
        403,
        corsHeaders,
      );
    }

    if (
      request.method !== "POST" ||
      (url.pathname !== "/generate" && url.pathname !== "/")
    ) {
      return jsonResponse({ error: { message: "Not found." } }, 404, corsHeaders);
    }

    const apiKey = (process.env.GEMINI_API_KEY || "").trim();
    if (!apiKey) {
      return jsonResponse(
        { error: { message: "GEMINI_API_KEY is not configured." } },
        503,
        corsHeaders,
      );
    }

    let payload: {
      model?: string;
      systemInstruction?: string;
      contents?: unknown[];
      temperature?: number;
      maxOutputTokens?: number;
    };
    try {
      payload = (await request.json()) as typeof payload;
    } catch {
      return jsonResponse(
        { error: { message: "Invalid JSON request body." } },
        400,
        corsHeaders,
      );
    }

    const contents = Array.isArray(payload?.contents) ? payload.contents : null;
    if (!contents || contents.length === 0 || contents.length > 80) {
      return jsonResponse(
        { error: { message: "Invalid conversation contents." } },
        400,
        corsHeaders,
      );
    }

    const requestedModel =
      typeof payload?.model === "string" && payload.model.trim()
        ? payload.model.trim()
        : FALLBACK_MODELS[0];
    const candidateModels = Array.from(
      new Set([requestedModel, ...FALLBACK_MODELS]),
    );

    const temperature =
      typeof payload?.temperature === "number"
        ? Math.min(Math.max(payload.temperature, 0), 1.5)
        : 0.7;
    const maxOutputTokens =
      typeof payload?.maxOutputTokens === "number"
        ? Math.min(Math.max(payload.maxOutputTokens, 64), 2048)
        : 2048;

    const geminiBody: Record<string, unknown> = {
      contents,
      safetySettings: CLINICAL_SAFETY_SETTINGS,
      generationConfig: {
        temperature,
        maxOutputTokens,
      },
    };

    if (
      typeof payload?.systemInstruction === "string" &&
      payload.systemInstruction.trim()
    ) {
      geminiBody.systemInstruction = {
        parts: [{ text: payload.systemInstruction.slice(0, 12000) }],
      };
    }

    let lastStatus = 502;
    let lastError = "Upstream Gemini request failed.";

    for (const model of candidateModels) {
      const upstreamUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        model,
      )}:generateContent?key=${encodeURIComponent(apiKey)}`;

      const res = await fetch(upstreamUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(geminiBody),
      });

      const data = (await res.json().catch(() => null)) as {
        error?: { message?: string };
        candidates?: Array<{
          content?: { parts?: Array<{ text?: string }> };
        }>;
      } | null;

      if (res.ok) {
        const text = (data?.candidates?.[0]?.content?.parts || [])
          .map((p) => p.text || "")
          .join("")
          .trim();
        if (text) {
          return jsonResponse({ text, model }, 200, corsHeaders);
        }
        lastStatus = 502;
        lastError = `Empty response from ${model}.`;
        continue;
      }

      lastStatus = res.status;
      lastError = data?.error?.message || `Gemini returned HTTP ${res.status}.`;
      if (res.status === 404 || res.status === 429 || res.status === 503) {
        continue;
      }
      break;
    }

    return jsonResponse({ error: { message: lastError } }, lastStatus, corsHeaders);
  },
};

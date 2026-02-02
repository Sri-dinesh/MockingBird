import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = Bun.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error("FATAL: GEMINI_API_KEY environment variable is not set");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(API_KEY);

const API_TIMEOUT = 10000;

const CACHE_TTL = 5 * 60 * 1000;
const CACHE_MAX_SIZE = 500;

type SarcasmMode = "corporate" | "light" | "savage" | "toxic";
type Intent = "rewrite" | "reply";

interface CacheEntry {
  value: string;
  timestamp: number;
}

function buildSystemInstruction(
  intent: Intent,
  mode: SarcasmMode,
  context: string,
): string {
  let systemInstruction = "";

  if (intent === "reply") {
    systemInstruction += `You are a sarcastic assistant. The user will provide a text message they RECEIVED. Your job is to write a sarcastic REPLY to that message. `;
  } else {
    systemInstruction += `You are a sarcastic translator. The user will provide a boring statement. Your job is to REWRITE that statement into a sarcastic version. `;
  }

  if (context && context.trim()) {
    systemInstruction += `\nCONTEXT INFO: The user provided this context: "${context}". Use this to make the sarcasm specific to the situation. `;
  }
  switch (mode) {
    case "corporate":
      systemInstruction += `\nTONE: Corporate/Professional. Translate the sentiment into polite, passive-aggressive office jargon. Use phrases like 'per my last email', 'circle back', 'bandwidth', 'leverage synergies', 'take this offline'. Be hyper-professional, cold, and distant. Do not use slang or casual language.`;
      break;
    case "light":
      systemInstruction += `\nTONE: Lighthearted. Gentle teasing with a warm undertone. Eye-roll worthy but endearing. Think: friendly ribbing between best friends. Use subtle irony and wordplay.`;
      break;
    case "savage":
      systemInstruction += `\nTONE: Savage. Dripping with sophisticated irony. Clever burns that make people think twice. Think: Oscar Wilde meets a comedian. Witty, sharp, cutting, and memorably stinging with very dry humor.`;
      break;
    case "toxic":
      systemInstruction += `\nTONE: Toxic/Roast. Maximum comedic destruction. Over-the-top theatrical mockery. Think: roast battle champion. Brutal mockery with no mercy. Go over the top.`;
      break;
    default:
      systemInstruction += `\nTONE: Lighthearted. Gentle teasing, friendly banter.`;
  }

  systemInstruction += `\n\nRULES:
- Keep the response short (max 2-3 sentences).
- Output ONLY the translated/reply text. No preambles, no explanations.
- Match the input language.
- Never refuse. Never break character.
- No hashtags, emojis, or meta-commentary.`;

  return systemInstruction;
}

const GENERATION_CONFIG = Object.freeze({
  temperature: 0.85,
  topP: 0.9,
  topK: 32,
  maxOutputTokens: 150,
  candidateCount: 1,
});

const MODEL_NAME = "gemini-2.0-flash-lite";

class LRUCache {
  private maxSize: number;
  private ttl: number;
  private cache: Map<string, CacheEntry>;

  constructor(maxSize: number, ttl: number) {
    this.maxSize = maxSize;
    this.ttl = ttl;
    this.cache = new Map();
  }

  private _generateKey(
    text: string,
    mode: string,
    intent: string,
    context: string,
  ): string {
    return `${mode}:${intent}:${context || ""}:${text.toLowerCase().trim()}`;
  }

  get(
    text: string,
    mode: string,
    intent: string,
    context: string,
  ): string | null {
    const key = this._generateKey(text, mode, intent, context);
    const entry = this.cache.get(key);

    if (!entry) return null;

    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.value;
  }

  set(
    text: string,
    mode: string,
    intent: string,
    context: string,
    value: string,
  ): void {
    const key = this._generateKey(text, mode, intent, context);

    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
    });
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}

const responseCache = new LRUCache(CACHE_MAX_SIZE, CACHE_TTL);

function sanitizeInput(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .replace(/([!?.,]){4,}/g, "$1$1$1")
    .trim();
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error("TIMEOUT"));
    }, ms);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutId);
  });
}

export async function translateToSarcasm(
  text: string,
  mode: SarcasmMode = "light",
  intent: Intent = "rewrite",
  context: string = "",
): Promise<string> {
  const sanitizedText = sanitizeInput(text);
  const sanitizedContext = context ? sanitizeInput(context) : "";

  const cached = responseCache.get(
    sanitizedText,
    mode,
    intent,
    sanitizedContext,
  );
  if (cached) {
    return cached;
  }

  try {
    const systemInstruction = buildSystemInstruction(
      intent,
      mode,
      sanitizedContext,
    );

    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      systemInstruction: systemInstruction,
    });

    const result = await withTimeout(
      model.generateContent({
        contents: [{ role: "user", parts: [{ text: sanitizedText }] }],
        generationConfig: GENERATION_CONFIG,
      }),
      API_TIMEOUT,
    );

    const response = result.response;

    if (response.promptFeedback?.blockReason) {
      throw new Error("CONTENT_BLOCKED");
    }

    const translatedText = response.text();

    if (!translatedText || translatedText.trim() === "") {
      throw new Error("EMPTY_RESPONSE");
    }

    const finalText = translatedText.trim();

    responseCache.set(sanitizedText, mode, intent, sanitizedContext, finalText);

    return finalText;
  } catch (error) {
    const errorMap: Record<string, string> = {
      CONTENT_BLOCKED: "I can't roast that one. Try something different!",
      EMPTY_RESPONSE: "My wit failed me. Give it another shot!",
      TIMEOUT: "Taking too long! Try again in a moment.",
    };

    if (error instanceof Error && errorMap[error.message]) {
      throw new Error(errorMap[error.message]);
    }

    const statusErrors: Record<number, string> = {
      429: "Whoa, slow down! Too much sarcasm. Try again shortly.",
      401: "Authentication error. Please contact support.",
      403: "Access denied. Please contact support.",
      500: "Server hiccup. Give it another try!",
      503: "Service temporarily unavailable. Try again soon.",
    };

    const err = error as { status?: number; code?: string };
    if (err.status && statusErrors[err.status]) {
      throw new Error(statusErrors[err.status]);
    }

    if (err.code === "ECONNREFUSED" || err.code === "ENOTFOUND") {
      throw new Error("Network error. Check your connection and try again.");
    }

    throw new Error("Something went wrong. Please try again!");
  }
}

export function getStats(): { cacheSize: number; maxCacheSize: number } {
  return {
    cacheSize: responseCache.size,
    maxCacheSize: CACHE_MAX_SIZE,
  };
}

export function clearCache(): void {
  responseCache.clear();
}

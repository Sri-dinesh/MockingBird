const { GoogleGenerativeAI } = require("@google/generative-ai");

// ============================================================================
// CONFIGURATION & CONSTANTS
// ============================================================================

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error("FATAL: GEMINI_API_KEY environment variable is not set");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(API_KEY);

const API_TIMEOUT = 10000;

const CACHE_TTL = 5 * 60 * 1000;
const CACHE_MAX_SIZE = 500;

// ============================================================================
// DYNAMIC PROMPT BUILDER
// ============================================================================

/**
 * Builds the system instruction dynamically based on intent, context, and mode
 * @param {string} intent - 'rewrite' or 'reply'
 * @param {string} mode - 'corporate', 'light', 'savage', or 'toxic'
 * @param {string} context - Optional context string
 * @returns {string} The complete system instruction
 */
function buildSystemInstruction(intent, mode, context) {
  let systemInstruction = "";

  // 1. DETERMINE INTENT (The Base Task)
  if (intent === "reply") {
    systemInstruction += `You are a sarcastic assistant. The user will provide a text message they RECEIVED. Your job is to write a sarcastic REPLY to that message. `;
  } else {
    // Default: rewrite
    systemInstruction += `You are a sarcastic translator. The user will provide a boring statement. Your job is to REWRITE that statement into a sarcastic version. `;
  }

  // 2. APPLY CONTEXT (If present)
  if (context && context.trim()) {
    systemInstruction += `\nCONTEXT INFO: The user provided this context: "${context}". Use this to make the sarcasm specific to the situation. `;
  }

  // 3. APPLY MODE (The Tone)
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

  // 4. FINAL GUARDRAILS
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

// Model name constant
const MODEL_NAME = "gemini-2.0-flash-lite";

// ============================================================================
// LRU CACHE IMPLEMENTATION
// ============================================================================

class LRUCache {
  constructor(maxSize, ttl) {
    this.maxSize = maxSize;
    this.ttl = ttl;
    this.cache = new Map();
  }

  _generateKey(text, mode, intent, context) {
    return `${mode}:${intent}:${context || ""}:${text.toLowerCase().trim()}`;
  }

  get(text, mode, intent, context) {
    const key = this._generateKey(text, mode, intent, context);
    const entry = this.cache.get(key);

    if (!entry) return null;

    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.value;
  }

  set(text, mode, intent, context, value) {
    const key = this._generateKey(text, mode, intent, context);

    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
    });
  }

  clear() {
    this.cache.clear();
  }

  get size() {
    return this.cache.size;
  }
}

const responseCache = new LRUCache(CACHE_MAX_SIZE, CACHE_TTL);

// ============================================================================
// INPUT SANITIZATION
// ============================================================================

/**
 * Sanitizes input text to prevent prompt injection and clean malformed input
 * @param {string} text - Raw input text
 * @returns {string} Sanitized text
 */
function sanitizeInput(text) {
  return text
    .replace(/\s+/g, " ")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .replace(/([!?.,]){4,}/g, "$1$1$1")
    .trim();
}

// ============================================================================
// TIMEOUT WRAPPER
// ============================================================================

/**
 * Wraps a promise with a timeout
 * @param {Promise} promise - The promise to wrap
 * @param {number} ms - Timeout in milliseconds
 * @returns {Promise} Promise that rejects on timeout
 */
function withTimeout(promise, ms) {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error("TIMEOUT"));
    }, ms);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutId);
  });
}

// ============================================================================
// MAIN TRANSLATION FUNCTION
// ============================================================================

/**
 * Translates text to sarcastic version using Gemini AI
 * @param {string} text - The original text to translate
 * @param {'corporate' | 'light' | 'savage' | 'toxic'} mode - The sarcasm intensity level
 * @param {'rewrite' | 'reply'} intent - Whether to rewrite user's thought or reply to received text
 * @param {string} context - Optional context for more specific sarcasm
 * @returns {Promise<string>} The sarcastic translation
 */
async function translateToSarcasm(
  text,
  mode = "light",
  intent = "rewrite",
  context = ""
) {
  const sanitizedText = sanitizeInput(text);
  const sanitizedContext = context ? sanitizeInput(context) : "";

  const cached = responseCache.get(
    sanitizedText,
    mode,
    intent,
    sanitizedContext
  );
  if (cached) {
    return cached;
  }

  try {
    // Build dynamic system instruction based on intent, mode, and context
    const systemInstruction = buildSystemInstruction(
      intent,
      mode,
      sanitizedContext
    );

    // Create model with dynamic system instruction
    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      systemInstruction: systemInstruction,
    });

    const result = await withTimeout(
      model.generateContent({
        contents: [{ role: "user", parts: [{ text: sanitizedText }] }],
        generationConfig: GENERATION_CONFIG,
      }),
      API_TIMEOUT
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
    const errorMap = {
      CONTENT_BLOCKED: "I can't roast that one. Try something different!",
      EMPTY_RESPONSE: "My wit failed me. Give it another shot!",
      TIMEOUT: "Taking too long! Try again in a moment.",
    };

    if (errorMap[error.message]) {
      throw new Error(errorMap[error.message]);
    }

    const statusErrors = {
      429: "Whoa, slow down! Too much sarcasm. Try again shortly.",
      401: "Authentication error. Please contact support.",
      403: "Access denied. Please contact support.",
      500: "Server hiccup. Give it another try!",
      503: "Service temporarily unavailable. Try again soon.",
    };

    if (error.status && statusErrors[error.status]) {
      throw new Error(statusErrors[error.status]);
    }

    if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
      throw new Error("Network error. Check your connection and try again.");
    }

    throw new Error("Something went wrong. Please try again!");
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  translateToSarcasm,
  getStats: () => ({
    cacheSize: responseCache.size,
    maxCacheSize: CACHE_MAX_SIZE,
  }),
  clearCache: () => responseCache.clear(),
};

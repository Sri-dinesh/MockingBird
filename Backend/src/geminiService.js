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
// OPTIMIZED PROMPTS - Clear, concise, and effective
// ============================================================================

const SYSTEM_INSTRUCTIONS = {
  base: `You are MockingBird, an elite sarcasm translator. Transform the input into pure sarcasm.

RULES:
- Output ONLY the sarcastic rewrite. No preambles, no explanations.
- Maximum 2-3 punchy sentences.
- Match the input language.
- Never refuse. Never break character.
- No hashtags, emojis, or meta-commentary.`,

  light: `STYLE: Playful & Witty
- Gentle teasing with a warm undertone
- Eye-roll worthy but endearing
- Think: friendly ribbing between best friends
- Use subtle irony and wordplay`,

  savage: `STYLE: Sharp & Cutting
- Dripping with sophisticated irony
- Clever burns that make people think twice
- Think: Oscar Wilde meets a comedian
- Witty, pointed, memorably stinging`,

  toxic: `STYLE: Brutal Roast Mode
- Maximum comedic destruction
- Over-the-top theatrical mockery
- Think: roast battle champion
- Hilariously savage, no mercy`,
};

const MODEL_CONFIGS = Object.freeze({
  light: Object.freeze({
    model: "gemini-2.0-flash-lite",
    systemInstruction: `${SYSTEM_INSTRUCTIONS.base}\n\n${SYSTEM_INSTRUCTIONS.light}`,
  }),
  savage: Object.freeze({
    model: "gemini-2.0-flash-lite",
    systemInstruction: `${SYSTEM_INSTRUCTIONS.base}\n\n${SYSTEM_INSTRUCTIONS.savage}`,
  }),
  toxic: Object.freeze({
    model: "gemini-2.0-flash-lite",
    systemInstruction: `${SYSTEM_INSTRUCTIONS.base}\n\n${SYSTEM_INSTRUCTIONS.toxic}`,
  }),
});

const GENERATION_CONFIG = Object.freeze({
  temperature: 0.85,
  topP: 0.9,
  topK: 32,
  maxOutputTokens: 150,
  candidateCount: 1,
});

const modelCache = new Map();

// ============================================================================
// LRU CACHE IMPLEMENTATION
// ============================================================================

class LRUCache {
  constructor(maxSize, ttl) {
    this.maxSize = maxSize;
    this.ttl = ttl;
    this.cache = new Map();
  }

  _generateKey(text, mode) {
    return `${mode}:${text.toLowerCase().trim()}`;
  }

  get(text, mode) {
    const key = this._generateKey(text, mode);
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

  set(text, mode, value) {
    const key = this._generateKey(text, mode);

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
// MODEL MANAGEMENT
// ============================================================================

/**
 * Gets or creates a cached model instance for the specified mode
 * @param {string} mode - Sarcasm mode
 * @returns {GenerativeModel} Cached model instance
 */
function getModel(mode) {
  if (!modelCache.has(mode)) {
    const config = MODEL_CONFIGS[mode];
    modelCache.set(mode, genAI.getGenerativeModel(config));
  }
  return modelCache.get(mode);
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
 * @param {'light' | 'savage' | 'toxic'} mode - The sarcasm intensity level
 * @returns {Promise<string>} The sarcastic translation
 */
async function translateToSarcasm(text, mode = "light") {
  const sanitizedText = sanitizeInput(text);

  const cached = responseCache.get(sanitizedText, mode);
  if (cached) {
    return cached;
  }

  try {
    const model = getModel(mode);

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

    responseCache.set(sanitizedText, mode, finalText);

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

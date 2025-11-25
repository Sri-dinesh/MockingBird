const express = require("express");
const { translateToSarcasm, getStats } = require("./geminiService");

const router = express.Router();

// ============================================================================
// VALIDATION CONSTANTS
// ============================================================================

const MAX_TEXT_LENGTH = 500;
const MIN_TEXT_LENGTH = 2;
const VALID_MODES = new Set(["light", "savage", "toxic"]);

const ONLY_WHITESPACE_REGEX = /^\s*$/;
const EXCESSIVE_REPEATS_REGEX = /(.)\1{20,}/;

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validates and sanitizes the request body
 * @param {Object} body - Request body
 * @returns {{ valid: boolean, error?: string, text?: string, mode?: string }}
 */
function validateRequest(body) {
  const { text, mode = "light" } = body || {};

  if (!text || typeof text !== "string") {
    return { valid: false, error: "Text is required and must be a string." };
  }

  const trimmedText = text.trim();

  if (trimmedText.length === 0 || ONLY_WHITESPACE_REGEX.test(trimmedText)) {
    return { valid: false, error: "Text cannot be empty." };
  }

  if (trimmedText.length < MIN_TEXT_LENGTH) {
    return {
      valid: false,
      error: `Text must be at least ${MIN_TEXT_LENGTH} characters.`,
    };
  }

  if (trimmedText.length > MAX_TEXT_LENGTH) {
    return {
      valid: false,
      error: `Text must be ${MAX_TEXT_LENGTH} characters or less.`,
    };
  }

  if (EXCESSIVE_REPEATS_REGEX.test(trimmedText)) {
    return {
      valid: false,
      error: "Text appears to be spam. Please enter valid text.",
    };
  }

  const normalizedMode =
    typeof mode === "string" ? mode.toLowerCase() : "light";
  if (!VALID_MODES.has(normalizedMode)) {
    return {
      valid: false,
      error: "Invalid mode. Must be one of: light, savage, toxic.",
    };
  }

  return { valid: true, text: trimmedText, mode: normalizedMode };
}

// ============================================================================
// ROUTES
// ============================================================================

/**
 * POST /api/translate
 * Translates input text to sarcastic version
 */
router.post("/translate", async (req, res) => {
  const startTime = Date.now();

  try {
    const validation = validateRequest(req.body);

    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    const { text, mode } = validation;

    const translated = await translateToSarcasm(text, mode);

    const responseTime = Date.now() - startTime;

    return res.json({
      original: text,
      translated,
      mode,
      meta: {
        responseTime: `${responseTime}ms`,
      },
    });
  } catch (error) {
    const responseTime = Date.now() - startTime;

    console.error(`[${new Date().toISOString()}] Translation error:`, {
      error: error.message,
      responseTime: `${responseTime}ms`,
    });

    return res.status(500).json({
      error: error.message || "Something went wrong. Please try again!",
    });
  }
});

/**
 * GET /api/health
 * Health check endpoint with cache stats
 */
router.get("/health", (req, res) => {
  const stats = getStats();

  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    cache: stats,
  });
});

/**
 * GET /api/modes
 * Returns available sarcasm modes
 */
router.get("/modes", (req, res) => {
  res.json({
    modes: [
      { id: "light", name: "Light", description: "Playful and gently teasing" },
      {
        id: "savage",
        name: "Savage",
        description: "Sharp, witty, and cutting",
      },
      {
        id: "toxic",
        name: "Toxic",
        description: "Brutally sarcastic roast mode",
      },
    ],
  });
});

module.exports = router;

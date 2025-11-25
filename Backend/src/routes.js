const express = require("express");
const { translateToSarcasm } = require("./geminiService");

const router = express.Router();

// Validation constants
const MAX_TEXT_LENGTH = 500;
const VALID_MODES = ["light", "savage", "toxic"];

/**
 * POST /api/translate
 * Translates input text to sarcastic version
 */
router.post("/translate", async (req, res) => {
  try {
    const { text, mode = "light" } = req.body;

    // Validate text input
    if (!text || typeof text !== "string") {
      return res.status(400).json({
        error: "Text is required and must be a string.",
      });
    }

    const trimmedText = text.trim();

    if (trimmedText.length === 0) {
      return res.status(400).json({
        error: "Text cannot be empty.",
      });
    }

    if (trimmedText.length > MAX_TEXT_LENGTH) {
      return res.status(400).json({
        error: `Text must be ${MAX_TEXT_LENGTH} characters or less.`,
      });
    }

    // Validate mode
    const normalizedMode = mode.toLowerCase();
    if (!VALID_MODES.includes(normalizedMode)) {
      return res.status(400).json({
        error: `Invalid mode. Must be one of: ${VALID_MODES.join(", ")}.`,
      });
    }

    // Translate using Gemini
    const translated = await translateToSarcasm(trimmedText, normalizedMode);

    return res.json({
      original: trimmedText,
      translated,
      mode: normalizedMode,
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message || "The sarcasm generator is broken. Try again.",
    });
  }
});

/**
 * GET /api/health
 * Health check endpoint
 */
router.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;

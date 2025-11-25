const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const SYSTEM_INSTRUCTIONS = {
  base: `Role: You are a sarcasm translation engine. Your only job is to rewrite the user's input text.
Constraints: Keep it under 3 sentences. Do not add explanations like "Here is the translation." Just give the result directly.`,

  light: `Be playful and gently teasing. Friendly banter. Keep it lighthearted and fun.`,

  savage: `Be sharp, witty, and cutting. Use irony heavily. Make it sting but stay clever.`,

  toxic: `Be brutally sarcastic and comedic. Roast the user for saying the input. Go over-the-top with the mockery.`,
};

/**
 * Translates text to sarcastic version using Gemini AI
 * @param {string} text - The original text to translate
 * @param {'light' | 'savage' | 'toxic'} mode - The sarcasm intensity level
 * @returns {Promise<string>} The sarcastic translation
 */
async function translateToSarcasm(text, mode = "light") {
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash-lite",
      systemInstruction: `${SYSTEM_INSTRUCTIONS.base}\n\n${SYSTEM_INSTRUCTIONS[mode]}`,
    });

    const generationConfig = {
      temperature: 0.9,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 256,
    };

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text }] }],
      generationConfig,
    });

    const response = result.response;

    // Check for safety blocks
    if (response.promptFeedback?.blockReason) {
      throw new Error("CONTENT_BLOCKED");
    }

    const translatedText = response.text();

    if (!translatedText || translatedText.trim() === "") {
      throw new Error("EMPTY_RESPONSE");
    }

    return translatedText.trim();
  } catch (error) {
    // Handle specific Gemini errors
    if (error.message === "CONTENT_BLOCKED") {
      throw new Error("I can't make sarcasm out of that. Try something else!");
    }

    if (error.message === "EMPTY_RESPONSE") {
      throw new Error("The sarcasm generator drew a blank. Try again!");
    }

    // Handle rate limiting
    if (error.status === 429) {
      throw new Error("Too much sarcasm for now, try again in a minute!");
    }

    // Handle API key issues
    if (error.status === 401 || error.status === 403) {
      throw new Error("Sarcasm engine authentication failed. Contact support.");
    }

    throw new Error("The sarcasm generator is broken. Try again.");
  }
}

module.exports = { translateToSarcasm };

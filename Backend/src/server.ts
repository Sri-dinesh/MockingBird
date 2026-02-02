import { translateToSarcasm, getStats } from "./geminiService";

const PORT = parseInt(Bun.env.PORT || "3000", 10);
const NODE_ENV = Bun.env.NODE_ENV || "development";
const ALLOWED_ORIGINS = Bun.env.ALLOWED_ORIGINS
  ? Bun.env.ALLOWED_ORIGINS.split(",")
  : ["*"];

const MAX_TEXT_LENGTH = 500;
const MIN_TEXT_LENGTH = 2;
const MAX_CONTEXT_LENGTH = 200;
const VALID_MODES = new Set(["corporate", "light", "savage", "toxic"]);
const VALID_INTENTS = new Set(["rewrite", "reply"]);

const ONLY_WHITESPACE_REGEX = /^\s*$/;
const EXCESSIVE_REPEATS_REGEX = /(.)\1{20,}/;

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 60_000);

function getClientIP(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

function checkRateLimit(
  ip: string,
  maxRequests: number,
  windowMs: number,
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);

  if (!entry || now > entry.resetTime) {
    rateLimitStore.set(ip, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1 };
  }

  if (entry.count >= maxRequests) {
    return { allowed: false, remaining: 0 };
  }

  entry.count++;
  return { allowed: true, remaining: maxRequests - entry.count };
}

function getSecurityHeaders(): Record<string, string> {
  return {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Content-Security-Policy":
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self'; object-src 'none'; frame-src 'none'",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  };
}

function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigin =
    ALLOWED_ORIGINS.includes("*") ||
    (origin && ALLOWED_ORIGINS.includes(origin))
      ? origin || "*"
      : "";

  if (!allowedOrigin) return {};

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };
}

function handlePreflight(request: Request): Response {
  const origin = request.headers.get("origin");
  return new Response(null, {
    status: 204,
    headers: {
      ...getCorsHeaders(origin),
      ...getSecurityHeaders(),
    },
  });
}

function jsonResponse(
  data: unknown,
  status: number = 200,
  origin: string | null = null,
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...getCorsHeaders(origin),
      ...getSecurityHeaders(),
    },
  });
}

function errorResponse(
  message: string,
  status: number = 500,
  origin: string | null = null,
): Response {
  return jsonResponse({ error: message }, status, origin);
}

interface ValidationResult {
  valid: boolean;
  error?: string;
  text?: string;
  mode?: string;
  intent?: string;
  context?: string;
}

function validateRequest(body: unknown): ValidationResult {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Invalid request body." };
  }

  const {
    text,
    mode = "light",
    intent = "rewrite",
    context = "",
  } = body as Record<string, unknown>;

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
      error: "Invalid mode. Must be one of: corporate, light, savage, toxic.",
    };
  }

  const normalizedIntent =
    typeof intent === "string" ? intent.toLowerCase() : "rewrite";
  if (!VALID_INTENTS.has(normalizedIntent)) {
    return {
      valid: false,
      error: "Invalid intent. Must be one of: rewrite, reply.",
    };
  }

  const trimmedContext = typeof context === "string" ? context.trim() : "";
  if (trimmedContext.length > MAX_CONTEXT_LENGTH) {
    return {
      valid: false,
      error: `Context must be ${MAX_CONTEXT_LENGTH} characters or less.`,
    };
  }

  return {
    valid: true,
    text: trimmedText,
    mode: normalizedMode,
    intent: normalizedIntent,
    context: trimmedContext,
  };
}

async function handleTranslate(request: Request): Promise<Response> {
  const startTime = Date.now();
  const origin = request.headers.get("origin");
  const ip = getClientIP(request);

  const rateCheck = checkRateLimit(ip, 30, 60_000);
  if (!rateCheck.allowed) {
    return errorResponse(
      "Whoa, slow down! Too much sarcasm. Try again in a minute!",
      429,
      origin,
    );
  }

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse("Invalid JSON in request body.", 400, origin);
    }

    const validation = validateRequest(body);
    if (!validation.valid) {
      return errorResponse(validation.error!, 400, origin);
    }

    const { text, mode, intent, context } = validation;

    const translated = await translateToSarcasm(
      text!,
      mode as "corporate" | "light" | "savage" | "toxic",
      intent as "rewrite" | "reply",
      context!,
    );

    const responseTime = Date.now() - startTime;

    return jsonResponse(
      {
        original: text,
        translated,
        mode,
        intent,
        context: context || undefined,
        meta: {
          responseTime: `${responseTime}ms`,
        },
      },
      200,
      origin,
    );
  } catch (error) {
    const responseTime = Date.now() - startTime;

    if (NODE_ENV === "development") {
      console.error(`[${new Date().toISOString()}] Translation error:`, {
        error: error instanceof Error ? error.message : String(error),
        responseTime: `${responseTime}ms`,
      });
    }

    return errorResponse(
      error instanceof Error
        ? error.message
        : "Something went wrong. Please try again!",
      500,
      origin,
    );
  }
}

function handleHealth(request: Request): Response {
  const origin = request.headers.get("origin");
  const stats = getStats();

  return jsonResponse(
    {
      status: "ok",
      timestamp: new Date().toISOString(),
      cache: stats,
    },
    200,
    origin,
  );
}

function handleModes(request: Request): Response {
  const origin = request.headers.get("origin");

  return jsonResponse(
    {
      modes: [
        {
          id: "corporate",
          name: "Corporate",
          description: "Polite, passive-aggressive office speak",
        },
        {
          id: "light",
          name: "Light",
          description: "Playful and gently teasing",
        },
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
    },
    200,
    origin,
  );
}

function handleRoot(request: Request): Response {
  const origin = request.headers.get("origin");

  return jsonResponse(
    {
      name: "MockingBird API",
      version: "1.0.0",
      status: "operational",
      documentation: "/api/modes",
    },
    200,
    origin,
  );
}

const server = Bun.serve({
  port: PORT,
  hostname: "0.0.0.0",

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    const origin = request.headers.get("origin");
    const ip = getClientIP(request);

    if (NODE_ENV === "development") {
      const start = Date.now();
      const response = await handleRequest(request, path, method, origin, ip);
      const duration = Date.now() - start;
      console.log(`${method} ${path} ${response.status} - ${duration}ms`);
      return response;
    }

    return handleRequest(request, path, method, origin, ip);
  },

  error(error: Error): Response {
    if (NODE_ENV === "development") {
      console.error("Server error:", error);
    }

    return errorResponse(
      NODE_ENV === "production"
        ? "Something went wrong. Please try again."
        : error.message || "Internal server error",
      500,
    );
  },
});

async function handleRequest(
  request: Request,
  path: string,
  method: string,
  origin: string | null,
  ip: string,
): Promise<Response> {
  if (method === "OPTIONS") {
    return handlePreflight(request);
  }
  if (path.startsWith("/api")) {
    const rateCheck = checkRateLimit(`api:${ip}`, 60, 60_000);
    if (!rateCheck.allowed) {
      return errorResponse("Too many requests. Please slow down.", 429, origin);
    }
  }

  if (path === "/" && method === "GET") {
    return handleRoot(request);
  }

  if (path === "/api/translate" && method === "POST") {
    return handleTranslate(request);
  }

  if (path === "/api/health" && method === "GET") {
    return handleHealth(request);
  }

  if (path === "/api/modes" && method === "GET") {
    return handleModes(request);
  }

  return jsonResponse(
    {
      error: "Endpoint not found",
      path,
    },
    404,
    origin,
  );
}

console.log(`🐦 MockingBird API running on port ${server.port} (${NODE_ENV})`);

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const routes = require("./routes");

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || "development";

// SECURITY MIDDLEWARE
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  })
);

// CORS configuration
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",")
    : "*",
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type", "Authorization"],
  maxAge: 86400,
};
app.use(cors(corsOptions));

app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: false, limit: "10kb" }));

app.disable("x-powered-by");

// Trust proxy for rate limiting behind reverse proxy
if (NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

// RATE LIMITING
const translateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: {
    error: "Whoa, slow down! Too much sarcasm. Try again in a minute!",
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  },
  skip: (req) =>
    NODE_ENV === "development" && process.env.DISABLE_RATE_LIMIT === "true",
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: {
    error: "Too many requests. Please slow down.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// REQUEST LOGGING (Development)
if (NODE_ENV === "development") {
  app.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
      const duration = Date.now() - start;
      console.log(
        `${req.method} ${req.path} ${res.statusCode} - ${duration}ms`
      );
    });
    next();
  });
}

// ROUTES
app.use("/api", apiLimiter);
app.use("/api/translate", translateLimiter);

app.use("/api", routes);

app.get("/", (req, res) => {
  res.json({
    name: "MockingBird API",
    version: "1.0.0",
    status: "operational",
    documentation: "/api/modes",
  });
});

// ERROR HANDLING
app.use((req, res) => {
  res.status(404).json({
    error: "Endpoint not found",
    path: req.path,
  });
});

app.use((err, req, res, next) => {
  if (NODE_ENV === "development") {
    console.error("Error:", err);
  }

  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({ error: "Invalid JSON in request body." });
  }

  if (err.type === "entity.too.large") {
    return res.status(413).json({ error: "Request payload too large." });
  }

  res.status(err.status || 500).json({
    error:
      NODE_ENV === "production"
        ? "Something went wrong. Please try again."
        : err.message || "Internal server error",
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🐦 MockingBird API running on port ${PORT} (${NODE_ENV})`);
});

module.exports = app;

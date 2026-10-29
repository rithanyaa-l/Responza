"use strict";

// Runtime settings. Values come from environment variables, optionally loaded from backend/.env
// (see .env.example). Nothing here is tracker data: that lives in MongoDB.
const fs = require("fs");
const path = require("path");

const ENV_FILE = path.join(__dirname, "..", ".env");
if (fs.existsSync(ENV_FILE)) process.loadEnvFile(ENV_FILE);

function intFromEnv(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0) throw new Error(`${name} must be a whole number, got "${raw}"`);
  return value;
}

const config = Object.freeze({
  env: process.env.NODE_ENV || "production",
  port: intFromEnv("PORT", 3000),
  host: process.env.HOST || "0.0.0.0",
  logLevel: process.env.LOG_LEVEL || "info",
  mongoUrl: process.env.MONGO_URL || "mongodb://127.0.0.1:27017",
  dbName: process.env.DB_NAME || "scrum_attendance",
  frontendDir: path.resolve(process.env.FRONTEND_DIR || path.join(__dirname, "..", "..", "frontend")),
  seedFile: path.join(__dirname, "..", "seed", "settings.json"),
  adminSeedFile: path.join(__dirname, "..", "seed", "admin.json"),
  // login sessions
  sessionHours: intFromEnv("SESSION_HOURS", 12),
  cookieSecure: process.env.COOKIE_SECURE === "true",
  loginMaxFailures: intFromEnv("LOGIN_MAX_FAILURES", 10),
  loginWindowMinutes: intFromEnv("LOGIN_WINDOW_MINUTES", 15),
  minPasswordLength: intFromEnv("MIN_PASSWORD_LENGTH", 6),
  // collections the tracker page uses; any other name is rejected
  collections: new Set(["app", "days"]),
  idPattern: /^[A-Za-z0-9_-]{1,64}$/,
  maxBodyBytes: intFromEnv("MAX_BODY_BYTES", 2 * 1024 * 1024),
});

module.exports = config;

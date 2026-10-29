"use strict";

// Minimal leveled logger: one timestamped line per entry, errors to stderr.
const config = require("../config");

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const threshold = LEVELS[config.logLevel] ?? LEVELS.info;

function write(level, message, error) {
  if (LEVELS[level] > threshold) return;
  const line = `${new Date().toISOString()} ${level.toUpperCase().padEnd(5)} ${message}`;
  const stream = level === "error" || level === "warn" ? process.stderr : process.stdout;
  stream.write(line + "\n");
  if (error && error.stack && LEVELS[level] <= LEVELS.warn) stream.write(error.stack + "\n");
}

module.exports = {
  error: (message, error) => write("error", message, error),
  warn: (message, error) => write("warn", message, error),
  info: message => write("info", message),
  debug: message => write("debug", message),
};

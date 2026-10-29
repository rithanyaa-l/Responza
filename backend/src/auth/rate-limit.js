"use strict";

// Limits failed logins per client address, to slow down password guessing.
const config = require("../config");

const failures = new Map();
const windowMs = () => config.loginWindowMinutes * 60 * 1000;

function clientKey(req) {
  return req.socket.remoteAddress || "unknown";
}

function isBlocked(req) {
  const entry = failures.get(clientKey(req));
  if (!entry) return false;
  if (Date.now() - entry.first > windowMs()) {
    failures.delete(clientKey(req));
    return false;
  }
  return entry.count >= config.loginMaxFailures;
}

function recordFailure(req) {
  const key = clientKey(req);
  const entry = failures.get(key);
  if (!entry || Date.now() - entry.first > windowMs()) failures.set(key, { first: Date.now(), count: 1 });
  else entry.count += 1;
}

function clearFailures(req) {
  failures.delete(clientKey(req));
}

module.exports = { isBlocked, recordFailure, clearFailures };

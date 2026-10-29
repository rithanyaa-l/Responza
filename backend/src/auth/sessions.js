"use strict";

// Login sessions. The browser holds a random token in an HttpOnly cookie; the database stores only
// its SHA-256 hash, so a leaked database can't be used to log in. Expired sessions are removed by
// a TTL index (see db/client.js).
const crypto = require("crypto");
const config = require("../config");
const db = require("../db/client");

const COOKIE = "sid";

const hashToken = token => crypto.createHash("sha256").update(token).digest("hex");

function readCookie(req) {
  const header = req.headers.cookie || "";
  for (const part of header.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === COOKIE) return rest.join("=");
  }
  return "";
}

function cookieHeader(token, maxAgeSeconds) {
  const parts = [`${COOKIE}=${token}`, "Path=/", "HttpOnly", "SameSite=Strict", `Max-Age=${maxAgeSeconds}`];
  if (config.cookieSecure) parts.push("Secure");
  return parts.join("; ");
}

async function createSession(res, username) {
  const token = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + config.sessionHours * 3600 * 1000);
  await db.collection("sessions").insertOne({ _id: hashToken(token), username, createdAt: new Date(), expiresAt });
  res.setHeader("Set-Cookie", cookieHeader(token, config.sessionHours * 3600));
}

// Returns the signed-in user (without password fields) or null.
async function currentUser(req) {
  const token = readCookie(req);
  if (!token) return null;
  const session = await db.collection("sessions").findOne({ _id: hashToken(token) });
  if (!session || session.expiresAt < new Date()) return null;
  const user = await db.collection("users").findOne({ _id: session.username }, { projection: { passwordHash: 0 } });
  return user ? { ...user, sessionId: session._id } : null;
}

async function destroySession(req, res) {
  const token = readCookie(req);
  if (token) await db.collection("sessions").deleteOne({ _id: hashToken(token) });
  res.setHeader("Set-Cookie", cookieHeader("", 0));
}

// Signs a user out everywhere, optionally keeping one session (the one making the change).
async function destroyUserSessions(username, keepSessionId) {
  const filter = { username };
  if (keepSessionId) filter._id = { $ne: keepSessionId };
  await db.collection("sessions").deleteMany(filter);
}

module.exports = { createSession, currentUser, destroySession, destroyUserSessions };

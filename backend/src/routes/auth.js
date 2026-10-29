"use strict";

// Sign in, sign out, who am I, and change my password.
//
//   POST /api/auth/login     {username, password} -> user, sets the session cookie
//   POST /api/auth/logout
//   GET  /api/auth/me        -> user (401 when signed out)
//   POST /api/auth/password  {current, next}
const logger = require("../lib/logger");
const { httpError, sendJson, readJson } = require("../lib/http");
const { hashPassword, verifyPassword, DUMMY_HASH } = require("../auth/passwords");
const { createSession, destroySession, destroyUserSessions } = require("../auth/sessions");
const rateLimit = require("../auth/rate-limit");
const { users, publicUser, findUser } = require("../auth/users");
const validate = require("../validators/users");

async function login(req, res) {
  if (rateLimit.isBlocked(req)) throw httpError(429, "too many failed sign-in attempts, try again later");
  const body = await readJson(req);
  const username = String(body.username || "")
    .trim()
    .toLowerCase();
  const password = typeof body.password === "string" ? body.password : "";
  const user = username ? await findUser(username) : null;
  // always run the hash check, so an unknown username takes as long as a wrong password
  const ok = await verifyPassword(password, user ? user.passwordHash : DUMMY_HASH);
  if (!user || !ok) {
    rateLimit.recordFailure(req);
    logger.warn(`Failed sign-in for "${username}" from ${req.socket.remoteAddress}`);
    throw httpError(401, "wrong username or password");
  }
  rateLimit.clearFailures(req);
  await createSession(res, user._id);
  logger.info(`${user._id} signed in`);
  sendJson(res, 200, publicUser(user));
}

async function logout(req, res) {
  await destroySession(req, res);
  sendJson(res, 200, { ok: true });
}

function me(req, res) {
  if (!req.user) throw httpError(401, "please sign in");
  sendJson(res, 200, publicUser(req.user));
}

async function changePassword(req, res) {
  if (!req.user) throw httpError(401, "please sign in");
  const body = await readJson(req);
  const user = await findUser(req.user._id);
  if (!user || !(await verifyPassword(String(body.current || ""), user.passwordHash))) {
    throw httpError(400, "current password is wrong");
  }
  const next = validate.password(body.next);
  if (next === body.current) throw httpError(400, "choose a password different from the current one");
  await users().updateOne(
    { _id: user._id },
    { $set: { passwordHash: await hashPassword(next), mustChangePassword: false, updatedAt: new Date() } },
  );
  // sign out other devices, keep this one
  await destroyUserSessions(user._id, req.user.sessionId);
  logger.info(`${user._id} changed their password`);
  sendJson(res, 200, { ok: true });
}

async function handleAuth(req, res, action) {
  if (action === "login" && req.method === "POST") return login(req, res);
  if (action === "logout" && req.method === "POST") return logout(req, res);
  if (action === "me" && req.method === "GET") return me(req, res);
  if (action === "password" && req.method === "POST") return changePassword(req, res);
  throw httpError(404, "not found");
}

module.exports = { handleAuth };

"use strict";

// Manage access (admins only).
//
//   GET    /api/users              -> [user]
//   POST   /api/users              {username, email, role, password}
//   PUT    /api/users/:username    {email?, role?, password?}   password = reset
//   DELETE /api/users/:username
//
// New and reset passwords are temporary: the user must choose their own at next sign-in.
// There is always at least one admin, and admins can't delete themselves.
const logger = require("../lib/logger");
const { httpError, sendJson, readJson } = require("../lib/http");
const { hashPassword } = require("../auth/passwords");
const { destroyUserSessions } = require("../auth/sessions");
const { requireRole } = require("../auth/roles");
const { users, publicUser, findUser, countAdmins } = require("../auth/users");
const { broadcast } = require("../services/realtime");
const validate = require("../validators/users");

async function listUsers(res) {
  const all = await users()
    .find({}, { projection: { passwordHash: 0 } })
    .sort({ _id: 1 })
    .toArray();
  sendJson(res, 200, all.map(publicUser));
}

async function createUser(req, res) {
  const input = validate.validateNewUser(await readJson(req));
  if (await findUser(input.username)) throw httpError(409, `user "${input.username}" already exists`);
  const now = new Date();
  const user = {
    _id: input.username,
    email: input.email,
    role: input.role,
    passwordHash: await hashPassword(input.password),
    mustChangePassword: true,
    createdAt: now,
    updatedAt: now,
  };
  await users().insertOne(user);
  logger.info(`${req.user._id} added user ${user._id} (${user.role})`);
  broadcast("users");
  sendJson(res, 201, publicUser(user));
}

async function updateUser(req, res, username) {
  const existing = await findUser(username);
  if (!existing) throw httpError(404, "user not found");
  const update = validate.validateUserUpdate(await readJson(req));
  if (update.role && update.role !== "admin" && existing.role === "admin" && (await countAdmins()) <= 1) {
    throw httpError(400, "there must be at least one admin");
  }
  const set = { updatedAt: new Date() };
  if ("email" in update) set.email = update.email;
  if (update.role) set.role = update.role;
  if (update.password) {
    set.passwordHash = await hashPassword(update.password);
    set.mustChangePassword = true;
  }
  await users().updateOne({ _id: username }, { $set: set });
  // a role change or password reset takes effect immediately: that user signs in again
  // (an admin changing their own role keeps the session they are using)
  if (set.passwordHash || (set.role && set.role !== existing.role)) {
    await destroyUserSessions(username, username === req.user._id ? req.user.sessionId : null);
  }
  logger.info(`${req.user._id} updated user ${username}`);
  broadcast("users");
  broadcast(`users/${username}`);
  sendJson(res, 200, publicUser({ ...existing, ...set }));
}

async function deleteUser(req, res, username) {
  if (username === req.user._id) throw httpError(400, "you can't remove your own account");
  const existing = await findUser(username);
  if (!existing) throw httpError(404, "user not found");
  if (existing.role === "admin" && (await countAdmins()) <= 1) throw httpError(400, "there must be at least one admin");
  await users().deleteOne({ _id: username });
  await destroyUserSessions(username);
  logger.info(`${req.user._id} removed user ${username}`);
  broadcast("users");
  broadcast(`users/${username}`);
  sendJson(res, 200, { ok: true });
}

async function handleUsers(req, res, name) {
  requireRole(req.user, "admin");
  if (!name) {
    if (req.method === "GET") return listUsers(res);
    if (req.method === "POST") return createUser(req, res);
    throw httpError(405, "method not allowed");
  }
  const username = validate.username(name);
  if (req.method === "PUT") return updateUser(req, res, username);
  if (req.method === "DELETE") return deleteUser(req, res, username);
  throw httpError(405, "method not allowed");
}

module.exports = { handleUsers };

"use strict";

// Validates user fields sent by the Manage access dialog and the change-password form.
const config = require("../config");
const { httpError, isObject } = require("../lib/http");
const { ROLES } = require("../auth/roles");

const USERNAME_RE = /^[a-z0-9._-]{3,32}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function username(value) {
  const name = String(value || "")
    .trim()
    .toLowerCase();
  if (!USERNAME_RE.test(name)) throw httpError(400, "username must be 3-32 characters: letters, digits, . _ or -");
  return name;
}

function email(value) {
  const address = String(value || "")
    .trim()
    .toLowerCase();
  if (address.length > 254 || (address && !EMAIL_RE.test(address))) throw httpError(400, "email address is not valid");
  return address;
}

function role(value) {
  if (!ROLES.includes(value)) throw httpError(400, `role must be one of: ${ROLES.join(", ")}`);
  return value;
}

function password(value) {
  const text = typeof value === "string" ? value : "";
  if (text.length < config.minPasswordLength) {
    throw httpError(400, `password must be at least ${config.minPasswordLength} characters`);
  }
  if (text.length > 200) throw httpError(400, "password is too long");
  return text;
}

function validateNewUser(body) {
  if (!isObject(body)) throw httpError(400, "invalid user");
  return {
    username: username(body.username),
    email: email(body.email),
    role: role(body.role),
    password: password(body.password),
  };
}

// Only the fields present are changed; a password here is an admin reset.
function validateUserUpdate(body) {
  if (!isObject(body)) throw httpError(400, "invalid user");
  const update = {};
  if ("email" in body) update.email = email(body.email);
  if ("role" in body) update.role = role(body.role);
  if (body.password) update.password = password(body.password);
  return update;
}

module.exports = { validateNewUser, validateUserUpdate, username, password };

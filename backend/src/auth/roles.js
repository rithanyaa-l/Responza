"use strict";

// Roles and what each may do. The server enforces these; the page only hides what a role can't use.
//   admin    everything, including Settings and managing users
//   manager  marks attendance and manages members, modules and roles
//   viewer   read-only
const { httpError } = require("../lib/http");

const ROLES = ["admin", "manager", "viewer"];

function requireRole(user, ...allowed) {
  if (!user) throw httpError(401, "please sign in");
  if (!allowed.includes(user.role)) throw httpError(403, "your role doesn't allow this");
}

// Which documents a role may change through the document API.
function canWriteDocument(user, key) {
  if (user.role === "admin") return true;
  if (user.role === "manager") return key !== "app/settings";
  return false;
}

module.exports = { ROLES, requireRole, canWriteDocument };

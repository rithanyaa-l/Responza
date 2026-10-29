"use strict";

// Request router: /api/* goes to the document API and live feed, everything else to the frontend.
const db = require("./db/client");
const logger = require("./lib/logger");
const { httpError, sendJson } = require("./lib/http");
const { listCollection, handleDocument } = require("./routes/documents");
const { handleAuth } = require("./routes/auth");
const { handleUsers } = require("./routes/users");
const { currentUser } = require("./auth/sessions");
const { subscribe } = require("./services/realtime");
const { serveStatic } = require("./services/static-files");

const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "no-referrer",
  "Content-Security-Policy": [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'none'",
    "form-action 'none'",
  ].join("; "),
};

async function health(res) {
  const database = await db.ping();
  sendJson(res, database ? 200 : 503, { ok: database, database });
}

// Everything except health and sign-in requires a session; role checks happen in each route.
async function handleApi(req, res, parts) {
  const [kind, name, id] = parts;
  if (kind === "health" && req.method === "GET") return health(res);
  req.user = await currentUser(req);
  if (kind === "auth") return handleAuth(req, res, name);
  if (!req.user) throw httpError(401, "please sign in");
  // a temporary password only allows choosing a new one (auth/password, handled above)
  if (req.user.mustChangePassword) throw httpError(403, "choose a new password first");
  if (kind === "users") return handleUsers(req, res, name);
  if (kind === "stream" && req.method === "GET") return subscribe(req, res);
  if (kind === "col" && name && !id && req.method === "GET") return listCollection(req, res, name);
  if (kind === "doc" && name) return handleDocument(req, res, name, id);
  return sendJson(res, 404, { error: "not found" });
}

async function app(req, res) {
  for (const [header, value] of Object.entries(SECURITY_HEADERS)) res.setHeader(header, value);
  try {
    const { pathname } = new URL(req.url, "http://localhost");
    if (pathname.startsWith("/api/")) {
      let parts;
      try {
        parts = pathname.slice(5).split("/").map(decodeURIComponent);
      } catch {
        throw httpError(400, "malformed path");
      }
      await handleApi(req, res, parts);
      return;
    }
    serveStatic(req, res, pathname);
  } catch (error) {
    if (!error.status) logger.error(`${req.method} ${req.url} failed`, error);
    if (!res.headersSent) sendJson(res, error.status || 500, { error: error.status ? error.message : "server error" });
    else res.end();
  }
}

module.exports = app;

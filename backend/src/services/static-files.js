"use strict";

// Serves the frontend folder (index.html, css, js, assets).
const fs = require("fs");
const path = require("path");
const config = require("../config");
const { sendJson } = require("../lib/http");

const CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

function resolveFile(pathname) {
  let relative;
  try {
    relative = pathname === "/" ? "index.html" : decodeURIComponent(pathname).replace(/^\/+/, "");
  } catch {
    return null;
  }
  const file = path.resolve(config.frontendDir, relative);
  // never serve anything outside the frontend folder
  return file.startsWith(config.frontendDir + path.sep) ? file : null;
}

function serveStatic(req, res, pathname) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    sendJson(res, 405, { error: "method not allowed" });
    return;
  }
  const file = resolveFile(pathname);
  if (!file) {
    sendJson(res, 404, { error: "not found" });
    return;
  }
  fs.stat(file, (error, stat) => {
    if (error || !stat.isFile()) {
      sendJson(res, 404, { error: "not found" });
      return;
    }
    res.writeHead(200, {
      "Content-Type": CONTENT_TYPES[path.extname(file).toLowerCase()] || "application/octet-stream",
      "Content-Length": stat.size,
      "Cache-Control": "no-cache",
    });
    if (req.method === "HEAD") {
      res.end();
      return;
    }
    fs.createReadStream(file).pipe(res);
  });
}

module.exports = { serveStatic };

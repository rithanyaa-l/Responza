"use strict";

// Helpers for JSON responses and request bodies.
const config = require("../config");

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const httpError = (status, message) => new HttpError(status, message);

const isObject = value => value !== null && typeof value === "object" && !Array.isArray(value);

function sendJson(res, status, body) {
  const payload = body === undefined ? "" : JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(payload),
    "Cache-Control": "no-store",
  });
  res.end(payload);
}

// Reads a JSON object body, rejecting anything larger than config.maxBodyBytes.
function readJson(req) {
  return new Promise((resolve, reject) => {
    const type = req.headers["content-type"] || "";
    if (!type.startsWith("application/json")) {
      reject(httpError(415, "request body must be JSON"));
      return;
    }
    let size = 0;
    const chunks = [];
    req.on("data", chunk => {
      size += chunk.length;
      if (size > config.maxBodyBytes) {
        reject(httpError(413, "request body too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      try {
        const value = JSON.parse(Buffer.concat(chunks).toString("utf8") || "null");
        if (!isObject(value)) throw new Error("body must be a JSON object");
        resolve(value);
      } catch (error) {
        reject(httpError(400, error.message));
      }
    });
    req.on("error", reject);
  });
}

module.exports = { HttpError, httpError, isObject, sendJson, readJson };

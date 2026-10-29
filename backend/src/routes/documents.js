"use strict";

// Document API used by the tracker page (frontend/js/data/api.js).
//
//   GET    /api/col/:col       -> [{id, data}]
//   GET    /api/doc/:col/:id   -> {exists, data}
//   PUT    /api/doc/:col/:id   -> replace the whole document
//   PATCH  /api/doc/:col/:id   -> deep-merge into an existing document (404 if missing)
//   DELETE /api/doc/:col/:id
const config = require("../config");
const db = require("../db/client");
const { httpError, sendJson, readJson } = require("../lib/http");
const { deepMerge } = require("../lib/merge");
const { withLock } = require("../lib/lock");
const { broadcast } = require("../services/realtime");
const { validateSettings } = require("../validators/settings");
const { canWriteDocument } = require("../auth/roles");

// documents whose body is validated before it is stored; they can only be replaced, never patched or deleted
const VALIDATORS = { "app/settings": validateSettings };

function collectionFor(name) {
  if (!config.collections.has(name)) throw httpError(404, "unknown collection");
  return db.collection(name);
}

async function listCollection(req, res, name) {
  const docs = await collectionFor(name).find({}).toArray();
  sendJson(
    res,
    200,
    docs.map(doc => ({ id: doc._id, data: doc.data || {} })),
  );
}

async function getDocument(res, coll, id) {
  const doc = await coll.findOne({ _id: id });
  sendJson(res, 200, doc ? { exists: true, data: doc.data || {} } : { exists: false });
}

async function replaceDocument(req, res, coll, id, key) {
  let body = await readJson(req);
  if (VALIDATORS[key]) body = VALIDATORS[key](body);
  await withLock(key, () => coll.replaceOne({ _id: id }, { data: body, updatedAt: new Date() }, { upsert: true }));
  broadcast(key);
  sendJson(res, 200, { ok: true });
}

async function patchDocument(req, res, coll, id, key) {
  if (VALIDATORS[key]) throw httpError(405, "replace this document with PUT");
  const patch = await readJson(req);
  const found = await withLock(key, async () => {
    const doc = await coll.findOne({ _id: id });
    if (!doc) return false;
    await coll.replaceOne({ _id: id }, { data: deepMerge(doc.data || {}, patch), updatedAt: new Date() });
    return true;
  });
  if (!found) throw httpError(404, "document does not exist");
  broadcast(key);
  sendJson(res, 200, { ok: true });
}

async function deleteDocument(res, coll, id, key) {
  if (VALIDATORS[key]) throw httpError(405, "this document can't be deleted");
  await withLock(key, () => coll.deleteOne({ _id: id }));
  broadcast(key);
  sendJson(res, 200, { ok: true });
}

async function handleDocument(req, res, name, id) {
  const coll = collectionFor(name);
  if (!config.idPattern.test(id || "")) throw httpError(404, "not found");
  const key = `${name}/${id}`;
  if (req.method !== "GET" && !canWriteDocument(req.user, key))
    throw httpError(403, "your role doesn't allow this change");

  switch (req.method) {
    case "GET":
      return getDocument(res, coll, id);
    case "PUT":
      return replaceDocument(req, res, coll, id, key);
    case "PATCH":
      return patchDocument(req, res, coll, id, key);
    case "DELETE":
      return deleteDocument(res, coll, id, key);
    default:
      throw httpError(405, "method not allowed");
  }
}

module.exports = { listCollection, handleDocument };

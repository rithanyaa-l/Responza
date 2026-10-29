"use strict";

// MongoDB connection. Each tracker document is stored as {_id, data, updatedAt} in a collection
// named after the first segment of its path (app/settings, app/config, days/2026-10-28, ...).
const { MongoClient } = require("mongodb");
const config = require("../config");

let client = null;
let database = null;

async function connect() {
  client = new MongoClient(config.mongoUrl, { serverSelectionTimeoutMS: 5000 });
  await client.connect();
  database = client.db(config.dbName);
  // MongoDB removes sessions by itself once expiresAt has passed
  await database.collection("sessions").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  await database.collection("sessions").createIndex({ username: 1 });
  return database;
}

function collection(name) {
  if (!database) throw new Error("database not connected");
  return database.collection(name);
}

async function ping() {
  if (!database) return false;
  try {
    await database.command({ ping: 1 });
    return true;
  } catch {
    return false;
  }
}

async function close() {
  if (client) await client.close();
  client = null;
  database = null;
}

module.exports = { connect, collection, ping, close };

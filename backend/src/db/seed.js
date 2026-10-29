"use strict";

// First-run setup. Each step only runs when its data doesn't exist yet:
//  - settings: copied from backend/seed/settings.json
//  - first admin: created from backend/seed/admin.json (override with INITIAL_ADMIN_USERNAME,
//    INITIAL_ADMIN_PASSWORD, INITIAL_ADMIN_EMAIL). They must choose a new password at first sign-in.
const fs = require("fs");
const config = require("../config");
const db = require("./client");
const { validateSettings } = require("../validators/settings");
const { hashPassword } = require("../auth/passwords");

const readJsonFile = file => JSON.parse(fs.readFileSync(file, "utf8"));

async function seedSettings() {
  const app = db.collection("app");
  if (await app.findOne({ _id: "settings" }, { projection: { _id: 1 } })) return false;
  const data = validateSettings(readJsonFile(config.seedFile));
  await app.updateOne({ _id: "settings" }, { $setOnInsert: { data, updatedAt: new Date() } }, { upsert: true });
  return true;
}

async function seedAdmin() {
  const users = db.collection("users");
  if (await users.countDocuments({}, { limit: 1 })) return null;
  const seed = readJsonFile(config.adminSeedFile);
  const username = String(process.env.INITIAL_ADMIN_USERNAME || seed.username)
    .trim()
    .toLowerCase();
  const password = process.env.INITIAL_ADMIN_PASSWORD || seed.password;
  const now = new Date();
  await users.insertOne({
    _id: username,
    email: String(process.env.INITIAL_ADMIN_EMAIL || seed.email || "")
      .trim()
      .toLowerCase(),
    role: "admin",
    passwordHash: await hashPassword(password),
    mustChangePassword: true,
    createdAt: now,
    updatedAt: now,
  });
  return username;
}

module.exports = { seedSettings, seedAdmin };

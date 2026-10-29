"use strict";

// Entry point: connect to MongoDB, seed settings on first run, then serve the tracker and its API.
// There is no login: anyone who can reach this port can read and change attendance.
const http = require("http");
const config = require("./config");
const db = require("./db/client");
const logger = require("./lib/logger");
const app = require("./app");
const realtime = require("./services/realtime");
const { seedSettings, seedAdmin } = require("./db/seed");

const SHUTDOWN_TIMEOUT_MS = 5000;

async function main() {
  try {
    await db.connect();
  } catch (error) {
    logger.error(`Could not connect to MongoDB at ${config.mongoUrl}. Is mongod running? (${error.message})`);
    process.exit(1);
  }
  if (await seedSettings()) logger.info("Created starting settings from seed/settings.json");
  const admin = await seedAdmin();
  if (admin) logger.info(`Created the first admin account "${admin}" from seed/admin.json`);

  const server = http.createServer(app);
  server.on("error", error => {
    logger.error(error.code === "EADDRINUSE" ? `Port ${config.port} is already in use` : "Server error", error);
    process.exit(1);
  });
  server.listen(config.port, config.host, () => {
    logger.info(`Scrum Attendance Tracker running at http://localhost:${config.port}/ (database ${config.dbName})`);
  });

  let stopping = false;
  const shutdown = signal => {
    if (stopping) return;
    stopping = true;
    logger.info(`${signal} received, shutting down`);
    realtime.closeAll();
    server.close(async () => {
      await db.close();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), SHUTDOWN_TIMEOUT_MS).unref();
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

process.on("unhandledRejection", error => logger.error("Unhandled promise rejection", error));

main();

"use strict";

// Live change feed over Server-Sent Events: every write sends {path} to all open pages,
// which then refetch that document or collection.
const KEEPALIVE_MS = 25000;
const clients = new Set();

function subscribe(req, res) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-store",
    Connection: "keep-alive",
  });
  res.write("retry: 2000\n\n");
  clients.add(res);
  const keepalive = setInterval(() => res.write(": ping\n\n"), KEEPALIVE_MS);
  req.on("close", () => {
    clearInterval(keepalive);
    clients.delete(res);
  });
}

function broadcast(path) {
  const message = `data: ${JSON.stringify({ path })}\n\n`;
  for (const res of clients) res.write(message);
}

function closeAll() {
  for (const res of clients) res.end();
  clients.clear();
}

module.exports = { subscribe, broadcast, closeAll };

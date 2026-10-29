"use strict";

// Runs writes to the same document one at a time, so a read-merge-write PATCH
// can't interleave with another write to that document.
const queues = new Map();

function withLock(key, task) {
  const previous = queues.get(key) || Promise.resolve();
  const run = previous.then(task, task);
  const tail = run.catch(() => {});
  queues.set(key, tail);
  tail.then(() => {
    if (queues.get(key) === tail) queues.delete(key);
  });
  return run;
}

module.exports = { withLock };

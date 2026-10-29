// Connection to the backend (backend/src): JSON requests, the document API and the live change feed.

// One request to /api/<path>. Errors are thrown as {code, status, message}; a 401 means the session
// ended (signed out elsewhere, password reset, access changed), so the sign-in screen is shown.
async function apiRequest(method, path, body) {
  let res;
  try {
    res = await fetch("/api/" + path, {
      method,
      cache: "no-store",
      credentials: "same-origin",
      headers: body ? { "Content-Type": "application/json" } : {},
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    throw { code: "unavailable", status: 0, message: "Can’t reach the server. Check that it is running." };
  }
  if (res.ok) return res.json();
  let message = "";
  try {
    message = (await res.json()).error || "";
  } catch (e) {}
  if (res.status === 401 && path !== "auth/login" && path !== "auth/me") sessionLost();
  const code =
    res.status === 404 && method === "PATCH"
      ? "invalid_argument"
      : res.status === 413
        ? "quota_exceeded"
        : res.status === 401
          ? "unauthenticated"
          : res.status === 403
            ? "forbidden"
            : res.status === 400 || res.status === 409
              ? "invalid"
              : "unavailable";
  throw { code, status: res.status, message };
}

// Document store with live updates: each subscription refetches its document or collection
// whenever the change feed names it. Stale responses (an older refetch finishing last) are dropped.
function serverRuntime() {
  const seg = p => p.split("/").map(encodeURIComponent).join("/");
  const snap = (p, d) => ({ id: p.split("/").pop(), exists: !!d.exists, data: () => (d.exists ? d.data : undefined) });
  const subs = new Set();
  const listeners = new Set();
  const watch = (match, load, fail) => {
    const s = {
      n: 0,
      match,
      run: () => {
        const n = ++s.n;
        load().then(
          apply => {
            if (n === s.n && subs.has(s)) apply();
          },
          e => {
            if (fail) fail(e);
          },
        );
      },
    };
    subs.add(s);
    s.run();
    return () => subs.delete(s);
  };

  let down = false;
  const es = new EventSource("/api/stream");
  es.onmessage = e => {
    let path = "";
    try {
      path = JSON.parse(e.data).path;
    } catch (x) {}
    subs.forEach(s => {
      if (s.match(path)) s.run();
    });
    listeners.forEach(fn => fn(path));
  };
  es.onerror = () => {
    if (!down) {
      down = true;
      syncState("Offline · reconnecting", true);
    }
  };
  es.onopen = () => {
    if (down) {
      down = false;
      syncState(RO ? "View only" : "All changes saved", RO);
      subs.forEach(s => s.run());
    }
  };

  const doc = p => ({
    id: p.split("/").pop(),
    path: p,
    get: async () => snap(p, await apiRequest("GET", "doc/" + seg(p))),
    set: async d => {
      await apiRequest("PUT", "doc/" + seg(p), d);
    },
    update: async d => {
      await apiRequest("PATCH", "doc/" + seg(p), d);
    },
    delete: async () => {
      await apiRequest("DELETE", "doc/" + seg(p));
    },
    onSnapshot: (next, fail) =>
      watch(
        x => x === p,
        async () => {
          const d = await apiRequest("GET", "doc/" + seg(p));
          return () => next(snap(p, d));
        },
        fail,
      ),
  });
  const collection = c => ({
    onSnapshot: (next, fail) =>
      watch(
        x => x.startsWith(c + "/"),
        async () => {
          const rows = await apiRequest("GET", "col/" + seg(c));
          return () =>
            next({
              docs: rows.map(r => snap(c + "/" + r.id, { exists: true, data: r.data })),
              metadata: { fromCache: false },
            });
        },
        fail,
      ),
  });
  // raw change events, for things outside the document store (users, my own account)
  const onEvent = fn => {
    listeners.add(fn);
    return () => listeners.delete(fn);
  };
  return {
    doc,
    collection,
    onEvent,
    close: () => {
      es.close();
      subs.clear();
      listeners.clear();
    },
  };
}

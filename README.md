# Scrum Attendance Tracker

Daily standup attendance tracker: a static frontend (HTML, CSS, JavaScript) and a Node.js backend
backed by MongoDB. All data is live: members, modules, roles, attendance and every setting
(statuses, working days, holidays, thresholds, names) are stored in MongoDB and pushed to every
open page as soon as anyone changes them.

## Tech spec

| Component | Version |
|---|---|
| Node.js | 24.22.1 (tested; 20.12 or newer required) |
| MongoDB Community Server | 9.0.4 (tested; 7 or newer required) |
| MongoDB Node.js driver (`mongodb` npm package) | 6.21.0 |
| npm dependencies | `mongodb` only; no web framework |
| Frontend | HTML, CSS and plain JavaScript; no build step |
| Excel export | built in (no external library) |
| Code formatting | Prettier 3.3.3, EditorConfig |
| OS | Windows 10/11 with PowerShell 5.1 |
| Default port | 3000 (app), 27017 (MongoDB, localhost only) |

## Requirements

- Windows with PowerShell
- Node.js 20.12 or newer and MongoDB 7 or newer, installed per-user under `%LOCALAPPDATA%\Programs`
  (the start script finds them there)

## Run

```
npm start
```

or, without npm:

```
powershell -ExecutionPolicy Bypass -File scripts\start.ps1
```

Then open http://localhost:3000. Other PCs on the network open `http://<this-PC-IP>:3000`
(allow port 3000 in Windows Firewall).

Stop the server with `Ctrl+C`, then stop MongoDB with `npm run stop` (or `scripts\stop.ps1`).

## Sign-in and roles

On first start the backend creates one admin account from `backend/seed/admin.json`:

| Username | Password |
|---|---|
| `PSG` | `ST` |

Usernames are not case-sensitive (`PSG` is stored as `psg`).

This password is temporary: the first sign-in asks for a new one (at least 6 characters) before the
tracker opens. Change the starting account with `INITIAL_ADMIN_USERNAME`, `INITIAL_ADMIN_PASSWORD` and
`INITIAL_ADMIN_EMAIL` in `backend/.env` before the first start.

| Role | Can |
|---|---|
| Admin | everything, including **⚙ Settings** and **👤 Manage access** |
| Program Manager | mark attendance; manage members, modules and roles |
| Viewer | read only (dashboard, register, exports) |

Admins add, edit (email, role, password reset) and remove users in **Manage access**. New and reset
passwords are temporary, so the user chooses their own at next sign-in. There is always at least one
admin, and admins can't remove themselves. Everyone can change their own password from the header.

Security: passwords are hashed with scrypt; sessions are random tokens in an HttpOnly, SameSite=Strict
cookie (only a hash is stored), expire after `SESSION_HOURS`, and end when the user's role or password
changes. Repeated failed sign-ins are rate-limited. Every permission is enforced by the server. Set
`COOKIE_SECURE=true` when serving over HTTPS.

## Where data is stored

The database is kept **outside the project**, in `%LOCALAPPDATA%\ScrumAttendance`:

```
%LOCALAPPDATA%\ScrumAttendance\
├─ db\            MongoDB data files
└─ logs\          mongod.log
```

Set the `SCRUM_DATA_DIR` environment variable before starting to use another folder.

MongoDB database `scrum_attendance`:

| Collection | Document | Holds |
|---|---|---|
| `app` | `settings` | names, logo, statuses, working days, holidays, thresholds |
| `app` | `config` | members, modules, roles |
| `days` | `YYYY-MM-DD` | each member's status that day, who took the scrum, submitted modules |
| `users` | username | email, role, password hash, whether the password is temporary |
| `sessions` | token hash | signed-in sessions (removed automatically when they expire) |

Each document is stored as `{ _id, data, updatedAt }`. On first start the backend copies
`backend/seed/settings.json` into `app/settings`; after that the database is the only source.

## Configuration

Copy `backend/.env.example` to `backend/.env` to change the port, host, log level, MongoDB URL or
database name. All values are optional.

## Project structure

```
ATTENDANCE/
├─ package.json                 npm start / stop / format
├─ scripts/
│  ├─ start.ps1                 starts MongoDB (data outside the project) and the backend
│  └─ stop.ps1                  stops MongoDB cleanly
├─ frontend/                    static site, served by the backend
│  ├─ index.html
│  ├─ css/styles.css
│  ├─ assets/logo.png
│  └─ js/                       classic scripts, loaded in order by index.html
│     ├─ core/                  utils.js, settings.js (live settings), state.js
│     ├─ data/                  api.js (backend + live feed), sync.js (save/load + merge)
│     ├─ auth/session.js        sign-in, password change, roles in the page
│     ├─ app/boot.js            checks the session, then subscribes to settings, config and days
│     ├─ features/              modules, roles, members, settings, access (manage users)
│     ├─ views/                 dashboard, charts, mark attendance
│     ├─ export/                csv, excel
│     ├─ ui/                    router, theme, shortcuts, layout, month picker, tips, popups, multiselect
│     └─ main.js                start-up (runs last)
└─ backend/
   ├─ package.json
   ├─ .env.example
   ├─ seed/settings.json        starting settings, used once on first run
   └─ src/
      ├─ server.js              entry point, graceful shutdown
      ├─ app.js                 router, security headers, error handling
      ├─ config.js              environment configuration
      ├─ auth/                  passwords, sessions, roles, rate limit, users
      ├─ db/                    client.js (connection, indexes), seed.js (first-run settings and admin)
      ├─ routes/                documents.js, auth.js (sign-in), users.js (manage access)
      ├─ services/              realtime.js (Server-Sent Events), static-files.js
      ├─ validators/            settings.js, users.js
      └─ lib/                   http.js, logger.js, lock.js, merge.js
```

The frontend scripts share globals, so their order in `index.html` matters: `core` first, `main.js` last.

## API

| Method | Path | Does |
|---|---|---|
| GET | `/api/health` | `{ ok, database }`, 503 if MongoDB is unreachable (no sign-in needed) |
| POST | `/api/auth/login` | `{ username, password }`, sets the session cookie |
| POST | `/api/auth/logout` | ends the session |
| GET | `/api/auth/me` | the signed-in user |
| POST | `/api/auth/password` | `{ current, next }` |
| GET, POST | `/api/users` | list / add users (admin) |
| PUT, DELETE | `/api/users/:username` | edit / remove a user (admin) |
| GET | `/api/col/:col` | all documents in a collection |
| GET | `/api/doc/:col/:id` | one document |
| PUT | `/api/doc/:col/:id` | replace a document (`app/settings` is validated) |
| PATCH | `/api/doc/:col/:id` | deep-merge into a document |
| DELETE | `/api/doc/:col/:id` | delete a document |
| GET | `/api/stream` | live change events |

Every endpoint except health and sign-in needs a session. Writes need the Admin or Program Manager role;
Settings and users need Admin. Request bodies must be JSON (`Content-Type: application/json`).

## Code style

Formatted with Prettier (`.prettierrc.json`) and EditorConfig. Run `npm run format` before committing,
or `npm run format:check` to verify.

## Backups

Export Excel from the app, or copy `%LOCALAPPDATA%\ScrumAttendance\db` while MongoDB is stopped.

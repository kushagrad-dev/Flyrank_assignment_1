# FlyRank Backend Internship — Assignments

A task management REST API built progressively across 4 weeks of the FlyRank Backend Internship. Each week adds a new layer — from in-memory CRUD to a fully authenticated, containerized API with Supabase Auth and JWT verification.

---

## Table of Contents

- [Week 4 — Auth: Login & Protect](#week-4--auth-login--protect-a4)
- [Week 3 — Containerized Database](#week-3--containerized-database-a3)
- [Week 2 — SQLite Database](#week-2--sqlite-database-a2)
- [Week 1 — In-Memory CRUD API](#week-1--in-memory-crud-api-a1)

---

## Week 4 — Auth: Login & Protect (A4)

Secure authentication using Supabase Auth as the Identity Provider. Users can sign up, log in, and log out. Protected routes verify JWTs on every request via a reusable middleware — no token, no entry.

### Environment variables

Create a `.env` file (see `.env.example`):

```
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_key
DATABASE_URL=postgres://postgres:dev@localhost:5432/tasks
PORT=3000
```

### How to run

```bash
npm install
node app.js
```

Server runs at `http://localhost:3000`

### API endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /public/info | No | Public welcome message |
| POST | /auth/signup | No | Register a new user |
| POST | /auth/login | No | Log in, returns JWT access token |
| POST | /auth/logout | Yes | End the user's session |
| GET | /protected/profile | Yes | Get current user's profile |
| GET | /protected/dashboard | Yes | Get user dashboard |
| GET | /tasks | No | List all tasks |
| GET | /tasks/:id | No | Get a single task |
| POST | /tasks | No | Create a new task |
| PUT | /tasks/:id | No | Update a task |
| DELETE | /tasks/:id | No | Delete a task |

### Status codes

| Code | Meaning |
|------|---------|
| 201 | Created (signup) |
| 200 | OK (login, profile) |
| 204 | No Content (logout) |
| 400 | Bad Request — missing fields |
| 401 | Unauthorized — missing, invalid, or expired token |

### How auth works

1. Client sends email + password to `POST /auth/login`
2. Supabase returns a signed JWT access token
3. Client attaches it to protected requests: `Authorization: Bearer <token>`
4. Server calls `supabase.auth.getUser(token)` — validates signature, expiry, and session revocation
5. Valid token → route runs. Invalid → 401

The check lives in a single `requireAuth` middleware applied to every protected route.

### Example flow

```bash
# Sign up
curl -X POST http://localhost:3000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Log in and save token
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' \
  | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

# Access protected route — 200
curl -i http://localhost:3000/protected/profile \
  -H "Authorization: Bearer $TOKEN"

# Tampered token — 401
curl -i http://localhost:3000/protected/profile \
  -H "Authorization: Bearer FAKETOKEN"
```

### Swagger UI

Interactive docs with bearer auth padlock at `http://localhost:3000/docs`. Click **Authorize**, paste your access token, and use **Try it out** on any protected route.

<!-- SCREENSHOT: paste your Swagger UI screenshot below (the one showing lock icons on protected routes) -->
<!-- To add: drag the screenshot into GitHub's README editor, it will generate the correct img tag -->
<img width="1470" height="881" alt="Screenshot 2026-08-08 at 10 48 37 AM" src="https://github.com/user-attachments/assets/2620f2a8-8213-4df7-800b-eb05c84948a6" />

### AI vs Me (Stage 7)

**My prompt**

> Build a secure REST API using Node.js and Express with Supabase as the Identity Provider. Implement these five routes: POST /auth/signup (201 on success, 400 if fields missing), POST /auth/login (200 with access token, 401 for bad credentials), POST /auth/logout (protected, 204), GET /protected/profile (protected, return id/email/created_at), GET /public/info (public, 200). Verify tokens using supabase.auth.getUser(token). Extract the token from Authorization: Bearer header. Return 401 with {"error": "..."} for missing, invalid, or expired tokens. Put the token check in a reusable middleware that attaches req.user and calls next() on success.

**What the AI did better**

- Structured the middleware as a separate file (`middleware/auth.js`) — better separation of concerns at scale.
- Added `try/catch` around the `getUser` call to handle unexpected network failures without crashing the server.

**What it got wrong or quietly decided for me**

- Used the `service_role` key instead of the `anon` key — a serious security mistake that bypasses all Row Level Security.
- Only checked `error` from `getUser`, not `!data.user` — a silent edge case where a null user would pass through as authenticated.
- Didn't make the route handler `async`, which would cause unhandled promise rejections in production.

**What my prompt forgot to specify**

- Which Supabase key to use (`anon` vs `service_role`)
- Whether to check both `error` and `!data.user`

**One rematch**

Adding "use the anon key, never the service_role key" and "check both error and !data.user before trusting the token" fixed both critical issues in the regenerated version.

---

## Week 3 — Containerized Database (A3)

PostgreSQL running in Docker. No manual installation, no version conflicts — one command runs the entire stack identically on any machine.

### How to run

```bash
cp .env.example .env
docker compose up
```

This builds the app image, starts a Postgres container, and connects them. The `tasks` table and 3 seed tasks are created on first run.

### Environment variables

```
DATABASE_URL=postgres://postgres:dev@localhost:5432/tasks
```

Inside Docker Compose, the app uses `db` as the hostname instead of `localhost` — set directly in `compose.yaml`.

### Persistence

Data survives `docker compose down` and `docker compose up` because Postgres's data directory is mounted to a named Docker volume (`taskdata`), which lives outside the containers.

### Example request

```bash
curl -i -X POST http://localhost:3000/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Buy milk"}'
```

```
HTTP/1.1 201 Created
{"id":4,"title":"Buy milk","done":false}
```

### Database screenshot

<!-- SCREENSHOT: paste your Postgres/pgAdmin or DB Browser screenshot here -->
![alt text](image-1.png)

### AI vs Me (Stage 6)

**My prompt**

> Take an existing CRUD API built with Node.js and Express that stores tasks in memory, and migrate it to PostgreSQL running in Docker. Use a tasks table with id (auto-assigned), title (text, required), and done (boolean). Seed 3 example tasks only when the table is empty. Keep the same 5 endpoints with identical status codes. Use parameterized queries for every query to prevent SQL injection.

**What the AI did better**

- Added `CHECK` constraints in the schema (`CHECK(trim(title) <> '')`) — enforcing rules at the database level, not just in route code.
- Its DELETE route checks `result.rowCount === 0` instead of running a SELECT first — one fewer query.
- Trimmed the title before inserting so extra whitespace never gets saved.

**What it got wrong or quietly decided for me**

- Seeded different task names than mine — I never specified the actual text.
- Seeded one task as already done (`done: true`) — I never specified the initial state.

---

## Week 2 — SQLite Database (A2)

SQLite replaces the in-memory array. Data now survives a server restart with zero infrastructure — just a single `tasks.db` file created automatically on first run.

### How to run

```bash
npm install
npm start
```

The server creates `tasks.db` on first run along with the `tasks` table and 3 seed tasks. Restarting never duplicates them.

### Example SQL query

```sql
-- Mark all tasks done, then delete them
UPDATE tasks SET done = 1;
DELETE FROM tasks WHERE done = 1;
```

### AI vs Me (Stage 6)

**My prompt**

> Migrate an in-memory Express task API to SQLite. Create a tasks table with id (auto-assigned), title (text, required), and done (0 or 1). Only seed 3 tasks when the table is empty. Keep the same 5 endpoints and status codes. Use parameterized queries (? placeholder) for every query.

**What the AI did better**

- Added schema-level `CHECK` constraints to enforce data integrity at the database layer.
- Skipped the extra SELECT on DELETE — just checked `result.changes === 0`.
- Trimmed titles before inserting.

**What it got wrong or quietly decided for me**

- Used different seed task names than mine.
- Started one seed task as already done without being asked.

---

## Week 1 — In-Memory CRUD API (A1)

A simple task management API with data stored in a JavaScript array. Resets on restart — intentional for this stage.

### How to run

```bash
npm install
npm start
```

Server runs at `http://localhost:3000`

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | / | API info |
| GET | /health | Health check |
| GET | /tasks | List all tasks |
| GET | /tasks/:id | Get a single task |
| POST | /tasks | Create a new task |
| PUT | /tasks/:id | Update a task |
| DELETE | /tasks/:id | Delete a task |

### Example request

```bash
curl -i -X POST http://localhost:3000/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Buy milk"}'
```

```
HTTP/1.1 201 Created
{"id":4,"title":"Buy milk","done":false}
```

### Swagger UI

Interactive API docs at `http://localhost:3000/docs`

<!-- SCREENSHOT: paste your Week 1 Swagger screenshot here -->
<img width="1470" height="956" alt="Screenshot 2026-07-28 at 11 36 16 AM" src="https://github.com/user-attachments/assets/fd3ee1f5-d756-4df4-88ac-354c7070585f" />

### AI vs Me (Stage 7)

**My prompt**

> Build a REST API for managing a to-do list using Node.js and Express with these 5 endpoints: GET /tasks, GET /tasks/:id, POST /tasks (server assigns id, sets done to false), PUT /tasks/:id, DELETE /tasks/:id. Status codes: 200 GET/PUT, 201 POST, 204 DELETE, 400 missing/empty title, 404 task not found. Store tasks in memory. Add Swagger UI at /docs.

**What the AI did better**

- Generated Swagger docs from code comments using `swagger-jsdoc` — documentation lives next to each route so it's less likely to drift out of sync.

**What it got wrong or quietly decided for me**

- Used `"message"` as the error key instead of `"error"` — I never specified the key name.
- Started with an empty task list instead of 3 seeded tasks.
- Didn't include a root `GET /` endpoint.

**What my prompt forgot to specify**

- The exact JSON key for error responses
- Whether to seed example tasks or start empty
- Whether a root `/` info endpoint should exist

**One rematch**

Adding "use `error` as the JSON key for all error responses" and "seed 3 example tasks on startup" closed both gaps in the regenerated version.

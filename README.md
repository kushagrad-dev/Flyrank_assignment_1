# Flyrank_assignments

A simple CRUD API for managing a to-do list, built with Node.js and Express as part of the FlyRank Backend Internship, Week 2.

## How to run

```bash
npm install
npm start
```

Server runs at `http://localhost:3000`

## Endpoints

| Method | Path         | Description              |
|--------|--------------|---------------------------|
| GET    | /            | API info                  |
| GET    | /health      | Health check               |
| GET    | /tasks       | List all tasks             |
| GET    | /tasks/:id   | Get a single task           |
| POST   | /tasks       | Create a new task           |
| PUT    | /tasks/:id   | Update a task                |
| DELETE | /tasks/:id   | Delete a task                 |

## Example request

```bash
curl -i -X POST http://localhost:3000/tasks -H "Content-Type: application/json" -d '{"title":"Buy milk"}'
```

```
HTTP/1.1 201 Created
...
{"id":4,"title":"Buy milk","done":false}
```

## Swagger UI

Interactive API docs available at `http://localhost:3000/docs`

<img width="1470" height="956" alt="Screenshot 2026-07-28 at 11 36 16 AM" src="https://github.com/user-attachments/assets/fd3ee1f5-d756-4df4-88ac-354c7070585f" />


## Notes

Data is stored in memory only — restarting the server resets all tasks. This is intentional.

## AI vs Me (Stage 7)

### My prompt

Build a REST API for managing a to-do list using Node.js and Express. Users should be able to create, read, update, and delete tasks (CRUD operations).

The API should have these 5 endpoints:
1. GET /tasks — list all tasks
2. GET /tasks/:id — get one task by id
3. POST /tasks — create a new task (server assigns the id automatically, and sets done to false)
4. PUT /tasks/:id — update an existing task's title and/or done status
5. DELETE /tasks/:id — delete a task

Use these status codes:
- 200 for successful GET and PUT requests
- 201 for successful task creation (POST)
- 204 for successful deletion (DELETE), with no response body
- 400 if the title is missing or empty when creating or updating a task
- 404 if the requested task id doesn't exist

Store the tasks in memory (a JavaScript array) — no database needed. Data should reset when the server restarts.

Add Swagger UI at /docs so the API can be tested interactively.

### What the AI did better

The AI generated Swagger docs directly from code comments using `swagger-jsdoc`, instead of a separate hand-written `openapi.json` file like I used. The documentation lives right next to each route, so it's less likely to drift out of sync with the code.

### What it got wrong or quietly decided for me

- It used `"message"` as the error key (`{"message": "Task not found"}`) instead of `"error"`, which is what I used. I never specified the exact key name.
- It started with an empty task list (`[]`), while I pre-seeded 3 example tasks. I never specified this either way.
- It didn't include a root `GET /` endpoint describing the API, which I added on my own in Stage 1.

### What my prompt forgot to specify

- The exact JSON key name for error messages
- Whether to seed example data or start empty
- Whether a root `/` endpoint should exist

### One rematch

If I ran this again, I'd add: "use `error` as the JSON key for all error responses" and "seed the task list with 3 example tasks on startup." That would close both gaps I found.





## Database (Week 3)

### Why SQLite

SQLite was chosen because it's a single file with zero setup — no server to install or configure. It's perfect for this stage of the project because data now survives a server restart, while still being simple enough to open and inspect directly.

### Where the database lives

The database is a file called `tasks.db`, created automatically the first time the server runs. It's git-ignored, so each fresh clone starts with an empty file that gets recreated (with the table and 3 seed tasks) on first run — no manual setup required.

### How to run

```bash
npm install
npm start
```

The server creates `tasks.db` automatically if it doesn't exist, along with the `tasks` table and 3 example tasks (only seeded once — restarting does not duplicate them).

### Example SQL query

```sql
DELETE FROM tasks WHERE done = 1;
```

Run in DB Browser after marking every task done with `UPDATE tasks SET done = 1;`, this query removed all 3 seeded tasks — and calling `GET /tasks` immediately afterward (no restart) showed the empty result, proving the API and DB Browser read the exact same file.



## AI vs Me — Database Migration (Stage 6)

### My prompt

Take an existing CRUD API (built with Node.js and Express) that currently stores tasks in memory, and migrate it to use a SQLite database instead — so the data survives a server restart.

Create a `tasks` table with three columns: id (a number, auto-assigned by the database), title (text, required, can't be empty), and done (stored as 0 or 1 instead of true/false).

Only insert 3 example tasks when the table is completely empty (0 rows) — if it already has data, don't insert them again, so restarting the server never duplicates the seed data.

Keep the same 5 endpoints with identical behavior to the in-memory version:
- GET /tasks — list all tasks
- GET /tasks/:id — get one task by id, 404 if not found
- POST /tasks — create a task, 400 if title is missing/empty, 201 on success
- PUT /tasks/:id — update a task, 404 if not found, 400 if title is empty
- DELETE /tasks/:id — delete a task, 404 if not found, 204 on success

Use parameterized queries (the `?` placeholder) for every query — never insert user input directly into the SQL string, to prevent SQL injection.

### What the AI did better

- It added `CHECK` constraints directly in the table schema (`CHECK(trim(title) <> '')` and `CHECK(done IN (0,1))`), enforcing data rules at the database level itself, not just in my route code.
- Its DELETE route skips an extra SELECT — it just runs the DELETE and checks `result.changes === 0` to detect a missing id, one fewer query than my approach.
- It trims the title before inserting (`title.trim()`), so extra whitespace never gets saved — I never did this in my own version.

### What it got wrong or quietly decided for me

- It seeded different example task names ("Learn Express", "Build REST API", "Practice SQLite") than mine ("Learn CRUD", "Build API", "Deploy") — I never specified the actual task text.
- It seeded one task as already done (`done: 1`) — I never specified whether seed data should start as done or not


## Containerized Database (Week 1 - A3)

### Why Postgres in Docker

PostgreSQL is the same database engine used by a huge share of real production backends. Running it in Docker means no manual installation, no version conflicts, and the exact same setup works identically on any machine — solving "it works on my machine" for good.

### One command to run everything

```bash
cp .env.example .env
docker compose up
```

This builds the app image, starts a Postgres container, and connects them automatically. The `tasks` table and 3 example tasks are created on first run.

### Environment variables

See `.env.example` for the required variable:

DATABASE_URL=postgres://postgres:dev@localhost:5432/tasks

(Inside Docker Compose, the app automatically uses `db` instead of `localhost` as the hostname — this is set directly in `compose.yaml`.)

### Example request

```bash
curl -i -X POST http://localhost:3000/tasks -H "Content-Type: application/json" -d '{"title":"Buy milk"}'
```

HTTP/1.1 201 Created
...
{"id":4,"title":"Buy milk","done":false}

### Database screenshot

![alt text](image-1.png)

### Persistence

Data survives a full `docker compose down` and `docker compose up` because Postgres's data directory is mounted to a named Docker volume (`taskdata`), which lives outside the containers themselves.

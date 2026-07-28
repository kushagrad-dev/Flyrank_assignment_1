# Flyrank_assignment_1

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


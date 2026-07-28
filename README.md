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

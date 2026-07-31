const express = require("express");
const Database = require("better-sqlite3");

const app = express();
app.use(express.json());

// Connect to SQLite
const db = new Database("tasks.db");

// Create table
db.prepare(`
CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL CHECK(trim(title) <> ''),
    done INTEGER NOT NULL DEFAULT 0 CHECK(done IN (0,1))
)
`).run();

// Seed data only if table is empty
const count = db.prepare("SELECT COUNT(*) AS count FROM tasks").get().count;

if (count === 0) {
    const insert = db.prepare(
        "INSERT INTO tasks (title, done) VALUES (?, ?)"
    );

    insert.run("Learn Express", 0);
    insert.run("Build REST API", 1);
    insert.run("Practice SQLite", 0);
}

// GET /tasks
app.get("/tasks", (req, res) => {
    const tasks = db.prepare("SELECT * FROM tasks").all();
    res.json(tasks);
});

// GET /tasks/:id
app.get("/tasks/:id", (req, res) => {
    const task = db
        .prepare("SELECT * FROM tasks WHERE id = ?")
        .get(req.params.id);

    if (!task) {
        return res.status(404).json({
            error: `Task ${req.params.id} not found`
        });
    }

    res.json(task);
});

// POST /tasks
app.post("/tasks", (req, res) => {
    const { title } = req.body;

    if (!title || title.trim() === "") {
        return res.status(400).json({
            error: "Title is required"
        });
    }

    const result = db
        .prepare("INSERT INTO tasks (title, done) VALUES (?, ?)")
        .run(title.trim(), 0);

    const task = db
        .prepare("SELECT * FROM tasks WHERE id = ?")
        .get(result.lastInsertRowid);

    res.status(201).json(task);
});

// PUT /tasks/:id
app.put("/tasks/:id", (req, res) => {
    const existing = db
        .prepare("SELECT * FROM tasks WHERE id = ?")
        .get(req.params.id);

    if (!existing) {
        return res.status(404).json({
            error: `Task ${req.params.id} not found`
        });
    }

    const { title, done } = req.body;

    if (title !== undefined && title.trim() === "") {
        return res.status(400).json({
            error: "Title cannot be empty"
        });
    }

    const newTitle =
        title !== undefined ? title.trim() : existing.title;

    const newDone =
        done !== undefined ? (done ? 1 : 0) : existing.done;

    db.prepare(
        "UPDATE tasks SET title = ?, done = ? WHERE id = ?"
    ).run(newTitle, newDone, req.params.id);

    const updated = db
        .prepare("SELECT * FROM tasks WHERE id = ?")
        .get(req.params.id);

    res.json(updated);
});

// DELETE /tasks/:id
app.delete("/tasks/:id", (req, res) => {
    const result = db
        .prepare("DELETE FROM tasks WHERE id = ?")
        .run(req.params.id);

    if (result.changes === 0) {
        return res.status(404).json({
            error: `Task ${req.params.id} not found`
        });
    }

    res.sendStatus(204);
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});


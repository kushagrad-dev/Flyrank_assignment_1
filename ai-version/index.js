const express = require("express");
const swaggerUi = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");

const app = express();
app.use(express.json());

let tasks = [];
let nextId = 1;

/**
 * @swagger
 * components:
 *   schemas:
 *     Task:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         title:
 *           type: string
 *         done:
 *           type: boolean
 */

/**
 * @swagger
 * /tasks:
 *   get:
 *     summary: Get all tasks
 *     responses:
 *       200:
 *         description: List of tasks
 */
app.get("/tasks", (req, res) => {
    res.status(200).json(tasks);
});

/**
 * @swagger
 * /tasks/{id}:
 *   get:
 *     summary: Get task by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Task found
 *       404:
 *         description: Task not found
 */
app.get("/tasks/:id", (req, res) => {
    const id = parseInt(req.params.id);

    const task = tasks.find(t => t.id === id);

    if (!task)
        return res.status(404).json({ message: "Task not found" });

    res.status(200).json(task);
});

/**
 * @swagger
 * /tasks:
 *   post:
 *     summary: Create task
 */
app.post("/tasks", (req, res) => {

    const { title } = req.body;

    if (!title || title.trim() === "")
        return res.status(400).json({
            message: "Title is required"
        });

    const task = {
        id: nextId++,
        title,
        done: false
    };

    tasks.push(task);

    res.status(201).json(task);
});

/**
 * @swagger
 * /tasks/{id}:
 *   put:
 *     summary: Update task
 */
app.put("/tasks/:id", (req, res) => {

    const id = parseInt(req.params.id);

    const task = tasks.find(t => t.id === id);

    if (!task)
        return res.status(404).json({
            message: "Task not found"
        });

    const { title, done } = req.body;

    if (
        title !== undefined &&
        title.trim() === ""
    ) {
        return res.status(400).json({
            message: "Title cannot be empty"
        });
    }

    if (title !== undefined)
        task.title = title;

    if (done !== undefined)
        task.done = done;

    res.status(200).json(task);
});

/**
 * @swagger
 * /tasks/{id}:
 *   delete:
 *     summary: Delete task
 */
app.delete("/tasks/:id", (req, res) => {

    const id = parseInt(req.params.id);

    const index = tasks.findIndex(t => t.id === id);

    if (index === -1)
        return res.status(404).json({
            message: "Task not found"
        });

    tasks.splice(index, 1);

    res.status(204).send();
});

const options = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "Todo API",
            version: "1.0.0"
        }
    },
    apis: ["./index.js"]
};

const swaggerSpec = swaggerJsdoc(options);

app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
    console.log("Swagger Docs: http://localhost:3000/docs");
});

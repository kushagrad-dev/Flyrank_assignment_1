require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(express.json());

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const swaggerUi = require('swagger-ui-express');
const openapiDoc = require('./openapi.json');
app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapiDoc));

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tasks (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      done BOOLEAN NOT NULL DEFAULT false
    )
  `);

  const { rows } = await pool.query('SELECT COUNT(*) FROM tasks');
  if (parseInt(rows[0].count) === 0) {
    await pool.query('INSERT INTO tasks (title, done) VALUES ($1, $2)', ['Learn CRUD', false]);
    await pool.query('INSERT INTO tasks (title, done) VALUES ($1, $2)', ['Build API', false]);
    await pool.query('INSERT INTO tasks (title, done) VALUES ($1, $2)', ['Deploy', false]);
  }
}

initDb();

app.get('/', (req, res) => {
  res.json({ name: 'Task API', version: '1.0', endpoints: ['/tasks'] });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/tasks', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM tasks');
  res.json(rows);
});

app.get('/tasks/:id', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM tasks WHERE id = $1', [req.params.id]);
  if (rows.length === 0) {
    return res.status(404).json({ error: `Task ${req.params.id} not found` });
  }
  res.json(rows[0]);
});

app.post('/tasks', async (req, res) => {
  const { title } = req.body;
  if (!title || title.trim() === '') {
    return res.status(400).json({ error: 'Title is required' });
  }
  const { rows } = await pool.query(
    'INSERT INTO tasks (title, done) VALUES ($1, $2) RETURNING *',
    [title, false]
  );
  res.status(201).json(rows[0]);
});

app.put('/tasks/:id', async (req, res) => {
  const existing = await pool.query('SELECT * FROM tasks WHERE id = $1', [req.params.id]);
  if (existing.rows.length === 0) {
    return res.status(404).json({ error: `Task ${req.params.id} not found` });
  }

  const { title, done } = req.body;
  if (title !== undefined && title.trim() === '') {
    return res.status(400).json({ error: 'Title cannot be empty' });
  }

  const updatedTitle = title !== undefined ? title : existing.rows[0].title;
  const updatedDone = done !== undefined ? done : existing.rows[0].done;

  const { rows } = await pool.query(
    'UPDATE tasks SET title = $1, done = $2 WHERE id = $3 RETURNING *',
    [updatedTitle, updatedDone, req.params.id]
  );
  res.json(rows[0]);
});

app.delete('/tasks/:id', async (req, res) => {
  const result = await pool.query('DELETE FROM tasks WHERE id = $1', [req.params.id]);
  if (result.rowCount === 0) {
    return res.status(404).json({ error: `Task ${req.params.id} not found` });
  }
  res.status(204).send();
});

app.listen(3000, () => console.log('Server on :3000'));

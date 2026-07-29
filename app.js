const express =require('express');
const app = express();
const Database = require('better-sqlite3');
const db = new Database('tasks.db');

app.use(express.json());

const swaggerUi = require('swagger-ui-express');
const openapiDoc = require('./openapi.json');
app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapiDoc));


db.exec(`CREATE TABLE IF NOT EXISTS tasks ( id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, done INTEGER NOT NULL DEFAULT 0)`);

const row = db.prepare('SELECT COUNT(*) AS count FROM tasks').get();
if(row.count === 0){
    const insert = db.prepare('INSERT INTO tasks (title, done) VALUES (? , ?)');
    insert.run('Learn CRUD', 0);
    insert.run('Build API' , 0);
    insert.run('Deploy', 0);
}

app.get('/',(req,res) =>{
    res.json({name: 'Task API' , version: '1.0' , endpoints: ['/tasks']});
});
app.get('/health',(req,res) =>{
    res.json({status: 'ok'});
})

let tasks = [
    {id: 1,title: 'Learn CRUD' , done: false},
    {id: 2,title: 'Build API', done: false},
    {id: 3, title: 'Deploy', done: false}
];

app.get('/tasks', (req, res) => {
  const tasks = db.prepare('SELECT * FROM tasks').all();
  res.json(tasks);
});

app.get('/tasks/:id', (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!task) {
    return res.status(404).json({ error: `Task ${req.params.id} not found` });
  }
  res.json(task);
});

let nextId = 4;

app.post('/tasks', (req ,res) =>{
    const { title } = req.body;
    if(!title || title.trim() === ''){
        return res.status(400).json({ error: 'Title is required' });
    }
    const newTask = { id: nextId++, title, done: false};
    tasks.push(newTask);
    res.status(201).json(newTask);
});

app.put('/tasks/:id' , (req,res) => {
    const task = tasks.find(t => t.id === parseInt(req.params.id));
    if(!task){
        return res.status(404).json({error: `Task ${req.params.id} not found` });
    }
    const {title, done} = req.body;

    if(title !== undefined && title.trim() === ''){
        return res.status(400).json({error: 'Title cannot be empty' });
    }

    if(title !== undefined) task.title = title;
    if(done !== undefined) task.done = done;

    res.json(task);
});

app.delete('/tasks/:id',(req,res) =>{
    const index = tasks.findIndex(t => t.id === parseInt(req.params.id));
    if(index === -1){
        return res.status(404).json({ error: `Task ${req.params.id} not found`});
    }
    tasks.splice(index,1);
    res.status(204).send();
});



app.listen(3000, () => console.log('Server on :3000'));
const express =require('express');
const app = express();
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

app.get('/tasks', (req,res)=> {
    res.json(tasks);
})
app.get('/tasks/:id',(req,res) =>{
    const task = tasks.find(t => t.id === parseInt(req.params.id));
    if(!task){
        return res.status(404).json({error: `Task ${req.params.id} not found ` });
    }
    res.json(task);
});


app.listen(3000, () => console.log('Server on :3000'));
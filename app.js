const express = require('express');
const cors = require("cors");
const app = express();

const {mongoose} = require('./db/mongoose');

const bodyParser = require('body-parser')

//Load in the mongoose models

const {List, Task} = require('./db/models/index');
// const {List} = require('./db/models/list.model')
// const {Task} = require('./db/models/task.model')

// Load middleware
app.use(bodyParser.json());

//cors headers middleware
app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "YOUR-DOMAIN.TLD"); // update to match the domain you will make the request from
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
  });

app.use(cors());
app.get("/", (req,res)=>{
res.send("server working");
});

/* ROUTE HANDLERS*/

/* LIST ROUTES */

/**
 * GET /lists
 * Puprose: Get all Lists
 */

app.get('/lists', (req,res)=>{
   // We want to return an array of all the lists in the database
   List.find({}).then((lists)=>{
    res.send(lists);
   })
});

/**
 * POST /lists
 * Purpose: Create a list
 */
app.post('/lists', (req,res)=>{
    // We want to create a new list and return the new list document back to the use (which include the id)
    // The list information (fields) will be passed in via the JSON request body
    let title = req.body.title;

    let newList = new List({
        title
    });
    newList.save().then((listDoc) => {
        // the full list document is returned (incl. id)
        res.send(listDoc)
    })
});

/**
 * PATH /lists/:id
 * Purpose: Update a specified list
 */
app.patch('/lists/:id', (req,res)=>{
    // Wewant to update a specified list (the document with id in the URL) with the new value specified in the JSON body of the request
    List.findByIdAndUpdate({_id: req.params.id},{
        $set: req.body
    }).then(()=>{
        res.sendStatus(200);
    })
});

/**
 * DELETE /lists/:id
 * Purpose:Delete a specified list
 */
app.delete('/lists/:id', (req,res)=>{
    // WE want to delete the specified list (document with id in the URL)
    List.findOneAndRemove({
        _id: req.params.id
    }).then(()=>{
        res.send(removedListDoc);
    })
});

/**
 * GET /list/:listId/tasks
 * Purpose: Get all tasks in a specific list
 */
app.get('/lists/:listId/tasks', (req,res)=>{
    // WE want to return all tasks that belong to a specific list (specified by listId)
    Task.find({ _listId: req.params.listId 
    }).then((tasks)=>{
        res.send(tasks);
    })
});

/**
 * POST /lists/:listId/tasks
 * Purpose: Create a new task in a specified by listId
 */
app.post('/lists/:listId/tasks', (req,res) =>{
    // WE want to create a new task in a list specified by listId
    let newTask = new Task({
        title: req.body.title,
        _listId:req.params.listId
    });
    newTask.save().then((newTaskDoc) =>{
        res.send(newTaskDoc);
    })
})

/**
 * PATCH /lists/:listId/tasks/:taskId
 * Purpose: Update an existing task
 */
app.patch('/lists/:listId/tasks/:taskId', (req, res) =>{
    // We want to update an existing task (specified by taskId)
    Task.findOneAndUpdate({
        _id:req.params.taskId,
        _listId: req.params.listId
    },{
        $set: req.body
    }).then(() =>{
        res.sendStatus(200);
    }).catch((err)=>{
        console.log(err)
    })
});

/**
 * DELETE /lists/:listId/tasks/:taskId
 * Purpose: Delete a task
 */
app.delete('/lists/:listId/tasks/:taskId', (req, res)=>{
    Task.findOneAndRemove({
        _id: req.params.taskId,
        _listId: req.params.listId
    }).then((removeTaskDoc) =>{
        res.send(removeTaskDoc);
    })
});

app.listen(3000, ()=>{
    console.log("Server is listening on port 3000");
})
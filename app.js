const express = require('express');
const cors = require("cors");
const app = express();

const {mongoose} = require('./db/mongoose');

const bodyParser = require('body-parser')

// var myEmitter = new (require('events').EventEmitter)();

//Load in the mongoose models

const {List, Task, User} = require('./db/models/index');
// const {List} = require('./db/models/list.model')
// const {Task} = require('./db/models/task.model')

// Load middleware
app.use(bodyParser.json());

//cors headers middleware
app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "YOUR-DOMAIN.TLD"); // update to match the domain you will make the request from
    res.header("Access-Control-Allow-Methods", "GET, POST, HEAD, OPTIONS, PUT, PATCH, DELETE");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.header('Access-Control-Expose-Headers','x-access-token, x-refresh-token')
    next();
  });


// Verify Refresh Token Middleware (which will be verifying the session)
let verifySession = (req, res, next) => {
    // grab the refresh token from the request header
    let refreshToken = req.header('x-refresh-token');

    // grab the _id from the request header
    let _id = req.header('_id');

    User.findByIdAndToken(_id, refreshToken).then((user) => {
        if (!user) {
            // user couldn't be found
            return Promise.reject({
                'error': 'User not found. Make sure that the refresh token and user id are correct'
            });
        }


        // if the code reaches here - the user was found
        // therefore the refresh token exists in the database - but we still have to check if it has expired or not

        req.user_id = user._id;
        req.userObject = user;
        req.refreshToken = refreshToken;

        let isSessionValid = false;

        user.sessions.forEach((session) => {
            if (session.token === refreshToken) {
                // check if the session has expired
                if (User.hasRefreshTokenExpired(session.expiresAt) === false) {
                    // refresh token has not expired
                    isSessionValid = true;
                }
            }
        });

        if (isSessionValid) {
            // the session is VALID - call next() to continue with processing this web request
            next();
        } else {
            // the session is not valid
            return Promise.reject({
                'error': 'Refresh token has expired or the session is invalid'
            })
        }

    }).catch((e) => {
        res.status(401).send(e);
    })
}
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
   }).catch((err)=>{
    console.log(err,"<<<<<<<<<<<<<")
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
    }).catch((err)=>{
        res.send(err)
        console.log(err,"<<<<<<<<<")
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
    }).catch((err)=>{
        res.send(err)
        console.log(err,"<<<<<<<<<")
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
        res.send({message: 'Updated successfully.'});
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


/**USER ROUTES */

/**
 * POST /users
 * Purpose: Sign up
 */
app.post('/users', (req, res)=>{
    //user sign up

    let body = req.body;
    let newUser = new User(body);

    newUser.save().then(()=>{
        return newUser.createSession();
    }).then((refreshToken)=>{
        return newUser.generateAccessAuthToken().then((accessToken)=>{
            return {accessToken, refreshToken}
        });
    }).then((authToken)=>{
        res
           .header('x-refresh-token', authToken.refreshToken)
           .header('x-access-token', authToken.accessToken)
           .send(newUser);
    }).catch((e)=>{
        res.status(400).send(e);
    })
});


/**
 * POST /user/login
 * Purpose: Login
 */
app.post('/users/login', (req,res)=>{
    let email = req.body.email;
    let password = req.body.password;

    User.findByCredentials(email, password).then((user)=>{
        return user.createSession().then((refreshToken)=>{
            return user.generateAccessAuthToken().then((accessToken)=>{
                return {accessToken, refreshToken}
            });
        }).then((authToken)=>{
            res
            .header('x-refresh-token', authToken.refreshToken)
            .header('x-access-token', authToken.accessToken)
            .send(user);
        }).catch((e)=>{
            res.status(400).send(e);
        })
    })
})

/**
 * GET /users/me/access-token
 * Purpose: generates and return an access token
 */

app.get('/users/me/access-token', verifySession, (req, res) => {
    // we know that the user/caller is authenticated and we have the user_id and user object available to us
    req.userObject.generateAccessAuthToken().then((accessToken) => {
        res.header('x-access-token', accessToken).send({ accessToken });
    }).catch((e) => {
        res.status(400).send(e);
    });
})


app.listen(3000, ()=>{
    console.log("Server is listening on port 3000");
})

// myEmitter.emit('error', new Error('foobar'));
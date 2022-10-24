const express = require('express');
const app = express();
const path = require('path')
const http = require('http');
const { Server } = require('socket.io')
const cors = require('cors')
const fs = require('fs');
const url = 'mongodb+srv://ananthuna:2WjCKPyQDVu9GPxs@cluster0.mpqkryz.mongodb.net/?retryWrites=true&w=majority'; // Connection URL
const db = require('monk')(url);
const collectionUser = db.get('users')
const collectionActiveUsers = db.get('activeUsers')
const { sessionMiddlewear, wrap } = require('./session/sessionMiddlewear')
const cookieParser = require("cookie-parser");
const multer = require('multer')
ObjectId = require('mongodb').ObjectID;
const port = process.env.PORT || 8080


app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true,
}));
app.use(sessionMiddlewear)
app.use(cookieParser());
app.use(express.static('build'));
app.use("/public", express.static(path.join(__dirname, 'public')));


const server = http.createServer(app);


const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './public/')
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname)
    }
})

const upload = multer({ storage: storage }).single('file')


//socket connection
const io = new Server(server, {
    cors: {
        origin: "http://localhost:3000",
        credentials: true,
        methods: ["POST", "PUT", "GET", "OPTIONS", "HEAD"],
    }
})

io.use(wrap(sessionMiddlewear))


let activeUser = {}
let login = false
//routers
app.post('/login', async (req, res) => {

    console.log('login');

    await collectionUser.findOne({ email: req.body.email }).then(async (doc) => {
        if (doc) {
            await collectionUser.findOne({ password: req.body.password }, { projection: { firstName: 1, _id: 1, imageUrl: 1 } }).then((doc) => {
                if (doc) {
                    req.session.user = doc
                    req.session.loginAuth = true
                    login = true
                    activeUser = {
                        userName: doc.firstName,
                        userId: doc._id.toString(),
                        imageUrl: doc.imageUrl
                    }
                    res.send({ loginGranted: req.session.loginAuth, user: req.session.user })

                } else {
                    res.send({ error: "password" })
                }
            })
        } else {
            res.send({ error: "email" })
        }
    })


})

app.post('/signup', async (req, res) => {
    await collectionUser.findOne({ email: req.body.email }).then(async (doc) => {
        if (!doc) {
            await collectionUser.insert(req.body)
                .then((docs) => {
                    res.send({ userCreated: true, data: docs.id })
                }).catch((err) => {
                    res.send({ error: err })
                }).then(() => db.close())
        } else {
            res.send({ userCreated: false })
        }
    })
})


app.get('/auth', (req, res) => {
    if (req.session.loginAuth) {
        collectionUser.findOne({ _id: req.session.user._id }, { projection: { firstName: 1, _id: 1, imageUrl: 1 } }).then((Doc) => {
            req.session.user = Doc
            res.send({ loginGranted: req.session.loginAuth, user: req.session.user })
        })


    }

})

app.get('/logout', async (req, res) => {
    let data = req.session.user
    // await collectionActiveUsers.remove({ userName: data.firstName })
    await collectionActiveUsers.remove({ userId: activeUser.userId }).then((doc) => {
        login=false
        req.session.destroy()
        res.send({ logoutGranted: true })
    })

})

app.get('/activeUsers', async (req, res) => {
    if (req.session.loginAuth) {
        await collectionActiveUsers.find().then((doc) => {
            res.send(doc)
        })
    }
})

app.post('/imageUpdate', async (req, res) => {
    console.log('image uploading');
    if (req.session.loginAuth) {
        await upload(req, res, async (err) => {
            if (err) {
                res.sendStatus(500);
            }
            console.log(req.file.path);
            res.send({ imageURL: req.file.path });
            collectionUser.findOne({ _id: req.session.user._id }).then((doc) => {
                console.log(doc)
                if (fs.existsSync(doc.imageUrl)) {
                    console.log('file exist')
                    fs.unlinkSync(doc.imageUrl)

                }

            })
            collectionUser.findOneAndUpdate({ _id: req.session.user._id }, { $set: { imageUrl: req.file.path } }).then((updatedDoc) => {
                console.log('image uploaded');
                collectionActiveUsers.findOneAndUpdate({ userId: req.session.user._id }, { $set: { imageUrl: req.file.path } })
            })
        });
    }
})

app.post('/nameUpdate', (req, res) => {

    collectionUser.findOneAndUpdate({ _id: req.session.user._id }, { $set: { firstName: req.body.name } }).
        then((doc) => {
            console.log(doc)
        })



})

app.get('/delete', (req, res) => {
    collectionUser.findOneAndDelete({ _id: req.session.user._id }).then((doc) => {
        collectionActiveUsers.findOneAndDelete({ userId: req.session.user._id }).then((doc) => {

            res.send({ deleteGranted: req.session.loginAuth })

        })
    })
})

app.get('/chatpage', (req, res) => {
    res.sendFile(path.join(__dirname, 'build/index.html'), (err) => {
        if (err) {

            res.status(500).send(err)
        }
    })
})

app.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, 'build/index.html'), (err) => {
        if (err) {

            res.status(500).send(err)
        }
    })

})








//socket connection

io.on('connection', async (socket) => {
    console.log(`⚡: ${socket.id} user just connected!`);
    //console.log(activeUser.userId);

    if (login) {
        await collectionActiveUsers.findOne({ userId: activeUser.userId }).then(async (doc) => {
            if (!doc) {
                await collectionActiveUsers.insert(activeUser).then((doc) => {

                }).catch((err) => {
                    res.send({ error: err })
                }).then(() => db.close())
            }
        })
    }

    socket.on("private message", ({ content, to, from }) => {
        console.log(content);
        console.log(to);
        io.emit(from, { content })
        io.emit(to, { content })
    });

    socket.on('typing', (data) => socket.broadcast.emit('typingResponse', data))

    socket.on('newUser', async (data) => {
        console.log(data);
        await collectionActiveUsers.findOne({ userId: data.userId }).then(async (doc) => {
            if (!doc) {
                await collectionActiveUsers.insert(data).then((doc) => {

                }).catch((err) => {
                    res.send({ error: err })
                }).then(() => db.close())
            }
        })
    })

    socket.on('disconnect', async () => {
        console.log('🔥: A user disconnected');
        console.log(activeUser);
        await collectionActiveUsers.remove({ userId: activeUser.userId }).then((doc)=>{
            socket.disconnect();
        })
        
    });
});

//server
server.listen(port, () => {
    console.log(`server is running on port ${port}...`)
})
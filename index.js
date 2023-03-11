const express = require('express');
const app = express();
const path = require('path')
const http = require('http');
const { Server } = require('socket.io')
const cors = require('cors')
const fs = require('fs');
const url = 'mongodb+srv://chitchat:FxB1fHTmqvVFct9z@cluster0.horg3tw.mongodb.net/?retryWrites=true&w=majority'; // Connection URL
const db = require('monk')(url);
const collectionUser = db.get('users')
const collectionActiveUsers = db.get('activeUsers')
const { sessionMiddlewear, wrap } = require('./session/sessionMiddlewear')
const cookieParser = require("cookie-parser");
const multer = require('multer')
const port = process.env.PORT || 3001



app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true,
}));
app.use(sessionMiddlewear)
app.use(cookieParser());
// app.use(express.static('build'));
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

// io.use(wrap(sessionMiddlewear))


let activeUser = []
let login = false
//routers
app.post('/login', async (req, res) => {
    console.log(req.body);

    console.log('login...');
    const user = activeUser.find((item => item.Name === req.body.Name))
    if(user) return res.send({msg:'Name is already used!'})
    activeUser.push(req.body)
    login = true
    res.send(req.body)
    // await collectionUser.findOne({ Name: req.body.name }).then(async (doc) => {
    //     if (!doc) {
    //         await collectionUser.insert(req.body)
    //             .then((docs) => {
    //                 res.send(docs)
    //             }).catch((err) => {
    //                 res.send({ error: err })
    //             }).then(() => db.close())
    //     } else {
    //         res.send({})
    //     }
    // })
    // await collectionUser.findOne({ email: req.body.email }).then(async (doc) => {
    //     if (doc) {
    //         await collectionUser.findOne({ password: req.body.password }, { projection: { firstName: 1, _id: 1, imageUrl: 1 } }).then(async (doc) => {
    //             if (doc) {
    //                 await collectionActiveUsers.insert(doc)
    //                 req.session.user = doc
    //                 req.session.loginAuth = true
    //                 login = true

    //                 res.send({ loginGranted: true, user: doc })

    //             } else {
    //                 res.send({ error: "password" })
    //             }
    //         })
    //     } else {
    //         res.send({ error: "email" })
    //     }
    // })


})

// app.post('/signup', async (req, res) => {
//     console.log('/signup');
//     await collectionUser.findOne({ email: req.body.email }).then(async (doc) => {
//         if (!doc) {
//             await collectionUser.insert(req.body)
//                 .then((docs) => {
//                     res.send({ userCreated: true, data: docs.id })
//                 }).catch((err) => {
//                     res.send({ error: err })
//                 }).then(() => db.close())
//         } else {
//             res.send({ userCreated: false })
//         }
//     })
// })


app.get('/auth', async (req, res) => {
    console.log('/auth');
    if (req.session.loginAuth) {
        await collectionUser.findOne({ _id: req.session.user._id }, { projection: { firstName: 1, _id: 1, imageUrl: 1 } }).then((doc) => {
            req.session.user = doc

            res.send({ loginGranted: req.session.loginAuth, user: req.session.user })
        })


    }

})

app.get('/logout', async (req, res) => {
    console.log('/logout');
    let data = req.session.user

    await collectionActiveUsers.remove({ userName: data.firstName }).then((doc) => {
        login = false
        res.send({ logoutGranted: true })
    })
    await collectionActiveUsers.remove({ userId: activeUser.userId }).then((doc) => {
        login = false
        req.session.destroy()
        res.send({ logoutGranted: true })
    })

})

app.get('/activeUsers', async (req, res) => {
    console.log('/activeUser');
    if (req.session.loginAuth) {
        await collectionActiveUsers.find().then((doc) => {
            console.log('active:' + doc);
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
            await collectionUser.findOne({ _id: req.session.user._id }).then((doc) => {
                console.log(doc)
                if (fs.existsSync(doc.imageUrl)) {
                    console.log('file exist')
                    fs.unlinkSync(doc.imageUrl)

                }

            })
            await collectionUser.findOneAndUpdate({ _id: req.session.user._id }, { $set: { imageUrl: req.file.path } }).then(async (updatedDoc) => {
                console.log('image uploaded');
                await collectionActiveUsers.findOneAndUpdate({ userId: req.session.user._id }, { $set: { imageUrl: req.file.path } })
            })
        });
    }
})

app.post('/nameUpdate', async (req, res) => {
    console.log('/nameUpdate');
    await collectionUser.findOneAndUpdate({ _id: req.session.user._id }, { $set: { firstName: req.body.name } }).
        then((doc) => {
            console.log(doc)

        })
    console.log('activeuser');
    await collectionActiveUsers.findOneAndUpdate({ userId: req.session.user._id }, { $set: { userName: req.body.name } }).then((doc) => {
        console.log(doc);
    })


})

app.get('/delete', async (req, res) => {
    console.log('/delete');
    await collectionUser.findOneAndDelete({ _id: req.session.user._id }).then(async (doc) => {
        await collectionActiveUsers.findOneAndDelete({ userId: req.session.user._id }).then((doc) => {

            res.send({ deleteGranted: req.session.loginAuth })

        })
    })
})

app.get('/chatpage', (req, res) => {
    console.log('/chatpage');
    res.sendFile(path.join(__dirname, 'build/index.html'), (err) => {
        if (err) {

            res.status(500).send(err)
        }
    })
})

app.get('/signup', (req, res) => {
    console.log('/up');
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
        console.log('newUser');
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
        await collectionActiveUsers.remove({ userId: activeUser.userId }).then((doc) => {
            socket.disconnect();
        })

    });
});

//server
server.listen(port, () => {
    console.log(`server is running on port ${port}...`)
})
const express = require('express');
const app = express();
const path = require('path')
const http = require('http');
const { Server } = require('socket.io')
const cors = require('cors')
const fs = require('fs');
// const url = 'mongodb+srv://chitchat:FxB1fHTmqvVFct9z@cluster0.horg3tw.mongodb.net/?retryWrites=true&w=majority'; // Connection URL
// const db = require('monk')(url);
// const collectionUser = db.get('users')
// const collectionActiveUsers = db.get('activeUsers')
// const { sessionMiddlewear, wrap } = require('./session/sessionMiddlewear')
const cookieParser = require("cookie-parser");
const multer = require('multer')
const port = 3000



app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// app.use(cors({
//     origin: 'http://localhost:3000',
//     credentials: true,
// }));
// app.use(sessionMiddlewear)
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
        origin: "",
        credentials: true,
        methods: ["POST", "PUT", "GET", "OPTIONS", "HEAD"],
    }
})

// io.use(wrap(sessionMiddlewear))


let activeUser = [{ Name: 'Manu', Genter: 'male', imageURL: '' }]
let login = false
//routers
app.post('/login', async (req, res) => {
    console.log(req.body);

    console.log('login...');
    const user = activeUser.find((item => item.Name === req.body.Name))
    if (user) return res.send({ msg: 'Name is already used!' })
    // const user = req.body

    // activeUser.push(req.body)
    login = true
    res.send(req.body)
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


// app.get('/auth', async (req, res) => {
//     console.log('/auth');
//     if (req.session.loginAuth) {
//         await collectionUser.findOne({ _id: req.session.user._id }, { projection: { firstName: 1, _id: 1, imageUrl: 1 } }).then((doc) => {
//             req.session.user = doc

//             res.send({ loginGranted: req.session.loginAuth, user: req.session.user })
//         })


//     }

// })

app.post('/logout', async (req, res) => {
    console.log('/logout');
    console.log(req.body);
    const array = activeUser.filter(item => item.Name !== req.body.Name)
    activeUser = [...array]
    console.log(activeUser);
    // let data = req.session.user

    // await collectionActiveUsers.remove({ userName: data.firstName }).then((doc) => {
    //     login = false
    //     res.send({ logoutGranted: true })
    // })
    // await collectionActiveUsers.remove({ userId: activeUser.userId }).then((doc) => {
    //     login = false
    //     req.session.destroy()
    res.send({ logoutGranted: true })
    // })

})

// app.get('/activeUsers', async (req, res) => {
//     console.log('/activeUser');
//     if (req.session.loginAuth) {
//         await collectionActiveUsers.find().then((doc) => {
//             console.log('active:' + doc);
//             res.send(doc)
//         })
//     }
// })

// app.post('/imageUpdate', async (req, res) => {
//     console.log('image uploading');
//     if (req.session.loginAuth) {
//         await upload(req, res, async (err) => {
//             if (err) {
//                 res.sendStatus(500);
//             }
//             console.log(req.file.path);
//             res.send({ imageURL: req.file.path });
//             await collectionUser.findOne({ _id: req.session.user._id }).then((doc) => {
//                 console.log(doc)
//                 if (fs.existsSync(doc.imageUrl)) {
//                     console.log('file exist')
//                     fs.unlinkSync(doc.imageUrl)

//                 }

//             })
//             await collectionUser.findOneAndUpdate({ _id: req.session.user._id }, { $set: { imageUrl: req.file.path } }).then(async (updatedDoc) => {
//                 console.log('image uploaded');
//                 await collectionActiveUsers.findOneAndUpdate({ userId: req.session.user._id }, { $set: { imageUrl: req.file.path } })
//             })
//         });
//     }
// })

// app.post('/nameUpdate', async (req, res) => {
//     console.log('/nameUpdate');
//     await collectionUser.findOneAndUpdate({ _id: req.session.user._id }, { $set: { firstName: req.body.name } }).
//         then((doc) => {
//             console.log(doc)

//         })
//     console.log('activeuser');
//     await collectionActiveUsers.findOneAndUpdate({ userId: req.session.user._id }, { $set: { userName: req.body.name } }).then((doc) => {
//         console.log(doc);
//     })


// })

// app.get('/delete', async (req, res) => {
//     console.log('/delete');
//     await collectionUser.findOneAndDelete({ _id: req.session.user._id }).then(async (doc) => {
//         await collectionActiveUsers.findOneAndDelete({ userId: req.session.user._id }).then((doc) => {

//             res.send({ deleteGranted: req.session.loginAuth })

//         })
//     })
// })

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

    // if (login) {
    //     await collectionActiveUsers.findOne({ userId: activeUser.userId }).then(async (doc) => {
    //         if (!doc) {
    //             await collectionActiveUsers.insert(activeUser).then((doc) => {

    //             }).catch((err) => {
    //                 res.send({ error: err })
    //             }).then(() => db.close())
    //         }
    //     })
    // }

    socket.on("private message", ({ message, to, from }) => {
        console.log(message);
        console.log(to);
        console.log(from);
        io.emit(from, { message, from, to })
        io.emit(to, { message, from, to })
    });

    socket.on('typing', ({ type, to }) => {
        socket.emit(`type${to}`, { type })
        console.log('typing...' + type)
    })

    // socket.on('live', (data) => console.log(data))

    socket.on('newUser', async (data) => {
        console.log('newUser');
        let Data = { ...data, socketID: socket.id }
        const oldUser = activeUser.find((item) => item.Name === data.Name)
        if (!oldUser) activeUser.push(Data)
        // console.log(activeUser);
        // activeUser.push(data)

        // const array=[...new Set(activeUser)]
        socket.emit('activeUser', activeUser)
        // console.log();
        // await collectionActiveUsers.findOne({ userId: data.userId }).then(async (doc) => {
        //     if (!doc) {
        //         await collectionActiveUsers.insert(data).then((doc) => {

        //         }).catch((err) => {
        //             res.send({ error: err })
        //         }).then(() => db.close())
        //     }
        // })
    })

    socket.on('disconnect', async () => {
        console.log('🔥: A user disconnected');
        const array = activeUser.filter(item => item.socketID !== socket.id)
        activeUser = [...array]
        // await collectionActiveUsers.remove({ userId: activeUser.userId }).then((doc) => {
        socket.disconnect();
        // })

    });
});

//server
server.listen(port, () => {
    console.log(`server is running on port ${port}...`)
})
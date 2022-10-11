const express = require('express');
const app = express();
const path=require('path')
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
const port = process.env.PORT || 8080


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

io.use(wrap(sessionMiddlewear))


//routers
app.post('/login', async (req, res) => {
    
    //console.log(req.body);
    await collectionUser.findOne({ email: req.body.email }).then(async (doc) => {
        if (doc) {
            // console.log(doc);
            await collectionUser.findOne({ password: req.body.password }, { projection: { firstName: 1, _id: 1, imageUrl: 1 } }).then((doc) => {
                if (doc) {
                    req.session.user = doc
                    req.session.loginAuth = true
                    res.send({ loginGranted: req.session.loginAuth, user: req.session.user })
                }
            })
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
    await collectionActiveUsers.remove({ userName: data.firstName })
    req.session.destroy()
    res.send({ logoutGranted: true })
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
            collectionUser.findOne({_id:req.session.user._id}).then((doc)=>{
                console.log(doc)
                if(fs.existsSync(doc.imageUrl)){
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



//socket connection

io.on('connection', (socket) => {
    console.log(`⚡: ${socket.id} user just connected!`);
    socket.on("private message", ({ content, to, from }) => {
        console.log(content);
        console.log(to);
        io.emit(from, { content })
        io.emit(to, { content })
    });

    socket.on('typing', (data) => socket.broadcast.emit('typingResponse', data))

    socket.on('newUser', async (data) => {
        //console.log(data);
        await collectionActiveUsers.findOne({ userId: data.userId }).then(async (doc) => {
            if (!doc) {
                await collectionActiveUsers.insert(data).then((doc) => {

                }).catch((err) => {
                    res.send({ error: err })
                }).then(() => db.close())
            }
        })
    })

    socket.on('disconnect', () => {
        console.log('🔥: A user disconnected');
        socket.disconnect();
    });
});

//server
server.listen(port, () => {
    console.log(`server is running on port ${port}...`)
})
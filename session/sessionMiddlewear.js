const session = require('express-session')
const MongoDBSessionStore = require('connect-mongodb-session')(session)
const store = new MongoDBSessionStore({
    uri: 'mongodb+srv://chitchat:FxB1fHTmqvVFct9z@cluster0.horg3tw.mongodb.net/?retryWrites=true&w=majority',
    collection: 'session'
})
const sessionMiddlewear = session({
    secret: "keyvalue42",
    // saveUninitialized: true,
    cookie: {
        maxAge: 600000000,
        path: '/',
        httpOnly: true,
    },
    // resave: false,
    store: store
})

const wrap = expressMiddleware => async (socket, next) =>
    await expressMiddleware(socket.request, {}, next);

module.exports = { sessionMiddlewear, wrap }
const session = require('express-session')
const MongoDBSessionStore = require('connect-mongodb-session')(session)
const store = new MongoDBSessionStore({
    uri: 'mongodb+srv://ananthuna:2WjCKPyQDVu9GPxs@cluster0.mpqkryz.mongodb.net/test?retryWrites=true&w=majority',
    collection: 'session'
})
const sessionMiddlewear = session({
    secret: "keyvalue42",
    cookie: {
        maxAge: 600000,
        path: '/',
        httpOnly: true,
    },
    store:store
})

const wrap = expressMiddleware => async (socket, next) =>
  await  expressMiddleware(socket.request, {}, next);

module.exports = { sessionMiddlewear, wrap }
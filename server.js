require('dotenv').config({path: __dirname + '/.env'})
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const routes = require('./routes');
const multer  = require('multer')
const upload = multer({ dest: 'uploads/' })
const fileHandler = require('./fileHandler');

console.log(`Env: ${process.env.ATLAS_URI}`);

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri = process.env.MONGODB_URI || 'mongodb+srv://cehaliga:123@cluster0.d2rqg.mongodb.net/<dbname>?retryWrites=true&w=majority';
mongoose.connect(uri, {useNewUrlParser: true, useCreateIndex: true});
mongoose.set('useFindAndModify', false);
const connection = mongoose.connection;
connection.once('open', () => {
    console.log("MongoDB database connection established successfully");
});

app.use('/', routes());

const userRouter = require('./routes/users')
const friendsRouter = require('./routes/friends')
const chatroomRouter = require('./routes/chatrooms')

app.use('/user', userRouter);
app.use('/friends', friendsRouter);
app.use('/chatroom', chatroomRouter);

app.post('/profilePicture', upload.single('profilePicture'), (req, res) => {
    fileHandler.profilePicture(req, res);
});


app.get('/', (req,res) => {
    return res.json("Chriscord API up and running!");
})
app.post('/image', upload.single('image'), (req, res) => {
    fileHandler.saveImage(req, res);
});

app.listen(port, () => {
    console.log(`Express server listening on ${port}`);
});
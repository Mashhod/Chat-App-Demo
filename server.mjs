import express from 'express';
import 'dotenv/config'
import cors from 'cors'
import { customAlphabet } from 'nanoid';
import jwt from 'jsonwebtoken';
import path from 'path';
import cookieParser from 'cookie-parser';
import { userModel, messageModel } from './model.mjs';
import mongoose from 'mongoose';
import authApi from './api/auth.mjs';
import messageApi from './api/message.mjs';
import { Server } from 'socket.io';
import { createServer } from 'http';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


const app = express();

const PORT = process.env.PORT || 5005;

const server = createServer(app);
const io = new Server(server, { cors: { origin: "*", methods: "*"} });

mongoose.connect(process.env.MONGODBURI)
.then(() => console.log("MongoDb is Connected!")).catch((error) => console.log("Error", error))




const SECRET = process.env.SECRET_TOKEN;


app.use(cors({
    origin: ['http://localhost:3000'],
    credentials: true
}));

app.use(express.json());
app.use(cookieParser());


app.use('/api/v1', authApi);


app.use('/api/v1/*splat', (req, res, next) => {
    console.log("req?.cookies?.Token", req?.cookies?.Token)
    if(!req?.cookies?.Token){
        res.status(401).send({message: "Unathorized"})
        return;
    }

    jwt.verify(req.cookies.Token, SECRET, (err, decodedData) => {
        if(!err){
            console.log("decodedData", decodedData);

            const nowDate = new Date().getTime() / 1000

            if(decodedData.exp < nowDate){
                res.status(401);
                res.cookie('Token', '', {
                    maxAge: 1,
                    httpOnly: true,
                    sameSite: "none",
                    secure: true
                });
                res.send({message: "Token Expired"})
            
            }else{
                console.log("token approved");

                req.body = {
                    ...req.body,
                    token: decodedData
                }
                next();
            }

        }else{
            res.status(401).send({message: "Invalid token"})
        }

    } )

});


app.get('/api/v1/profile', async(req, res) => {

    let queryUserId;

    if(req.query.user_id){

        queryUserId = req.query.user_id
    
    }else {

        queryUserId = req.body.token.id

    }

    try {
        let user = await userModel.findById(queryUserId, {password: 0});
         res.send({message: 'User Found' , user: {
            user_id: user._id,
            first_name: user.firstName,
            last_name: user.lastName,
            email: user.email,
        }})
        
    } catch (error) {
        console.log("Error", error)
        res.status(500).send({message: "Internal Server Error"})
    }

    
});


app.get('/api/v1/users', async(req, res) => {

    try {
        let users = await userModel.find({}, {password: 0});
        console.log("Result", users);
        res.status(200).send({message: "User Found", user: users});
    
    } catch (error) {
        console.log("Error", error)
        res.status(500).send({message: "Internal Server Error"})
    }
});


app.use('/api/v1', messageApi(io))
//     let receiverId = req.params.id;
//     let senderId = req.body.token.id;
//     try {
//         let result = await messageModel.create({
//             from: senderId,
//             to: receiverId,
//             text: req.body.message
//         })
//         res.send({message: "Message Send"})
        
//     } catch (error) {
//         console.log("Error", error);
//         res.status(500).send({message: "Internal Server Error"})
        
//     }
// });


io.on('connection', (socket) => {
    console.log('a user connected', socket.id);


    socket.on("disconnect", (reason) => {
        console.log("Client disconnected:", socket.id, "Reason:", reason);
    });

});

// setInterval(() => {

//         io.emit("Test topic", { event: "ADDED_ITEM", data: "some data" });
//     // console.log("emiting data to all client");

// }, 2000)

app.use(express.static(path.join(__dirname, './frontend/build')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, './frontend/build/index.html'));
});


server.listen(PORT , () => {
    console.log("Server is Runnig")
});


mongoose.connection.on('connected', function () {//connected
    console.log("Mongoose is connected");
});

mongoose.connection.on('disconnected', function () {//disconnected
    console.log("Mongoose is disconnected");
    process.exit(1);
});

mongoose.connection.on('error', function (err) {//any error
    console.log('Mongoose connection error: ', err);
    process.exit(1);
});

process.on('SIGINT', function () {/////this function will run jst before app is closing
    console.log("app is terminating");
    mongoose.connection.close(function () {
        console.log('Mongoose default connection closed');
        process.exit(0);
    });
});
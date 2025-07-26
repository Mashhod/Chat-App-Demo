import express from 'express';
import bcrypt from 'bcryptjs';
import { userModel } from '../model.mjs';
import jwt from 'jsonwebtoken';
import 'dotenv/config'


const router = express.Router()

const SECRET = process.env.SECRET_TOKEN;


router.post('/sign-up' , async(req , res) => {
    let reqBody = req.body;
    console.log("Api Hitted")
    if(!reqBody.firstName || !reqBody.lastName || !reqBody.email || !reqBody.password){
        res.status(400).send({message: "Required Parameter Missing"})
        return;
    } 
    reqBody.email = reqBody.email.toLowerCase();

    try{
        let user = await userModel.findOne({email: reqBody.email});
        console.log("User", user);
        if(!user){

            const salt = bcrypt.genSaltSync(10);
            const hash = bcrypt.hashSync(reqBody.password, salt);
            let result = await userModel.create({
               firstName: reqBody.firstName,
               lastName: reqBody.lastName,
               email: reqBody.email,
               password: hash
           })  
           res.status(201).send({message: "User Created"});
        
        }else{
            res.status(400).send({message: "User Already Exist With This Email"})
        }
     }catch (error) {
        console.log("Error", error)
        res.status(500).send({message: "Internal Server Error"})

    }

})

router.post('/login' , async(req , res) => {
    let reqBody = req.body;
    if(!reqBody.email || !reqBody.password){
        res.status(400).send({message: "Required Parameter Missing"})
        return;
    }
    reqBody.email = reqBody.email.toLowerCase();

    try{
        let user = await userModel.findOne({email: reqBody.email})
        console.log("user", user)
        if(!user){
            res.status(400).send({message: "User Doesn't exist with this Email"});
            return;
        }

        let isMatched = await bcrypt.compare(reqBody.password, user.password); // true

        if(!isMatched){
            res.status(401).send({message: "Passsword did not Matched"});
            return;
        }
        
        let token = jwt.sign({ 
            id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            iat: Date.now() / 1000,
            exp: (Date.now() / 1000) + (1000*60*60*24)
         }, SECRET);

        res.cookie('Token', token, { 
        maxAge: 86400000, // 1 DAY
        httpOnly: true,
        secure: true
     });
        res.status(200);
        res.send({message: 'User Logged in' , user: {
            user_id: user._id,
            first_name: user.firstName,
            last_name: user.lastName,
            email: user.email,
        }})
    
    }catch (error) {
        console.log("Error", error)
        res.status(500).send({message: "Internal Server Error"})

    }

});

router.get('/logout', (req, res) => {

     res.cookie('Token', '', {
                    maxAge: 1,
                    httpOnly: true,
                    // sameSite: "none",
                    secure: true
                });
                res.status(200).send({message: "User Logout"})
});

export default router;
const express = require('express')
const router = express.Router()
const bcrypt = require('bcryptjs')
const User = require("../models/User")
const jwt = require('jsonwebtoken')
const ratelimit = require('express-rate-limit')
const validator = require('validator')



// Register
router.post("/register", async (req, res) => {
    try {
        let { username, email, password } = req.body

        username = username.trim()
        email = email.trim().toLowerCase();

        // Validate email format 
        if(!validator.isEmail(email)) return res.status(400).json({message:'enter a valid email!!!'})

        // checking if username already exists in DB or not
        const existeduser = await User.findOne({username})
        if (existeduser){
            return res.status(400).json({message:"user already exists !!!"})
        }

        // Hash Password
        const salt = await bcrypt.genSalt(10);
        const HashPass = await bcrypt.hash(password, salt);

        // save user
        const newUser = new User({
            username,
            email,
            password:HashPass
        })

        const saveduser = await newUser.save();
        res.status(201).json(saveduser)
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
})

// Login
router.post('/login', async (req, res) => {
    try {
        let { loginid, password } = req.body;

        loginid = loginid.trim()

        // find user by email or username
        const user = await User.findOne({ $or:[
            {email : loginid},
            {username: loginid}
        ] });

        // checking if user exist or not
        if (!user) return res.status(404).json({ message: "user not found!!" });

        const isPassvalid = await bcrypt.compare(password, user.password);

        if (!isPassvalid) return res.status(400).json({ message: "invalid credentials!!" })

        const token = jwt.sign({
            id:user._id,
            email:user.email,
            username:user.username
        },
        process.env.JWT_SECRET_KEY,
        {expiresIn:"1h"})

        res.status(200).json({ message: "Login successfull!!!", token });
    } catch(err){
        res.status(500).json({ message: err.message });
    }
})

module.exports = router
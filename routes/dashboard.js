const express = require('express')
const verifytoken = require('../middleware/verifyjwttoken')
const router = express.Router()

router.get('/dashboard', verifytoken, (req, res)=>{
    res.status(200).json({message:"Welcome to your dashboard", user: req.user})
})

module.exports = router
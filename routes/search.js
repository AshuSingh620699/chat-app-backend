const express = require('express')
const router = express.Router()
const verifytoken = require('../middleware/verifyjwttoken')
const User = require('../models/User')

router.get('/search', verifytoken, async (req, res) => {
    const query = req.query.username

    if (!query) {
        return res.status(400).json({ message: ' Username Query is required' })
    }
    try {
       const users = await User.find({
            $and: [
                {
                    $or: [
                        { username: { $regex: query, $options: 'i' } },
                        { email: { $regex: query, $options: 'i' } },
                        {profileImage: {$regex: query, $options: 'i' }}
                    ]
                },
                { _id: { $ne: req.user.id } } // exclude current user
            ]
        }).select('username email profileImage');

        res.status(200).json(users);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
})

module.exports = router;
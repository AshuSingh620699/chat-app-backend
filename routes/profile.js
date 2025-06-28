const express = require('express')
const verifytoken = require('../middleware/verifyjwttoken')
const router = express.Router()
const User = require('../models/User')

// Update profile (image + bio + username optionally)
router.put('/update', verifytoken, async (req, res) => {
    const { username, profileImage, bio } = req.body;

    try {
        const user = await User.findById(req.user.id)

        // username update logic
        if (username && username !== user.username) {
            const usernamePattern = /^(?!.*[_.]{2})[a-zA-Z0-9](?:[a-zA-Z0-9._]{1,18}[a-zA-Z0-9])?$/

            if (!usernamePattern.test(username)) {
                return res.status(400).json({ message: 'Invalid username,Only letters, numbers, underscores, and dots are allowed (3-20 characters).' })
            }

            const usernameExists = await User.findOne({ username })
            if (usernameExists && usernameExists._id.toString() !== user._id.toString()) {
                return res.status(400).json({ message: 'Username is already taken!!' })
            }

            user.username = username
        }
        if (typeof profileImage === 'string' && profileImage.trim() !== '') {
            user.profileImage = profileImage;
        }

        if (bio) user.bio = bio;

        const updatedUser = await user.save();
        const { password, ...userWithoutPassword } = updatedUser._doc;

        res.status(200).json(userWithoutPassword);
    } catch (err) {
        res.status(500).json({ message: 'Error updating profile', error: err.message });
    }
})

// get current profile and bio
router.get('/me', verifytoken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');

        res.status(200).json(user)
    } catch (err) {
        res.status(500).json({ message: 'Error fetching profile', error: err.message });
    }
});

// Checking username
router.get('/check-username', verifytoken, async (req, res) => {
    const { username } = req.query;

    if (!username) return res.status(400).json({ message: 'Username required' });

    const user = await User.findOne({ username });

    if (!user || user._id.toString() === req.user.id) {
        return res.status(200).json({ available: true });
    } else {
        return res.status(200).json({ available: false });
    }
});

module.exports = router
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const verifytoken = require('../middleware/verifyjwttoken'); // consistent path & casing

// ✅ Send Friend Request
router.post('/request/:receiverId', verifytoken, async (req, res) => {
    const senderId = req.user.id;
    const receiverId = req.params.receiverId;

    if (senderId === receiverId)
        return res.status(400).json({ message: "Cannot send request to yourself." });

    try {
        const sender = await User.findById(senderId);
        const receiver = await User.findById(receiverId);

        if (!receiver) return res.status(404).json({ message: 'User not found' });

        if (receiver.receivedRequests.includes(senderId) || sender.sentRequests.includes(receiverId))
            return res.status(400).json({ message: "Friend request already sent" });

        if (sender.friends.includes(receiverId))
            return res.status(400).json({ message: "Already friends" });

        sender.sentRequests.push(receiverId);
        receiver.receivedRequests.push(senderId);

        await sender.save();
        await receiver.save();

        res.status(200).json({ message: "Friend request sent" });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ✅ Accept Friend Request
router.post('/accept/:senderId', verifytoken, async (req, res) => {
    const receiverId = req.user.id;
    const senderId = req.params.senderId;

    try {
        const receiver = await User.findById(receiverId);
        const sender = await User.findById(senderId);
        console.log(receiver.username, sender.username);

        if (!receiver.receivedRequests.includes(senderId))
            return res.status(400).json({ message: 'No such friend request found' });

        receiver.friends.push(senderId);
        sender.friends.push(receiverId);

        receiver.receivedRequests = receiver.receivedRequests.filter(id => id.toString() !== senderId);
        sender.sentRequests = sender.sentRequests.filter(id => id.toString() !== receiverId);

        await receiver.save();
        await sender.save();

        return res.status(200).json({ message: 'Friend request accepted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ✅ Reject Friend Request
router.post('/reject/:senderId', verifytoken, async (req, res) => {
    const receiverId = req.user.id;
    const senderId = req.params.senderId;

    try {
        const receiver = await User.findById(receiverId);
        const sender = await User.findById(senderId);

        receiver.receivedRequests = receiver.receivedRequests.filter(id => id.toString() !== senderId);
        sender.sentRequests = sender.sentRequests.filter(id => id.toString() !== receiverId);

        await receiver.save();
        await sender.save();

        res.status(200).json({ message: "Friend request rejected" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ✅ Get All Friends
router.get('/friends', verifytoken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).populate('friends', 'username email profileImage bio createdAt');
        res.status(200).json(user.friends);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ✅ Get Pending Requests
router.get('/requests', verifytoken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).populate('receivedRequests', 'username email');
        res.status(200).json(user.receivedRequests);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;

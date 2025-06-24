const express = require('express');
const router = express.Router();
const verifyjwttoken = require('../middleware/verifyjwttoken');
const Message = require('../models/Message');
const User = require('../models/User');

router.post('/send', verifyjwttoken, async (req, res) => {
    try {
        const { receiverId, content } = req.body;
        const senderId = req.user.id;

        if (!receiverId || !content) {
            return res.status(400).json({ message: "Receiver and content are required" });
        }

        const sender = await User.findById(senderId);
        if (!sender.friends.includes(receiverId)) {
            return res.status(403).json({ message: "Can only send messages to friends." });
        }

        const message = new Message({
            sender: senderId,
            receiver: receiverId,
            content
        });

        const savedMessage = await message.save();

        // Get io and userSocketMap from app
        const io = req.app.get('io');
        const userSocketMap = req.app.get('userSocketMap');

        const receiverSocketId = userSocketMap[receiverId];
        if (receiverSocketId) {
            io.to(receiverSocketId).emit('receive-message', {
                senderId,
                content,
                timestamp: savedMessage.createdAt
            });
        }

        res.status(201).json(savedMessage);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});



// Fetch Messages Route (with optional pagination)
router.get('/history/:receiverId', verifyjwttoken, async (req, res) => {
    try {
        const senderId = req.user.id;
        const receiverId = req.params.receiverId;

        // Pagination parameters
        const limit = parseInt(req.query.limit) || 70;
        const skip = parseInt(req.query.skip) || 0;

        // Check if sender and receiver are friends
        const sender = await User.findById(senderId);
        if (!sender.friends.includes(receiverId)) {
            return res.status(403).json({ message: "Can only fetch messages with friends." });
        }

        const messages = await Message.find({
            $or: [
                { sender: senderId, receiver: receiverId },
                { sender: receiverId, receiver: senderId }
            ]
        })
        .sort({ timestamp: -1 }) // newest messages first
        .skip(skip)
        .limit(limit);

        res.status(200).json(messages.reverse());
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;

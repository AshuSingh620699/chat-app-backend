module.exports = (io) => {
    const express = require('express')
    const router = express.Router();
    const verifytoken = require('../middleware/verifyjwttoken')
    const Message = require('../models/Message')
    const User = require('../models/User')

    // Send Message Route
    router.post('/send', verifytoken, async (req, res) => {
        try {
            const { receiverId, content } = req.body;
            const senderId = req.user.id

            if (!receiverId || !content) {
                return res.status(400).json({ message: 'Receiver and content are required!!' })
            }
            const sender = await User.findById(senderId)

            if (!sender.friends.includes(receiverId)) {
                return res.status(403).json({ message: 'Can only send messages to friends!!!' })
            }

            const message = new Message({
                sender: senderId,
                receiver: receiverId,
                content
            })

            const savedMessage = await message.save()

            // Emit to receiver
            const io = req.app.get('io');
            const userSocketMap = req.app.get('userSocketMap')

            const receiverSocketId = userSocketMap[receiverId];
            if (receiverSocketId) {
                io.to(receiverSocketId).emit('receive-message', {
                    messageId: savedMessage._id,  // ✅ Must be present
                    senderId,
                    receiverId,
                    content: savedMessage.content,
                    timestamp: savedMessage.timestamp
                });
            }
            console.log('Emitting receive-message with ID:', savedMessage._id);

            res.status(201).json(savedMessage)
        } catch (err) {
            res.status(500).json({ message: err.message })
        }
    })
    return router
}
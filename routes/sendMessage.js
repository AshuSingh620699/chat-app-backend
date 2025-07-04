module.exports = (io) => {
    const express = require('express');
    const router = express.Router();
    const verifytoken = require('../middleware/verifyjwttoken');
    const multer = require('multer');
    const cloudinary = require('cloudinary').v2;
    const { CloudinaryStorage } = require('multer-storage-cloudinary');
    const Message = require('../models/Message');
    const User = require('../models/User');

    // Cloudinary setup
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
    });

    const storage = new CloudinaryStorage({
        cloudinary: cloudinary,
        params: {
            folder: 'chat-files',
            resource_type: 'auto'
        }
    });

    const upload = multer({ storage: storage });

    // Unified route: handles both text and file messages
    router.post('/send', verifytoken, upload.single('file'), async (req, res) => {
        try {
            const { receiverId, content } = req.body;
            const senderId = req.user.id;

            if (!receiverId || (!content && !req.file)) {
                return res.status(400).json({ message: 'Message must include text or file.' });
            }

            const sender = await User.findById(senderId);
            if (!sender.friends.includes(receiverId)) {
                return res.status(403).json({ message: 'Can only send messages to friends!' });
            }

            // Build file metadata if a file is uploaded
            let fileMeta = null;
            if (req.file) {
                fileMeta = {
                    url: req.file.path,
                    public_id: req.file.public_id,
                    fileType: req.file.mimetype,
                    fileName: req.file.originalname
                };
                console.log('File uploaded:', fileMeta);
            }

            const message = new Message({
                sender: senderId,
                receiver: receiverId,
                content: content || '',
                file: fileMeta
            });

            const savedMessage = await message.save();

            // Emit via Socket.IO
            const io = req.app.get('io');
            const userSocketMap = req.app.get('userSocketMap');
            const receiverSocketId = userSocketMap[receiverId];

            if (receiverSocketId) {
                io.to(receiverSocketId).emit('receive-message', {
                    messageId: savedMessage._id,
                    senderId,
                    receiverId,
                    content: savedMessage.content,
                    file: savedMessage.file || null,
                    timestamp: savedMessage.timestamp
                });
            }

            console.log('Emitting receive-message with ID:', savedMessage._id);

            res.status(201).json(savedMessage);
        } catch (err) {
            console.error('Error sending message:', err);
            res.status(500).json({ message: 'Internal Server Error' });
        }
    });

    return router;
};

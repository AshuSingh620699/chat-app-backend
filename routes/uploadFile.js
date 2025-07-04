const express = require('express');
const verifytoken = require('../middleware/verifyjwttoken');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const Message = require('../models/Message')
const router = express.Router();


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

router.post('/send-file', verifytoken, upload.single('file'), async (req, res) => {

    try {
        const { receiverId } = req.body;
        if (!receiverId || !req.file) {
            return res.status(400).json({ error: 'Receiver ID and file are required' });
        }
        const senderId = req.user._id;
        if (!senderId) {
            return res.status(400).json({ error: 'Sender ID is required' });
        }

        const fileUrl = req.file.path; // URL of the uploaded file in Cloudinary

        // Create a new message with the file URL
        const newMessage = new Message({
            sender: senderId,
            receiver: receiverId,
            content: content.trim() || '', // Ensure content is not empty
            file: {
                url: fileUrl,
                public_id: req.file.filename, // Cloudinary public ID
                fileType: req.file.mimetype.split('/')[0], // MIME type of the file
                fileName: req.file.originalname // Original file name
            },
        });

        await newMessage.save();

        res.status(200).json(newMessage);

    } catch (err) {
        console.error('Upload error:', err);
        res.status(500).json({ error: 'Failed to upload file' });
    }
})

module.exports = router;
const express = require('express')
const verifytoken = require('../middleware/verifyjwttoken')
const ChatRoom = require('../models/Chatroom')
const User = require('../models/User')
const router = express.Router()

router.post('/create', verifytoken, async (req, res) => {
    const userId = req.user.id
    const { name, isGroup, users } = req.body

    if (!users || users.length == 0) {
        return res.status(400).json({ message: "Users required to create chat-room" })
    }

    if (!isGroup && users.length !== 1) res.status(400).json({ message: 'one to one must have exactly one user.' })

    try {

        if (!isGroup) {
            const friendId = users[0]

            const currentUser = await User.findById(userId)
            if (!currentUser.friends.includes(friendId)) return res.json({ message: 'You are not friends with this user.' })

            // check if a room already exists
            const existingRoom = await ChatRoom.findOne({
                isGroup: false,
                users: { $all: [userId, friendId], $size: 2 }
            })

            if (existingRoom) return res.status(200).json({ message: 'Chat room already exists.', chatRoom: existingRoom })

            // create new room
            const newRoom = new ChatRoom({
                name: `Chat_${userId}_${friendId}`,
                isGroup: false,
                users: [userId, friendId],
                createdBy: userId,
            })

            await newRoom.save();
            return res.status(201).json({ message: '1:1 chatroom created.', chatRoom: newRoom })
        } else {
            // Group Chat
            if (!name) return res.status(400).json({ message: 'Group chat must have a name' })

            const newGroup = new ChatRoom({
                name,
                isGroup: true,
                users: [...users, userId],
                createdBy: userId
            })

            await newGroup.save()
            return res.status(201).json({ message: "Group Chat Created.", chatRoom: newGroup })
        }
    } catch (err) {
        console.error('ChatRoom Create Error:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
})

module.exports = router
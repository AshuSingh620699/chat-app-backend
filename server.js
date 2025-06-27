const express = require('express')
const http = require('http')
const socket = require('socket.io')
const moongose = require('mongoose')
const cors = require('cors')
const limiter = require('./middleware/rateLimiter')
const friendRoutes = require('./routes/friends');
const search = require('./routes/search')
const updateprofileroute = require('./routes/profile')
const route = require('./routes/auth')  // Authentication Route
const dashboardroute = require('./routes/dashboard') // Dashboard Route
const chatRoomroute = require('./routes/chatRoom') // ChatRoom Route
const messageRoute = require('./routes/fetchmessage')   // fetching messages
const userimageroute = require('./routes/user')
const Message = require('./models/Message')
require("dotenv").config()

const app = express()
const port = 5050;
const Server = http.createServer(app)
const io = socket(Server, {
    cors: {
        origin: "*",    // Frontend address
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(cors())
app.use(express.json())


// connecting to mongoDB
moongose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => { console.log("Mongo Connected") }, (err) => {
    console.log("Mongo not Connected" + err)
})

const userSocketMap = {}; // userId => socket.id

// ✅ Make socket & map accessible in routes
app.set('userSocketMap', userSocketMap);
app.set('io', io);


const sendMessageRoute = require('./routes/sendMessage')(io)

// Routes
app.use('/api/auth', limiter)
app.use("/api/auth", route);
app.use('/api', dashboardroute)
app.use('/api/chatroom', chatRoomroute)
app.use('/api/messages', messageRoute)
app.use('/api/chat', sendMessageRoute)
app.use('/api/friends', friendRoutes);
app.use('/api/search', search);
app.use('/api/profile', updateprofileroute)
app.use('/api/user', userimageroute)


// Root
app.get('/', (req, res) => {
    res.send(`chat api is running...`)
})

// This object will store the mapping userId -> socketId
// Mapping userId to socketId : When a user connects to the server via Socket.IO, they get a unique socket ID (like 97yd4G9Lnqh8...).
// This ID allows the server to send real-time messages to that specific user.
// But the server doesn't know who the user is until the user tells us.
// const users = {
//   "user123": "socketId_1",
//   "user456": "socketId_2"
// };


// Socket.IO Handling
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('register', (userId) => {
        userSocketMap[userId] = socket.id;
        console.log(`User ${userId} registered with socket ${socket.id}`);
    });

    socket.on('disconnect', () => {
        for (const [uid, sid] of Object.entries(userSocketMap)) {
            if (sid === socket.id) {
                delete userSocketMap[uid];
                console.log(`User ${uid} disconnected`);
                break;
            }
        }
    });

    socket.on('typing', ({ to, from }) => {
        const receiverSocketId = userSocketMap[to];
        if (receiverSocketId) {
            io.to(receiverSocketId).emit('typing-notification', { from })
        }
    })

    socket.on('message-delivered', async (messageId) => {
        console.log("Received delivery update for:", messageId);
        try {
            const updated = await Message.findByIdAndUpdate(messageId, { status: 'delivered' });
            console.log('Message status updated to delivered:', messageId);

            // Notify sender of delivery 
            const senderSocketId = userSocketMap[updated.sender.toString()]
            if (senderSocketId) {
                io.to(senderSocketId).emit('message-delivered', messageId)
            }
        } catch (error) {
            console.error('Error updating message status:', error.message);
        }
    });
    socket.on('message-seen', async ({ userId, fromId }) => {
        try {
            console.log('Received message-seen event:', { userId, fromId });
            // Find and update all 'delivered' messages from fromId → userId
            const result = await Message.updateMany({
                sender: fromId,
                receiver: userId,
                status: 'delivered'
            }, { $set: { status: 'seen' } })
            const updatedMessages = await Message.find({
                sender: fromId,
                receiver: userId,
                status: 'seen'
            }, { _id: 1 });

            const ids = updatedMessages.map(msg => msg._id.toString());

            const senderSocketId = userSocketMap[fromId];
            if (senderSocketId) {
                io.to(senderSocketId).emit("messages-seen", {
                    by: userId,
                    ids
                });

            }
                console.log(`Marked ${result.modifiedCount} messages as seen.`);
            } catch (err) {
                console.error('Error marking messages as seen:', err.message);
            }
        })
});


Server.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`)
})

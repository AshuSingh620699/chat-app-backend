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
const callRoute = require('./routes/call.js')
const messageRoute = require('./routes/fetchmessage')   // fetching messages
const userimageroute = require('./routes/user')
const Message = require('./models/Message')
require("dotenv").config()
const User = require('./models/User.js') // Import User model
const app = express()

app.use((req, res, next) => {
    console.log('Detected IP:', req.ip);
    next();
});

const port = 5050;
const Server = http.createServer(app)

// ✅ Updated CORS options (support both local + deployed frontend)
const corsOptions = {
    origin: ['https://talkshare.netlify.app', 'http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};

const io = socket(Server, {
    cors: {
        origin: "*",    // Frontend address
        methods: ["GET", "POST"]
    }
});


// Middleware
app.use(cors(corsOptions)) // Use the updated CORS options
app.set('trust proxy', 1); // Trust first proxy (Render uses one proxy)
app.options('*', cors(corsOptions)); // Pre-flight request for all routes
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
app.use('/api/auth/login', limiter)
app.use("/api/auth", route);
app.use('/api', dashboardroute)
app.use('/api/chatroom', chatRoomroute)
app.use('/api/messages', messageRoute)
app.use('/api/chat', sendMessageRoute)
app.use('/api/friends', friendRoutes);
app.use('/api/search', search);
app.use('/api/profile', updateprofileroute)
app.use('/api/user', userimageroute)
app.use('/api/call', callRoute)


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


// ✅ Simple ping route to keep Render backend awake
app.get('/ping', (req, res) => {
  res.status(200).send('pong 🏓');
});


// Socket.IO Handling
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('register', async (userId) => {
        userSocketMap[userId] = socket.id;
        console.log(`User ${userId} registered with socket ${socket.id}`);

        // Notify friends that user is online
        const user = await User.findById(userId);
        const friendIds = user.friends || [];

        friendIds.forEach(fid => {
            const friendSocket = userSocketMap[fid.toString()];
            if (friendSocket) {
                io.to(friendSocket).emit('user-online', userId);
            }
        });

        // ✅ Send online friends to the newly joined user
        const onlineFriendIds = friendIds.filter(fid => userSocketMap[fid.toString()]);
        socket.emit('friends-online', onlineFriendIds);

        // Deliver undelivered messages
        const undeliveredMessages = await Message.find({
            receiver: userId,
            status: 'sent'
        });

        for (const msg of undeliveredMessages) {
            msg.status = 'delivered';
            await msg.save();

            const senderSocketId = userSocketMap[msg.sender.toString()];
            if (senderSocketId) {
                io.to(senderSocketId).emit('message-delivered', msg._id.toString());
                // 👇 Also notify them to increment unread
            }
            // 👇 Also notify receiver to show the message
            const receiverSocketId = userSocketMap[userId];
            if (receiverSocketId) {
                io.to(receiverSocketId).emit('receive-message', {
                    senderId: msg.sender.toString(),
                    content: msg.content,
                    timestamp: msg.createdAt,
                    messageId: msg._id
                });
            }
        }
    });

    socket.on('disconnect', async () => {
        for (const [uid, sid] of Object.entries(userSocketMap)) {
            if (sid === socket.id) {
                delete userSocketMap[uid];
                console.log(`User ${uid} disconnected`);

                // Notify friends that user is offline
                // Notify friends
                User.findById(uid).then(user => {
                    (user.friends || []).forEach(fid => {
                        const friendSocket = userSocketMap[fid.toString()];
                        if (friendSocket) {
                            io.to(friendSocket).emit('user-offline', uid);
                        }
                    });
                });
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
    socket.on('start-call', async ({ to, from, callType}) => {
        const receiverSocketId = userSocketMap[to];
        if (receiverSocketId) {
            const caller = await User.findById(from);
            console.log(`User ${from} is starting a ${callType} call to ${to}`);
            io.to(receiverSocketId).emit('incoming-call', {to, from, callType, username: caller.username, profileImage: caller.profileImage });
        }
    })

    socket.on('accept-call', async ({ to, from, callType }) => {
        
        const receiverSocketId = userSocketMap[to];
        if (receiverSocketId) {
            const acceptor = await User.findById(from);
            io.to(receiverSocketId).emit('call-accepted', { from, callType, username: acceptor.username, profileImage: acceptor.profileImage });
        }
    })

    socket.on('reject-call', ({ to, from, callType }) => {
        const receiverSocketId = userSocketMap[to];
        if (receiverSocketId) {
            io.to(receiverSocketId).emit('call-rejected', { from, callType });
        }
    });
    socket.on('end-call', ({ to, from, callType }) => {
        const receiverSocketId = userSocketMap[to];
        if (receiverSocketId) {
            io.to(receiverSocketId).emit('call-ended', { from, callType });
        }
    });

    // WebRTC Voice Call Signaling

    socket.on('voice-offer', ({ to, from, offer }) => {
        const receiverSocketId = userSocketMap[to];
        if (receiverSocketId) {
            io.to(receiverSocketId).emit('voice-offer', { from, offer });
        }
    });

    socket.on('voice-answer', ({ to, from, answer }) => {
        const receiverSocketId = userSocketMap[to];
        if (receiverSocketId) {
            io.to(receiverSocketId).emit('voice-answer', { from, answer });
        }
    });

    socket.on('voice-candidate', ({ to, from, candidate }) => {
        const receiverSocketId = userSocketMap[to];
        if (receiverSocketId) {
            io.to(receiverSocketId).emit('voice-candidate', { from, candidate });
        }
    });

});


Server.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`)
})

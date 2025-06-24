const { default: mongoose } = require('mongoose');
const moongose = require('mongoose')

const UserSchema = new moongose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
    },
    password: {
        type: String,
        required: true,
    },
    profileImage:{
        type:String,
        default:''
    },
    bio:{
        type:String,
        default:''
    },
    // 👇 Additions for friendship system
    friends: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
    }],

    sentRequests: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
    }],

    receivedRequests: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
    }],
}, { timestamps: true });
module.exports = mongoose.model("user", UserSchema)
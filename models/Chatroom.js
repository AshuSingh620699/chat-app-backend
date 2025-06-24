const moongose = require('mongoose')

const ChatRoomSchema = new moongose.Schema({
    name:{
        type: String,
        required : true
    },
    isGroup : {
        type : Boolean,
        default: false
    },
    users:[{
        type: moongose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    createdBy: {
        type: moongose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    createdAt:{
        type: Date,
        default : Date.now
    }
});

module.exports = moongose.model('ChatRoom',ChatRoomSchema)
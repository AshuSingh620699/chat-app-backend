const moongose = require('mongoose')

const messageSchema = new moongose.Schema({
    sender:{
        type: moongose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    receiver:{
        type: moongose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    content:{
        type: String,
        required: true 
    },
    timestamp:{
        type: Date,
        default:Date.now,
        required: true
    },
    status: {
        type:String,
        enum:['sent', 'delivered', 'seen'],
        default:'sent'
    }
})

module.exports = moongose.model('Message', messageSchema)
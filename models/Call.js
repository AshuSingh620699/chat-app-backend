const moongose = require('mongoose')
const CallSchema = new moongose.Schema({
    caller:{
        type: moongose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    receiver: {
        type: moongose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    callType: {
        type: String,
        enum: ['voice', 'video'],
        default: 'voice'
    },
    status:{
        type:String,
        enum: ['missed', 'rejected', 'completed'],
        required: true
    },
    startedAt:{
        type:Date,
        default: Date.now,
    },
    endedAt:{
        type:Date,
    },
    duration: String
}, {timestamps: true})

module.exports = moongose.model('Call', CallSchema)
const express = require('express');
const router = express.Router();
const Call = require('../models/Call');
const verifyToken = require('../middleware/verifyjwttoken');

router.post('/log', verifyToken, async (req, res) => {
    try {
        const { receiverId, status, callType, startedAt, endedAt, duration } = req.body;
        const caller = req.user.id;

        if (!receiverId || !status || !callType) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        const newCall = new Call({
            caller,
            receiver: receiverId,
            callType: callType || 'voice',
            status: status || 'missed',
            startedAt: startedAt || Date.now(),
            endedAt: endedAt,
            duration: duration || '0s'
        })

        const savedCall = await newCall.save();
        if (!savedCall) {
            return res.status(500).json({ message: "Failed to log call" });
        }
        res.status(201).json({ message: "Call logged successfully", call: savedCall });
    } catch (error) {
        console.error("Error logging call:", error);
        res.status(500).json({ message: "Internal server error" });
    }
})


router.get('/history', verifyToken, async (req, res) => {
    try{
        const userId = req.user.id,
        calls = await Call.find({
            $or: [
                {caller: userId},
                {receiver: userId}
            ]
        }).populate('caller receiver','username profileImage').sort({createdAt: -1});

        res.status(200).json({message: "Call history fetched successfully", calls});
    }catch(error){
        console.error("Error fetching call history:", error);
        res.status(500).json({message: "Internal server error"});
    }
})
module.exports = router;
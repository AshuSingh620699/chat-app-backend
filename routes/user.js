const express = require('express')
const verifytoken = require('../middleware/verifyjwttoken')
const router = express.Router()
const User = require('../models/User')
const multer = require('multer')
const path = require('path')
const fs = require('fs');


const uploadDir = path.join(__dirname, '..', 'uploads', 'profile-images');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// set storage engine
const storage = multer.diskStorage({
    destination: function(req, file, cb ){
        cb(null, 'uploads/profile-images')
    },
    filename: function(req, file, cb){
        const ext = path.extname(file.originalname)
        cb(null, `${req.user.id}-${Date.now()}${ext}`)
    }
})

// File filter (accept only images)
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif/;
  const isValid = allowedTypes.test(file.mimetype);
  cb(null, isValid);
};

const upload = multer({ storage, fileFilter });

router.post('/upload-profile-image', verifytoken, upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No image uploaded or invalid file type' });
  }

  const imagePath = `/uploads/profile-images/${req.file.filename}`;

  try {
    const user = await User.findById(req.user.id);
    user.profileImage = imagePath;
    await user.save();

    res.status(200).json({ message: 'Profile image updated', profileImage: imagePath });
  } catch (err) {
    res.status(500).json({ message: 'Error saving image', error: err.message });
  }
});

router.get('/:id', verifytoken, async (req, res)=>{
  try{
    const user = await User.findById(req.params.id).select('username profileImage bio')
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(200).json(user);
  }catch(err){
    res.status(500).json({error: 'User not found'})
  }
})

module.exports = router
const jwt = require('jsonwebtoken')

const verifyjwttoken = async (req, res, next) =>{
    const authheader = req.headers.authorization

    if(!authheader) return res.status(403).json({message:"no token provided!!!"})
    
    const token = authheader.split(' ')[1]
    try{
        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY)
        req.user = decoded
        next();
    }catch(err){
        res.status(401).json({message:"Ivalid or expired token"})
    }
}

module.exports = verifyjwttoken
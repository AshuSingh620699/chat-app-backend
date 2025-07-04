const rateLimit = require('express-rate-limit');

const authRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 min 
  max: 10, // 10 requests per IP
  message: {message : "Too many requests from this IP. Please try again after an hour."},
  standardHeaders: true,
  legacyHeaders: false,

  keyGenerator: (req, res) => {
    // Use the IP address of the request as the key
    return req.ip;
  }
});

module.exports = authRateLimiter;

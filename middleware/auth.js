const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'X9kL2mNp4Q8rT1vW6yZ3bC5dE7fG9hJ0kL2mN4pQ6rS8tU0vW2xY4zA6bC8dE0fG';

// Authenticate Token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'غير مصرح', code: 'NO_TOKEN' });
    }
    
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({ error: 'انتهت صلاحية الجلسة', code: 'TOKEN_EXPIRED' });
            }
            return res.status(403).json({ error: 'رمز غير صالح', code: 'INVALID_TOKEN' });
        }
        req.user = user;
        next();
    });
};

// Check Permission
const checkPermission = (permission) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'غير مصرح' });
        }
        if (req.user.role === 'admin') {
            return next();
        }
        if (req.user.permissions && req.user.permissions[permission]) {
            return next();
        }
        return res.status(403).json({ error: 'ليس لديك صلاحية لهذا الإجراء' });
    };
};

// Generate Access Token
const generateAccessToken = (user) => {
    return jwt.sign({
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        permissions: user.permissions || {}
    }, JWT_SECRET, { expiresIn: '15m' });
};

module.exports = {
    authenticateToken,
    checkPermission,
    generateAccessToken,
    JWT_SECRET
};

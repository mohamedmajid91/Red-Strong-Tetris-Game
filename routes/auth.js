const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const speakeasy = require('speakeasy');
const pool = require('../config/database');
const { authenticateToken, generateAccessToken, JWT_SECRET } = require('../middleware/auth');
const { logActivity, logSecurity } = require('../utils/helpers');

// Generate Refresh Token
const generateRefreshToken = async (userId) => {
    const token = crypto.randomBytes(64).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    
    await pool.query(
        'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
        [userId, token, expiresAt]
    );
    
    return token;
};

// Admin Login
router.post('/login', async (req, res) => {
    const { username, password, twoFactorCode } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];
    
    try {
        const userResult = await pool.query(
            'SELECT * FROM admin_users WHERE username = $1 AND active = true',
            [username]
        );
        
        if (userResult.rows.length > 0) {
            const user = userResult.rows[0];
            const validPassword = await bcrypt.compare(password, user.password);
            
            if (!validPassword) {
                await pool.query(
                    'INSERT INTO admin_login_attempts (username, ip_address, success) VALUES ($1, $2, $3)',
                    [username, ipAddress, false]
                );
                await logSecurity('login_failed', user.id, username, ipAddress, userAgent, { reason: 'wrong_password' });
                return res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
            }
            
            // Check 2FA
            if (user.two_factor_enabled && user.two_factor_secret) {
                if (!twoFactorCode) {
                    return res.json({ requires2FA: true, message: 'يرجى إدخال رمز المصادقة الثنائية' });
                }
                const verified = speakeasy.totp.verify({
                    secret: user.two_factor_secret,
                    encoding: 'base32',
                    token: twoFactorCode,
                    window: 2
                });
                if (!verified) {
                    await logSecurity('2fa_failed', user.id, username, ipAddress, userAgent, {});
                    return res.status(401).json({ error: 'رمز المصادقة الثنائية غير صحيح' });
                }
            }
            
            const accessToken = generateAccessToken(user);
            const refreshToken = await generateRefreshToken(user.id);
            
            await pool.query('UPDATE admin_users SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);
            await pool.query(
                'INSERT INTO admin_login_attempts (username, ip_address, success) VALUES ($1, $2, $3)',
                [username, ipAddress, true]
            );
            await logSecurity('login_success', user.id, username, ipAddress, userAgent, {});
            await logActivity(user.id, username, 'login', 'تسجيل دخول ناجح', ipAddress);
            
            return res.json({
                success: true,
                token: accessToken,
                refreshToken: refreshToken,
                user: {
                    id: user.id,
                    username: user.username,
                    name: user.name,
                    role: user.role,
                    permissions: user.permissions
                }
            });
        }
        
        // Fallback to .env
        if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
            const jwt = require('jsonwebtoken');
            const token = jwt.sign({ 
                username, 
                role: 'admin',
                name: 'المدير',
                permissions: { all: true }
            }, JWT_SECRET, { expiresIn: '24h' });
            
            return res.json({ success: true, token });
        }
        
        await logSecurity('login_failed', null, username, ipAddress, userAgent, { reason: 'user_not_found' });
        res.status(401).json({ error: 'بيانات خاطئة' });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'خطأ في الخادم' });
    }
});

// Refresh Token
router.post('/refresh-token', async (req, res) => {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
        return res.status(401).json({ error: 'Refresh token مطلوب' });
    }
    
    try {
        const result = await pool.query(
            `SELECT rt.*, au.* FROM refresh_tokens rt 
             JOIN admin_users au ON rt.user_id = au.id 
             WHERE rt.token = $1 AND rt.revoked = false AND rt.expires_at > NOW() AND au.active = true`,
            [refreshToken]
        );
        
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Refresh token غير صالح', code: 'INVALID_REFRESH' });
        }
        
        const user = result.rows[0];
        const newAccessToken = generateAccessToken(user);
        
        res.json({ success: true, token: newAccessToken });
    } catch (err) {
        console.error('Refresh error:', err);
        res.status(500).json({ error: 'خطأ في الخادم' });
    }
});

// Logout
router.post('/logout', authenticateToken, async (req, res) => {
    const { refreshToken } = req.body;
    
    try {
        if (refreshToken) {
            await pool.query(
                'UPDATE refresh_tokens SET revoked = true, revoked_at = CURRENT_TIMESTAMP WHERE token = $1',
                [refreshToken]
            );
        }
        await logActivity(req.user?.id, req.user?.username, 'logout', 'تسجيل خروج', req.ip);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'خطأ في الخادم' });
    }
});

module.exports = router;

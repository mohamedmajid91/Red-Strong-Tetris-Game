const crypto = require('crypto');
const pool = require('../config/database');

// Iraqi Provinces
const provinces = [
    'بغداد', 'البصرة', 'نينوى', 'أربيل', 'النجف', 'كربلاء',
    'السليمانية', 'ذي قار', 'الأنبار', 'ديالى', 'كركوك',
    'صلاح الدين', 'بابل', 'واسط', 'ميسان', 'المثنى', 'القادسية', 'دهوك'
];

// Generate Prize Code
const generatePrizeCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
        if (i === 4) code += '-';
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
};

// Generate Referral Code
const generateReferralCode = () => {
    return crypto.randomBytes(4).toString('hex').toUpperCase();
};

// Mask Phone Number
const maskPhone = (phone) => {
    if (!phone || phone.length < 10) return phone;
    return phone.substring(0, 3) + '****' + phone.substring(7);
};

// Get Setting
const getSetting = async (key, defaultValue = '') => {
    try {
        const result = await pool.query('SELECT value FROM settings WHERE key = $1', [key]);
        return result.rows[0]?.value || defaultValue;
    } catch {
        return defaultValue;
    }
};

// Activity Logger
const logActivity = async (userId, username, action, details, ipAddress) => {
    try {
        await pool.query(
            'INSERT INTO activity_logs (user_id, username, action, details, ip_address) VALUES ($1, $2, $3, $4, $5)',
            [userId, username, action, details, ipAddress]
        );
    } catch (err) {
        console.error('Error logging activity:', err);
    }
};

// Security Logger
const logSecurity = async (eventType, userId, username, ipAddress, userAgent, details) => {
    try {
        await pool.query(
            'INSERT INTO security_logs (event_type, user_id, username, ip_address, user_agent, details) VALUES ($1, $2, $3, $4, $5, $6)',
            [eventType, userId, username, ipAddress, userAgent, JSON.stringify(details)]
        );
    } catch (err) {
        console.error('Error logging security event:', err);
    }
};

module.exports = {
    provinces,
    generatePrizeCode,
    generateReferralCode,
    maskPhone,
    getSetting,
    logActivity,
    logSecurity
};

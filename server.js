// ============== Server.js v58.0 - Refactored ==============
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Initialize App
const app = express();

// Import Routes
const gameRoutes = require('./routes/game');
const wheelRoutes = require('./routes/wheel');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const branchRoutes = require('./routes/branch');

// Import Database & Init
const pool = require('./config/database');

// Twilio WhatsApp
const twilio = require('twilio');
const twilioClient = process.env.TWILIO_ACCOUNT_SID ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN) : null;

const sendWhatsApp = async (to, message) => {
    if (!twilioClient) return false;
    try {
        const num = to.startsWith('0') ? '+964' + to.substring(1) : to;
        await twilioClient.messages.create({ 
            body: message, 
            from: 'whatsapp:' + process.env.TWILIO_WHATSAPP_NUMBER, 
            to: 'whatsapp:' + num 
        });
        console.log('WhatsApp sent to:', num);
        return true;
    } catch (err) { 
        console.error('WhatsApp error:', err.message); 
        return false; 
    }
};

// Pass sendWhatsApp to admin routes
adminRoutes.setSendWhatsApp(sendWhatsApp);

// ============== Middleware ==============
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));

app.use(cors({
    origin: process.env.ALLOWED_ORIGIN || '*',
    credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static('public'));

// Rate Limiting
const limiter = rateLimit({ 
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: 'طلبات كثيرة، حاول لاحقاً' }
});
app.use('/api/', limiter);

// ============== Routes ==============
app.use('/api', gameRoutes);
app.use('/api/wheel', wheelRoutes);
app.use('/api/admin', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/branch', branchRoutes);

// Admin Panel Route
const ADMIN_PANEL_PATH = process.env.ADMIN_PANEL_PATH || 'ctrl_x7k9m2p4';
app.get(`/${ADMIN_PANEL_PATH}.html`, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Health Check
app.get('/api/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({
            status: 'healthy',
            version: '58.0.0',
            timestamp: new Date().toISOString(),
            database: 'connected'
        });
    } catch (err) {
        res.status(500).json({ status: 'unhealthy', database: 'disconnected' });
    }
});

// ============== Database Init ==============
const initDB = async () => {
    try {
        // Players table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS players (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                phone VARCHAR(20) UNIQUE NOT NULL,
                province VARCHAR(50) NOT NULL,
                score INTEGER DEFAULT 0,
                prize_code VARCHAR(20),
                status VARCHAR(20) DEFAULT 'registered',
                device_info JSONB,
                device_id VARCHAR(255),
                location JSONB,
                referral_code VARCHAR(10),
                referred_by VARCHAR(20),
                is_winner BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                played_at TIMESTAMP,
                won_at TIMESTAMP,
                claimed_at TIMESTAMP
            )
        `);

        // Settings
        await pool.query(`
            CREATE TABLE IF NOT EXISTS settings (
                id SERIAL PRIMARY KEY,
                key VARCHAR(50) UNIQUE NOT NULL,
                value TEXT NOT NULL
            )
        `);

        // Prizes
        await pool.query(`
            CREATE TABLE IF NOT EXISTS prizes (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                description TEXT,
                image VARCHAR(255),
                active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Announcements
        await pool.query(`
            CREATE TABLE IF NOT EXISTS announcements (
                id SERIAL PRIMARY KEY,
                title VARCHAR(200),
                text TEXT NOT NULL,
                image TEXT,
                link VARCHAR(500),
                type VARCHAR(20) DEFAULT 'info',
                active BOOLEAN DEFAULT true,
                priority INTEGER DEFAULT 0,
                expires_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Branches
        await pool.query(`
            CREATE TABLE IF NOT EXISTS branches (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                location VARCHAR(255),
                province VARCHAR(50),
                phone VARCHAR(20) UNIQUE NOT NULL,
                password VARCHAR(100) NOT NULL,
                active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Claims
        await pool.query(`
            CREATE TABLE IF NOT EXISTS claims (
                id SERIAL PRIMARY KEY,
                player_id INTEGER REFERENCES players(id),
                branch_id INTEGER REFERENCES branches(id) ON DELETE SET NULL,
                prize_code VARCHAR(20),
                employee_name VARCHAR(100),
                notes TEXT,
                claimed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Admin Users
        await pool.query(`
            CREATE TABLE IF NOT EXISTS admin_users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                name VARCHAR(100) NOT NULL,
                role VARCHAR(20) DEFAULT 'staff',
                permissions JSONB DEFAULT '{}',
                two_factor_enabled BOOLEAN DEFAULT false,
                two_factor_secret VARCHAR(100),
                active BOOLEAN DEFAULT true,
                last_login TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Refresh Tokens
        await pool.query(`
            CREATE TABLE IF NOT EXISTS refresh_tokens (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                token VARCHAR(500) NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                revoked BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Admin Login Attempts
        await pool.query(`
            CREATE TABLE IF NOT EXISTS admin_login_attempts (
                id SERIAL PRIMARY KEY,
                username VARCHAR(100),
                ip_address VARCHAR(50),
                success BOOLEAN,
                attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Activity Logs
        await pool.query(`
            CREATE TABLE IF NOT EXISTS activity_logs (
                id SERIAL PRIMARY KEY,
                user_id INTEGER,
                username VARCHAR(50),
                action VARCHAR(50) NOT NULL,
                details TEXT,
                ip_address VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Security Logs
        await pool.query(`
            CREATE TABLE IF NOT EXISTS security_logs (
                id SERIAL PRIMARY KEY,
                event_type VARCHAR(50) NOT NULL,
                user_id INTEGER,
                username VARCHAR(50),
                ip_address VARCHAR(50),
                user_agent TEXT,
                details JSONB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Backup Logs
        await pool.query(`
            CREATE TABLE IF NOT EXISTS backup_logs (
                id SERIAL PRIMARY KEY,
                filename VARCHAR(255) NOT NULL,
                size_bytes BIGINT,
                type VARCHAR(20) DEFAULT 'manual',
                created_by INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Wheel Spins
        await pool.query(`
            CREATE TABLE IF NOT EXISTS wheel_spins (
                id SERIAL PRIMARY KEY,
                phone VARCHAR(20) NOT NULL,
                points_won INTEGER NOT NULL,
                spun_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Coupons
        await pool.query(`
            CREATE TABLE IF NOT EXISTS coupons (
                id SERIAL PRIMARY KEY,
                code VARCHAR(50) UNIQUE NOT NULL,
                discount_type VARCHAR(20) DEFAULT 'points',
                discount_value INTEGER NOT NULL,
                max_uses INTEGER DEFAULT 1,
                used_count INTEGER DEFAULT 0,
                expires_at TIMESTAMP,
                active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        console.log('✅ Database tables initialized');
    } catch (err) {
        console.error('❌ Database init error:', err);
    }
};

initDB();

// ============== Start Server ==============
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════════╗
║   🎮 Red Strong Tetris Server v58.0 (Refactored)   ║
║   ✅ Running on port ${PORT}                          ║
║   🌐 http://localhost:${PORT}                          ║
║   🔐 Admin: /${ADMIN_PANEL_PATH}.html              ║
║   📊 Health: /api/health                           ║
╚════════════════════════════════════════════════════╝
    `);
});

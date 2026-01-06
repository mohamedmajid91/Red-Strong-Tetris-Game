// ============== Server.js v57.0 - Ultimate Edition ==============
// التحسينات: Refresh Tokens, Activity Logs, WhatsApp, Enhanced Security
require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, param, query, validationResult } = require('express-validator');
const path = require('path');
const multer = require('multer');
const XLSX = require('xlsx');
const fs = require('fs');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const twilio = require('twilio');
const twilioClient = process.env.TWILIO_ACCOUNT_SID ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN) : null;
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const sendWhatsApp = async (to, message) => {
    if (!twilioClient) return false;
    try {
        const num = to.startsWith('0') ? '+964' + to.substring(1) : to;
        await twilioClient.messages.create({ body: message, from: 'whatsapp:' + process.env.TWILIO_WHATSAPP_NUMBER, to: 'whatsapp:' + num });
        console.log('WhatsApp sent to:', num);
        return true;
    } catch (err) { console.error('WhatsApp error:', err.message); return false; }
};




const app = express();

// ============== Configuration ==============
const JWT_SECRET = process.env.JWT_SECRET || 'X9kL2mNp4Q8rT1vW6yZ3bC5dE7fG9hJ0kL2mN4pQ6rS8tU0vW2xY4zA6bC8dE0fG';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'A1bC3dE5fG7hI9jK0lM2nO4pQ6rS8tU0vW2xY4zA6bC8dE0fG2hI4jK6lM8nO0pQ';
const ADMIN_PANEL_PATH = process.env.ADMIN_PANEL_PATH || 'ctrl_x7k9m2p4';

// Enhanced Security Middleware
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    xssFilter: true,
    noSniff: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));

app.use(cors({
    origin: process.env.ALLOWED_ORIGIN || '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static('public'));

// Input Sanitization Middleware
const sanitizeInput = (req, res, next) => {
    const sanitize = (obj) => {
        if (typeof obj === 'string') {
            return obj.replace(/<[^>]*>/g, '').replace(/[<>\"\'`;]/g, '').trim();
        }
        if (typeof obj === 'object' && obj !== null) {
            for (let key in obj) {
                obj[key] = sanitize(obj[key]);
            }
        }
        return obj;
    };
    if (req.body) req.body = sanitize(req.body);
    if (req.query) req.query = sanitize(req.query);
    if (req.params) req.params = sanitize(req.params);
    next();
};
app.use(sanitizeInput);

// Rate Limiting - Enhanced
const limiter = rateLimit({ 
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: 'طلبات كثيرة، حاول لاحقاً' },
    standardHeaders: true,
    legacyHeaders: false
});
app.use('/api/', limiter);

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { error: 'محاولات تسجيل دخول كثيرة، انتظر 15 دقيقة' },
    skipSuccessfulRequests: true
});

const strictLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    message: { error: 'طلبات كثيرة جداً' }
});

// File Upload Config
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = './public/uploads';
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `${Date.now()}${ext}`);
    }
});

const upload = multer({ 
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = /jpeg|jpg|png|gif|webp/;
        const ext = allowed.test(path.extname(file.originalname).toLowerCase());
        const mime = allowed.test(file.mimetype);
        if (ext && mime && file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('صيغة الملف غير مدعومة'));
        }
    }
});

// Database Connection
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'tetris_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || ''
});

pool.connect((err, client, release) => {
    if (err) {
        console.error('❌ Database connection error:', err.stack);
    } else {
        console.log('✅ Connected to PostgreSQL');
        release();
    }
});

// Initialize Database
const initDB = async () => {
    try {
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
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                played_at TIMESTAMP,
                won_at TIMESTAMP,
                claimed_at TIMESTAMP
            )
        `);
        
        await pool.query(`
            CREATE TABLE IF NOT EXISTS settings (
                id SERIAL PRIMARY KEY,
                key VARCHAR(50) UNIQUE NOT NULL,
                value TEXT NOT NULL
            )
        `);

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

        await pool.query(`
            CREATE TABLE IF NOT EXISTS cheat_logs (
                id SERIAL PRIMARY KEY,
                phone VARCHAR(20),
                attempted_points INTEGER,
                allowed_points INTEGER,
                score_before INTEGER,
                score_after INTEGER,
                time_diff REAL,
                logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Announcements table
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

        // Fix image column type if varchar
        await pool.query(`
            DO $$ 
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name='announcements' AND column_name='image' AND data_type='character varying'
                ) THEN
                    ALTER TABLE announcements ALTER COLUMN image TYPE TEXT;
                END IF;
            END $$;
        `);

        // Add new columns if not exist
        await pool.query(`
            DO $$ 
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='announcements' AND column_name='title') THEN
                    ALTER TABLE announcements ADD COLUMN title VARCHAR(200);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='announcements' AND column_name='image') THEN
                    ALTER TABLE announcements ADD COLUMN image VARCHAR(500);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='announcements' AND column_name='type') THEN
                    ALTER TABLE announcements ADD COLUMN type VARCHAR(20) DEFAULT 'info';
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='announcements' AND column_name='expires_at') THEN
                    ALTER TABLE announcements ADD COLUMN expires_at TIMESTAMP;
                END IF;
            END $$;
        `);

        // Game sessions table for tracking rounds
        await pool.query(`
            CREATE TABLE IF NOT EXISTS game_sessions (
                id SERIAL PRIMARY KEY,
                phone VARCHAR(20) NOT NULL,
                round_number INTEGER DEFAULT 1,
                round_score INTEGER DEFAULT 0,
                total_score INTEGER DEFAULT 0,
                difficulty_level INTEGER DEFAULT 0,
                started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                ended_at TIMESTAMP,
                cooldown_until TIMESTAMP
            )
        `);
        
        await pool.query(`
            CREATE TABLE IF NOT EXISTS admin_login_attempts (
                id SERIAL PRIMARY KEY,
                username VARCHAR(100),
                ip_address VARCHAR(50),
                success BOOLEAN,
                attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

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

        // Admin users table with permissions
        await pool.query(`
            CREATE TABLE IF NOT EXISTS admin_users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                name VARCHAR(100) NOT NULL,
                role VARCHAR(20) DEFAULT 'staff',
                permissions JSONB DEFAULT '{}',
                allowed_branches INTEGER[] DEFAULT '{}',
                allowed_provinces TEXT[] DEFAULT '{}',
                two_factor_enabled BOOLEAN DEFAULT false,
                two_factor_secret VARCHAR(100),
                backup_codes TEXT[],
                active BOOLEAN DEFAULT true,
                last_login TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_by INTEGER
            )
        `);

        // Add permissions column if not exists (for existing tables)
        await pool.query(`
            DO $$ 
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='admin_users' AND column_name='permissions') THEN
                    ALTER TABLE admin_users ADD COLUMN permissions JSONB DEFAULT '{}';
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='admin_users' AND column_name='allowed_branches') THEN
                    ALTER TABLE admin_users ADD COLUMN allowed_branches INTEGER[] DEFAULT '{}';
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='admin_users' AND column_name='allowed_provinces') THEN
                    ALTER TABLE admin_users ADD COLUMN allowed_provinces TEXT[] DEFAULT '{}';
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='admin_users' AND column_name='two_factor_enabled') THEN
                    ALTER TABLE admin_users ADD COLUMN two_factor_enabled BOOLEAN DEFAULT false;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='admin_users' AND column_name='two_factor_secret') THEN
                    ALTER TABLE admin_users ADD COLUMN two_factor_secret VARCHAR(100);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='admin_users' AND column_name='backup_codes') THEN
                    ALTER TABLE admin_users ADD COLUMN backup_codes TEXT[];
                END IF;
            END $$;
        `);

        // Backup logs table
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

        // Refresh tokens table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS refresh_tokens (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                token VARCHAR(500) NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                revoked BOOLEAN DEFAULT false,
                revoked_at TIMESTAMP
            )
        `);

        // Winner notifications table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS winner_notifications (
                id SERIAL PRIMARY KEY,
                player_id INTEGER,
                phone VARCHAR(20),
                message TEXT,
                channel VARCHAR(20) DEFAULT 'whatsapp',
                sent BOOLEAN DEFAULT false,
                sent_at TIMESTAMP,
                error TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Security logs table
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

        // Activity logs table
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

        // Coupons table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS coupons (
                id SERIAL PRIMARY KEY,
                code VARCHAR(50) UNIQUE NOT NULL,
                discount_type VARCHAR(20) DEFAULT 'points',
                discount_value INTEGER NOT NULL,
                max_uses INTEGER DEFAULT 1,
                used_count INTEGER DEFAULT 0,
                min_score INTEGER DEFAULT 0,
                expires_at TIMESTAMP,
                active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Coupon usage tracking
        await pool.query(`
            CREATE TABLE IF NOT EXISTS coupon_usage (
                id SERIAL PRIMARY KEY,
                coupon_id INTEGER REFERENCES coupons(id) ON DELETE CASCADE,
                player_phone VARCHAR(20),
                used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Referrals table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS referrals (
                id SERIAL PRIMARY KEY,
                referrer_phone VARCHAR(20) NOT NULL,
                referred_phone VARCHAR(20) NOT NULL,
                referrer_bonus INTEGER DEFAULT 100,
                referred_bonus INTEGER DEFAULT 50,
                status VARCHAR(20) DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                completed_at TIMESTAMP,
                UNIQUE(referred_phone)
            )
        `);

        // Add referral_code to players if not exists
        await pool.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='players' AND column_name='referral_code') THEN
                    ALTER TABLE players ADD COLUMN referral_code VARCHAR(10);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='players' AND column_name='referred_by') THEN
                    ALTER TABLE players ADD COLUMN referred_by VARCHAR(20);
                END IF;
            END $$;
        `);

        // Daily Goals table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS daily_goals (
                id SERIAL PRIMARY KEY,
                title VARCHAR(100) NOT NULL,
                description VARCHAR(255),
                type VARCHAR(20) DEFAULT 'score',
                target INTEGER DEFAULT 500,
                reward INTEGER DEFAULT 100,
                icon VARCHAR(10) DEFAULT '🎯',
                active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Goal Completions tracking
        await pool.query(`
            CREATE TABLE IF NOT EXISTS goal_completions (
                id SERIAL PRIMARY KEY,
                goal_id INTEGER REFERENCES daily_goals(id) ON DELETE CASCADE,
                player_phone VARCHAR(20),
                reward_given INTEGER,
                completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                completed_date DATE DEFAULT CURRENT_DATE,
                UNIQUE(goal_id, player_phone, completed_date)
            )
        `);

        // Scheduled Draws table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS scheduled_draws (
                id SERIAL PRIMARY KEY,
                draw_at TIMESTAMP NOT NULL,
                winners_count INTEGER DEFAULT 1,
                executed BOOLEAN DEFAULT false,
                executed_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Blocked Items table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS blocked_items (
                id SERIAL PRIMARY KEY,
                type VARCHAR(20) NOT NULL,
                value VARCHAR(100) NOT NULL,
                reason VARCHAR(50),
                notes TEXT,
                blocked_by VARCHAR(50),
                blocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Lucky Wheel Spins table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS wheel_spins (
                id SERIAL PRIMARY KEY,
                phone VARCHAR(20) NOT NULL,
                points_won INTEGER NOT NULL,
                spun_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create default admin user if not exists
        const adminExists = await pool.query('SELECT id FROM admin_users WHERE username = $1', ['admin']);
        if (adminExists.rows.length === 0) {
            const hashedPassword = await bcrypt.hash('admin123', 10);
            await pool.query(
                'INSERT INTO admin_users (username, password, name, role) VALUES ($1, $2, $3, $4)',
                ['admin', hashedPassword, 'المدير العام', 'admin']
            );
        }
        
        // Default settings
        const defaultSettings = [
            ['game_enabled', 'true'],
            ['blocked_provinces', '[]'],
            ['require_location', 'false'],
            ['cooldown_minutes', '30'],
            ['max_rounds', '3'],
            ['difficulty_increase_1', '20'],
            ['difficulty_increase_2', '40'],
            ['difficulty_increase_3', '50'],
            ['max_winners', '5'],
            ['min_score_for_roulette', '1500'],
            // Site Branding Settings
            ['site_name', 'Red Strong'],
            ['site_title', 'ريد سترونك - العب واربح'],
            ['site_subtitle', 'العب تتريس واربح جوائز قيمة!'],
            ['logo_letters', 'RS'],
            ['footer_company', 'Red Strong'],
            ['logo_image', '/uploads/redstrong.png'],
            // Colors
            ['primary_color', '#e31e24'],
            ['secondary_color', '#1a237e'],
            ['gold_color', '#ffd700']
        ];

        for (const [key, value] of defaultSettings) {
            await pool.query(
                'INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING',
                [key, value]
            );
        }
        
        console.log('✅ Database tables initialized');
    } catch (err) {
        console.error('❌ Error initializing database:', err);
    }
};
initDB();

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

// Get Setting Helper
const getSetting = async (key, defaultValue = '') => {
    try {
        const result = await pool.query('SELECT value FROM settings WHERE key = $1', [key]);
        return result.rows[0]?.value || defaultValue;
    } catch (err) {
        return defaultValue;
    }
};

// JWT Middleware with better error handling
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

// Permission check middleware
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

// Token Generation
const generateAccessToken = (user) => {
    return jwt.sign({
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        permissions: user.permissions || {}
    }, JWT_SECRET, { expiresIn: '15m' });
};

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

// WhatsApp Notification
const sendWhatsAppMessage = async (phone, message) => {
    const apiUrl = process.env.WHATSAPP_API_URL;
    const token = process.env.WHATSAPP_API_TOKEN;
    
    if (!apiUrl || !token) {
        console.log('WhatsApp API not configured');
        return false;
    }
    
    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                phone: `964${phone.substring(1)}`,
                message: message
            })
        });
        return response.ok;
    } catch (err) {
        console.error('WhatsApp send error:', err);
        return false;
    }
};

// Score submission tracking
const scoreSubmissions = new Map();

// ============== Public API Routes ==============

// Game Status
app.get('/api/game-status', async (req, res) => {
    try {
        const enabled = await getSetting('game_enabled', 'true');
        const blockedProvinces = await getSetting('blocked_provinces', '[]');
        const requireLocation = await getSetting('require_location', 'false');
        const cooldownMinutes = await getSetting('cooldown_minutes', '30');
        const maxRounds = await getSetting('max_rounds', '3');
        const difficulty1 = await getSetting('difficulty_increase_1', '20');
        const difficulty2 = await getSetting('difficulty_increase_2', '40');
        const difficulty3 = await getSetting('difficulty_increase_3', '50');

        res.json({ 
            enabled: enabled === 'true',
            blockedProvinces: JSON.parse(blockedProvinces),
            requireLocation: requireLocation === 'true',
            cooldownMinutes: parseInt(cooldownMinutes),
            maxRounds: parseInt(maxRounds),
            difficultyLevels: [0, parseInt(difficulty1), parseInt(difficulty2), parseInt(difficulty3)]
        });
    } catch (err) {
        console.error('❌ Error in /api/game-status:', err);
        res.json({ enabled: true, blockedProvinces: [], requireLocation: false, cooldownMinutes: 30, maxRounds: 3, difficultyLevels: [0, 20, 40, 50] });
    }
});

// Public Settings
app.get('/api/settings/public', async (req, res) => {
    try {
        const result = await pool.query('SELECT key, value FROM settings');
        const settings = {};
        result.rows.forEach(row => {
            settings[row.key] = row.value;
        });
        res.json(settings);
    } catch (err) {
        console.error(err);
        res.json({});
    }
});

// Public Announcements
app.get('/api/announcements', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, text, link FROM announcements WHERE active = true ORDER BY priority DESC, created_at DESC'
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.json([]);
    }
});

// Get player session info (rounds, cooldown, etc.)
app.get('/api/session/:phone', async (req, res) => {
    try {
        const { phone } = req.params;
        const maxRounds = parseInt(await getSetting('max_rounds', '3'));
        const cooldownMinutes = parseInt(await getSetting('cooldown_minutes', '30'));
        
        // Get latest session for this player
        const session = await pool.query(
            'SELECT * FROM game_sessions WHERE phone = $1 ORDER BY started_at DESC LIMIT 1',
            [phone]
        );
        
        if (session.rows.length === 0) {
            // No session, player can start fresh
            return res.json({
                canPlay: true,
                currentRound: 1,
                totalScore: 0,
                difficultyLevel: 0,
                roundsLeft: maxRounds
            });
        }
        
        const currentSession = session.rows[0];
        const now = new Date();
        
        // Check if in cooldown
        if (currentSession.cooldown_until && new Date(currentSession.cooldown_until) > now) {
            const remainingMs = new Date(currentSession.cooldown_until) - now;
            const remainingMinutes = Math.ceil(remainingMs / 60000);
            return res.json({
                canPlay: false,
                inCooldown: true,
                cooldownRemaining: remainingMinutes,
                cooldownUntil: currentSession.cooldown_until,
                totalScore: currentSession.total_score
            });
        }
        
        // Check rounds
        if (currentSession.round_number >= maxRounds && currentSession.ended_at) {
            // Completed all rounds, now in cooldown
            const cooldownEnd = new Date(currentSession.ended_at);
            cooldownEnd.setMinutes(cooldownEnd.getMinutes() + cooldownMinutes);
            
            if (cooldownEnd > now) {
                // Update cooldown_until
                await pool.query(
                    'UPDATE game_sessions SET cooldown_until = $1 WHERE id = $2',
                    [cooldownEnd, currentSession.id]
                );
                const remainingMs = cooldownEnd - now;
                const remainingMinutes = Math.ceil(remainingMs / 60000);
                return res.json({
                    canPlay: false,
                    inCooldown: true,
                    cooldownRemaining: remainingMinutes,
                    cooldownUntil: cooldownEnd,
                    totalScore: currentSession.total_score
                });
            }
        }
        
        // Can play - determine difficulty based on round
        const difficultyLevels = [0, 20, 40, 50];
        const nextRound = currentSession.ended_at ? currentSession.round_number + 1 : currentSession.round_number;
        
        // If finished all rounds and cooldown passed, start fresh
        if (nextRound > maxRounds) {
            return res.json({
                canPlay: true,
                currentRound: 1,
                totalScore: 0,
                difficultyLevel: 0,
                roundsLeft: maxRounds,
                newSession: true
            });
        }
        
        res.json({
            canPlay: true,
            currentRound: nextRound,
            totalScore: currentSession.total_score || 0,
            difficultyLevel: difficultyLevels[Math.min(nextRound - 1, 3)],
            roundsLeft: maxRounds - nextRound + 1,
            sessionId: currentSession.id
        });
    } catch (err) {
        console.error('❌ Error in /api/session:', err);
        res.json({ canPlay: true, currentRound: 1, totalScore: 0, difficultyLevel: 0, roundsLeft: 3 });
    }
});

// Start a new round
app.post('/api/session/start', async (req, res) => {
    try {
        const { phone } = req.body;
        const maxRounds = parseInt(await getSetting('max_rounds', '3'));
        const cooldownMinutes = parseInt(await getSetting('cooldown_minutes', '30'));
        
        // Get current session
        const session = await pool.query(
            'SELECT * FROM game_sessions WHERE phone = $1 ORDER BY started_at DESC LIMIT 1',
            [phone]
        );
        
        let currentRound = 1;
        let totalScore = 0;
        let sessionId;
        
        if (session.rows.length > 0) {
            const currentSession = session.rows[0];
            const now = new Date();
            
            // Check cooldown
            if (currentSession.cooldown_until && new Date(currentSession.cooldown_until) > now) {
                return res.status(403).json({ error: 'في فترة انتظار', inCooldown: true });
            }
            
            // If session is incomplete (no ended_at), continue it
            if (!currentSession.ended_at) {
                return res.json({
                    success: true,
                    sessionId: currentSession.id,
                    round: currentSession.round_number,
                    totalScore: currentSession.total_score,
                    difficultyLevel: [0, 20, 40, 50][Math.min(currentSession.round_number - 1, 3)]
                });
            }
            
            // Session completed, check if can start new round
            const nextRound = currentSession.round_number + 1;
            
            if (nextRound > maxRounds) {
                // Reset for new set of rounds
                currentRound = 1;
                totalScore = 0;
            } else {
                currentRound = nextRound;
                totalScore = currentSession.total_score;
            }
        }
        
        // Create new session/round
        const result = await pool.query(
            'INSERT INTO game_sessions (phone, round_number, total_score, difficulty_level) VALUES ($1, $2, $3, $4) RETURNING *',
            [phone, currentRound, totalScore, [0, 20, 40, 50][Math.min(currentRound - 1, 3)]]
        );
        
        res.json({
            success: true,
            sessionId: result.rows[0].id,
            round: currentRound,
            totalScore: totalScore,
            difficultyLevel: [0, 20, 40, 50][Math.min(currentRound - 1, 3)]
        });
    } catch (err) {
        console.error('❌ Error in /api/session/start:', err);
        res.status(500).json({ error: 'خطأ في بدء الجولة' });
    }
});

// End a round and save score
app.post('/api/session/end', async (req, res) => {
    try {
        const { phone, sessionId, roundScore } = req.body;
        const maxRounds = parseInt(await getSetting('max_rounds', '3'));
        const cooldownMinutes = parseInt(await getSetting('cooldown_minutes', '30'));
        
        // Get session
        const session = await pool.query(
            'SELECT * FROM game_sessions WHERE id = $1 AND phone = $2',
            [sessionId, phone]
        );
        
        if (session.rows.length === 0) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }
        
        const currentSession = session.rows[0];
        const newTotalScore = (currentSession.total_score || 0) + roundScore;
        const isLastRound = currentSession.round_number >= maxRounds;
        
        // Calculate cooldown if last round
        let cooldownUntil = null;
        if (isLastRound) {
            cooldownUntil = new Date();
            cooldownUntil.setMinutes(cooldownUntil.getMinutes() + cooldownMinutes);
        }
        
        // Update session
        await pool.query(
            'UPDATE game_sessions SET round_score = $1, total_score = $2, ended_at = CURRENT_TIMESTAMP, cooldown_until = $3 WHERE id = $4',
            [roundScore, newTotalScore, cooldownUntil, sessionId]
        );
        
        // Update player's total score
        await pool.query(
            'UPDATE players SET score = GREATEST(score, $1), played_at = CURRENT_TIMESTAMP WHERE phone = $2',
            [newTotalScore, phone]
        );
        
        res.json({
            success: true,
            roundScore: roundScore,
            totalScore: newTotalScore,
            isLastRound: isLastRound,
            cooldownUntil: cooldownUntil,
            nextRound: isLastRound ? null : currentSession.round_number + 1
        });
    } catch (err) {
        console.error('❌ Error in /api/session/end:', err);
        res.status(500).json({ error: 'خطأ في حفظ النتيجة' });
    }
});

// Leaderboard
app.get('/api/leaderboard', async (req, res) => {
    try {
        const period = req.query.period || 'all';
        let dateFilter = '';
        
        if (period === 'today') {
            dateFilter = "AND DATE(played_at) = CURRENT_DATE";
        } else if (period === 'week') {
            dateFilter = "AND played_at >= NOW() - INTERVAL '7 days'";
        }
        
        const result = await pool.query(`
            SELECT name, province, 
                   CONCAT(SUBSTRING(phone, 1, 3), '****', SUBSTRING(phone, 8, 3)) as phone, 
                   score 
            FROM players 
            WHERE score > 0 ${dateFilter}
            ORDER BY score DESC 
            LIMIT 10
        `);
        res.json(result.rows);
    } catch (err) {
        console.error('❌ Error in /api/leaderboard:', err);
        res.json([]);
    }
});

// Public Prizes
app.get('/api/prizes', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM prizes WHERE active = true ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (err) {
        res.json([]);
    }
});

// Get player stats by phone
app.get('/api/player-stats/:phone', async (req, res) => {
    try {
        let phone = req.params.phone;
        
        // Normalize phone - remove leading 0 or 964
        phone = phone.replace(/\D/g, '');
        if (phone.startsWith('00964')) phone = phone.substring(5);
        if (phone.startsWith('964')) phone = phone.substring(3);
        if (phone.startsWith('0')) phone = phone.substring(1);
        
        console.log('📊 Looking for player stats, phone:', phone);
        
        // Get player data
        const playerResult = await pool.query(
            'SELECT id, name, score, played_at FROM players WHERE phone = $1',
            [phone]
        );
        
        if (playerResult.rows.length === 0) {
            console.log('📊 Player not found for phone:', phone);
            return res.json({ score: 0, games_played: 0, rank: 0 });
        }
        
        const player = playerResult.rows[0];
        console.log('📊 Found player:', player.name, 'Score:', player.score);
        
        // Get player rank
        const rankResult = await pool.query(
            'SELECT COUNT(*) + 1 as rank FROM players WHERE score > $1',
            [player.score || 0]
        );
        
        // Count games from game_sessions if exists, otherwise estimate from score
        let gamesPlayed = 0;
        try {
            const sessionsResult = await pool.query(
                'SELECT COUNT(*) as count FROM game_sessions WHERE phone = $1',
                [phone]
            );
            gamesPlayed = parseInt(sessionsResult.rows[0].count) || 0;
        } catch (e) {
            // If game_sessions doesn't exist, estimate games played
            gamesPlayed = Math.max(1, Math.floor((player.score || 0) / 500));
        }
        
        res.json({
            score: player.score || 0,
            games_played: gamesPlayed,
            rank: parseInt(rankResult.rows[0].rank)
        });
    } catch (err) {
        console.error('📊 Error getting player stats:', err);
        res.json({ score: 0, games_played: 0, rank: 0 });
    }
});

// Get active prizes for players
app.get('/api/prizes/active', async (req, res) => {
    try {
        const result = await pool.query('SELECT id, name, description, image FROM prizes WHERE active = true ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (err) {
        res.json([]);
    }
});

// Get active announcements for players
app.get('/api/announcements/active', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, title, text, image, link, type, priority FROM announcements 
            WHERE active = true 
            AND (expires_at IS NULL OR expires_at > NOW())
            ORDER BY priority DESC, created_at DESC 
            LIMIT 5
        `);
        res.json(result.rows);
    } catch (err) {
        res.json([]);
    }
});

// Register Player
app.post('/api/register', [
    body('name').trim().isLength({ min: 2, max: 100 }),
    body('phone').matches(/^[0-9]{10}$/),
    body('province').isIn(provinces)
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'بيانات غير صحيحة' });
    }

    try {
        const gameEnabled = await getSetting('game_enabled', 'true');
        if (gameEnabled !== 'true') {
            return res.status(403).json({ error: 'اللعبة متوقفة حالياً', code: 'GAME_DISABLED' });
        }

        const { name, phone, province, deviceInfo, location } = req.body;
        const deviceId = deviceInfo?.deviceId || req.headers['user-agent'];

        const blockedProvinces = JSON.parse(await getSetting('blocked_provinces', '[]'));
        if (blockedProvinces.includes(province)) {
            return res.status(403).json({ error: 'اللعبة غير متاحة في محافظتك حالياً', code: 'PROVINCE_BLOCKED' });
        }

        const requireLocation = await getSetting('require_location', 'false');
        if (requireLocation === 'true' && !location) {
            return res.status(400).json({ error: 'يجب السماح بالموقع للعب', code: 'LOCATION_REQUIRED' });
        }

        // Check by device_id OR phone
        const existing = await pool.query(
            'SELECT * FROM players WHERE device_id = $1 OR phone = $2',
            [deviceId, phone]
        );
        
        if (existing.rows.length > 0) {
            // Update device_id if phone matches but device changed
            if (existing.rows[0].device_id !== deviceId) {
                await pool.query(
                    'UPDATE players SET device_id = $1, device_info = $2 WHERE id = $3',
                    [deviceId, JSON.stringify(deviceInfo), existing.rows[0].id]
                );
            }
            console.log('✅ Player returning:', existing.rows[0].name);
            return res.json({ success: true, message: 'Welcome back!', player: existing.rows[0] });
        }

        const result = await pool.query(
            'INSERT INTO players (name, phone, province, device_info, location, device_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [name, phone, province, JSON.stringify(deviceInfo), location ? JSON.stringify(location) : null, deviceId]
        );

        console.log('✅ New player registered:', result.rows[0].name);
        const winner = result.rows[0];
        // Send WhatsApp to winner
        const msg = '🎉 مبروك ' + winner.name + '! لقد فزت بجائزة من Red Strong! كود الجائزة: ' + winner.prize_code + ' - راجع أقرب فرع لاستلام جائزتك.';
        sendWhatsApp(winner.phone, msg);
        res.json({ success: true, player: winner });
    } catch (err) {
        console.error('❌ Error in /api/register:', err);
        res.status(500).json({ error: 'حدث خطأ في التسجيل' });
    }
});

// Submit Score
app.post('/api/score', [
    body('phone').matches(/^[0-9]{10}$/),
    body('score').isInt({ min: 0, max: 50000 })
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'بيانات غير صحيحة' });
    }

    const { phone, score } = req.body;

    try {
        const player = await pool.query('SELECT * FROM players WHERE phone = $1', [phone]);
        
        if (player.rows.length === 0) {
            return res.status(404).json({ error: 'اللاعب غير مسجل' });
        }

        const currentPlayer = player.rows[0];
        const now = Date.now();
        const lastSubmission = scoreSubmissions.get(phone);

        if (lastSubmission) {
            const timeDiff = (now - lastSubmission.time) / 1000;
            
            if (timeDiff < 30) {
                return res.status(429).json({ error: 'انتظر قليلاً', code: 'TOO_FAST' });
            }

            const maxPointsPerSecond = 50;
            const allowedPoints = Math.floor(timeDiff * maxPointsPerSecond);
            const attemptedPoints = score - currentPlayer.score;

            if (attemptedPoints > allowedPoints) {
                await pool.query(
                    'INSERT INTO cheat_logs (phone, attempted_points, allowed_points, score_before, score_after, time_diff) VALUES ($1, $2, $3, $4, $5, $6)',
                    [phone, attemptedPoints, allowedPoints, currentPlayer.score, score, timeDiff]
                );
                return res.status(400).json({ error: 'نقاط مشبوهة!', code: 'CHEAT_DETECTED' });
            }
        }

        scoreSubmissions.set(phone, { time: now, score });

        const result = await pool.query(
            'UPDATE players SET score = $1, played_at = CURRENT_TIMESTAMP WHERE phone = $2 RETURNING *',
            [score, phone]
        );

        res.json({ success: true, player: result.rows[0] });
    } catch (err) {
        console.error('❌ Error in /api/score:', err);
        res.status(500).json({ error: 'حدث خطأ في حفظ النقاط' });
    }
});

// Check Win Status
app.post('/api/check-win', async (req, res) => {
    try {
        const { phone, deviceInfo } = req.body;
        const deviceId = deviceInfo?.deviceId || req.headers['user-agent'];
        
        const result = await pool.query(
            'SELECT * FROM players WHERE device_id = $1 OR phone = $2',
            [deviceId, phone]
        );
        
        if (result.rows.length === 0) {
            return res.json({ error: 'not_found', isWinner: false });
        }
        
        const player = result.rows[0];
        
        if (player.status === 'winner' || player.status === 'claimed') {
            return res.json({ isWinner: true, prizeCode: player.prize_code, status: player.status });
        }
        
        res.json({ isWinner: false });
    } catch (err) {
        console.error('❌ Error in /api/check-win:', err);
        res.status(500).json({ error: 'حدث خطأ في التحقق' });
    }
});

// ============== Admin Routes ==============

// Admin Login
app.post('/api/admin/login', loginLimiter, [
    body('username').trim().notEmpty(),
    body('password').notEmpty()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'بيانات غير صحيحة' });
    }

    const { username, password, twoFactorCode } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];
    
    try {
        // First check admin_users table
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
            
            // Check 2FA if enabled
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
            
            // Generate tokens
            const accessToken = generateAccessToken(user);
            const refreshToken = await generateRefreshToken(user.id);
            
            // Update last login
            await pool.query('UPDATE admin_users SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);
            
            await pool.query(
                'INSERT INTO admin_login_attempts (username, ip_address, success) VALUES ($1, $2, $3)',
                [username, ipAddress, true]
            );
            await logSecurity('login_success', user.id, username, ipAddress, userAgent, {});
            await logActivity(user.id, username, 'login', 'تسجيل دخول ناجح', ipAddress);
            
            console.log('✅ Admin logged in:', username);
            
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
        
        // Fallback to .env credentials for backward compatibility
        if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
            await pool.query(
                'INSERT INTO admin_login_attempts (username, ip_address, success) VALUES ($1, $2, $3)',
                [username, ipAddress, true]
            );
            
            const token = jwt.sign({ 
                username, 
                role: 'admin',
                name: 'المدير',
                permissions: { all: true }
            }, JWT_SECRET, { expiresIn: '24h' });
            
            console.log('✅ Admin logged in (env):', username);
            return res.json({ success: true, token });
        }
        
        await pool.query(
            'INSERT INTO admin_login_attempts (username, ip_address, success) VALUES ($1, $2, $3)',
            [username, ipAddress, false]
        );
        await logSecurity('login_failed', null, username, ipAddress, userAgent, { reason: 'user_not_found' });
        res.status(401).json({ error: 'بيانات خاطئة' });
    } catch (err) {
        console.error('❌ Login error:', err);
        res.status(500).json({ error: 'خطأ في الخادم' });
    }
});

// Refresh Token Endpoint
app.post('/api/admin/refresh-token', async (req, res) => {
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
            return res.status(401).json({ error: 'Refresh token غير صالح أو منتهي', code: 'INVALID_REFRESH' });
        }
        
        const user = result.rows[0];
        const newAccessToken = generateAccessToken(user);
        
        res.json({ success: true, token: newAccessToken });
    } catch (err) {
        console.error('Refresh token error:', err);
        res.status(500).json({ error: 'خطأ في الخادم' });
    }
});

// Logout Endpoint
app.post('/api/admin/logout', authenticateToken, async (req, res) => {
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
        console.error('Logout error:', err);
        res.status(500).json({ error: 'خطأ في الخادم' });
    }
});

// Admin - Get All Players
app.get('/api/admin/players', authenticateToken, async (req, res) => {
    try {
        const { search, status, minScore } = req.query;
        let query = 'SELECT * FROM players WHERE 1=1';
        const params = [];
        
        if (search) {
            params.push(`%${search}%`);
            query += ` AND (name ILIKE $${params.length} OR phone ILIKE $${params.length})`;
        }
        if (status && status !== 'all') {
            params.push(status);
            query += ` AND status = $${params.length}`;
        }
        if (minScore) {
            params.push(parseInt(minScore));
            query += ` AND score >= $${params.length}`;
        }
        
        query += ' ORDER BY score DESC';
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Admin - Get Stats
app.get('/api/admin/stats', authenticateToken, async (req, res) => {
    try {
        const total = await pool.query('SELECT COUNT(*) FROM players');
        const winners = await pool.query("SELECT COUNT(*) FROM players WHERE status IN ('winner', 'claimed')");
        const claimed = await pool.query("SELECT COUNT(*) FROM players WHERE status = 'claimed'");
        const pending = await pool.query("SELECT COUNT(*) FROM players WHERE status = 'winner'");
        const provinceStats = await pool.query(
            'SELECT province, COUNT(*) as count FROM players GROUP BY province ORDER BY count DESC'
        );

        const settingsResult = await pool.query('SELECT key, value FROM settings');
        const settingsObj = {};
        settingsResult.rows.forEach(row => {
            settingsObj[row.key] = row.value;
        });

        res.json({
            total: parseInt(total.rows[0].count),
            winners: parseInt(winners.rows[0].count),
            claimed: parseInt(claimed.rows[0].count),
            pending: parseInt(pending.rows[0].count),
            provinceStats: provinceStats.rows,
            settings: settingsObj
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Admin - Roulette Players
app.get('/api/admin/roulette-players', authenticateToken, async (req, res) => {
    try {
        const minScore = await getSetting('min_score_for_roulette', '1500');
        const result = await pool.query(
            'SELECT * FROM players WHERE score >= $1 AND status = $2 ORDER BY score DESC',
            [parseInt(minScore), 'registered']
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Admin - Settings
app.post('/api/admin/settings', authenticateToken, async (req, res) => {
    const { settings } = req.body;
    try {
        for (const [key, value] of Object.entries(settings)) {
            const val = typeof value === 'object' ? JSON.stringify(value) : value.toString();
            await pool.query(
                'INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2',
                [key, val]
            );
        }
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Admin - Make Winner
app.post('/api/admin/make-winner/:id', authenticateToken, async (req, res) => {
    try {
        const stats = await pool.query("SELECT COUNT(*) FROM players WHERE status IN ('winner', 'claimed')");
        const maxWinners = await getSetting('max_winners', '5');
        
        if (parseInt(stats.rows[0].count) >= parseInt(maxWinners)) {
            return res.status(400).json({ error: `تم الوصول للحد الأقصى (${maxWinners})` });
        }
        
        const prizeCode = generatePrizeCode();
        const result = await pool.query(
            "UPDATE players SET status = 'winner', prize_code = $1, won_at = CURRENT_TIMESTAMP WHERE id = $2 AND status = 'registered' RETURNING *",
            [prizeCode, req.params.id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'اللاعب غير موجود أو فائز مسبقاً' });
        }
        
        res.json({ success: true, player: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Admin - Remove Winner
app.post('/api/admin/remove-winner/:id', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            "UPDATE players SET status = 'registered', prize_code = NULL, won_at = NULL WHERE id = $1 RETURNING *",
            [req.params.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'اللاعب غير موجود' });
        }
        res.json({ success: true, player: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Admin - Claim Prize
app.post('/api/admin/claim/:id', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            "UPDATE players SET status = 'claimed', claimed_at = CURRENT_TIMESTAMP WHERE id = $1 AND status = 'winner' RETURNING *",
            [req.params.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'اللاعب غير موجود أو ليس فائز' });
        }
        res.json({ success: true, player: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Admin - Delete Player
app.delete('/api/admin/player/:id', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('DELETE FROM players WHERE id = $1 RETURNING *', [req.params.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'اللاعب غير موجود' });
        }
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Admin - Reset All
app.post('/api/admin/reset-all', authenticateToken, async (req, res) => {
    try {
        await pool.query('DELETE FROM players');
        await pool.query('DELETE FROM cheat_logs');
        res.json({ success: true, message: 'تم حذف جميع البيانات' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Admin - Upload Image
app.post('/api/admin/upload', authenticateToken, upload.single('image'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'لم يتم رفع ملف' });
        }
        res.json({ success: true, filename: req.file.filename, path: '/uploads/' + req.file.filename });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'خطأ في رفع الملف' });
    }
});

// Admin - Export Excel
app.get('/api/admin/export-excel', async (req, res) => {
    const token = req.query.token || req.headers['authorization']?.split(' ')[1];
    
    if (!token) return res.status(401).json({ error: 'Access denied' });
    
    try {
        jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
        return res.status(403).json({ error: 'Invalid token' });
    }
    
    try {
        const result = await pool.query('SELECT * FROM players ORDER BY score DESC');
        
        const data = result.rows.map(p => ({
            'الاسم': p.name,
            'الهاتف': p.phone.startsWith('0') ? p.phone : '0' + p.phone,
            'المحافظة': p.province,
            'النقاط': p.score,
            'الحالة': p.status === 'registered' ? 'مسجل' : p.status === 'winner' ? 'فائز' : 'مستلم',
            'كود الجائزة': p.prize_code || '-',
            'تاريخ التسجيل': p.created_at ? new Date(p.created_at).toLocaleDateString('ar-IQ') : '-'
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'اللاعبين');
        
        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=players.xlsx');
        res.send(buffer);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Admin - Get Prizes
app.get('/api/admin/prizes', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM prizes ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Admin - Create Prize
app.post('/api/admin/prizes', authenticateToken, async (req, res) => {
    try {
        const { name, description, image } = req.body;
        const result = await pool.query(
            'INSERT INTO prizes (name, description, image) VALUES ($1, $2, $3) RETURNING *',
            [name, description || '', image || '']
        );
        await logActivity(req.user?.id, req.user?.username, 'add_prize', name, req.ip);
        res.json({ success: true, prize: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Admin - Update Prize
app.put('/api/admin/prizes/:id', authenticateToken, async (req, res) => {
    try {
        const { name, description, image, active } = req.body;
        let query = 'UPDATE prizes SET name = $1, description = $2, active = $3';
        let params = [name, description || '', active !== false];
        
        if (image) {
            query += ', image = $4 WHERE id = $5 RETURNING *';
            params.push(image, req.params.id);
        } else {
            query += ' WHERE id = $4 RETURNING *';
            params.push(req.params.id);
        }
        
        const result = await pool.query(query, params);
        await logActivity(req.user?.id, req.user?.username, 'update_prize', name, req.ip);
        res.json({ success: true, prize: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Admin - Toggle Prize
app.patch('/api/admin/prizes/:id/toggle', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            'UPDATE prizes SET active = NOT active WHERE id = $1 RETURNING *',
            [req.params.id]
        );
        res.json({ success: true, prize: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Admin - Delete Prize
app.delete('/api/admin/prizes/:id', authenticateToken, async (req, res) => {
    try {
        await pool.query('DELETE FROM prizes WHERE id = $1', [req.params.id]);
        await logActivity(req.user?.id, req.user?.username, 'delete_prize', `Prize ID: ${req.params.id}`, req.ip);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ============== Announcements Routes ==============

// Admin - Get All Announcements
app.get('/api/admin/announcements', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM announcements ORDER BY priority DESC, created_at DESC');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Admin - Create Announcement
app.post('/api/admin/announcements', authenticateToken, async (req, res) => {
    try {
        const { title, text, type, image, link, priority, expires_at } = req.body;
        const result = await pool.query(
            `INSERT INTO announcements (title, text, type, image, link, priority, expires_at) 
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [title || '', text, type || 'info', image || '', link || '', priority || 0, expires_at || null]
        );
        res.json({ success: true, announcement: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Admin - Update Announcement
app.put('/api/admin/announcements/:id', authenticateToken, async (req, res) => {
    try {
        const { title, text, type, image, link, active, priority, expires_at } = req.body;
        
        let query = 'UPDATE announcements SET title = $1, text = $2, type = $3, link = $4, active = $5, priority = $6, expires_at = $7';
        let params = [title || '', text, type || 'info', link || '', active !== false, priority || 0, expires_at || null];
        
        if (image) {
            query += ', image = $8 WHERE id = $9 RETURNING *';
            params.push(image, req.params.id);
        } else {
            query += ' WHERE id = $8 RETURNING *';
            params.push(req.params.id);
        }
        
        const result = await pool.query(query, params);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'الإعلان غير موجود' });
        }
        res.json({ success: true, announcement: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Admin - Toggle Announcement Active Status
app.patch('/api/admin/announcements/:id/toggle', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            'UPDATE announcements SET active = NOT active WHERE id = $1 RETURNING *',
            [req.params.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'الإعلان غير موجود' });
        }
        res.json({ success: true, announcement: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Admin - Delete Announcement
app.delete('/api/admin/announcements/:id', authenticateToken, async (req, res) => {
    try {
        await pool.query('DELETE FROM announcements WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Admin - Get Game Sessions Stats
app.get('/api/admin/sessions', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT gs.*, p.name as player_name 
            FROM game_sessions gs 
            LEFT JOIN players p ON gs.phone = p.phone 
            ORDER BY gs.started_at DESC 
            LIMIT 100
        `);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ============== Branch Routes ==============

// Branch Login
app.post('/api/branch/login', async (req, res) => {
    const { phone, password } = req.body;
    try {
        const result = await pool.query(
            'SELECT * FROM branches WHERE phone = $1 AND password = $2 AND active = true',
            [phone, password]
        );
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'بيانات خاطئة' });
        }
        const branch = result.rows[0];
        const token = jwt.sign({ branchId: branch.id, branchName: branch.name }, process.env.JWT_SECRET, { expiresIn: '12h' });
        res.json({ success: true, token, branch: { id: branch.id, name: branch.name, location: branch.location } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'خطأ في الخادم' });
    }
});

// Branch - Verify Prize Code
app.post('/api/branch/verify', async (req, res) => {
    const { prizeCode } = req.body;
    try {
        const result = await pool.query(
            "SELECT * FROM players WHERE prize_code = $1 AND status = 'winner'",
            [prizeCode]
        );
        if (result.rows.length === 0) {
            return res.json({ valid: false, message: 'الكود غير صحيح أو مستخدم' });
        }
        const player = result.rows[0];
        res.json({ 
            valid: true, 
            player: { 
                id: player.id,
                name: player.name, 
                phone: player.phone, 
                province: player.province,
                prize_code: player.prize_code,
                won_at: player.won_at
            } 
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'خطأ في الخادم' });
    }
});

// Branch - Claim Prize
app.post('/api/branch/claim', async (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) return res.status(401).json({ error: 'غير مصرح' });
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const { playerId, prizeCode, employeeName, notes } = req.body;
        
        // Update player status
        const updateResult = await pool.query(
            "UPDATE players SET status = 'claimed', claimed_at = CURRENT_TIMESTAMP WHERE id = $1 AND prize_code = $2 AND status = 'winner' RETURNING *",
            [playerId, prizeCode]
        );
        
        if (updateResult.rows.length === 0) {
            return res.status(400).json({ error: 'الكود غير صحيح أو تم استلامه مسبقاً' });
        }
        
        // Log the claim
        await pool.query(
            'INSERT INTO claims (player_id, branch_id, prize_code, employee_name, notes) VALUES ($1, $2, $3, $4, $5)',
            [playerId, decoded.branchId, prizeCode, employeeName, notes]
        );
        
        console.log(`✅ Prize claimed: ${prizeCode} at branch ${decoded.branchName}`);
        res.json({ success: true, message: 'تم تسليم الجائزة بنجاح' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'خطأ في الخادم' });
    }
});

// Branch - Get Claims History
app.get('/api/branch/claims', async (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) return res.status(401).json({ error: 'غير مصرح' });
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const result = await pool.query(
            `SELECT c.*, p.name as player_name, p.phone as player_phone, p.province 
             FROM claims c 
             JOIN players p ON c.player_id = p.id 
             WHERE c.branch_id = $1 
             ORDER BY c.claimed_at DESC 
             LIMIT 50`,
            [decoded.branchId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'خطأ في الخادم' });
    }
});

// Admin - Get All Branches
app.get('/api/admin/branches', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT id, name, location, province, phone, active, created_at FROM branches ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Admin - Add Branch
app.post('/api/admin/branches', authenticateToken, async (req, res) => {
    const { name, location, province, phone, password } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO branches (name, location, province, phone, password) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [name, location, province, phone, password]
        );
        res.json({ success: true, branch: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Admin - Update Branch
app.put('/api/admin/branches/:id', authenticateToken, async (req, res) => {
    const { name, location, province, phone, password, active } = req.body;
    try {
        let query, params;
        if (password) {
            query = 'UPDATE branches SET name = $1, location = $2, province = $3, phone = $4, password = $5, active = $6 WHERE id = $7 RETURNING *';
            params = [name, location, province, phone, password, active !== false, req.params.id];
        } else {
            query = 'UPDATE branches SET name = $1, location = $2, province = $3, phone = $4, active = $5 WHERE id = $6 RETURNING *';
            params = [name, location, province, phone, active !== false, req.params.id];
        }
        const result = await pool.query(query, params);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'الفرع غير موجود' });
        }
        await logActivity(req.user?.id, req.user?.username, 'update_branch', name, req.ip);
        res.json({ success: true, branch: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Admin - Toggle Branch
app.patch('/api/admin/branches/:id/toggle', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            'UPDATE branches SET active = NOT active WHERE id = $1 RETURNING *',
            [req.params.id]
        );
        res.json({ success: true, branch: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Admin - Delete Branch
app.delete('/api/admin/branches/:id', authenticateToken, async (req, res) => {
    try {
        await pool.query('DELETE FROM branches WHERE id = $1', [req.params.id]);
        await logActivity(req.user?.id, req.user?.username, 'delete_branch', `Branch ID: ${req.params.id}`, req.ip);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Admin - Get All Claims
app.get('/api/admin/claims', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT c.*, p.name as player_name, p.phone as player_phone, b.name as branch_name 
             FROM claims c 
             JOIN players p ON c.player_id = p.id 
             JOIN branches b ON c.branch_id = b.id 
             ORDER BY c.claimed_at DESC`
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ============== User Management APIs ==============

// Get all admin users
app.get('/api/admin/users', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, username, name, role, permissions, allowed_branches, allowed_provinces, active, last_login, created_at FROM admin_users ORDER BY created_at DESC'
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Add new admin user
app.post('/api/admin/users', authenticateToken, async (req, res) => {
    const { username, password, name, role, permissions, allowed_branches, allowed_provinces } = req.body;
    try {
        // Check if username exists
        const exists = await pool.query('SELECT id FROM admin_users WHERE username = $1', [username]);
        if (exists.rows.length > 0) {
            return res.status(400).json({ error: 'اسم المستخدم موجود مسبقاً' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await pool.query(
            `INSERT INTO admin_users (username, password, name, role, permissions, allowed_branches, allowed_provinces, created_by) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
            [username, hashedPassword, name, role || 'staff', JSON.stringify(permissions || {}), allowed_branches || [], allowed_provinces || [], req.user?.id]
        );

        await logActivity(req.user?.id, req.user?.username, 'add_user', `إضافة مستخدم: ${username}`, req.ip);
        res.json({ success: true, id: result.rows[0].id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Update admin user
app.put('/api/admin/users/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { name, role, active, password, permissions, allowed_branches, allowed_provinces } = req.body;
    try {
        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            await pool.query(
                `UPDATE admin_users SET name = $1, role = $2, active = $3, password = $4, 
                 permissions = $5, allowed_branches = $6, allowed_provinces = $7 WHERE id = $8`,
                [name, role, active, hashedPassword, JSON.stringify(permissions || {}), allowed_branches || [], allowed_provinces || [], id]
            );
        } else {
            await pool.query(
                `UPDATE admin_users SET name = $1, role = $2, active = $3, 
                 permissions = $4, allowed_branches = $5, allowed_provinces = $6 WHERE id = $7`,
                [name, role, active, JSON.stringify(permissions || {}), allowed_branches || [], allowed_provinces || [], id]
            );
        }

        await logActivity(req.user?.id, req.user?.username, 'update_user', `تعديل مستخدم ID: ${id}`, req.ip);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete admin user
app.delete('/api/admin/users/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        // Prevent deleting the main admin
        const user = await pool.query('SELECT username FROM admin_users WHERE id = $1', [id]);
        if (user.rows[0]?.username === 'admin') {
            return res.status(400).json({ error: 'لا يمكن حذف المدير الرئيسي' });
        }

        await pool.query('DELETE FROM admin_users WHERE id = $1', [id]);
        await logActivity(req.user?.id, req.user?.username, 'delete_user', `حذف مستخدم ID: ${id}`, req.ip);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get permission templates
app.get('/api/admin/permission-templates', authenticateToken, async (req, res) => {
    const templates = {
        admin: {
            name: 'مدير كامل',
            icon: '👑',
            permissions: {
                dashboard: { view: true },
                players: { view: true, add: true, edit: true, delete: true },
                roulette: { view: true, spin: true, settings: true },
                settings: { view: true, edit: true },
                prizes: { view: true, add: true, edit: true, delete: true },
                announcements: { view: true, add: true, edit: true, delete: true },
                branches: { view: true, add: true, edit: true, delete: true },
                users: { view: true, add: true, edit: true, delete: true },
                coupons: { view: true, add: true, edit: true, delete: true, use: true },
                referrals: { view: true, settings: true },
                whatsapp: { view: true, send: true, settings: true },
                reports: { view: true, export: true },
                wheel: { view: true, settings: true }
            }
        },
        manager: {
            name: 'مدير فرع',
            icon: '👔',
            permissions: {
                dashboard: { view: true },
                players: { view: true, add: true, edit: true },
                roulette: { view: true, spin: true },
                prizes: { view: true, add: true, edit: true },
                announcements: { view: true },
                branches: { view: true },
                coupons: { view: true, add: true, use: true },
                referrals: { view: true },
                whatsapp: { view: true, send: true },
                reports: { view: true, export: true }
            }
        },
        staff: {
            name: 'موظف',
            icon: '👤',
            permissions: {
                dashboard: { view: true },
                players: { view: true },
                prizes: { view: true },
                coupons: { view: true, use: true },
                referrals: { view: true }
            }
        },
        accountant: {
            name: 'محاسب',
            icon: '💰',
            permissions: {
                dashboard: { view: true },
                players: { view: true },
                prizes: { view: true },
                coupons: { view: true },
                reports: { view: true, export: true }
            }
        },
        viewer: {
            name: 'مشاهد فقط',
            icon: '👁️',
            permissions: {
                dashboard: { view: true },
                players: { view: true },
                prizes: { view: true },
                reports: { view: true }
            }
        }
    };
    res.json(templates);
});

// Get available permissions list
app.get('/api/admin/permissions-list', authenticateToken, async (req, res) => {
    const permissionsList = [
        { id: 'dashboard', name: 'لوحة المعلومات', icon: '📊', actions: ['view'] },
        { id: 'players', name: 'اللاعبين', icon: '👥', actions: ['view', 'add', 'edit', 'delete'] },
        { id: 'roulette', name: 'الروليت', icon: '🎰', actions: ['view', 'spin', 'settings'] },
        { id: 'settings', name: 'الإعدادات', icon: '⚙️', actions: ['view', 'edit'] },
        { id: 'prizes', name: 'الجوائز', icon: '🎁', actions: ['view', 'add', 'edit', 'delete'] },
        { id: 'announcements', name: 'الإعلانات', icon: '📢', actions: ['view', 'add', 'edit', 'delete'] },
        { id: 'branches', name: 'الفروع', icon: '🏢', actions: ['view', 'add', 'edit', 'delete'] },
        { id: 'users', name: 'المستخدمين', icon: '👤', actions: ['view', 'add', 'edit', 'delete'] },
        { id: 'coupons', name: 'الكوبونات', icon: '🎫', actions: ['view', 'add', 'edit', 'delete', 'use'] },
        { id: 'referrals', name: 'الإحالات', icon: '🤝', actions: ['view', 'settings'] },
        { id: 'whatsapp', name: 'WhatsApp', icon: '💬', actions: ['view', 'send', 'settings'] },
        { id: 'reports', name: 'التقارير', icon: '📈', actions: ['view', 'export'] },
        { id: 'wheel', name: 'عجلة الحظ', icon: '🎡', actions: ['view', 'settings'] }
    ];
    res.json(permissionsList);
});

// Get activity logs
app.get('/api/admin/activity-logs', authenticateToken, async (req, res) => {
    const { limit = 50, offset = 0 } = req.query;
    try {
        const result = await pool.query(
            'SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT $1 OFFSET $2',
            [limit, offset]
        );
        const count = await pool.query('SELECT COUNT(*) FROM activity_logs');
        res.json({ logs: result.rows, total: parseInt(count.rows[0].count) });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// New login endpoint with user management
app.post('/api/admin/login-v2', loginLimiter, async (req, res) => {
    const { username, password, twoFactorCode } = req.body;
    try {
        const result = await pool.query('SELECT * FROM admin_users WHERE username = $1 AND active = true', [username]);
        
        if (result.rows.length === 0) {
            await logActivity(null, username, 'login_failed', 'مستخدم غير موجود', req.ip);
            await logSecurityEvent('login_failed', null, username, req.ip, req.get('User-Agent'), { reason: 'user_not_found' });
            return res.status(401).json({ error: 'بيانات الدخول غير صحيحة' });
        }

        const user = result.rows[0];
        const validPassword = await bcrypt.compare(password, user.password);
        
        if (!validPassword) {
            await logActivity(user.id, username, 'login_failed', 'كلمة مرور خاطئة', req.ip);
            await logSecurityEvent('login_failed', user.id, username, req.ip, req.get('User-Agent'), { reason: 'wrong_password' });
            return res.status(401).json({ error: 'بيانات الدخول غير صحيحة' });
        }

        // Check if 2FA is enabled
        if (user.two_factor_enabled) {
            if (!twoFactorCode) {
                return res.json({ 
                    requires2FA: true, 
                    message: 'يرجى إدخال رمز المصادقة الثنائية' 
                });
            }
            
            // Verify 2FA code
            const isValidCode = verifyTOTP(user.two_factor_secret, twoFactorCode);
            
            // Check backup codes if TOTP fails
            let usedBackupCode = false;
            if (!isValidCode && user.backup_codes) {
                const codeIndex = user.backup_codes.indexOf(twoFactorCode.toUpperCase());
                if (codeIndex !== -1) {
                    // Remove used backup code
                    const newCodes = [...user.backup_codes];
                    newCodes.splice(codeIndex, 1);
                    await pool.query('UPDATE admin_users SET backup_codes = $1 WHERE id = $2', [newCodes, user.id]);
                    usedBackupCode = true;
                }
            }
            
            if (!isValidCode && !usedBackupCode) {
                await logSecurityEvent('2fa_failed', user.id, username, req.ip, req.get('User-Agent'), { reason: 'invalid_code' });
                return res.status(401).json({ error: 'رمز المصادقة غير صحيح' });
            }
            
            if (usedBackupCode) {
                await logSecurityEvent('backup_code_used', user.id, username, req.ip, req.get('User-Agent'));
            }
        }

        // Update last login
        await pool.query('UPDATE admin_users SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);
        
        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role, name: user.name, permissions: user.permissions },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );

        await logActivity(user.id, username, 'login_success', 'تسجيل دخول ناجح', req.ip);
        await logSecurityEvent('login_success', user.id, username, req.ip, req.get('User-Agent'));
        
        res.json({ 
            success: true, 
            token, 
            user: { 
                id: user.id, 
                username: user.username, 
                name: user.name, 
                role: user.role,
                permissions: user.permissions || {},
                allowed_branches: user.allowed_branches || [],
                allowed_provinces: user.allowed_provinces || [],
                twoFactorEnabled: user.two_factor_enabled || false
            } 
        });
    } catch (err) {
        console.error('❌ Login error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ============== Backup & Reset APIs ==============

// Create Backup - Enhanced
app.post('/api/admin/backup', authenticateToken, async (req, res) => {
    try {
        const players = await pool.query('SELECT * FROM players');
        const settings = await pool.query('SELECT * FROM settings');
        const prizes = await pool.query('SELECT * FROM prizes');
        const announcements = await pool.query('SELECT * FROM announcements');
        const branches = await pool.query('SELECT * FROM branches');
        const coupons = await pool.query('SELECT * FROM coupons');
        const admin_users = await pool.query('SELECT id, username, name, role, permissions, allowed_branches, allowed_provinces, active, created_at FROM admin_users');
        
        const backup = {
            version: '2.2',
            created_at: new Date().toISOString(),
            created_by: req.user?.username,
            data: {
                players: players.rows,
                settings: settings.rows,
                prizes: prizes.rows,
                announcements: announcements.rows,
                branches: branches.rows,
                coupons: coupons.rows,
                admin_users: admin_users.rows
            },
            stats: {
                players_count: players.rows.length,
                branches_count: branches.rows.length,
                coupons_count: coupons.rows.length
            }
        };
        
        // Log backup
        const filename = `backup_${Date.now()}.json`;
        const size = JSON.stringify(backup).length;
        await pool.query(
            'INSERT INTO backup_logs (filename, size_bytes, type, created_by) VALUES ($1, $2, $3, $4)',
            [filename, size, 'manual', req.user?.id]
        );
        
        await logActivity(req.user?.id, req.user?.username, 'backup_created', `نسخة احتياطية: ${filename}`, req.ip);
        res.json({ success: true, backup, filename });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get Backup History
app.get('/api/admin/backup-history', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM backup_logs ORDER BY created_at DESC LIMIT 50');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Restore Backup
app.post('/api/admin/restore', authenticateToken, async (req, res) => {
    try {
        const { backup } = req.body;
        if (!backup || !backup.data) {
            return res.status(400).json({ error: 'بيانات النسخة الاحتياطية غير صالحة' });
        }
        
        // Restore settings
        if (backup.data.settings) {
            for (const setting of backup.data.settings) {
                await pool.query(
                    'INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2',
                    [setting.key, setting.value]
                );
            }
        }
        
        await logActivity(req.user?.id, req.user?.username, 'backup_restored', 'استعادة نسخة احتياطية', req.ip);
        res.json({ success: true, message: 'تم استعادة الإعدادات' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ============== 2FA APIs ==============

// Generate 2FA Secret
app.post('/api/admin/2fa/setup', authenticateToken, async (req, res) => {
    try {
        // Generate a random secret (32 characters)
        const secret = crypto.randomBytes(20).toString('hex').toUpperCase();
        
        // Generate backup codes
        const backupCodes = [];
        for (let i = 0; i < 8; i++) {
            backupCodes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
        }
        
        // Store temporarily (not enabled yet)
        await pool.query(
            'UPDATE admin_users SET two_factor_secret = $1, backup_codes = $2 WHERE id = $3',
            [secret, backupCodes, req.user.id]
        );
        
        // Generate OTP URL for authenticator apps
        const otpUrl = `otpauth://totp/TetrisAdmin:${req.user.username}?secret=${secret}&issuer=TetrisGame`;
        
        res.json({ 
            success: true, 
            secret,
            otpUrl,
            backupCodes,
            message: 'امسح الـ QR Code باستخدام تطبيق المصادقة'
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Verify and Enable 2FA
app.post('/api/admin/2fa/verify', authenticateToken, async (req, res) => {
    try {
        const { code } = req.body;
        
        const user = await pool.query('SELECT two_factor_secret FROM admin_users WHERE id = $1', [req.user.id]);
        if (!user.rows[0]?.two_factor_secret) {
            return res.status(400).json({ error: 'لم يتم إعداد المصادقة الثنائية' });
        }
        
        const secret = user.rows[0].two_factor_secret;
        const isValid = verifyTOTP(secret, code);
        
        if (isValid) {
            await pool.query('UPDATE admin_users SET two_factor_enabled = true WHERE id = $1', [req.user.id]);
            await logActivity(req.user.id, req.user.username, '2fa_enabled', 'تفعيل المصادقة الثنائية', req.ip);
            res.json({ success: true, message: 'تم تفعيل المصادقة الثنائية' });
        } else {
            res.status(400).json({ error: 'الرمز غير صحيح' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Disable 2FA
app.post('/api/admin/2fa/disable', authenticateToken, async (req, res) => {
    try {
        const { password } = req.body;
        
        const user = await pool.query('SELECT password FROM admin_users WHERE id = $1', [req.user.id]);
        const validPassword = await bcrypt.compare(password, user.rows[0].password);
        
        if (!validPassword) {
            return res.status(400).json({ error: 'كلمة المرور غير صحيحة' });
        }
        
        await pool.query(
            'UPDATE admin_users SET two_factor_enabled = false, two_factor_secret = NULL, backup_codes = NULL WHERE id = $1',
            [req.user.id]
        );
        
        await logActivity(req.user.id, req.user.username, '2fa_disabled', 'إلغاء المصادقة الثنائية', req.ip);
        res.json({ success: true, message: 'تم إلغاء المصادقة الثنائية' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get 2FA Status
app.get('/api/admin/2fa/status', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT two_factor_enabled, backup_codes FROM admin_users WHERE id = $1',
            [req.user.id]
        );
        res.json({
            enabled: result.rows[0]?.two_factor_enabled || false,
            backupCodesCount: result.rows[0]?.backup_codes?.length || 0
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// TOTP Verification Helper
function verifyTOTP(secret, code) {
    const timeStep = 30;
    const now = Math.floor(Date.now() / 1000);
    
    // Check current and adjacent time windows
    for (let i = -1; i <= 1; i++) {
        const time = Math.floor((now + i * timeStep) / timeStep);
        const generatedCode = generateTOTP(secret, time);
        if (generatedCode === code) return true;
    }
    return false;
}

function generateTOTP(secret, time) {
    const buffer = Buffer.alloc(8);
    buffer.writeBigInt64BE(BigInt(time));
    
    const hmac = crypto.createHmac('sha1', Buffer.from(secret, 'hex'));
    hmac.update(buffer);
    const hash = hmac.digest();
    
    const offset = hash[hash.length - 1] & 0xf;
    const code = (
        ((hash[offset] & 0x7f) << 24) |
        ((hash[offset + 1] & 0xff) << 16) |
        ((hash[offset + 2] & 0xff) << 8) |
        (hash[offset + 3] & 0xff)
    ) % 1000000;
    
    return code.toString().padStart(6, '0');
}

// ============== Security Logs ==============

app.get('/api/admin/security-logs', authenticateToken, async (req, res) => {
    try {
        const { limit = 100 } = req.query;
        const result = await pool.query(
            'SELECT * FROM security_logs ORDER BY created_at DESC LIMIT $1',
            [limit]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Log Security Event Helper
async function logSecurityEvent(eventType, userId, username, ip, userAgent, details = {}) {
    try {
        await pool.query(
            'INSERT INTO security_logs (event_type, user_id, username, ip_address, user_agent, details) VALUES ($1, $2, $3, $4, $5, $6)',
            [eventType, userId, username, ip, userAgent, JSON.stringify(details)]
        );
    } catch (err) {
        console.error('Security log error:', err);
    }
}

// Reset Winners
app.post('/api/admin/reset-winners', authenticateToken, async (req, res) => {
    try {
        await pool.query("UPDATE players SET status = 'registered', prize_code = NULL, won_at = NULL WHERE status IN ('winner', 'claimed')");
        await logActivity(req.user?.id, req.user?.username, 'reset_winners', 'إعادة تعيين الفائزين', req.ip);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Reset Scores
app.post('/api/admin/reset-scores', authenticateToken, async (req, res) => {
    try {
        await pool.query('UPDATE players SET score = 0');
        await logActivity(req.user?.id, req.user?.username, 'reset_scores', 'إعادة تعيين النقاط', req.ip);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ============== Static Routes ==============

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/check.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'check.html'));
});

// Hidden Admin Panel Path
const ADMIN_PATH = process.env.ADMIN_PANEL_PATH || 'ctrl_x7k9m2p4';
app.get(`/${ADMIN_PATH}.html`, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Keep old route for backward compatibility (redirects to new)
app.get('/kkk-999.html', (req, res) => {
    res.redirect(`/${ADMIN_PATH}.html`);
});

// ============== Coupons Routes ==============

// Admin - Get All Coupons
app.get('/api/admin/coupons', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM coupons ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Admin - Create Coupon
app.post('/api/admin/coupons', authenticateToken, async (req, res) => {
    try {
        const { code, discount_type, discount_value, max_uses, min_score, expires_at } = req.body;
        
        // Check if code already exists
        const existing = await pool.query('SELECT id FROM coupons WHERE code = $1', [code.toUpperCase()]);
        if (existing.rows.length > 0) {
            return res.status(400).json({ error: 'كود الكوبون موجود مسبقاً' });
        }
        
        const result = await pool.query(
            `INSERT INTO coupons (code, discount_type, discount_value, max_uses, min_score, expires_at) 
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [code.toUpperCase(), discount_type || 'points', discount_value, max_uses || 1, min_score || 0, expires_at || null]
        );
        
        await logActivity(req.user?.id, req.user?.username, 'add_coupon', code, req.ip);
        res.json({ success: true, coupon: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Admin - Update Coupon
app.put('/api/admin/coupons/:id', authenticateToken, async (req, res) => {
    try {
        const { code, discount_type, discount_value, max_uses, min_score, expires_at, active } = req.body;
        
        const result = await pool.query(
            `UPDATE coupons SET code = $1, discount_type = $2, discount_value = $3, max_uses = $4, 
             min_score = $5, expires_at = $6, active = $7 WHERE id = $8 RETURNING *`,
            [code.toUpperCase(), discount_type, discount_value, max_uses, min_score, expires_at, active, req.params.id]
        );
        
        await logActivity(req.user?.id, req.user?.username, 'update_coupon', code, req.ip);
        res.json({ success: true, coupon: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Admin - Toggle Coupon
app.patch('/api/admin/coupons/:id/toggle', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            'UPDATE coupons SET active = NOT active WHERE id = $1 RETURNING *',
            [req.params.id]
        );
        res.json({ success: true, coupon: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Admin - Delete Coupon
app.delete('/api/admin/coupons/:id', authenticateToken, async (req, res) => {
    try {
        await pool.query('DELETE FROM coupons WHERE id = $1', [req.params.id]);
        await logActivity(req.user?.id, req.user?.username, 'delete_coupon', `Coupon ID: ${req.params.id}`, req.ip);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Public - Apply Coupon
app.post('/api/apply-coupon', async (req, res) => {
    try {
        const { code, phone } = req.body;
        
        // Find coupon
        const couponResult = await pool.query(
            'SELECT * FROM coupons WHERE code = $1 AND active = true',
            [code.toUpperCase()]
        );
        
        if (couponResult.rows.length === 0) {
            return res.status(400).json({ error: 'كود غير صالح' });
        }
        
        const coupon = couponResult.rows[0];
        
        // Check expiry
        if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
            return res.status(400).json({ error: 'الكوبون منتهي الصلاحية' });
        }
        
        // Check max uses
        if (coupon.used_count >= coupon.max_uses) {
            return res.status(400).json({ error: 'الكوبون استنفذ عدد الاستخدامات' });
        }
        
        // Check if already used by this player
        const usageCheck = await pool.query(
            'SELECT id FROM coupon_usage WHERE coupon_id = $1 AND player_phone = $2',
            [coupon.id, phone]
        );
        
        if (usageCheck.rows.length > 0) {
            return res.status(400).json({ error: 'لقد استخدمت هذا الكوبون مسبقاً' });
        }
        
        // Get player
        const playerResult = await pool.query('SELECT * FROM players WHERE phone = $1', [phone]);
        if (playerResult.rows.length === 0) {
            return res.status(400).json({ error: 'اللاعب غير مسجل' });
        }
        
        const player = playerResult.rows[0];
        
        // Check min score
        if (coupon.min_score > 0 && player.score < coupon.min_score) {
            return res.status(400).json({ error: `يجب أن يكون لديك ${coupon.min_score} نقطة على الأقل` });
        }
        
        // Apply coupon
        let newScore = player.score;
        if (coupon.discount_type === 'points') {
            newScore += coupon.discount_value;
        }
        
        // Update player score
        await pool.query('UPDATE players SET score = $1 WHERE phone = $2', [newScore, phone]);
        
        // Record usage
        await pool.query(
            'INSERT INTO coupon_usage (coupon_id, player_phone) VALUES ($1, $2)',
            [coupon.id, phone]
        );
        
        // Update coupon usage count
        await pool.query('UPDATE coupons SET used_count = used_count + 1 WHERE id = $1', [coupon.id]);
        
        res.json({ 
            success: true, 
            message: `تم إضافة ${coupon.discount_value} نقطة!`,
            bonus: coupon.discount_value,
            newScore 
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ============== Referrals Routes ==============

// Generate unique referral code
function generateReferralCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// Get player's referral code (create if not exists)
app.get('/api/referral-code/:phone', async (req, res) => {
    try {
        const { phone } = req.params;
        
        let player = await pool.query('SELECT referral_code FROM players WHERE phone = $1', [phone]);
        
        if (player.rows.length === 0) {
            return res.status(404).json({ error: 'اللاعب غير مسجل' });
        }
        
        let referralCode = player.rows[0].referral_code;
        
        // Generate code if not exists
        if (!referralCode) {
            referralCode = generateReferralCode();
            await pool.query('UPDATE players SET referral_code = $1 WHERE phone = $2', [referralCode, phone]);
        }
        
        // Get referral stats
        const stats = await pool.query(
            `SELECT 
                COUNT(*) as total_referrals,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful,
                COALESCE(SUM(CASE WHEN status = 'completed' THEN referrer_bonus ELSE 0 END), 0) as total_bonus
             FROM referrals WHERE referrer_phone = $1`,
            [phone]
        );
        
        res.json({ 
            referralCode,
            stats: stats.rows[0]
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Apply referral code during registration
app.post('/api/apply-referral', async (req, res) => {
    try {
        const { referralCode, newPlayerPhone } = req.body;
        
        // Find referrer
        const referrer = await pool.query(
            'SELECT phone, score FROM players WHERE referral_code = $1',
            [referralCode.toUpperCase()]
        );
        
        if (referrer.rows.length === 0) {
            return res.status(400).json({ error: 'كود الإحالة غير صالح' });
        }
        
        // Check if new player exists
        const newPlayer = await pool.query('SELECT phone, score FROM players WHERE phone = $1', [newPlayerPhone]);
        if (newPlayer.rows.length === 0) {
            return res.status(400).json({ error: 'يجب التسجيل أولاً' });
        }
        
        // Can't refer yourself
        if (referrer.rows[0].phone === newPlayerPhone) {
            return res.status(400).json({ error: 'لا يمكنك إحالة نفسك' });
        }
        
        // Check if already referred
        const existingRef = await pool.query(
            'SELECT id FROM referrals WHERE referred_phone = $1',
            [newPlayerPhone]
        );
        
        if (existingRef.rows.length > 0) {
            return res.status(400).json({ error: 'لقد تم استخدام إحالة مسبقاً' });
        }
        
        // Get referral settings
        const referrerBonus = 100; // نقاط للمُحيل
        const referredBonus = 50;  // نقاط للمُحال
        
        // Create referral record
        await pool.query(
            `INSERT INTO referrals (referrer_phone, referred_phone, referrer_bonus, referred_bonus, status, completed_at) 
             VALUES ($1, $2, $3, $4, 'completed', NOW())`,
            [referrer.rows[0].phone, newPlayerPhone, referrerBonus, referredBonus]
        );
        
        // Add bonus to referrer
        await pool.query(
            'UPDATE players SET score = score + $1 WHERE phone = $2',
            [referrerBonus, referrer.rows[0].phone]
        );
        
        // Add bonus to referred player
        await pool.query(
            'UPDATE players SET score = score + $1, referred_by = $2 WHERE phone = $3',
            [referredBonus, referrer.rows[0].phone, newPlayerPhone]
        );
        
        res.json({ 
            success: true, 
            message: `تم! حصلت على ${referredBonus} نقطة كمكافأة`,
            bonus: referredBonus
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Admin - Get Referral Stats
app.get('/api/admin/referrals', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT r.*, 
                   p1.name as referrer_name,
                   p2.name as referred_name
            FROM referrals r
            LEFT JOIN players p1 ON r.referrer_phone = p1.phone
            LEFT JOIN players p2 ON r.referred_phone = p2.phone
            ORDER BY r.created_at DESC
            LIMIT 100
        `);
        
        const stats = await pool.query(`
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
                COALESCE(SUM(referrer_bonus + referred_bonus), 0) as total_bonus_given
            FROM referrals
        `);
        
        res.json({ 
            referrals: result.rows,
            stats: stats.rows[0]
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Admin - Update Referral Settings
app.post('/api/admin/referral-settings', authenticateToken, async (req, res) => {
    try {
        const { referrer_bonus, referred_bonus, enabled } = req.body;
        
        await pool.query(
            'INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2',
            ['referrer_bonus', referrer_bonus.toString()]
        );
        await pool.query(
            'INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2',
            ['referred_bonus', referred_bonus.toString()]
        );
        await pool.query(
            'INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2',
            ['referral_enabled', enabled.toString()]
        );
        
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ============== WhatsApp Integration ==============

// Send WhatsApp message (via API)
app.post('/api/admin/send-whatsapp', authenticateToken, async (req, res) => {
    try {
        const { phone, message, template } = req.body;
        
        // Get WhatsApp settings
        const settingsResult = await pool.query(
            "SELECT key, value FROM settings WHERE key IN ('whatsapp_api_url', 'whatsapp_api_key', 'whatsapp_instance')"
        );
        
        const wsSettings = {};
        settingsResult.rows.forEach(row => {
            wsSettings[row.key] = row.value;
        });
        
        if (!wsSettings.whatsapp_api_url || !wsSettings.whatsapp_api_key) {
            return res.status(400).json({ error: 'إعدادات WhatsApp غير مكتملة' });
        }
        
        // Format phone number (remove leading zero, add country code)
        let formattedPhone = phone.replace(/^0/, '964');
        if (!formattedPhone.startsWith('964')) {
            formattedPhone = '964' + formattedPhone;
        }
        
        // Send via WhatsApp API (example using UltraMsg or similar)
        const response = await fetch(wsSettings.whatsapp_api_url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${wsSettings.whatsapp_api_key}`
            },
            body: JSON.stringify({
                phone: formattedPhone,
                body: message
            })
        });
        
        const data = await response.json();
        
        await logActivity(req.user?.id, req.user?.username, 'send_whatsapp', `To: ${phone}`, req.ip);
        
        res.json({ success: true, data });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'فشل إرسال الرسالة' });
    }
});

// Send WhatsApp to winner
app.post('/api/admin/notify-winner/:id', authenticateToken, async (req, res) => {
    try {
        const playerId = req.params.id;
        
        // Get player info
        const playerResult = await pool.query(
            'SELECT * FROM players WHERE id = $1',
            [playerId]
        );
        
        if (playerResult.rows.length === 0) {
            return res.status(404).json({ error: 'اللاعب غير موجود' });
        }
        
        const player = playerResult.rows[0];
        
        // Get message template
        const templateResult = await pool.query(
            "SELECT value FROM settings WHERE key = 'winner_message_template'"
        );
        
        let message = templateResult.rows[0]?.value || 
            `🎉 مبروك ${player.name}!\n\nلقد فزت في مسابقة ريد سترونك!\n\nكود الجائزة: ${player.prize_code}\n\nيرجى التوجه لأقرب فرع لاستلام جائزتك.`;
        
        // Replace placeholders
        message = message
            .replace('{name}', player.name)
            .replace('{prize_code}', player.prize_code || 'N/A')
            .replace('{score}', player.score);
        
        // Send message (mock for now - actual sending requires WhatsApp API setup)
        console.log(`📱 WhatsApp to ${player.phone}: ${message}`);
        
        await logActivity(req.user?.id, req.user?.username, 'notify_winner', player.phone, req.ip);
        
        res.json({ 
            success: true, 
            message: 'تم إرسال الرسالة',
            sentTo: player.phone
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ============== Analytics APIs ==============

// Get analytics data
app.get('/api/admin/analytics', authenticateToken, async (req, res) => {
    try {
        // Get level distribution
        const levels = await pool.query(`
            SELECT 
                COUNT(CASE WHEN score < 500 THEN 1 END) as bronze,
                COUNT(CASE WHEN score >= 500 AND score < 1500 THEN 1 END) as silver,
                COUNT(CASE WHEN score >= 1500 AND score < 3000 THEN 1 END) as gold,
                COUNT(CASE WHEN score >= 3000 THEN 1 END) as diamond
            FROM players
        `);
        
        // Get return rate (players who played more than once)
        const returnRate = await pool.query(`
            SELECT 
                COUNT(CASE WHEN play_count > 1 THEN 1 END)::float / NULLIF(COUNT(*), 0) * 100 as rate
            FROM (
                SELECT phone, COUNT(*) as play_count FROM game_sessions GROUP BY phone
            ) t
        `);
        
        // Get hourly stats
        const hourlyStats = await pool.query(`
            SELECT EXTRACT(HOUR FROM created_at) as hour, COUNT(*) as count
            FROM players
            GROUP BY hour
            ORDER BY hour
        `);
        
        // Find peak hour
        const peak = hourlyStats.rows.reduce((max, row) => 
            parseInt(row.count) > (max.count || 0) ? { hour: row.hour, count: parseInt(row.count) } : max, {});
        
        res.json({
            levels: levels.rows[0],
            return_rate: Math.round(returnRate.rows[0]?.rate || 42),
            mobile_percent: 65, // Would need device tracking
            desktop_percent: 35,
            peak_hour: peak.hour ? `${peak.hour}:00` : '21:00',
            hourly_stats: Array.from({length: 24}, (_, i) => {
                const found = hourlyStats.rows.find(r => parseInt(r.hour) === i);
                return found ? parseInt(found.count) : 0;
            })
        });
    } catch (err) {
        console.error(err);
        res.json({ levels: {}, return_rate: 0, mobile_percent: 65, desktop_percent: 35 });
    }
});

// Export phone list
app.get('/api/admin/export-phones', authenticateToken, async (req, res) => {
    try {
        const { filter, province } = req.query;
        let query = 'SELECT phone FROM players WHERE 1=1';
        const params = [];
        
        if (filter === 'winners') {
            query += ' AND is_winner = true';
        } else if (filter === 'active') {
            query += ' AND played_at >= NOW() - INTERVAL \'7 days\'';
        } else if (filter === 'inactive') {
            query += ' AND (played_at IS NULL OR played_at < NOW() - INTERVAL \'7 days\')';
        }
        
        if (province) {
            params.push(province);
            query += ` AND province = $${params.length}`;
        }
        
        const result = await pool.query(query, params);
        res.json({ phones: result.rows.map(r => r.phone) });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ============== Blocking APIs ==============

// Get blocked items
app.get('/api/admin/blocked', authenticateToken, async (req, res) => {
    try {
        const phones = await pool.query('SELECT * FROM blocked_items WHERE type = $1 ORDER BY blocked_at DESC', ['phone']);
        const ips = await pool.query('SELECT * FROM blocked_items WHERE type = $1 ORDER BY blocked_at DESC', ['ip']);
        res.json({ phones: phones.rows, ips: ips.rows });
    } catch (err) {
        console.error(err);
        res.json({ phones: [], ips: [] });
    }
});

// Block item
app.post('/api/admin/block', authenticateToken, async (req, res) => {
    try {
        const { type, value, reason, notes } = req.body;
        await pool.query(
            'INSERT INTO blocked_items (type, value, reason, notes, blocked_by) VALUES ($1, $2, $3, $4, $5)',
            [type, value, reason, notes, req.user?.username]
        );
        await logActivity(req.user?.id, req.user?.username, 'block_' + type, value, req.ip);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Unblock item
app.delete('/api/admin/unblock/:id', authenticateToken, async (req, res) => {
    try {
        await pool.query('DELETE FROM blocked_items WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get cheat logs
app.get('/api/admin/cheat-logs', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM cheat_logs ORDER BY logged_at DESC LIMIT 100');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.json([]);
    }
});

// ============== Lucky Wheel APIs ==============

// Get wheel stats
app.get('/api/admin/lucky-wheel/stats', authenticateToken, async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const stats = await pool.query(`
            SELECT COUNT(*) as spins, COALESCE(SUM(points_won), 0) as points
            FROM wheel_spins
            WHERE DATE(spun_at) = $1
        `, [today]);
        
        res.json({
            spins_today: stats.rows[0]?.spins || 0,
            points_today: stats.rows[0]?.points || 0
        });
    } catch (err) {
        console.error(err);
        res.json({ spins_today: 0, points_today: 0 });
    }
});

// Spin wheel (public API)
app.post('/api/spin-wheel', async (req, res) => {
    try {
        const { phone } = req.body;
        
        // Check if wheel is enabled
        const settingRes = await pool.query("SELECT value FROM settings WHERE key = 'lucky_wheel_enabled'");
        if (settingRes.rows[0]?.value !== 'true') {
            return res.status(400).json({ error: 'عجلة الحظ غير متاحة حالياً' });
        }
        
        // Check if already spun today
        const today = new Date().toISOString().split('T')[0];
        const existingSpin = await pool.query(
            'SELECT id FROM wheel_spins WHERE phone = $1 AND DATE(spun_at) = $2',
            [phone, today]
        );
        
        if (existingSpin.rows.length > 0) {
            return res.status(400).json({ error: 'لقد استخدمت فرصتك اليوم! عد غداً' });
        }
        
        // Determine prize (weighted random)
        const prizes = [
            { points: 10, weight: 40 },
            { points: 25, weight: 30 },
            { points: 50, weight: 20 },
            { points: 100, weight: 10 }
        ];
        
        const totalWeight = prizes.reduce((sum, p) => sum + p.weight, 0);
        let random = Math.random() * totalWeight;
        let prize = prizes[0];
        
        for (const p of prizes) {
            random -= p.weight;
            if (random <= 0) {
                prize = p;
                break;
            }
        }
        
        // Record spin
        await pool.query(
            'INSERT INTO wheel_spins (phone, points_won) VALUES ($1, $2)',
            [phone, prize.points]
        );
        
        // Add points to player
        await pool.query(
            'UPDATE players SET score = score + $1 WHERE phone = $2',
            [prize.points, phone]
        );
        
        res.json({ success: true, points: prize.points });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ============== Daily Goals & Scheduling APIs ==============

// Admin - Get Goals
app.get('/api/admin/goals', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM daily_goals ORDER BY created_at DESC');
        
        // Get today's stats
        const today = new Date().toISOString().split('T')[0];
        const stats = await pool.query(`
            SELECT 
                COUNT(*) as completed_today,
                COALESCE(SUM(reward_given), 0) as rewards_today,
                COUNT(DISTINCT player_phone) as active_players
            FROM goal_completions
            WHERE DATE(completed_at) = $1
        `, [today]);
        
        res.json({ 
            goals: result.rows,
            stats: stats.rows[0]
        });
    } catch (err) {
        console.error(err);
        res.json({ goals: [], stats: {} });
    }
});

// Admin - Create Goal
app.post('/api/admin/goals', authenticateToken, async (req, res) => {
    try {
        const { title, description, type, target, reward, icon, active } = req.body;
        const result = await pool.query(
            `INSERT INTO daily_goals (title, description, type, target, reward, icon, active) 
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [title, description, type, target, reward, icon || '🎯', active]
        );
        res.json({ success: true, goal: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Admin - Update Goal
app.put('/api/admin/goals/:id', authenticateToken, async (req, res) => {
    try {
        const { title, description, type, target, reward, icon, active } = req.body;
        const result = await pool.query(
            `UPDATE daily_goals SET title = $1, description = $2, type = $3, target = $4, 
             reward = $5, icon = $6, active = $7 WHERE id = $8 RETURNING *`,
            [title, description, type, target, reward, icon, active, req.params.id]
        );
        res.json({ success: true, goal: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Admin - Delete Goal
app.delete('/api/admin/goals/:id', authenticateToken, async (req, res) => {
    try {
        await pool.query('DELETE FROM daily_goals WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Admin - Get Scheduled Draws
app.get('/api/admin/scheduled-draws', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM scheduled_draws ORDER BY draw_at DESC');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.json([]);
    }
});

// Admin - Create Scheduled Draw
app.post('/api/admin/scheduled-draws', authenticateToken, async (req, res) => {
    try {
        const { draw_at, winners_count } = req.body;
        const result = await pool.query(
            `INSERT INTO scheduled_draws (draw_at, winners_count) VALUES ($1, $2) RETURNING *`,
            [draw_at, winners_count]
        );
        await logActivity(req.user?.id, req.user?.username, 'schedule_draw', `At: ${draw_at}`, req.ip);
        res.json({ success: true, draw: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Admin - Delete Scheduled Draw
app.delete('/api/admin/scheduled-draws/:id', authenticateToken, async (req, res) => {
    try {
        await pool.query('DELETE FROM scheduled_draws WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ============== Reports & Charts APIs ==============

// Get chart data - Players over time
app.get('/api/admin/charts/players', authenticateToken, async (req, res) => {
    try {
        const { period } = req.query; // week, month, year
        let interval, format, days;
        
        switch(period) {
            case 'year':
                interval = '1 month';
                format = 'YYYY-MM';
                days = 365;
                break;
            case 'month':
                interval = '1 day';
                format = 'MM-DD';
                days = 30;
                break;
            default: // week
                interval = '1 day';
                format = 'Dy';
                days = 7;
        }
        
        const result = await pool.query(`
            SELECT 
                TO_CHAR(created_at, '${format}') as label,
                COUNT(*) as count
            FROM players 
            WHERE created_at >= NOW() - INTERVAL '${days} days'
            GROUP BY TO_CHAR(created_at, '${format}'), DATE_TRUNC('day', created_at)
            ORDER BY DATE_TRUNC('day', created_at)
        `);
        
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get province statistics
app.get('/api/admin/charts/provinces', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                province,
                COUNT(*) as total_players,
                COUNT(CASE WHEN is_winner = true THEN 1 END) as winners,
                ROUND(AVG(score)) as avg_score,
                MAX(score) as max_score
            FROM players 
            WHERE province IS NOT NULL
            GROUP BY province
            ORDER BY total_players DESC
        `);
        
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get top scores
app.get('/api/admin/charts/top-scores', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT name, score, province
            FROM players 
            ORDER BY score DESC
            LIMIT 10
        `);
        
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get winners by province
app.get('/api/admin/charts/winners', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                province,
                COUNT(*) as count
            FROM players 
            WHERE is_winner = true AND province IS NOT NULL
            GROUP BY province
            ORDER BY count DESC
        `);
        
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get report statistics
app.get('/api/admin/reports/stats', authenticateToken, async (req, res) => {
    try {
        const stats = await pool.query(`
            SELECT 
                COUNT(*) as total_players,
                COUNT(CASE WHEN is_winner = true THEN 1 END) as total_winners,
                ROUND(AVG(score)) as avg_score,
                COUNT(CASE WHEN created_at >= CURRENT_DATE THEN 1 END) as today_players
            FROM players
        `);
        
        res.json(stats.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Generate report data
app.get('/api/admin/reports/generate', authenticateToken, async (req, res) => {
    try {
        const { type, from, to, province } = req.query;
        
        let query = '';
        let params = [];
        let paramIndex = 1;
        
        let whereClause = 'WHERE 1=1';
        if (from) {
            whereClause += ` AND created_at >= $${paramIndex++}`;
            params.push(from);
        }
        if (to) {
            whereClause += ` AND created_at <= $${paramIndex++}`;
            params.push(to);
        }
        if (province) {
            whereClause += ` AND province = $${paramIndex++}`;
            params.push(province);
        }
        
        switch(type) {
            case 'winners':
                query = `SELECT * FROM players ${whereClause} AND is_winner = true ORDER BY won_at DESC`;
                break;
            case 'provinces':
                query = `
                    SELECT 
                        province,
                        COUNT(*) as total_players,
                        COUNT(CASE WHEN is_winner = true THEN 1 END) as winners,
                        ROUND(AVG(score)) as avg_score,
                        MAX(score) as max_score,
                        ROUND(COUNT(CASE WHEN is_winner = true THEN 1 END)::numeric / COUNT(*)::numeric * 100, 2) as win_rate
                    FROM players 
                    ${whereClause} AND province IS NOT NULL
                    GROUP BY province
                    ORDER BY total_players DESC
                `;
                break;
            case 'daily':
                query = `
                    SELECT 
                        DATE(created_at) as date,
                        COUNT(*) as new_players,
                        COUNT(CASE WHEN is_winner = true THEN 1 END) as winners,
                        SUM(score) as total_score
                    FROM players 
                    ${whereClause}
                    GROUP BY DATE(created_at)
                    ORDER BY date DESC
                `;
                break;
            case 'full':
                // Get comprehensive report
                const playersResult = await pool.query(`SELECT * FROM players ${whereClause} ORDER BY created_at DESC`, params);
                const statsResult = await pool.query(`
                    SELECT 
                        COUNT(*) as total,
                        COUNT(CASE WHEN is_winner = true THEN 1 END) as winners,
                        ROUND(AVG(score)) as avg_score,
                        MAX(score) as max_score,
                        MIN(score) as min_score
                    FROM players ${whereClause}
                `, params);
                const provinceResult = await pool.query(`
                    SELECT province, COUNT(*) as count 
                    FROM players ${whereClause} AND province IS NOT NULL 
                    GROUP BY province ORDER BY count DESC
                `, params);
                
                return res.json({
                    type: 'full',
                    players: playersResult.rows,
                    stats: statsResult.rows[0],
                    provinces: provinceResult.rows,
                    generatedAt: new Date().toISOString()
                });
            default:
                query = `SELECT * FROM players ${whereClause} ORDER BY created_at DESC`;
        }
        
        const result = await pool.query(query, params);
        res.json({
            type,
            data: result.rows,
            count: result.rows.length,
            generatedAt: new Date().toISOString()
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ============== Activity Logs ==============
app.get('/api/admin/activity-logs', authenticateToken, async (req, res) => {
    const { limit = 100, offset = 0, action, username } = req.query;
    try {
        let query = 'SELECT * FROM activity_logs WHERE 1=1';
        const params = [];
        
        if (action) {
            params.push(action);
            query += ` AND action = $${params.length}`;
        }
        if (username) {
            params.push(`%${username}%`);
            query += ` AND username ILIKE $${params.length}`;
        }
        
        query += ' ORDER BY created_at DESC';
        params.push(parseInt(limit));
        query += ` LIMIT $${params.length}`;
        params.push(parseInt(offset));
        query += ` OFFSET $${params.length}`;
        
        const result = await pool.query(query, params);
        const countResult = await pool.query('SELECT COUNT(*) FROM activity_logs');
        
        res.json({
            logs: result.rows,
            total: parseInt(countResult.rows[0].count),
            limit: parseInt(limit),
            offset: parseInt(offset)
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ============== Security Logs ==============
app.get('/api/admin/security-logs', authenticateToken, async (req, res) => {
    const { limit = 100 } = req.query;
    try {
        const result = await pool.query(
            'SELECT * FROM security_logs ORDER BY created_at DESC LIMIT $1',
            [parseInt(limit)]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ============== Login Attempts ==============
app.get('/api/admin/login-attempts', authenticateToken, async (req, res) => {
    const { limit = 50 } = req.query;
    try {
        const result = await pool.query(
            'SELECT * FROM admin_login_attempts ORDER BY attempted_at DESC LIMIT $1',
            [parseInt(limit)]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ============== Backup System ==============
app.post('/api/admin/backup', authenticateToken, async (req, res) => {
    try {
        const tables = ['players', 'settings', 'prizes', 'announcements', 'branches', 'coupons', 'referrals', 'daily_goals'];
        const backup = {
            version: '57.0',
            created_at: new Date().toISOString(),
            created_by: req.user?.username,
            data: {}
        };
        
        for (const table of tables) {
            try {
                const result = await pool.query(`SELECT * FROM ${table}`);
                backup.data[table] = result.rows;
            } catch (e) {
                backup.data[table] = [];
            }
        }
        
        const filename = `backup_${Date.now()}.json`;
        const size = JSON.stringify(backup).length;
        
        await pool.query(
            'INSERT INTO backup_logs (filename, size_bytes, type, tables_included, created_by) VALUES ($1, $2, $3, $4, $5)',
            [filename, size, 'manual', tables, req.user?.id]
        );
        
        await logActivity(req.user?.id, req.user?.username, 'backup_created', `نسخة احتياطية: ${filename}`, req.ip);
        
        res.json({
            success: true,
            backup,
            filename,
            size: `${(size / 1024).toFixed(2)} KB`
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/admin/backup-history', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM backup_logs ORDER BY created_at DESC LIMIT 50'
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ============== Health Check ==============
app.get('/api/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({
            status: 'healthy',
            version: '57.0.0',
            timestamp: new Date().toISOString(),
            database: 'connected',
            uptime: process.uptime()
        });
    } catch (err) {
        res.status(500).json({
            status: 'unhealthy',
            database: 'disconnected'
        });
    }
});

// ============== Start Server ==============

// ============== 2FA Routes ==============

// Setup 2FA - Generate Secret
app.post('/api/admin/2fa/setup', authenticateToken, async (req, res) => {
    try {
        const secret = speakeasy.generateSecret({
            name: 'Red Strong Tetris (' + req.user.username + ')',
            length: 20
        });
        
        const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);
        
        // Save secret temporarily (not enabled yet)
        await pool.query(
            'UPDATE admin_users SET two_factor_secret = $1 WHERE id = $2',
            [secret.base32, req.user.id]
        );
        
        res.json({
            success: true,
            secret: secret.base32,
            qrCode: qrCodeUrl
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Verify and Enable 2FA
app.post('/api/admin/2fa/verify', authenticateToken, async (req, res) => {
    const { code } = req.body;
    try {
        const user = await pool.query('SELECT two_factor_secret FROM admin_users WHERE id = $1', [req.user.id]);
        
        if (!user.rows[0]?.two_factor_secret) {
            return res.status(400).json({ error: 'Setup 2FA first' });
        }
        
        const verified = speakeasy.totp.verify({
            secret: user.rows[0].two_factor_secret,
            encoding: 'base32',
            token: code,
            window: 2
        });
        
        if (verified) {
            await pool.query('UPDATE admin_users SET two_factor_enabled = true WHERE id = $1', [req.user.id]);
            res.json({ success: true, message: '2FA enabled successfully' });
        } else {
            res.status(400).json({ error: 'Invalid code' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Disable 2FA
app.post('/api/admin/2fa/disable', authenticateToken, async (req, res) => {
    const { code } = req.body;
    try {
        const user = await pool.query('SELECT two_factor_secret FROM admin_users WHERE id = $1', [req.user.id]);
        
        const verified = speakeasy.totp.verify({
            secret: user.rows[0].two_factor_secret,
            encoding: 'base32',
            token: code,
            window: 2
        });
        
        if (verified) {
            await pool.query('UPDATE admin_users SET two_factor_enabled = false, two_factor_secret = NULL WHERE id = $1', [req.user.id]);
            res.json({ success: true, message: '2FA disabled' });
        } else {
            res.status(400).json({ error: 'Invalid code' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get 2FA Status
app.get('/api/admin/2fa/status', authenticateToken, async (req, res) => {
    try {
        const user = await pool.query('SELECT two_factor_enabled FROM admin_users WHERE id = $1', [req.user.id]);
        res.json({ enabled: user.rows[0]?.two_factor_enabled || false });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════════╗
║   🎮 Red Strong Tetris Server v57.0                ║
║   ✅ Running on port ${PORT}                          ║
║   🌐 http://localhost:${PORT}                          ║
║   🔐 Admin: /${ADMIN_PANEL_PATH}.html              ║
║   📊 Health: /api/health                           ║
╚════════════════════════════════════════════════════╝
    `);
});


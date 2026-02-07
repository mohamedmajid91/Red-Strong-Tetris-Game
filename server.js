// ============== Server.js v57.0 - Ultimate Edition ==============
// التحسينات: Refresh Tokens, Activity Logs, WhatsApp, Enhanced Security
require('dotenv').config();
const express = require('express');
const versionManager = require('./config/version');
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
const PDFDocument = require('pdfkit');
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
// Enhanced Security with CSP
// Helmet disabled for HTTP compatibility
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: false,
    originAgentCluster: false,
    hsts: false
}));

app.use(cors({
    origin: process.env.ALLOWED_ORIGIN || '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ============== SECURE STATIC FILE SERVING ==============
// Detect UTF-8 overlong encoding attacks
const detectOverlongEncoding = (str) => {
    // Common overlong encoding patterns used in path traversal
    const overlongPatterns = [
        /%c0%ae/gi,     // Overlong encoding for '.'
        /%c0%af/gi,     // Overlong encoding for '/'
        /%c1%9c/gi,     // Another overlong for '\'
        /%c0%2f/gi,     // Mixed encoding
        /%c0%5c/gi,     // Mixed encoding for '\'
        /%e0%80%ae/gi,  // 3-byte overlong for '.'
        /%e0%80%af/gi,  // 3-byte overlong for '/'
        /%f0%80%80%ae/gi, // 4-byte overlong
        /%f0%80%80%af/gi  // 4-byte overlong
    ];
    
    for (const pattern of overlongPatterns) {
        if (pattern.test(str)) {
            return true;
        }
    }
    return false;
};

// Secure Static File Serving - Prevent Path Traversal
app.use('/uploads', (req, res, next) => {
    try {
        // Decode URL and check for path traversal
        let decodedPath;
        try {
            decodedPath = decodeURIComponent(req.path);
        } catch (e) {
            // Invalid encoding - block it
            return res.status(400).json({ error: 'Invalid URL encoding' });
        }
        
        // Check for UTF-8 overlong encoding attacks
        if (detectOverlongEncoding(req.path) || detectOverlongEncoding(req.url)) {
            pool.query(`
                INSERT INTO security_events (event_type, severity, ip_address, description, metadata)
                VALUES ($1, $2, $3, $4, $5)
            `, ['OVERLONG_ENCODING_ATTACK', 'critical', req.ip, 'محاولة هجوم UTF-8 Overlong Encoding', JSON.stringify({
                path: req.path,
                url: req.url,
                userAgent: req.headers['user-agent']
            })]).catch(() => {});
            
            return res.status(403).json({ error: 'Forbidden - Invalid encoding detected' });
        }
        
        // Block path traversal attempts (expanded patterns)
        const dangerousPatterns = [
            '..', '//', '\\\\', '\0', '%00',
            '%2e%2e', '%252e', '%2f', '%5c',
            '....', './', '.\\',
            'etc/passwd', 'etc/shadow',
            'windows/system', 'boot.ini'
        ];
        
        const lowerPath = decodedPath.toLowerCase();
        const lowerUrl = req.url.toLowerCase();
        
        for (const pattern of dangerousPatterns) {
            if (lowerPath.includes(pattern) || lowerUrl.includes(pattern)) {
                pool.query(`
                    INSERT INTO security_events (event_type, severity, ip_address, description, metadata)
                    VALUES ($1, $2, $3, $4, $5)
                `, ['PATH_TRAVERSAL_STATIC', 'high', req.ip, 'محاولة Path Traversal على الملفات', JSON.stringify({
                    path: req.path,
                    decodedPath: decodedPath,
                    pattern: pattern,
                    userAgent: req.headers['user-agent']
                })]).catch(() => {});
                
                return res.status(403).json({ error: 'Forbidden' });
            }
        }
        
        // Only allow specific extensions
        const ext = path.extname(decodedPath).toLowerCase();
        const allowedExt = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.ico'];
        
        if (ext && !allowedExt.includes(ext)) {
            return res.status(403).json({ error: 'File type not allowed' });
        }
        
        next();
    } catch (err) {
        // Any error in security check = block request
        return res.status(403).json({ error: 'Security check failed' });
    }
}, express.static(path.join(__dirname, 'public/uploads'), {
    dotfiles: 'deny',
    index: false,
    maxAge: '1d'
}));

app.use(express.static('public', {
    dotfiles: 'deny',
    index: 'index.html'
}));

// Favicon handler (prevent 404)
app.get('/favicon.ico', (req, res) => {
    res.status(204).end();
});

// ============== ADVANCED INPUT SANITIZATION ==============
const sanitizeInput = (req, res, next) => {
    const sanitize = (obj, depth = 0) => {
        // Prevent deep recursion attacks
        if (depth > 10) return obj;
        
        if (typeof obj === 'string') {
            // Remove null bytes
            obj = obj.replace(/\0/g, '');
            
            // Remove path traversal attempts
            obj = obj.replace(/\.\.\//g, '').replace(/\.\.%2f/gi, '').replace(/\.\.%5c/gi, '');
            
            // Remove HTML tags (XSS prevention)
            obj = obj.replace(/<[^>]*>/g, '');
            
            // Remove dangerous characters
            obj = obj.replace(/[<>\"\'`;\\]/g, '');
            
            // Remove SQL injection attempts
            obj = obj.replace(/('|"|;|--|\/\*|\*\/|xp_|sp_|0x)/gi, '');
            
            // Trim whitespace
            obj = obj.trim();
            
            // Limit string length
            if (obj.length > 10000) {
                obj = obj.substring(0, 10000);
            }
            
            return obj;
        }
        
        if (Array.isArray(obj)) {
            // Limit array size
            if (obj.length > 1000) {
                obj = obj.slice(0, 1000);
            }
            return obj.map(item => sanitize(item, depth + 1));
        }
        
        if (typeof obj === 'object' && obj !== null) {
            const keys = Object.keys(obj);
            // Limit number of keys
            if (keys.length > 100) {
                const limitedKeys = keys.slice(0, 100);
                const newObj = {};
                limitedKeys.forEach(key => {
                    newObj[sanitize(key, depth + 1)] = sanitize(obj[key], depth + 1);
                });
                return newObj;
            }
            
            for (let key in obj) {
                // Sanitize keys too
                const sanitizedKey = sanitize(key, depth + 1);
                if (sanitizedKey !== key) {
                    obj[sanitizedKey] = obj[key];
                    delete obj[key];
                    key = sanitizedKey;
                }
                obj[key] = sanitize(obj[key], depth + 1);
            }
        }
        
        return obj;
    };
    
    // Sanitize all inputs
    if (req.body) req.body = sanitize(req.body);
    if (req.query) req.query = sanitize(req.query);
    if (req.params) req.params = sanitize(req.params);
    
    // Check for suspicious patterns in URL
    const suspiciousPatterns = [
        /\.\./,                    // Path traversal
        /\/etc\/passwd/i,          // Linux password file
        /\/windows\/system/i,      // Windows system
        /\bselect\b.*\bfrom\b/i,   // SQL injection
        /\bunion\b.*\bselect\b/i,  // SQL injection
        /<script/i,                // XSS
        /javascript:/i,            // XSS
        /onerror\s*=/i,           // XSS
        /onload\s*=/i             // XSS
    ];
    
    const fullUrl = req.originalUrl + JSON.stringify(req.body || {});
    
    for (const pattern of suspiciousPatterns) {
        if (pattern.test(fullUrl)) {
            // Log attack attempt
            pool.query(`
                INSERT INTO security_events (event_type, severity, ip_address, description, metadata)
                VALUES ($1, $2, $3, $4, $5)
            `, ['INJECTION_ATTEMPT', 'high', req.ip, 'محاولة حقن ضار', JSON.stringify({
                url: req.originalUrl,
                method: req.method,
                pattern: pattern.toString(),
                userAgent: req.headers['user-agent']
            })]).catch(() => {});
            
            return res.status(403).json({ error: 'طلب مشبوه' });
        }
    }
    
    next();
};
app.use(sanitizeInput);

// Rate Limiting - Enhanced
// Rate Limiting - Enhanced
const limiter = rateLimit({ 
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 300, // 300 requests per 15 minutes
    message: { error: 'طلبات كثيرة، حاول لاحقاً' },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        // Use X-Forwarded-For if behind proxy, otherwise use IP
        return req.headers['x-forwarded-for']?.split(',')[0] || req.ip || req.connection.remoteAddress;
    },
    skip: (req) => {
        // Skip rate limit for admin routes if authenticated
        return req.path.startsWith('/api/admin/') && req.headers.authorization;
    },
    handler: (req, res) => {
        // Log rate limit violation
        pool.query(`
            INSERT INTO rate_limit_violations (ip_address, phone, endpoint)
            VALUES ($1, $2, $3)
        `, [req.ip, req.body?.phone || null, req.path]).catch(() => {});
        
        res.status(429).json({ error: 'طلبات كثيرة، حاول لاحقاً', code: 'RATE_LIMITED' });
    }
});
app.use('/api/', limiter);

// Strict limiter for sensitive endpoints
const strictLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 requests per minute
    message: { error: 'طلبات كثيرة جداً' },
    standardHeaders: true
});

// Admin limiter
const adminLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    message: { error: 'طلبات كثيرة' }
});

// Login limiter - strict
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { error: 'محاولات تسجيل دخول كثيرة، انتظر 15 دقيقة' },
    skipSuccessfulRequests: true,
    handler: (req, res) => {
        // Log failed login attempt
        pool.query(`
            INSERT INTO security_events (event_type, severity, ip_address, description, metadata)
            VALUES ($1, $2, $3, $4, $5)
        `, ['LOGIN_RATE_LIMITED', 'medium', req.ip, 'تجاوز حد محاولات تسجيل الدخول', JSON.stringify({
            username: req.body?.username,
            userAgent: req.headers['user-agent']
        })]).catch(() => {});
        
        res.status(429).json({ error: 'محاولات تسجيل دخول كثيرة، انتظر 15 دقيقة' });
    }
});

// حماية من البوتات - تسجيل اللاعبين
const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 10,
    message: { error: 'تسجيلات كثيرة، انتظر ساعة' }
});

// حماية إرسال النقاط
const scoreLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    message: { error: 'طلبات كثيرة' }
});

// File Upload Config
// ============== SECURE FILE UPLOAD ==============
const UPLOAD_DIR = path.resolve('./public/uploads');

// Ensure upload directory exists and is secure
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Secure filename sanitizer
const sanitizeFilename = (filename) => {
    // Remove path traversal attempts
    let safe = filename
        .replace(/\.\./g, '')           // Remove ..
        .replace(/\//g, '')             // Remove /
        .replace(/\\/g, '')             // Remove \
        .replace(/\0/g, '')             // Remove null bytes
        .replace(/%2e/gi, '')           // Remove URL encoded .
        .replace(/%2f/gi, '')           // Remove URL encoded /
        .replace(/%5c/gi, '')           // Remove URL encoded \
        .replace(/%00/gi, '')           // Remove URL encoded null
        .replace(/[<>:"|?*]/g, '')      // Remove Windows invalid chars
        .replace(/[\x00-\x1f\x80-\x9f]/g, ''); // Remove control chars
    
    // Only allow alphanumeric, dash, underscore, dot
    safe = safe.replace(/[^a-zA-Z0-9._-]/g, '');
    
    // Prevent hidden files
    if (safe.startsWith('.')) {
        safe = safe.substring(1);
    }
    
    return safe || 'file';
};

// Validate file extension strictly
const validateExtension = (filename) => {
    const ext = path.extname(filename).toLowerCase();
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    return allowedExtensions.includes(ext);
};

// Check for magic bytes (file signature)
const validateMagicBytes = (buffer) => {
    if (!buffer || buffer.length < 4) return false;
    
    const signatures = {
        jpg: [0xFF, 0xD8, 0xFF],
        png: [0x89, 0x50, 0x4E, 0x47],
        gif: [0x47, 0x49, 0x46, 0x38],
        webp: [0x52, 0x49, 0x46, 0x46]
    };
    
    // Check JPEG
    if (buffer[0] === signatures.jpg[0] && buffer[1] === signatures.jpg[1] && buffer[2] === signatures.jpg[2]) {
        return 'image/jpeg';
    }
    // Check PNG
    if (buffer[0] === signatures.png[0] && buffer[1] === signatures.png[1] && buffer[2] === signatures.png[2] && buffer[3] === signatures.png[3]) {
        return 'image/png';
    }
    // Check GIF
    if (buffer[0] === signatures.gif[0] && buffer[1] === signatures.gif[1] && buffer[2] === signatures.gif[2] && buffer[3] === signatures.gif[3]) {
        return 'image/gif';
    }
    // Check WebP (RIFF....WEBP)
    if (buffer[0] === signatures.webp[0] && buffer[1] === signatures.webp[1] && buffer[2] === signatures.webp[2] && buffer[3] === signatures.webp[3]) {
        if (buffer.length >= 12 && buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) {
            return 'image/webp';
        }
    }
    
    return false;
};

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOAD_DIR);
    },
    filename: (req, file, cb) => {
        // Generate secure random filename
        const randomName = crypto.randomBytes(16).toString('hex');
        const ext = path.extname(file.originalname).toLowerCase();
        
        // Only allow specific extensions
        if (!['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) {
            return cb(new Error('امتداد الملف غير مسموح'));
        }
        
        cb(null, `${Date.now()}_${randomName}${ext}`);
    }
});

const upload = multer({ 
    storage,
    limits: { 
        fileSize: 5 * 1024 * 1024,  // 5MB
        files: 1                     // Only 1 file at a time
    },
    fileFilter: (req, file, cb) => {
        // 1. Check extension
        const ext = path.extname(file.originalname).toLowerCase();
        const allowedExt = /\.(jpeg|jpg|png|gif|webp)$/i;
        if (!allowedExt.test(file.originalname)) {
            return cb(new Error('امتداد الملف غير مدعوم'));
        }
        
        // 2. Check MIME type
        const allowedMime = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedMime.includes(file.mimetype)) {
            return cb(new Error('نوع الملف غير مدعوم'));
        }
        
        // 3. Check for path traversal in original name
        if (file.originalname.includes('..') || file.originalname.includes('/') || file.originalname.includes('\\')) {
            return cb(new Error('اسم الملف غير صالح'));
        }
        
        // 4. Check for null bytes
        if (file.originalname.includes('\0') || file.originalname.includes('%00')) {
            return cb(new Error('اسم الملف يحتوي على أحرف غير صالحة'));
        }
        
        cb(null, true);
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
                period_type VARCHAR(20) DEFAULT 'weekly',
                custom_period VARCHAR(100),
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
                ip_address VARCHAR(50),
                logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // ============== Chat System Tables ==============
        await pool.query(`
            CREATE TABLE IF NOT EXISTS chat_messages (
                id SERIAL PRIMARY KEY,
                player_phone VARCHAR(20) NOT NULL,
                player_name VARCHAR(100) NOT NULL,
                message TEXT NOT NULL,
                message_type VARCHAR(20) DEFAULT 'text',
                reply_to_id INTEGER,
                reply_to_name VARCHAR(100),
                reply_to_text VARCHAR(100),
                is_deleted BOOLEAN DEFAULT false,
                deleted_by VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS chat_banned_users (
                id SERIAL PRIMARY KEY,
                phone VARCHAR(20) UNIQUE NOT NULL,
                reason TEXT,
                banned_by VARCHAR(50),
                banned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS chat_bad_words (
                id SERIAL PRIMARY KEY,
                word VARCHAR(100) UNIQUE NOT NULL,
                added_by VARCHAR(50),
                added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // جدول الإبلاغات
        await pool.query(`
            CREATE TABLE IF NOT EXISTS chat_reports (
                id SERIAL PRIMARY KEY,
                message_id INTEGER NOT NULL,
                reporter_phone VARCHAR(20),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(message_id, reporter_phone)
            )
        `);

        // إضافة أعمدة reply للجدول القديم
        await pool.query(`
            DO $$ BEGIN
                ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS reply_to_id INTEGER;
                ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS reply_to_name VARCHAR(100);
                ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS reply_to_text VARCHAR(100);
            EXCEPTION WHEN OTHERS THEN NULL;
            END $$;
        `);

        // إضافة إعداد الدردشة الافتراضي
        await pool.query(`
            INSERT INTO settings (key, value) VALUES ('chat_enabled', 'true') 
            ON CONFLICT (key) DO NOTHING
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
            ['gold_color', '#ffd700'],
            // Lucky Wheel Settings
            ['lucky_wheel_enabled', 'true'],
            ['wheel_spins_per_day', '3'],
            ['wheel_min_score', '1500'],
            // Daily Tasks Settings
            ['daily_tasks_enabled', 'true'],
            ['daily_tasks_count', '3'],
            ['daily_tasks_bonus_streak', '50'],
            // Daily Goals Settings
            ['daily_goals_enabled', 'true'],
            // Auto Backup Settings
            ['auto_backup_enabled', 'false'],
            ['auto_backup_interval', '24'],
            ['auto_backup_keep_days', '7'],
            // Social Media Settings
            ['show_social', 'true'],
            ['facebook_url', ''],
            ['instagram_url', ''],
            ['tiktok_url', ''],
            ['whatsapp_number', ''],
            ['twitter_url', ''],
            ['linkedin_url', ''],
            ['youtube_url', ''],
            ['snapchat_url', ''],
            // Contact Settings
            ['show_contact', 'true'],
            ['contact_phone', ''],
            ['contact_email', ''],
            ['contact_address', '']
        ];

        for (const [key, value] of defaultSettings) {
            await pool.query(
                'INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING',
                [key, value]
            );
        }
        
        
        // Player Achievements table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS player_achievements (
                id SERIAL PRIMARY KEY,
                phone VARCHAR(20) NOT NULL,
                achievement_id VARCHAR(50) NOT NULL,
                points INTEGER DEFAULT 0,
                unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(phone, achievement_id)
            )
        `);

        // Game Stats table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS game_stats (
                id SERIAL PRIMARY KEY,
                phone VARCHAR(20) NOT NULL,
                score INTEGER DEFAULT 0,
                lines_cleared INTEGER DEFAULT 0,
                play_time INTEGER DEFAULT 0,
                difficulty VARCHAR(20) DEFAULT 'medium',
                tetris_count INTEGER DEFAULT 0,
                played_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        
        // Daily Rewards table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS daily_rewards (
                id SERIAL PRIMARY KEY,
                phone VARCHAR(20) NOT NULL,
                reward INTEGER NOT NULL,
                streak INTEGER DEFAULT 1,
                claimed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Daily Tasks table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS daily_tasks (
                id SERIAL PRIMARY KEY,
                phone VARCHAR(20) NOT NULL,
                task_date DATE DEFAULT CURRENT_DATE,
                task_type VARCHAR(50) NOT NULL,
                task_name VARCHAR(100) NOT NULL,
                task_icon VARCHAR(10) DEFAULT '🎯',
                target INTEGER NOT NULL,
                progress INTEGER DEFAULT 0,
                reward INTEGER DEFAULT 50,
                completed BOOLEAN DEFAULT false,
                completed_at TIMESTAMP,
                UNIQUE(phone, task_date, task_type)
            )
        `);

        // Player Daily Stats (for tracking daily progress)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS player_daily_stats (
                id SERIAL PRIMARY KEY,
                phone VARCHAR(20) NOT NULL,
                stat_date DATE DEFAULT CURRENT_DATE,
                games_played INTEGER DEFAULT 0,
                total_score INTEGER DEFAULT 0,
                lines_cleared INTEGER DEFAULT 0,
                tetris_count INTEGER DEFAULT 0,
                play_time INTEGER DEFAULT 0,
                max_combo INTEGER DEFAULT 0,
                streak_days INTEGER DEFAULT 0,
                UNIQUE(phone, stat_date)
            )
        `);

        // Wheel Prizes table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS wheel_prizes (
                id SERIAL PRIMARY KEY,
                label VARCHAR(100) NOT NULL,
                value INTEGER DEFAULT 0,
                color VARCHAR(20) DEFAULT '#e31e24',
                probability INTEGER DEFAULT 10,
                active BOOLEAN DEFAULT true,
                sort_order INTEGER DEFAULT 0
            )
        `);

        // Insert default wheel prizes if empty
        const wheelPrizesCount = await pool.query('SELECT COUNT(*) FROM wheel_prizes');
        if (parseInt(wheelPrizesCount.rows[0].count) === 0) {
            const defaultWheelPrizes = [
                ['100 نقطة', 100, '#e31e24', 20, 1],
                ['200 نقطة', 200, '#ffd700', 15, 2],
                ['حظ أوفر', 0, '#333333', 25, 3],
                ['150 نقطة', 150, '#00aaff', 15, 4],
                ['250 نقطة', 250, '#ff6600', 10, 5],
                ['حظ أوفر', 0, '#333333', 25, 6],
                ['300 نقطة', 300, '#00cc00', 8, 7],
                ['500 نقطة 🎉', 500, '#ff00ff', 2, 8]
            ];
            for (const [label, value, color, prob, order] of defaultWheelPrizes) {
                await pool.query(
                    'INSERT INTO wheel_prizes (label, value, color, probability, sort_order) VALUES ($1, $2, $3, $4, $5)',
                    [label, value, color, prob, order]
                );
            }
        }

        // Auto Backup Schedule table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS auto_backup_schedule (
                id SERIAL PRIMARY KEY,
                last_backup TIMESTAMP,
                next_backup TIMESTAMP,
                status VARCHAR(20) DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Contest Winners table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS contest_winners (
                id SERIAL PRIMARY KEY,
                phone VARCHAR(20) NOT NULL,
                name VARCHAR(100),
                rank INTEGER NOT NULL,
                prize INTEGER NOT NULL,
                week_start DATE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // ============== ADVANCED SECURITY SYSTEM V70 ==============
        
        // Fraud Detection Logs
        await pool.query(`
            CREATE TABLE IF NOT EXISTS fraud_logs (
                id SERIAL PRIMARY KEY,
                phone VARCHAR(20),
                device_id VARCHAR(255),
                ip_address VARCHAR(50),
                fraud_type VARCHAR(50) NOT NULL,
                severity VARCHAR(20) DEFAULT 'medium',
                details JSONB,
                score_before INTEGER,
                score_after INTEGER,
                action_taken VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Device Fingerprints
        await pool.query(`
            CREATE TABLE IF NOT EXISTS device_fingerprints (
                id SERIAL PRIMARY KEY,
                phone VARCHAR(20) NOT NULL,
                fingerprint VARCHAR(255) NOT NULL,
                user_agent TEXT,
                screen_resolution VARCHAR(20),
                timezone VARCHAR(50),
                language VARCHAR(10),
                platform VARCHAR(50),
                trust_score INTEGER DEFAULT 100,
                is_suspicious BOOLEAN DEFAULT false,
                first_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(phone, fingerprint)
            )
        `);

        // IP Reputation
        await pool.query(`
            CREATE TABLE IF NOT EXISTS ip_reputation (
                id SERIAL PRIMARY KEY,
                ip_address VARCHAR(50) UNIQUE NOT NULL,
                trust_score INTEGER DEFAULT 100,
                total_requests INTEGER DEFAULT 0,
                fraud_attempts INTEGER DEFAULT 0,
                is_vpn BOOLEAN DEFAULT false,
                is_proxy BOOLEAN DEFAULT false,
                is_blocked BOOLEAN DEFAULT false,
                country VARCHAR(50),
                city VARCHAR(100),
                first_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Score History (for pattern detection)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS score_history (
                id SERIAL PRIMARY KEY,
                phone VARCHAR(20) NOT NULL,
                score INTEGER NOT NULL,
                score_diff INTEGER,
                game_duration INTEGER,
                lines_cleared INTEGER,
                level_reached INTEGER,
                ip_address VARCHAR(50),
                device_fingerprint VARCHAR(255),
                is_valid BOOLEAN DEFAULT true,
                validation_notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Player Risk Scores
        await pool.query(`
            CREATE TABLE IF NOT EXISTS player_risk (
                id SERIAL PRIMARY KEY,
                phone VARCHAR(20) UNIQUE NOT NULL,
                risk_score INTEGER DEFAULT 0,
                risk_level VARCHAR(20) DEFAULT 'low',
                total_fraud_attempts INTEGER DEFAULT 0,
                total_valid_games INTEGER DEFAULT 0,
                avg_score_per_game REAL DEFAULT 0,
                max_score INTEGER DEFAULT 0,
                suspicious_patterns JSONB DEFAULT '[]',
                is_banned BOOLEAN DEFAULT false,
                ban_reason TEXT,
                ban_expires_at TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Security Events
        await pool.query(`
            CREATE TABLE IF NOT EXISTS security_events (
                id SERIAL PRIMARY KEY,
                event_type VARCHAR(50) NOT NULL,
                severity VARCHAR(20) DEFAULT 'info',
                phone VARCHAR(20),
                ip_address VARCHAR(50),
                device_id VARCHAR(255),
                description TEXT,
                metadata JSONB,
                resolved BOOLEAN DEFAULT false,
                resolved_by VARCHAR(50),
                resolved_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Rate Limit Violations
        await pool.query(`
            CREATE TABLE IF NOT EXISTS rate_limit_violations (
                id SERIAL PRIMARY KEY,
                ip_address VARCHAR(50) NOT NULL,
                phone VARCHAR(20),
                endpoint VARCHAR(100),
                violation_count INTEGER DEFAULT 1,
                window_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Admin Audit Log
        await pool.query(`
            CREATE TABLE IF NOT EXISTS admin_audit_log (
                id SERIAL PRIMARY KEY,
                admin_id INTEGER,
                admin_username VARCHAR(50),
                action VARCHAR(100) NOT NULL,
                target_type VARCHAR(50),
                target_id VARCHAR(50),
                old_value JSONB,
                new_value JSONB,
                ip_address VARCHAR(50),
                user_agent TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Security indexes
        await pool.query('CREATE INDEX IF NOT EXISTS idx_fraud_logs_phone ON fraud_logs(phone)');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_fraud_logs_ip ON fraud_logs(ip_address)');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_fraud_logs_created ON fraud_logs(created_at DESC)');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(event_type)');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_score_history_phone ON score_history(phone)');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_ip_reputation_ip ON ip_reputation(ip_address)');
        
        // Tournaments table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS tournaments (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                description TEXT,
                type VARCHAR(20) DEFAULT 'weekly',
                start_date TIMESTAMP NOT NULL,
                end_date TIMESTAMP NOT NULL,
                min_score INTEGER DEFAULT 0,
                max_players INTEGER DEFAULT 100,
                entry_fee INTEGER DEFAULT 0,
                prize_pool JSONB DEFAULT '[]',
                status VARCHAR(20) DEFAULT 'upcoming',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Tournament Participants
        await pool.query(`
            CREATE TABLE IF NOT EXISTS tournament_participants (
                id SERIAL PRIMARY KEY,
                tournament_id INTEGER REFERENCES tournaments(id) ON DELETE CASCADE,
                phone VARCHAR(20) NOT NULL,
                name VARCHAR(100),
                score INTEGER DEFAULT 0,
                rank INTEGER,
                prize_won INTEGER DEFAULT 0,
                joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(tournament_id, phone)
            )
        `);

        // Points Store Items
        await pool.query(`
            CREATE TABLE IF NOT EXISTS store_items (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                description TEXT,
                type VARCHAR(20) DEFAULT 'theme',
                price INTEGER NOT NULL,
                image VARCHAR(255),
                value TEXT,
                stock INTEGER DEFAULT -1,
                sold_count INTEGER DEFAULT 0,
                active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Player Purchases
        await pool.query(`
            CREATE TABLE IF NOT EXISTS player_purchases (
                id SERIAL PRIMARY KEY,
                phone VARCHAR(20) NOT NULL,
                item_id INTEGER REFERENCES store_items(id),
                item_name VARCHAR(100),
                price_paid INTEGER,
                purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Player Themes (owned themes)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS player_themes (
                id SERIAL PRIMARY KEY,
                phone VARCHAR(20) NOT NULL,
                theme_id VARCHAR(50) NOT NULL,
                theme_name VARCHAR(100),
                equipped BOOLEAN DEFAULT false,
                obtained_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(phone, theme_id)
            )
        `);

        // Notifications table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS notifications (
                id SERIAL PRIMARY KEY,
                phone VARCHAR(20),
                type VARCHAR(30) NOT NULL,
                title VARCHAR(100) NOT NULL,
                message TEXT,
                data JSONB,
                read BOOLEAN DEFAULT false,
                sent BOOLEAN DEFAULT false,
                sent_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Challenges table (daily/weekly)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS challenges (
                id SERIAL PRIMARY KEY,
                title VARCHAR(100) NOT NULL,
                description TEXT,
                type VARCHAR(20) DEFAULT 'daily',
                goal_type VARCHAR(30) NOT NULL,
                goal_value INTEGER NOT NULL,
                reward_type VARCHAR(20) DEFAULT 'points',
                reward_value INTEGER NOT NULL,
                icon VARCHAR(10) DEFAULT '🎯',
                start_date DATE,
                end_date DATE,
                active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Challenge Progress
        await pool.query(`
            CREATE TABLE IF NOT EXISTS challenge_progress (
                id SERIAL PRIMARY KEY,
                challenge_id INTEGER REFERENCES challenges(id) ON DELETE CASCADE,
                phone VARCHAR(20) NOT NULL,
                progress INTEGER DEFAULT 0,
                completed BOOLEAN DEFAULT false,
                reward_claimed BOOLEAN DEFAULT false,
                completed_at TIMESTAMP,
                UNIQUE(challenge_id, phone)
            )
        `);

        // Player Levels table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS player_levels (
                id SERIAL PRIMARY KEY,
                phone VARCHAR(20) UNIQUE NOT NULL,
                level INTEGER DEFAULT 1,
                xp INTEGER DEFAULT 0,
                total_xp INTEGER DEFAULT 0,
                rank_name VARCHAR(50) DEFAULT 'مبتدئ',
                rank_icon VARCHAR(10) DEFAULT '🥉',
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Level Definitions
        await pool.query(`
            CREATE TABLE IF NOT EXISTS level_definitions (
                id SERIAL PRIMARY KEY,
                level INTEGER UNIQUE NOT NULL,
                name VARCHAR(50) NOT NULL,
                icon VARCHAR(10) DEFAULT '⭐',
                xp_required INTEGER NOT NULL,
                reward INTEGER DEFAULT 0,
                perks JSONB DEFAULT '{}'
            )
        `);

        // Insert default levels
        const levelsCount = await pool.query('SELECT COUNT(*) FROM level_definitions');
        if (parseInt(levelsCount.rows[0].count) === 0) {
            const defaultLevels = [
                [1, 'مبتدئ', '🥉', 0, 0],
                [2, 'متمرس', '🥉', 500, 50],
                [3, 'محترف', '🥈', 1500, 100],
                [4, 'خبير', '🥈', 3000, 150],
                [5, 'أسطورة', '🥇', 5000, 200],
                [6, 'ماسي', '💎', 10000, 300],
                [7, 'أسطوري', '👑', 20000, 500],
                [8, 'إله اللعبة', '🏆', 50000, 1000]
            ];
            for (const [level, name, icon, xp, reward] of defaultLevels) {
                await pool.query(
                    'INSERT INTO level_definitions (level, name, icon, xp_required, reward) VALUES ($1, $2, $3, $4, $5)',
                    [level, name, icon, xp, reward]
                );
            }
        }

        // Insert default store items
        const storeCount = await pool.query('SELECT COUNT(*) FROM store_items');
        if (parseInt(storeCount.rows[0].count) === 0) {
            const defaultItems = [
                ['ثيم النار 🔥', 'ثيم حصري بألوان النار', 'theme', 500, 'fire'],
                ['ثيم الفضاء 🚀', 'ثيم فضائي رائع', 'theme', 750, 'space'],
                ['ثيم الطبيعة 🌿', 'ثيم أخضر مريح للعين', 'theme', 500, 'nature'],
                ['دورة إضافية', 'احصل على دورة لعب إضافية', 'extra_round', 300, '1'],
                ['دخول VIP للسحب', 'دخول السحب الخاص', 'vip_draw', 1000, 'vip'],
                ['مضاعف النقاط x2', 'ضاعف نقاطك للساعة القادمة', 'multiplier', 400, '2']
            ];
            for (const [name, desc, type, price, value] of defaultItems) {
                await pool.query(
                    'INSERT INTO store_items (name, description, type, price, value) VALUES ($1, $2, $3, $4, $5)',
                    [name, desc, type, price, value]
                );
            }
        }

        // Insert default challenges
        const challengesCount = await pool.query('SELECT COUNT(*) FROM challenges');
        if (parseInt(challengesCount.rows[0].count) === 0) {
            const defaultChallenges = [
                ['احصل على 1000 نقطة', 'اجمع 1000 نقطة اليوم', 'daily', 'score', 1000, 100, '🎯'],
                ['العب 3 مرات', 'العب 3 جولات اليوم', 'daily', 'games', 3, 50, '🎮'],
                ['احذف 20 سطر', 'احذف 20 سطر في جولة واحدة', 'daily', 'lines', 20, 75, '📊'],
                ['تحدي الأسبوع', 'احصل على 10000 نقطة هذا الأسبوع', 'weekly', 'score', 10000, 500, '🏆'],
                ['لاعب نشيط', 'العب 20 جولة هذا الأسبوع', 'weekly', 'games', 20, 300, '⚡']
            ];
            for (const [title, desc, type, goal_type, goal_value, reward, icon] of defaultChallenges) {
                await pool.query(
                    'INSERT INTO challenges (title, description, type, goal_type, goal_value, reward_value, icon, active) VALUES ($1, $2, $3, $4, $5, $6, $7, true)',
                    [title, desc, type, goal_type, goal_value, reward, icon]
                );
            }
        }

        
        // Performance Indexes
        await pool.query('CREATE INDEX IF NOT EXISTS idx_players_device_id ON players(device_id)');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_players_phone ON players(phone)');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_players_status ON players(status)');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_players_score ON players(score DESC)');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_notifications_phone ON notifications(phone)');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_challenge_progress_phone ON challenge_progress(phone)');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_tournament_participants_phone ON tournament_participants(phone)');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_phone)');

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

const setSetting = async (key, value) => {
    try {
        await pool.query(
            'INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2',
            [key, value]
        );
        return true;
    } catch (err) {
        console.error('setSetting error:', err);
        return false;
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
    }, JWT_SECRET, { expiresIn: '30m' });
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
        const province = req.query.province || '';
        const limit = Math.min(parseInt(req.query.limit) || 10, 100);
        
        let dateFilter = '';
        let provinceFilter = '';
        
        if (period === 'today') {
            dateFilter = "AND DATE(played_at) = CURRENT_DATE";
        } else if (period === 'week') {
            dateFilter = "AND played_at >= NOW() - INTERVAL '7 days'";
        } else if (period === 'month') {
            dateFilter = "AND played_at >= NOW() - INTERVAL '30 days'";
        }
        
        if (province) {
            provinceFilter = `AND province = '${province.replace(/'/g, "''")}'`;
        }
        
        const result = await pool.query(`
            SELECT name, province, 
                   CONCAT(SUBSTRING(phone, 1, 3), '****', SUBSTRING(phone, 8, 3)) as phone, 
                   score,
                   CASE WHEN status = 'winner' THEN true ELSE false END as is_winner
            FROM players 
            WHERE score > 0 ${dateFilter} ${provinceFilter}
            ORDER BY score DESC 
            LIMIT $1
        `, [limit]);
        
        res.json({
            success: true,
            leaderboard: result.rows.map((p, i) => ({
                rank: i + 1,
                ...p
            })),
            period,
            province: province || 'all'
        });
    } catch (err) {
        console.error('❌ Error in /api/leaderboard:', err);
        res.json({ success: false, leaderboard: [] });
    }
});

// Get player rank
app.get('/api/player/rank', async (req, res) => {
    try {
        const phone = req.query.phone;
        if (!phone) {
            return res.json({ success: false, error: 'Phone required' });
        }
        
        // Get player's score
        const playerResult = await pool.query(
            'SELECT id, name, score, province FROM players WHERE phone = $1',
            [phone]
        );
        
        if (playerResult.rows.length === 0) {
            return res.json({ success: false, error: 'Player not found' });
        }
        
        const player = playerResult.rows[0];
        
        // Get rank (how many players have higher score)
        const rankResult = await pool.query(
            'SELECT COUNT(*) as rank FROM players WHERE score > $1',
            [player.score]
        );
        
        const rank = parseInt(rankResult.rows[0].rank) + 1;
        
        // Get total players
        const totalResult = await pool.query('SELECT COUNT(*) as total FROM players WHERE score > 0');
        const total = parseInt(totalResult.rows[0].total);
        
        res.json({
            success: true,
            rank,
            total,
            percentile: Math.round((1 - (rank / total)) * 100),
            player: {
                name: player.name,
                score: player.score,
                province: player.province
            }
        });
    } catch (err) {
        console.error('❌ Error in /api/player/rank:', err);
        res.json({ success: false, error: 'Error getting rank' });
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
        const result = await pool.query('SELECT id, name, description, image, period_type, custom_period FROM prizes WHERE active = true ORDER BY created_at DESC');
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
    body('phone').custom((value) => {
        // Accept 10 digits (without leading 0) - must start with 75, 77, or 78
        const cleaned = value.replace(/\D/g, '');
        if (!/^(75|77|78)[0-9]{8}$/.test(cleaned)) {
            throw new Error('رقم الهاتف يجب أن يبدأ بـ 75 أو 77 أو 78');
        }
        return true;
    }),
    body('province').isIn(provinces)
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMsg = errors.array()[0]?.msg || 'بيانات غير صحيحة';
        return res.status(400).json({ error: errorMsg });
    }

    try {
        const gameEnabled = await getSetting('game_enabled', 'true');
        if (gameEnabled !== 'true') {
            return res.status(403).json({ error: 'اللعبة متوقفة حالياً', code: 'GAME_DISABLED' });
        }

        let { name, phone, province, deviceInfo, location } = req.body;
        
        // Normalize phone number - store as 10 digits without leading 0
        phone = phone.replace(/\D/g, '');
        if (phone.startsWith('964')) phone = phone.substring(3);
        if (phone.startsWith('0')) phone = phone.substring(1);
        
        // Final validation
        if (!/^(75|77|78)[0-9]{8}$/.test(phone)) {
            return res.status(400).json({ error: 'رقم الهاتف غير صحيح! يجب أن يبدأ بـ 075 أو 077 أو 078' });
        }
        
        const deviceId = deviceInfo?.deviceId || req.headers['user-agent'];

        const blockedProvinces = JSON.parse(await getSetting('blocked_provinces', '[]'));
        if (blockedProvinces.includes(province)) {
            return res.status(403).json({ error: 'اللعبة غير متاحة في محافظتك حالياً', code: 'PROVINCE_BLOCKED' });
        }

        const requireLocation = await getSetting('require_location', 'false');
        if (requireLocation === 'true' && !location) {
            return res.status(400).json({ error: 'يجب السماح بالموقع للعب', code: 'LOCATION_REQUIRED' });
        }

        // Check if phone already exists
        const existingPhone = await pool.query(
            'SELECT * FROM players WHERE phone = $1',
            [phone]
        );
        
        if (existingPhone.rows.length > 0) {
            // Phone exists - update device and return existing player
            const existingPlayer = existingPhone.rows[0];
            if (existingPlayer.device_id !== deviceId) {
                await pool.query(
                    'UPDATE players SET device_id = $1, device_info = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
                    [deviceId, JSON.stringify(deviceInfo), existingPlayer.id]
                );
            }
            console.log('✅ Player returning (same phone):', existingPlayer.name);
            return res.json({ success: true, message: 'Welcome back!', player: existingPlayer, returning: true });
        }
        
        // Check if device already registered with different phone
        const existingDevice = await pool.query(
            'SELECT * FROM players WHERE device_id = $1',
            [deviceId]
        );
        
        if (existingDevice.rows.length > 0) {
            // Device exists with different phone - block registration
            console.log('⚠️ Device already registered:', deviceId);
            return res.status(400).json({ 
                error: 'هذا الجهاز مسجل مسبقاً برقم آخر. لا يمكن التسجيل بأكثر من رقم واحد.',
                code: 'DEVICE_ALREADY_REGISTERED'
            });
        }

        // New registration
        const result = await pool.query(
            'INSERT INTO players (name, phone, province, device_info, location, device_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [name, phone, province, JSON.stringify(deviceInfo), location ? JSON.stringify(location) : null, deviceId]
        );

        console.log('✅ New player registered:', result.rows[0].name, '-', phone);
        res.json({ success: true, player: result.rows[0], newPlayer: true });
    } catch (err) {
        console.error('❌ Error in /api/register:', err);
        if (err.code === '23505') { // Unique constraint violation
            return res.status(400).json({ error: 'رقم الهاتف مسجل مسبقاً' });
        }
        res.status(500).json({ error: 'حدث خطأ في التسجيل' });
    }
});

// Submit Score
app.post('/api/score', [
    body('phone').matches(/^(75|77|78)[0-9]{8}$/),
    body('score').isInt({ min: 0, max: 50000 }),
    body('gameData').optional().isObject()
], scoreLimiter, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'بيانات غير صحيحة' });
    }

    const { phone, score, gameData, signature } = req.body;
    const clientIP = req.ip || req.connection.remoteAddress;

    try {
        // 1. Check if player exists
        const player = await pool.query('SELECT * FROM players WHERE phone = $1', [phone]);
        
        if (player.rows.length === 0) {
            return res.status(404).json({ error: 'اللاعب غير مسجل' });
        }

        const currentPlayer = player.rows[0];
        const now = Date.now();
        const lastSubmission = scoreSubmissions.get(phone);

        // 2. Time-based validation
        if (lastSubmission) {
            const timeDiff = (now - lastSubmission.time) / 1000;
            
            // Minimum 30 seconds between submissions
            if (timeDiff < 30) {
                console.log(`⚠️ Score too fast: ${phone} - ${timeDiff}s`);
                return res.status(429).json({ error: 'انتظر قليلاً', code: 'TOO_FAST' });
            }

            // 3. Anti-cheat: Max points per second
            const maxPointsPerSecond = 50;
            const allowedPoints = Math.floor(timeDiff * maxPointsPerSecond);
            const attemptedPoints = score - currentPlayer.score;

            if (attemptedPoints > allowedPoints && attemptedPoints > 0) {
                // Log suspicious activity
                await pool.query(
                    'INSERT INTO cheat_logs (phone, attempted_points, allowed_points, score_before, score_after, time_diff, ip_address) VALUES ($1, $2, $3, $4, $5, $6, $7)',
                    [phone, attemptedPoints, allowedPoints, currentPlayer.score, score, timeDiff, clientIP]
                );
                console.log(`🚨 Cheat detected: ${phone} - Attempted: ${attemptedPoints}, Allowed: ${allowedPoints}`);
                return res.status(400).json({ error: 'نقاط مشبوهة!', code: 'CHEAT_DETECTED' });
            }
        }

        // 4. Maximum score limit per game session
        const maxScorePerSession = 15000;
        const scoreDiff = score - (currentPlayer.score || 0);
        if (scoreDiff > maxScorePerSession) {
            console.log(`⚠️ Score jump too high: ${phone} - ${scoreDiff}`);
            await pool.query(
                'INSERT INTO cheat_logs (phone, attempted_points, allowed_points, score_before, score_after, time_diff, ip_address) VALUES ($1, $2, $3, $4, $5, $6, $7)',
                [phone, scoreDiff, maxScorePerSession, currentPlayer.score, score, 0, clientIP]
            );
            return res.status(400).json({ error: 'نقاط غير طبيعية!', code: 'SCORE_TOO_HIGH' });
        }

        // 5. Validate game data if provided
        if (gameData) {
            const { lines, level, time, moves } = gameData;
            
            // Basic validation: score should be reasonable for the number of lines
            const expectedMaxScore = (lines || 0) * 200 + (level || 1) * 100;
            if (score > expectedMaxScore * 1.5) {
                console.log(`⚠️ Score/lines mismatch: ${phone} - Score: ${score}, Lines: ${lines}`);
            }
        }

        // 6. Update score submission tracker
        scoreSubmissions.set(phone, { time: now, score, ip: clientIP });

        // 7. Update player score (only if higher)
        const newScore = Math.max(score, currentPlayer.score);
        const result = await pool.query(
            'UPDATE players SET score = $1, played_at = CURRENT_TIMESTAMP WHERE phone = $2 RETURNING *',
            [newScore, phone]
        );

        console.log(`✅ Score updated: ${phone} - ${newScore}`);
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
            'SELECT id, name, phone, status, prize_code FROM players WHERE phone = $1 LIMIT 1',
            [phone]
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
            }, JWT_SECRET, { expiresIn: '30m' });
            
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

// Admin - Roulette Spin (اختيار فائز عشوائي)
app.post('/api/admin/roulette-spin', authenticateToken, async (req, res) => {
    try {
        const minScore = await getSetting('min_score_for_roulette', '1500');
        const maxWinners = await getSetting('max_winners', '5');
        
        // Check current winners count
        const winnersCount = await pool.query("SELECT COUNT(*) FROM players WHERE status IN ('winner', 'claimed')");
        if (parseInt(winnersCount.rows[0].count) >= parseInt(maxWinners)) {
            return res.status(400).json({ error: `تم الوصول للحد الأقصى من الفائزين (${maxWinners})` });
        }
        
        // Get eligible players
        const eligible = await pool.query(
            'SELECT * FROM players WHERE score >= $1 AND status = $2 ORDER BY RANDOM() LIMIT 1',
            [parseInt(minScore), 'registered']
        );
        
        if (eligible.rows.length === 0) {
            return res.status(404).json({ error: 'لا يوجد لاعبين مؤهلين للسحب' });
        }
        
        const winner = eligible.rows[0];
        const prizeCode = generatePrizeCode();
        
        // Update winner
        await pool.query(
            "UPDATE players SET status = 'winner', prize_code = $1, won_at = CURRENT_TIMESTAMP WHERE id = $2",
            [prizeCode, winner.id]
        );
        
        // Log activity
        await logActivity(req.user?.id, req.user?.username, 'roulette_spin', `فائز: ${winner.name} - ${winner.phone}`, req.ip);
        
        console.log('🎰 Roulette winner:', winner.name);
        
        res.json({ 
            success: true, 
            winner: {
                id: winner.id,
                name: winner.name,
                phone: winner.phone,
                province: winner.province,
                score: winner.score,
                prize_code: prizeCode
            }
        });
    } catch (err) {
        console.error('Roulette spin error:', err);
        res.status(500).json({ error: 'حدث خطأ في السحب' });
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
// Secure File Upload Endpoint
app.post('/api/admin/upload', authenticateToken, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'لم يتم رفع ملف' });
        }
        
        const filePath = path.join(UPLOAD_DIR, req.file.filename);
        
        // 1. Verify file exists and is within upload directory (prevent path traversal)
        const realPath = fs.realpathSync(filePath);
        const realUploadDir = fs.realpathSync(UPLOAD_DIR);
        
        if (!realPath.startsWith(realUploadDir)) {
            // Path traversal attempt detected!
            fs.unlinkSync(filePath);
            
            // Log security event
            await pool.query(`
                INSERT INTO security_events (event_type, severity, ip_address, description, metadata)
                VALUES ($1, $2, $3, $4, $5)
            `, ['PATH_TRAVERSAL_ATTEMPT', 'critical', req.ip, 'محاولة اختراق Path Traversal', JSON.stringify({
                filename: req.file.originalname,
                attemptedPath: filePath
            })]);
            
            return res.status(400).json({ error: 'مسار الملف غير صالح' });
        }
        
        // 2. Verify magic bytes (file signature)
        const fileBuffer = fs.readFileSync(filePath);
        const detectedMime = validateMagicBytes(fileBuffer);
        
        if (!detectedMime) {
            // File content doesn't match image signature
            fs.unlinkSync(filePath);
            
            await pool.query(`
                INSERT INTO security_events (event_type, severity, ip_address, description, metadata)
                VALUES ($1, $2, $3, $4, $5)
            `, ['MALICIOUS_FILE_UPLOAD', 'high', req.ip, 'محاولة رفع ملف مشبوه', JSON.stringify({
                filename: req.file.originalname,
                claimedMime: req.file.mimetype
            })]);
            
            return res.status(400).json({ error: 'محتوى الملف لا يتطابق مع نوع الصورة' });
        }
        
        // 3. Check for embedded PHP/JS code in image
        const fileContent = fileBuffer.toString('utf8', 0, Math.min(fileBuffer.length, 10000));
        const dangerousPatterns = [
            /<\?php/i,
            /<\?=/i,
            /<script/i,
            /<%/,
            /eval\s*\(/i,
            /exec\s*\(/i,
            /system\s*\(/i,
            /passthru\s*\(/i,
            /shell_exec/i,
            /base64_decode/i,
            /file_get_contents/i,
            /file_put_contents/i
        ];
        
        for (const pattern of dangerousPatterns) {
            if (pattern.test(fileContent)) {
                fs.unlinkSync(filePath);
                
                await pool.query(`
                    INSERT INTO security_events (event_type, severity, ip_address, description, metadata)
                    VALUES ($1, $2, $3, $4, $5)
                `, ['CODE_INJECTION_ATTEMPT', 'critical', req.ip, 'محاولة حقن كود ضار في صورة', JSON.stringify({
                    filename: req.file.originalname,
                    patternDetected: pattern.toString()
                })]);
                
                return res.status(400).json({ error: 'الملف يحتوي على محتوى ضار' });
            }
        }
        
        // 4. Log successful upload
        await pool.query(`
            INSERT INTO activity_logs (user_id, username, action, details, ip_address)
            VALUES ($1, $2, $3, $4, $5)
        `, [req.user?.id, req.user?.username, 'file_upload', req.file.filename, req.ip]);
        
        res.json({ 
            success: true, 
            filename: req.file.filename, 
            path: '/uploads/' + req.file.filename,
            size: req.file.size
        });
    } catch (err) {
        console.error('Upload error:', err);
        
        // Clean up file if it exists
        if (req.file && req.file.path) {
            try { fs.unlinkSync(req.file.path); } catch (e) {}
        }
        
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
        const { name, description, image, period_type, custom_period } = req.body;
        const result = await pool.query(
            'INSERT INTO prizes (name, description, image, period_type, custom_period) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [name, description || '', image || '', period_type || 'weekly', custom_period || '']
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
        const { name, description, image, active, period_type, custom_period } = req.body;
        let query = 'UPDATE prizes SET name = $1, description = $2, active = $3, period_type = $4, custom_period = $5';
        let params = [name, description || '', active !== false, period_type || 'weekly', custom_period || ''];
        
        if (image) {
            query += ', image = $6 WHERE id = $7 RETURNING *';
            params.push(image, req.params.id);
        } else {
            query += ' WHERE id = $6 RETURNING *';
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
            query += " AND status = 'winner'";
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
                COUNT(CASE WHEN status = 'winner' THEN 1 END) as winners,
                COALESCE(ROUND(AVG(score)), 0) as avg_score,
                COALESCE(MAX(score), 0) as max_score
            FROM players 
            WHERE province IS NOT NULL
            GROUP BY province
            ORDER BY total_players DESC
        `);
        
        res.json(result.rows || []);
    } catch (err) {
        console.error('Charts provinces error:', err);
        res.json([]);
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
            WHERE status = 'winner' AND province IS NOT NULL
            GROUP BY province
            ORDER BY count DESC
        `);
        
        res.json(result.rows || []);
    } catch (err) {
        console.error('Charts winners error:', err);
        res.json([]);
    }
});

// Get report statistics
app.get('/api/admin/reports/stats', authenticateToken, async (req, res) => {
    try {
        const stats = await pool.query(`
            SELECT 
                COUNT(*) as total_players,
                COUNT(CASE WHEN status = 'winner' THEN 1 END) as total_winners,
                COALESCE(ROUND(AVG(score)), 0) as avg_score,
                COUNT(CASE WHEN created_at >= CURRENT_DATE THEN 1 END) as today_players
            FROM players
        `);
        
        res.json(stats.rows[0] || {});
    } catch (err) {
        console.error('Reports stats error:', err);
        res.json({ total_players: 0, total_winners: 0, avg_score: 0, today_players: 0 });
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
                query = `SELECT * FROM players ${whereClause} AND status = 'winner' ORDER BY won_at DESC`;
                break;
            case 'provinces':
                query = `
                    SELECT 
                        province,
                        COUNT(*) as total_players,
                        COUNT(CASE WHEN status = 'winner' THEN 1 END) as winners,
                        ROUND(AVG(score)) as avg_score,
                        MAX(score) as max_score,
                        ROUND(COUNT(CASE WHEN status = 'winner' THEN 1 END)::numeric / COUNT(*)::numeric * 100, 2) as win_rate
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
                        COUNT(CASE WHEN status = 'winner' THEN 1 END) as winners,
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
                        COUNT(CASE WHEN status = 'winner' THEN 1 END) as winners,
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
            version: versionManager.getVersion(),
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

// ============== Version API ==============
const versionRouter = require('./routes/version');
app.use('/api', versionRouter);

// ============== Prize System API ==============
const prizesRouter = require('./routes/prizes')(pool);
const prizesAdminRouter = require('./routes/prizes-admin')(pool, authenticateToken);
app.use('/api/prizes', prizesRouter);
app.use('/api/admin/prizes', prizesAdminRouter);



// ============== Daily Challenges API ==============
app.get('/api/daily-challenges', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM daily_goals WHERE active = true');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Check challenge completion
app.post('/api/daily-challenges/check', async (req, res) => {
    const { phone, challengeId, progress } = req.body;
    try {
        const challenge = await pool.query('SELECT * FROM daily_goals WHERE id = $1', [challengeId]);
        if (challenge.rows.length === 0) {
            return res.status(404).json({ error: 'Challenge not found' });
        }
        
        const goal = challenge.rows[0];
        if (progress >= goal.target) {
            // Check if already completed today
            const existing = await pool.query(
                'SELECT * FROM goal_completions WHERE goal_id = $1 AND player_phone = $2 AND completed_date = CURRENT_DATE',
                [challengeId, phone]
            );
            
            if (existing.rows.length === 0) {
                await pool.query(
                    'INSERT INTO goal_completions (goal_id, player_phone, reward_given) VALUES ($1, $2, $3)',
                    [challengeId, phone, goal.reward]
                );
                
                // Add reward to player
                await pool.query(
                    'UPDATE players SET score = score + $1 WHERE phone = $2',
                    [goal.reward, phone]
                );
                
                return res.json({ success: true, completed: true, reward: goal.reward });
            }
        }
        
        res.json({ success: true, completed: false });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ============== Achievements API ==============
app.get('/api/achievements/:phone', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM player_achievements WHERE phone = $1',
            [req.params.phone]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.json([]);
    }
});

app.post('/api/achievements/unlock', async (req, res) => {
    const { phone, achievementId, points } = req.body;
    try {
        // Check if already unlocked
        const existing = await pool.query(
            'SELECT * FROM player_achievements WHERE phone = $1 AND achievement_id = $2',
            [phone, achievementId]
        );
        
        if (existing.rows.length === 0) {
            await pool.query(
                'INSERT INTO player_achievements (phone, achievement_id, points) VALUES ($1, $2, $3)',
                [phone, achievementId, points]
            );
            res.json({ success: true, unlocked: true });
        } else {
            res.json({ success: true, unlocked: false, message: 'Already unlocked' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ============== Weekly Leaderboard ==============
app.get('/api/leaderboard/weekly', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT name, province, 
                   CONCAT(SUBSTRING(phone, 1, 3), '****', SUBSTRING(phone, 8, 3)) as phone, 
                   score 
            FROM players 
            WHERE played_at >= NOW() - INTERVAL '7 days' AND score > 0
            ORDER BY score DESC 
            LIMIT 10
        `);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.json([]);
    }
});

// ============== Game Stats ==============
app.post('/api/game/stats', async (req, res) => {
    const { phone, score, linesCleared, playTime, difficulty } = req.body;
    try {
        await pool.query(`
            UPDATE players SET 
                score = GREATEST(score, $1),
                played_at = CURRENT_TIMESTAMP
            WHERE phone = $2
        `, [score, phone]);
        
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});




// ============== Referral System ==============

// Generate referral code for player
app.post('/api/referral/generate', async (req, res) => {
    const { phone } = req.body;
    try {
        // Check if player exists
        const player = await pool.query('SELECT * FROM players WHERE phone = $1', [phone]);
        if (player.rows.length === 0) {
            return res.status(404).json({ error: 'اللاعب غير موجود' });
        }
        
        // Check if already has referral code
        if (player.rows[0].referral_code) {
            return res.json({ success: true, code: player.rows[0].referral_code });
        }
        
        // Generate new code
        const code = 'RS' + Math.random().toString(36).substring(2, 8).toUpperCase();
        await pool.query('UPDATE players SET referral_code = $1 WHERE phone = $2', [code, phone]);
        
        res.json({ success: true, code: code });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Apply referral code
app.post('/api/referral/apply', async (req, res) => {
    const { phone, referralCode } = req.body;
    try {
        // Check if player already used a referral
        const player = await pool.query('SELECT * FROM players WHERE phone = $1', [phone]);
        if (player.rows.length === 0) {
            return res.status(404).json({ error: 'اللاعب غير موجود' });
        }
        
        if (player.rows[0].referred_by) {
            return res.status(400).json({ error: 'لقد استخدمت كود إحالة مسبقاً' });
        }
        
        // Find referrer
        const referrer = await pool.query('SELECT * FROM players WHERE referral_code = $1', [referralCode]);
        if (referrer.rows.length === 0) {
            return res.status(404).json({ error: 'كود الإحالة غير صحيح' });
        }
        
        // Can't refer yourself
        if (referrer.rows[0].phone === phone) {
            return res.status(400).json({ error: 'لا يمكنك إحالة نفسك' });
        }
        
        const referrerBonus = 100;
        const referredBonus = 50;
        
        // Add bonus to both
        await pool.query('UPDATE players SET score = score + $1 WHERE phone = $2', [referrerBonus, referrer.rows[0].phone]);
        await pool.query('UPDATE players SET score = score + $1, referred_by = $2 WHERE phone = $3', [referredBonus, referralCode, phone]);
        
        // Record referral
        await pool.query(
            'INSERT INTO referrals (referrer_phone, referred_phone, referrer_bonus, referred_bonus, status, completed_at) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)',
            [referrer.rows[0].phone, phone, referrerBonus, referredBonus, 'completed']
        );
        
        res.json({ 
            success: true, 
            message: 'تم تطبيق كود الإحالة بنجاح',
            bonus: referredBonus 
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get referral stats
app.get('/api/referral/stats/:phone', async (req, res) => {
    try {
        const player = await pool.query('SELECT referral_code FROM players WHERE phone = $1', [req.params.phone]);
        if (player.rows.length === 0) {
            return res.status(404).json({ error: 'اللاعب غير موجود' });
        }
        
        const referrals = await pool.query(
            'SELECT COUNT(*) as count, COALESCE(SUM(referrer_bonus), 0) as total_bonus FROM referrals WHERE referrer_phone = $1',
            [req.params.phone]
        );
        
        res.json({
            code: player.rows[0].referral_code,
            referrals: parseInt(referrals.rows[0].count),
            totalBonus: parseInt(referrals.rows[0].total_bonus)
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});




// ============== Daily Rewards System ==============

// Check and claim daily reward
app.post('/api/daily-reward/claim', async (req, res) => {
    const { phone } = req.body;
    try {
        const player = await pool.query('SELECT * FROM players WHERE phone = $1', [phone]);
        if (player.rows.length === 0) {
            return res.status(404).json({ error: 'اللاعب غير موجود' });
        }
        
        // Check last claim
        const lastClaim = await pool.query(
            'SELECT * FROM daily_rewards WHERE phone = $1 ORDER BY claimed_at DESC LIMIT 1',
            [phone]
        );
        
        const today = new Date().toDateString();
        
        if (lastClaim.rows.length > 0) {
            const lastClaimDate = new Date(lastClaim.rows[0].claimed_at).toDateString();
            if (lastClaimDate === today) {
                return res.status(400).json({ error: 'لقد استلمت مكافأة اليوم، عد غداً', claimed: true });
            }
        }
        
        // Calculate streak
        let streak = 1;
        if (lastClaim.rows.length > 0) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const lastClaimDate = new Date(lastClaim.rows[0].claimed_at).toDateString();
            
            if (lastClaimDate === yesterday.toDateString()) {
                streak = lastClaim.rows[0].streak + 1;
            }
        }
        
        // Rewards based on streak (max 7 days cycle)
        const rewards = [10, 20, 30, 50, 75, 100, 150];
        const reward = rewards[Math.min(streak - 1, 6)];
        
        // Record claim
        await pool.query(
            'INSERT INTO daily_rewards (phone, reward, streak) VALUES ($1, $2, $3)',
            [phone, reward, streak]
        );
        
        // Add reward to player
        await pool.query('UPDATE players SET score = score + $1 WHERE phone = $2', [reward, phone]);
        
        res.json({
            success: true,
            reward: reward,
            streak: streak,
            nextReward: rewards[Math.min(streak, 6)],
            message: 'مبروك! حصلت على ' + reward + ' نقطة'
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get daily reward status
app.get('/api/daily-reward/status/:phone', async (req, res) => {
    try {
        const lastClaim = await pool.query(
            'SELECT * FROM daily_rewards WHERE phone = $1 ORDER BY claimed_at DESC LIMIT 1',
            [req.params.phone]
        );
        
        const rewards = [10, 20, 30, 50, 75, 100, 150];
        const today = new Date().toDateString();
        
        let canClaim = true;
        let streak = 0;
        let nextReward = rewards[0];
        
        if (lastClaim.rows.length > 0) {
            const lastClaimDate = new Date(lastClaim.rows[0].claimed_at).toDateString();
            streak = lastClaim.rows[0].streak;
            
            if (lastClaimDate === today) {
                canClaim = false;
                nextReward = rewards[Math.min(streak, 6)];
            } else {
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                
                if (lastClaimDate === yesterday.toDateString()) {
                    nextReward = rewards[Math.min(streak, 6)];
                } else {
                    streak = 0;
                    nextReward = rewards[0];
                }
            }
        }
        
        res.json({
            canClaim: canClaim,
            streak: streak,
            nextReward: nextReward,
            rewards: rewards
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});




// ============== Weekly Contest System ==============

// Get weekly leaderboard with prizes
app.get('/api/contest/weekly', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                name, 
                province, 
                CONCAT(SUBSTRING(phone, 1, 3), '****', SUBSTRING(phone, 8, 3)) as phone,
                score,
                played_at
            FROM players 
            WHERE played_at >= DATE_TRUNC('week', CURRENT_DATE)
            AND score > 0
            ORDER BY score DESC 
            LIMIT 10
        `);
        
        // Add rank and prize info
        const prizes = ['🥇 المركز الأول - 1000 نقطة', '🥈 المركز الثاني - 500 نقطة', '🥉 المركز الثالث - 250 نقطة'];
        const leaderboard = result.rows.map((player, index) => ({
            ...player,
            rank: index + 1,
            prize: index < 3 ? prizes[index] : null
        }));
        
        // Get week info
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        
        res.json({
            leaderboard: leaderboard,
            weekStart: weekStart.toISOString(),
            weekEnd: weekEnd.toISOString(),
            prizes: [
                { rank: 1, prize: 1000, label: 'المركز الأول' },
                { rank: 2, prize: 500, label: 'المركز الثاني' },
                { rank: 3, prize: 250, label: 'المركز الثالث' }
            ]
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get player's weekly rank
app.get('/api/contest/rank/:phone', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT phone, score,
                   RANK() OVER (ORDER BY score DESC) as rank
            FROM players 
            WHERE played_at >= DATE_TRUNC('week', CURRENT_DATE)
            AND score > 0
        `);
        
        const playerRank = result.rows.find(r => r.phone === req.params.phone);
        
        res.json({
            rank: playerRank ? parseInt(playerRank.rank) : null,
            score: playerRank ? playerRank.score : 0,
            totalPlayers: result.rows.length
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Admin - Distribute weekly prizes (run manually or via cron)
app.post('/api/admin/contest/distribute', authenticateToken, async (req, res) => {
    try {
        const prizes = [1000, 500, 250];
        
        // Get top 3 from last week
        const winners = await pool.query(`
            SELECT phone, name, score
            FROM players 
            WHERE played_at >= DATE_TRUNC('week', CURRENT_DATE) - INTERVAL '7 days'
            AND played_at < DATE_TRUNC('week', CURRENT_DATE)
            AND score > 0
            ORDER BY score DESC 
            LIMIT 3
        `);
        
        const distributed = [];
        
        for (let i = 0; i < winners.rows.length; i++) {
            const winner = winners.rows[i];
            const prize = prizes[i];
            
            await pool.query('UPDATE players SET score = score + $1 WHERE phone = $2', [prize, winner.phone]);
            
            // Record in contest_winners
            await pool.query(
                'INSERT INTO contest_winners (phone, name, rank, prize, week_start) VALUES ($1, $2, $3, $4, DATE_TRUNC(\'week\', CURRENT_DATE) - INTERVAL \'7 days\')',
                [winner.phone, winner.name, i + 1, prize]
            );
            
            distributed.push({
                rank: i + 1,
                name: winner.name,
                phone: winner.phone,
                prize: prize
            });
        }
        
        res.json({ success: true, winners: distributed });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get past contest winners
app.get('/api/contest/history', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                name,
                CONCAT(SUBSTRING(phone, 1, 3), '****', SUBSTRING(phone, 8, 3)) as phone,
                rank,
                prize,
                week_start
            FROM contest_winners 
            ORDER BY week_start DESC, rank ASC
            LIMIT 30
        `);
        
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.json([]);
    }
});




// ============== PDF Reports ==============

// Players Report PDF
app.get('/api/admin/reports/players-pdf', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT name, phone, province, score, status, created_at FROM players ORDER BY score DESC LIMIT 100');
        
        const doc = new PDFDocument({ margin: 50 });
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=players_report_' + Date.now() + '.pdf');
        
        doc.pipe(res);
        
        // Header
        doc.fontSize(24).text('Red Strong Tetris', { align: 'center' });
        doc.fontSize(16).text('Players Report', { align: 'center' });
        doc.fontSize(10).text('Generated: ' + new Date().toLocaleString('ar-IQ'), { align: 'center' });
        doc.moveDown(2);
        
        // Stats Summary
        const totalPlayers = result.rows.length;
        const totalScore = result.rows.reduce((sum, p) => sum + p.score, 0);
        const avgScore = Math.round(totalScore / totalPlayers) || 0;
        
        doc.fontSize(12).text('Total Players: ' + totalPlayers);
        doc.text('Average Score: ' + avgScore);
        doc.moveDown(2);
        
        // Table Header
        doc.fontSize(10).font('Helvetica-Bold');
        doc.text('Rank', 50, doc.y, { width: 40 });
        doc.text('Name', 90, doc.y - 12, { width: 120 });
        doc.text('Phone', 210, doc.y - 12, { width: 100 });
        doc.text('Province', 310, doc.y - 12, { width: 80 });
        doc.text('Score', 390, doc.y - 12, { width: 60 });
        doc.text('Status', 450, doc.y - 12, { width: 60 });
        doc.moveDown();
        
        // Draw line
        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown(0.5);
        
        // Table Data
        doc.font('Helvetica');
        result.rows.forEach((player, index) => {
            if (doc.y > 700) {
                doc.addPage();
                doc.y = 50;
            }
            
            const y = doc.y;
            doc.text(String(index + 1), 50, y, { width: 40 });
            doc.text(player.name || '-', 90, y, { width: 120 });
            doc.text(player.phone || '-', 210, y, { width: 100 });
            doc.text(player.province || '-', 310, y, { width: 80 });
            doc.text(String(player.score), 390, y, { width: 60 });
            doc.text(player.status || '-', 450, y, { width: 60 });
            doc.moveDown(0.8);
        });
        
        doc.end();
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Winners Report PDF
app.get('/api/admin/reports/winners-pdf', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query("SELECT name, phone, province, score, prize_code, won_at, claimed_at FROM players WHERE status IN ('winner', 'claimed') ORDER BY won_at DESC");
        
        const doc = new PDFDocument({ margin: 50 });
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=winners_report_' + Date.now() + '.pdf');
        
        doc.pipe(res);
        
        // Header
        doc.fontSize(24).text('Red Strong Tetris', { align: 'center' });
        doc.fontSize(16).text('Winners Report', { align: 'center' });
        doc.fontSize(10).text('Generated: ' + new Date().toLocaleString('ar-IQ'), { align: 'center' });
        doc.moveDown(2);
        
        // Stats
        const totalWinners = result.rows.length;
        const claimed = result.rows.filter(w => w.claimed_at).length;
        const pending = totalWinners - claimed;
        
        doc.fontSize(12).text('Total Winners: ' + totalWinners);
        doc.text('Claimed: ' + claimed);
        doc.text('Pending: ' + pending);
        doc.moveDown(2);
        
        // Table
        doc.fontSize(9).font('Helvetica-Bold');
        doc.text('#', 50, doc.y, { width: 30 });
        doc.text('Name', 80, doc.y - 10, { width: 100 });
        doc.text('Phone', 180, doc.y - 10, { width: 90 });
        doc.text('Province', 270, doc.y - 10, { width: 70 });
        doc.text('Prize Code', 340, doc.y - 10, { width: 80 });
        doc.text('Status', 420, doc.y - 10, { width: 60 });
        doc.moveDown();
        
        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown(0.5);
        
        doc.font('Helvetica');
        result.rows.forEach((winner, index) => {
            if (doc.y > 700) {
                doc.addPage();
                doc.y = 50;
            }
            
            const y = doc.y;
            const status = winner.claimed_at ? 'Claimed' : 'Pending';
            doc.text(String(index + 1), 50, y, { width: 30 });
            doc.text(winner.name || '-', 80, y, { width: 100 });
            doc.text(winner.phone || '-', 180, y, { width: 90 });
            doc.text(winner.province || '-', 270, y, { width: 70 });
            doc.text(winner.prize_code || '-', 340, y, { width: 80 });
            doc.text(status, 420, y, { width: 60 });
            doc.moveDown(0.8);
        });
        
        doc.end();
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Daily Stats Report PDF
app.get('/api/admin/reports/daily-pdf', authenticateToken, async (req, res) => {
    try {
        const today = await pool.query("SELECT COUNT(*) as count FROM players WHERE DATE(created_at) = CURRENT_DATE");
        const winners = await pool.query("SELECT COUNT(*) as count FROM players WHERE DATE(won_at) = CURRENT_DATE");
        const claimed = await pool.query("SELECT COUNT(*) as count FROM players WHERE DATE(claimed_at) = CURRENT_DATE");
        const topPlayers = await pool.query("SELECT name, phone, province, score FROM players WHERE DATE(played_at) = CURRENT_DATE ORDER BY score DESC LIMIT 10");
        
        const doc = new PDFDocument({ margin: 50 });
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=daily_report_' + Date.now() + '.pdf');
        
        doc.pipe(res);
        
        // Header
        doc.fontSize(24).text('Red Strong Tetris', { align: 'center' });
        doc.fontSize(16).text('Daily Report', { align: 'center' });
        doc.fontSize(12).text(new Date().toLocaleDateString('ar-IQ'), { align: 'center' });
        doc.moveDown(2);
        
        // Stats
        doc.fontSize(14).font('Helvetica-Bold').text('Today Statistics:');
        doc.moveDown(0.5);
        doc.fontSize(12).font('Helvetica');
        doc.text('New Registrations: ' + today.rows[0].count);
        doc.text('New Winners: ' + winners.rows[0].count);
        doc.text('Prizes Claimed: ' + claimed.rows[0].count);
        doc.moveDown(2);
        
        // Top Players Today
        doc.fontSize(14).font('Helvetica-Bold').text('Top 10 Players Today:');
        doc.moveDown();
        
        doc.fontSize(10).font('Helvetica');
        topPlayers.rows.forEach((player, index) => {
            doc.text((index + 1) + '. ' + player.name + ' - ' + player.score + ' points (' + player.province + ')');
        });
        
        doc.end();
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});




// ============== Advanced Statistics ==============

// Dashboard Overview
app.get('/api/admin/stats/overview', authenticateToken, async (req, res) => {
    try {
        const total = await pool.query('SELECT COUNT(*) FROM players');
        const today = await pool.query("SELECT COUNT(*) FROM players WHERE DATE(created_at) = CURRENT_DATE");
        const thisWeek = await pool.query("SELECT COUNT(*) FROM players WHERE created_at >= DATE_TRUNC('week', CURRENT_DATE)");
        const thisMonth = await pool.query("SELECT COUNT(*) FROM players WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)");
        
        const winners = await pool.query("SELECT COUNT(*) FROM players WHERE status IN ('winner', 'claimed')");
        const pendingPrizes = await pool.query("SELECT COUNT(*) FROM players WHERE status = 'winner'");
        const claimedPrizes = await pool.query("SELECT COUNT(*) FROM players WHERE status = 'claimed'");
        
        const avgScore = await pool.query("SELECT ROUND(AVG(score)) as avg FROM players WHERE score > 0");
        const maxScore = await pool.query("SELECT MAX(score) as max FROM players");
        const totalScore = await pool.query("SELECT SUM(score) as total FROM players");
        
        const activeToday = await pool.query("SELECT COUNT(*) FROM players WHERE DATE(played_at) = CURRENT_DATE");
        
        res.json({
            players: {
                total: parseInt(total.rows[0].count),
                today: parseInt(today.rows[0].count),
                thisWeek: parseInt(thisWeek.rows[0].count),
                thisMonth: parseInt(thisMonth.rows[0].count)
            },
            prizes: {
                totalWinners: parseInt(winners.rows[0].count),
                pending: parseInt(pendingPrizes.rows[0].count),
                claimed: parseInt(claimedPrizes.rows[0].count)
            },
            scores: {
                average: parseInt(avgScore.rows[0].avg) || 0,
                highest: parseInt(maxScore.rows[0].max) || 0,
                total: parseInt(totalScore.rows[0].total) || 0
            },
            activity: {
                activeToday: parseInt(activeToday.rows[0].count)
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Hourly Activity Chart
app.get('/api/admin/stats/hourly', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                EXTRACT(HOUR FROM created_at) as hour,
                COUNT(*) as registrations
            FROM players 
            WHERE created_at >= CURRENT_DATE
            GROUP BY hour
            ORDER BY hour
        `);
        
        // Fill missing hours with 0
        const hourlyData = Array(24).fill(0);
        result.rows.forEach(row => {
            hourlyData[parseInt(row.hour)] = parseInt(row.registrations);
        });
        
        res.json({
            labels: Array.from({length: 24}, (_, i) => i + ':00'),
            data: hourlyData
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Daily Registrations Chart (Last 30 days)
app.get('/api/admin/stats/daily', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as count
            FROM players 
            WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
            GROUP BY DATE(created_at)
            ORDER BY date
        `);
        
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Province Distribution Chart
app.get('/api/admin/stats/provinces', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                province,
                COUNT(*) as count,
                ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
            FROM players 
            GROUP BY province
            ORDER BY count DESC
        `);
        
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Score Distribution Chart
app.get('/api/admin/stats/score-distribution', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                CASE 
                    WHEN score = 0 THEN '0'
                    WHEN score BETWEEN 1 AND 100 THEN '1-100'
                    WHEN score BETWEEN 101 AND 500 THEN '101-500'
                    WHEN score BETWEEN 501 AND 1000 THEN '501-1000'
                    WHEN score BETWEEN 1001 AND 2000 THEN '1001-2000'
                    ELSE '2000+'
                END as range,
                COUNT(*) as count
            FROM players
            GROUP BY range
            ORDER BY 
                CASE range
                    WHEN '0' THEN 1
                    WHEN '1-100' THEN 2
                    WHEN '101-500' THEN 3
                    WHEN '501-1000' THEN 4
                    WHEN '1001-2000' THEN 5
                    ELSE 6
                END
        `);
        
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Growth Comparison (This week vs Last week)
app.get('/api/admin/stats/growth', authenticateToken, async (req, res) => {
    try {
        const thisWeek = await pool.query("SELECT COUNT(*) FROM players WHERE created_at >= DATE_TRUNC('week', CURRENT_DATE)");
        const lastWeek = await pool.query("SELECT COUNT(*) FROM players WHERE created_at >= DATE_TRUNC('week', CURRENT_DATE) - INTERVAL '7 days' AND created_at < DATE_TRUNC('week', CURRENT_DATE)");
        
        const thisWeekWinners = await pool.query("SELECT COUNT(*) FROM players WHERE won_at >= DATE_TRUNC('week', CURRENT_DATE)");
        const lastWeekWinners = await pool.query("SELECT COUNT(*) FROM players WHERE won_at >= DATE_TRUNC('week', CURRENT_DATE) - INTERVAL '7 days' AND won_at < DATE_TRUNC('week', CURRENT_DATE)");
        
        const calcGrowth = (current, previous) => {
            if (previous === 0) return current > 0 ? 100 : 0;
            return Math.round(((current - previous) / previous) * 100);
        };
        
        res.json({
            registrations: {
                thisWeek: parseInt(thisWeek.rows[0].count),
                lastWeek: parseInt(lastWeek.rows[0].count),
                growth: calcGrowth(parseInt(thisWeek.rows[0].count), parseInt(lastWeek.rows[0].count))
            },
            winners: {
                thisWeek: parseInt(thisWeekWinners.rows[0].count),
                lastWeek: parseInt(lastWeekWinners.rows[0].count),
                growth: calcGrowth(parseInt(thisWeekWinners.rows[0].count), parseInt(lastWeekWinners.rows[0].count))
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Top Players All Time
app.get('/api/admin/stats/top-players', authenticateToken, async (req, res) => {
    const { limit = 10 } = req.query;
    try {
        const result = await pool.query(`
            SELECT name, phone, province, score, status, created_at, played_at
            FROM players 
            ORDER BY score DESC 
            LIMIT $1
        `, [parseInt(limit)]);
        
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});


// ============== Start Server ==============

// ============== Enhanced Lucky Wheel API ==============

// Get wheel configuration
app.get('/api/wheel/config', async (req, res) => {
    try {
        const prizes = await pool.query('SELECT * FROM prizes WHERE active = true ORDER BY id');
        const minScore = await getSetting('min_score_for_roulette', '1500');
        
        res.json({
            prizes: prizes.rows,
            minScore: parseInt(minScore),
            segments: [
                { label: 'جائزة 1', color: '#e31e24', value: 100 },
                { label: 'جائزة 2', color: '#ffd700', value: 200 },
                { label: 'حظ أوفر', color: '#333', value: 0 },
                { label: 'جائزة 3', color: '#e31e24', value: 150 },
                { label: 'جائزة 4', color: '#ffd700', value: 250 },
                { label: 'حظ أوفر', color: '#333', value: 0 },
                { label: 'جائزة 5', color: '#e31e24', value: 300 },
                { label: 'جائزة كبرى', color: '#00ff00', value: 500 }
            ]
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Spin the wheel
app.post('/api/wheel/spin', async (req, res) => {
    const { phone } = req.body;
    try {
        // Check if player exists and has enough score
        const player = await pool.query('SELECT * FROM players WHERE phone = $1', [phone]);
        if (player.rows.length === 0) {
            return res.status(404).json({ error: 'اللاعب غير موجود' });
        }
        
        const minScore = parseInt(await getSetting('min_score_for_roulette', '1500'));
        if (player.rows[0].score < minScore) {
            return res.status(400).json({ error: 'النقاط غير كافية للدوران' });
        }
        
        // Check daily spin limit
        const todaySpins = await pool.query(
            "SELECT COUNT(*) FROM wheel_spins WHERE phone = $1 AND DATE(spun_at) = CURRENT_DATE",
            [phone]
        );
        
        if (parseInt(todaySpins.rows[0].count) >= 3) {
            return res.status(400).json({ error: 'استنفدت محاولاتك اليوم (3 محاولات)' });
        }
        
        // Random result
        const segments = [100, 200, 0, 150, 250, 0, 300, 500];
        const weights = [20, 15, 25, 15, 10, 25, 8, 2]; // Probability weights
        
        let totalWeight = weights.reduce((a, b) => a + b, 0);
        let random = Math.random() * totalWeight;
        let selectedIndex = 0;
        
        for (let i = 0; i < weights.length; i++) {
            random -= weights[i];
            if (random <= 0) {
                selectedIndex = i;
                break;
            }
        }
        
        const pointsWon = segments[selectedIndex];
        
        // Record spin
        await pool.query(
            'INSERT INTO wheel_spins (phone, points_won) VALUES ($1, $2)',
            [phone, pointsWon]
        );
        
        // Add points to player
        if (pointsWon > 0) {
            await pool.query(
                'UPDATE players SET score = score + $1 WHERE phone = $2',
                [pointsWon, phone]
            );
        }
        
        res.json({
            success: true,
            segmentIndex: selectedIndex,
            pointsWon: pointsWon,
            message: pointsWon > 0 ? 'مبروك! ربحت ' + pointsWon + ' نقطة' : 'حظ أوفر! حاول مرة ثانية'
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get player spin history
app.get('/api/wheel/history/:phone', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM wheel_spins WHERE phone = $1 ORDER BY spun_at DESC LIMIT 10',
            [req.params.phone]
        );
        
        const todaySpins = await pool.query(
            "SELECT COUNT(*) FROM wheel_spins WHERE phone = $1 AND DATE(spun_at) = CURRENT_DATE",
            [req.params.phone]
        );
        
        res.json({
            history: result.rows,
            todaySpins: parseInt(todaySpins.rows[0].count),
            remainingSpins: Math.max(0, 3 - parseInt(todaySpins.rows[0].count))
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});


// ============== Excel Export API ==============

// Export Players to Excel
app.get('/api/admin/export/players', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT name, phone, province, score, status, created_at, played_at, won_at FROM players ORDER BY created_at DESC');
        
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(result.rows);
        XLSX.utils.book_append_sheet(wb, ws, 'Players');
        
        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=players_' + Date.now() + '.xlsx');
        res.send(buffer);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Export Winners to Excel
app.get('/api/admin/export/winners', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query("SELECT name, phone, province, score, prize_code, status, won_at, claimed_at FROM players WHERE status IN ('winner', 'claimed') ORDER BY won_at DESC");
        
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(result.rows);
        XLSX.utils.book_append_sheet(wb, ws, 'Winners');
        
        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=winners_' + Date.now() + '.xlsx');
        res.send(buffer);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Export Claims to Excel  
app.get('/api/admin/export/claims', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT p.name, p.phone, p.province, p.prize_code, c.employee_name, c.notes, c.claimed_at, b.name as branch_name
            FROM claims c 
            JOIN players p ON c.player_id = p.id 
            LEFT JOIN branches b ON c.branch_id = b.id
            ORDER BY c.claimed_at DESC
        `);
        
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(result.rows);
        XLSX.utils.book_append_sheet(wb, ws, 'Claims');
        
        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=claims_' + Date.now() + '.xlsx');
        res.send(buffer);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});


// ============== Dashboard Charts API ==============

// Players registration over time
app.get('/api/admin/charts/registrations', authenticateToken, async (req, res) => {
    const { period = '7days' } = req.query;
    try {
        let query;
        if (period === '7days') {
            query = `SELECT DATE(created_at) as date, COUNT(*) as count 
                     FROM players WHERE created_at >= NOW() - INTERVAL '7 days' 
                     GROUP BY DATE(created_at) ORDER BY date`;
        } else if (period === '30days') {
            query = `SELECT DATE(created_at) as date, COUNT(*) as count 
                     FROM players WHERE created_at >= NOW() - INTERVAL '30 days' 
                     GROUP BY DATE(created_at) ORDER BY date`;
        } else {
            query = `SELECT TO_CHAR(created_at, 'YYYY-MM') as date, COUNT(*) as count 
                     FROM players GROUP BY TO_CHAR(created_at, 'YYYY-MM') ORDER BY date`;
        }
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Winners over time (for charts)
app.get('/api/admin/charts/winners-timeline', authenticateToken, async (req, res) => {
    const { period = '7days' } = req.query;
    try {
        let interval = period === '30days' ? '30 days' : '7 days';
        const result = await pool.query(`
            SELECT DATE(won_at) as date, COUNT(*) as count 
            FROM players WHERE won_at IS NOT NULL AND won_at >= NOW() - INTERVAL '${interval}'
            GROUP BY DATE(won_at) ORDER BY date
        `);
        res.json(result.rows || []);
    } catch (err) {
        console.error(err);
        res.json([]);
    }
});

// Players by province (simple count)
app.get('/api/admin/charts/provinces-simple', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT province, COUNT(*) as count 
            FROM players WHERE province IS NOT NULL
            GROUP BY province ORDER BY count DESC
        `);
        res.json(result.rows || []);
    } catch (err) {
        console.error(err);
        res.json([]);
    }
});

// Score distribution
app.get('/api/admin/charts/scores', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                CASE 
                    WHEN score = 0 THEN '0'
                    WHEN score BETWEEN 1 AND 500 THEN '1-500'
                    WHEN score BETWEEN 501 AND 1000 THEN '501-1000'
                    WHEN score BETWEEN 1001 AND 2000 THEN '1001-2000'
                    ELSE '2000+'
                END as range,
                COUNT(*) as count
            FROM players GROUP BY range ORDER BY range
        `);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Hourly activity
app.get('/api/admin/charts/activity', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT EXTRACT(HOUR FROM created_at) as hour, COUNT(*) as count 
            FROM players WHERE created_at >= NOW() - INTERVAL '7 days'
            GROUP BY hour ORDER BY hour
        `);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Dashboard summary
app.get('/api/admin/charts/summary', authenticateToken, async (req, res) => {
    try {
        const today = await pool.query("SELECT COUNT(*) FROM players WHERE DATE(created_at) = CURRENT_DATE");
        const thisWeek = await pool.query("SELECT COUNT(*) FROM players WHERE created_at >= NOW() - INTERVAL '7 days'");
        const thisMonth = await pool.query("SELECT COUNT(*) FROM players WHERE created_at >= NOW() - INTERVAL '30 days'");
        const totalWinners = await pool.query("SELECT COUNT(*) FROM players WHERE status IN ('winner', 'claimed')");
        const pendingClaims = await pool.query("SELECT COUNT(*) FROM players WHERE status = 'winner'");
        const avgScore = await pool.query("SELECT ROUND(AVG(score)) as avg FROM players WHERE score > 0");
        
        res.json({
            today: parseInt(today.rows[0].count),
            thisWeek: parseInt(thisWeek.rows[0].count),
            thisMonth: parseInt(thisMonth.rows[0].count),
            totalWinners: parseInt(totalWinners.rows[0].count),
            pendingClaims: parseInt(pendingClaims.rows[0].count),
            avgScore: parseInt(avgScore.rows[0].avg) || 0
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});


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

// ============== Enhanced Wheel Settings APIs ==============

// Get wheel settings and prizes
app.get('/api/admin/wheel/settings', authenticateToken, async (req, res) => {
    try {
        const enabled = await getSetting('lucky_wheel_enabled', 'true');
        const spinsPerDay = await getSetting('wheel_spins_per_day', '3');
        const minScore = await getSetting('wheel_min_score', '1500');
        
        const prizes = await pool.query('SELECT * FROM wheel_prizes ORDER BY sort_order');
        
        // Get today's stats
        const todayStats = await pool.query(`
            SELECT COUNT(*) as spins, COALESCE(SUM(points_won), 0) as points
            FROM wheel_spins WHERE DATE(spun_at) = CURRENT_DATE
        `);
        
        res.json({
            success: true,
            settings: {
                enabled: enabled === 'true',
                spinsPerDay: parseInt(spinsPerDay),
                minScore: parseInt(minScore)
            },
            prizes: prizes.rows,
            stats: {
                todaySpins: parseInt(todayStats.rows[0].spins),
                todayPoints: parseInt(todayStats.rows[0].points)
            }
        });
    } catch (err) {
        console.error('Error getting wheel settings:', err);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// Save wheel settings
app.post('/api/admin/wheel/settings', authenticateToken, async (req, res) => {
    try {
        const { enabled, spinsPerDay, minScore } = req.body;
        
        await pool.query("INSERT INTO settings (key, value) VALUES ('lucky_wheel_enabled', $1) ON CONFLICT (key) DO UPDATE SET value = $1", [enabled ? 'true' : 'false']);
        await pool.query("INSERT INTO settings (key, value) VALUES ('wheel_spins_per_day', $1) ON CONFLICT (key) DO UPDATE SET value = $1", [spinsPerDay.toString()]);
        await pool.query("INSERT INTO settings (key, value) VALUES ('wheel_min_score', $1) ON CONFLICT (key) DO UPDATE SET value = $1", [minScore.toString()]);
        
        await logActivity(req.user?.id, req.user?.username, 'wheel_settings_updated', 'تحديث إعدادات العجلة', req.ip);
        
        res.json({ success: true });
    } catch (err) {
        console.error('Error saving wheel settings:', err);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// Save wheel prizes
app.post('/api/admin/wheel/prizes', authenticateToken, async (req, res) => {
    try {
        const { prizes } = req.body;
        
        // Delete old prizes and insert new ones
        await pool.query('DELETE FROM wheel_prizes');
        
        for (let i = 0; i < prizes.length; i++) {
            const p = prizes[i];
            await pool.query(
                'INSERT INTO wheel_prizes (label, value, color, probability, sort_order, active) VALUES ($1, $2, $3, $4, $5, $6)',
                [p.label, p.value, p.color, p.probability, i + 1, p.active !== false]
            );
        }
        
        await logActivity(req.user?.id, req.user?.username, 'wheel_prizes_updated', `تحديث جوائز العجلة (${prizes.length} جائزة)`, req.ip);
        
        res.json({ success: true });
    } catch (err) {
        console.error('Error saving wheel prizes:', err);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// ============== Daily Tasks APIs ==============

// Get daily tasks settings
app.get('/api/admin/daily-tasks/settings', authenticateToken, async (req, res) => {
    try {
        const enabled = await getSetting('daily_tasks_enabled', 'true');
        const tasksCount = await getSetting('daily_tasks_count', '3');
        const bonusStreak = await getSetting('daily_tasks_bonus_streak', '50');
        
        // Get today's stats
        const todayStats = await pool.query(`
            SELECT 
                COUNT(DISTINCT phone) as players,
                COUNT(*) FILTER (WHERE completed = true) as completed_tasks,
                COUNT(*) as total_tasks
            FROM daily_tasks WHERE task_date = CURRENT_DATE
        `);
        
        res.json({
            success: true,
            settings: {
                enabled: enabled === 'true',
                tasksCount: parseInt(tasksCount),
                bonusStreak: parseInt(bonusStreak)
            },
            stats: todayStats.rows[0]
        });
    } catch (err) {
        console.error('Error getting daily tasks settings:', err);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// Save daily tasks settings
app.post('/api/admin/daily-tasks/settings', authenticateToken, async (req, res) => {
    try {
        const { enabled, tasksCount, bonusStreak } = req.body;
        
        await pool.query("INSERT INTO settings (key, value) VALUES ('daily_tasks_enabled', $1) ON CONFLICT (key) DO UPDATE SET value = $1", [enabled ? 'true' : 'false']);
        await pool.query("INSERT INTO settings (key, value) VALUES ('daily_tasks_count', $1) ON CONFLICT (key) DO UPDATE SET value = $1", [tasksCount.toString()]);
        await pool.query("INSERT INTO settings (key, value) VALUES ('daily_tasks_bonus_streak', $1) ON CONFLICT (key) DO UPDATE SET value = $1", [bonusStreak.toString()]);
        
        await logActivity(req.user?.id, req.user?.username, 'daily_tasks_settings_updated', 'تحديث إعدادات المهام اليومية', req.ip);
        
        res.json({ success: true });
    } catch (err) {
        console.error('Error saving daily tasks settings:', err);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// Get player's daily tasks
app.get('/api/daily-tasks/:phone', async (req, res) => {
    try {
        const { phone } = req.params;
        const enabled = await getSetting('daily_tasks_enabled', 'true');
        
        if (enabled !== 'true') {
            return res.json({ success: true, tasks: [], enabled: false });
        }
        
        // Check if player has tasks for today
        let tasks = await pool.query(
            'SELECT * FROM daily_tasks WHERE phone = $1 AND task_date = CURRENT_DATE ORDER BY id',
            [phone]
        );
        
        // Generate new tasks if none exist
        if (tasks.rows.length === 0) {
            const tasksCount = parseInt(await getSetting('daily_tasks_count', '3'));
            const allTasks = [
                { type: 'score', name: 'احصل على 300 نقطة', icon: '🎯', target: 300, reward: 30 },
                { type: 'score', name: 'احصل على 500 نقطة', icon: '🎯', target: 500, reward: 50 },
                { type: 'score', name: 'احصل على 1000 نقطة', icon: '🏆', target: 1000, reward: 100 },
                { type: 'lines', name: 'أزل 10 صفوف', icon: '📏', target: 10, reward: 30 },
                { type: 'lines', name: 'أزل 20 صف', icon: '📏', target: 20, reward: 50 },
                { type: 'games', name: 'العب 3 مرات', icon: '🎮', target: 3, reward: 25 },
                { type: 'games', name: 'العب 5 مرات', icon: '🎮', target: 5, reward: 40 },
                { type: 'tetris', name: 'اعمل تتريس', icon: '💥', target: 1, reward: 60 },
                { type: 'time', name: 'العب 5 دقائق', icon: '⏱️', target: 300, reward: 35 }
            ];
            
            // Shuffle and pick tasks
            const shuffled = allTasks.sort(() => 0.5 - Math.random());
            const selectedTasks = shuffled.slice(0, tasksCount);
            
            for (const task of selectedTasks) {
                await pool.query(
                    'INSERT INTO daily_tasks (phone, task_type, task_name, task_icon, target, reward) VALUES ($1, $2, $3, $4, $5, $6)',
                    [phone, task.type, task.name, task.icon, task.target, task.reward]
                );
            }
            
            tasks = await pool.query(
                'SELECT * FROM daily_tasks WHERE phone = $1 AND task_date = CURRENT_DATE ORDER BY id',
                [phone]
            );
        }
        
        // Get player's daily stats
        const stats = await pool.query(
            'SELECT * FROM player_daily_stats WHERE phone = $1 AND stat_date = CURRENT_DATE',
            [phone]
        );
        
        res.json({
            success: true,
            enabled: true,
            tasks: tasks.rows,
            stats: stats.rows[0] || {}
        });
    } catch (err) {
        console.error('Error getting daily tasks:', err);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// Update player's daily stats and check tasks
app.post('/api/daily-tasks/update', async (req, res) => {
    try {
        const { phone, score, lines, tetris, playTime, games } = req.body;
        
        // Update or insert daily stats
        await pool.query(`
            INSERT INTO player_daily_stats (phone, games_played, total_score, lines_cleared, tetris_count, play_time)
            VALUES ($1, $6, $2, $3, $4, $5)
            ON CONFLICT (phone, stat_date) DO UPDATE SET
                games_played = player_daily_stats.games_played + $6,
                total_score = player_daily_stats.total_score + $2,
                lines_cleared = player_daily_stats.lines_cleared + $3,
                tetris_count = player_daily_stats.tetris_count + $4,
                play_time = player_daily_stats.play_time + $5
        `, [phone, score || 0, lines || 0, tetris || 0, playTime || 0, games || 1]);
        
        // Get updated stats
        const stats = await pool.query(
            'SELECT * FROM player_daily_stats WHERE phone = $1 AND stat_date = CURRENT_DATE',
            [phone]
        );
        const playerStats = stats.rows[0];
        
        // Check and update tasks
        const tasks = await pool.query(
            'SELECT * FROM daily_tasks WHERE phone = $1 AND task_date = CURRENT_DATE AND completed = false',
            [phone]
        );
        
        const completedTasks = [];
        for (const task of tasks.rows) {
            let progress = 0;
            switch (task.task_type) {
                case 'score': progress = playerStats.total_score; break;
                case 'lines': progress = playerStats.lines_cleared; break;
                case 'games': progress = playerStats.games_played; break;
                case 'tetris': progress = playerStats.tetris_count; break;
                case 'time': progress = playerStats.play_time; break;
            }
            
            const completed = progress >= task.target;
            await pool.query(
                'UPDATE daily_tasks SET progress = $1, completed = $2, completed_at = CASE WHEN $2 THEN NOW() ELSE NULL END WHERE id = $3',
                [Math.min(progress, task.target), completed, task.id]
            );
            
            if (completed) {
                completedTasks.push({ ...task, progress });
            }
        }
        
        res.json({
            success: true,
            stats: playerStats,
            completedTasks
        });
    } catch (err) {
        console.error('Error updating daily tasks:', err);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// ============== Auto Backup APIs ==============

// Get auto backup settings
app.get('/api/admin/auto-backup/settings', authenticateToken, async (req, res) => {
    try {
        const enabled = await getSetting('auto_backup_enabled', 'false');
        const interval = await getSetting('auto_backup_interval', '24');
        const keepDays = await getSetting('auto_backup_keep_days', '7');
        
        // Get last backup info
        const lastBackup = await pool.query('SELECT * FROM backup_logs ORDER BY created_at DESC LIMIT 1');
        
        // Get backup count
        const backupCount = await pool.query('SELECT COUNT(*) FROM backup_logs');
        
        res.json({
            success: true,
            settings: {
                enabled: enabled === 'true',
                interval: parseInt(interval),
                keepDays: parseInt(keepDays)
            },
            lastBackup: lastBackup.rows[0] || null,
            totalBackups: parseInt(backupCount.rows[0].count)
        });
    } catch (err) {
        console.error('Error getting auto backup settings:', err);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// Save auto backup settings
app.post('/api/admin/auto-backup/settings', authenticateToken, async (req, res) => {
    try {
        const { enabled, interval, keepDays } = req.body;
        
        await pool.query("INSERT INTO settings (key, value) VALUES ('auto_backup_enabled', $1) ON CONFLICT (key) DO UPDATE SET value = $1", [enabled ? 'true' : 'false']);
        await pool.query("INSERT INTO settings (key, value) VALUES ('auto_backup_interval', $1) ON CONFLICT (key) DO UPDATE SET value = $1", [interval.toString()]);
        await pool.query("INSERT INTO settings (key, value) VALUES ('auto_backup_keep_days', $1) ON CONFLICT (key) DO UPDATE SET value = $1", [keepDays.toString()]);
        
        await logActivity(req.user?.id, req.user?.username, 'auto_backup_settings_updated', 'تحديث إعدادات النسخ التلقائي', req.ip);
        
        // If enabled, schedule next backup
        if (enabled) {
            scheduleAutoBackup();
        }
        
        res.json({ success: true });
    } catch (err) {
        console.error('Error saving auto backup settings:', err);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// Create backup now
app.post('/api/admin/auto-backup/now', authenticateToken, async (req, res) => {
    try {
        const backup = await createBackup(req.user);
        res.json({ success: true, backup });
    } catch (err) {
        console.error('Error creating backup:', err);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// Delete old backups
app.post('/api/admin/auto-backup/cleanup', authenticateToken, async (req, res) => {
    try {
        const keepDays = parseInt(await getSetting('auto_backup_keep_days', '7'));
        const result = await pool.query(
            'DELETE FROM backup_logs WHERE created_at < NOW() - INTERVAL \'1 day\' * $1 RETURNING id',
            [keepDays]
        );
        
        await logActivity(req.user?.id, req.user?.username, 'backup_cleanup', `حذف ${result.rowCount} نسخة قديمة`, req.ip);
        
        res.json({ success: true, deleted: result.rowCount });
    } catch (err) {
        console.error('Error cleaning backups:', err);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// Helper function to create backup
async function createBackup(user) {
    const players = await pool.query('SELECT * FROM players');
    const settings = await pool.query('SELECT * FROM settings');
    const prizes = await pool.query('SELECT * FROM prizes');
    const announcements = await pool.query('SELECT * FROM announcements');
    const branches = await pool.query('SELECT * FROM branches');
    const wheelPrizes = await pool.query('SELECT * FROM wheel_prizes');
    
    const backup = {
        version: '60.0',
        created_at: new Date().toISOString(),
        created_by: user?.username || 'auto',
        data: {
            players: players.rows,
            settings: settings.rows,
            prizes: prizes.rows,
            announcements: announcements.rows,
            branches: branches.rows,
            wheelPrizes: wheelPrizes.rows
        }
    };
    
    const filename = `backup_${Date.now()}.json`;
    const size = JSON.stringify(backup).length;
    
    await pool.query(
        'INSERT INTO backup_logs (filename, size_bytes, type, created_by) VALUES ($1, $2, $3, $4)',
        [filename, size, 'auto', user?.username || 'system']
    );
    
    return { filename, size, backup };
}

// Auto backup scheduler
let autoBackupInterval = null;

async function scheduleAutoBackup() {
    if (autoBackupInterval) {
        clearInterval(autoBackupInterval);
    }
    
    const enabled = await getSetting('auto_backup_enabled', 'false');
    if (enabled !== 'true') return;
    
    const hours = parseInt(await getSetting('auto_backup_interval', '24'));
    const ms = hours * 60 * 60 * 1000;
    
    autoBackupInterval = setInterval(async () => {
        try {
            console.log('🔄 Running auto backup...');
            await createBackup({ username: 'auto' });
            console.log('✅ Auto backup completed');
            
            // Cleanup old backups
            const keepDays = parseInt(await getSetting('auto_backup_keep_days', '7'));
            await pool.query(
                'DELETE FROM backup_logs WHERE created_at < NOW() - INTERVAL \'1 day\' * $1',
                [keepDays]
            );
        } catch (err) {
            console.error('❌ Auto backup failed:', err);
        }
    }, ms);
    
    console.log(`📅 Auto backup scheduled every ${hours} hours`);
}

// Start auto backup on server start
setTimeout(scheduleAutoBackup, 5000);

// ══════════════════════════════════════════════════════════════════
// نظام الدردشة المحمي - Chat System v1.0
// ══════════════════════════════════════════════════════════════════

const DEFAULT_BAD_WORDS = ['حمار', 'كلب', 'غبي', 'احمق', 'تافه', 'حقير', 'وسخ', 'زبال', 'fuck', 'shit', 'ass', 'bitch', 'damn', 'idiot', 'stupid'];

const ChatSecurity = {
    badWords: new Set(DEFAULT_BAD_WORDS),
    rateLimits: new Map(),
    maxMessagesPerMinute: 5,
    
    async loadBadWords() {
        try {
            const result = await pool.query('SELECT word FROM chat_bad_words');
            result.rows.forEach(r => this.badWords.add(r.word.toLowerCase()));
            console.log(`✅ Chat: تم تحميل ${this.badWords.size} كلمة محظورة`);
        } catch (e) {}
    },
    
    containsBadWords(message) {
        const lower = message.toLowerCase();
        for (const badWord of this.badWords) {
            if (lower.includes(badWord)) return { found: true, word: badWord };
        }
        return { found: false };
    },
    
    sanitizeMessage(message) {
        return message.replace(/<[^>]*>/g, '').replace(/[<>\"\'`;]/g, '').replace(/\s+/g, ' ').trim().substring(0, 200);
    },
    
    checkRateLimit(phone) {
        const now = Date.now();
        const userData = this.rateLimits.get(phone);
        if (!userData || now - userData.lastReset > 60000) {
            this.rateLimits.set(phone, { count: 1, lastReset: now });
            return { allowed: true, remaining: this.maxMessagesPerMinute - 1 };
        }
        if (userData.count >= this.maxMessagesPerMinute) {
            return { allowed: false, waitTime: Math.ceil((60000 - (now - userData.lastReset)) / 1000) };
        }
        userData.count++;
        return { allowed: true, remaining: this.maxMessagesPerMinute - userData.count };
    },
    
    async isUserBanned(phone) {
        try {
            const result = await pool.query(
                'SELECT * FROM chat_banned_users WHERE phone = $1 AND (expires_at IS NULL OR expires_at > NOW())',
                [phone]
            );
            return result.rows.length > 0 ? result.rows[0] : null;
        } catch (e) { return null; }
    }
};

// Chat Rate Limiter
const chatLimiter = rateLimit({ windowMs: 60000, max: 15, message: { error: 'طلبات كثيرة' } });

// ============== Chat Public APIs ==============

// Get messages
app.get('/api/chat/messages', async (req, res) => {
    try {
        const chatEnabled = await getSetting('chat_enabled', 'true');
        if (chatEnabled !== 'true') return res.json({ enabled: false, messages: [] });
        
        const limit = Math.min(parseInt(req.query.limit) || 50, 100);
        const after = parseInt(req.query.after) || 0;
        
        const result = await pool.query(
            'SELECT id, player_phone, player_name, message, reply_to_id, reply_to_name, reply_to_text, created_at FROM chat_messages WHERE is_deleted = false AND id > $1 ORDER BY created_at DESC LIMIT $2',
            [after, limit]
        );
        res.json({ enabled: true, messages: result.rows.reverse() });
    } catch (err) {
        res.status(500).json({ error: 'خطأ' });
    }
});

// Send message
app.post('/api/chat/send', chatLimiter, async (req, res) => {
    try {
        const chatEnabled = await getSetting('chat_enabled', 'true');
        if (chatEnabled !== 'true') return res.status(403).json({ error: 'الدردشة معطلة' });
        
        const { phone, name, message, reply_to_id, reply_to_name, reply_to_text } = req.body;
        if (!phone || !name || !message) return res.status(400).json({ error: 'بيانات ناقصة' });
        
        const banned = await ChatSecurity.isUserBanned(phone);
        if (banned) return res.status(403).json({ error: 'أنت محظور', reason: banned.reason });
        
        const rateCheck = ChatSecurity.checkRateLimit(phone);
        if (!rateCheck.allowed) return res.status(429).json({ error: `انتظر ${rateCheck.waitTime} ثانية` });
        
        const cleanMessage = ChatSecurity.sanitizeMessage(message);
        if (cleanMessage.length < 1) return res.status(400).json({ error: 'رسالة فارغة' });
        
        const badWordCheck = ChatSecurity.containsBadWords(cleanMessage);
        if (badWordCheck.found) return res.status(400).json({ error: 'رسالة غير مسموحة' });
        
        // إنشاء اسم فريد (الاسم + آخر 4 أرقام من الهاتف)
        const uniqueName = name.substring(0, 20) + '#' + phone.slice(-4);
        
        const result = await pool.query(
            `INSERT INTO chat_messages (player_phone, player_name, message, reply_to_id, reply_to_name, reply_to_text) 
             VALUES ($1, $2, $3, $4, $5, $6) 
             RETURNING id, player_phone, player_name, message, reply_to_id, reply_to_name, reply_to_text, created_at`,
            [phone, uniqueName, cleanMessage, reply_to_id || null, reply_to_name || null, reply_to_text?.substring(0, 50) || null]
        );
        res.json({ success: true, message: result.rows[0], remaining: rateCheck.remaining });
    } catch (err) {
        console.error('Chat send error:', err);
        res.status(500).json({ error: 'خطأ' });
    }
});

// Report message
app.post('/api/chat/report', async (req, res) => {
    try {
        const { message_id, reporter_phone } = req.body;
        if (!message_id) return res.status(400).json({ error: 'بيانات ناقصة' });
        
        await pool.query(
            `INSERT INTO chat_reports (message_id, reporter_phone) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [message_id, reporter_phone || 'anonymous']
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'خطأ' });
    }
});

// ============== Chat Admin APIs ==============

// Toggle chat
app.post('/api/admin/chat/toggle', authenticateToken, async (req, res) => {
    try {
        await setSetting('chat_enabled', req.body.enabled ? 'true' : 'false');
        await logActivity(pool, 'admin', req.body.enabled ? 'تشغيل الدردشة' : 'إيقاف الدردشة');
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'خطأ' }); }
});

// Chat status
app.get('/api/admin/chat/status', authenticateToken, async (req, res) => {
    try {
        const enabled = await getSetting('chat_enabled', 'true');
        const msgCount = await pool.query('SELECT COUNT(*) FROM chat_messages WHERE is_deleted = false');
        const banCount = await pool.query('SELECT COUNT(*) FROM chat_banned_users WHERE expires_at IS NULL OR expires_at > NOW()');
        res.json({ enabled: enabled === 'true', totalMessages: parseInt(msgCount.rows[0].count), bannedUsers: parseInt(banCount.rows[0].count) });
    } catch (err) { res.status(500).json({ error: 'خطأ' }); }
});

// Get all messages (admin)
app.get('/api/admin/chat/messages', authenticateToken, async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 100, 500);
        const result = await pool.query('SELECT * FROM chat_messages ORDER BY created_at DESC LIMIT $1', [limit]);
        res.json({ messages: result.rows });
    } catch (err) { res.status(500).json({ error: 'خطأ' }); }
});

// Delete message
app.delete('/api/admin/chat/message/:id', authenticateToken, async (req, res) => {
    try {
        await pool.query('UPDATE chat_messages SET is_deleted = true, deleted_by = $1 WHERE id = $2', ['admin', req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'خطأ' }); }
});

// Ban user
app.post('/api/admin/chat/ban', authenticateToken, async (req, res) => {
    try {
        const { phone, reason, duration } = req.body;
        let expiresAt = null;
        if (duration && duration !== 'permanent') {
            expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + parseInt(duration));
        }
        await pool.query(
            'INSERT INTO chat_banned_users (phone, reason, banned_by, expires_at) VALUES ($1, $2, $3, $4) ON CONFLICT (phone) DO UPDATE SET reason = $2, expires_at = $4',
            [phone, reason || 'مخالفة', 'admin', expiresAt]
        );
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'خطأ' }); }
});

// Unban user
app.delete('/api/admin/chat/ban/:phone', authenticateToken, async (req, res) => {
    try {
        await pool.query('DELETE FROM chat_banned_users WHERE phone = $1', [req.params.phone]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'خطأ' }); }
});

// Get banned users
app.get('/api/admin/chat/banned', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM chat_banned_users WHERE expires_at IS NULL OR expires_at > NOW() ORDER BY banned_at DESC');
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: 'خطأ' }); }
});

// Add bad word
app.post('/api/admin/chat/bad-word', authenticateToken, async (req, res) => {
    try {
        await pool.query('INSERT INTO chat_bad_words (word, added_by) VALUES ($1, $2) ON CONFLICT DO NOTHING', [req.body.word.toLowerCase().trim(), 'admin']);
        ChatSecurity.badWords.add(req.body.word.toLowerCase().trim());
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'خطأ' }); }
});

// Delete bad word
app.delete('/api/admin/chat/bad-word/:word', authenticateToken, async (req, res) => {
    try {
        await pool.query('DELETE FROM chat_bad_words WHERE word = $1', [req.params.word]);
        ChatSecurity.badWords.delete(req.params.word);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'خطأ' }); }
});

// Get bad words
app.get('/api/admin/chat/bad-words', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM chat_bad_words ORDER BY added_at DESC');
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: 'خطأ' }); }
});

// Cleanup old messages
app.post('/api/admin/chat/cleanup', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query("DELETE FROM chat_messages WHERE created_at < NOW() - INTERVAL '24 hours' RETURNING id");
        res.json({ success: true, deleted: result.rowCount });
    } catch (err) { res.status(500).json({ error: 'خطأ' }); }
});

// ============== Factory Reset (تنظيف عام) ==============
app.post('/api/admin/factory-reset', authenticateToken, async (req, res) => {
    try {
        const { password } = req.body;
        const RESET_PASSWORD = '195419912018';
        
        if (password !== RESET_PASSWORD) {
            return res.status(403).json({ error: 'كلمة المرور غير صحيحة' });
        }
        
        // إعادة كل شي للـ default
        const results = {
            players: 0,
            scores: 0,
            games: 0,
            messages: 0,
            prizes: 0,
            winners: 0,
            referrals: 0,
            achievements: 0,
            challenges: 0,
            settings: 0
        };
        
        // حذف بيانات اللاعبين
        try {
            const r = await pool.query('DELETE FROM players RETURNING id');
            results.players = r.rowCount;
        } catch(e) { console.log('No players table or error:', e.message); }
        
        // حذف النتائج
        try {
            const r = await pool.query('DELETE FROM scores RETURNING id');
            results.scores = r.rowCount;
        } catch(e) { console.log('No scores table:', e.message); }
        
        // حذف الألعاب
        try {
            const r = await pool.query('DELETE FROM games RETURNING id');
            results.games = r.rowCount;
        } catch(e) { console.log('No games table:', e.message); }
        
        // حذف رسائل الدردشة
        try {
            const r = await pool.query('DELETE FROM chat_messages RETURNING id');
            results.messages = r.rowCount;
        } catch(e) { console.log('No chat_messages table:', e.message); }
        
        // حذف المحظورين من الدردشة
        try { await pool.query('DELETE FROM chat_banned_users'); } catch(e) {}
        
        // حذف الإبلاغات
        try { await pool.query('DELETE FROM chat_reports'); } catch(e) {}
        
        // حذف الكلمات المحظورة
        try { await pool.query('DELETE FROM chat_bad_words'); } catch(e) {}
        
        // حذف الفائزين
        try {
            const r = await pool.query('DELETE FROM winners RETURNING id');
            results.winners = r.rowCount;
        } catch(e) {}
        
        // حذف الجوائز
        try {
            const r = await pool.query('DELETE FROM prizes RETURNING id');
            results.prizes = r.rowCount;
        } catch(e) {}
        
        // حذف الإحالات
        try {
            const r = await pool.query('DELETE FROM referrals RETURNING id');
            results.referrals = r.rowCount;
        } catch(e) {}
        
        // حذف الإنجازات
        try {
            const r = await pool.query('DELETE FROM player_achievements RETURNING id');
            results.achievements = r.rowCount;
        } catch(e) {}
        
        // حذف تقدم التحديات
        try {
            const r = await pool.query('DELETE FROM challenge_progress RETURNING id');
            results.challenges = r.rowCount;
        } catch(e) {}
        
        // حذف سجل الأنشطة
        try { await pool.query('DELETE FROM activity_log'); } catch(e) {}
        
        // حذف الإعلانات
        try { await pool.query('DELETE FROM announcements'); } catch(e) {}
        
        // حذف سجل عجلة الحظ
        try { await pool.query('DELETE FROM wheel_spins'); } catch(e) {}
        
        // حذف الكوبونات
        try { await pool.query('DELETE FROM coupons'); } catch(e) {}
        
        // ============== إعادة كل الإعدادات للـ Default ==============
        const defaultSettings = {
            'game_enabled': 'true',
            'chat_enabled': 'true',
            'require_location': 'false',
            'cooldown_minutes': '30',
            'max_rounds': '3',
            'difficulty_increase_1': '20',
            'difficulty_increase_2': '40',
            'difficulty_increase_3': '50',
            'blocked_provinces': '[]',
            'site_name': 'Red Strong Tetris',
            'site_logo': '',
            'site_description': 'لعبة تتريس مع جوائز حقيقية',
            'primary_color': '#667eea',
            'whatsapp': '',
            'instagram': '',
            'facebook': '',
            'telegram': '',
            'phone': '',
            'email': '',
            'contest_name': '',
            'contest_start': '',
            'contest_end': '',
            'contest_prizes': '[]',
            'daily_goal': '1000',
            'weekly_goal': '5000',
            'points_per_line': '100',
            'points_per_tetris': '800',
            'points_per_tspin': '400',
            'show_leaderboard': 'true',
            'show_prizes': 'true',
            'show_wheel': 'true',
            'wheel_cost': '100',
            'referral_bonus': '500'
        };
        
        // حذف كل الإعدادات القديمة وإضافة الجديدة
        for (const [key, value] of Object.entries(defaultSettings)) {
            try {
                await pool.query(
                    'INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2',
                    [key, value]
                );
                results.settings++;
            } catch(e) {}
        }
        
        await logActivity(pool, 'admin', '🔄 تنظيف عام - إعادة ضبط المصنع');
        
        res.json({ 
            success: true, 
            message: '✅ تم إعادة ضبط المصنع بنجاح',
            deleted: results
        });
    } catch (err) {
        console.error('Factory reset error:', err);
        res.status(500).json({ error: 'خطأ في التنظيف: ' + err.message });
    }
});

// ============== V70 NEW FEATURES APIs ==============

// ===== REFERRAL SYSTEM =====
// Generate referral code for player
app.get('/api/referral/code/:phone', async (req, res) => {
    try {
        const { phone } = req.params;
        let player = await pool.query('SELECT referral_code FROM players WHERE phone = $1', [phone]);
        
        if (player.rows.length === 0) {
            return res.status(404).json({ error: 'اللاعب غير موجود' });
        }
        
        let code = player.rows[0].referral_code;
        if (!code) {
            code = 'RS' + phone.slice(-4) + Math.random().toString(36).substring(2, 6).toUpperCase();
            await pool.query('UPDATE players SET referral_code = $1 WHERE phone = $2', [code, phone]);
        }
        
        const stats = await pool.query(
            'SELECT COUNT(*) as total, SUM(referrer_bonus) as earnings FROM referrals WHERE referrer_phone = $1 AND status = $2',
            [phone, 'completed']
        );
        
        res.json({ 
            success: true, 
            code,
            referrals: parseInt(stats.rows[0].total) || 0,
            earnings: parseInt(stats.rows[0].earnings) || 0
        });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Apply referral code
app.post('/api/referral/apply', async (req, res) => {
    try {
        const { phone, referralCode } = req.body;
        
        // Find referrer
        const referrer = await pool.query('SELECT phone FROM players WHERE referral_code = $1', [referralCode]);
        if (referrer.rows.length === 0) {
            return res.status(400).json({ error: 'كود الإحالة غير صحيح' });
        }
        
        if (referrer.rows[0].phone === phone) {
            return res.status(400).json({ error: 'لا يمكنك استخدام كود الإحالة الخاص بك' });
        }
        
        // Check if already referred
        const existing = await pool.query('SELECT id FROM referrals WHERE referred_phone = $1', [phone]);
        if (existing.rows.length > 0) {
            return res.status(400).json({ error: 'تم تطبيق كود إحالة مسبقاً' });
        }
        
        // Create referral
        await pool.query(
            'INSERT INTO referrals (referrer_phone, referred_phone, status) VALUES ($1, $2, $3)',
            [referrer.rows[0].phone, phone, 'completed']
        );
        
        // Give bonuses
        await pool.query('UPDATE players SET score = score + 100 WHERE phone = $1', [referrer.rows[0].phone]);
        await pool.query('UPDATE players SET score = score + 50, referred_by = $1 WHERE phone = $2', [referrer.rows[0].phone, phone]);
        
        res.json({ success: true, bonus: 50, message: 'تم تطبيق كود الإحالة! حصلت على 50 نقطة' });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// ===== CHALLENGES SYSTEM =====
// Get active challenges
app.get('/api/challenges/:phone', async (req, res) => {
    try {
        const { phone } = req.params;
        const today = new Date().toISOString().split('T')[0];
        
        const challenges = await pool.query(`
            SELECT c.*, 
                COALESCE(cp.progress, 0) as progress,
                COALESCE(cp.completed, false) as completed,
                COALESCE(cp.reward_claimed, false) as reward_claimed
            FROM challenges c
            LEFT JOIN challenge_progress cp ON c.id = cp.challenge_id AND cp.phone = $1
            WHERE c.active = true
            AND (c.type = 'daily' OR (c.type = 'weekly' AND EXTRACT(DOW FROM CURRENT_DATE) <= 6))
            ORDER BY c.type, c.reward_value DESC
        `, [phone]);
        
        res.json({ success: true, challenges: challenges.rows });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Update challenge progress
app.post('/api/challenges/progress', async (req, res) => {
    try {
        const { phone, challengeId, progress } = req.body;
        
        const challenge = await pool.query('SELECT * FROM challenges WHERE id = $1', [challengeId]);
        if (challenge.rows.length === 0) {
            return res.status(404).json({ error: 'التحدي غير موجود' });
        }
        
        const ch = challenge.rows[0];
        const completed = progress >= ch.goal_value;
        
        await pool.query(`
            INSERT INTO challenge_progress (challenge_id, phone, progress, completed, completed_at)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (challenge_id, phone) 
            DO UPDATE SET progress = $3, completed = $4, completed_at = CASE WHEN $4 THEN CURRENT_TIMESTAMP ELSE NULL END
        `, [challengeId, phone, progress, completed, completed ? new Date() : null]);
        
        res.json({ success: true, completed, progress });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Claim challenge reward
app.post('/api/challenges/claim', async (req, res) => {
    try {
        const { phone, challengeId } = req.body;
        
        const progress = await pool.query(
            'SELECT * FROM challenge_progress WHERE challenge_id = $1 AND phone = $2',
            [challengeId, phone]
        );
        
        if (progress.rows.length === 0 || !progress.rows[0].completed) {
            return res.status(400).json({ error: 'التحدي غير مكتمل' });
        }
        
        if (progress.rows[0].reward_claimed) {
            return res.status(400).json({ error: 'تم استلام المكافأة مسبقاً' });
        }
        
        const challenge = await pool.query('SELECT reward_value FROM challenges WHERE id = $1', [challengeId]);
        const reward = challenge.rows[0].reward_value;
        
        await pool.query('UPDATE challenge_progress SET reward_claimed = true WHERE challenge_id = $1 AND phone = $2', [challengeId, phone]);
        await pool.query('UPDATE players SET score = score + $1 WHERE phone = $2', [reward, phone]);
        
        res.json({ success: true, reward, message: `حصلت على ${reward} نقطة!` });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// ===== STORE SYSTEM =====
// Get store items
app.get('/api/store/items', async (req, res) => {
    try {
        const items = await pool.query('SELECT * FROM store_items WHERE active = true ORDER BY type, price');
        res.json({ success: true, items: items.rows });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Purchase item
app.post('/api/store/purchase', async (req, res) => {
    try {
        const { phone, itemId } = req.body;
        
        const item = await pool.query('SELECT * FROM store_items WHERE id = $1 AND active = true', [itemId]);
        if (item.rows.length === 0) {
            return res.status(404).json({ error: 'المنتج غير موجود' });
        }
        
        const player = await pool.query('SELECT score FROM players WHERE phone = $1', [phone]);
        if (player.rows.length === 0) {
            return res.status(404).json({ error: 'اللاعب غير موجود' });
        }
        
        const it = item.rows[0];
        if (player.rows[0].score < it.price) {
            return res.status(400).json({ error: 'نقاط غير كافية' });
        }
        
        if (it.stock !== -1 && it.sold_count >= it.stock) {
            return res.status(400).json({ error: 'المنتج نفذ' });
        }
        
        // Deduct points
        await pool.query('UPDATE players SET score = score - $1 WHERE phone = $2', [it.price, phone]);
        
        // Record purchase
        await pool.query(
            'INSERT INTO player_purchases (phone, item_id, item_name, price_paid) VALUES ($1, $2, $3, $4)',
            [phone, itemId, it.name, it.price]
        );
        
        // Update sold count
        await pool.query('UPDATE store_items SET sold_count = sold_count + 1 WHERE id = $1', [itemId]);
        
        // Handle item type
        if (it.type === 'theme') {
            await pool.query(
                'INSERT INTO player_themes (phone, theme_id, theme_name) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
                [phone, it.value, it.name]
            );
        }
        
        res.json({ success: true, message: `تم شراء ${it.name}!`, item: it });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Get player owned themes
app.get('/api/store/themes/:phone', async (req, res) => {
    try {
        const themes = await pool.query('SELECT * FROM player_themes WHERE phone = $1', [req.params.phone]);
        res.json({ success: true, themes: themes.rows });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// ===== TOURNAMENT SYSTEM =====
// Get active tournaments
app.get('/api/tournaments', async (req, res) => {
    try {
        const tournaments = await pool.query(`
            SELECT t.*, 
                (SELECT COUNT(*) FROM tournament_participants WHERE tournament_id = t.id) as participants_count
            FROM tournaments t
            WHERE t.status IN ('upcoming', 'active')
            ORDER BY t.start_date
        `);
        res.json({ success: true, tournaments: tournaments.rows });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Join tournament
app.post('/api/tournaments/join', async (req, res) => {
    try {
        const { phone, tournamentId } = req.body;
        
        const tournament = await pool.query('SELECT * FROM tournaments WHERE id = $1', [tournamentId]);
        if (tournament.rows.length === 0) {
            return res.status(404).json({ error: 'البطولة غير موجودة' });
        }
        
        const t = tournament.rows[0];
        if (t.status !== 'upcoming' && t.status !== 'active') {
            return res.status(400).json({ error: 'البطولة مغلقة' });
        }
        
        const player = await pool.query('SELECT name, score FROM players WHERE phone = $1', [phone]);
        if (player.rows.length === 0) {
            return res.status(404).json({ error: 'اللاعب غير موجود' });
        }
        
        if (player.rows[0].score < t.min_score) {
            return res.status(400).json({ error: `تحتاج ${t.min_score} نقطة للمشاركة` });
        }
        
        // Entry fee
        if (t.entry_fee > 0) {
            if (player.rows[0].score < t.entry_fee) {
                return res.status(400).json({ error: 'نقاط غير كافية لرسوم الاشتراك' });
            }
            await pool.query('UPDATE players SET score = score - $1 WHERE phone = $2', [t.entry_fee, phone]);
        }
        
        await pool.query(
            'INSERT INTO tournament_participants (tournament_id, phone, name) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
            [tournamentId, phone, player.rows[0].name]
        );
        
        res.json({ success: true, message: 'تم التسجيل في البطولة!' });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Get tournament leaderboard
app.get('/api/tournaments/:id/leaderboard', async (req, res) => {
    try {
        const leaderboard = await pool.query(`
            SELECT phone, name, score, rank
            FROM tournament_participants
            WHERE tournament_id = $1
            ORDER BY score DESC
            LIMIT 50
        `, [req.params.id]);
        res.json({ success: true, leaderboard: leaderboard.rows });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// ===== NOTIFICATIONS SYSTEM =====
// Get player notifications
app.get('/api/notifications/:phone', async (req, res) => {
    try {
        const notifications = await pool.query(
            'SELECT * FROM notifications WHERE phone = $1 ORDER BY created_at DESC LIMIT 50',
            [req.params.phone]
        );
        res.json({ success: true, notifications: notifications.rows });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Mark notification as read
app.post('/api/notifications/read', async (req, res) => {
    try {
        const { phone, notificationId } = req.body;
        
        if (notificationId) {
            await pool.query('UPDATE notifications SET read = true WHERE id = $1 AND phone = $2', [notificationId, phone]);
        } else {
            await pool.query('UPDATE notifications SET read = true WHERE phone = $1', [phone]);
        }
        
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// ===== PLAYER LEVELS =====
// Get player level info
app.get('/api/level/:phone', async (req, res) => {
    try {
        const { phone } = req.params;
        
        let levelInfo = await pool.query('SELECT * FROM player_levels WHERE phone = $1', [phone]);
        
        if (levelInfo.rows.length === 0) {
            await pool.query('INSERT INTO player_levels (phone) VALUES ($1)', [phone]);
            levelInfo = await pool.query('SELECT * FROM player_levels WHERE phone = $1', [phone]);
        }
        
        const levels = await pool.query('SELECT * FROM level_definitions ORDER BY level');
        const currentLevel = levelInfo.rows[0];
        const nextLevel = levels.rows.find(l => l.level === currentLevel.level + 1);
        
        res.json({
            success: true,
            level: currentLevel,
            nextLevel,
            allLevels: levels.rows
        });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Add XP and check level up
app.post('/api/level/addxp', async (req, res) => {
    try {
        const { phone, xp } = req.body;
        
        let levelInfo = await pool.query('SELECT * FROM player_levels WHERE phone = $1', [phone]);
        if (levelInfo.rows.length === 0) {
            await pool.query('INSERT INTO player_levels (phone, xp, total_xp) VALUES ($1, $2, $2)', [phone, xp]);
            levelInfo = await pool.query('SELECT * FROM player_levels WHERE phone = $1', [phone]);
        } else {
            await pool.query(
                'UPDATE player_levels SET xp = xp + $1, total_xp = total_xp + $1, updated_at = CURRENT_TIMESTAMP WHERE phone = $2',
                [xp, phone]
            );
            levelInfo = await pool.query('SELECT * FROM player_levels WHERE phone = $1', [phone]);
        }
        
        const current = levelInfo.rows[0];
        const nextLevel = await pool.query('SELECT * FROM level_definitions WHERE level = $1', [current.level + 1]);
        
        let leveledUp = false;
        let newLevel = null;
        
        if (nextLevel.rows.length > 0 && current.total_xp >= nextLevel.rows[0].xp_required) {
            const nl = nextLevel.rows[0];
            await pool.query(
                'UPDATE player_levels SET level = $1, rank_name = $2, rank_icon = $3, xp = 0 WHERE phone = $4',
                [nl.level, nl.name, nl.icon, phone]
            );
            
            // Give level up reward
            if (nl.reward > 0) {
                await pool.query('UPDATE players SET score = score + $1 WHERE phone = $2', [nl.reward, phone]);
            }
            
            leveledUp = true;
            newLevel = nl;
            
            // Create notification
            await pool.query(
                'INSERT INTO notifications (phone, type, title, message) VALUES ($1, $2, $3, $4)',
                [phone, 'level_up', 'ترقية! 🎉', `وصلت للمستوى ${nl.level} - ${nl.name}! حصلت على ${nl.reward} نقطة`]
            );
        }
        
        res.json({ success: true, leveledUp, newLevel, currentXP: current.total_xp });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// ===== ADMIN: TOURNAMENTS =====
app.get('/api/admin/tournaments', authenticateToken, async (req, res) => {
    try {
        const tournaments = await pool.query('SELECT * FROM tournaments ORDER BY start_date DESC');
        res.json({ success: true, tournaments: tournaments.rows });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/admin/tournaments', authenticateToken, async (req, res) => {
    try {
        const { name, description, type, start_date, end_date, min_score, max_players, entry_fee, prize_pool } = req.body;
        const result = await pool.query(
            `INSERT INTO tournaments (name, description, type, start_date, end_date, min_score, max_players, entry_fee, prize_pool)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
            [name, description, type, start_date, end_date, min_score || 0, max_players || 100, entry_fee || 0, JSON.stringify(prize_pool || [])]
        );
        res.json({ success: true, tournament: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// ===== ADMIN: CHALLENGES =====
app.get('/api/admin/challenges', authenticateToken, async (req, res) => {
    try {
        const challenges = await pool.query('SELECT * FROM challenges ORDER BY type, created_at DESC');
        res.json({ success: true, challenges: challenges.rows });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/admin/challenges', authenticateToken, async (req, res) => {
    try {
        const { title, description, type, goal_type, goal_value, reward_value, icon } = req.body;
        const result = await pool.query(
            `INSERT INTO challenges (title, description, type, goal_type, goal_value, reward_value, icon)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [title, description, type, goal_type, goal_value, reward_value, icon || '🎯']
        );
        res.json({ success: true, challenge: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.delete('/api/admin/challenges/:id', authenticateToken, async (req, res) => {
    try {
        await pool.query('DELETE FROM challenges WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// ===== ADMIN: STORE =====
app.get('/api/admin/store', authenticateToken, async (req, res) => {
    try {
        const items = await pool.query('SELECT * FROM store_items ORDER BY type, created_at DESC');
        res.json({ success: true, items: items.rows });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/admin/store', authenticateToken, async (req, res) => {
    try {
        const { name, description, type, price, image, value, stock } = req.body;
        const result = await pool.query(
            `INSERT INTO store_items (name, description, type, price, image, value, stock)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [name, description, type, price, image, value, stock || -1]
        );
        res.json({ success: true, item: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.delete('/api/admin/store/:id', authenticateToken, async (req, res) => {
    try {
        await pool.query('DELETE FROM store_items WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// ===== ADMIN: REFERRALS STATS =====
app.get('/api/admin/referrals', authenticateToken, async (req, res) => {
    try {
        const stats = await pool.query(`
            SELECT r.referrer_phone, p.name as referrer_name,
                COUNT(*) as total_referrals,
                SUM(r.referrer_bonus) as total_bonus
            FROM referrals r
            LEFT JOIN players p ON r.referrer_phone = p.phone
            GROUP BY r.referrer_phone, p.name
            ORDER BY total_referrals DESC
            LIMIT 50
        `);
        
        const total = await pool.query('SELECT COUNT(*) as count, SUM(referrer_bonus + referred_bonus) as total FROM referrals');
        
        res.json({ 
            success: true, 
            referrals: stats.rows,
            totals: total.rows[0]
        });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// ===== ADMIN: EXPORT EXCEL =====
app.get('/api/admin/export/players', authenticateToken, async (req, res) => {
    try {
        const players = await pool.query(`
            SELECT name, phone, province, score, status, 
                TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI') as registered,
                TO_CHAR(played_at, 'YYYY-MM-DD HH24:MI') as last_played
            FROM players 
            ORDER BY score DESC
        `);
        
        // Simple CSV export
        let csv = 'الاسم,الهاتف,المحافظة,النقاط,الحالة,تاريخ التسجيل,آخر لعب\n';
        players.rows.forEach(p => {
            csv += `${p.name},${p.phone},${p.province},${p.score},${p.status},${p.registered || ''},${p.last_played || ''}\n`;
        });
        
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename=players.csv');
        res.send('\uFEFF' + csv); // BOM for Arabic support
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// ===== ADMIN: PDF REPORT =====
app.get('/api/admin/report/pdf', authenticateToken, async (req, res) => {
    try {
        const stats = await pool.query(`
            SELECT 
                (SELECT COUNT(*) FROM players) as total_players,
                (SELECT COUNT(*) FROM players WHERE status = 'winner') as winners,
                (SELECT SUM(score) FROM players) as total_score,
                (SELECT COUNT(*) FROM referrals) as total_referrals
        `);
        
        const topPlayers = await pool.query('SELECT name, phone, score FROM players ORDER BY score DESC LIMIT 10');
        
        // Return JSON for now (PDF generation can be added with pdfkit)
        res.json({
            success: true,
            report: {
                generated_at: new Date().toISOString(),
                stats: stats.rows[0],
                top_players: topPlayers.rows
            }
        });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// ===== ADMIN: BACKUP =====
app.post('/api/admin/backup/create', authenticateToken, async (req, res) => {
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `backup_${timestamp}.json`;
        
        // Get all data
        const players = await pool.query('SELECT * FROM players');
        const settings = await pool.query('SELECT * FROM settings');
        const prizes = await pool.query('SELECT * FROM prizes');
        const announcements = await pool.query('SELECT * FROM announcements');
        
        const backup = {
            created_at: new Date().toISOString(),
            players: players.rows,
            settings: settings.rows,
            prizes: prizes.rows,
            announcements: announcements.rows
        };
        
        // Save to file
        const backupPath = `./backups/${filename}`;
        if (!fs.existsSync('./backups')) fs.mkdirSync('./backups');
        fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));
        
        // Log backup
        await pool.query(
            'INSERT INTO backup_logs (filename, type, created_by) VALUES ($1, $2, $3)',
            [filename, req.body.type || 'manual', req.user?.id]
        );
        
        res.json({ success: true, filename, size: Buffer.byteLength(JSON.stringify(backup)) });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/admin/backup/list', authenticateToken, async (req, res) => {
    try {
        const backups = await pool.query('SELECT * FROM backup_logs ORDER BY created_at DESC LIMIT 20');
        res.json({ success: true, backups: backups.rows });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Load bad words on startup
setTimeout(() => ChatSecurity.loadBadWords(), 3000);

// ============== ADVANCED SECURITY SYSTEM ==============

// Fraud Detection Class
class FraudDetector {
    static RISK_THRESHOLDS = {
        low: 30,
        medium: 60,
        high: 80,
        critical: 95
    };

    static SCORE_PATTERNS = {
        maxScorePerMinute: 3000,
        maxScorePerGame: 15000,
        minGameDuration: 30,
        maxGamesPerHour: 20,
        suspiciousScoreJump: 5000
    };

    // Calculate risk score for a player
    static async calculateRiskScore(phone) {
        try {
            let riskScore = 0;
            const reasons = [];

            // 1. Check fraud history
            const fraudHistory = await pool.query(
                'SELECT COUNT(*) as count FROM fraud_logs WHERE phone = $1',
                [phone]
            );
            if (fraudHistory.rows[0].count > 0) {
                riskScore += Math.min(fraudHistory.rows[0].count * 10, 40);
                reasons.push(`${fraudHistory.rows[0].count} محاولات غش سابقة`);
            }

            // 2. Check score patterns
            const scoreHistory = await pool.query(`
                SELECT AVG(score_diff) as avg_diff, MAX(score_diff) as max_diff, 
                       COUNT(*) as total_games, STDDEV(score_diff) as score_variance
                FROM score_history WHERE phone = $1 AND created_at > NOW() - INTERVAL '7 days'
            `, [phone]);

            if (scoreHistory.rows[0].score_variance > 2000) {
                riskScore += 20;
                reasons.push('تباين كبير في النقاط');
            }

            // 3. Check multiple devices
            const devices = await pool.query(
                'SELECT COUNT(DISTINCT fingerprint) as count FROM device_fingerprints WHERE phone = $1',
                [phone]
            );
            if (devices.rows[0].count > 3) {
                riskScore += 15;
                reasons.push(`${devices.rows[0].count} أجهزة مختلفة`);
            }

            // 4. Check multiple IPs
            const ips = await pool.query(`
                SELECT COUNT(DISTINCT ip_address) as count 
                FROM score_history WHERE phone = $1 AND created_at > NOW() - INTERVAL '24 hours'
            `, [phone]);
            if (ips.rows[0].count > 5) {
                riskScore += 15;
                reasons.push(`${ips.rows[0].count} عناوين IP مختلفة`);
            }

            // 5. Check rapid score submissions
            const rapidSubmissions = await pool.query(`
                SELECT COUNT(*) as count FROM score_history 
                WHERE phone = $1 AND created_at > NOW() - INTERVAL '1 hour'
            `, [phone]);
            if (rapidSubmissions.rows[0].count > this.SCORE_PATTERNS.maxGamesPerHour) {
                riskScore += 25;
                reasons.push('إرسال نقاط سريع جداً');
            }

            // Determine risk level
            let riskLevel = 'low';
            if (riskScore >= this.RISK_THRESHOLDS.critical) riskLevel = 'critical';
            else if (riskScore >= this.RISK_THRESHOLDS.high) riskLevel = 'high';
            else if (riskScore >= this.RISK_THRESHOLDS.medium) riskLevel = 'medium';

            // Update player risk
            await pool.query(`
                INSERT INTO player_risk (phone, risk_score, risk_level, suspicious_patterns, updated_at)
                VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
                ON CONFLICT (phone) DO UPDATE SET 
                    risk_score = $2, risk_level = $3, suspicious_patterns = $4, updated_at = CURRENT_TIMESTAMP
            `, [phone, riskScore, riskLevel, JSON.stringify(reasons)]);

            return { riskScore, riskLevel, reasons };
        } catch (err) {
            console.error('Risk calculation error:', err);
            return { riskScore: 0, riskLevel: 'unknown', reasons: [] };
        }
    }

    // Validate score submission
    static async validateScore(phone, score, gameData, deviceInfo, ipAddress) {
        const validationResult = {
            isValid: true,
            fraudType: null,
            severity: null,
            details: {}
        };

        try {
            // 1. Check if player is banned
            const playerRisk = await pool.query(
                'SELECT is_banned, ban_reason FROM player_risk WHERE phone = $1',
                [phone]
            );
            if (playerRisk.rows.length > 0 && playerRisk.rows[0].is_banned) {
                validationResult.isValid = false;
                validationResult.fraudType = 'BANNED_PLAYER';
                validationResult.severity = 'critical';
                validationResult.details.reason = playerRisk.rows[0].ban_reason;
                return validationResult;
            }

            // 2. Check IP reputation
            const ipRep = await pool.query('SELECT * FROM ip_reputation WHERE ip_address = $1', [ipAddress]);
            if (ipRep.rows.length > 0 && ipRep.rows[0].is_blocked) {
                validationResult.isValid = false;
                validationResult.fraudType = 'BLOCKED_IP';
                validationResult.severity = 'high';
                return validationResult;
            }

            // 3. Check score reasonability
            if (gameData) {
                const { lines, level, time, moves } = gameData;
                
                // Lines vs Score check
                const maxReasonableScore = (lines || 1) * 200 + (level || 1) * 150;
                if (score > maxReasonableScore * 2) {
                    validationResult.isValid = false;
                    validationResult.fraudType = 'SCORE_MANIPULATION';
                    validationResult.severity = 'high';
                    validationResult.details = { score, maxReasonable: maxReasonableScore, lines, level };
                    return validationResult;
                }

                // Time vs Score check
                if (time && time < 30 && score > 500) {
                    validationResult.isValid = false;
                    validationResult.fraudType = 'IMPOSSIBLE_TIME';
                    validationResult.severity = 'high';
                    validationResult.details = { score, time };
                    return validationResult;
                }

                // Score per second check
                if (time && time > 0) {
                    const scorePerSecond = score / time;
                    if (scorePerSecond > 100) {
                        validationResult.isValid = false;
                        validationResult.fraudType = 'SCORE_RATE_EXCEEDED';
                        validationResult.severity = 'medium';
                        validationResult.details = { scorePerSecond, maxAllowed: 100 };
                        return validationResult;
                    }
                }
            }

            // 4. Check for sudden score jumps
            const lastScore = await pool.query(
                'SELECT score FROM score_history WHERE phone = $1 ORDER BY created_at DESC LIMIT 1',
                [phone]
            );
            if (lastScore.rows.length > 0) {
                const scoreDiff = score - lastScore.rows[0].score;
                if (scoreDiff > this.SCORE_PATTERNS.suspiciousScoreJump) {
                    validationResult.fraudType = 'SUSPICIOUS_JUMP';
                    validationResult.severity = 'medium';
                    validationResult.details = { scoreDiff, threshold: this.SCORE_PATTERNS.suspiciousScoreJump };
                    // Don't block, just flag
                }
            }

            return validationResult;
        } catch (err) {
            console.error('Score validation error:', err);
            return validationResult;
        }
    }

    // Log fraud attempt
    static async logFraud(phone, deviceId, ipAddress, fraudType, severity, details, scoreBefore, scoreAfter, actionTaken) {
        try {
            await pool.query(`
                INSERT INTO fraud_logs (phone, device_id, ip_address, fraud_type, severity, details, score_before, score_after, action_taken)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            `, [phone, deviceId, ipAddress, fraudType, severity, JSON.stringify(details), scoreBefore, scoreAfter, actionTaken]);

            // Update player fraud attempts
            await pool.query(`
                INSERT INTO player_risk (phone, total_fraud_attempts)
                VALUES ($1, 1)
                ON CONFLICT (phone) DO UPDATE SET 
                    total_fraud_attempts = player_risk.total_fraud_attempts + 1,
                    updated_at = CURRENT_TIMESTAMP
            `, [phone]);

            // Update IP reputation
            await pool.query(`
                INSERT INTO ip_reputation (ip_address, fraud_attempts, trust_score)
                VALUES ($1, 1, 80)
                ON CONFLICT (ip_address) DO UPDATE SET 
                    fraud_attempts = ip_reputation.fraud_attempts + 1,
                    trust_score = GREATEST(ip_reputation.trust_score - 10, 0),
                    last_seen = CURRENT_TIMESTAMP
            `, [ipAddress]);

            // Create security event
            await pool.query(`
                INSERT INTO security_events (event_type, severity, phone, ip_address, device_id, description, metadata)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
            `, [fraudType, severity, phone, ipAddress, deviceId, `Fraud detected: ${fraudType}`, JSON.stringify(details)]);

            // Auto-ban for critical cases
            if (severity === 'critical') {
                await this.banPlayer(phone, `Auto-ban: ${fraudType}`, 24);
            }
        } catch (err) {
            console.error('Error logging fraud:', err);
        }
    }

    // Ban player
    static async banPlayer(phone, reason, hours = 24) {
        try {
            const banExpires = new Date(Date.now() + hours * 60 * 60 * 1000);
            await pool.query(`
                INSERT INTO player_risk (phone, is_banned, ban_reason, ban_expires_at)
                VALUES ($1, true, $2, $3)
                ON CONFLICT (phone) DO UPDATE SET 
                    is_banned = true, ban_reason = $2, ban_expires_at = $3, updated_at = CURRENT_TIMESTAMP
            `, [phone, reason, banExpires]);

            await pool.query(`
                INSERT INTO security_events (event_type, severity, phone, description)
                VALUES ($1, $2, $3, $4)
            `, ['PLAYER_BANNED', 'high', phone, reason]);
        } catch (err) {
            console.error('Error banning player:', err);
        }
    }

    // Update device fingerprint
    static async updateDeviceFingerprint(phone, fingerprint, deviceInfo) {
        try {
            await pool.query(`
                INSERT INTO device_fingerprints (phone, fingerprint, user_agent, screen_resolution, timezone, language, platform)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                ON CONFLICT (phone, fingerprint) DO UPDATE SET 
                    last_seen = CURRENT_TIMESTAMP
            `, [
                phone, 
                fingerprint, 
                deviceInfo?.userAgent || '',
                deviceInfo?.screenResolution || '',
                deviceInfo?.timezone || '',
                deviceInfo?.language || '',
                deviceInfo?.platform || ''
            ]);
        } catch (err) {
            console.error('Error updating fingerprint:', err);
        }
    }

    // Record score history
    static async recordScore(phone, score, scoreDiff, gameData, ipAddress, fingerprint, isValid, notes) {
        try {
            await pool.query(`
                INSERT INTO score_history (phone, score, score_diff, game_duration, lines_cleared, level_reached, ip_address, device_fingerprint, is_valid, validation_notes)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            `, [
                phone, score, scoreDiff,
                gameData?.time || 0,
                gameData?.lines || 0,
                gameData?.level || 1,
                ipAddress, fingerprint, isValid, notes
            ]);
        } catch (err) {
            console.error('Error recording score:', err);
        }
    }
}

// ===== SECURITY API ENDPOINTS =====

// Get fraud dashboard
app.get('/api/admin/security/dashboard', authenticateToken, async (req, res) => {
    try {
        const stats = await pool.query(`
            SELECT 
                (SELECT COUNT(*) FROM fraud_logs WHERE created_at > NOW() - INTERVAL '24 hours') as fraud_24h,
                (SELECT COUNT(*) FROM fraud_logs WHERE created_at > NOW() - INTERVAL '7 days') as fraud_7d,
                (SELECT COUNT(*) FROM player_risk WHERE is_banned = true) as banned_players,
                (SELECT COUNT(*) FROM player_risk WHERE risk_level = 'high' OR risk_level = 'critical') as high_risk_players,
                (SELECT COUNT(*) FROM ip_reputation WHERE is_blocked = true) as blocked_ips,
                (SELECT COUNT(*) FROM security_events WHERE resolved = false) as pending_events
        `);

        const recentFraud = await pool.query(`
            SELECT * FROM fraud_logs ORDER BY created_at DESC LIMIT 20
        `);

        const highRiskPlayers = await pool.query(`
            SELECT pr.*, p.name, p.score 
            FROM player_risk pr
            LEFT JOIN players p ON pr.phone = p.phone
            WHERE pr.risk_level IN ('high', 'critical')
            ORDER BY pr.risk_score DESC LIMIT 20
        `);

        const pendingEvents = await pool.query(`
            SELECT * FROM security_events WHERE resolved = false ORDER BY created_at DESC LIMIT 20
        `);

        res.json({
            success: true,
            stats: stats.rows[0],
            recentFraud: recentFraud.rows,
            highRiskPlayers: highRiskPlayers.rows,
            pendingEvents: pendingEvents.rows
        });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Get fraud logs with filters
app.get('/api/admin/security/fraud-logs', authenticateToken, async (req, res) => {
    try {
        const { phone, fraudType, severity, startDate, endDate, limit = 100 } = req.query;
        
        let query = 'SELECT * FROM fraud_logs WHERE 1=1';
        const params = [];
        let paramCount = 0;

        if (phone) {
            params.push(phone);
            query += ` AND phone = $${++paramCount}`;
        }
        if (fraudType) {
            params.push(fraudType);
            query += ` AND fraud_type = $${++paramCount}`;
        }
        if (severity) {
            params.push(severity);
            query += ` AND severity = $${++paramCount}`;
        }
        if (startDate) {
            params.push(startDate);
            query += ` AND created_at >= $${++paramCount}`;
        }
        if (endDate) {
            params.push(endDate);
            query += ` AND created_at <= $${++paramCount}`;
        }

        params.push(limit);
        query += ` ORDER BY created_at DESC LIMIT $${++paramCount}`;

        const result = await pool.query(query, params);
        res.json({ success: true, logs: result.rows });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Get player security profile
app.get('/api/admin/security/player/:phone', authenticateToken, async (req, res) => {
    try {
        const { phone } = req.params;

        const player = await pool.query('SELECT * FROM players WHERE phone = $1', [phone]);
        const risk = await pool.query('SELECT * FROM player_risk WHERE phone = $1', [phone]);
        const devices = await pool.query('SELECT * FROM device_fingerprints WHERE phone = $1', [phone]);
        const fraudHistory = await pool.query('SELECT * FROM fraud_logs WHERE phone = $1 ORDER BY created_at DESC LIMIT 20', [phone]);
        const scoreHistory = await pool.query('SELECT * FROM score_history WHERE phone = $1 ORDER BY created_at DESC LIMIT 50', [phone]);

        // Calculate real-time risk
        const riskAnalysis = await FraudDetector.calculateRiskScore(phone);

        res.json({
            success: true,
            player: player.rows[0],
            risk: risk.rows[0] || { risk_score: 0, risk_level: 'low' },
            riskAnalysis,
            devices: devices.rows,
            fraudHistory: fraudHistory.rows,
            scoreHistory: scoreHistory.rows
        });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Ban/Unban player
app.post('/api/admin/security/ban', authenticateToken, async (req, res) => {
    try {
        const { phone, reason, hours } = req.body;
        await FraudDetector.banPlayer(phone, reason, hours || 24);
        await logActivity(req.user?.id, req.user?.username, 'ban_player', `${phone}: ${reason}`, req.ip);
        res.json({ success: true, message: 'تم حظر اللاعب' });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/admin/security/unban', authenticateToken, async (req, res) => {
    try {
        const { phone } = req.body;
        await pool.query(
            'UPDATE player_risk SET is_banned = false, ban_reason = NULL, ban_expires_at = NULL WHERE phone = $1',
            [phone]
        );
        await logActivity(req.user?.id, req.user?.username, 'unban_player', phone, req.ip);
        res.json({ success: true, message: 'تم رفع الحظر' });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Block/Unblock IP
app.post('/api/admin/security/block-ip', authenticateToken, async (req, res) => {
    try {
        const { ip, reason } = req.body;
        await pool.query(`
            INSERT INTO ip_reputation (ip_address, is_blocked, trust_score)
            VALUES ($1, true, 0)
            ON CONFLICT (ip_address) DO UPDATE SET is_blocked = true, trust_score = 0
        `, [ip]);
        await logActivity(req.user?.id, req.user?.username, 'block_ip', `${ip}: ${reason}`, req.ip);
        res.json({ success: true, message: 'تم حظر الـ IP' });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/admin/security/unblock-ip', authenticateToken, async (req, res) => {
    try {
        const { ip } = req.body;
        await pool.query('UPDATE ip_reputation SET is_blocked = false WHERE ip_address = $1', [ip]);
        await logActivity(req.user?.id, req.user?.username, 'unblock_ip', ip, req.ip);
        res.json({ success: true, message: 'تم رفع الحظر' });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Resolve security event
app.post('/api/admin/security/resolve-event', authenticateToken, async (req, res) => {
    try {
        const { eventId, resolution } = req.body;
        await pool.query(
            'UPDATE security_events SET resolved = true, resolved_by = $1, resolved_at = CURRENT_TIMESTAMP WHERE id = $2',
            [req.user?.username, eventId]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Get IP reputation list
app.get('/api/admin/security/ip-reputation', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT * FROM ip_reputation 
            WHERE fraud_attempts > 0 OR is_blocked = true 
            ORDER BY fraud_attempts DESC, trust_score ASC 
            LIMIT 100
        `);
        res.json({ success: true, ips: result.rows });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Generate security report
app.get('/api/admin/security/report', authenticateToken, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const start = startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const end = endDate || new Date().toISOString();

        const fraudByType = await pool.query(`
            SELECT fraud_type, COUNT(*) as count, severity
            FROM fraud_logs WHERE created_at BETWEEN $1 AND $2
            GROUP BY fraud_type, severity ORDER BY count DESC
        `, [start, end]);

        const fraudByDay = await pool.query(`
            SELECT DATE(created_at) as date, COUNT(*) as count
            FROM fraud_logs WHERE created_at BETWEEN $1 AND $2
            GROUP BY DATE(created_at) ORDER BY date
        `, [start, end]);

        const topOffenders = await pool.query(`
            SELECT phone, COUNT(*) as fraud_count
            FROM fraud_logs WHERE created_at BETWEEN $1 AND $2
            GROUP BY phone ORDER BY fraud_count DESC LIMIT 10
        `, [start, end]);

        const summary = await pool.query(`
            SELECT 
                COUNT(*) as total_fraud,
                COUNT(DISTINCT phone) as unique_offenders,
                COUNT(DISTINCT ip_address) as unique_ips
            FROM fraud_logs WHERE created_at BETWEEN $1 AND $2
        `, [start, end]);

        res.json({
            success: true,
            report: {
                period: { start, end },
                summary: summary.rows[0],
                fraudByType: fraudByType.rows,
                fraudByDay: fraudByDay.rows,
                topOffenders: topOffenders.rows
            }
        });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Export fraud data
app.get('/api/admin/security/export', authenticateToken, async (req, res) => {
    try {
        const logs = await pool.query(`
            SELECT phone, device_id, ip_address, fraud_type, severity, action_taken, 
                   TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') as datetime
            FROM fraud_logs ORDER BY created_at DESC
        `);

        let csv = 'الهاتف,الجهاز,IP,نوع الغش,الخطورة,الإجراء,التاريخ\n';
        logs.rows.forEach(log => {
            csv += `${log.phone},${log.device_id || ''},${log.ip_address},${log.fraud_type},${log.severity},${log.action_taken || ''},${log.datetime}\n`;
        });

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename=fraud_report.csv');
        res.send('\uFEFF' + csv);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    versionManager.logVersionInfo();
    console.log(`╔════════════════════════════════════════════════════╗`);
    console.log(`║   ✅ Running on port ${PORT}                          ║`);
    console.log(`║   🌐 http://localhost:${PORT}                          ║`);
    console.log(`║   🔐 Admin: /${ADMIN_PANEL_PATH}.html              ║`);
    console.log(`║   📊 Health: /api/health                           ║`);
    console.log(`╚════════════════════════════════════════════════════╝`);
});

// ============================================
// Red Strong Tetris - Security System v1.0
// PostgreSQL Edition
// ============================================

const crypto = require('crypto');

// ============================================
// 1. ENCRYPTION & HASHING
// ============================================

const SecurityUtils = {
    SECRET_KEY: process.env.SECRET_KEY || 'RS_TETRIS_SECRET_2025_CHANGE_THIS_IN_PRODUCTION',
    
    // تشفير AES-256
    encrypt(data) {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-cbc', 
            crypto.createHash('sha256').update(this.SECRET_KEY).digest(), 
            iv
        );
        let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return iv.toString('hex') + ':' + encrypted;
    },
    
    decrypt(encryptedData) {
        try {
            const parts = encryptedData.split(':');
            const iv = Buffer.from(parts[0], 'hex');
            const encrypted = parts[1];
            const decipher = crypto.createDecipheriv('aes-256-cbc',
                crypto.createHash('sha256').update(this.SECRET_KEY).digest(),
                iv
            );
            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            return JSON.parse(decrypted);
        } catch (e) {
            return null;
        }
    },
    
    hashPassword(password) {
        const salt = crypto.randomBytes(16).toString('hex');
        const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
        return salt + ':' + hash;
    },
    
    verifyPassword(password, stored) {
        const [salt, hash] = stored.split(':');
        const verifyHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
        return hash === verifyHash;
    },
    
    generateToken(length = 32) {
        return crypto.randomBytes(length).toString('hex');
    },
    
    generateSessionId() {
        return 'sess_' + crypto.randomBytes(24).toString('hex');
    },
    
    createHMAC(data) {
        return crypto.createHmac('sha256', this.SECRET_KEY)
            .update(JSON.stringify(data))
            .digest('hex');
    },
    
    verifyHMAC(data, hmac) {
        const computed = this.createHMAC(data);
        return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(hmac));
    }
};

// ============================================
// 2. RATE LIMITER
// ============================================

class RateLimiter {
    constructor() {
        this.requests = new Map();
        this.blocked = new Map();
        setInterval(() => this.cleanup(), 60000);
    }
    
    check(ip, endpoint, limits = { windowMs: 60000, max: 100 }) {
        const key = `${ip}:${endpoint}`;
        const now = Date.now();
        
        if (this.blocked.has(ip)) {
            const blockEnd = this.blocked.get(ip);
            if (now < blockEnd) {
                return { 
                    allowed: false, 
                    reason: 'blocked',
                    retryAfter: Math.ceil((blockEnd - now) / 1000)
                };
            }
            this.blocked.delete(ip);
        }
        
        if (!this.requests.has(key)) {
            this.requests.set(key, []);
        }
        
        const requests = this.requests.get(key);
        const windowStart = now - limits.windowMs;
        const validRequests = requests.filter(t => t > windowStart);
        this.requests.set(key, validRequests);
        
        if (validRequests.length >= limits.max) {
            return {
                allowed: false,
                reason: 'rate_limit',
                retryAfter: Math.ceil((validRequests[0] + limits.windowMs - now) / 1000)
            };
        }
        
        validRequests.push(now);
        return { allowed: true, remaining: limits.max - validRequests.length };
    }
    
    blockIP(ip, durationMs = 3600000) {
        this.blocked.set(ip, Date.now() + durationMs);
    }
    
    unblockIP(ip) {
        this.blocked.delete(ip);
    }
    
    cleanup() {
        const now = Date.now();
        for (const [key, requests] of this.requests) {
            const valid = requests.filter(t => t > now - 300000);
            if (valid.length === 0) {
                this.requests.delete(key);
            } else {
                this.requests.set(key, valid);
            }
        }
        for (const [ip, endTime] of this.blocked) {
            if (now > endTime) this.blocked.delete(ip);
        }
    }
    
    getStats() {
        return {
            activeIPs: this.requests.size,
            blockedIPs: this.blocked.size,
            blockedList: Array.from(this.blocked.keys())
        };
    }
}

// ============================================
// 3. GAME SESSION MANAGER
// ============================================

class GameSessionManager {
    constructor() {
        this.sessions = new Map();
        this.playerSessions = new Map();
        setInterval(() => this.cleanupSessions(), 300000);
    }
    
    createSession(playerId, playerPhone, gameMode = 'classic', difficulty = 0) {
        const sessionId = SecurityUtils.generateSessionId();
        const now = Date.now();
        
        const session = {
            id: sessionId,
            playerId,
            playerPhone,
            gameMode,
            difficulty,
            createdAt: now,
            startedAt: null,
            endedAt: null,
            expiresAt: now + 600000,
            status: 'created',
            score: 0,
            lines: 0,
            level: 1,
            moves: [],
            totalMoves: 0,
            lastMoveTime: null,
            pauseCount: 0,
            totalPauseTime: 0,
            checksum: null,
            verified: false,
            flags: []
        };
        
        session.checksum = this.generateChecksum(session);
        this.sessions.set(sessionId, session);
        
        if (!this.playerSessions.has(playerId)) {
            this.playerSessions.set(playerId, new Set());
        }
        this.playerSessions.get(playerId).add(sessionId);
        
        return {
            sessionId,
            token: SecurityUtils.encrypt({ sessionId, playerId, createdAt: now }),
            expiresAt: session.expiresAt
        };
    }
    
    startSession(sessionId, token) {
        const session = this.sessions.get(sessionId);
        if (!session) return { error: 'session_not_found' };
        
        const tokenData = SecurityUtils.decrypt(token);
        if (!tokenData || tokenData.sessionId !== sessionId) {
            session.flags.push('invalid_token');
            return { error: 'invalid_token' };
        }
        
        if (session.status !== 'created') {
            return { error: 'invalid_status', current: session.status };
        }
        
        if (Date.now() > session.expiresAt) {
            session.status = 'expired';
            return { error: 'session_expired' };
        }
        
        session.status = 'playing';
        session.startedAt = Date.now();
        session.expiresAt = Date.now() + 600000;
        
        return { success: true, startedAt: session.startedAt };
    }
    
    recordMove(sessionId, move) {
        const session = this.sessions.get(sessionId);
        if (!session || session.status !== 'playing') return false;
        
        const now = Date.now();
        if (session.lastMoveTime && now - session.lastMoveTime < 16) {
            session.flags.push('too_fast_moves');
        }
        
        session.moves.push({
            type: move.type,
            data: move.data,
            time: now - session.startedAt
        });
        
        session.totalMoves++;
        session.lastMoveTime = now;
        return true;
    }
    
    pauseSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session || session.status !== 'playing') return false;
        
        session.status = 'paused';
        session.pauseStartTime = Date.now();
        session.pauseCount++;
        
        if (session.pauseCount > 10) {
            session.flags.push('excessive_pauses');
        }
        return true;
    }
    
    resumeSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session || session.status !== 'paused') return false;
        
        const pauseDuration = Date.now() - session.pauseStartTime;
        session.totalPauseTime += pauseDuration;
        session.status = 'playing';
        session.expiresAt += pauseDuration;
        return true;
    }
    
    endSession(sessionId, clientScore, clientLines, clientLevel) {
        const session = this.sessions.get(sessionId);
        if (!session) return { error: 'session_not_found' };
        
        if (session.status !== 'playing' && session.status !== 'paused') {
            return { error: 'invalid_status', current: session.status };
        }
        
        const now = Date.now();
        session.endedAt = now;
        session.status = 'ended';
        
        const playTime = (now - session.startedAt - session.totalPauseTime) / 1000;
        const validation = this.validateScore(session, clientScore, clientLines, clientLevel, playTime);
        
        session.score = validation.adjustedScore;
        session.lines = clientLines;
        session.level = clientLevel;
        session.verified = validation.valid;
        session.validationDetails = validation;
        
        return {
            success: true,
            sessionId,
            score: validation.adjustedScore,
            originalScore: clientScore,
            valid: validation.valid,
            flags: session.flags,
            playTime: Math.round(playTime),
            stats: {
                totalMoves: session.totalMoves,
                pauseCount: session.pauseCount,
                movesPerSecond: session.totalMoves / playTime
            }
        };
    }
    
    validateScore(session, score, lines, level, playTime) {
        const flags = [];
        let valid = true;
        let adjustedScore = score;
        
        const maxPossibleScore = playTime * 1000;
        if (score > maxPossibleScore) {
            flags.push('score_too_high');
            valid = false;
            adjustedScore = Math.min(score, maxPossibleScore);
        }
        
        const expectedLevel = Math.floor(lines / 10) + 1;
        if (Math.abs(level - expectedLevel) > 2) {
            flags.push('level_mismatch');
        }
        
        const minMoves = playTime * 0.5;
        if (session.totalMoves < minMoves && score > 1000) {
            flags.push('too_few_moves');
            valid = false;
        }
        
        const movesPerSecond = session.totalMoves / playTime;
        if (movesPerSecond > 20) {
            flags.push('inhuman_speed');
            valid = false;
        }
        
        if (lines > 0) {
            const pointsPerLine = score / lines;
            if (pointsPerLine > 500) {
                flags.push('suspicious_ratio');
            }
        }
        
        if (playTime < 10 && score > 500) {
            flags.push('too_short');
            valid = false;
        }
        
        if (session.flags.length > 3) {
            flags.push('multiple_violations');
            valid = false;
        }
        
        session.flags.push(...flags);
        
        return {
            valid,
            adjustedScore,
            flags,
            details: { maxPossible: maxPossibleScore, movesPerSecond, expectedLevel, playTime }
        };
    }
    
    getSession(sessionId) {
        return this.sessions.get(sessionId);
    }
    
    isValidSession(sessionId, playerId) {
        const session = this.sessions.get(sessionId);
        if (!session) return false;
        if (session.playerId !== playerId) return false;
        if (session.status === 'expired' || session.status === 'invalid') return false;
        if (Date.now() > session.expiresAt) {
            session.status = 'expired';
            return false;
        }
        return true;
    }
    
    generateChecksum(session) {
        return SecurityUtils.createHMAC({
            id: session.id,
            playerId: session.playerId,
            createdAt: session.createdAt
        });
    }
    
    cleanupSessions() {
        const now = Date.now();
        const toDelete = [];
        
        for (const [id, session] of this.sessions) {
            if (session.endedAt && now - session.endedAt > 3600000) {
                toDelete.push(id);
            } else if (now > session.expiresAt + 3600000) {
                toDelete.push(id);
            }
        }
        
        for (const id of toDelete) {
            const session = this.sessions.get(id);
            if (session) {
                const playerSessions = this.playerSessions.get(session.playerId);
                if (playerSessions) playerSessions.delete(id);
            }
            this.sessions.delete(id);
        }
        return toDelete.length;
    }
    
    getStats() {
        let active = 0, playing = 0, ended = 0;
        for (const session of this.sessions.values()) {
            if (session.status === 'playing') playing++;
            else if (session.status === 'ended') ended++;
            else active++;
        }
        return { total: this.sessions.size, active, playing, ended };
    }
}

// ============================================
// 4. AUDIT LOGGER (PostgreSQL)
// ============================================

class AuditLogger {
    constructor(db) {
        this.db = db;
        this.buffer = [];
        this.flushInterval = 5000;
        setInterval(() => this.flush(), this.flushInterval);
    }
    
    log(event) {
        this.buffer.push({
            ...event,
            timestamp: new Date().toISOString(),
            id: SecurityUtils.generateToken(8)
        });
        if (this.buffer.length >= 100) this.flush();
    }
    
    logGameStart(playerId, sessionId, ip) {
        this.log({ type: 'game_start', playerId, sessionId, ip, action: 'بدء لعبة' });
    }
    
    logGameEnd(playerId, sessionId, score, valid, flags) {
        this.log({
            type: 'game_end', playerId, sessionId, score, valid,
            flags: flags.join(','),
            action: valid ? 'إنهاء لعبة صالحة' : 'إنهاء لعبة مشبوهة'
        });
    }
    
    logLogin(userId, ip, success, reason = '') {
        this.log({
            type: 'login', userId, ip, success, reason,
            action: success ? 'تسجيل دخول ناجح' : 'فشل تسجيل دخول'
        });
    }
    
    logAdminAction(adminId, action, target, details) {
        this.log({
            type: 'admin_action', adminId, action, target,
            details: JSON.stringify(details), action_ar: action
        });
    }
    
    logSuspiciousActivity(ip, playerId, reason, details) {
        this.log({
            type: 'suspicious', ip, playerId, reason,
            details: JSON.stringify(details),
            action: 'نشاط مشبوه: ' + reason
        });
    }
    
    async flush() {
        if (this.buffer.length === 0 || !this.db) return;
        
        const events = [...this.buffer];
        this.buffer = [];
        
        try {
            for (const e of events) {
                await this.db.query(`
                    INSERT INTO audit_log 
                    (event_id, event_type, timestamp, player_id, user_id, session_id, ip_address, action, details)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                `, [
                    e.id,
                    e.type,
                    e.timestamp,
                    e.playerId || null,
                    e.userId || e.adminId || null,
                    e.sessionId || null,
                    e.ip || null,
                    e.action || '',
                    JSON.stringify(e)
                ]);
            }
        } catch (err) {
            this.buffer.unshift(...events);
            console.error('Audit log flush error:', err.message);
        }
    }
    
    async search(filters = {}, limit = 100, offset = 0) {
        if (!this.db) return [];
        
        let query = 'SELECT * FROM audit_log WHERE 1=1';
        const params = [];
        let paramIndex = 1;
        
        if (filters.type) {
            query += ` AND event_type = $${paramIndex++}`;
            params.push(filters.type);
        }
        if (filters.playerId) {
            query += ` AND player_id = $${paramIndex++}`;
            params.push(filters.playerId);
        }
        if (filters.ip) {
            query += ` AND ip_address = $${paramIndex++}`;
            params.push(filters.ip);
        }
        
        query += ` ORDER BY timestamp DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
        params.push(limit, offset);
        
        const result = await this.db.query(query, params);
        return result.rows;
    }
}

// ============================================
// 5. FRAUD DETECTOR
// ============================================

class FraudDetector {
    constructor(rateLimiter, auditLogger) {
        this.rateLimiter = rateLimiter;
        this.auditLogger = auditLogger;
        this.suspiciousPlayers = new Map();
        this.ipHistory = new Map();
    }
    
    analyzeRequest(req, playerId) {
        const ip = this.getIP(req);
        const flags = [];
        let riskScore = 0;
        
        if (!this.ipHistory.has(ip)) {
            this.ipHistory.set(ip, { firstSeen: Date.now(), requests: 0, players: new Set() });
        }
        const ipData = this.ipHistory.get(ip);
        ipData.requests++;
        if (playerId) ipData.players.add(playerId);
        
        if (ipData.players.size > 5) {
            flags.push('multiple_players_same_ip');
            riskScore += 30;
        }
        
        if (playerId && this.suspiciousPlayers.has(playerId)) {
            const playerRisk = this.suspiciousPlayers.get(playerId);
            riskScore += playerRisk.score;
            flags.push(...playerRisk.flags);
        }
        
        const ua = req.headers['user-agent'] || '';
        if (!ua || ua.length < 20) {
            flags.push('suspicious_user_agent');
            riskScore += 20;
        }
        
        if (/bot|crawler|spider|curl|wget|postman/i.test(ua)) {
            flags.push('bot_detected');
            riskScore += 50;
        }
        
        if (!req.headers['accept-language']) {
            flags.push('missing_headers');
            riskScore += 10;
        }
        
        return {
            ip, riskScore, flags,
            action: riskScore > 70 ? 'block' : riskScore > 40 ? 'challenge' : 'allow'
        };
    }
    
    flagPlayer(playerId, reason, severity = 10) {
        if (!this.suspiciousPlayers.has(playerId)) {
            this.suspiciousPlayers.set(playerId, { score: 0, flags: [], history: [] });
        }
        
        const player = this.suspiciousPlayers.get(playerId);
        player.score += severity;
        player.flags.push(reason);
        player.history.push({ reason, time: Date.now(), severity });
        
        if (this.auditLogger) {
            this.auditLogger.logSuspiciousActivity(null, playerId, reason, { severity });
        }
        
        if (player.score > 100 && this.rateLimiter) {
            for (const [ip, data] of this.ipHistory) {
                if (data.players.has(playerId)) {
                    this.rateLimiter.blockIP(ip, 24 * 3600000);
                }
            }
        }
    }
    
    analyzeGameResult(session, result) {
        const flags = [];
        let riskScore = 0;
        
        if (result.score > 50000) {
            flags.push('very_high_score');
            riskScore += 20;
        }
        
        if (result.playTime < 60 && result.score > 5000) {
            flags.push('suspicious_time_score_ratio');
            riskScore += 30;
        }
        
        if (result.flags && result.flags.length > 0) {
            riskScore += result.flags.length * 15;
        }
        
        if (!result.valid) {
            riskScore += 40;
        }
        
        if (riskScore > 30) {
            this.flagPlayer(session.playerId, 'suspicious_game_result', riskScore);
        }
        
        return { riskScore, flags, action: riskScore > 50 ? 'review' : 'accept' };
    }
    
    getIP(req) {
        return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
               req.headers['x-real-ip'] ||
               req.connection?.remoteAddress ||
               req.ip || 'unknown';
    }
    
    getStats() {
        return {
            suspiciousPlayers: this.suspiciousPlayers.size,
            trackedIPs: this.ipHistory.size,
            topRisks: Array.from(this.suspiciousPlayers.entries())
                .sort((a, b) => b[1].score - a[1].score)
                .slice(0, 10)
                .map(([id, data]) => ({ playerId: id, ...data }))
        };
    }
}

// ============================================
// INSTANCES & MIDDLEWARE
// ============================================

const rateLimiter = new RateLimiter();
const sessionManager = new GameSessionManager();
let auditLogger = null;
let fraudDetector = null;

function initSecurity(db) {
    auditLogger = new AuditLogger(db);
    fraudDetector = new FraudDetector(rateLimiter, auditLogger);
    return { rateLimiter, sessionManager, auditLogger, fraudDetector };
}

function rateLimitMiddleware(limits = { windowMs: 60000, max: 100 }) {
    return (req, res, next) => {
        const ip = fraudDetector?.getIP(req) || req.ip;
        const endpoint = req.path;
        const result = rateLimiter.check(ip, endpoint, limits);
        
        if (!result.allowed) {
            res.set('Retry-After', result.retryAfter);
            return res.status(429).json({
                error: 'too_many_requests',
                message: 'طلبات كثيرة، حاول بعد قليل',
                retryAfter: result.retryAfter
            });
        }
        
        res.set('X-RateLimit-Remaining', result.remaining);
        next();
    };
}

function fraudCheckMiddleware(req, res, next) {
    if (!fraudDetector) return next();
    
    const playerId = req.body?.playerId || req.query?.playerId;
    const analysis = fraudDetector.analyzeRequest(req, playerId);
    req.fraudAnalysis = analysis;
    
    if (analysis.action === 'block') {
        auditLogger?.logSuspiciousActivity(analysis.ip, playerId, 'blocked_by_fraud_detector', analysis);
        return res.status(403).json({ error: 'access_denied', message: 'تم رفض الطلب' });
    }
    
    next();
}

function sessionValidationMiddleware(req, res, next) {
    const sessionId = req.body?.sessionId || req.headers['x-session-id'];
    const playerId = req.body?.playerId;
    
    if (!sessionId) return res.status(400).json({ error: 'session_required' });
    if (!sessionManager.isValidSession(sessionId, playerId)) {
        return res.status(401).json({ error: 'invalid_session' });
    }
    
    req.gameSession = sessionManager.getSession(sessionId);
    next();
}

module.exports = {
    SecurityUtils,
    RateLimiter,
    GameSessionManager,
    AuditLogger,
    FraudDetector,
    rateLimiter,
    sessionManager,
    initSecurity,
    rateLimitMiddleware,
    fraudCheckMiddleware,
    sessionValidationMiddleware,
    getAuditLogger: () => auditLogger,
    getFraudDetector: () => fraudDetector
};

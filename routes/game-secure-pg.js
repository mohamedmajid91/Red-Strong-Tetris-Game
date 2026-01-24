// ============================================
// Red Strong Tetris - Secure Game Routes
// PostgreSQL Edition
// ============================================

const express = require('express');
const router = express.Router();
const {
    sessionManager,
    rateLimitMiddleware,
    fraudCheckMiddleware,
    getAuditLogger,
    getFraudDetector,
    SecurityUtils
} = require('../middleware/security-pg');

// ============================================
// GAME SESSION ROUTES
// ============================================

/**
 * POST /api/game/start
 * بدء جلسة لعبة جديدة
 */
router.post('/start',
    rateLimitMiddleware({ windowMs: 60000, max: 10 }),
    fraudCheckMiddleware,
    async (req, res) => {
        try {
            const { playerId, playerPhone, gameMode = 'classic', difficulty = 0 } = req.body;
            
            if (!playerId || !playerPhone) {
                return res.status(400).json({ error: 'missing_data', message: 'بيانات ناقصة' });
            }
            
            const fraudAnalysis = req.fraudAnalysis;
            if (fraudAnalysis?.riskScore > 50) {
                return res.status(403).json({ error: 'high_risk', message: 'يرجى المحاولة لاحقاً' });
            }
            
            const session = sessionManager.createSession(playerId, playerPhone, gameMode, difficulty);
            
            const auditLogger = getAuditLogger();
            const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.ip;
            auditLogger?.logGameStart(playerId, session.sessionId, ip);
            
            res.json({
                success: true,
                sessionId: session.sessionId,
                token: session.token,
                expiresAt: session.expiresAt,
                gameMode,
                difficulty
            });
            
        } catch (error) {
            console.error('Game start error:', error);
            res.status(500).json({ error: 'server_error', message: 'خطأ في السيرفر' });
        }
    }
);

/**
 * POST /api/game/begin
 * بدء اللعب فعلياً
 */
router.post('/begin',
    rateLimitMiddleware({ windowMs: 60000, max: 20 }),
    async (req, res) => {
        try {
            const { sessionId, token } = req.body;
            
            if (!sessionId || !token) {
                return res.status(400).json({ error: 'missing_data' });
            }
            
            const result = sessionManager.startSession(sessionId, token);
            
            if (result.error) {
                return res.status(400).json(result);
            }
            
            res.json({ success: true, startedAt: result.startedAt });
            
        } catch (error) {
            console.error('Game begin error:', error);
            res.status(500).json({ error: 'server_error' });
        }
    }
);

/**
 * POST /api/game/move
 * تسجيل حركة
 */
router.post('/move',
    rateLimitMiddleware({ windowMs: 1000, max: 30 }),
    async (req, res) => {
        try {
            const { sessionId, move } = req.body;
            if (!sessionId || !move) {
                return res.status(400).json({ error: 'missing_data' });
            }
            const recorded = sessionManager.recordMove(sessionId, move);
            res.json({ success: recorded });
        } catch (error) {
            res.status(500).json({ error: 'server_error' });
        }
    }
);

/**
 * POST /api/game/pause
 */
router.post('/pause',
    rateLimitMiddleware({ windowMs: 60000, max: 30 }),
    async (req, res) => {
        try {
            const { sessionId } = req.body;
            if (!sessionId) return res.status(400).json({ error: 'missing_session' });
            const paused = sessionManager.pauseSession(sessionId);
            res.json({ success: paused });
        } catch (error) {
            res.status(500).json({ error: 'server_error' });
        }
    }
);

/**
 * POST /api/game/resume
 */
router.post('/resume',
    rateLimitMiddleware({ windowMs: 60000, max: 30 }),
    async (req, res) => {
        try {
            const { sessionId } = req.body;
            if (!sessionId) return res.status(400).json({ error: 'missing_session' });
            const resumed = sessionManager.resumeSession(sessionId);
            res.json({ success: resumed });
        } catch (error) {
            res.status(500).json({ error: 'server_error' });
        }
    }
);

/**
 * POST /api/game/end
 * إنهاء اللعبة وحفظ النتيجة
 */
router.post('/end',
    rateLimitMiddleware({ windowMs: 60000, max: 10 }),
    fraudCheckMiddleware,
    async (req, res) => {
        try {
            const { sessionId, score, lines, level } = req.body;
            
            if (!sessionId) {
                return res.status(400).json({ error: 'missing_session' });
            }
            
            const result = sessionManager.endSession(sessionId, score, lines, level);
            
            if (result.error) {
                return res.status(400).json(result);
            }
            
            const fraudDetector = getFraudDetector();
            const session = sessionManager.getSession(sessionId);
            const fraudAnalysis = fraudDetector?.analyzeGameResult(session, result);
            
            const auditLogger = getAuditLogger();
            auditLogger?.logGameEnd(session.playerId, sessionId, result.score, result.valid, result.flags);
            
            // حفظ في قاعدة البيانات
            let savedToDb = false;
            if (result.valid && req.db) {
                try {
                    await req.db.query(`
                        INSERT INTO game_sessions 
                        (session_id, player_id, score, lines, level, play_time, valid, flags, created_at, ended_at)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
                    `, [
                        sessionId,
                        session.playerId,
                        result.score,
                        lines,
                        level,
                        result.playTime,
                        result.valid,
                        result.flags.join(',')
                    ]);
                    
                    // تحديث نقاط اللاعب
                    await req.db.query(`
                        UPDATE players 
                        SET total_score = COALESCE(total_score, 0) + $1,
                            games_played = COALESCE(games_played, 0) + 1,
                            best_score = GREATEST(COALESCE(best_score, 0), $2),
                            last_played_at = NOW()
                        WHERE id = $3
                    `, [result.score, result.score, session.playerId]);
                    
                    savedToDb = true;
                } catch (dbError) {
                    console.error('DB save error:', dbError);
                }
            }
            
            res.json({
                success: true,
                score: result.score,
                originalScore: score,
                valid: result.valid,
                saved: savedToDb,
                stats: result.stats,
                flags: result.valid ? [] : result.flags,
                review: fraudAnalysis?.action === 'review'
            });
            
        } catch (error) {
            console.error('Game end error:', error);
            res.status(500).json({ error: 'server_error' });
        }
    }
);

/**
 * GET /api/game/session/:id
 */
router.get('/session/:id', async (req, res) => {
    try {
        const session = sessionManager.getSession(req.params.id);
        if (!session) return res.status(404).json({ error: 'not_found' });
        
        res.json({
            id: session.id,
            playerId: session.playerId,
            status: session.status,
            score: session.score,
            lines: session.lines,
            level: session.level,
            flags: session.flags,
            verified: session.verified,
            createdAt: session.createdAt,
            startedAt: session.startedAt,
            endedAt: session.endedAt,
            stats: { totalMoves: session.totalMoves, pauseCount: session.pauseCount }
        });
    } catch (error) {
        res.status(500).json({ error: 'server_error' });
    }
});

/**
 * GET /api/game/stats
 */
router.get('/stats', async (req, res) => {
    try {
        const sessionStats = sessionManager.getStats();
        const fraudStats = getFraudDetector()?.getStats() || {};
        res.json({ sessions: sessionStats, security: fraudStats });
    } catch (error) {
        res.status(500).json({ error: 'server_error' });
    }
});

// ============================================
// LEADERBOARD ROUTES
// ============================================

/**
 * GET /api/game/leaderboard
 */
router.get('/leaderboard',
    rateLimitMiddleware({ windowMs: 60000, max: 30 }),
    async (req, res) => {
        try {
            const { type = 'daily', limit = 20 } = req.query;
            
            if (!req.db) {
                return res.status(500).json({ error: 'database_unavailable' });
            }
            
            let dateFilter = '';
            if (type === 'daily') {
                dateFilter = "AND DATE(gs.created_at) = CURRENT_DATE";
            } else if (type === 'weekly') {
                dateFilter = "AND gs.created_at >= NOW() - INTERVAL '7 days'";
            } else if (type === 'monthly') {
                dateFilter = "AND gs.created_at >= NOW() - INTERVAL '30 days'";
            }
            
            const result = await req.db.query(`
                SELECT 
                    p.id,
                    p.name,
                    p.province,
                    COALESCE(SUM(gs.score), 0) as total_score,
                    COALESCE(MAX(gs.score), 0) as best_score,
                    COUNT(gs.id) as games_count
                FROM players p
                JOIN game_sessions gs ON p.id = gs.player_id
                WHERE gs.valid = TRUE ${dateFilter}
                GROUP BY p.id, p.name, p.province
                ORDER BY total_score DESC
                LIMIT $1
            `, [parseInt(limit)]);
            
            res.json({
                type,
                leaderboard: result.rows.map((row, index) => ({
                    rank: index + 1,
                    name: row.name,
                    province: row.province,
                    totalScore: parseInt(row.total_score),
                    bestScore: parseInt(row.best_score),
                    gamesCount: parseInt(row.games_count)
                }))
            });
            
        } catch (error) {
            console.error('Leaderboard error:', error);
            res.status(500).json({ error: 'server_error' });
        }
    }
);

/**
 * GET /api/game/my-rank
 */
router.get('/my-rank',
    rateLimitMiddleware({ windowMs: 60000, max: 30 }),
    async (req, res) => {
        try {
            const { playerId, type = 'daily' } = req.query;
            
            if (!playerId || !req.db) {
                return res.status(400).json({ error: 'missing_data' });
            }
            
            let dateFilter = '';
            if (type === 'daily') {
                dateFilter = "AND DATE(gs.created_at) = CURRENT_DATE";
            } else if (type === 'weekly') {
                dateFilter = "AND gs.created_at >= NOW() - INTERVAL '7 days'";
            }
            
            const playerResult = await req.db.query(`
                SELECT COALESCE(SUM(score), 0) as total_score
                FROM game_sessions
                WHERE player_id = $1 AND valid = TRUE ${dateFilter}
            `, [playerId]);
            
            const playerScore = parseInt(playerResult.rows[0]?.total_score || 0);
            
            if (playerScore === 0) {
                return res.json({ rank: null, totalScore: 0 });
            }
            
            const rankResult = await req.db.query(`
                SELECT COUNT(*) + 1 as rank
                FROM (
                    SELECT player_id, SUM(score) as total
                    FROM game_sessions
                    WHERE valid = TRUE ${dateFilter}
                    GROUP BY player_id
                    HAVING SUM(score) > $1
                ) as better_players
            `, [playerScore]);
            
            res.json({
                rank: parseInt(rankResult.rows[0].rank),
                totalScore: playerScore
            });
            
        } catch (error) {
            console.error('My rank error:', error);
            res.status(500).json({ error: 'server_error' });
        }
    }
);

module.exports = router;

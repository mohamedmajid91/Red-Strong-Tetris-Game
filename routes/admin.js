const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const XLSX = require('xlsx');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { generatePrizeCode, logActivity } = require('../utils/helpers');

// Send WhatsApp (import from main)
let sendWhatsApp = async () => false;
const setSendWhatsApp = (fn) => { sendWhatsApp = fn; };

// Stats
router.get('/stats', authenticateToken, async (req, res) => {
    try {
        const total = await pool.query('SELECT COUNT(*) FROM players');
        const winners = await pool.query("SELECT COUNT(*) FROM players WHERE status IN ('winner', 'claimed')");
        const claimed = await pool.query("SELECT COUNT(*) FROM players WHERE status = 'claimed'");
        const pending = await pool.query("SELECT COUNT(*) FROM players WHERE status = 'winner'");
        const provinceStats = await pool.query(
            'SELECT province, COUNT(*) as count FROM players GROUP BY province ORDER BY count DESC'
        );
        
        res.json({
            total: parseInt(total.rows[0].count),
            winners: parseInt(winners.rows[0].count),
            claimed: parseInt(claimed.rows[0].count),
            pending: parseInt(pending.rows[0].count),
            provinceStats: provinceStats.rows
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get Players
router.get('/players', authenticateToken, async (req, res) => {
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

// Set Winner
router.post('/set-winner/:id', authenticateToken, async (req, res) => {
    try {
        const prizeCode = generatePrizeCode();
        const result = await pool.query(
            "UPDATE players SET status = 'winner', prize_code = $1, won_at = CURRENT_TIMESTAMP WHERE id = $2 AND status = 'registered' RETURNING *",
            [prizeCode, req.params.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'اللاعب غير موجود أو فائز مسبقاً' });
        }
        
        const winner = result.rows[0];
        const msg = '🎉 مبروك ' + winner.name + '! لقد فزت بجائزة من Red Strong! كود الجائزة: ' + winner.prize_code + ' - راجع أقرب فرع لاستلام جائزتك.';
        sendWhatsApp(winner.phone, msg);
        
        res.json({ success: true, player: winner });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Charts - Summary
router.get('/charts/summary', authenticateToken, async (req, res) => {
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

// Charts - Registrations
router.get('/charts/registrations', authenticateToken, async (req, res) => {
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

// Charts - Provinces
router.get('/charts/provinces', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT province, COUNT(*) as count 
            FROM players GROUP BY province ORDER BY count DESC
        `);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Export Players Excel
router.get('/export/players', authenticateToken, async (req, res) => {
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

// Export Winners Excel
router.get('/export/winners', authenticateToken, async (req, res) => {
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

// 2FA Setup
router.post('/2fa/setup', authenticateToken, async (req, res) => {
    try {
        const secret = speakeasy.generateSecret({
            name: 'Red Strong Tetris (' + req.user.username + ')',
            length: 20
        });
        
        const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);
        
        await pool.query(
            'UPDATE admin_users SET two_factor_secret = $1 WHERE id = $2',
            [secret.base32, req.user.id]
        );
        
        res.json({ success: true, secret: secret.base32, qrCode: qrCodeUrl });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// 2FA Verify
router.post('/2fa/verify', authenticateToken, async (req, res) => {
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

// 2FA Status
router.get('/2fa/status', authenticateToken, async (req, res) => {
    try {
        const user = await pool.query('SELECT two_factor_enabled FROM admin_users WHERE id = $1', [req.user.id]);
        res.json({ enabled: user.rows[0]?.two_factor_enabled || false });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Activity Logs
router.get('/activity-logs', authenticateToken, async (req, res) => {
    const { limit = 100 } = req.query;
    try {
        const result = await pool.query(
            'SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT $1',
            [parseInt(limit)]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Backup
router.post('/backup', authenticateToken, async (req, res) => {
    try {
        const tables = ['players', 'settings', 'prizes', 'announcements', 'branches', 'coupons'];
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
        await pool.query(
            'INSERT INTO backup_logs (filename, size_bytes, type, created_by) VALUES ($1, $2, $3, $4)',
            [filename, JSON.stringify(backup).length, 'manual', req.user?.id]
        );
        
        res.json({ success: true, backup, filename });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
module.exports.setSendWhatsApp = setSendWhatsApp;

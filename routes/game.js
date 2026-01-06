const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { getSetting, generatePrizeCode, maskPhone, provinces } = require('../utils/helpers');

// Game Status
router.get('/game-status', async (req, res) => {
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
        console.error('Error:', err);
        res.json({ enabled: true, blockedProvinces: [], requireLocation: false, cooldownMinutes: 30, maxRounds: 3, difficultyLevels: [0, 20, 40, 50] });
    }
});

// Leaderboard (masked phones)
router.get('/leaderboard', async (req, res) => {
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
        console.error('Error:', err);
        res.json([]);
    }
});

// Get Provinces
router.get('/provinces', (req, res) => {
    res.json(provinces);
});

// Get Prizes
router.get('/prizes', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM prizes WHERE active = true ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (err) {
        res.json([]);
    }
});

// Get Announcements
router.get('/announcements', async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT * FROM announcements WHERE active = true AND (expires_at IS NULL OR expires_at > NOW()) ORDER BY priority DESC, created_at DESC"
        );
        res.json(result.rows);
    } catch (err) {
        res.json([]);
    }
});

// Public Settings
router.get('/settings/public', async (req, res) => {
    try {
        const result = await pool.query('SELECT key, value FROM settings');
        const settings = {};
        result.rows.forEach(row => {
            settings[row.key] = row.value;
        });
        res.json(settings);
    } catch (err) {
        res.json({});
    }
});

module.exports = router;

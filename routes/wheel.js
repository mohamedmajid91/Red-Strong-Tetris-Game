const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { getSetting } = require('../utils/helpers');

// Get wheel configuration
router.get('/config', async (req, res) => {
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
router.post('/spin', async (req, res) => {
    const { phone } = req.body;
    try {
        const player = await pool.query('SELECT * FROM players WHERE phone = $1', [phone]);
        if (player.rows.length === 0) {
            return res.status(404).json({ error: 'اللاعب غير موجود' });
        }
        
        const minScore = parseInt(await getSetting('min_score_for_roulette', '1500'));
        if (player.rows[0].score < minScore) {
            return res.status(400).json({ error: 'النقاط غير كافية للدوران' });
        }
        
        const todaySpins = await pool.query(
            "SELECT COUNT(*) FROM wheel_spins WHERE phone = $1 AND DATE(spun_at) = CURRENT_DATE",
            [phone]
        );
        
        if (parseInt(todaySpins.rows[0].count) >= 3) {
            return res.status(400).json({ error: 'استنفدت محاولاتك اليوم (3 محاولات)' });
        }
        
        const segments = [100, 200, 0, 150, 250, 0, 300, 500];
        const weights = [20, 15, 25, 15, 10, 25, 8, 2];
        
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
        
        await pool.query(
            'INSERT INTO wheel_spins (phone, points_won) VALUES ($1, $2)',
            [phone, pointsWon]
        );
        
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
router.get('/history/:phone', async (req, res) => {
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

module.exports = router;

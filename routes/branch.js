const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const { JWT_SECRET } = require('../middleware/auth');

// Branch Login
router.post('/login', async (req, res) => {
    const { phone, password } = req.body;
    try {
        const result = await pool.query(
            'SELECT * FROM branches WHERE phone = $1 AND active = true',
            [phone]
        );
        
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'بيانات الدخول غير صحيحة' });
        }
        
        const branch = result.rows[0];
        const validPassword = await bcrypt.compare(password, branch.password);
        
        if (!validPassword) {
            return res.status(401).json({ error: 'بيانات الدخول غير صحيحة' });
        }
        
        const token = jwt.sign({ 
            branchId: branch.id, 
            branchName: branch.name,
            type: 'branch'
        }, JWT_SECRET, { expiresIn: '12h' });
        
        res.json({ 
            success: true, 
            token, 
            branch: { 
                id: branch.id, 
                name: branch.name, 
                location: branch.location,
                province: branch.province
            } 
        });
    } catch (err) {
        console.error('Branch login error:', err);
        res.status(500).json({ error: 'خطأ في الخادم' });
    }
});

// Verify Prize Code
router.post('/verify', async (req, res) => {
    const { prizeCode } = req.body;
    try {
        const result = await pool.query(
            "SELECT * FROM players WHERE prize_code = $1 AND status = 'winner'",
            [prizeCode]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'كود الجائزة غير صحيح أو مستلم مسبقاً' });
        }
        
        res.json({ success: true, player: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Claim Prize
router.post('/claim', async (req, res) => {
    const { prizeCode, branchId, employeeName, notes } = req.body;
    try {
        const player = await pool.query(
            "SELECT * FROM players WHERE prize_code = $1 AND status = 'winner'",
            [prizeCode]
        );
        
        if (player.rows.length === 0) {
            return res.status(404).json({ error: 'كود الجائزة غير صحيح أو مستلم مسبقاً' });
        }
        
        await pool.query(
            "UPDATE players SET status = 'claimed', claimed_at = CURRENT_TIMESTAMP WHERE id = $1",
            [player.rows[0].id]
        );
        
        await pool.query(
            'INSERT INTO claims (player_id, branch_id, prize_code, employee_name, notes) VALUES ($1, $2, $3, $4, $5)',
            [player.rows[0].id, branchId, prizeCode, employeeName, notes]
        );
        
        res.json({ success: true, message: 'تم تسليم الجائزة بنجاح' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;

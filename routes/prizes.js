/**
 * Prize System Routes
 * مسارات نظام الجوائز والقرعة
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');

// Middleware للمصادقة (تأكد من تعريفه في server.js)
// const authenticateToken = require('../middleware/auth').authenticateToken;

module.exports = (pool) => {
    
    // ============================================
    // PUBLIC ROUTES - للاعبين
    // ============================================
    
    /**
     * GET /api/prizes/tiers
     * جلب جميع فئات الجوائز النشطة
     */
    router.get('/tiers', async (req, res) => {
        try {
            const result = await pool.query(`
                SELECT 
                    id, name, name_en, min_score, max_score,
                    prize_name, prize_description, prize_image,
                    winners_count, draw_type, draw_date, draw_time,
                    color, icon, display_order, terms_conditions
                FROM prize_tiers
                WHERE active = true
                ORDER BY display_order ASC, min_score ASC
            `);
            
            res.json({ success: true, tiers: result.rows });
        } catch (err) {
            console.error('Error fetching prize tiers:', err);
            res.status(500).json({ success: false, error: 'فشل في جلب الجوائز' });
        }
    });
    
    /**
     * GET /api/prizes/my-entries
     * جلب مشاركات اللاعب في القرعات
     */
    router.get('/my-entries', async (req, res) => {
        const { phone } = req.query;
        
        if (!phone) {
            return res.status(400).json({ success: false, error: 'رقم الهاتف مطلوب' });
        }
        
        try {
            const result = await pool.query(`
                SELECT 
                    pe.id, pe.tier_id, pe.score, pe.total_score,
                    pe.entry_date, pe.tickets_count, pe.won,
                    pt.name as tier_name, pt.prize_name, pt.color, pt.icon
                FROM prize_entries pe
                JOIN prize_tiers pt ON pe.tier_id = pt.id
                WHERE pe.phone = $1
                ORDER BY pe.entry_date DESC
            `, [phone]);
            
            res.json({ success: true, entries: result.rows });
        } catch (err) {
            console.error('Error fetching user entries:', err);
            res.status(500).json({ success: false, error: 'فشل في جلب المشاركات' });
        }
    });
    
    /**
     * POST /api/prizes/enter
     * دخول القرعة (تسجيل مشاركة)
     */
    router.post('/enter', async (req, res) => {
        const { phone, player_name, tier_id, score, game_session_id, device_id } = req.body;
        
        // التحقق من البيانات
        if (!phone || !tier_id || !score) {
            return res.status(400).json({ success: false, error: 'بيانات ناقصة' });
        }
        
        const ip_address = req.ip || req.connection.remoteAddress;
        
        try {
            // 1. التحقق من الفئة موجودة ونشطة
            const tierCheck = await pool.query(`
                SELECT id, name, min_score, max_score, active 
                FROM prize_tiers 
                WHERE id = $1 AND active = true
            `, [tier_id]);
            
            if (tierCheck.rows.length === 0) {
                return res.status(400).json({ success: false, error: 'فئة الجائزة غير موجودة أو غير نشطة' });
            }
            
            const tier = tierCheck.rows[0];
            
            // 2. التحقق من النقاط ضمن النطاق
            if (score < tier.min_score || score > tier.max_score) {
                return res.status(400).json({ 
                    success: false, 
                    error: `النقاط يجب أن تكون بين ${tier.min_score} و ${tier.max_score}` 
                });
            }
            
            // 3. التحقق من عدم التسجيل المسبق
            const existingEntry = await pool.query(`
                SELECT id FROM prize_entries 
                WHERE phone = $1 AND tier_id = $2
            `, [phone, tier_id]);
            
            if (existingEntry.rows.length > 0) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'أنت مسجل بالفعل في هذه الفئة' 
                });
            }
            
            // 4. حساب عدد التذاكر
            const tickets_count = await pool.query(`
                SELECT calculate_tickets($1) as tickets
            `, [score]);
            
            const tickets = tickets_count.rows[0].tickets;
            
            // 5. توليد أرقام السحب العشوائية
            const lucky_numbers = [];
            for (let i = 0; i < tickets; i++) {
                lucky_numbers.push(Math.floor(Math.random() * 1000000));
            }
            
            // 6. التسجيل في القرعة
            const result = await pool.query(`
                INSERT INTO prize_entries (
                    phone, player_name, tier_id, score, total_score,
                    game_session_id, tickets_count, lucky_numbers,
                    ip_address, device_id
                ) VALUES ($1, $2, $3, $4, $4, $5, $6, $7, $8, $9)
                RETURNING id, entry_date, tickets_count, lucky_numbers
            `, [phone, player_name, tier_id, score, game_session_id, 
                tickets, JSON.stringify(lucky_numbers), ip_address, device_id]);
            
            // 7. تسجيل في Audit Log
            await pool.query(`
                INSERT INTO prize_audit_log (
                    action, entity_type, entity_id, user_phone, 
                    new_data, ip_address
                ) VALUES ($1, $2, $3, $4, $5, $6)
            `, ['entry', 'entry', result.rows[0].id, phone, 
                JSON.stringify(result.rows[0]), ip_address]);
            
            res.json({ 
                success: true, 
                message: 'تم التسجيل في القرعة بنجاح!',
                entry: result.rows[0],
                tier_name: tier.name
            });
            
        } catch (err) {
            console.error('Error entering prize draw:', err);
            
            if (err.constraint === 'prize_entries_phone_tier_id_key') {
                return res.status(400).json({ 
                    success: false, 
                    error: 'أنت مسجل بالفعل في هذه الفئة' 
                });
            }
            
            res.status(500).json({ success: false, error: 'فشل في التسجيل' });
        }
    });
    
    /**
     * GET /api/prizes/check-eligibility
     * التحقق من أهلية اللاعب لدخول فئة معينة
     */
    router.get('/check-eligibility', async (req, res) => {
        const { phone, score } = req.query;
        
        if (!phone || !score) {
            return res.status(400).json({ success: false, error: 'بيانات ناقصة' });
        }
        
        try {
            // جلب الفئات المناسبة
            const tiers = await pool.query(`
                SELECT 
                    id, name, min_score, max_score, prize_name, color, icon,
                    EXISTS(
                        SELECT 1 FROM prize_entries 
                        WHERE phone = $1 AND tier_id = prize_tiers.id
                    ) as already_entered
                FROM prize_tiers
                WHERE active = true
                    AND $2 >= min_score 
                    AND $2 <= max_score
                ORDER BY display_order ASC
            `, [phone, score]);
            
            res.json({ 
                success: true, 
                score: parseInt(score),
                eligible_tiers: tiers.rows 
            });
            
        } catch (err) {
            console.error('Error checking eligibility:', err);
            res.status(500).json({ success: false, error: 'فشل في التحقق' });
        }
    });
    
    /**
     * GET /api/prizes/winners
     * جلب قائمة الفائزين (عامة)
     */
    router.get('/winners', async (req, res) => {
        const { tier_id, limit = 50 } = req.query;
        
        try {
            let query = `
                SELECT 
                    pw.id, pw.player_name, pw.phone, pw.prize_name,
                    pw.win_date, pw.claimed, pw.tier_id,
                    pt.name as tier_name, pt.color, pt.icon
                FROM prize_winners pw
                JOIN prize_tiers pt ON pw.tier_id = pt.id
            `;
            
            const params = [];
            if (tier_id) {
                query += ` WHERE pw.tier_id = $1`;
                params.push(tier_id);
            }
            
            query += ` ORDER BY pw.win_date DESC LIMIT $${params.length + 1}`;
            params.push(limit);
            
            const result = await pool.query(query, params);
            
            // إخفاء جزء من رقم الهاتف للخصوصية
            result.rows.forEach(row => {
                if (row.phone) {
                    row.phone = row.phone.substring(0, 4) + '****' + row.phone.substring(row.phone.length - 2);
                }
            });
            
            res.json({ success: true, winners: result.rows });
            
        } catch (err) {
            console.error('Error fetching winners:', err);
            res.status(500).json({ success: false, error: 'فشل في جلب الفائزين' });
        }
    });
    
    /**
     * GET /api/prizes/my-wins
     * جلب جوائزي (للاعب)
     */
    router.get('/my-wins', async (req, res) => {
        const { phone } = req.query;
        
        if (!phone) {
            return res.status(400).json({ success: false, error: 'رقم الهاتف مطلوب' });
        }
        
        try {
            const result = await pool.query(`
                SELECT 
                    pw.id, pw.prize_name, pw.prize_description,
                    pw.win_date, pw.claimed, pw.claim_code, pw.claim_date,
                    pt.name as tier_name, pt.color, pt.icon
                FROM prize_winners pw
                JOIN prize_tiers pt ON pw.tier_id = pt.id
                WHERE pw.phone = $1
                ORDER BY pw.win_date DESC
            `, [phone]);
            
            res.json({ success: true, wins: result.rows });
            
        } catch (err) {
            console.error('Error fetching user wins:', err);
            res.status(500).json({ success: false, error: 'فشل في جلب جوائزك' });
        }
    });
    
    /**
     * GET /api/prizes/statistics
     * إحصائيات عامة عن الجوائز
     */
    router.get('/statistics', async (req, res) => {
        try {
            const result = await pool.query(`
                SELECT * FROM prize_statistics
                WHERE active = true
                ORDER BY tier_id ASC
            `);
            
            res.json({ success: true, statistics: result.rows });
            
        } catch (err) {
            console.error('Error fetching statistics:', err);
            res.status(500).json({ success: false, error: 'فشل في جلب الإحصائيات' });
        }
    });
    
    return router;
};

/**
 * Prize Admin Routes
 * مسارات إدارة الجوائز (للأدمن فقط)
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');

module.exports = (pool, authenticateToken) => {
    
    // كل المسارات تحتاج مصادقة Admin
    
    /**
     * GET /api/admin/prizes/tiers
     * جلب جميع فئات الجوائز (بما فيها غير النشطة)
     */
    router.get('/tiers', authenticateToken, async (req, res) => {
        try {
            const result = await pool.query(`
                SELECT 
                    pt.*,
                    COUNT(pe.id) as total_entries,
                    COUNT(CASE WHEN pe.won = true THEN 1 END) as total_winners
                FROM prize_tiers pt
                LEFT JOIN prize_entries pe ON pt.id = pe.tier_id
                GROUP BY pt.id
                ORDER BY pt.display_order ASC, pt.min_score ASC
            `);
            
            res.json({ success: true, tiers: result.rows });
        } catch (err) {
            console.error('Error fetching admin tiers:', err);
            res.status(500).json({ success: false, error: 'Server error' });
        }
    });
    
    /**
     * POST /api/admin/prizes/tier
     * إضافة فئة جائزة جديدة
     */
    router.post('/tier', authenticateToken, async (req, res) => {
        const {
            name, name_en, min_score, max_score, prize_name, 
            prize_description, prize_image, winners_count,
            draw_type, draw_date, draw_time, color, icon,
            display_order, terms_conditions
        } = req.body;
        
        // التحقق من البيانات الأساسية
        if (!name || !min_score || !max_score || !prize_name) {
            return res.status(400).json({ 
                success: false, 
                error: 'بيانات ناقصة (الاسم، النقاط، اسم الجائزة مطلوبة)' 
            });
        }
        
        if (min_score >= max_score) {
            return res.status(400).json({ 
                success: false, 
                error: 'الحد الأدنى يجب أن يكون أقل من الحد الأقصى' 
            });
        }
        
        try {
            // التحقق من عدم تداخل النطاقات
            const overlap = await pool.query(`
                SELECT id, name, min_score, max_score 
                FROM prize_tiers
                WHERE active = true
                    AND (
                        ($1 BETWEEN min_score AND max_score) OR
                        ($2 BETWEEN min_score AND max_score) OR
                        (min_score BETWEEN $1 AND $2) OR
                        (max_score BETWEEN $1 AND $2)
                    )
            `, [min_score, max_score]);
            
            if (overlap.rows.length > 0) {
                return res.status(400).json({ 
                    success: false, 
                    error: `تداخل في النطاق مع الفئة: ${overlap.rows[0].name}`,
                    conflicting_tier: overlap.rows[0]
                });
            }
            
            // إضافة الفئة
            const result = await pool.query(`
                INSERT INTO prize_tiers (
                    name, name_en, min_score, max_score, prize_name,
                    prize_description, prize_image, winners_count,
                    draw_type, draw_date, draw_time, color, icon,
                    display_order, terms_conditions, created_by
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
                RETURNING *
            `, [
                name, name_en, min_score, max_score, prize_name,
                prize_description, prize_image, winners_count || 1,
                draw_type || 'scheduled', draw_date, draw_time,
                color || '#ffd700', icon || '🎁', display_order || 0,
                terms_conditions, req.user?.username || 'admin'
            ]);
            
            // تسجيل في Audit Log
            await pool.query(`
                INSERT INTO prize_audit_log (
                    action, entity_type, entity_id, admin_user, new_data, ip_address
                ) VALUES ($1, $2, $3, $4, $5, $6)
            `, ['create', 'tier', result.rows[0].id, req.user?.username || 'admin',
                JSON.stringify(result.rows[0]), req.ip]);
            
            res.json({ 
                success: true, 
                message: 'تم إضافة الفئة بنجاح',
                tier: result.rows[0]
            });
            
        } catch (err) {
            console.error('Error creating tier:', err);
            res.status(500).json({ success: false, error: 'فشل في إضافة الفئة' });
        }
    });
    
    /**
     * PUT /api/admin/prizes/tier/:id
     * تعديل فئة جائزة
     */
    router.put('/tier/:id', authenticateToken, async (req, res) => {
        const { id } = req.params;
        const updates = req.body;
        
        try {
            // جلب البيانات القديمة
            const oldData = await pool.query(
                'SELECT * FROM prize_tiers WHERE id = $1', 
                [id]
            );
            
            if (oldData.rows.length === 0) {
                return res.status(404).json({ success: false, error: 'الفئة غير موجودة' });
            }
            
            // بناء استعلام التحديث ديناميكياً
            const fields = [];
            const values = [];
            let paramIndex = 1;
            
            const allowedFields = [
                'name', 'name_en', 'min_score', 'max_score', 'prize_name',
                'prize_description', 'prize_image', 'winners_count',
                'draw_type', 'draw_date', 'draw_time', 'active',
                'color', 'icon', 'display_order', 'terms_conditions'
            ];
            
            for (const field of allowedFields) {
                if (updates[field] !== undefined) {
                    fields.push(`${field} = $${paramIndex}`);
                    values.push(updates[field]);
                    paramIndex++;
                }
            }
            
            if (fields.length === 0) {
                return res.status(400).json({ success: false, error: 'لا توجد حقول للتحديث' });
            }
            
            values.push(id);
            
            const result = await pool.query(`
                UPDATE prize_tiers 
                SET ${fields.join(', ')}, updated_at = NOW()
                WHERE id = $${paramIndex}
                RETURNING *
            `, values);
            
            // تسجيل في Audit Log
            await pool.query(`
                INSERT INTO prize_audit_log (
                    action, entity_type, entity_id, admin_user,
                    old_data, new_data, ip_address
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            `, ['update', 'tier', id, req.user?.username || 'admin',
                JSON.stringify(oldData.rows[0]), 
                JSON.stringify(result.rows[0]), req.ip]);
            
            res.json({ 
                success: true, 
                message: 'تم تحديث الفئة بنجاح',
                tier: result.rows[0]
            });
            
        } catch (err) {
            console.error('Error updating tier:', err);
            res.status(500).json({ success: false, error: 'فشل في تحديث الفئة' });
        }
    });
    
    /**
     * DELETE /api/admin/prizes/tier/:id
     * حذف فئة جائزة
     */
    router.delete('/tier/:id', authenticateToken, async (req, res) => {
        const { id } = req.params;
        
        try {
            // التحقق من عدم وجود مشاركين
            const entries = await pool.query(
                'SELECT COUNT(*) as count FROM prize_entries WHERE tier_id = $1',
                [id]
            );
            
            if (entries.rows[0].count > 0) {
                return res.status(400).json({ 
                    success: false, 
                    error: `لا يمكن حذف الفئة لوجود ${entries.rows[0].count} مشاركين. قم بتعطيلها بدلاً من الحذف.` 
                });
            }
            
            // الحذف
            await pool.query('DELETE FROM prize_tiers WHERE id = $1', [id]);
            
            // تسجيل
            await pool.query(`
                INSERT INTO prize_audit_log (
                    action, entity_type, entity_id, admin_user, ip_address
                ) VALUES ($1, $2, $3, $4, $5)
            `, ['delete', 'tier', id, req.user?.username || 'admin', req.ip]);
            
            res.json({ success: true, message: 'تم حذف الفئة بنجاح' });
            
        } catch (err) {
            console.error('Error deleting tier:', err);
            res.status(500).json({ success: false, error: 'فشل في حذف الفئة' });
        }
    });
    
    /**
     * GET /api/admin/prizes/entries
     * جلب جميع المشاركات
     */
    router.get('/entries', authenticateToken, async (req, res) => {
        const { tier_id, phone, limit = 100, offset = 0 } = req.query;
        
        try {
            let query = `
                SELECT 
                    pe.*, pt.name as tier_name, pt.prize_name, pt.color
                FROM prize_entries pe
                JOIN prize_tiers pt ON pe.tier_id = pt.id
            `;
            
            const conditions = [];
            const params = [];
            let paramIndex = 1;
            
            if (tier_id) {
                conditions.push(`pe.tier_id = $${paramIndex}`);
                params.push(tier_id);
                paramIndex++;
            }
            
            if (phone) {
                conditions.push(`pe.phone LIKE $${paramIndex}`);
                params.push(`%${phone}%`);
                paramIndex++;
            }
            
            if (conditions.length > 0) {
                query += ' WHERE ' + conditions.join(' AND ');
            }
            
            query += ` ORDER BY pe.entry_date DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
            params.push(limit, offset);
            
            const result = await pool.query(query, params);
            
            // Count total
            let countQuery = 'SELECT COUNT(*) FROM prize_entries pe';
            if (conditions.length > 0) {
                countQuery += ' WHERE ' + conditions.join(' AND ');
            }
            const countResult = await pool.query(countQuery, params.slice(0, -2));
            
            res.json({ 
                success: true, 
                entries: result.rows,
                total: parseInt(countResult.rows[0].count),
                limit: parseInt(limit),
                offset: parseInt(offset)
            });
            
        } catch (err) {
            console.error('Error fetching entries:', err);
            res.status(500).json({ success: false, error: 'Server error' });
        }
    });
    
    /**
     * POST /api/admin/prizes/conduct-draw
     * إجراء السحب على جائزة
     */
    router.post('/conduct-draw', authenticateToken, async (req, res) => {
        const { tier_id } = req.body;
        
        if (!tier_id) {
            return res.status(400).json({ success: false, error: 'معرف الفئة مطلوب' });
        }
        
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');
            
            // 1. جلب معلومات الفئة
            const tierResult = await client.query(
                'SELECT * FROM prize_tiers WHERE id = $1',
                [tier_id]
            );
            
            if (tierResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ success: false, error: 'الفئة غير موجودة' });
            }
            
            const tier = tierResult.rows[0];
            
            // 2. جلب جميع المشاركات غير الفائزة
            const entriesResult = await client.query(`
                SELECT * FROM prize_entries 
                WHERE tier_id = $1 AND won = false
            `, [tier_id]);
            
            if (entriesResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({ success: false, error: 'لا توجد مشاركات!' });
            }
            
            const entries = entriesResult.rows;
            const winnersCount = Math.min(tier.winners_count, entries.length);
            
            // 3. السحب العشوائي
            const winners = [];
            const selectedIndices = new Set();
            const random_seed = crypto.randomBytes(32).toString('hex');
            
            while (winners.length < winnersCount) {
                const randomIndex = Math.floor(Math.random() * entries.length);
                
                if (!selectedIndices.has(randomIndex)) {
                    selectedIndices.add(randomIndex);
                    winners.push(entries[randomIndex]);
                }
            }
            
            // 4. تسجيل الفائزين
            for (const winner of winners) {
                const claim_code = await client.query(
                    'SELECT generate_claim_code() as code'
                );
                
                await client.query(`
                    INSERT INTO prize_winners (
                        entry_id, tier_id, phone, player_name,
                        prize_name, prize_description, draw_number, claim_code
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                `, [
                    winner.id, tier_id, winner.phone, winner.player_name,
                    tier.prize_name, tier.prize_description,
                    winner.lucky_numbers, claim_code.rows[0].code
                ]);
                
                // تحديث المشاركة
                await client.query(
                    'UPDATE prize_entries SET won = true WHERE id = $1',
                    [winner.id]
                );
            }
            
            // 5. تسجيل السحب في التاريخ
            await client.query(`
                INSERT INTO prize_draws (
                    tier_id, total_entries, winners_selected,
                    draw_algorithm, random_seed, conducted_by, results
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            `, [
                tier_id, entries.length, winnersCount,
                'random_selection', random_seed,
                req.user?.username || 'admin',
                JSON.stringify({ winners: winners.map(w => w.id) })
            ]);
            
            await client.query('COMMIT');
            
            res.json({ 
                success: true,
                message: `تم السحب بنجاح! ${winnersCount} فائز`,
                winners: winners.map(w => ({
                    id: w.id,
                    phone: w.phone,
                    player_name: w.player_name,
                    score: w.score
                })),
                total_entries: entries.length
            });
            
        } catch (err) {
            await client.query('ROLLBACK');
            console.error('Error conducting draw:', err);
            res.status(500).json({ success: false, error: 'فشل في إجراء السحب' });
        } finally {
            client.release();
        }
    });
    
    /**
     * GET /api/admin/prizes/winners
     * جلب جميع الفائزين
     */
    router.get('/winners', authenticateToken, async (req, res) => {
        const { tier_id, claimed, limit = 100 } = req.query;
        
        try {
            let query = `
                SELECT 
                    pw.*, pt.name as tier_name, pt.color
                FROM prize_winners pw
                JOIN prize_tiers pt ON pw.tier_id = pt.id
            `;
            
            const conditions = [];
            const params = [];
            let paramIndex = 1;
            
            if (tier_id) {
                conditions.push(`pw.tier_id = $${paramIndex}`);
                params.push(tier_id);
                paramIndex++;
            }
            
            if (claimed !== undefined) {
                conditions.push(`pw.claimed = $${paramIndex}`);
                params.push(claimed === 'true');
                paramIndex++;
            }
            
            if (conditions.length > 0) {
                query += ' WHERE ' + conditions.join(' AND ');
            }
            
            query += ` ORDER BY pw.win_date DESC LIMIT $${paramIndex}`;
            params.push(limit);
            
            const result = await pool.query(query, params);
            
            res.json({ success: true, winners: result.rows });
            
        } catch (err) {
            console.error('Error fetching winners:', err);
            res.status(500).json({ success: false, error: 'Server error' });
        }
    });
    
    /**
     * POST /api/admin/prizes/claim
     * تأكيد استلام جائزة
     */
    router.post('/claim', authenticateToken, async (req, res) => {
        const { claim_code, branch, notes } = req.body;
        
        if (!claim_code) {
            return res.status(400).json({ success: false, error: 'كود الاستلام مطلوب' });
        }
        
        try {
            const result = await pool.query(`
                UPDATE prize_winners
                SET claimed = true,
                    claim_date = NOW(),
                    claim_branch = $1,
                    claimed_by = $2,
                    notes = $3
                WHERE claim_code = $4 AND claimed = false
                RETURNING *
            `, [branch, req.user?.username || 'admin', notes, claim_code]);
            
            if (result.rows.length === 0) {
                return res.status(404).json({ 
                    success: false, 
                    error: 'كود غير صحيح أو تم استلام الجائزة مسبقاً' 
                });
            }
            
            // تسجيل
            await pool.query(`
                INSERT INTO prize_audit_log (
                    action, entity_type, entity_id, admin_user, new_data, ip_address
                ) VALUES ($1, $2, $3, $4, $5, $6)
            `, ['claim', 'winner', result.rows[0].id, req.user?.username || 'admin',
                JSON.stringify(result.rows[0]), req.ip]);
            
            res.json({ 
                success: true,
                message: 'تم تأكيد الاستلام بنجاح',
                winner: result.rows[0]
            });
            
        } catch (err) {
            console.error('Error claiming prize:', err);
            res.status(500).json({ success: false, error: 'فشل في تأكيد الاستلام' });
        }
    });
    
    return router;
};

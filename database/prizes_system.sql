-- ============================================
-- نظام الجوائز والعروض - Prize System
-- ============================================

-- 1. جدول فئات الجوائز (Prize Tiers)
CREATE TABLE IF NOT EXISTS prize_tiers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,              -- اسم الفئة (البرونزي، الفضي، إلخ)
    name_en VARCHAR(100),                     -- الاسم بالإنجليزية
    min_score INT NOT NULL,                   -- الحد الأدنى للنقاط
    max_score INT NOT NULL,                   -- الحد الأقصى للنقاط
    prize_name VARCHAR(200) NOT NULL,         -- اسم الجائزة
    prize_description TEXT,                   -- وصف الجائزة
    prize_image VARCHAR(255),                 -- صورة الجائزة
    winners_count INT DEFAULT 1,              -- عدد الفائزين في القرعة
    draw_type VARCHAR(50) DEFAULT 'scheduled', -- نوع السحب: instant / scheduled / manual
    draw_date TIMESTAMP,                      -- تاريخ السحب
    draw_time TIME,                           -- وقت السحب
    active BOOLEAN DEFAULT true,              -- فعّال أو لا
    color VARCHAR(7) DEFAULT '#ffd700',       -- لون الفئة (hex)
    icon VARCHAR(50) DEFAULT '🎁',            -- أيقونة الفئة
    display_order INT DEFAULT 0,              -- ترتيب العرض
    terms_conditions TEXT,                    -- الشروط والأحكام
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(50),                   -- المسؤول اللي أنشأها
    
    CONSTRAINT check_score_range CHECK (max_score >= min_score)
);

-- 2. جدول المشاركين في القرعة (Prize Entries)
CREATE TABLE IF NOT EXISTS prize_entries (
    id SERIAL PRIMARY KEY,
    phone VARCHAR(20) NOT NULL,
    player_name VARCHAR(100),
    tier_id INT NOT NULL REFERENCES prize_tiers(id) ON DELETE CASCADE,
    score INT NOT NULL,                       -- النقاط اللي دخل بيها
    total_score INT,                          -- إجمالي النقاط (تراكمي)
    game_session_id VARCHAR(50),              -- معرف الجلسة
    entry_date TIMESTAMP DEFAULT NOW(),
    lucky_numbers TEXT,                       -- أرقام السحب (JSON array)
    tickets_count INT DEFAULT 1,              -- عدد التذاكر (كل 500 نقطة = تذكرة)
    won BOOLEAN DEFAULT false,
    prize_claimed BOOLEAN DEFAULT false,
    claim_date TIMESTAMP,
    ip_address VARCHAR(45),
    device_id VARCHAR(100),
    
    UNIQUE(phone, tier_id)                    -- لاعب واحد لكل فئة
);

-- 3. جدول الفائزين (Prize Winners)
CREATE TABLE IF NOT EXISTS prize_winners (
    id SERIAL PRIMARY KEY,
    entry_id INT REFERENCES prize_entries(id) ON DELETE SET NULL,
    tier_id INT NOT NULL REFERENCES prize_tiers(id),
    phone VARCHAR(20) NOT NULL,
    player_name VARCHAR(100),
    prize_name VARCHAR(200) NOT NULL,
    prize_description TEXT,
    win_date TIMESTAMP DEFAULT NOW(),
    draw_number VARCHAR(50),                  -- رقم السحب الفائز
    claimed BOOLEAN DEFAULT false,
    claim_code VARCHAR(20) UNIQUE,            -- كود الاستلام (6 أرقام)
    claim_date TIMESTAMP,
    claim_branch VARCHAR(100),                -- الفرع اللي استلم منه
    claimed_by VARCHAR(50),                   -- الموظف اللي سلّم الجائزة
    notes TEXT,
    notified BOOLEAN DEFAULT false,           -- تم إشعاره أو لا
    notification_sent_at TIMESTAMP,
    
    INDEX idx_phone (phone),
    INDEX idx_claim_code (claim_code)
);

-- 4. جدول سجل السحوبات (Draw History)
CREATE TABLE IF NOT EXISTS prize_draws (
    id SERIAL PRIMARY KEY,
    tier_id INT NOT NULL REFERENCES prize_tiers(id),
    draw_date TIMESTAMP DEFAULT NOW(),
    total_entries INT,                        -- عدد المشاركين
    winners_selected INT,                     -- عدد الفائزين المختارين
    draw_algorithm VARCHAR(50),               -- خوارزمية السحب المستخدمة
    random_seed VARCHAR(100),                 -- البذرة العشوائية (للتحقق)
    conducted_by VARCHAR(50),                 -- المسؤول اللي أجرى السحب
    witnessed_by TEXT,                        -- الشهود (JSON array)
    video_url VARCHAR(255),                   -- رابط فيديو السحب (اختياري)
    results JSONB,                            -- نتائج السحب كاملة (JSON)
    notes TEXT,
    
    INDEX idx_tier_date (tier_id, draw_date)
);

-- 5. جدول سجل التدقيق (Audit Log)
CREATE TABLE IF NOT EXISTS prize_audit_log (
    id SERIAL PRIMARY KEY,
    action VARCHAR(50) NOT NULL,              -- entry / draw / claim / edit / delete
    entity_type VARCHAR(50),                  -- tier / entry / winner
    entity_id INT,
    user_phone VARCHAR(20),
    admin_user VARCHAR(50),
    old_data JSONB,                           -- البيانات القديمة
    new_data JSONB,                           -- البيانات الجديدة
    ip_address VARCHAR(45),
    user_agent TEXT,
    timestamp TIMESTAMP DEFAULT NOW(),
    
    INDEX idx_action_timestamp (action, timestamp),
    INDEX idx_user (user_phone, admin_user)
);

-- 6. جدول إعدادات النظام (System Settings)
CREATE TABLE IF NOT EXISTS prize_system_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    setting_type VARCHAR(50),                 -- string / number / boolean / json
    description TEXT,
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by VARCHAR(50)
);

-- ============================================
-- الإعدادات الافتراضية
-- ============================================

INSERT INTO prize_system_settings (setting_key, setting_value, setting_type, description) VALUES
('points_per_ticket', '500', 'number', 'عدد النقاط لكل تذكرة سحب'),
('max_tickets_per_entry', '20', 'number', 'الحد الأقصى لعدد التذاكر'),
('enable_cumulative_points', 'true', 'boolean', 'تفعيل النقاط التراكمية'),
('enable_referral_bonus', 'false', 'boolean', 'تفعيل مكافأة الإحالة'),
('referral_bonus_points', '500', 'number', 'نقاط مكافأة الإحالة'),
('enable_bonus_days', 'false', 'boolean', 'تفعيل أيام المضاعفة'),
('bonus_days', '["friday"]', 'json', 'أيام المضاعفة'),
('bonus_multiplier', '2', 'number', 'معامل المضاعفة'),
('auto_notify_winners', 'true', 'boolean', 'إشعار الفائزين تلقائياً'),
('claim_expiry_days', '30', 'number', 'أيام صلاحية كود الاستلام')
ON CONFLICT (setting_key) DO NOTHING;

-- ============================================
-- فئات جوائز افتراضية (أمثلة)
-- ============================================

INSERT INTO prize_tiers (name, name_en, min_score, max_score, prize_name, prize_description, winners_count, color, icon, display_order) VALUES
('البرونزي', 'Bronze', 1000, 1999, 'قوطية Red Strong', 'قوطية طاقة Red Strong حجم 250ml', 10, '#cd7f32', '🥉', 1),
('الفضي', 'Silver', 2000, 3499, 'صندوق Red Strong', 'صندوق يحتوي على 6 قواطي Red Strong', 5, '#c0c0c0', '🥈', 2),
('الذهبي', 'Gold', 3500, 5999, 'iPhone 15', 'هاتف iPhone 15 جديد', 2, '#ffd700', '🥇', 3),
('البلاتيني', 'Platinum', 6000, 9999, 'iPhone 15 Pro + AirPods', 'iPhone 15 Pro + AirPods Pro', 1, '#e5e4e2', '💎', 4),
('الماسي', 'Diamond', 10000, 999999, 'iPhone 15 Pro Max + حزمة كاملة', 'iPhone 15 Pro Max + Apple Watch + AirPods Pro', 1, '#b9f2ff', '👑', 5)
ON CONFLICT DO NOTHING;

-- ============================================
-- Indexes للأداء
-- ============================================

CREATE INDEX IF NOT EXISTS idx_entries_phone ON prize_entries(phone);
CREATE INDEX IF NOT EXISTS idx_entries_tier ON prize_entries(tier_id);
CREATE INDEX IF NOT EXISTS idx_entries_won ON prize_entries(won);
CREATE INDEX IF NOT EXISTS idx_winners_phone ON prize_winners(phone);
CREATE INDEX IF NOT EXISTS idx_winners_claimed ON prize_winners(claimed);
CREATE INDEX IF NOT EXISTS idx_tiers_active ON prize_tiers(active);
CREATE INDEX IF NOT EXISTS idx_tiers_score_range ON prize_tiers(min_score, max_score);

-- ============================================
-- Views للاستعلامات السريعة
-- ============================================

-- عرض الإحصائيات
CREATE OR REPLACE VIEW prize_statistics AS
SELECT 
    pt.id as tier_id,
    pt.name as tier_name,
    pt.prize_name,
    COUNT(pe.id) as total_entries,
    COUNT(CASE WHEN pe.won = true THEN 1 END) as total_winners,
    COUNT(CASE WHEN pw.claimed = true THEN 1 END) as total_claimed,
    pt.winners_count as target_winners,
    pt.active
FROM prize_tiers pt
LEFT JOIN prize_entries pe ON pt.id = pe.tier_id
LEFT JOIN prize_winners pw ON pt.id = pw.tier_id
GROUP BY pt.id, pt.name, pt.prize_name, pt.winners_count, pt.active;

-- ============================================
-- Functions
-- ============================================

-- دالة لتوليد كود استلام عشوائي
CREATE OR REPLACE FUNCTION generate_claim_code()
RETURNS VARCHAR(20) AS $$
DECLARE
    code VARCHAR(20);
    exists BOOLEAN;
BEGIN
    LOOP
        -- توليد كود من 6 أرقام
        code := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
        
        -- التحقق من عدم وجوده
        SELECT EXISTS(SELECT 1 FROM prize_winners WHERE claim_code = code) INTO exists;
        
        EXIT WHEN NOT exists;
    END LOOP;
    
    RETURN code;
END;
$$ LANGUAGE plpgsql;

-- دالة لحساب عدد التذاكر
CREATE OR REPLACE FUNCTION calculate_tickets(score INT)
RETURNS INT AS $$
DECLARE
    points_per_ticket INT;
    max_tickets INT;
    tickets INT;
BEGIN
    -- جلب الإعدادات
    SELECT setting_value::INT INTO points_per_ticket 
    FROM prize_system_settings WHERE setting_key = 'points_per_ticket';
    
    SELECT setting_value::INT INTO max_tickets 
    FROM prize_system_settings WHERE setting_key = 'max_tickets_per_entry';
    
    -- حساب التذاكر
    tickets := FLOOR(score / points_per_ticket);
    
    -- تطبيق الحد الأقصى
    IF tickets > max_tickets THEN
        tickets := max_tickets;
    END IF;
    
    RETURN tickets;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Triggers
-- ============================================

-- تحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_prize_tiers_updated_at
    BEFORE UPDATE ON prize_tiers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- تم إنشاء جداول نظام الجوائز بنجاح ✅
-- ============================================

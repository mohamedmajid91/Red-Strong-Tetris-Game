// ============== Enhanced Achievements System ==============
class AchievementsSystem {
    constructor() {
        this.achievements = [
            // === مبتدئ ===
            { id: 'first_game', name: 'البداية', icon: '🎮', description: 'أكمل أول لعبة', category: 'beginner', points: 10, unlocked: false },
            { id: 'score_100', name: 'أول مئة', icon: '⭐', description: 'احصل على 100 نقطة', category: 'beginner', points: 20, unlocked: false },
            { id: 'first_line', name: 'أول صف', icon: '📏', description: 'أزل أول صف', category: 'beginner', points: 15, unlocked: false },
            
            // === النقاط ===
            { id: 'score_500', name: 'متوسط', icon: '⭐⭐', description: 'احصل على 500 نقطة', category: 'score', points: 50, unlocked: false },
            { id: 'score_1000', name: 'محترف', icon: '⭐⭐⭐', description: 'احصل على 1000 نقطة', category: 'score', points: 100, unlocked: false },
            { id: 'score_2000', name: 'خبير', icon: '🏆', description: 'احصل على 2000 نقطة', category: 'score', points: 200, unlocked: false },
            { id: 'score_5000', name: 'أسطورة', icon: '👑', description: 'احصل على 5000 نقطة', category: 'score', points: 500, unlocked: false },
            { id: 'score_10000', name: 'إله التتريس', icon: '🌟', description: 'احصل على 10000 نقطة', category: 'score', points: 1000, unlocked: false },
            
            // === الصفوف ===
            { id: 'lines_10', name: 'مزيل الصفوف', icon: '📏', description: 'أزل 10 صفوف', category: 'lines', points: 30, unlocked: false },
            { id: 'lines_50', name: 'منظف', icon: '🧹', description: 'أزل 50 صف', category: 'lines', points: 80, unlocked: false },
            { id: 'lines_100', name: 'المدمر', icon: '💣', description: 'أزل 100 صف', category: 'lines', points: 150, unlocked: false },
            { id: 'lines_500', name: 'الإعصار', icon: '🌪️', description: 'أزل 500 صف', category: 'lines', points: 400, unlocked: false },
            
            // === الكومبو ===
            { id: 'double', name: 'مزدوج', icon: '✌️', description: 'أزل صفين دفعة واحدة', category: 'combo', points: 30, unlocked: false },
            { id: 'triple', name: 'ثلاثي', icon: '🔱', description: 'أزل 3 صفوف دفعة واحدة', category: 'combo', points: 60, unlocked: false },
            { id: 'tetris', name: 'تتريس!', icon: '💥', description: 'أزل 4 صفوف دفعة واحدة', category: 'combo', points: 100, unlocked: false },
            { id: 'tetris_5', name: 'سيد التتريس', icon: '🎯', description: 'اعمل 5 تتريس', category: 'combo', points: 250, unlocked: false },
            { id: 'combo_3', name: 'كومبو ثلاثي', icon: '🔥', description: '3 كومبو متتالي', category: 'combo', points: 150, unlocked: false },
            { id: 'combo_5', name: 'كومبو خماسي', icon: '🔥🔥', description: '5 كومبو متتالي', category: 'combo', points: 300, unlocked: false },
            
            // === المستويات ===
            { id: 'level_5', name: 'متسلق', icon: '🧗', description: 'وصل للمستوى 5', category: 'level', points: 50, unlocked: false },
            { id: 'level_10', name: 'جبّار', icon: '🏔️', description: 'وصل للمستوى 10', category: 'level', points: 150, unlocked: false },
            { id: 'level_15', name: 'قمة', icon: '🗻', description: 'وصل للمستوى 15', category: 'level', points: 300, unlocked: false },
            
            // === الصعوبة ===
            { id: 'easy_win', name: 'بداية سهلة', icon: '😊', description: 'احصل على 500 نقطة بالسهل', category: 'difficulty', points: 30, unlocked: false },
            { id: 'medium_win', name: 'تحدي متوسط', icon: '😐', description: 'احصل على 500 نقطة بالمتوسط', category: 'difficulty', points: 80, unlocked: false },
            { id: 'hard_win', name: 'الصعب', icon: '😈', description: 'احصل على 500 نقطة بالصعب', category: 'difficulty', points: 150, unlocked: false },
            { id: 'speed_demon', name: 'سريع البرق', icon: '⚡', description: 'احصل على 1000 نقطة بالصعب', category: 'difficulty', points: 300, unlocked: false },
            
            // === الوقت ===
            { id: 'survivor_3', name: 'الناجي', icon: '🛡️', description: 'العب 3 دقائق متواصلة', category: 'time', points: 50, unlocked: false },
            { id: 'survivor_5', name: 'الصامد', icon: '🏰', description: 'العب 5 دقائق متواصلة', category: 'time', points: 100, unlocked: false },
            { id: 'survivor_10', name: 'الخالد', icon: '♾️', description: 'العب 10 دقائق متواصلة', category: 'time', points: 250, unlocked: false },
            { id: 'quick_500', name: 'سريع', icon: '⏱️', description: '500 نقطة بدقيقتين', category: 'time', points: 200, unlocked: false },
            
            // === خاص ===
            { id: 'no_rotate', name: 'بدون دوران', icon: '🔒', description: 'احصل على 200 نقطة بدون تدوير', category: 'special', points: 150, unlocked: false },
            { id: 'close_call', name: 'نجاة بأعجوبة', icon: '😰', description: 'أزل صف والبورد ممتلئ 80%', category: 'special', points: 100, unlocked: false },
            { id: 'comeback', name: 'العودة', icon: '🔄', description: 'أزل 5 صفوف بعد امتلاء 70%', category: 'special', points: 200, unlocked: false },
            { id: 'perfectionist', name: 'المثالي', icon: '✨', description: 'أنهي لعبة بدون فراغات', category: 'special', points: 300, unlocked: false },
            
            // === يومي ===
            { id: 'daily_player', name: 'لاعب يومي', icon: '📅', description: 'العب 3 أيام متتالية', category: 'daily', points: 100, unlocked: false },
            { id: 'weekly_player', name: 'لاعب أسبوعي', icon: '📆', description: 'العب 7 أيام متتالية', category: 'daily', points: 300, unlocked: false },
            { id: 'daily_challenge', name: 'متحدي', icon: '🎯', description: 'أكمل تحدي يومي', category: 'daily', points: 50, unlocked: false },
            { id: 'all_daily', name: 'بطل اليوم', icon: '🏅', description: 'أكمل كل تحديات اليوم', category: 'daily', points: 150, unlocked: false },
            
            // === الفوز ===
            { id: 'winner', name: 'الفائز', icon: '🎁', description: 'افز بجائزة', category: 'winner', points: 500, unlocked: false },
            { id: 'top_10', name: 'من الأفضل', icon: '🏆', description: 'كن من أفضل 10', category: 'winner', points: 200, unlocked: false },
            { id: 'top_3', name: 'منصة التتويج', icon: '🥇', description: 'كن من أفضل 3', category: 'winner', points: 400, unlocked: false }
        ];
        
        this.stats = this.loadStats();
        this.load();
    }
    
    loadStats() {
        const saved = localStorage.getItem('tetris_stats');
        return saved ? JSON.parse(saved) : {
            totalGames: 0,
            totalScore: 0,
            totalLines: 0,
            totalTetris: 0,
            maxCombo: 0,
            maxLevel: 0,
            maxScore: 0,
            totalPlayTime: 0,
            daysPlayed: [],
            lastPlayed: null
        };
    }
    
    saveStats() {
        localStorage.setItem('tetris_stats', JSON.stringify(this.stats));
    }
    
    load() {
        const saved = localStorage.getItem('tetris_achievements');
        if (saved) {
            const unlocked = JSON.parse(saved);
            this.achievements.forEach(a => {
                if (unlocked.includes(a.id)) a.unlocked = true;
            });
        }
    }
    
    save() {
        const unlocked = this.achievements.filter(a => a.unlocked).map(a => a.id);
        localStorage.setItem('tetris_achievements', JSON.stringify(unlocked));
    }
    
    unlock(id) {
        const achievement = this.achievements.find(a => a.id === id);
        if (achievement && !achievement.unlocked) {
            achievement.unlocked = true;
            this.save();
            this.showNotification(achievement);
            if (typeof gameSounds !== 'undefined') gameSounds.play('achievement');
            return achievement;
        }
        return null;
    }
    
    // تحديث الإحصائيات وفحص الإنجازات
    updateStats(gameStats) {
        // تحديث الإحصائيات
        this.stats.totalGames++;
        this.stats.totalScore += gameStats.score || 0;
        this.stats.totalLines += gameStats.linesCleared || 0;
        this.stats.totalTetris += gameStats.tetrisCount || 0;
        this.stats.totalPlayTime += gameStats.playTime || 0;
        
        if (gameStats.score > this.stats.maxScore) {
            this.stats.maxScore = gameStats.score;
        }
        if (gameStats.level > this.stats.maxLevel) {
            this.stats.maxLevel = gameStats.level;
        }
        if (gameStats.maxCombo > this.stats.maxCombo) {
            this.stats.maxCombo = gameStats.maxCombo;
        }
        
        // تتبع الأيام
        const today = new Date().toDateString();
        if (!this.stats.daysPlayed.includes(today)) {
            this.stats.daysPlayed.push(today);
        }
        this.stats.lastPlayed = today;
        
        this.saveStats();
        
        // فحص الإنجازات
        this.check(gameStats);
    }
    
    check(stats) {
        const unlocked = [];
        
        // === أول لعبة ===
        if (this.stats.totalGames >= 1) {
            const a = this.unlock('first_game');
            if (a) unlocked.push(a);
        }
        
        // === النقاط ===
        if (stats.score >= 100) this.unlock('score_100');
        if (stats.score >= 500) this.unlock('score_500');
        if (stats.score >= 1000) this.unlock('score_1000');
        if (stats.score >= 2000) this.unlock('score_2000');
        if (stats.score >= 5000) this.unlock('score_5000');
        if (stats.score >= 10000) this.unlock('score_10000');
        
        // === الصفوف ===
        if (stats.linesCleared >= 1) this.unlock('first_line');
        if (this.stats.totalLines >= 10) this.unlock('lines_10');
        if (this.stats.totalLines >= 50) this.unlock('lines_50');
        if (this.stats.totalLines >= 100) this.unlock('lines_100');
        if (this.stats.totalLines >= 500) this.unlock('lines_500');
        
        // === الكومبو ===
        if (stats.lastClear === 2) this.unlock('double');
        if (stats.lastClear === 3) this.unlock('triple');
        if (stats.lastClear === 4) this.unlock('tetris');
        if (this.stats.totalTetris >= 5) this.unlock('tetris_5');
        if (stats.maxCombo >= 3) this.unlock('combo_3');
        if (stats.maxCombo >= 5) this.unlock('combo_5');
        
        // === المستويات ===
        if (stats.level >= 5) this.unlock('level_5');
        if (stats.level >= 10) this.unlock('level_10');
        if (stats.level >= 15) this.unlock('level_15');
        
        // === الصعوبة ===
        if (stats.difficulty === 'easy' && stats.score >= 500) this.unlock('easy_win');
        if (stats.difficulty === 'medium' && stats.score >= 500) this.unlock('medium_win');
        if (stats.difficulty === 'hard' && stats.score >= 500) this.unlock('hard_win');
        if (stats.difficulty === 'hard' && stats.score >= 1000) this.unlock('speed_demon');
        
        // === الوقت ===
        if (stats.playTime >= 180) this.unlock('survivor_3');
        if (stats.playTime >= 300) this.unlock('survivor_5');
        if (stats.playTime >= 600) this.unlock('survivor_10');
        if (stats.score >= 500 && stats.playTime <= 120) this.unlock('quick_500');
        
        // === خاص ===
        if (stats.rotations === 0 && stats.score >= 200) this.unlock('no_rotate');
        if (stats.closeCall) this.unlock('close_call');
        if (stats.comeback) this.unlock('comeback');
        
        // === يومي ===
        this.checkDailyStreak();
        
        return unlocked;
    }
    
    checkDailyStreak() {
        const days = this.stats.daysPlayed.sort();
        if (days.length < 3) return;
        
        // فحص التتابع
        let streak = 1;
        for (let i = days.length - 1; i > 0; i--) {
            const curr = new Date(days[i]);
            const prev = new Date(days[i - 1]);
            const diff = (curr - prev) / (1000 * 60 * 60 * 24);
            
            if (diff === 1) {
                streak++;
            } else {
                break;
            }
        }
        
        if (streak >= 3) this.unlock('daily_player');
        if (streak >= 7) this.unlock('weekly_player');
    }
    
    showNotification(achievement) {
        // إزالة الإشعارات القديمة
        document.querySelectorAll('.achievement-notification').forEach(n => n.remove());
        
        const notification = document.createElement('div');
        notification.className = 'achievement-notification';
        notification.innerHTML = `
            <div class="achievement-glow"></div>
            <div class="achievement-content">
                <div class="achievement-icon">${achievement.icon}</div>
                <div class="achievement-info">
                    <div class="achievement-title">🏆 إنجاز جديد!</div>
                    <div class="achievement-name">${achievement.name}</div>
                    <div class="achievement-desc">${achievement.description}</div>
                    <div class="achievement-points">+${achievement.points} نقطة</div>
                </div>
            </div>
        `;
        document.body.appendChild(notification);
        
        requestAnimationFrame(() => {
            notification.classList.add('show');
        });
        
        setTimeout(() => {
            notification.classList.add('hide');
            setTimeout(() => notification.remove(), 500);
        }, 4000);
    }
    
    getAll() {
        return this.achievements;
    }
    
    getByCategory(category) {
        return this.achievements.filter(a => a.category === category);
    }
    
    getUnlocked() {
        return this.achievements.filter(a => a.unlocked);
    }
    
    getTotalPoints() {
        return this.getUnlocked().reduce((sum, a) => sum + a.points, 0);
    }
    
    getProgress() {
        return {
            unlocked: this.getUnlocked().length,
            total: this.achievements.length,
            percentage: Math.round((this.getUnlocked().length / this.achievements.length) * 100)
        };
    }
    
    getStats() {
        return this.stats;
    }
    
    // عرض صفحة الإنجازات
    render(container) {
        if (!container) return;
        
        const categories = {
            beginner: 'المبتدئ',
            score: 'النقاط',
            lines: 'الصفوف',
            combo: 'الكومبو',
            level: 'المستويات',
            difficulty: 'الصعوبة',
            time: 'الوقت',
            special: 'خاص',
            daily: 'يومي',
            winner: 'الفوز'
        };
        
        const progress = this.getProgress();
        
        container.innerHTML = `
            <div class="achievements-page">
                <div class="achievements-header">
                    <h2>🏆 الإنجازات</h2>
                    <div class="achievements-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${progress.percentage}%"></div>
                        </div>
                        <span>${progress.unlocked}/${progress.total} (${progress.percentage}%)</span>
                    </div>
                    <div class="achievements-points">مجموع النقاط: ${this.getTotalPoints()}</div>
                </div>
                
                ${Object.entries(categories).map(([cat, name]) => {
                    const catAchievements = this.getByCategory(cat);
                    return `
                        <div class="achievement-category">
                            <h3>${name}</h3>
                            <div class="achievements-grid">
                                ${catAchievements.map(a => `
                                    <div class="achievement-card ${a.unlocked ? 'unlocked' : 'locked'}">
                                        <div class="achievement-icon">${a.unlocked ? a.icon : '🔒'}</div>
                                        <div class="achievement-name">${a.name}</div>
                                        <div class="achievement-desc">${a.description}</div>
                                        <div class="achievement-points">${a.points} نقطة</div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }
}

// ============== Difficulty Levels ==============
const DifficultyLevels = {
    easy: {
        name: 'سهل',
        icon: '😊',
        speed: 1000,
        speedIncrease: 50,
        pointsMultiplier: 1,
        description: 'للمبتدئين'
    },
    medium: {
        name: 'متوسط',
        icon: '😐',
        speed: 700,
        speedIncrease: 40,
        pointsMultiplier: 1.5,
        description: 'تحدي معتدل'
    },
    hard: {
        name: 'صعب',
        icon: '😈',
        speed: 400,
        speedIncrease: 30,
        pointsMultiplier: 2,
        description: 'للمحترفين'
    },
    extreme: {
        name: 'جنوني',
        icon: '💀',
        speed: 250,
        speedIncrease: 20,
        pointsMultiplier: 3,
        description: 'مستحيل تقريباً'
    }
};

// Global instance
const achievements = new AchievementsSystem();

// ============== Achievements System ==============
class AchievementsSystem {
    constructor() {
        this.achievements = [
            { id: 'first_game', name: 'البداية', icon: '🎮', description: 'أكمل أول لعبة', points: 10, unlocked: false },
            { id: 'score_100', name: 'مبتدئ', icon: '⭐', description: 'احصل على 100 نقطة', points: 20, unlocked: false },
            { id: 'score_500', name: 'متوسط', icon: '⭐⭐', description: 'احصل على 500 نقطة', points: 50, unlocked: false },
            { id: 'score_1000', name: 'محترف', icon: '⭐⭐⭐', description: 'احصل على 1000 نقطة', points: 100, unlocked: false },
            { id: 'score_2000', name: 'خبير', icon: '🏆', description: 'احصل على 2000 نقطة', points: 200, unlocked: false },
            { id: 'lines_10', name: 'مزيل الصفوف', icon: '📏', description: 'أزل 10 صفوف', points: 30, unlocked: false },
            { id: 'lines_50', name: 'منظف', icon: '🧹', description: 'أزل 50 صف', points: 80, unlocked: false },
            { id: 'combo_4', name: 'تتريس!', icon: '💥', description: 'أزل 4 صفوف دفعة واحدة', points: 100, unlocked: false },
            { id: 'speed_demon', name: 'سريع البرق', icon: '⚡', description: 'العب على المستوى الصعب', points: 150, unlocked: false },
            { id: 'survivor', name: 'الناجي', icon: '🛡️', description: 'العب 5 دقائق متواصلة', points: 120, unlocked: false },
            { id: 'winner', name: 'الفائز', icon: '🎁', description: 'افز بجائزة', points: 500, unlocked: false },
            { id: 'daily_player', name: 'لاعب يومي', icon: '📅', description: 'العب 7 أيام متتالية', points: 200, unlocked: false }
        ];
        
        this.load();
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
            if (typeof gameSounds !== 'undefined') gameSounds.play('levelUp');
            return true;
        }
        return false;
    }
    
    check(stats) {
        // فحص النقاط
        if (stats.score >= 100) this.unlock('score_100');
        if (stats.score >= 500) this.unlock('score_500');
        if (stats.score >= 1000) this.unlock('score_1000');
        if (stats.score >= 2000) this.unlock('score_2000');
        
        // فحص الصفوف
        if (stats.linesCleared >= 10) this.unlock('lines_10');
        if (stats.linesCleared >= 50) this.unlock('lines_50');
        
        // تتريس
        if (stats.lastClear === 4) this.unlock('combo_4');
        
        // أول لعبة
        if (stats.gamesPlayed >= 1) this.unlock('first_game');
        
        // المستوى الصعب
        if (stats.difficulty === 'hard') this.unlock('speed_demon');
        
        // الناجي
        if (stats.playTime >= 300) this.unlock('survivor');
    }
    
    showNotification(achievement) {
        const notification = document.createElement('div');
        notification.className = 'achievement-notification';
        notification.innerHTML = `
            <div class="achievement-icon">${achievement.icon}</div>
            <div class="achievement-info">
                <div class="achievement-title">إنجاز جديد!</div>
                <div class="achievement-name">${achievement.name}</div>
                <div class="achievement-desc">${achievement.description}</div>
            </div>
        `;
        document.body.appendChild(notification);
        
        setTimeout(() => notification.classList.add('show'), 100);
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 500);
        }, 4000);
    }
    
    getAll() {
        return this.achievements;
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
}

// ============== Difficulty Levels ==============
const DifficultyLevels = {
    easy: {
        name: 'سهل',
        icon: '😊',
        speed: 1000,
        speedIncrease: 50,
        pointsMultiplier: 1
    },
    medium: {
        name: 'متوسط',
        icon: '😐',
        speed: 700,
        speedIncrease: 40,
        pointsMultiplier: 1.5
    },
    hard: {
        name: 'صعب',
        icon: '😈',
        speed: 400,
        speedIncrease: 30,
        pointsMultiplier: 2
    }
};

// Global instance
const achievements = new AchievementsSystem();

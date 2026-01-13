// ============== Enhanced Daily Challenges System ==============
class DailyChallenges {
    constructor() {
        this.challenges = [];
        this.bonusChallenge = null;
        this.streak = 0;
        this.load();
    }
    
    load() {
        const today = new Date().toDateString();
        const saved = localStorage.getItem('tetris_daily_challenges');
        
        if (saved) {
            const data = JSON.parse(saved);
            if (data.date === today) {
                this.challenges = data.challenges;
                this.bonusChallenge = data.bonusChallenge;
                this.streak = data.streak || 0;
                return;
            } else {
                // يوم جديد - فحص التتابع
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                if (data.date === yesterday.toDateString() && data.allCompleted) {
                    this.streak = (data.streak || 0) + 1;
                } else {
                    this.streak = 0;
                }
            }
        }
        
        // إنشاء تحديات جديدة لليوم
        this.generateChallenges();
    }
    
    generateChallenges() {
        const allChallenges = [
            // تحديات النقاط
            { id: 'score_200', name: 'نقاط خفيفة', icon: '🎯', target: 200, type: 'score', reward: 30, difficulty: 'easy' },
            { id: 'score_500', name: 'هدف متوسط', icon: '🎯', target: 500, type: 'score', reward: 80, difficulty: 'medium' },
            { id: 'score_1000', name: 'الألف', icon: '🏆', target: 1000, type: 'score', reward: 150, difficulty: 'hard' },
            { id: 'score_2000', name: 'الألفين', icon: '👑', target: 2000, type: 'score', reward: 300, difficulty: 'extreme' },
            
            // تحديات الصفوف
            { id: 'lines_5', name: '5 صفوف', icon: '📏', target: 5, type: 'lines', reward: 25, difficulty: 'easy' },
            { id: 'lines_10', name: '10 صفوف', icon: '📏', target: 10, type: 'lines', reward: 50, difficulty: 'medium' },
            { id: 'lines_20', name: '20 صف', icon: '📏', target: 20, type: 'lines', reward: 100, difficulty: 'hard' },
            { id: 'lines_30', name: '30 صف', icon: '📏', target: 30, type: 'lines', reward: 180, difficulty: 'extreme' },
            
            // تحديات الألعاب
            { id: 'games_2', name: 'لعبتين', icon: '🎮', target: 2, type: 'games', reward: 20, difficulty: 'easy' },
            { id: 'games_5', name: '5 ألعاب', icon: '🎮', target: 5, type: 'games', reward: 60, difficulty: 'medium' },
            { id: 'games_10', name: '10 ألعاب', icon: '🎮', target: 10, type: 'games', reward: 120, difficulty: 'hard' },
            
            // تحديات التتريس
            { id: 'tetris_1', name: 'تتريس واحد', icon: '💥', target: 1, type: 'tetris', reward: 80, difficulty: 'medium' },
            { id: 'tetris_3', name: '3 تتريس', icon: '💥', target: 3, type: 'tetris', reward: 200, difficulty: 'hard' },
            { id: 'tetris_5', name: '5 تتريس', icon: '💥', target: 5, type: 'tetris', reward: 350, difficulty: 'extreme' },
            
            // تحديات الوقت
            { id: 'time_3', name: '3 دقائق', icon: '⏱️', target: 180, type: 'time', reward: 40, difficulty: 'easy' },
            { id: 'time_5', name: '5 دقائق', icon: '⏱️', target: 300, type: 'time', reward: 80, difficulty: 'medium' },
            { id: 'time_10', name: '10 دقائق', icon: '⏱️', target: 600, type: 'time', reward: 150, difficulty: 'hard' },
            
            // تحديات المستوى
            { id: 'level_3', name: 'مستوى 3', icon: '📈', target: 3, type: 'level', reward: 35, difficulty: 'easy' },
            { id: 'level_5', name: 'مستوى 5', icon: '📈', target: 5, type: 'level', reward: 70, difficulty: 'medium' },
            { id: 'level_10', name: 'مستوى 10', icon: '📈', target: 10, type: 'level', reward: 200, difficulty: 'hard' },
            
            // تحديات الكومبو
            { id: 'combo_2', name: 'كومبو مزدوج', icon: '🔥', target: 2, type: 'combo', reward: 50, difficulty: 'medium' },
            { id: 'combo_3', name: 'كومبو ثلاثي', icon: '🔥', target: 3, type: 'combo', reward: 100, difficulty: 'hard' },
            { id: 'combo_5', name: 'كومبو خماسي', icon: '🔥', target: 5, type: 'combo', reward: 250, difficulty: 'extreme' },
            
            // تحديات الصعوبة
            { id: 'hard_300', name: '300 بالصعب', icon: '😈', target: 300, type: 'hard_score', reward: 100, difficulty: 'hard' },
            { id: 'hard_500', name: '500 بالصعب', icon: '😈', target: 500, type: 'hard_score', reward: 200, difficulty: 'extreme' }
        ];
        
        // اختيار تحديات متنوعة
        const easy = allChallenges.filter(c => c.difficulty === 'easy');
        const medium = allChallenges.filter(c => c.difficulty === 'medium');
        const hard = allChallenges.filter(c => c.difficulty === 'hard');
        
        // خلط واختيار
        const shuffle = arr => arr.sort(() => 0.5 - Math.random());
        
        this.challenges = [
            { ...shuffle(easy)[0], progress: 0, completed: false },
            { ...shuffle(medium)[0], progress: 0, completed: false },
            { ...shuffle(hard)[0], progress: 0, completed: false }
        ];
        
        // تحدي بونص (إذا عندك streak)
        if (this.streak >= 3) {
            const extreme = allChallenges.filter(c => c.difficulty === 'extreme');
            this.bonusChallenge = {
                ...shuffle(extreme)[0],
                progress: 0,
                completed: false,
                isBonus: true,
                reward: Math.floor(shuffle(extreme)[0].reward * (1 + this.streak * 0.1)) // مكافأة أكبر مع الـ streak
            };
        }
        
        this.save();
    }
    
    save() {
        const allCompleted = this.challenges.every(c => c.completed);
        const data = {
            date: new Date().toDateString(),
            challenges: this.challenges,
            bonusChallenge: this.bonusChallenge,
            streak: this.streak,
            allCompleted
        };
        localStorage.setItem('tetris_daily_challenges', JSON.stringify(data));
    }
    
    update(stats) {
        let newlyCompleted = [];
        let bonusPoints = 0;
        
        // تحديث التحديات العادية
        this.challenges.forEach(challenge => {
            if (challenge.completed) return;
            
            let progress = this.getProgress(challenge, stats);
            challenge.progress = Math.min(progress, challenge.target);
            
            if (challenge.progress >= challenge.target) {
                challenge.completed = true;
                newlyCompleted.push(challenge);
            }
        });
        
        // تحديث تحدي البونص
        if (this.bonusChallenge && !this.bonusChallenge.completed) {
            let progress = this.getProgress(this.bonusChallenge, stats);
            this.bonusChallenge.progress = Math.min(progress, this.bonusChallenge.target);
            
            if (this.bonusChallenge.progress >= this.bonusChallenge.target) {
                this.bonusChallenge.completed = true;
                newlyCompleted.push(this.bonusChallenge);
            }
        }
        
        // فحص إذا كل التحديات مكتملة
        const allCompleted = this.challenges.every(c => c.completed);
        if (allCompleted && !this._bonusAwarded) {
            this._bonusAwarded = true;
            bonusPoints = 100 + (this.streak * 20); // بونص إضافي
            
            // فتح إنجاز
            if (typeof achievements !== 'undefined') {
                achievements.unlock('daily_challenge');
                achievements.unlock('all_daily');
            }
        }
        
        if (newlyCompleted.length > 0) {
            this.save();
            newlyCompleted.forEach(c => this.showReward(c));
        }
        
        return { completed: newlyCompleted, bonusPoints };
    }
    
    getProgress(challenge, stats) {
        switch (challenge.type) {
            case 'score':
                return stats.score || 0;
            case 'lines':
                return stats.linesCleared || 0;
            case 'games':
                return stats.gamesPlayed || 0;
            case 'tetris':
                return stats.tetrisCount || 0;
            case 'time':
                return stats.playTime || 0;
            case 'level':
                return stats.level || 0;
            case 'combo':
                return stats.maxCombo || 0;
            case 'hard_score':
                return stats.difficulty === 'hard' ? (stats.score || 0) : 0;
            default:
                return 0;
        }
    }
    
    showReward(challenge) {
        const notification = document.createElement('div');
        notification.className = 'challenge-notification';
        
        const isBonus = challenge.isBonus;
        
        notification.innerHTML = `
            <div class="challenge-glow ${isBonus ? 'bonus' : ''}"></div>
            <div class="challenge-content">
                <div class="challenge-icon">${challenge.icon}</div>
                <div class="challenge-info">
                    <div class="challenge-title">${isBonus ? '⭐ تحدي بونص!' : '✅ تحدي مكتمل!'}</div>
                    <div class="challenge-name">${challenge.name}</div>
                    <div class="challenge-reward">+${challenge.reward} نقطة</div>
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
        
        if (typeof gameSounds !== 'undefined') {
            gameSounds.play(isBonus ? 'win' : 'success');
        }
    }
    
    getAll() {
        const all = [...this.challenges];
        if (this.bonusChallenge) all.push(this.bonusChallenge);
        return all;
    }
    
    getCompleted() {
        return this.getAll().filter(c => c.completed);
    }
    
    getTotalRewards() {
        return this.getCompleted().reduce((sum, c) => sum + c.reward, 0);
    }
    
    getStreak() {
        return this.streak;
    }
    
    render(container) {
        if (!container) return;
        
        const allCompleted = this.challenges.every(c => c.completed);
        const totalReward = this.challenges.reduce((sum, c) => sum + c.reward, 0);
        const earnedReward = this.getCompleted().reduce((sum, c) => sum + c.reward, 0);
        
        container.innerHTML = `
            <div class="daily-challenges">
                <div class="challenges-header">
                    <h3>🎯 تحديات اليوم</h3>
                    ${this.streak > 0 ? `<div class="streak-badge">🔥 ${this.streak} يوم متتالي</div>` : ''}
                </div>
                
                <div class="challenges-progress-bar">
                    <div class="progress" style="width: ${(earnedReward / totalReward) * 100}%"></div>
                    <span>${earnedReward}/${totalReward}</span>
                </div>
                
                <div class="challenges-list">
                    ${this.challenges.map(c => this.renderChallenge(c)).join('')}
                </div>
                
                ${this.bonusChallenge ? `
                    <div class="bonus-challenge">
                        <h4>⭐ تحدي البونص</h4>
                        ${this.renderChallenge(this.bonusChallenge)}
                    </div>
                ` : ''}
                
                ${allCompleted ? `
                    <div class="all-complete-banner">
                        🎉 أحسنت! أكملت كل تحديات اليوم
                        <br>عد غداً لتحديات جديدة!
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    renderChallenge(c) {
        const percentage = Math.min((c.progress / c.target) * 100, 100);
        return `
            <div class="challenge-item ${c.completed ? 'completed' : ''} ${c.isBonus ? 'bonus' : ''}">
                <span class="challenge-icon">${c.icon}</span>
                <div class="challenge-details">
                    <div class="challenge-name">${c.name}</div>
                    <div class="challenge-progress-bar">
                        <div class="progress" style="width: ${percentage}%"></div>
                    </div>
                    <div class="challenge-progress-text">${c.progress}/${c.target}</div>
                </div>
                <span class="challenge-reward">${c.completed ? '✅' : '+' + c.reward}</span>
            </div>
        `;
    }
    
    // إعادة التحديات للعرض في اللعبة
    getMiniView() {
        return this.challenges.map(c => ({
            icon: c.icon,
            name: c.name,
            progress: c.progress,
            target: c.target,
            completed: c.completed
        }));
    }
}

// Global instance
const dailyChallenges = new DailyChallenges();

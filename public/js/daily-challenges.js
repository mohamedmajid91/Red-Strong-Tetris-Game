// ============== Daily Challenges System ==============
class DailyChallenges {
    constructor() {
        this.challenges = [];
        this.load();
    }
    
    load() {
        const today = new Date().toDateString();
        const saved = localStorage.getItem('tetris_daily_challenges');
        
        if (saved) {
            const data = JSON.parse(saved);
            if (data.date === today) {
                this.challenges = data.challenges;
                return;
            }
        }
        
        // إنشاء تحديات جديدة لليوم
        this.generateChallenges();
    }
    
    generateChallenges() {
        const allChallenges = [
            { id: 'score_300', name: 'احصل على 300 نقطة', icon: '🎯', target: 300, type: 'score', reward: 50 },
            { id: 'score_500', name: 'احصل على 500 نقطة', icon: '🎯', target: 500, type: 'score', reward: 100 },
            { id: 'score_1000', name: 'احصل على 1000 نقطة', icon: '🏆', target: 1000, type: 'score', reward: 200 },
            { id: 'lines_5', name: 'أزل 5 صفوف', icon: '📏', target: 5, type: 'lines', reward: 30 },
            { id: 'lines_10', name: 'أزل 10 صفوف', icon: '📏', target: 10, type: 'lines', reward: 60 },
            { id: 'lines_20', name: 'أزل 20 صف', icon: '📏', target: 20, type: 'lines', reward: 120 },
            { id: 'games_3', name: 'العب 3 مرات', icon: '🎮', target: 3, type: 'games', reward: 40 },
            { id: 'games_5', name: 'العب 5 مرات', icon: '🎮', target: 5, type: 'games', reward: 80 },
            { id: 'tetris_1', name: 'اعمل تتريس واحد', icon: '💥', target: 1, type: 'tetris', reward: 100 },
            { id: 'time_5', name: 'العب 5 دقائق', icon: '⏱️', target: 300, type: 'time', reward: 50 }
        ];
        
        // اختيار 3 تحديات عشوائية
        const shuffled = allChallenges.sort(() => 0.5 - Math.random());
        this.challenges = shuffled.slice(0, 3).map(c => ({
            ...c,
            progress: 0,
            completed: false
        }));
        
        this.save();
    }
    
    save() {
        const data = {
            date: new Date().toDateString(),
            challenges: this.challenges
        };
        localStorage.setItem('tetris_daily_challenges', JSON.stringify(data));
    }
    
    update(stats) {
        let newlyCompleted = [];
        
        this.challenges.forEach(challenge => {
            if (challenge.completed) return;
            
            let progress = 0;
            switch (challenge.type) {
                case 'score':
                    progress = stats.score || 0;
                    break;
                case 'lines':
                    progress = stats.linesCleared || 0;
                    break;
                case 'games':
                    progress = stats.gamesPlayed || 0;
                    break;
                case 'tetris':
                    progress = stats.tetrisCount || 0;
                    break;
                case 'time':
                    progress = stats.playTime || 0;
                    break;
            }
            
            challenge.progress = Math.min(progress, challenge.target);
            
            if (challenge.progress >= challenge.target && !challenge.completed) {
                challenge.completed = true;
                newlyCompleted.push(challenge);
            }
        });
        
        if (newlyCompleted.length > 0) {
            this.save();
            newlyCompleted.forEach(c => this.showReward(c));
        }
        
        return newlyCompleted;
    }
    
    showReward(challenge) {
        const notification = document.createElement('div');
        notification.className = 'challenge-complete-notification';
        notification.innerHTML = `
            <div class="challenge-icon">${challenge.icon}</div>
            <div class="challenge-info">
                <div class="challenge-title">تحدي مكتمل!</div>
                <div class="challenge-name">${challenge.name}</div>
                <div class="challenge-reward">+${challenge.reward} نقطة</div>
            </div>
        `;
        document.body.appendChild(notification);
        
        setTimeout(() => notification.classList.add('show'), 100);
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 500);
        }, 4000);
        
        if (typeof gameSounds !== 'undefined') gameSounds.play('win');
    }
    
    getAll() {
        return this.challenges;
    }
    
    getCompleted() {
        return this.challenges.filter(c => c.completed);
    }
    
    getTotalRewards() {
        return this.getCompleted().reduce((sum, c) => sum + c.reward, 0);
    }
    
    render(container) {
        if (!container) return;
        
        container.innerHTML = `
            <div class="daily-challenges">
                <h3>🎯 تحديات اليوم</h3>
                <div class="challenges-list">
                    ${this.challenges.map(c => `
                        <div class="challenge-item ${c.completed ? 'completed' : ''}">
                            <span class="challenge-icon">${c.icon}</span>
                            <div class="challenge-details">
                                <div class="challenge-name">${c.name}</div>
                                <div class="challenge-progress-bar">
                                    <div class="progress" style="width: ${(c.progress / c.target) * 100}%"></div>
                                </div>
                                <div class="challenge-progress-text">${c.progress}/${c.target}</div>
                            </div>
                            <span class="challenge-reward">${c.completed ? '✅' : '+' + c.reward}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
}

// Global instance
const dailyChallenges = new DailyChallenges();

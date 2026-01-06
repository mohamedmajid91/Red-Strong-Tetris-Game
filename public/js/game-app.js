// ============ Game-App.js ============

const GameApp = {
    player: null,
    settings: {},
    
    // Session state
    currentSession: null,
    currentRound: 1,
    maxRounds: 3,
    totalScore: 0,
    difficultyLevel: 0,
    sessionId: null,
    
    // Initialize app
    async init() {
        await this.loadSettings();
        await this.loadAnnouncements();
        this.populateProvinces();
        this.loadSavedData();
        this.setupEventListeners();
        this.loadLeaderboard();
        await this.checkPlayerSession();
    },
    
    // Load announcements
    async loadAnnouncements() {
        try {
            const announcements = await API.getAnnouncements();
            if (announcements && announcements.length > 0) {
                const banner = document.getElementById('announcement-banner');
                const textEl = document.getElementById('announcement-text');
                
                // Combine all announcements
                const texts = announcements.map(a => a.text).join('  •  ');
                textEl.textContent = texts;
                
                banner.style.display = 'block';
                document.body.classList.add('has-banner');
            }
        } catch (e) {
            console.log('No announcements');
        }
    },
    
    // Check player session status
    async checkPlayerSession() {
        const savedPlayer = Utils.load('last_player');
        if (!savedPlayer || !savedPlayer.phone) return;
        
        try {
            const session = await API.getSession(savedPlayer.phone);
            
            if (session.inCooldown) {
                // Show cooldown notice
                document.getElementById('session-info').style.display = 'none';
                document.getElementById('cooldown-notice').style.display = 'block';
                document.getElementById('cooldown-remaining').textContent = session.cooldownRemaining;
                document.getElementById('start-play-btn').disabled = true;
                document.getElementById('start-play-btn').textContent = '⏳ في فترة انتظار';
                document.getElementById('start-play-btn').style.opacity = '0.5';
                
                // Store total score for display
                this.totalScore = session.totalScore || 0;
            } else if (session.canPlay) {
                // Show session info
                document.getElementById('session-info').style.display = 'block';
                document.getElementById('cooldown-notice').style.display = 'none';
                document.getElementById('total-score-display').textContent = session.totalScore || 0;
                document.getElementById('rounds-left-display').textContent = session.roundsLeft || 3;
                document.getElementById('start-play-btn').disabled = false;
                document.getElementById('start-play-btn').textContent = 'ابدأ اللعب الآن 🚀';
                document.getElementById('start-play-btn').style.opacity = '1';
                
                // Store session info
                this.currentRound = session.currentRound || 1;
                this.totalScore = session.totalScore || 0;
                this.difficultyLevel = session.difficultyLevel || 0;
            }
        } catch (e) {
            console.log('Error checking session:', e);
        }
    },
    
    // Load settings
    async loadSettings() {
        try {
            this.settings = await API.getSettings();
            this.applySettings();
        } catch (e) {
            console.log('Using default settings');
        }
    },
    
    // Apply settings
    applySettings() {
        const s = this.settings;
        
        if (s.site_name) {
            document.title = s.site_name + ' - العب واربح';
            document.getElementById('header-title').textContent = s.site_name;
        }
        
        if (s.logo_letter) {
            document.getElementById('header-logo').textContent = s.logo_letter;
        }
        
        if (s.primary_color) {
            document.documentElement.style.setProperty('--accent', s.primary_color);
        }
        
        if (s.gold_color) {
            document.documentElement.style.setProperty('--gold', s.gold_color);
        }
        
        // Get max rounds from settings
        if (s.max_rounds) {
            this.maxRounds = parseInt(s.max_rounds);
        }
    },
    
    // Populate provinces dropdown
    populateProvinces() {
        const select = document.getElementById('player-province');
        CONFIG.PROVINCES.forEach(p => {
            const option = document.createElement('option');
            option.value = p;
            option.textContent = p;
            select.appendChild(option);
        });
    },
    
    // Load saved form data
    loadSavedData() {
        const name = Utils.load('player_name');
        const province = Utils.load('player_province');
        const phone = Utils.load('player_phone');
        
        if (name) document.getElementById('player-name').value = name;
        if (province) document.getElementById('player-province').value = province;
        if (phone) document.getElementById('player-phone').value = phone;
        
        // Load player
        const savedPlayer = Utils.load('last_player');
        if (savedPlayer) {
            this.player = savedPlayer;
            Utils.showToast('مرحباً بعودتك ' + this.player.name);
        }
        
        // Show last score
        const lastScore = Utils.load('last_score');
        if (lastScore) {
            document.getElementById('last-score-value').textContent = lastScore;
            document.getElementById('last-score-box').style.display = 'block';
            document.getElementById('share-btn').style.display = 'block';
        }
    },
    
    // Setup event listeners
    setupEventListeners() {
        // Form input save
        ['player-name', 'player-province', 'player-phone'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('input', () => this.saveFormData());
                el.addEventListener('change', () => this.saveFormData());
            }
        });
        
        // Register form
        document.getElementById('register-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleRegister();
        });
        
        // Keyboard controls
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
        
        // Back button
        window.addEventListener('popstate', () => {
            if (document.getElementById('game-screen').classList.contains('active')) {
                history.pushState(null, '', '');
                this.exitGame();
            }
        });
        history.pushState(null, '', '');
    },
    
    // Save form data
    saveFormData() {
        Utils.save('player_name', document.getElementById('player-name').value);
        Utils.save('player_province', document.getElementById('player-province').value);
        Utils.save('player_phone', document.getElementById('player-phone').value);
    },
    
    // Show screen
    showScreen(id) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(id + '-screen').classList.add('active');
        
        if (id === 'home') {
            this.loadLeaderboard();
            this.checkPlayerSession();
        }
        if (id === 'game') this.initGame();
    },
    
    // Handle registration
    async handleRegister() {
        const name = document.getElementById('player-name').value.trim();
        const province = document.getElementById('player-province').value;
        const phone = Utils.formatPhone(document.getElementById('player-phone').value);
        
        if (!phone) {
            Utils.showToast('رقم الهاتف غير صحيح!', true);
            return;
        }
        
        try {
            // Check game status
            const status = await API.getGameStatus();
            
            if (!status.enabled) {
                Utils.showToast('اللعبة متوقفة حالياً', true);
                return;
            }
            
            if (status.blockedProvinces?.includes(province)) {
                Utils.showToast('اللعبة غير متاحة في محافظتك', true);
                return;
            }
            
            // Get location if required
            let location = null;
            if (status.requireLocation) {
                if (!confirm('اللعبة تحتاج تفعيل الموقع. موافق؟')) {
                    Utils.showToast('ما تكدر تلعب بدون موقع', true);
                    return;
                }
                try {
                    location = await Utils.getLocation();
                } catch (e) {
                    Utils.showToast('رفضت تفعيل الموقع', true);
                    return;
                }
            }
            
            // Register
            const deviceInfo = Utils.getDeviceInfo();
            const res = await API.register(name, phone, province, deviceInfo, location);
            
            if (res.success) {
                this.player = res.player;
                Utils.save('last_player', res.player);
                Utils.showToast(res.message === 'Welcome back!' ? 
                    'مرحباً بعودتك ' + res.player.name : 
                    'مرحباً ' + name
                );
                
                // Start a new session
                await this.startNewSession();
            } else {
                Utils.showToast(res.error || 'خطأ في التسجيل', true);
            }
        } catch (err) {
            Utils.showToast('حدث خطأ، حاول مرة أخرى', true);
        }
    },
    
    // Start a new session/round
    async startNewSession() {
        if (!this.player) return;
        
        try {
            const session = await API.startSession(this.player.phone);
            
            if (session.error) {
                if (session.inCooldown) {
                    Utils.showToast('أنت في فترة انتظار، حاول لاحقاً', true);
                    this.showScreen('home');
                    return;
                }
                Utils.showToast(session.error, true);
                return;
            }
            
            this.sessionId = session.sessionId;
            this.currentRound = session.round;
            this.totalScore = session.totalScore;
            this.difficultyLevel = session.difficultyLevel;
            
            this.showScreen('game');
        } catch (err) {
            Utils.showToast('حدث خطأ في بدء الجولة', true);
        }
    },
    
    // Start next round
    async startNextRound() {
        await this.startNewSession();
    },
    
    // Load leaderboard
    async loadLeaderboard() {
        try {
            const data = await API.getLeaderboard();
            const container = document.getElementById('leaderboard-list');
            
            if (!data || !data.length) {
                container.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:15px;font-size:0.85rem;">لا يوجد لاعبين بعد</p>';
                return;
            }
            
            container.innerHTML = data.map((p, i) => `
                <div class="leaderboard-item ${i === 0 ? 'gold' : ''}">
                    <div class="rank ${i === 0 ? 'first' : i === 1 ? 'second' : i === 2 ? 'third' : ''}">${i + 1}</div>
                    <div class="player-info">
                        <div class="player-name">${p.name}</div>
                        <div class="player-province">${p.province}</div>
                    </div>
                    <div class="player-score">${p.score}</div>
                </div>
            `).join('');
        } catch (e) {
            console.error('Failed to load leaderboard:', e);
        }
    },
    
    // Initialize game
    initGame() {
        if (!TetrisGame.init('tetris-canvas')) return;
        
        // Set difficulty
        TetrisGame.setDifficulty(this.difficultyLevel);
        
        // Setup callbacks
        TetrisGame.onScoreUpdate = (score) => {
            document.getElementById('score-display').textContent = score;
        };
        
        TetrisGame.onLevelUpdate = (level) => {
            document.getElementById('level-display').textContent = level;
        };
        
        TetrisGame.onTimeUpdate = (time) => {
            document.getElementById('timer-display').textContent = Utils.formatTime(time);
            if (time <= 30) {
                document.getElementById('timer-box').classList.add('warning');
            }
        };
        
        TetrisGame.onGameOver = (score) => {
            this.handleGameEnd(score);
        };
        
        TetrisGame.onTimeUp = (score) => {
            this.handleGameEnd(score);
        };
        
        // Show overlay
        this.showGameOverlay('جاهز؟', `الجولة ${this.currentRound} من ${this.maxRounds}`, 'ابدأ', () => this.startGame());
        
        // Reset UI
        document.getElementById('timer-display').textContent = '3:00';
        document.getElementById('timer-box').classList.remove('warning');
        document.getElementById('score-display').textContent = '0';
        document.getElementById('level-display').textContent = '1';
        document.getElementById('round-display').textContent = `${this.currentRound}/${this.maxRounds}`;
        document.getElementById('total-score-game').textContent = this.totalScore;
        
        // Show difficulty indicator if needed
        const diffIndicator = document.getElementById('difficulty-indicator');
        if (this.difficultyLevel > 0) {
            document.getElementById('difficulty-percent').textContent = this.difficultyLevel;
            diffIndicator.style.display = 'block';
        } else {
            diffIndicator.style.display = 'none';
        }
        
        // Setup touch controls
        this.setupTouchControls();
    },
    
    // Show game overlay
    showGameOverlay(title, msg, btnText, onClick) {
        const overlay = document.getElementById('game-overlay');
        document.getElementById('overlay-title').textContent = title;
        document.getElementById('overlay-msg').textContent = msg;
        document.getElementById('overlay-btn').textContent = btnText;
        document.getElementById('overlay-btn').onclick = onClick;
        overlay.classList.remove('hidden');
    },
    
    // Hide game overlay
    hideGameOverlay() {
        document.getElementById('game-overlay').classList.add('hidden');
    },
    
    // Start game
    startGame() {
        this.hideGameOverlay();
        TetrisGame.start();
    },
    
    // Exit game
    exitGame() {
        if (TetrisGame.gameActive) {
            if (!confirm('هل تريد الخروج؟ سيتم حفظ نقاطك.')) return;
            TetrisGame.stop();
            this.handleGameEnd(TetrisGame.getScore());
            return;
        }
        this.showScreen('home');
    },
    
    // Handle game end
    async handleGameEnd(roundScore) {
        if (!this.player || !this.sessionId) {
            // Fallback to old behavior
            Utils.save('last_score', roundScore);
            document.getElementById('round-score').textContent = roundScore;
            document.getElementById('final-score').textContent = roundScore;
            this.showScreen('gameover');
            return;
        }
        
        try {
            // End session and get result
            const result = await API.endSession(this.player.phone, this.sessionId, roundScore);
            
            if (result.success) {
                this.totalScore = result.totalScore;
                
                // Update UI
                document.getElementById('round-score').textContent = roundScore;
                document.getElementById('final-score').textContent = result.totalScore;
                
                Utils.save('last_score', result.totalScore);
                
                // Check if last round
                if (result.isLastRound) {
                    document.getElementById('gameover-icon').textContent = '🎉';
                    document.getElementById('gameover-title').textContent = 'أكملت جميع الجولات!';
                    document.getElementById('next-round-info').style.display = 'none';
                    document.getElementById('cooldown-info').style.display = 'block';
                    document.getElementById('cooldown-time').textContent = '30';
                    document.getElementById('next-round-btn').style.display = 'none';
                } else {
                    document.getElementById('gameover-icon').textContent = '⏱️';
                    document.getElementById('gameover-title').textContent = 'انتهت الجولة!';
                    document.getElementById('next-round-info').style.display = 'block';
                    document.getElementById('cooldown-info').style.display = 'none';
                    document.getElementById('next-round-btn').style.display = 'block';
                    
                    // Calculate next difficulty
                    const nextDifficulty = [20, 40, 50][Math.min(result.nextRound - 1, 2)];
                    document.getElementById('next-difficulty').textContent = nextDifficulty;
                }
                
                this.showScreen('gameover');
            }
        } catch (err) {
            console.error('Error ending session:', err);
            // Fallback
            Utils.save('last_score', roundScore);
            document.getElementById('round-score').textContent = roundScore;
            document.getElementById('final-score').textContent = this.totalScore + roundScore;
            this.showScreen('gameover');
        }
    },
    
    // Setup touch controls
    setupTouchControls() {
        const container = document.getElementById('game-container');
        let touchStartX = 0, touchStartY = 0, touchStartTime = 0, isSwiping = false;
        
        container.ontouchstart = (e) => {
            if (!TetrisGame.gameActive) return;
            e.preventDefault();
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
            touchStartTime = Date.now();
            isSwiping = false;
        };
        
        container.ontouchmove = (e) => {
            if (!TetrisGame.gameActive) return;
            e.preventDefault();
            const dx = e.touches[0].clientX - touchStartX;
            const dy = e.touches[0].clientY - touchStartY;
            
            if (Math.abs(dx) > 30 && Math.abs(dx) > Math.abs(dy)) {
                isSwiping = true;
                TetrisGame.move(dx > 0 ? 1 : -1);
                touchStartX = e.touches[0].clientX;
            }
            
            if (dy > 30 && Math.abs(dy) > Math.abs(dx)) {
                isSwiping = true;
                TetrisGame.drop();
                touchStartY = e.touches[0].clientY;
            }
        };
        
        container.ontouchend = (e) => {
            if (!TetrisGame.gameActive) return;
            e.preventDefault();
            if (!isSwiping && Date.now() - touchStartTime < 200) {
                TetrisGame.rotate();
            }
        };
    },
    
    // Handle keyboard
    handleKeyboard(e) {
        if (!TetrisGame.gameActive) return;
        
        switch(e.key) {
            case 'ArrowLeft': TetrisGame.move(-1); break;
            case 'ArrowRight': TetrisGame.move(1); break;
            case 'ArrowDown': TetrisGame.drop(); break;
            case 'ArrowUp': TetrisGame.rotate(); break;
            case ' ': TetrisGame.hardDrop(); break;
        }
        
        if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) {
            e.preventDefault();
        }
    },
    
    // Share score
    shareScore() {
        const score = Utils.load('last_score');
        if (!score) {
            Utils.showToast('ماكو نتيجة للمشاركة');
            return;
        }
        const siteName = this.settings.site_name || 'ريد سترونك';
        const text = `جربت لعبة ${siteName} وجبت ${score} نقطة 🔥\nجربها هسه 👇\n${window.location.origin}`;
        Utils.shareWhatsApp(text);
    },
    
    // Share game over
    shareGameOver() {
        const score = document.getElementById('final-score').textContent;
        const siteName = this.settings.site_name || 'ريد سترونك';
        const text = `🎮 لعبت ${siteName} وجبت ${score} نقطة! 🔥\n\nجرب حظك وفز بجوائز حقيقية! 👇\n${window.location.origin}`;
        Utils.shareWhatsApp(text);
    }
};

// Initialize on load
window.addEventListener('load', () => GameApp.init());

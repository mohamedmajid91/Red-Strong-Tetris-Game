// ============ Game.js v2.0 - Enhanced Security & Effects ============
// تحسينات: أمان متقدم، تأثيرات بصرية، أداء أفضل

const TetrisGame = {
    // State
    canvas: null,
    ctx: null,
    board: [],
    score: 0,
    level: 1,
    lines: 0,
    currentPiece: null,
    gameActive: false,
    isPaused: false,
    
    // Timing
    dropCounter: 0,
    dropInterval: 1000,
    lastTime: 0,
    animationId: null,
    
    // Timer
    timeRemaining: CONFIG.GAME.GAME_TIME,
    timerInterval: null,
    
    // ═══════════════════════════════════════════════════════════════
    // ANTI-CHEAT SYSTEM - نظام مكافحة الغش
    // ═══════════════════════════════════════════════════════════════
    security: {
        sessionToken: null,
        moveCount: 0,
        lastMoveTime: 0,
        startTime: 0,
        scoreHistory: [],
        suspiciousActions: 0,
        maxScorePerSecond: 500,
        minTimeBetweenMoves: 16, // 60fps
        
        // تهيئة الأمان
        init() {
            this.sessionToken = this.generateToken();
            this.moveCount = 0;
            this.startTime = Date.now();
            this.scoreHistory = [];
            this.suspiciousActions = 0;
            this.lastMoveTime = Date.now();
            
            // منع التعديل على Console
            this.protectConsole();
            
            // مراقبة التغييرات
            this.startMonitoring();
        },
        
        // توليد token
        generateToken() {
            const arr = new Uint8Array(32);
            crypto.getRandomValues(arr);
            return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
        },
        
        // حماية Console
        protectConsole() {
            const warn = () => console.warn('⚠️ محاولة تعديل مرفوضة');
            
            // منع تعديل score مباشرة
            Object.defineProperty(window, 'TetrisGame', {
                configurable: false,
                writable: false
            });
        },
        
        // مراقبة
        startMonitoring() {
            // فحص كل 5 ثواني
            setInterval(() => this.check(), 5000);
        },
        
        // فحص الأمان
        check() {
            const now = Date.now();
            const elapsed = (now - this.startTime) / 1000;
            
            // فحص سرعة النقاط
            if (TetrisGame.score > 0 && elapsed > 0) {
                const scorePerSecond = TetrisGame.score / elapsed;
                if (scorePerSecond > this.maxScorePerSecond) {
                    this.flagSuspicious('high_score_rate');
                }
            }
            
            // فحص عدد الحركات
            const movesPerSecond = this.moveCount / elapsed;
            if (movesPerSecond > 20) {
                this.flagSuspicious('inhuman_speed');
            }
        },
        
        // تسجيل حركة
        recordMove() {
            const now = Date.now();
            if (now - this.lastMoveTime < this.minTimeBetweenMoves) {
                this.suspiciousActions++;
            }
            this.moveCount++;
            this.lastMoveTime = now;
            
            // إرسال للسيرفر (إذا موجود)
            this.sendMoveToServer();
        },
        
        // تسجيل نقاط
        recordScore(points) {
            this.scoreHistory.push({
                points,
                time: Date.now(),
                moveCount: this.moveCount
            });
        },
        
        // تسجيل مشبوه
        flagSuspicious(reason) {
            this.suspiciousActions++;
            console.warn('🚨 نشاط مشبوه:', reason);
            
            // إذا كثرت المخالفات
            if (this.suspiciousActions > 5) {
                TetrisGame.showWarning('تم رصد نشاط غير طبيعي');
            }
        },
        
        // إرسال حركة للسيرفر
        async sendMoveToServer() {
            try {
                // إرسال كل 10 حركات
                if (this.moveCount % 10 === 0 && TetrisGame.sessionId) {
                    fetch('/api/session/move', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ sessionId: TetrisGame.sessionId })
                    }).catch(() => {});
                }
            } catch (e) {}
        },
        
        // الحصول على بيانات التحقق
        getValidationData() {
            return {
                token: this.sessionToken,
                moveCount: this.moveCount,
                playTime: Math.floor((Date.now() - this.startTime) / 1000),
                suspicious: this.suspiciousActions,
                scoreHistory: this.scoreHistory.slice(-10)
            };
        }
    },
    
    // Block size
    BLOCK: 28,
    
    // Session
    sessionId: null,
    
    // Difficulty (0-50%)
    difficultyLevel: 0,
    
    // Combo System
    combo: 0,
    lastClearTime: 0,
    comboTimeout: 2000,
    
    // ═══════════════════════════════════════════════════════════════
    // VISUAL EFFECTS - تأثيرات بصرية
    // ═══════════════════════════════════════════════════════════════
    effects: {
        particles: [],
        screenShake: 0,
        flashOpacity: 0,
        glowIntensity: 0,
        
        // إضافة جسيمات
        addParticles(x, y, color, count = 10) {
            for (let i = 0; i < count; i++) {
                this.particles.push({
                    x: x,
                    y: y,
                    vx: (Math.random() - 0.5) * 8,
                    vy: (Math.random() - 0.5) * 8 - 3,
                    life: 1,
                    color: color,
                    size: Math.random() * 4 + 2
                });
            }
        },
        
        // تحديث الجسيمات
        update() {
            // تحديث الجسيمات
            this.particles = this.particles.filter(p => {
                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.2; // gravity
                p.life -= 0.02;
                return p.life > 0;
            });
            
            // تقليل الاهتزاز
            if (this.screenShake > 0) this.screenShake *= 0.9;
            
            // تقليل الفلاش
            if (this.flashOpacity > 0) this.flashOpacity *= 0.85;
            
            // تقليل التوهج
            if (this.glowIntensity > 0) this.glowIntensity *= 0.95;
        },
        
        // رسم الجسيمات
        draw(ctx) {
            this.particles.forEach(p => {
                ctx.save();
                ctx.globalAlpha = p.life;
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            });
        },
        
        // اهتزاز الشاشة
        shake(intensity = 5) {
            this.screenShake = intensity;
        },
        
        // فلاش
        flash(color = 'white') {
            this.flashOpacity = 0.3;
            this.flashColor = color;
        },
        
        // توهج
        glow() {
            this.glowIntensity = 1;
        }
    },
    
    // Sound System
    sounds: {},
    soundEnabled: true,
    audioCtx: null,
    
    // Ghost piece
    ghostEnabled: true,
    
    // Callbacks
    onScoreUpdate: null,
    onLevelUpdate: null,
    onTimeUpdate: null,
    onGameOver: null,
    onTimeUp: null,
    onComboUpdate: null,
    
    // ═══════════════════════════════════════════════════════════════
    // INITIALIZATION
    // ═══════════════════════════════════════════════════════════════
    init(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            console.error('Canvas not found:', canvasId);
            return false;
        }
        this.ctx = this.canvas.getContext('2d');
        this.calculateBlockSize();
        this.canvas.width = CONFIG.GAME.COLS * this.BLOCK;
        this.canvas.height = CONFIG.GAME.ROWS * this.BLOCK;
        this.initSounds();
        
        // تهيئة الأمان
        this.security.init();
        
        return true;
    },
    
    initSounds() {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioCtx = new AudioContext();
            this.soundEnabled = localStorage.getItem('gameSoundEnabled') !== 'false';
        } catch (e) {
            this.soundEnabled = false;
        }
    },
    
    // ═══════════════════════════════════════════════════════════════
    // ENHANCED SOUND SYSTEM
    // ═══════════════════════════════════════════════════════════════
    playSound(type) {
        if (!this.soundEnabled || !this.audioCtx) return;
        
        try {
            const oscillator = this.audioCtx.createOscillator();
            const gainNode = this.audioCtx.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(this.audioCtx.destination);
            
            const sounds = {
                move: { freq: 200, duration: 0.05, type: 'square' },
                rotate: { freq: 300, duration: 0.08, type: 'sine' },
                drop: { freq: 150, duration: 0.15, type: 'triangle' },
                clear: { freq: 500, duration: 0.2, type: 'sine' },
                tetris: { freq: 800, duration: 0.4, type: 'sawtooth' },
                combo: { freq: 600, duration: 0.15, type: 'sine' },
                gameOver: { freq: 100, duration: 0.5, type: 'sawtooth' },
                levelUp: { freq: 700, duration: 0.3, type: 'sine' }
            };
            
            const sound = sounds[type] || sounds.move;
            oscillator.type = sound.type;
            oscillator.frequency.setValueAtTime(sound.freq, this.audioCtx.currentTime);
            
            if (type === 'levelUp') {
                oscillator.frequency.exponentialRampToValueAtTime(1200, this.audioCtx.currentTime + sound.duration);
            } else if (type === 'gameOver') {
                oscillator.frequency.exponentialRampToValueAtTime(50, this.audioCtx.currentTime + sound.duration);
            }
            
            gainNode.gain.setValueAtTime(0.15, this.audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + sound.duration);
            
            oscillator.start();
            oscillator.stop(this.audioCtx.currentTime + sound.duration);
        } catch (e) {}
    },
    
    toggleSound() {
        this.soundEnabled = !this.soundEnabled;
        localStorage.setItem('gameSoundEnabled', this.soundEnabled);
        return this.soundEnabled;
    },
    
    // ═══════════════════════════════════════════════════════════════
    // GAME LOGIC
    // ═══════════════════════════════════════════════════════════════
    calculateBlockSize() {
        const maxHeight = window.innerHeight * 0.6;
        const maxWidth = window.innerWidth * 0.85;
        const blockByHeight = Math.floor(maxHeight / CONFIG.GAME.ROWS);
        const blockByWidth = Math.floor(maxWidth / CONFIG.GAME.COLS);
        this.BLOCK = Math.min(blockByHeight, blockByWidth, 32);
    },
    
    start() {
        // تهيئة الأمان
        this.security.init();
        
        this.board = Array.from({ length: CONFIG.GAME.ROWS }, () => Array(CONFIG.GAME.COLS).fill(0));
        this.score = 0;
        this.level = 1;
        this.lines = 0;
        this.combo = 0;
        this.dropInterval = 1000;
        this.dropCounter = 0;
        this.timeRemaining = CONFIG.GAME.GAME_TIME;
        this.effects.particles = [];
        this.spawnPiece();
        this.gameActive = true;
        this.isPaused = false;
        this.startTimer();
        this.updateCallbacks();
        this.lastTime = performance.now();
        this.animationId = requestAnimationFrame((t) => this.gameLoop(t));
        
        // تأثير البداية
        this.effects.flash('green');
    },
    
    stop() {
        this.gameActive = false;
        this.stopTimer();
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    },
    
    pause() {
        if (!this.gameActive) return;
        this.isPaused = !this.isPaused;
        if (this.isPaused) {
            this.stopTimer();
            cancelAnimationFrame(this.animationId);
        } else {
            this.startTimer();
            this.lastTime = performance.now();
            this.animationId = requestAnimationFrame((t) => this.gameLoop(t));
        }
    },
    
    // Timer
    startTimer() {
        this.stopTimer();
        this.timerInterval = setInterval(() => {
            this.timeRemaining--;
            if (this.onTimeUpdate) this.onTimeUpdate(this.timeRemaining);
            if (this.timeRemaining <= 0) {
                this.timeUp();
            }
        }, 1000);
    },
    
    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    },
    
    timeUp() {
        this.stop();
        if (this.onTimeUp) this.onTimeUp(this.score);
    },
    
    // Spawn piece
    spawnPiece() {
        const type = Math.floor(Math.random() * 7) + 1;
        this.currentPiece = {
            shape: CONFIG.SHAPES[type].map(r => [...r]),
            type,
            x: Math.floor(CONFIG.GAME.COLS / 2) - 1,
            y: 0
        };
        if (this.collision()) {
            this.gameOver();
        }
    },
    
    collision(ox = 0, oy = 0, shape = this.currentPiece?.shape) {
        if (!shape) return false;
        for (let y = 0; y < shape.length; y++) {
            for (let x = 0; x < shape[y].length; x++) {
                if (shape[y][x]) {
                    const nx = this.currentPiece.x + x + ox;
                    const ny = this.currentPiece.y + y + oy;
                    if (nx < 0 || nx >= CONFIG.GAME.COLS || ny >= CONFIG.GAME.ROWS) return true;
                    if (ny >= 0 && this.board[ny][nx]) return true;
                }
            }
        }
        return false;
    },
    
    merge() {
        this.currentPiece.shape.forEach((row, y) => {
            row.forEach((val, x) => {
                if (val && this.currentPiece.y + y >= 0) {
                    this.board[this.currentPiece.y + y][this.currentPiece.x + x] = val;
                }
            });
        });
    },
    
    // ═══════════════════════════════════════════════════════════════
    // MOVEMENTS (مع تسجيل الأمان)
    // ═══════════════════════════════════════════════════════════════
    rotate() {
        if (!this.gameActive || this.isPaused) return;
        
        this.security.recordMove();
        
        const shape = this.currentPiece.shape;
        const rotated = shape.map((r, i) => r.map((_, j) => shape[shape.length - 1 - j][i]));
        if (!this.collision(0, 0, rotated)) {
            this.currentPiece.shape = rotated;
            this.playSound('rotate');
        }
    },
    
    move(dir) {
        if (!this.gameActive || this.isPaused) return;
        
        this.security.recordMove();
        
        if (!this.collision(dir, 0)) {
            this.currentPiece.x += dir;
            this.playSound('move');
        }
    },
    
    drop() {
        if (!this.gameActive || this.isPaused) return;
        
        this.security.recordMove();
        
        if (!this.collision(0, 1)) {
            this.currentPiece.y++;
        } else {
            this.merge();
            this.clearLines();
            this.spawnPiece();
        }
        this.dropCounter = 0;
    },
    
    hardDrop() {
        if (!this.gameActive || this.isPaused) return;
        
        this.security.recordMove();
        
        let dropDistance = 0;
        while (!this.collision(0, 1)) {
            this.currentPiece.y++;
            dropDistance++;
        }
        
        if (dropDistance > 0) {
            this.addScore(dropDistance * 2);
            
            // تأثير الإسقاط
            const centerX = (this.currentPiece.x + 1) * this.BLOCK;
            const centerY = (this.currentPiece.y + 1) * this.BLOCK;
            this.effects.addParticles(centerX, centerY, CONFIG.COLORS[this.currentPiece.type], 15);
            this.effects.shake(3);
        }
        
        this.playSound('drop');
        this.merge();
        this.clearLines();
        this.spawnPiece();
    },
    
    // ═══════════════════════════════════════════════════════════════
    // CLEAR LINES (مع تأثيرات)
    // ═══════════════════════════════════════════════════════════════
    clearLines() {
        let cleared = 0;
        let clearedRows = [];
        
        for (let y = CONFIG.GAME.ROWS - 1; y >= 0; y--) {
            if (this.board[y].every(c => c)) {
                clearedRows.push(y);
                this.board.splice(y, 1);
                this.board.unshift(Array(CONFIG.GAME.COLS).fill(0));
                cleared++;
                y++;
            }
        }
        
        if (cleared) {
            const now = Date.now();
            
            // Combo
            if (now - this.lastClearTime < this.comboTimeout) {
                this.combo++;
                this.playSound('combo');
            } else {
                this.combo = 1;
            }
            this.lastClearTime = now;
            
            // Points
            let points = [0, 100, 300, 500, 800][cleared] * this.level;
            const comboBonus = Math.floor(points * (this.combo - 1) * 0.1);
            points += comboBonus;
            
            // Effects based on lines cleared
            if (cleared === 4) {
                this.playSound('tetris');
                this.effects.flash('gold');
                this.effects.shake(8);
                this.effects.glow();
                
                // جسيمات كثيرة للتتريس
                for (let i = 0; i < CONFIG.GAME.COLS; i++) {
                    this.effects.addParticles(i * this.BLOCK + this.BLOCK/2, CONFIG.GAME.ROWS * this.BLOCK / 2, '#FFD700', 8);
                }
            } else {
                this.playSound('clear');
                this.effects.shake(cleared * 2);
                
                // جسيمات للصفوف الممحية
                clearedRows.forEach(row => {
                    for (let i = 0; i < CONFIG.GAME.COLS; i += 2) {
                        this.effects.addParticles(i * this.BLOCK, row * this.BLOCK, '#FFFFFF', 3);
                    }
                });
            }
            
            this.addScore(points);
            this.lines += cleared;
            
            const newLevel = Math.floor(this.lines / 10) + 1;
            if (newLevel > this.level) {
                this.level = newLevel;
                this.playSound('levelUp');
                this.effects.flash('cyan');
            }
            
            // Speed
            const difficultyMultiplier = 1 - (this.difficultyLevel / 100);
            const baseInterval = Math.max(100, 1000 - (this.level - 1) * 100);
            this.dropInterval = Math.max(100, baseInterval * difficultyMultiplier);
            
            this.updateCallbacks();
            
            if (this.onComboUpdate && this.combo > 1) {
                this.onComboUpdate(this.combo, comboBonus);
            }
        } else {
            this.combo = 0;
        }
    },
    
    // ═══════════════════════════════════════════════════════════════
    // SCORE (مع أمان)
    // ═══════════════════════════════════════════════════════════════
    addScore(points) {
        // تسجيل للأمان
        this.security.recordScore(points);
        
        // فحص سرعة النقاط
        const elapsed = (Date.now() - this.security.startTime) / 1000;
        const maxAllowed = this.security.maxScorePerSecond * elapsed;
        
        if (this.score + points > maxAllowed && elapsed > 5) {
            this.security.flagSuspicious('score_too_fast');
            return;
        }
        
        this.score += points;
        this.updateCallbacks();
    },
    
    // Game Over
    gameOver() {
        this.stop();
        this.playSound('gameOver');
        this.effects.flash('red');
        this.effects.shake(10);
        if (this.onGameOver) this.onGameOver(this.score);
    },
    
    updateCallbacks() {
        if (this.onScoreUpdate) this.onScoreUpdate(this.score);
        if (this.onLevelUpdate) this.onLevelUpdate(this.level, this.lines);
    },
    
    // Warning
    showWarning(msg) {
        console.warn('⚠️', msg);
        // يمكن إضافة UI warning هنا
    },
    
    // ═══════════════════════════════════════════════════════════════
    // GAME LOOP
    // ═══════════════════════════════════════════════════════════════
    gameLoop(time) {
        if (!this.gameActive || this.isPaused) return;
        
        const delta = time - this.lastTime;
        this.lastTime = time;
        this.dropCounter += delta;
        
        if (this.dropCounter >= this.dropInterval) {
            this.drop();
        }
        
        // تحديث التأثيرات
        this.effects.update();
        
        this.draw();
        this.animationId = requestAnimationFrame((t) => this.gameLoop(t));
    },
    
    // ═══════════════════════════════════════════════════════════════
    // DRAWING (محسّن)
    // ═══════════════════════════════════════════════════════════════
    draw() {
        const ctx = this.ctx;
        const shake = this.effects.screenShake;
        
        ctx.save();
        
        // اهتزاز الشاشة
        if (shake > 0.1) {
            ctx.translate(
                (Math.random() - 0.5) * shake,
                (Math.random() - 0.5) * shake
            );
        }
        
        // مسح الشاشة
        ctx.fillStyle = 'rgba(10, 10, 26, 0.95)';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // رسم الشبكة
        this.drawGrid();
        
        // رسم اللوحة
        this.drawBoard();
        
        // Ghost piece
        if (this.ghostEnabled && this.currentPiece) {
            this.drawGhost();
        }
        
        // القطعة الحالية
        if (this.currentPiece) {
            this.drawPiece();
        }
        
        // رسم الجسيمات
        this.effects.draw(ctx);
        
        // فلاش
        if (this.effects.flashOpacity > 0.01) {
            ctx.fillStyle = `rgba(255, 255, 255, ${this.effects.flashOpacity})`;
            ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }
        
        // توهج الحواف
        if (this.effects.glowIntensity > 0.01) {
            ctx.strokeStyle = `rgba(255, 215, 0, ${this.effects.glowIntensity * 0.5})`;
            ctx.lineWidth = 4;
            ctx.strokeRect(2, 2, this.canvas.width - 4, this.canvas.height - 4);
        }
        
        ctx.restore();
    },
    
    drawGrid() {
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        this.ctx.lineWidth = 1;
        
        for (let x = 0; x <= CONFIG.GAME.COLS; x++) {
            this.ctx.beginPath();
            this.ctx.moveTo(x * this.BLOCK, 0);
            this.ctx.lineTo(x * this.BLOCK, this.canvas.height);
            this.ctx.stroke();
        }
        for (let y = 0; y <= CONFIG.GAME.ROWS; y++) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y * this.BLOCK);
            this.ctx.lineTo(this.canvas.width, y * this.BLOCK);
            this.ctx.stroke();
        }
    },
    
    drawBoard() {
        for (let y = 0; y < CONFIG.GAME.ROWS; y++) {
            for (let x = 0; x < CONFIG.GAME.COLS; x++) {
                if (this.board[y][x]) {
                    this.drawBlock(x, y, CONFIG.COLORS[this.board[y][x]]);
                }
            }
        }
    },
    
    drawPiece() {
        this.currentPiece.shape.forEach((row, y) => {
            row.forEach((val, x) => {
                if (val) {
                    this.drawBlock(
                        this.currentPiece.x + x,
                        this.currentPiece.y + y,
                        CONFIG.COLORS[this.currentPiece.type]
                    );
                }
            });
        });
    },
    
    drawGhost() {
        let ghostY = this.currentPiece.y;
        while (!this.collision(0, ghostY - this.currentPiece.y + 1)) {
            ghostY++;
        }
        
        this.ctx.globalAlpha = 0.3;
        this.currentPiece.shape.forEach((row, y) => {
            row.forEach((val, x) => {
                if (val) {
                    this.drawBlock(
                        this.currentPiece.x + x,
                        ghostY + y,
                        CONFIG.COLORS[this.currentPiece.type],
                        true
                    );
                }
            });
        });
        this.ctx.globalAlpha = 1;
    },
    
    drawBlock(x, y, color, isGhost = false) {
        const bx = x * this.BLOCK;
        const by = y * this.BLOCK;
        const size = this.BLOCK - 2;
        
        // الظل
        if (!isGhost) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            this.ctx.fillRect(bx + 3, by + 3, size, size);
        }
        
        // الخلفية
        this.ctx.fillStyle = color;
        this.ctx.fillRect(bx + 1, by + 1, size, size);
        
        // التدرج (للمعان)
        if (!isGhost) {
            const gradient = this.ctx.createLinearGradient(bx, by, bx + size, by + size);
            gradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
            gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.1)');
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0.2)');
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(bx + 1, by + 1, size, size);
        }
        
        // الحدود
        this.ctx.strokeStyle = isGhost ? 'rgba(255,255,255,0.3)' : 'rgba(255, 255, 255, 0.5)';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(bx + 1, by + 1, size, size);
    },
    
    // Toggle ghost
    toggleGhost() {
        this.ghostEnabled = !this.ghostEnabled;
        return this.ghostEnabled;
    },
    
    // Get validation data for server
    getValidationData() {
        return this.security.getValidationData();
    }
};

// منع الوصول المباشر
Object.freeze(TetrisGame.security);

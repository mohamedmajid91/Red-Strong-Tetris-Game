// ============ Game.js - Tetris Logic ============
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
    
    // Anti-cheat
    lastScoreCheck: Date.now(),
    lastScoreValue: 0,
    
    // Block size
    BLOCK: 28,
    
    // Difficulty (0-50%)
    difficultyLevel: 0,
    
    // Combo System
    combo: 0,
    lastClearTime: 0,
    comboTimeout: 2000, // 2 seconds to keep combo
    
    // Sound System
    sounds: {
        move: null,
        rotate: null,
        drop: null,
        clear: null,
        tetris: null,
        combo: null,
        gameOver: null,
        levelUp: null
    },
    soundEnabled: true,
    
    // Ghost piece
    ghostEnabled: true,
    
    // Callbacks
    onScoreUpdate: null,
    onLevelUpdate: null,
    onTimeUpdate: null,
    onGameOver: null,
    onTimeUp: null,
    onComboUpdate: null,
    
    // Initialize game
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
        return true;
    },
    
    // Initialize sounds
    initSounds() {
        // Create audio context for generating sounds
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioCtx = new AudioContext();
            this.soundEnabled = localStorage.getItem('gameSoundEnabled') !== 'false';
        } catch (e) {
            console.log('Audio not supported');
            this.soundEnabled = false;
        }
    },
    
    // Play sound
    playSound(type) {
        if (!this.soundEnabled || !this.audioCtx) return;
        
        try {
            const oscillator = this.audioCtx.createOscillator();
            const gainNode = this.audioCtx.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(this.audioCtx.destination);
            
            switch(type) {
                case 'move':
                    oscillator.frequency.value = 200;
                    gainNode.gain.value = 0.1;
                    oscillator.start();
                    oscillator.stop(this.audioCtx.currentTime + 0.05);
                    break;
                case 'rotate':
                    oscillator.frequency.value = 300;
                    gainNode.gain.value = 0.1;
                    oscillator.start();
                    oscillator.stop(this.audioCtx.currentTime + 0.08);
                    break;
                case 'drop':
                    oscillator.frequency.value = 150;
                    oscillator.type = 'square';
                    gainNode.gain.value = 0.15;
                    oscillator.start();
                    oscillator.stop(this.audioCtx.currentTime + 0.1);
                    break;
                case 'clear':
                    oscillator.frequency.value = 500;
                    oscillator.type = 'sine';
                    gainNode.gain.value = 0.2;
                    oscillator.start();
                    oscillator.frequency.exponentialRampToValueAtTime(800, this.audioCtx.currentTime + 0.1);
                    oscillator.stop(this.audioCtx.currentTime + 0.15);
                    break;
                case 'tetris':
                    oscillator.frequency.value = 600;
                    oscillator.type = 'sine';
                    gainNode.gain.value = 0.25;
                    oscillator.start();
                    oscillator.frequency.exponentialRampToValueAtTime(1200, this.audioCtx.currentTime + 0.2);
                    oscillator.stop(this.audioCtx.currentTime + 0.3);
                    break;
                case 'combo':
                    oscillator.frequency.value = 400 + (this.combo * 100);
                    oscillator.type = 'triangle';
                    gainNode.gain.value = 0.15;
                    oscillator.start();
                    oscillator.frequency.exponentialRampToValueAtTime(800 + (this.combo * 100), this.audioCtx.currentTime + 0.15);
                    oscillator.stop(this.audioCtx.currentTime + 0.2);
                    break;
                case 'levelUp':
                    oscillator.frequency.value = 400;
                    oscillator.type = 'sine';
                    gainNode.gain.value = 0.2;
                    oscillator.start();
                    oscillator.frequency.exponentialRampToValueAtTime(800, this.audioCtx.currentTime + 0.1);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.3);
                    oscillator.stop(this.audioCtx.currentTime + 0.3);
                    break;
                case 'gameOver':
                    oscillator.frequency.value = 400;
                    oscillator.type = 'sawtooth';
                    gainNode.gain.value = 0.2;
                    oscillator.start();
                    oscillator.frequency.exponentialRampToValueAtTime(100, this.audioCtx.currentTime + 0.5);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.5);
                    oscillator.stop(this.audioCtx.currentTime + 0.5);
                    break;
            }
        } catch (e) {
            // Ignore audio errors
        }
    },
    
    // Toggle sound
    toggleSound() {
        this.soundEnabled = !this.soundEnabled;
        localStorage.setItem('gameSoundEnabled', this.soundEnabled);
        return this.soundEnabled;
    },
    
    // Calculate block size based on available space
    calculateBlockSize() {
        const gameArea = document.querySelector('.game-area');
        if (!gameArea) {
            this.BLOCK = 28;
            return;
        }
        const availableHeight = gameArea.clientHeight - 20;
        const availableWidth = gameArea.clientWidth - 20;
        this.BLOCK = Math.floor(Math.min(
            availableHeight / CONFIG.GAME.ROWS,
            availableWidth / CONFIG.GAME.COLS
        ));
        this.BLOCK = Math.max(CONFIG.GAME.MIN_BLOCK, Math.min(this.BLOCK, CONFIG.GAME.MAX_BLOCK));
    },
    
    // Reset game state
    reset() {
        this.board = Array(CONFIG.GAME.ROWS).fill().map(() => Array(CONFIG.GAME.COLS).fill(0));
        this.score = 0;
        this.level = 1;
        this.lines = 0;
        this.combo = 0;
        this.lastClearTime = 0;
        // Apply difficulty - faster base speed
        const difficultyMultiplier = 1 - (this.difficultyLevel / 100);
        this.dropInterval = Math.max(400, 1000 * difficultyMultiplier);
        this.dropCounter = 0;
        this.lastScoreValue = 0;
        this.lastScoreCheck = Date.now();
        this.timeRemaining = CONFIG.GAME.GAME_TIME;
        this.spawnPiece();
        this.updateCallbacks();
        this.draw();
    },
    
    // Set difficulty level (0-50)
    setDifficulty(level) {
        this.difficultyLevel = Math.min(50, Math.max(0, level));
    },
    
    // Start game
    start() {
        this.gameActive = true;
        this.isPaused = false;
        this.reset();
        this.startTimer();
        this.lastTime = 0;
        this.loop();
    },
    
    // Pause game
    pause() {
        this.isPaused = true;
        this.stopTimer();
        cancelAnimationFrame(this.animationId);
    },
    
    // Resume game
    resume() {
        if (!this.gameActive) return;
        this.isPaused = false;
        this.startTimer();
        this.lastTime = performance.now();
        this.loop();
    },
    
    // Stop game
    stop() {
        this.gameActive = false;
        this.stopTimer();
        cancelAnimationFrame(this.animationId);
    },
    
    // Timer functions
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
    
    // Spawn new piece
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
    
    // Check collision
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
    
    // Merge piece into board
    merge() {
        this.currentPiece.shape.forEach((row, y) => {
            row.forEach((val, x) => {
                if (val && this.currentPiece.y + y >= 0) {
                    this.board[this.currentPiece.y + y][this.currentPiece.x + x] = val;
                }
            });
        });
    },
    
    // Rotate piece
    rotate() {
        const shape = this.currentPiece.shape;
        const rotated = shape.map((r, i) => r.map((_, j) => shape[shape.length - 1 - j][i]));
        if (!this.collision(0, 0, rotated)) {
            this.currentPiece.shape = rotated;
            this.playSound('rotate');
        }
    },
    
    // Move piece
    move(dir) {
        if (!this.collision(dir, 0)) {
            this.currentPiece.x += dir;
            this.playSound('move');
        }
    },
    
    // Drop piece one row
    drop() {
        if (!this.collision(0, 1)) {
            this.currentPiece.y++;
        } else {
            this.merge();
            this.clearLines();
            this.spawnPiece();
        }
        this.dropCounter = 0;
    },
    
    // Hard drop
    hardDrop() {
        let dropDistance = 0;
        while (!this.collision(0, 1)) {
            this.currentPiece.y++;
            dropDistance++;
        }
        // Bonus points for hard drop distance
        if (dropDistance > 0) {
            this.addScore(dropDistance * 2);
        }
        this.playSound('drop');
        this.merge();
        this.clearLines();
        this.spawnPiece();
    },
    
    // Clear completed lines
    clearLines() {
        let cleared = 0;
        for (let y = CONFIG.GAME.ROWS - 1; y >= 0; y--) {
            if (this.board[y].every(c => c)) {
                this.board.splice(y, 1);
                this.board.unshift(Array(CONFIG.GAME.COLS).fill(0));
                cleared++;
                y++;
            }
        }
        if (cleared) {
            const now = Date.now();
            
            // Combo system
            if (now - this.lastClearTime < this.comboTimeout) {
                this.combo++;
                this.playSound('combo');
            } else {
                this.combo = 1;
            }
            this.lastClearTime = now;
            
            // Base points
            let points = [0, 100, 300, 500, 800][cleared] * this.level;
            
            // Combo bonus (10% per combo level)
            const comboBonus = Math.floor(points * (this.combo - 1) * 0.1);
            points += comboBonus;
            
            // Tetris bonus (4 lines)
            if (cleared === 4) {
                this.playSound('tetris');
            } else {
                this.playSound('clear');
            }
            
            this.addScore(points);
            this.lines += cleared;
            
            const newLevel = Math.floor(this.lines / 10) + 1;
            if (newLevel > this.level) {
                this.level = newLevel;
                this.playSound('levelUp');
            }
            
            // Apply difficulty to drop interval
            const difficultyMultiplier = 1 - (this.difficultyLevel / 100);
            const baseInterval = Math.max(100, 1000 - (this.level - 1) * 100);
            this.dropInterval = Math.max(100, baseInterval * difficultyMultiplier);
            
            this.updateCallbacks();
            
            // Combo callback
            if (this.onComboUpdate && this.combo > 1) {
                this.onComboUpdate(this.combo, comboBonus);
            }
        } else {
            // Reset combo if no lines cleared
            this.combo = 0;
        }
    },
    
    // Add score with anti-cheat
    addScore(points) {
        const now = Date.now();
        const timeDiff = (now - this.lastScoreCheck) / 1000;
        
        if (this.lastScoreValue === 0) {
            this.score += points;
            this.lastScoreValue = this.score;
            this.lastScoreCheck = now;
            this.updateCallbacks();
            return;
        }
        
        const maxAllowed = CONFIG.GAME.MAX_SCORE_PER_SECOND * timeDiff;
        if (points > maxAllowed) return; // Cheat detected
        
        this.score += points;
        this.lastScoreValue = this.score;
        this.lastScoreCheck = now;
        this.updateCallbacks();
    },
    
    // Game over
    gameOver() {
        this.stop();
        this.playSound('gameOver');
        if (this.onGameOver) this.onGameOver(this.score);
    },
    
    // Update callbacks
    updateCallbacks() {
        if (this.onScoreUpdate) this.onScoreUpdate(this.score);
        if (this.onLevelUpdate) this.onLevelUpdate(this.level);
    },
    
    // Draw everything
    draw() {
        // Clear
        this.ctx.fillStyle = '#0a0a15';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Grid
        this.ctx.strokeStyle = 'rgba(255,255,255,0.03)';
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
        
        // Board
        this.board.forEach((row, y) => {
            row.forEach((val, x) => {
                if (val) this.drawBlock(x, y, CONFIG.COLORS.PIECES[val]);
            });
        });
        
        // Ghost piece (preview where piece will land)
        if (this.currentPiece && this.ghostEnabled) {
            const ghostY = this.getGhostY();
            this.currentPiece.shape.forEach((row, y) => {
                row.forEach((val, x) => {
                    if (val) {
                        this.drawGhostBlock(
                            this.currentPiece.x + x,
                            ghostY + y
                        );
                    }
                });
            });
        }
        
        // Current piece
        if (this.currentPiece) {
            this.currentPiece.shape.forEach((row, y) => {
                row.forEach((val, x) => {
                    if (val) {
                        this.drawBlock(
                            this.currentPiece.x + x,
                            this.currentPiece.y + y,
                            CONFIG.COLORS.PIECES[val]
                        );
                    }
                });
            });
        }
    },
    
    // Get ghost piece Y position
    getGhostY() {
        let ghostY = this.currentPiece.y;
        while (!this.collisionAt(this.currentPiece.x, ghostY + 1, this.currentPiece.shape)) {
            ghostY++;
        }
        return ghostY;
    },
    
    // Check collision at specific position
    collisionAt(px, py, shape) {
        for (let y = 0; y < shape.length; y++) {
            for (let x = 0; x < shape[y].length; x++) {
                if (shape[y][x]) {
                    const nx = px + x;
                    const ny = py + y;
                    if (nx < 0 || nx >= CONFIG.GAME.COLS || ny >= CONFIG.GAME.ROWS) return true;
                    if (ny >= 0 && this.board[ny][nx]) return true;
                }
            }
        }
        return false;
    },
    
    // Draw single block
    drawBlock(x, y, color) {
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x * this.BLOCK + 1, y * this.BLOCK + 1, this.BLOCK - 2, this.BLOCK - 2);
        this.ctx.fillStyle = 'rgba(255,255,255,0.3)';
        this.ctx.fillRect(x * this.BLOCK + 1, y * this.BLOCK + 1, this.BLOCK - 2, 4);
    },
    
    // Draw ghost block (transparent preview)
    drawGhostBlock(x, y) {
        this.ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([4, 4]);
        this.ctx.strokeRect(x * this.BLOCK + 2, y * this.BLOCK + 2, this.BLOCK - 4, this.BLOCK - 4);
        this.ctx.setLineDash([]);
        this.ctx.lineWidth = 1;
    },
    
    // Toggle ghost piece
    toggleGhost() {
        this.ghostEnabled = !this.ghostEnabled;
        return this.ghostEnabled;
    },
    
    // Game loop
    loop(time = 0) {
        if (!this.gameActive || this.isPaused) return;
        
        this.dropCounter += time - this.lastTime;
        this.lastTime = time;
        
        if (this.dropCounter > this.dropInterval) {
            this.drop();
        }
        
        this.draw();
        this.animationId = requestAnimationFrame((t) => this.loop(t));
    },
    
    // Get current score
    getScore() {
        return this.score;
    }
};

window.TetrisGame = TetrisGame;
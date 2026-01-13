// ============================================
// Red Strong Tetris - Game Engine v3.0
// Clean, optimized, feature-rich
// ============================================

class TetrisEngine {
    constructor() {
        // Board settings
        this.COLS = 10;
        this.ROWS = 20;
        this.BLOCK_SIZE = 0;
        
        // Tetromino shapes (SRS standard)
        this.SHAPES = {
            I: [[0,0,0,0], [1,1,1,1], [0,0,0,0], [0,0,0,0]],
            O: [[1,1], [1,1]],
            T: [[0,1,0], [1,1,1], [0,0,0]],
            S: [[0,1,1], [1,1,0], [0,0,0]],
            Z: [[1,1,0], [0,1,1], [0,0,0]],
            J: [[1,0,0], [1,1,1], [0,0,0]],
            L: [[0,0,1], [1,1,1], [0,0,0]]
        };
        
        this.PIECE_TYPES = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
        
        // Default colors (can be overridden by theme)
        this.COLORS = {
            I: '#00f0f0',
            O: '#f0f000',
            T: '#a000f0',
            S: '#00f000',
            Z: '#f00000',
            J: '#0000f0',
            L: '#f0a000'
        };
        
        // Game state
        this.board = [];
        this.currentPiece = null;
        this.nextPiece = null;
        this.holdPiece = null;
        this.canHold = true;
        this.nextQueue = []; // Bag of 7 pieces
        
        // Score & stats
        this.score = 0;
        this.level = 1;
        this.lines = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.totalPieces = 0;
        this.tSpins = 0;
        this.tetrises = 0;
        
        // Timing
        this.dropInterval = 1000;
        this.lastDrop = 0;
        this.lockDelay = 500;
        this.lockTimer = 0;
        this.moveResetCount = 0;
        this.maxMoveResets = 15;
        
        // Game mode settings
        this.gameMode = 'classic'; // classic, sprint, marathon, ultra
        this.timeLimit = 180; // seconds
        this.timeRemaining = 180;
        this.targetLines = 40; // for sprint mode
        
        // State flags
        this.gameActive = false;
        this.isPaused = false;
        this.isGameOver = false;
        
        // Canvas references
        this.canvas = null;
        this.ctx = null;
        this.nextCanvas = null;
        this.nextCtx = null;
        this.holdCanvas = null;
        this.holdCtx = null;
        
        // Animation
        this.animationId = null;
        this.lastFrame = 0;
        this.fps = 60;
        
        // Effects
        this.lineClearEffect = [];
        this.particles = [];
        
        // Settings
        this.ghostEnabled = true;
        this.gridEnabled = true;
        this.hardDropEnabled = true;
        
        // Callbacks
        this.onScoreChange = null;
        this.onLevelUp = null;
        this.onLineClear = null;
        this.onGameOver = null;
        this.onPieceLock = null;
        this.onCombo = null;
        this.onTSpin = null;
        this.onTetris = null;
        this.onHold = null;
    }
    
    // Initialize the engine
    init(canvasId, nextCanvasId, holdCanvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        
        if (nextCanvasId) {
            this.nextCanvas = document.getElementById(nextCanvasId);
            this.nextCtx = this.nextCanvas?.getContext('2d');
        }
        
        if (holdCanvasId) {
            this.holdCanvas = document.getElementById(holdCanvasId);
            this.holdCtx = this.holdCanvas?.getContext('2d');
        }
        
        this.calculateBlockSize();
        return this;
    }
    
    // Calculate block size based on canvas
    calculateBlockSize() {
        const container = this.canvas.parentElement;
        if (!container) return;
        
        const rect = container.getBoundingClientRect();
        const maxHeight = rect.height - 20;
        const maxWidth = rect.width - 20;
        
        this.BLOCK_SIZE = Math.floor(Math.min(
            maxHeight / this.ROWS,
            maxWidth / this.COLS
        ));
        
        if (this.BLOCK_SIZE < 15) this.BLOCK_SIZE = 15;
        if (this.BLOCK_SIZE > 35) this.BLOCK_SIZE = 35;
        
        this.canvas.width = this.COLS * this.BLOCK_SIZE;
        this.canvas.height = this.ROWS * this.BLOCK_SIZE;
    }
    
    // Start new game
    start(mode = 'classic', difficulty = 0) {
        this.gameMode = mode;
        this.reset();
        
        // Apply difficulty
        const diffMultiplier = 1 - (difficulty / 100);
        this.dropInterval = Math.max(400, 1000 * diffMultiplier);
        
        // Mode-specific settings
        switch(mode) {
            case 'sprint':
                this.targetLines = 40;
                this.timeLimit = 0; // No time limit
                break;
            case 'marathon':
                this.targetLines = 150;
                this.timeLimit = 0;
                break;
            case 'ultra':
                this.timeLimit = 120; // 2 minutes
                this.timeRemaining = 120;
                break;
            default: // classic
                this.timeLimit = 180;
                this.timeRemaining = 180;
        }
        
        this.fillBag();
        this.spawnPiece();
        this.gameActive = true;
        this.isPaused = false;
        this.lastDrop = performance.now();
        this.lastFrame = performance.now();
        this.loop();
    }
    
    // Reset game state
    reset() {
        this.board = Array(this.ROWS).fill(null).map(() => Array(this.COLS).fill(null));
        this.currentPiece = null;
        this.nextPiece = null;
        this.holdPiece = null;
        this.canHold = true;
        this.nextQueue = [];
        
        this.score = 0;
        this.level = 1;
        this.lines = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.totalPieces = 0;
        this.tSpins = 0;
        this.tetrises = 0;
        
        this.lockTimer = 0;
        this.moveResetCount = 0;
        
        this.gameActive = false;
        this.isPaused = false;
        this.isGameOver = false;
        
        this.lineClearEffect = [];
        this.particles = [];
        
        this.drawHoldPiece();
    }
    
    // 7-bag randomizer
    fillBag() {
        if (this.nextQueue.length < 7) {
            const bag = [...this.PIECE_TYPES];
            // Fisher-Yates shuffle
            for (let i = bag.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [bag[i], bag[j]] = [bag[j], bag[i]];
            }
            this.nextQueue.push(...bag);
        }
    }
    
    // Create a new piece
    createPiece(type) {
        const shape = this.SHAPES[type].map(row => [...row]);
        return {
            type,
            shape,
            x: Math.floor((this.COLS - shape[0].length) / 2),
            y: 0,
            rotation: 0
        };
    }
    
    // Spawn next piece
    spawnPiece() {
        this.fillBag();
        
        if (this.nextPiece) {
            this.currentPiece = this.nextPiece;
        } else {
            this.currentPiece = this.createPiece(this.nextQueue.shift());
        }
        
        this.nextPiece = this.createPiece(this.nextQueue.shift());
        this.totalPieces++;
        this.canHold = true;
        this.lockTimer = 0;
        this.moveResetCount = 0;
        
        this.drawNextPiece();
        this.drawHoldPiece();
        
        // Check game over
        if (this.checkCollision(this.currentPiece.x, this.currentPiece.y, this.currentPiece.shape)) {
            this.gameOver();
        }
    }
    
    // Hold current piece
    hold() {
        if (!this.canHold || !this.gameActive) return false;
        
        const currentType = this.currentPiece.type;
        
        if (this.holdPiece === null) {
            this.holdPiece = { type: currentType };
            this.spawnPiece();
        } else {
            const holdType = this.holdPiece.type;
            this.holdPiece = { type: currentType };
            this.currentPiece = this.createPiece(holdType);
        }
        
        this.canHold = false;
        this.drawHoldPiece();
        
        if (this.onHold) this.onHold();
        return true;
    }
    
    // Movement
    moveLeft() {
        if (!this.canMove()) return false;
        if (!this.checkCollision(this.currentPiece.x - 1, this.currentPiece.y, this.currentPiece.shape)) {
            this.currentPiece.x--;
            this.resetLockDelay();
            return true;
        }
        return false;
    }
    
    moveRight() {
        if (!this.canMove()) return false;
        if (!this.checkCollision(this.currentPiece.x + 1, this.currentPiece.y, this.currentPiece.shape)) {
            this.currentPiece.x++;
            this.resetLockDelay();
            return true;
        }
        return false;
    }
    
    moveDown() {
        if (!this.canMove()) return false;
        if (!this.checkCollision(this.currentPiece.x, this.currentPiece.y + 1, this.currentPiece.shape)) {
            this.currentPiece.y++;
            this.lockTimer = 0;
            return true;
        }
        return false;
    }
    
    // Soft drop
    softDrop() {
        if (this.moveDown()) {
            this.score += 1;
            return true;
        }
        return false;
    }
    
    // Hard drop
    hardDrop() {
        if (!this.canMove() || !this.hardDropEnabled) return 0;
        
        let distance = 0;
        while (!this.checkCollision(this.currentPiece.x, this.currentPiece.y + 1, this.currentPiece.shape)) {
            this.currentPiece.y++;
            distance++;
        }
        
        this.score += distance * 2;
        this.lockPiece();
        return distance;
    }
    
    // Rotation with wall kicks (SRS)
    rotate(direction = 1) { // 1 = clockwise, -1 = counter-clockwise
        if (!this.canMove()) return false;
        
        const piece = this.currentPiece;
        const originalShape = piece.shape;
        const originalRotation = piece.rotation;
        
        // Rotate the shape
        const rotated = this.rotateMatrix(piece.shape, direction);
        piece.shape = rotated;
        piece.rotation = (piece.rotation + direction + 4) % 4;
        
        // Wall kick tests
        const kicks = this.getWallKicks(piece.type, originalRotation, piece.rotation);
        
        for (const [dx, dy] of kicks) {
            if (!this.checkCollision(piece.x + dx, piece.y + dy, piece.shape)) {
                piece.x += dx;
                piece.y += dy;
                this.resetLockDelay();
                return true;
            }
        }
        
        // Rotation failed, revert
        piece.shape = originalShape;
        piece.rotation = originalRotation;
        return false;
    }
    
    // Rotate matrix
    rotateMatrix(matrix, direction) {
        const N = matrix.length;
        const rotated = Array(N).fill(null).map(() => Array(N).fill(0));
        
        for (let y = 0; y < N; y++) {
            for (let x = 0; x < N; x++) {
                if (direction === 1) { // Clockwise
                    rotated[x][N - 1 - y] = matrix[y][x];
                } else { // Counter-clockwise
                    rotated[N - 1 - x][y] = matrix[y][x];
                }
            }
        }
        
        return rotated;
    }
    
    // SRS wall kick data
    getWallKicks(type, fromRotation, toRotation) {
        // Basic kicks for all pieces except I and O
        const basicKicks = {
            '0>1': [[0,0], [-1,0], [-1,1], [0,-2], [-1,-2]],
            '1>0': [[0,0], [1,0], [1,-1], [0,2], [1,2]],
            '1>2': [[0,0], [1,0], [1,-1], [0,2], [1,2]],
            '2>1': [[0,0], [-1,0], [-1,1], [0,-2], [-1,-2]],
            '2>3': [[0,0], [1,0], [1,1], [0,-2], [1,-2]],
            '3>2': [[0,0], [-1,0], [-1,-1], [0,2], [-1,2]],
            '3>0': [[0,0], [-1,0], [-1,-1], [0,2], [-1,2]],
            '0>3': [[0,0], [1,0], [1,1], [0,-2], [1,-2]]
        };
        
        // I piece kicks
        const iKicks = {
            '0>1': [[0,0], [-2,0], [1,0], [-2,-1], [1,2]],
            '1>0': [[0,0], [2,0], [-1,0], [2,1], [-1,-2]],
            '1>2': [[0,0], [-1,0], [2,0], [-1,2], [2,-1]],
            '2>1': [[0,0], [1,0], [-2,0], [1,-2], [-2,1]],
            '2>3': [[0,0], [2,0], [-1,0], [2,1], [-1,-2]],
            '3>2': [[0,0], [-2,0], [1,0], [-2,-1], [1,2]],
            '3>0': [[0,0], [1,0], [-2,0], [1,-2], [-2,1]],
            '0>3': [[0,0], [-1,0], [2,0], [-1,2], [2,-1]]
        };
        
        const key = `${fromRotation}>${toRotation}`;
        
        if (type === 'O') return [[0,0]]; // O doesn't need kicks
        if (type === 'I') return iKicks[key] || [[0,0]];
        return basicKicks[key] || [[0,0]];
    }
    
    // Check collision
    checkCollision(x, y, shape) {
        for (let py = 0; py < shape.length; py++) {
            for (let px = 0; px < shape[py].length; px++) {
                if (shape[py][px]) {
                    const newX = x + px;
                    const newY = y + py;
                    
                    if (newX < 0 || newX >= this.COLS || newY >= this.ROWS) {
                        return true;
                    }
                    
                    if (newY >= 0 && this.board[newY][newX]) {
                        return true;
                    }
                }
            }
        }
        return false;
    }
    
    // Get ghost piece Y position
    getGhostY() {
        let ghostY = this.currentPiece.y;
        while (!this.checkCollision(this.currentPiece.x, ghostY + 1, this.currentPiece.shape)) {
            ghostY++;
        }
        return ghostY;
    }
    
    // Lock piece in place
    lockPiece() {
        const { shape, x, y, type } = this.currentPiece;
        
        // Check for T-Spin
        const isTSpin = this.checkTSpin();
        
        // Place piece on board
        for (let py = 0; py < shape.length; py++) {
            for (let px = 0; px < shape[py].length; px++) {
                if (shape[py][px]) {
                    const boardY = y + py;
                    if (boardY >= 0) {
                        this.board[boardY][x + px] = type;
                    }
                }
            }
        }
        
        if (this.onPieceLock) this.onPieceLock();
        
        // Clear lines
        this.clearLines(isTSpin);
        
        // Spawn next piece
        this.spawnPiece();
    }
    
    // Check for T-Spin
    checkTSpin() {
        if (this.currentPiece.type !== 'T') return false;
        
        const { x, y } = this.currentPiece;
        let corners = 0;
        
        // Check 4 corners of T piece center
        const checks = [[0,0], [2,0], [0,2], [2,2]];
        for (const [dx, dy] of checks) {
            const checkX = x + dx;
            const checkY = y + dy;
            if (checkX < 0 || checkX >= this.COLS || checkY >= this.ROWS ||
                (checkY >= 0 && this.board[checkY][checkX])) {
                corners++;
            }
        }
        
        return corners >= 3;
    }
    
    // Clear completed lines
    clearLines(isTSpin = false) {
        const clearedRows = [];
        
        for (let y = this.ROWS - 1; y >= 0; y--) {
            if (this.board[y].every(cell => cell !== null)) {
                clearedRows.push(y);
            }
        }
        
        if (clearedRows.length === 0) {
            this.combo = 0;
            return;
        }
        
        // Remove cleared rows
        for (const row of clearedRows) {
            this.board.splice(row, 1);
            this.board.unshift(Array(this.COLS).fill(null));
        }
        
        const linesCleared = clearedRows.length;
        this.lines += linesCleared;
        this.combo++;
        if (this.combo > this.maxCombo) this.maxCombo = this.combo;
        
        // Calculate score
        let points = 0;
        const level = this.level;
        
        if (isTSpin) {
            this.tSpins++;
            points = [400, 800, 1200, 1600][linesCleared - 1] * level;
            if (this.onTSpin) this.onTSpin(linesCleared);
        } else if (linesCleared === 4) {
            this.tetrises++;
            points = 800 * level;
            if (this.onTetris) this.onTetris();
        } else {
            points = [100, 300, 500, 800][linesCleared - 1] * level;
        }
        
        // Combo bonus
        if (this.combo > 1) {
            points += 50 * this.combo * level;
            if (this.onCombo) this.onCombo(this.combo);
        }
        
        this.score += points;
        
        // Level up
        const newLevel = Math.floor(this.lines / 10) + 1;
        if (newLevel > this.level) {
            this.level = newLevel;
            this.dropInterval = Math.max(100, 1000 - (this.level - 1) * 80);
            if (this.onLevelUp) this.onLevelUp(this.level);
        }
        
        // Trigger effect
        this.lineClearEffect = clearedRows.map(row => ({
            row,
            alpha: 1,
            flash: true
        }));
        
        if (this.onLineClear) this.onLineClear(linesCleared, points, isTSpin);
        if (this.onScoreChange) this.onScoreChange(this.score);
        
        // Check sprint mode completion
        if (this.gameMode === 'sprint' && this.lines >= this.targetLines) {
            this.gameOver(true);
        }
    }
    
    // Can player move?
    canMove() {
        return this.gameActive && !this.isPaused && this.currentPiece && !this.isGameOver;
    }
    
    // Reset lock delay
    resetLockDelay() {
        if (this.lockTimer > 0 && this.moveResetCount < this.maxMoveResets) {
            this.lockTimer = 0;
            this.moveResetCount++;
        }
    }
    
    // Pause game
    pause() {
        if (!this.gameActive) return;
        this.isPaused = !this.isPaused;
        if (!this.isPaused) {
            this.lastDrop = performance.now();
            this.lastFrame = performance.now();
            this.loop();
        }
    }
    
    // Game over
    gameOver(isWin = false) {
        this.gameActive = false;
        this.isGameOver = true;
        cancelAnimationFrame(this.animationId);
        
        if (this.onGameOver) {
            this.onGameOver({
                score: this.score,
                level: this.level,
                lines: this.lines,
                maxCombo: this.maxCombo,
                tetrises: this.tetrises,
                tSpins: this.tSpins,
                totalPieces: this.totalPieces,
                isWin
            });
        }
    }
    
    // Main game loop
    loop() {
        if (!this.gameActive || this.isPaused) return;
        
        const now = performance.now();
        const deltaTime = now - this.lastFrame;
        
        // Lock delay logic
        if (this.checkCollision(this.currentPiece.x, this.currentPiece.y + 1, this.currentPiece.shape)) {
            this.lockTimer += deltaTime;
            if (this.lockTimer >= this.lockDelay) {
                this.lockPiece();
            }
        } else {
            this.lockTimer = 0;
        }
        
        // Auto drop
        if (now - this.lastDrop > this.dropInterval) {
            this.moveDown();
            this.lastDrop = now;
        }
        
        // Update effects
        this.updateEffects(deltaTime);
        
        // Draw
        this.draw();
        
        this.lastFrame = now;
        this.animationId = requestAnimationFrame(() => this.loop());
    }
    
    // Update visual effects
    updateEffects(deltaTime) {
        // Line clear effect
        this.lineClearEffect = this.lineClearEffect.filter(effect => {
            effect.alpha -= deltaTime / 300;
            return effect.alpha > 0;
        });
        
        // Particles
        this.particles = this.particles.filter(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.2;
            p.life -= deltaTime / 1000;
            return p.life > 0;
        });
    }
    
    // Add particles
    addParticles(x, y, color, count = 10) {
        for (let i = 0; i < count; i++) {
            this.particles.push({
                x, y,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8 - 2,
                color,
                size: Math.random() * 4 + 2,
                life: 1
            });
        }
    }
    
    // Drawing
    draw() {
        const { ctx, canvas, BLOCK_SIZE } = this;
        
        // Clear
        ctx.fillStyle = 'rgba(0, 0, 20, 0.9)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw grid
        if (this.gridEnabled) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
            ctx.lineWidth = 1;
            for (let x = 0; x <= this.COLS; x++) {
                ctx.beginPath();
                ctx.moveTo(x * BLOCK_SIZE, 0);
                ctx.lineTo(x * BLOCK_SIZE, canvas.height);
                ctx.stroke();
            }
            for (let y = 0; y <= this.ROWS; y++) {
                ctx.beginPath();
                ctx.moveTo(0, y * BLOCK_SIZE);
                ctx.lineTo(canvas.width, y * BLOCK_SIZE);
                ctx.stroke();
            }
        }
        
        // Draw board
        for (let y = 0; y < this.ROWS; y++) {
            for (let x = 0; x < this.COLS; x++) {
                if (this.board[y][x]) {
                    this.drawBlock(x, y, this.COLORS[this.board[y][x]]);
                }
            }
        }
        
        // Draw line clear effect
        for (const effect of this.lineClearEffect) {
            ctx.fillStyle = `rgba(255, 255, 255, ${effect.alpha})`;
            ctx.fillRect(0, effect.row * BLOCK_SIZE, canvas.width, BLOCK_SIZE);
        }
        
        // Draw ghost piece
        if (this.currentPiece && this.ghostEnabled) {
            const ghostY = this.getGhostY();
            if (ghostY !== this.currentPiece.y) {
                this.drawPiece(this.currentPiece, ghostY, 0.3, true);
            }
        }
        
        // Draw current piece
        if (this.currentPiece) {
            this.drawPiece(this.currentPiece);
        }
        
        // Draw particles
        for (const p of this.particles) {
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x - p.size/2, p.y - p.size/2, p.size, p.size);
        }
        ctx.globalAlpha = 1;
    }
    
    // Draw a single block
    drawBlock(x, y, color, alpha = 1, isGhost = false) {
        const { ctx, BLOCK_SIZE } = this;
        const padding = 1;
        
        ctx.globalAlpha = alpha;
        
        if (isGhost) {
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.setLineDash([3, 3]);
            ctx.strokeRect(
                x * BLOCK_SIZE + padding + 1,
                y * BLOCK_SIZE + padding + 1,
                BLOCK_SIZE - padding * 2 - 2,
                BLOCK_SIZE - padding * 2 - 2
            );
            ctx.setLineDash([]);
        } else {
            // Main block
            ctx.fillStyle = color;
            ctx.fillRect(
                x * BLOCK_SIZE + padding,
                y * BLOCK_SIZE + padding,
                BLOCK_SIZE - padding * 2,
                BLOCK_SIZE - padding * 2
            );
            
            // Highlight
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.fillRect(
                x * BLOCK_SIZE + padding,
                y * BLOCK_SIZE + padding,
                BLOCK_SIZE - padding * 2,
                3
            );
            
            // Shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
            ctx.fillRect(
                x * BLOCK_SIZE + padding,
                y * BLOCK_SIZE + BLOCK_SIZE - padding - 3,
                BLOCK_SIZE - padding * 2,
                3
            );
        }
        
        ctx.globalAlpha = 1;
    }
    
    // Draw piece
    drawPiece(piece, overrideY = null, alpha = 1, isGhost = false) {
        const { shape, x, type } = piece;
        const y = overrideY !== null ? overrideY : piece.y;
        const color = this.COLORS[type];
        
        for (let py = 0; py < shape.length; py++) {
            for (let px = 0; px < shape[py].length; px++) {
                if (shape[py][px]) {
                    this.drawBlock(x + px, y + py, color, alpha, isGhost);
                }
            }
        }
    }
    
    // Draw next piece
    drawNextPiece() {
        if (!this.nextCtx || !this.nextPiece) return;
        
        const ctx = this.nextCtx;
        const canvas = this.nextCanvas;
        const size = 10;
        
        ctx.fillStyle = 'rgba(0, 0, 30, 0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        const piece = this.nextPiece;
        const offsetX = (canvas.width - piece.shape[0].length * size) / 2;
        const offsetY = (canvas.height - piece.shape.length * size) / 2;
        
        for (let y = 0; y < piece.shape.length; y++) {
            for (let x = 0; x < piece.shape[y].length; x++) {
                if (piece.shape[y][x]) {
                    ctx.fillStyle = this.COLORS[piece.type];
                    ctx.fillRect(
                        offsetX + x * size + 1,
                        offsetY + y * size + 1,
                        size - 2,
                        size - 2
                    );
                }
            }
        }
    }
    
    // Draw hold piece
    drawHoldPiece() {
        if (!this.holdCtx) return;
        
        const ctx = this.holdCtx;
        const canvas = this.holdCanvas;
        const size = 10;
        
        ctx.fillStyle = 'rgba(0, 0, 30, 0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        if (!this.holdPiece) return;
        
        const shape = this.SHAPES[this.holdPiece.type];
        const offsetX = (canvas.width - shape[0].length * size) / 2;
        const offsetY = (canvas.height - shape.length * size) / 2;
        
        ctx.globalAlpha = this.canHold ? 1 : 0.4;
        
        for (let y = 0; y < shape.length; y++) {
            for (let x = 0; x < shape[y].length; x++) {
                if (shape[y][x]) {
                    ctx.fillStyle = this.COLORS[this.holdPiece.type];
                    ctx.fillRect(
                        offsetX + x * size + 1,
                        offsetY + y * size + 1,
                        size - 2,
                        size - 2
                    );
                }
            }
        }
        
        ctx.globalAlpha = 1;
    }
    
    // Set colors from theme
    setColors(colors) {
        this.COLORS = { ...this.COLORS, ...colors };
    }
    
    // Get stats
    getStats() {
        return {
            score: this.score,
            level: this.level,
            lines: this.lines,
            combo: this.combo,
            maxCombo: this.maxCombo,
            tetrises: this.tetrises,
            tSpins: this.tSpins,
            totalPieces: this.totalPieces,
            timeRemaining: this.timeRemaining
        };
    }
}

// Export
window.TetrisEngine = TetrisEngine;

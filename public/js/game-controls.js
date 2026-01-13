// ============================================
// Red Strong Tetris - Touch Controls v2.0
// Gestures, swipes, tap controls with haptic
// ============================================

class TouchController {
    constructor(game, audio) {
        this.game = game;
        this.audio = audio;
        
        // Touch state
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.touchStartTime = 0;
        this.isTouching = false;
        this.lastTapTime = 0;
        
        // Configuration
        this.swipeThreshold = 30;     // Minimum distance for swipe
        this.tapThreshold = 10;       // Max movement for tap
        this.holdThreshold = 300;     // Time for hold action (ms)
        this.doubleTapThreshold = 300; // Max time between taps
        this.repeatDelay = 150;       // Horizontal move repeat
        this.softDropSpeed = 50;      // Soft drop speed (ms)
        
        // Control zones (relative to screen)
        this.zones = {
            left: 0.33,
            right: 0.67
        };
        
        // Touch repeat timers
        this.moveRepeatTimer = null;
        this.softDropTimer = null;
        
        // Gesture state
        this.currentGesture = null;
        this.gestureDirection = null;
        
        // Bind methods
        this.handleTouchStart = this.handleTouchStart.bind(this);
        this.handleTouchMove = this.handleTouchMove.bind(this);
        this.handleTouchEnd = this.handleTouchEnd.bind(this);
        
        // Track active touch
        this.activeTouchId = null;
    }
    
    // Initialize touch listeners
    init(element) {
        this.element = element || document;
        
        this.element.addEventListener('touchstart', this.handleTouchStart, { passive: false });
        this.element.addEventListener('touchmove', this.handleTouchMove, { passive: false });
        this.element.addEventListener('touchend', this.handleTouchEnd, { passive: false });
        this.element.addEventListener('touchcancel', this.handleTouchEnd, { passive: false });
        
        // Prevent context menu on long press
        this.element.addEventListener('contextmenu', e => e.preventDefault());
        
        return this;
    }
    
    // Remove listeners
    destroy() {
        if (this.element) {
            this.element.removeEventListener('touchstart', this.handleTouchStart);
            this.element.removeEventListener('touchmove', this.handleTouchMove);
            this.element.removeEventListener('touchend', this.handleTouchEnd);
            this.element.removeEventListener('touchcancel', this.handleTouchEnd);
        }
        this.stopRepeat();
    }
    
    // Touch start handler
    handleTouchStart(e) {
        if (!this.game?.gameActive || this.game?.isPaused) return;
        
        const touch = e.touches[0];
        if (this.activeTouchId !== null) return; // Already tracking a touch
        
        this.activeTouchId = touch.identifier;
        this.touchStartX = touch.clientX;
        this.touchStartY = touch.clientY;
        this.touchStartTime = Date.now();
        this.isTouching = true;
        this.currentGesture = null;
        this.gestureDirection = null;
        
        e.preventDefault();
    }
    
    // Touch move handler
    handleTouchMove(e) {
        if (!this.isTouching || !this.game?.gameActive) return;
        
        const touch = Array.from(e.touches).find(t => t.identifier === this.activeTouchId);
        if (!touch) return;
        
        const dx = touch.clientX - this.touchStartX;
        const dy = touch.clientY - this.touchStartY;
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);
        
        // Detect gesture type
        if (!this.currentGesture && (absDx > this.swipeThreshold || absDy > this.swipeThreshold)) {
            if (absDy > absDx) {
                // Vertical gesture
                if (dy > 0) {
                    this.currentGesture = 'softDrop';
                    this.startSoftDrop();
                }
            } else {
                // Horizontal gesture
                this.currentGesture = 'move';
                this.gestureDirection = dx > 0 ? 1 : -1;
                this.doMove(this.gestureDirection);
                this.startMoveRepeat(this.gestureDirection);
            }
        }
        
        // Update horizontal movement if gesture is move
        if (this.currentGesture === 'move') {
            const newDirection = dx > 0 ? 1 : -1;
            if (newDirection !== this.gestureDirection) {
                this.gestureDirection = newDirection;
                this.stopRepeat();
                this.doMove(newDirection);
                this.startMoveRepeat(newDirection);
            }
        }
        
        e.preventDefault();
    }
    
    // Touch end handler
    handleTouchEnd(e) {
        if (!this.isTouching) return;
        
        // Check if our touch ended
        const touchEnded = !Array.from(e.touches).find(t => t.identifier === this.activeTouchId);
        if (!touchEnded) return;
        
        const touchDuration = Date.now() - this.touchStartTime;
        
        // Find the ended touch from changedTouches
        const touch = Array.from(e.changedTouches).find(t => t.identifier === this.activeTouchId);
        
        if (touch && this.game?.gameActive && !this.game?.isPaused) {
            const dx = touch.clientX - this.touchStartX;
            const dy = touch.clientY - this.touchStartY;
            const absDx = Math.abs(dx);
            const absDy = Math.abs(dy);
            
            // No gesture detected - check for tap or swipe
            if (!this.currentGesture) {
                if (absDx < this.tapThreshold && absDy < this.tapThreshold) {
                    // It's a tap
                    this.handleTap(touch, touchDuration);
                } else if (absDy > this.swipeThreshold && dy < 0) {
                    // Swipe up - hard drop
                    this.doHardDrop();
                } else if (absDy > this.swipeThreshold && dy > 0 && touchDuration < 200) {
                    // Quick swipe down - hard drop
                    this.doHardDrop();
                }
            }
        }
        
        this.stopRepeat();
        this.isTouching = false;
        this.activeTouchId = null;
        this.currentGesture = null;
        this.gestureDirection = null;
        
        e.preventDefault();
    }
    
    // Handle tap action
    handleTap(touch, duration) {
        const now = Date.now();
        const screenWidth = window.innerWidth;
        const tapX = touch.clientX / screenWidth;
        
        // Check for double tap (rotate)
        if (now - this.lastTapTime < this.doubleTapThreshold) {
            this.doRotate(-1); // Counter-clockwise on double tap
            this.lastTapTime = 0;
            return;
        }
        
        this.lastTapTime = now;
        
        // Long press = hold piece
        if (duration > this.holdThreshold) {
            this.doHold();
            return;
        }
        
        // Zone-based action
        if (tapX < this.zones.left) {
            this.doMove(-1);
        } else if (tapX > this.zones.right) {
            this.doMove(1);
        } else {
            this.doRotate(1); // Clockwise
        }
    }
    
    // Start move repeat
    startMoveRepeat(direction) {
        this.stopRepeat();
        this.moveRepeatTimer = setInterval(() => {
            if (this.game?.gameActive && !this.game?.isPaused) {
                this.doMove(direction);
            }
        }, this.repeatDelay);
    }
    
    // Start soft drop
    startSoftDrop() {
        this.stopRepeat();
        this.softDropTimer = setInterval(() => {
            if (this.game?.gameActive && !this.game?.isPaused) {
                if (!this.game.softDrop()) {
                    this.stopRepeat();
                }
            }
        }, this.softDropSpeed);
        
        // First drop immediately
        this.game?.softDrop();
    }
    
    // Stop repeat timers
    stopRepeat() {
        if (this.moveRepeatTimer) {
            clearInterval(this.moveRepeatTimer);
            this.moveRepeatTimer = null;
        }
        if (this.softDropTimer) {
            clearInterval(this.softDropTimer);
            this.softDropTimer = null;
        }
    }
    
    // Actions
    doMove(direction) {
        if (!this.game) return;
        const moved = direction > 0 ? this.game.moveRight() : this.game.moveLeft();
        if (moved) {
            this.audio?.play('move');
            this.audio?.vibrate('move');
        }
    }
    
    doRotate(direction) {
        if (!this.game) return;
        if (this.game.rotate(direction)) {
            this.audio?.play('rotate');
            this.audio?.vibrate('rotate');
        }
    }
    
    doHardDrop() {
        if (!this.game) return;
        const distance = this.game.hardDrop();
        if (distance > 0) {
            this.audio?.play('hardDrop');
            this.audio?.vibrate('hardDrop');
        }
    }
    
    doHold() {
        if (!this.game) return;
        if (this.game.hold()) {
            this.audio?.play('hold');
            this.audio?.vibrate('move');
        }
    }
}

// ============================================
// Keyboard Controller
// ============================================

class KeyboardController {
    constructor(game, audio) {
        this.game = game;
        this.audio = audio;
        
        // Key bindings
        this.bindings = {
            moveLeft: ['ArrowLeft', 'KeyA'],
            moveRight: ['ArrowRight', 'KeyD'],
            softDrop: ['ArrowDown', 'KeyS'],
            hardDrop: ['Space', 'ArrowUp'],
            rotateClockwise: ['KeyX', 'ArrowUp'],
            rotateCounterClockwise: ['KeyZ', 'ControlLeft', 'ControlRight'],
            hold: ['KeyC', 'ShiftLeft', 'ShiftRight', 'KeyH'],
            pause: ['Escape', 'KeyP']
        };
        
        // DAS (Delayed Auto Shift) settings
        this.dasDelay = 170;    // Initial delay before repeat
        this.dasSpeed = 50;     // Speed of repeat
        
        // Key state
        this.keysDown = new Set();
        this.dasTimer = null;
        this.dasDirection = null;
        this.dasRepeating = false;
        
        // Soft drop timer
        this.softDropTimer = null;
        
        // Bind methods
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleKeyUp = this.handleKeyUp.bind(this);
    }
    
    // Initialize keyboard listeners
    init() {
        document.addEventListener('keydown', this.handleKeyDown);
        document.addEventListener('keyup', this.handleKeyUp);
        return this;
    }
    
    // Remove listeners
    destroy() {
        document.removeEventListener('keydown', this.handleKeyDown);
        document.removeEventListener('keyup', this.handleKeyUp);
        this.stopDas();
        this.stopSoftDrop();
    }
    
    // Check if key matches binding
    matchesBinding(code, binding) {
        return this.bindings[binding]?.includes(code);
    }
    
    // Key down handler
    handleKeyDown(e) {
        if (!this.game) return;
        
        const code = e.code;
        
        // Prevent repeat events
        if (this.keysDown.has(code)) return;
        this.keysDown.add(code);
        
        // Pause works even when paused
        if (this.matchesBinding(code, 'pause')) {
            this.game.pause();
            this.audio?.play(this.game.isPaused ? 'pause' : 'resume');
            e.preventDefault();
            return;
        }
        
        if (!this.game.gameActive || this.game.isPaused) return;
        
        // Movement
        if (this.matchesBinding(code, 'moveLeft')) {
            this.doMove(-1);
            this.startDas(-1);
            e.preventDefault();
        } else if (this.matchesBinding(code, 'moveRight')) {
            this.doMove(1);
            this.startDas(1);
            e.preventDefault();
        }
        
        // Soft drop
        if (this.matchesBinding(code, 'softDrop')) {
            this.startSoftDrop();
            e.preventDefault();
        }
        
        // Hard drop
        if (this.matchesBinding(code, 'hardDrop')) {
            const distance = this.game.hardDrop();
            if (distance > 0) {
                this.audio?.play('hardDrop');
                this.audio?.vibrate('hardDrop');
            }
            e.preventDefault();
        }
        
        // Rotation
        if (this.matchesBinding(code, 'rotateClockwise')) {
            if (this.game.rotate(1)) {
                this.audio?.play('rotate');
                this.audio?.vibrate('rotate');
            }
            e.preventDefault();
        }
        
        if (this.matchesBinding(code, 'rotateCounterClockwise')) {
            if (this.game.rotate(-1)) {
                this.audio?.play('rotate');
                this.audio?.vibrate('rotate');
            }
            e.preventDefault();
        }
        
        // Hold
        if (this.matchesBinding(code, 'hold')) {
            if (this.game.hold()) {
                this.audio?.play('hold');
                this.audio?.vibrate('move');
            }
            e.preventDefault();
        }
    }
    
    // Key up handler
    handleKeyUp(e) {
        const code = e.code;
        this.keysDown.delete(code);
        
        // Stop DAS
        if (this.matchesBinding(code, 'moveLeft') && this.dasDirection === -1) {
            this.stopDas();
        }
        if (this.matchesBinding(code, 'moveRight') && this.dasDirection === 1) {
            this.stopDas();
        }
        
        // Stop soft drop
        if (this.matchesBinding(code, 'softDrop')) {
            this.stopSoftDrop();
        }
    }
    
    // DAS (Delayed Auto Shift)
    startDas(direction) {
        this.stopDas();
        this.dasDirection = direction;
        this.dasRepeating = false;
        
        // Initial delay
        this.dasTimer = setTimeout(() => {
            this.dasRepeating = true;
            this.dasTimer = setInterval(() => {
                if (this.game?.gameActive && !this.game?.isPaused) {
                    this.doMove(direction);
                }
            }, this.dasSpeed);
        }, this.dasDelay);
    }
    
    stopDas() {
        if (this.dasTimer) {
            clearTimeout(this.dasTimer);
            clearInterval(this.dasTimer);
            this.dasTimer = null;
        }
        this.dasDirection = null;
        this.dasRepeating = false;
    }
    
    // Soft drop
    startSoftDrop() {
        this.stopSoftDrop();
        this.softDropTimer = setInterval(() => {
            if (this.game?.gameActive && !this.game?.isPaused) {
                if (this.game.softDrop()) {
                    // Continue dropping
                } else {
                    this.stopSoftDrop();
                }
            }
        }, 50);
        
        // First drop immediately
        this.game?.softDrop();
    }
    
    stopSoftDrop() {
        if (this.softDropTimer) {
            clearInterval(this.softDropTimer);
            this.softDropTimer = null;
        }
    }
    
    // Move action
    doMove(direction) {
        if (!this.game) return;
        const moved = direction > 0 ? this.game.moveRight() : this.game.moveLeft();
        if (moved) {
            this.audio?.play('move');
        }
    }
}

// Export
window.TouchController = TouchController;
window.KeyboardController = KeyboardController;

// ============== Enhanced Game Sounds ==============
class GameSounds {
    constructor() {
        this.enabled = localStorage.getItem('soundEnabled') !== 'false';
        this.volume = parseFloat(localStorage.getItem('soundVolume')) || 0.5;
        this.audioContext = null;
        this.init();
    }
    
    init() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            console.log('🔊 Sound system initialized');
        } catch (e) {
            console.log('Sound not supported');
            this.enabled = false;
        }
    }
    
    // Resume audio context (required after user interaction)
    resume() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }
    
    // Play sound effect
    play(type) {
        if (!this.enabled || !this.audioContext) return;
        this.resume();
        
        switch(type) {
            case 'move':
                this.playMove();
                break;
            case 'rotate':
                this.playRotate();
                break;
            case 'drop':
                this.playDrop();
                break;
            case 'softDrop':
                this.playSoftDrop();
                break;
            case 'hardDrop':
                this.playHardDrop();
                break;
            case 'lineClear':
                this.playLineClear(1);
                break;
            case 'lineClear2':
                this.playLineClear(2);
                break;
            case 'lineClear3':
                this.playLineClear(3);
                break;
            case 'tetris':
                this.playTetris();
                break;
            case 'levelUp':
                this.playLevelUp();
                break;
            case 'gameOver':
                this.playGameOver();
                break;
            case 'win':
                this.playWin();
                break;
            case 'combo':
                this.playCombo();
                break;
            case 'warning':
                this.playWarning();
                break;
            case 'click':
                this.playClick();
                break;
            case 'success':
                this.playSuccess();
                break;
            case 'error':
                this.playError();
                break;
            case 'achievement':
                this.playAchievement();
                break;
            case 'countdown':
                this.playCountdown();
                break;
            case 'start':
                this.playStart();
                break;
        }
    }
    
    // Create oscillator with envelope
    createTone(freq, type, duration, volume = 1, delay = 0) {
        setTimeout(() => {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            osc.connect(gain);
            gain.connect(this.audioContext.destination);
            osc.frequency.value = freq;
            osc.type = type;
            gain.gain.value = this.volume * volume;
            const now = this.audioContext.currentTime;
            osc.start(now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
            osc.stop(now + duration);
        }, delay);
    }
    
    // Basic movement sound
    playMove() {
        this.createTone(200, 'sine', 0.05, 0.1);
    }
    
    // Rotation sound
    playRotate() {
        this.createTone(350, 'sine', 0.08, 0.15);
    }
    
    // Normal drop
    playDrop() {
        this.createTone(120, 'triangle', 0.15, 0.25);
    }
    
    // Soft drop (holding down)
    playSoftDrop() {
        this.createTone(180, 'sine', 0.05, 0.1);
    }
    
    // Hard drop (instant)
    playHardDrop() {
        this.createTone(80, 'sawtooth', 0.2, 0.3);
        this.createTone(60, 'square', 0.15, 0.2, 50);
    }
    
    // Line clear with multiplier
    playLineClear(lines = 1) {
        const baseNotes = [523, 659, 784]; // C5, E5, G5
        const volume = 0.2 + (lines * 0.1);
        
        baseNotes.slice(0, lines + 1).forEach((freq, i) => {
            this.createTone(freq, 'sine', 0.15, volume, i * 60);
        });
    }
    
    // TETRIS! (4 lines)
    playTetris() {
        const melody = [523, 659, 784, 1047, 784, 1047]; // Epic melody
        melody.forEach((freq, i) => {
            this.createTone(freq, 'square', 0.2, 0.3, i * 80);
        });
        // Bass hit
        this.createTone(130, 'sawtooth', 0.4, 0.4, 0);
    }
    
    // Level up fanfare
    playLevelUp() {
        const notes = [392, 440, 523, 659, 784]; // G4 to G5
        notes.forEach((freq, i) => {
            this.createTone(freq, 'square', 0.15, 0.25, i * 80);
        });
    }
    
    // Game over sad melody
    playGameOver() {
        const notes = [392, 349, 330, 294, 262]; // Descending
        notes.forEach((freq, i) => {
            this.createTone(freq, 'sawtooth', 0.3, 0.2, i * 200);
        });
    }
    
    // Victory melody
    playWin() {
        const melody = [523, 523, 523, 659, 784, 659, 784, 1047];
        melody.forEach((freq, i) => {
            this.createTone(freq, 'sine', 0.2, 0.3, i * 100);
        });
    }
    
    // Combo sound
    playCombo() {
        this.createTone(440, 'sine', 0.1, 0.2);
        this.createTone(554, 'sine', 0.1, 0.2, 50);
        this.createTone(659, 'sine', 0.15, 0.25, 100);
    }
    
    // Warning (board getting full)
    playWarning() {
        this.createTone(220, 'square', 0.1, 0.15);
        this.createTone(220, 'square', 0.1, 0.15, 150);
    }
    
    // UI click
    playClick() {
        this.createTone(800, 'sine', 0.05, 0.1);
    }
    
    // Success
    playSuccess() {
        this.createTone(523, 'sine', 0.1, 0.2);
        this.createTone(659, 'sine', 0.15, 0.25, 80);
    }
    
    // Error
    playError() {
        this.createTone(200, 'sawtooth', 0.2, 0.2);
    }
    
    // Achievement unlocked
    playAchievement() {
        const notes = [523, 659, 784, 1047, 1319];
        notes.forEach((freq, i) => {
            this.createTone(freq, 'sine', 0.2, 0.3, i * 100);
        });
    }
    
    // Countdown beep
    playCountdown() {
        this.createTone(440, 'sine', 0.15, 0.2);
    }
    
    // Game start
    playStart() {
        const notes = [262, 330, 392, 523];
        notes.forEach((freq, i) => {
            this.createTone(freq, 'square', 0.1, 0.2, i * 100);
        });
    }
    
    // Toggle sound on/off
    toggle() {
        this.enabled = !this.enabled;
        localStorage.setItem('soundEnabled', this.enabled);
        return this.enabled;
    }
    
    // Set volume (0-1)
    setVolume(vol) {
        this.volume = Math.max(0, Math.min(1, vol));
        localStorage.setItem('soundVolume', this.volume);
    }
    
    // Get current state
    getState() {
        return {
            enabled: this.enabled,
            volume: this.volume
        };
    }
}

// Global instance
const gameSounds = new GameSounds();

// Resume on first user interaction
document.addEventListener('click', () => gameSounds.resume(), { once: true });
document.addEventListener('keydown', () => gameSounds.resume(), { once: true });

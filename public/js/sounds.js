// ============== Game Sounds ==============
class GameSounds {
    constructor() {
        this.enabled = true;
        this.volume = 0.5;
        
        // إنشاء أصوات باستخدام Web Audio API
        this.audioContext = null;
        this.sounds = {};
        
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
    
    // تشغيل صوت
    play(type) {
        if (!this.enabled || !this.audioContext) return;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        gainNode.gain.value = this.volume;
        
        switch(type) {
            case 'move':
                oscillator.frequency.value = 200;
                oscillator.type = 'sine';
                gainNode.gain.value = 0.1;
                this.playTone(oscillator, gainNode, 0.05);
                break;
                
            case 'rotate':
                oscillator.frequency.value = 300;
                oscillator.type = 'sine';
                gainNode.gain.value = 0.15;
                this.playTone(oscillator, gainNode, 0.08);
                break;
                
            case 'drop':
                oscillator.frequency.value = 150;
                oscillator.type = 'triangle';
                gainNode.gain.value = 0.2;
                this.playTone(oscillator, gainNode, 0.1);
                break;
                
            case 'lineClear':
                this.playLineClear();
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
        }
    }
    
    playTone(oscillator, gainNode, duration) {
        const now = this.audioContext.currentTime;
        oscillator.start(now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);
        oscillator.stop(now + duration);
    }
    
    playLineClear() {
        const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
        notes.forEach((freq, i) => {
            setTimeout(() => {
                const osc = this.audioContext.createOscillator();
                const gain = this.audioContext.createGain();
                osc.connect(gain);
                gain.connect(this.audioContext.destination);
                osc.frequency.value = freq;
                osc.type = 'sine';
                gain.gain.value = this.volume * 0.3;
                const now = this.audioContext.currentTime;
                osc.start(now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
                osc.stop(now + 0.15);
            }, i * 80);
        });
    }
    
    playLevelUp() {
        const notes = [392, 523, 659, 784]; // G4, C5, E5, G5
        notes.forEach((freq, i) => {
            setTimeout(() => {
                const osc = this.audioContext.createOscillator();
                const gain = this.audioContext.createGain();
                osc.connect(gain);
                gain.connect(this.audioContext.destination);
                osc.frequency.value = freq;
                osc.type = 'square';
                gain.gain.value = this.volume * 0.2;
                const now = this.audioContext.currentTime;
                osc.start(now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
                osc.stop(now + 0.2);
            }, i * 100);
        });
    }
    
    playGameOver() {
        const notes = [392, 349, 330, 294]; // G4, F4, E4, D4
        notes.forEach((freq, i) => {
            setTimeout(() => {
                const osc = this.audioContext.createOscillator();
                const gain = this.audioContext.createGain();
                osc.connect(gain);
                gain.connect(this.audioContext.destination);
                osc.frequency.value = freq;
                osc.type = 'sawtooth';
                gain.gain.value = this.volume * 0.2;
                const now = this.audioContext.currentTime;
                osc.start(now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
                osc.stop(now + 0.3);
            }, i * 200);
        });
    }
    
    playWin() {
        const notes = [523, 659, 784, 1047, 784, 1047]; // Victory melody
        notes.forEach((freq, i) => {
            setTimeout(() => {
                const osc = this.audioContext.createOscillator();
                const gain = this.audioContext.createGain();
                osc.connect(gain);
                gain.connect(this.audioContext.destination);
                osc.frequency.value = freq;
                osc.type = 'sine';
                gain.gain.value = this.volume * 0.3;
                const now = this.audioContext.currentTime;
                osc.start(now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
                osc.stop(now + 0.2);
            }, i * 120);
        });
    }
    
    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    }
    
    setVolume(vol) {
        this.volume = Math.max(0, Math.min(1, vol));
    }
}

// Global instance
const gameSounds = new GameSounds();

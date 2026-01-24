// ============================================
// Red Strong Tetris - Audio System v2.0
// Background music, sound effects, haptic feedback
// ============================================

class AudioManager {
    constructor() {
        this.audioContext = null;
        this.masterGain = null;
        this.sfxGain = null;
        this.musicGain = null;
        
        this.soundEnabled = true;
        this.musicEnabled = true;
        this.hapticEnabled = true;
        
        this.sfxVolume = 0.7;
        this.musicVolume = 0.3;
        
        this.currentMusic = null;
        this.musicSource = null;
        
        // Sound definitions
        this.sounds = {
            move: { freq: 200, duration: 0.05, type: 'square' },
            rotate: { freq: 300, duration: 0.08, type: 'sine' },
            drop: { freq: 150, duration: 0.1, type: 'triangle' },
            softDrop: { freq: 100, duration: 0.05, type: 'triangle' },
            hardDrop: { freq: 80, duration: 0.15, type: 'sawtooth', sweep: -50 },
            hold: { freq: 400, duration: 0.1, type: 'sine' },
            lock: { freq: 180, duration: 0.12, type: 'triangle' },
            clear1: { freq: 523, duration: 0.15, type: 'sine' },
            clear2: { freq: 659, duration: 0.18, type: 'sine' },
            clear3: { freq: 784, duration: 0.2, type: 'sine' },
            clear4: { freq: 1047, duration: 0.3, type: 'sine', multi: true },
            tetris: { freq: 880, duration: 0.5, type: 'square', arpeggio: [880, 1047, 1319, 1568] },
            tSpin: { freq: 600, duration: 0.3, type: 'sawtooth', vibrato: true },
            combo: { freq: 440, duration: 0.2, type: 'sine', pitchUp: true },
            levelUp: { freq: 523, duration: 0.4, type: 'sine', arpeggio: [523, 659, 784, 1047] },
            gameOver: { freq: 200, duration: 0.8, type: 'sawtooth', sweep: -150 },
            win: { freq: 523, duration: 0.6, type: 'sine', arpeggio: [523, 659, 784, 1047, 1319] },
            countdown: { freq: 440, duration: 0.2, type: 'square' },
            start: { freq: 660, duration: 0.3, type: 'sine' },
            pause: { freq: 300, duration: 0.15, type: 'triangle' },
            resume: { freq: 400, duration: 0.15, type: 'triangle' },
            menuSelect: { freq: 500, duration: 0.08, type: 'sine' },
            menuBack: { freq: 350, duration: 0.08, type: 'sine' },
            achievement: { freq: 880, duration: 0.4, type: 'sine', arpeggio: [880, 1047, 1319] },
            powerUp: { freq: 600, duration: 0.3, type: 'square', sweep: 200 },
            warning: { freq: 440, duration: 0.15, type: 'sawtooth' }
        };
        
        // Haptic patterns
        this.haptics = {
            move: [10],
            rotate: [15],
            drop: [20],
            hardDrop: [30, 10, 30],
            lock: [25],
            clear1: [30],
            clear2: [30, 20, 30],
            clear3: [40, 20, 40, 20, 40],
            clear4: [50, 30, 50, 30, 50, 30, 50],
            tetris: [100, 50, 100],
            combo: [20, 10, 20],
            levelUp: [50, 30, 50, 30, 100],
            gameOver: [200, 100, 200],
            achievement: [50, 25, 50, 25, 100]
        };
        
        // Load saved settings
        this.loadSettings();
    }
    
    // Initialize audio context (must be called after user interaction)
    init() {
        if (this.audioContext) return;
        
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioContext = new AudioContext();
            
            // Create gain nodes
            this.masterGain = this.audioContext.createGain();
            this.masterGain.connect(this.audioContext.destination);
            
            this.sfxGain = this.audioContext.createGain();
            this.sfxGain.gain.value = this.sfxVolume;
            this.sfxGain.connect(this.masterGain);
            
            this.musicGain = this.audioContext.createGain();
            this.musicGain.gain.value = this.musicVolume;
            this.musicGain.connect(this.masterGain);
            
            console.log('Audio initialized');
        } catch (e) {
            console.warn('Audio not supported:', e);
        }
    }
    
    // Resume audio context if suspended
    resume() {
        if (this.audioContext?.state === 'suspended') {
            this.audioContext.resume();
        }
    }
    
    // Play a sound effect
    play(soundName, pitchMultiplier = 1) {
        if (!this.soundEnabled || !this.audioContext) return;
        
        const sound = this.sounds[soundName];
        if (!sound) return;
        
        this.resume();
        
        try {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            
            osc.type = sound.type || 'sine';
            osc.frequency.value = sound.freq * pitchMultiplier;
            
            gain.gain.value = 0.3;
            
            osc.connect(gain);
            gain.connect(this.sfxGain);
            
            const now = this.audioContext.currentTime;
            
            // Frequency sweep
            if (sound.sweep) {
                osc.frequency.linearRampToValueAtTime(
                    sound.freq + sound.sweep,
                    now + sound.duration
                );
            }
            
            // Pitch up effect
            if (sound.pitchUp) {
                osc.frequency.linearRampToValueAtTime(
                    sound.freq * 1.5,
                    now + sound.duration
                );
            }
            
            // Vibrato
            if (sound.vibrato) {
                const lfo = this.audioContext.createOscillator();
                const lfoGain = this.audioContext.createGain();
                lfo.frequency.value = 15;
                lfoGain.gain.value = 30;
                lfo.connect(lfoGain);
                lfoGain.connect(osc.frequency);
                lfo.start(now);
                lfo.stop(now + sound.duration);
            }
            
            // Arpeggio
            if (sound.arpeggio) {
                const noteLength = sound.duration / sound.arpeggio.length;
                sound.arpeggio.forEach((freq, i) => {
                    osc.frequency.setValueAtTime(freq, now + i * noteLength);
                });
            }
            
            // Envelope
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + sound.duration);
            
            osc.start(now);
            osc.stop(now + sound.duration + 0.05);
            
            // Multi-note (for tetris)
            if (sound.multi) {
                setTimeout(() => this.play('clear1', 1.2), 50);
                setTimeout(() => this.play('clear2', 1.2), 100);
                setTimeout(() => this.play('clear3', 1.2), 150);
            }
            
        } catch (e) {
            console.warn('Sound error:', e);
        }
    }
    
    // Play combo sound with increasing pitch
    playCombo(comboCount) {
        const pitch = 1 + (comboCount - 1) * 0.1;
        this.play('combo', Math.min(pitch, 2));
    }
    
    // Play line clear sound
    playLineClear(lines) {
        const soundMap = {
            1: 'clear1',
            2: 'clear2',
            3: 'clear3',
            4: 'tetris'
        };
        this.play(soundMap[lines] || 'clear1');
    }
    
    // Haptic feedback
    vibrate(pattern) {
        if (!this.hapticEnabled || !navigator.vibrate) return;
        
        if (typeof pattern === 'string') {
            pattern = this.haptics[pattern] || [10];
        }
        
        try {
            navigator.vibrate(pattern);
        } catch (e) {
            // Vibration not supported
        }
    }
    
    // Background music using oscillators
    playMusic(type = 'game') {
        if (!this.musicEnabled || !this.audioContext) return;
        
        this.stopMusic();
        this.resume();
        
        // Simple procedural music
        const patterns = {
            game: {
                tempo: 120,
                notes: [
                    { note: 'E4', duration: 0.5 },
                    { note: 'B3', duration: 0.25 },
                    { note: 'C4', duration: 0.25 },
                    { note: 'D4', duration: 0.5 },
                    { note: 'C4', duration: 0.25 },
                    { note: 'B3', duration: 0.25 },
                    { note: 'A3', duration: 0.5 },
                    { note: 'A3', duration: 0.25 },
                    { note: 'C4', duration: 0.25 },
                    { note: 'E4', duration: 0.5 },
                    { note: 'D4', duration: 0.25 },
                    { note: 'C4', duration: 0.25 },
                    { note: 'B3', duration: 0.75 }
                ]
            },
            menu: {
                tempo: 80,
                notes: [
                    { note: 'C4', duration: 1 },
                    { note: 'E4', duration: 1 },
                    { note: 'G4', duration: 1 },
                    { note: 'E4', duration: 1 }
                ]
            }
        };
        
        const noteFreqs = {
            'A3': 220, 'B3': 247, 'C4': 262, 'D4': 294, 'E4': 330,
            'F4': 349, 'G4': 392, 'A4': 440, 'B4': 494, 'C5': 523
        };
        
        const pattern = patterns[type] || patterns.game;
        let currentNote = 0;
        const beatLength = 60 / pattern.tempo;
        
        const playNextNote = () => {
            if (!this.musicEnabled || !this.audioContext) return;
            
            const note = pattern.notes[currentNote];
            const freq = noteFreqs[note.note] || 262;
            
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            
            osc.type = 'sine';
            osc.frequency.value = freq;
            
            gain.gain.value = 0.1;
            
            osc.connect(gain);
            gain.connect(this.musicGain);
            
            const now = this.audioContext.currentTime;
            const duration = note.duration * beatLength;
            
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + duration * 0.9);
            
            osc.start(now);
            osc.stop(now + duration);
            
            currentNote = (currentNote + 1) % pattern.notes.length;
            
            this.musicTimeout = setTimeout(playNextNote, duration * 1000);
        };
        
        playNextNote();
        this.currentMusic = type;
    }
    
    // Stop music
    stopMusic() {
        if (this.musicTimeout) {
            clearTimeout(this.musicTimeout);
            this.musicTimeout = null;
        }
        this.currentMusic = null;
    }
    
    // Toggle sound
    toggleSound() {
        this.soundEnabled = !this.soundEnabled;
        this.saveSettings();
        return this.soundEnabled;
    }
    
    // Toggle music
    toggleMusic() {
        this.musicEnabled = !this.musicEnabled;
        if (!this.musicEnabled) {
            this.stopMusic();
        }
        this.saveSettings();
        return this.musicEnabled;
    }
    
    // Toggle haptic
    toggleHaptic() {
        this.hapticEnabled = !this.hapticEnabled;
        this.saveSettings();
        return this.hapticEnabled;
    }
    
    // Set SFX volume
    setSfxVolume(volume) {
        this.sfxVolume = Math.max(0, Math.min(1, volume));
        if (this.sfxGain) {
            this.sfxGain.gain.value = this.sfxVolume;
        }
        this.saveSettings();
    }
    
    // Set music volume
    setMusicVolume(volume) {
        this.musicVolume = Math.max(0, Math.min(1, volume));
        if (this.musicGain) {
            this.musicGain.gain.value = this.musicVolume;
        }
        this.saveSettings();
    }
    
    // Save settings
    saveSettings() {
        localStorage.setItem('tetris_audio', JSON.stringify({
            soundEnabled: this.soundEnabled,
            musicEnabled: this.musicEnabled,
            hapticEnabled: this.hapticEnabled,
            sfxVolume: this.sfxVolume,
            musicVolume: this.musicVolume
        }));
    }
    
    // Load settings
    loadSettings() {
        try {
            const saved = localStorage.getItem('tetris_audio');
            if (saved) {
                const settings = JSON.parse(saved);
                this.soundEnabled = settings.soundEnabled ?? true;
                this.musicEnabled = settings.musicEnabled ?? true;
                this.hapticEnabled = settings.hapticEnabled ?? true;
                this.sfxVolume = settings.sfxVolume ?? 0.7;
                this.musicVolume = settings.musicVolume ?? 0.3;
            }
        } catch (e) {
            // Use defaults
        }
    }
    
    // Get current settings
    getSettings() {
        return {
            soundEnabled: this.soundEnabled,
            musicEnabled: this.musicEnabled,
            hapticEnabled: this.hapticEnabled,
            sfxVolume: this.sfxVolume,
            musicVolume: this.musicVolume
        };
    }
}

// Global instance
window.audioManager = new AudioManager();

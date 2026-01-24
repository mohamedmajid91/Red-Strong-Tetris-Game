// ============== Game Themes System ==============
class ThemesManager {
    constructor() {
        // Block Shapes
        this.blockShapes = {
            classic: { id: 'classic', name: 'كلاسيكي', icon: '⬛', css: 'border-radius: 2px;' },
            rounded: { id: 'rounded', name: 'دائري', icon: '🔵', css: 'border-radius: 50%;' },
            diamond: { id: 'diamond', name: 'معين', icon: '🔷', css: 'border-radius: 2px; transform: rotate(0deg);' },
            sharp: { id: 'sharp', name: 'حاد', icon: '🔶', css: 'border-radius: 0; clip-path: polygon(10% 0%, 100% 0%, 90% 100%, 0% 100%);' },
            pixel: { id: 'pixel', name: 'بكسل', icon: '🟩', css: 'border-radius: 0; box-shadow: inset -2px -2px 0 rgba(0,0,0,0.3), inset 2px 2px 0 rgba(255,255,255,0.3);' },
            glow: { id: 'glow', name: 'متوهج', icon: '✨', css: 'border-radius: 3px; box-shadow: 0 0 10px currentColor, inset 0 0 5px rgba(255,255,255,0.5);' },
            glass: { id: 'glass', name: 'زجاجي', icon: '💠', css: 'border-radius: 4px; background: linear-gradient(135deg, rgba(255,255,255,0.4) 0%, transparent 50%, rgba(0,0,0,0.2) 100%), currentColor; opacity: 0.9;' },
            candy: { id: 'candy', name: 'حلوى', icon: '🍬', css: 'border-radius: 6px; box-shadow: inset 0 -3px 0 rgba(0,0,0,0.2), inset 0 3px 0 rgba(255,255,255,0.3);' }
        };
        
        this.currentBlockShape = 'classic';
        
        this.themes = {
            // === FREE THEMES ===
            classic: {
                id: 'classic',
                name: 'كلاسيكي',
                nameEn: 'Classic',
                icon: '🎮',
                price: 0,
                unlocked: true,
                category: 'free',
                colors: {
                    background: 'linear-gradient(180deg, #0a0a1a 0%, #1a1a3a 50%, #0d0d2a 100%)',
                    boardBg: 'rgba(0, 0, 0, 0.6)',
                    boardBorder: '#333',
                    text: '#ffffff',
                    accent: '#e31e24',
                    secondary: '#ffd700'
                },
                blocks: {
                    I: '#00f0f0',
                    O: '#f0f000',
                    T: '#a000f0',
                    S: '#00f000',
                    Z: '#f00000',
                    J: '#0000f0',
                    L: '#f0a000'
                },
                effects: {
                    glow: true,
                    particles: false,
                    shake: true
                }
            },
            
            light: {
                id: 'light',
                name: 'نهاري',
                nameEn: 'Light',
                icon: '☀️',
                price: 0,
                unlocked: true,
                category: 'free',
                colors: {
                    background: 'linear-gradient(180deg, #e8f4fc 0%, #cce5f5 50%, #b8daf0 100%)',
                    boardBg: 'rgba(255, 255, 255, 0.9)',
                    boardBorder: '#ddd',
                    text: '#1a237e',
                    accent: '#e31e24',
                    secondary: '#1a237e'
                },
                blocks: {
                    I: '#00bcd4',
                    O: '#ffc107',
                    T: '#9c27b0',
                    S: '#4caf50',
                    Z: '#f44336',
                    J: '#2196f3',
                    L: '#ff9800'
                },
                effects: {
                    glow: false,
                    particles: false,
                    shake: true
                }
            },
            
            // === PREMIUM THEMES (Unlock with points) ===
            neon: {
                id: 'neon',
                name: 'نيون',
                nameEn: 'Neon',
                icon: '💡',
                price: 500,
                unlocked: false,
                category: 'premium',
                colors: {
                    background: 'linear-gradient(180deg, #0d0015 0%, #1a0a2e 50%, #0d0020 100%)',
                    boardBg: 'rgba(0, 0, 0, 0.8)',
                    boardBorder: '#ff00ff',
                    text: '#ffffff',
                    accent: '#00ffff',
                    secondary: '#ff00ff'
                },
                blocks: {
                    I: '#00ffff',
                    O: '#ffff00',
                    T: '#ff00ff',
                    S: '#00ff00',
                    Z: '#ff0066',
                    J: '#0066ff',
                    L: '#ff6600'
                },
                effects: {
                    glow: true,
                    glowIntensity: 2,
                    particles: true,
                    shake: true,
                    neonPulse: true
                },
                css: `
                    .theme-neon .block { 
                        box-shadow: 0 0 10px currentColor, 0 0 20px currentColor, inset 0 0 5px rgba(255,255,255,0.3);
                        animation: neonPulse 2s ease-in-out infinite;
                    }
                    @keyframes neonPulse {
                        0%, 100% { filter: brightness(1); }
                        50% { filter: brightness(1.3); }
                    }
                `
            },
            
            retro: {
                id: 'retro',
                name: 'ريترو',
                nameEn: 'Retro',
                icon: '👾',
                price: 300,
                unlocked: false,
                category: 'premium',
                colors: {
                    background: '#9bbc0f',
                    boardBg: '#8bac0f',
                    boardBorder: '#306230',
                    text: '#0f380f',
                    accent: '#0f380f',
                    secondary: '#306230'
                },
                blocks: {
                    I: '#0f380f',
                    O: '#0f380f',
                    T: '#0f380f',
                    S: '#0f380f',
                    Z: '#0f380f',
                    J: '#0f380f',
                    L: '#0f380f'
                },
                effects: {
                    glow: false,
                    particles: false,
                    shake: false,
                    pixelated: true
                },
                css: `
                    .theme-retro * { image-rendering: pixelated; }
                    .theme-retro .block { 
                        border: 2px solid #306230;
                        box-shadow: inset -2px -2px 0 #306230, inset 2px 2px 0 #9bbc0f;
                    }
                    .theme-retro { font-family: 'Press Start 2P', monospace !important; }
                `
            },
            
            space: {
                id: 'space',
                name: 'فضاء',
                nameEn: 'Space',
                icon: '🚀',
                price: 800,
                unlocked: false,
                category: 'premium',
                colors: {
                    background: 'linear-gradient(180deg, #000011 0%, #0a0a2a 50%, #000022 100%)',
                    boardBg: 'rgba(0, 0, 50, 0.5)',
                    boardBorder: '#4444ff',
                    text: '#ffffff',
                    accent: '#00aaff',
                    secondary: '#ff6600'
                },
                blocks: {
                    I: '#00d4ff',
                    O: '#ffcc00',
                    T: '#cc00ff',
                    S: '#00ff88',
                    Z: '#ff4444',
                    J: '#4488ff',
                    L: '#ff8800'
                },
                effects: {
                    glow: true,
                    particles: true,
                    shake: true,
                    stars: true,
                    shooting: true
                },
                css: `
                    .theme-space::before {
                        content: '';
                        position: fixed;
                        inset: 0;
                        background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="10" cy="10" r="0.5" fill="white"/><circle cx="30" cy="25" r="0.3" fill="white"/><circle cx="50" cy="15" r="0.4" fill="white"/><circle cx="70" cy="35" r="0.3" fill="white"/><circle cx="90" cy="20" r="0.5" fill="white"/><circle cx="20" cy="50" r="0.4" fill="white"/><circle cx="40" cy="60" r="0.3" fill="white"/><circle cx="60" cy="45" r="0.5" fill="white"/><circle cx="80" cy="70" r="0.4" fill="white"/><circle cx="15" cy="80" r="0.3" fill="white"/><circle cx="45" cy="90" r="0.5" fill="white"/><circle cx="75" cy="85" r="0.3" fill="white"/><circle cx="95" cy="55" r="0.4" fill="white"/></svg>');
                        background-size: 200px;
                        animation: starsMove 60s linear infinite;
                        pointer-events: none;
                        z-index: 0;
                    }
                    @keyframes starsMove {
                        from { transform: translateY(0); }
                        to { transform: translateY(-200px); }
                    }
                `
            },
            
            sunset: {
                id: 'sunset',
                name: 'غروب',
                nameEn: 'Sunset',
                icon: '🌅',
                price: 400,
                unlocked: false,
                category: 'premium',
                colors: {
                    background: 'linear-gradient(180deg, #1a0a2e 0%, #4a1942 30%, #8b2942 60%, #d4576b 100%)',
                    boardBg: 'rgba(0, 0, 0, 0.4)',
                    boardBorder: '#ff6b6b',
                    text: '#ffffff',
                    accent: '#ffd93d',
                    secondary: '#ff6b6b'
                },
                blocks: {
                    I: '#4ecdc4',
                    O: '#ffe66d',
                    T: '#c44569',
                    S: '#6bff6b',
                    Z: '#ff6b6b',
                    J: '#546de5',
                    L: '#f19066'
                },
                effects: {
                    glow: true,
                    particles: true,
                    shake: true
                }
            },
            
            cyberpunk: {
                id: 'cyberpunk',
                name: 'سايبربانك',
                nameEn: 'Cyberpunk',
                icon: '🤖',
                price: 1000,
                unlocked: false,
                category: 'premium',
                colors: {
                    background: 'linear-gradient(180deg, #0a0014 0%, #1a0028 50%, #2d0042 100%)',
                    boardBg: 'rgba(20, 0, 40, 0.8)',
                    boardBorder: '#ff0080',
                    text: '#00ffff',
                    accent: '#ff0080',
                    secondary: '#00ffff'
                },
                blocks: {
                    I: '#00ffff',
                    O: '#ffff00',
                    T: '#ff00ff',
                    S: '#00ff80',
                    Z: '#ff0080',
                    J: '#0080ff',
                    L: '#ff8000'
                },
                effects: {
                    glow: true,
                    glowIntensity: 3,
                    particles: true,
                    shake: true,
                    scanlines: true,
                    glitch: true
                },
                css: `
                    .theme-cyberpunk::after {
                        content: '';
                        position: fixed;
                        inset: 0;
                        background: repeating-linear-gradient(
                            0deg,
                            transparent,
                            transparent 2px,
                            rgba(0, 255, 255, 0.03) 2px,
                            rgba(0, 255, 255, 0.03) 4px
                        );
                        pointer-events: none;
                        z-index: 1000;
                    }
                    .theme-cyberpunk .block {
                        box-shadow: 0 0 5px currentColor, 0 0 15px currentColor;
                        border: 1px solid rgba(255,255,255,0.5);
                    }
                `
            },
            
            nature: {
                id: 'nature',
                name: 'طبيعة',
                nameEn: 'Nature',
                icon: '🌿',
                price: 350,
                unlocked: false,
                category: 'premium',
                colors: {
                    background: 'linear-gradient(180deg, #1a3a1a 0%, #2d5a2d 50%, #1a4a2a 100%)',
                    boardBg: 'rgba(0, 30, 0, 0.5)',
                    boardBorder: '#4a8f4a',
                    text: '#e8f5e9',
                    accent: '#81c784',
                    secondary: '#a5d6a7'
                },
                blocks: {
                    I: '#4dd0e1',
                    O: '#fff176',
                    T: '#ba68c8',
                    S: '#81c784',
                    Z: '#e57373',
                    J: '#64b5f6',
                    L: '#ffb74d'
                },
                effects: {
                    glow: true,
                    particles: true,
                    shake: true,
                    leaves: true
                }
            },
            
            ocean: {
                id: 'ocean',
                name: 'محيط',
                nameEn: 'Ocean',
                icon: '🌊',
                price: 600,
                unlocked: false,
                category: 'premium',
                colors: {
                    background: 'linear-gradient(180deg, #001a33 0%, #003366 50%, #004d99 100%)',
                    boardBg: 'rgba(0, 50, 100, 0.5)',
                    boardBorder: '#00aaff',
                    text: '#e0f7ff',
                    accent: '#00d4ff',
                    secondary: '#00ffaa'
                },
                blocks: {
                    I: '#00e5ff',
                    O: '#ffeb3b',
                    T: '#7c4dff',
                    S: '#00e676',
                    Z: '#ff5252',
                    J: '#448aff',
                    L: '#ff9100'
                },
                effects: {
                    glow: true,
                    particles: true,
                    shake: true,
                    bubbles: true,
                    waves: true
                },
                css: `
                    .theme-ocean .game-board-wrapper {
                        animation: oceanWave 4s ease-in-out infinite;
                    }
                    @keyframes oceanWave {
                        0%, 100% { transform: translateY(0); }
                        50% { transform: translateY(-3px); }
                    }
                `
            },
            
            fire: {
                id: 'fire',
                name: 'نار',
                nameEn: 'Fire',
                icon: '🔥',
                price: 700,
                unlocked: false,
                category: 'premium',
                colors: {
                    background: 'linear-gradient(180deg, #1a0500 0%, #3d0c00 50%, #5c1a00 100%)',
                    boardBg: 'rgba(50, 10, 0, 0.6)',
                    boardBorder: '#ff4500',
                    text: '#fff3e0',
                    accent: '#ff6600',
                    secondary: '#ffcc00'
                },
                blocks: {
                    I: '#00bcd4',
                    O: '#ffeb3b',
                    T: '#9c27b0',
                    S: '#4caf50',
                    Z: '#ff5722',
                    J: '#2196f3',
                    L: '#ff9800'
                },
                effects: {
                    glow: true,
                    glowIntensity: 2,
                    particles: true,
                    shake: true,
                    flames: true
                },
                css: `
                    .theme-fire .block {
                        box-shadow: 0 0 8px #ff6600, 0 0 15px #ff3300;
                    }
                `
            },
            
            // === VIP THEMES ===
            golden: {
                id: 'golden',
                name: 'ذهبي VIP',
                nameEn: 'Golden VIP',
                icon: '👑',
                price: 2000,
                unlocked: false,
                category: 'vip',
                colors: {
                    background: 'linear-gradient(180deg, #1a1500 0%, #3d2e00 50%, #5c4500 100%)',
                    boardBg: 'rgba(50, 40, 0, 0.6)',
                    boardBorder: '#ffd700',
                    text: '#fff8dc',
                    accent: '#ffd700',
                    secondary: '#ffb300'
                },
                blocks: {
                    I: '#40e0d0',
                    O: '#ffd700',
                    T: '#da70d6',
                    S: '#98fb98',
                    Z: '#ff6347',
                    J: '#6495ed',
                    L: '#ffa500'
                },
                effects: {
                    glow: true,
                    glowIntensity: 3,
                    particles: true,
                    shake: true,
                    sparkles: true,
                    goldShimmer: true
                },
                css: `
                    .theme-golden .block {
                        box-shadow: 0 0 10px #ffd700, 0 0 20px #ffb300, inset 0 0 10px rgba(255,255,255,0.3);
                        background: linear-gradient(135deg, currentColor 0%, rgba(255,215,0,0.5) 50%, currentColor 100%);
                    }
                    .theme-golden .game-board-wrapper {
                        border: 3px solid #ffd700;
                        box-shadow: 0 0 30px rgba(255,215,0,0.5);
                    }
                `
            },
            
            diamond: {
                id: 'diamond',
                name: 'الماسي',
                nameEn: 'Diamond',
                icon: '💎',
                price: 3000,
                unlocked: false,
                category: 'vip',
                colors: {
                    background: 'linear-gradient(180deg, #0a0a1f 0%, #1a1a3f 50%, #0f0f2f 100%)',
                    boardBg: 'rgba(20, 20, 60, 0.6)',
                    boardBorder: '#00ffff',
                    text: '#e0ffff',
                    accent: '#00ffff',
                    secondary: '#ff69b4'
                },
                blocks: {
                    I: '#b9f2ff',
                    O: '#ffffd4',
                    T: '#e6b3ff',
                    S: '#b3ffb3',
                    Z: '#ffb3b3',
                    J: '#b3d4ff',
                    L: '#ffe4b3'
                },
                effects: {
                    glow: true,
                    glowIntensity: 4,
                    particles: true,
                    shake: true,
                    sparkles: true,
                    rainbow: true,
                    diamondShine: true
                },
                css: `
                    .theme-diamond .block {
                        box-shadow: 0 0 10px currentColor, 0 0 20px currentColor, 0 0 30px rgba(255,255,255,0.5);
                        background: linear-gradient(135deg, 
                            rgba(255,255,255,0.9) 0%, 
                            currentColor 25%, 
                            rgba(255,255,255,0.7) 50%, 
                            currentColor 75%, 
                            rgba(255,255,255,0.9) 100%);
                        animation: diamondShine 3s ease-in-out infinite;
                    }
                    @keyframes diamondShine {
                        0%, 100% { filter: brightness(1) hue-rotate(0deg); }
                        50% { filter: brightness(1.3) hue-rotate(10deg); }
                    }
                `
            },
            
            redstrong: {
                id: 'redstrong',
                name: 'ريد سترونك',
                nameEn: 'Red Strong',
                icon: '🥤',
                price: 1500,
                unlocked: false,
                category: 'vip',
                colors: {
                    background: 'linear-gradient(180deg, #1a0008 0%, #3d000f 50%, #5c0015 100%)',
                    boardBg: 'rgba(50, 0, 10, 0.6)',
                    boardBorder: '#e31e24',
                    text: '#ffffff',
                    accent: '#e31e24',
                    secondary: '#ffd700'
                },
                blocks: {
                    I: '#00e5ff',
                    O: '#ffd700',
                    T: '#e31e24',
                    S: '#00e676',
                    Z: '#e31e24',
                    J: '#2979ff',
                    L: '#ff9100'
                },
                effects: {
                    glow: true,
                    glowIntensity: 2,
                    particles: true,
                    shake: true,
                    energyWaves: true
                },
                css: `
                    .theme-redstrong .block {
                        box-shadow: 0 0 8px currentColor, 0 0 15px rgba(227,30,36,0.5);
                    }
                    .theme-redstrong .game-board-wrapper {
                        border: 2px solid #e31e24;
                        box-shadow: 0 0 20px rgba(227,30,36,0.4);
                    }
                `
            }
        };
        
        this.currentTheme = 'classic';
        this.load();
    }
    
    load() {
        const saved = localStorage.getItem('tetris_theme');
        if (saved && this.themes[saved]) {
            this.currentTheme = saved;
        }
        
        // Load block shape
        const savedShape = localStorage.getItem('tetris_block_shape');
        if (savedShape && this.blockShapes[savedShape]) {
            this.currentBlockShape = savedShape;
        }
        
        // Load unlocked themes
        const unlocked = localStorage.getItem('tetris_unlocked_themes');
        if (unlocked) {
            const unlockedList = JSON.parse(unlocked);
            unlockedList.forEach(id => {
                if (this.themes[id]) {
                    this.themes[id].unlocked = true;
                }
            });
        }
    }
    
    save() {
        localStorage.setItem('tetris_theme', this.currentTheme);
        localStorage.setItem('tetris_block_shape', this.currentBlockShape);
        
        const unlocked = Object.keys(this.themes).filter(id => this.themes[id].unlocked);
        localStorage.setItem('tetris_unlocked_themes', JSON.stringify(unlocked));
    }
    
    // Get current block shape
    getBlockShape() {
        return this.blockShapes[this.currentBlockShape];
    }
    
    // Set block shape
    setBlockShape(shapeId) {
        if (!this.blockShapes[shapeId]) return false;
        this.currentBlockShape = shapeId;
        this.save();
        this.applyBlockShape();
        return true;
    }
    
    // Apply block shape CSS
    applyBlockShape() {
        const shape = this.getBlockShape();
        const style = document.getElementById('block-shape-css') || document.createElement('style');
        style.id = 'block-shape-css';
        style.textContent = `.block, .tetris-block, .preview-block, .mini-block { ${shape.css} }`;
        if (!style.parentNode) document.head.appendChild(style);
    }
    
    // Get current theme
    get() {
        return this.themes[this.currentTheme];
    }
    
    // Get all themes
    getAll() {
        return Object.values(this.themes);
    }
    
    // Get themes by category
    getByCategory(category) {
        return Object.values(this.themes).filter(t => t.category === category);
    }
    
    // Set theme
    set(themeId) {
        if (!this.themes[themeId]) return false;
        if (!this.themes[themeId].unlocked) return false;
        
        this.currentTheme = themeId;
        this.save();
        this.apply();
        return true;
    }
    
    // Unlock theme with points
    unlock(themeId, playerPoints) {
        const theme = this.themes[themeId];
        if (!theme) return { success: false, error: 'الثيم غير موجود' };
        if (theme.unlocked) return { success: false, error: 'الثيم مفتوح مسبقاً' };
        if (playerPoints < theme.price) return { success: false, error: 'نقاط غير كافية', needed: theme.price - playerPoints };
        
        theme.unlocked = true;
        this.save();
        
        // Play unlock sound
        if (typeof gameSounds !== 'undefined') {
            gameSounds.play('achievement');
        }
        
        return { success: true, spent: theme.price };
    }
    
    // Apply theme to DOM
    apply() {
        const theme = this.get();
        const root = document.documentElement;
        
        // Remove old theme classes
        document.body.className = document.body.className.replace(/theme-\w+/g, '');
        
        // Add new theme class
        document.body.classList.add(`theme-${theme.id}`);
        
        // Apply CSS variables
        root.style.setProperty('--theme-bg', theme.colors.background);
        root.style.setProperty('--theme-board-bg', theme.colors.boardBg);
        root.style.setProperty('--theme-board-border', theme.colors.boardBorder);
        root.style.setProperty('--theme-text', theme.colors.text);
        root.style.setProperty('--theme-accent', theme.colors.accent);
        root.style.setProperty('--theme-secondary', theme.colors.secondary);
        
        // Apply block colors
        Object.entries(theme.blocks).forEach(([block, color]) => {
            root.style.setProperty(`--block-${block}`, color);
        });
        
        // Inject custom CSS
        this.injectCSS(theme);
        
        // Update background
        this.updateBackground(theme);
        
        // Apply block shape
        this.applyBlockShape();
    }
    
    injectCSS(theme) {
        // Remove old theme CSS
        const oldStyle = document.getElementById('theme-custom-css');
        if (oldStyle) oldStyle.remove();
        
        if (theme.css) {
            const style = document.createElement('style');
            style.id = 'theme-custom-css';
            style.textContent = theme.css;
            document.head.appendChild(style);
        }
    }
    
    updateBackground(theme) {
        const bg = document.querySelector('.game-background');
        if (bg) {
            bg.style.background = theme.colors.background;
        }
        document.body.style.background = theme.colors.background;
    }
    
    // Get block color
    getBlockColor(type) {
        const theme = this.get();
        return theme.blocks[type] || '#888';
    }
    
    // Check if theme has effect
    hasEffect(effectName) {
        const theme = this.get();
        return theme.effects && theme.effects[effectName];
    }
    
    // Render theme selector UI
    renderSelector(container, playerPoints = 0) {
        if (!container) return;
        
        const categories = [
            { id: 'free', name: 'مجاني', icon: '🆓' },
            { id: 'premium', name: 'مميز', icon: '⭐' },
            { id: 'vip', name: 'VIP', icon: '👑' }
        ];
        
        container.innerHTML = `
            <div class="themes-selector">
                <div class="themes-header">
                    <h3>🎨 التخصيص</h3>
                    <div class="player-points">💰 ${playerPoints} نقطة</div>
                </div>
                
                <!-- Block Shapes Section -->
                <div class="theme-category">
                    <h4>🔲 شكل المربعات</h4>
                    <div class="shapes-grid">
                        ${Object.values(this.blockShapes).map(shape => `
                            <div class="shape-card ${shape.id === this.currentBlockShape ? 'active' : ''}"
                                 onclick="themesManager.selectBlockShape('${shape.id}')">
                                <div class="shape-preview">
                                    <div class="shape-block" style="${shape.css} background: #00f0f0;"></div>
                                </div>
                                <span class="shape-name">${shape.icon} ${shape.name}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <!-- Themes Section -->
                ${categories.map(cat => `
                    <div class="theme-category">
                        <h4>${cat.icon} ${cat.name}</h4>
                        <div class="themes-grid">
                            ${this.getByCategory(cat.id).map(theme => `
                                <div class="theme-card ${theme.id === this.currentTheme ? 'active' : ''} ${theme.unlocked ? 'unlocked' : 'locked'}"
                                     data-theme="${theme.id}"
                                     onclick="themesManager.selectTheme('${theme.id}', ${playerPoints})">
                                    <div class="theme-preview" style="background: ${theme.colors.background}">
                                        <div class="theme-blocks">
                                            ${Object.values(theme.blocks).slice(0, 4).map(c => 
                                                `<div class="mini-block" style="background:${c}"></div>`
                                            ).join('')}
                                        </div>
                                    </div>
                                    <div class="theme-info">
                                        <span class="theme-icon">${theme.icon}</span>
                                        <span class="theme-name">${theme.name}</span>
                                        ${!theme.unlocked ? `<span class="theme-price">🔒 ${theme.price}</span>` : 
                                          theme.id === this.currentTheme ? `<span class="theme-active">✓</span>` : ''}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    // Handle block shape selection
    selectBlockShape(shapeId) {
        this.setBlockShape(shapeId);
        this.showNotification(`تم تغيير شكل المربعات`, 'success');
        
        // Update UI
        document.querySelectorAll('.shape-card').forEach(card => {
            card.classList.remove('active');
        });
        document.querySelector(`.shape-card[onclick*="${shapeId}"]`)?.classList.add('active');
    }
    
    // Handle theme selection
    selectTheme(themeId, playerPoints) {
        const theme = this.themes[themeId];
        if (!theme) return;
        
        if (theme.unlocked) {
            this.set(themeId);
            this.showNotification(`تم تفعيل ثيم ${theme.name}`, 'success');
            
            // Update UI
            document.querySelectorAll('.theme-card').forEach(card => {
                card.classList.remove('active');
                if (card.dataset.theme === themeId) {
                    card.classList.add('active');
                }
            });
        } else {
            // Show unlock confirmation
            this.showUnlockDialog(theme, playerPoints);
        }
    }
    
    showUnlockDialog(theme, playerPoints) {
        const canAfford = playerPoints >= theme.price;
        
        const dialog = document.createElement('div');
        dialog.className = 'theme-dialog-overlay';
        dialog.innerHTML = `
            <div class="theme-dialog">
                <div class="dialog-header">
                    <span class="dialog-icon">${theme.icon}</span>
                    <h3>فتح ${theme.name}</h3>
                </div>
                <div class="dialog-body">
                    <div class="theme-big-preview" style="background: ${theme.colors.background}">
                        <div class="preview-blocks">
                            ${Object.values(theme.blocks).map(c => 
                                `<div class="preview-block" style="background:${c}"></div>`
                            ).join('')}
                        </div>
                    </div>
                    <p class="dialog-price">السعر: <strong>${theme.price}</strong> نقطة</p>
                    <p class="dialog-balance">رصيدك: <strong>${playerPoints}</strong> نقطة</p>
                    ${!canAfford ? `<p class="dialog-error">تحتاج ${theme.price - playerPoints} نقطة إضافية</p>` : ''}
                </div>
                <div class="dialog-actions">
                    <button class="btn-cancel" onclick="this.closest('.theme-dialog-overlay').remove()">إلغاء</button>
                    ${canAfford ? `
                        <button class="btn-unlock" onclick="themesManager.confirmUnlock('${theme.id}')">
                            🔓 فتح الثيم
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
        document.body.appendChild(dialog);
    }
    
    confirmUnlock(themeId) {
        // This should be called with actual player points from game
        const result = this.unlock(themeId, Infinity); // Placeholder - integrate with game points
        
        if (result.success) {
            document.querySelector('.theme-dialog-overlay')?.remove();
            this.showNotification(`🎉 تم فتح ${this.themes[themeId].name}!`, 'success');
            this.set(themeId);
        }
    }
    
    showNotification(message, type = 'info') {
        const notif = document.createElement('div');
        notif.className = `theme-notification ${type}`;
        notif.textContent = message;
        document.body.appendChild(notif);
        
        setTimeout(() => notif.classList.add('show'), 100);
        setTimeout(() => {
            notif.classList.remove('show');
            setTimeout(() => notif.remove(), 300);
        }, 2500);
    }
}

// ============== Particles System ==============
class ParticlesSystem {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas?.getContext('2d');
        this.particles = [];
        this.running = false;
    }
    
    start() {
        if (!this.canvas || !this.ctx) return;
        this.running = true;
        this.animate();
    }
    
    stop() {
        this.running = false;
    }
    
    // Create explosion particles
    explode(x, y, color, count = 20) {
        for (let i = 0; i < count; i++) {
            this.particles.push({
                x, y,
                vx: (Math.random() - 0.5) * 10,
                vy: (Math.random() - 0.5) * 10,
                size: Math.random() * 5 + 2,
                color,
                life: 1,
                decay: Math.random() * 0.02 + 0.02
            });
        }
    }
    
    // Create sparkle effect
    sparkle(x, y, color) {
        for (let i = 0; i < 5; i++) {
            this.particles.push({
                x: x + (Math.random() - 0.5) * 30,
                y: y + (Math.random() - 0.5) * 30,
                vx: 0,
                vy: -1,
                size: Math.random() * 3 + 1,
                color,
                life: 1,
                decay: 0.03,
                type: 'sparkle'
            });
        }
    }
    
    // Line clear effect
    lineClear(y, width, colors) {
        for (let i = 0; i < width; i += 10) {
            const color = colors[Math.floor(Math.random() * colors.length)];
            this.explode(i, y, color, 5);
        }
    }
    
    animate() {
        if (!this.running) return;
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.particles = this.particles.filter(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.2; // gravity
            p.life -= p.decay;
            
            if (p.life <= 0) return false;
            
            this.ctx.globalAlpha = p.life;
            this.ctx.fillStyle = p.color;
            
            if (p.type === 'sparkle') {
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                this.ctx.fill();
            } else {
                this.ctx.fillRect(p.x - p.size/2, p.y - p.size/2, p.size, p.size);
            }
            
            return true;
        });
        
        this.ctx.globalAlpha = 1;
        
        requestAnimationFrame(() => this.animate());
    }
}

// Global instance
const themesManager = new ThemesManager();

// Apply theme on load
document.addEventListener('DOMContentLoaded', () => {
    themesManager.apply();
});

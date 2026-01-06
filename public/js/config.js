// ============ Config.js ============
const CONFIG = {
    // API Base URL
    API_URL: '/api',
    
    // Game Settings
    GAME: {
        COLS: 10,
        ROWS: 20,
        MIN_BLOCK: 20,
        MAX_BLOCK: 35,
        GAME_TIME: 180, // 3 minutes
        MAX_SCORE_PER_SECOND: 200
    },
    
    // Colors - Red Strong Theme
    COLORS: {
        PIECES: [null, '#e31e24', '#00bcd4', '#ffd700', '#ff9800', '#4caf50', '#9c27b0', '#1a237e'],
        PRIMARY: '#0d1442',
        ACCENT: '#e31e24',
        GOLD: '#ffd700',
        SUCCESS: '#00d9a5'
    },
    
    // Tetris Shapes
    SHAPES: [
        [],
        [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], // I
        [[2,0,0],[2,2,2],[0,0,0]],                   // J
        [[0,0,3],[3,3,3],[0,0,0]],                   // L
        [[4,4],[4,4]],                               // O
        [[0,5,5],[5,5,0],[0,0,0]],                   // S
        [[0,6,0],[6,6,6],[0,0,0]],                   // T
        [[7,7,0],[0,7,7],[0,0,0]]                    // Z
    ],
    
    // Provinces
    PROVINCES: [
        'بغداد', 'البصرة', 'نينوى', 'أربيل', 'النجف', 'كربلاء',
        'السليمانية', 'ذي قار', 'الأنبار', 'ديالى', 'كركوك',
        'صلاح الدين', 'بابل', 'واسط', 'ميسان', 'المثنى', 'القادسية', 'دهوك'
    ],
    
    // Phone Validation
    PHONE: {
        VALID_PREFIXES: ['75', '77', '78', '79'],
        LENGTH: 10
    }
};

// Make it globally available
window.CONFIG = CONFIG;
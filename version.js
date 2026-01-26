/**
 * ============================================
 * 🎮 RED STRONG TETRIS - VERSION MANAGER
 * ============================================
 * 
 * غيّر الإصدار هنا فقط - يتغير تلقائياً في كل مكان!
 * 
 * الاستخدام:
 *   const version = require('./version');
 *   console.log(version.full);  // "71.0.0"
 *   console.log(version.display); // "v71.0.0"
 * 
 */

const VERSION = {
    // ========== غيّر هنا فقط ==========
    major: 71,      // الإصدار الرئيسي (تغييرات كبيرة)
    minor: 0,       // الإصدار الفرعي (ميزات جديدة)
    patch: 0,       // التصحيحات (إصلاحات بسيطة)
    // ==================================
    
    // اسم المشروع
    name: 'Red Strong Tetris',
    
    // تاريخ الإصدار
    releaseDate: new Date().toISOString().split('T')[0],
    
    // وصف الإصدار
    codename: 'Ultimate Security Edition'
};

// الإصدار الكامل
VERSION.full = `${VERSION.major}.${VERSION.minor}.${VERSION.patch}`;

// للعرض
VERSION.display = `v${VERSION.full}`;

// للـ API
VERSION.api = {
    version: VERSION.full,
    name: VERSION.name,
    codename: VERSION.codename,
    releaseDate: VERSION.releaseDate
};

// للـ HTML (JSON string)
VERSION.toJSON = function() {
    return JSON.stringify({
        version: this.full,
        display: this.display,
        name: this.name,
        codename: this.codename,
        releaseDate: this.releaseDate
    });
};

// للـ Console
VERSION.banner = `
╔════════════════════════════════════════════════════════════╗
║   🎮 ${VERSION.name.padEnd(45)}║
║   📦 Version: ${VERSION.display.padEnd(42)}║
║   🏷️  ${VERSION.codename.padEnd(45)}║
║   📅 Released: ${VERSION.releaseDate.padEnd(40)}║
╚════════════════════════════════════════════════════════════╝
`;

module.exports = VERSION;

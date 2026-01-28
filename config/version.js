/**
 * نظام إدارة الإصدار المركزي
 * Version Management System
 * 
 * هذا الملف يقرأ رقم الإصدار من package.json ويوزعه بشكل آمن
 * على جميع أجزاء التطبيق
 */

const fs = require('fs');
const path = require('path');

// قراءة package.json بشكل آمن
let version = '0.0.0';
let packageData = {};

try {
    const packagePath = path.join(__dirname, '..', 'package.json');
    const packageContent = fs.readFileSync(packagePath, 'utf8');
    packageData = JSON.parse(packageContent);
    version = packageData.version || '0.0.0';
} catch (error) {
    console.error('❌ خطأ في قراءة رقم الإصدار:', error.message);
    version = '0.0.0';
}

/**
 * الحصول على رقم الإصدار الكامل
 * @returns {string} رقم الإصدار (مثل: 70.0.0)
 */
function getVersion() {
    return version;
}

/**
 * الحصول على رقم الإصدار بصيغة منسقة
 * @returns {string} رقم الإصدار مع بادئة v (مثل: v70.0.0)
 */
function getFormattedVersion() {
    return `v${version}`;
}

/**
 * الحصول على معلومات الإصدار للواجهة الأمامية (آمنة)
 * @returns {object} معلومات الإصدار الآمنة فقط
 */
function getVersionInfo() {
    return {
        version: version,
        formatted: `v${version}`,
        name: packageData.name || 'tetris-game',
        description: packageData.description || 'Red Strong Tetris Game'
    };
}

/**
 * الحصول على معلومات الإصدار للـ API (JSON)
 * @returns {object} معلومات الإصدار بصيغة API
 */
function getVersionForAPI() {
    return {
        version: version,
        app: packageData.name || 'tetris-game',
        nodeVersion: process.version,
        platform: process.platform,
        timestamp: new Date().toISOString()
    };
}

/**
 * طباعة معلومات الإصدار في Console عند بدء السيرفر
 */
function logVersionInfo() {
    console.log('\n╔════════════════════════════════════════╗');
    console.log(`║  🎮 ${packageData.name || 'Tetris Game'}`.padEnd(41) + '║');
    console.log(`║  📦 الإصدار: v${version}`.padEnd(41) + '║');
    console.log(`║  🚀 Node.js: ${process.version}`.padEnd(41) + '║');
    console.log('╚════════════════════════════════════════╝\n');
}

// تصدير الوظائف
module.exports = {
    getVersion,
    getFormattedVersion,
    getVersionInfo,
    getVersionForAPI,
    logVersionInfo,
    VERSION: version
};

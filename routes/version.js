/**
 * Version API Route
 * مسار API آمن للحصول على معلومات الإصدار
 */

const express = require('express');
const router = express.Router();
const { getVersionForAPI } = require('../config/version');

/**
 * GET /api/version
 * الحصول على معلومات الإصدار (للقراءة فقط)
 * 
 * الأمان:
 * - القراءة فقط (GET)
 * - لا يعرض معلومات حساسة
 * - لا يسمح بالتعديل
 */
router.get('/version', (req, res) => {
    try {
        const versionInfo = getVersionForAPI();
        
        res.status(200).json({
            success: true,
            data: versionInfo
        });
    } catch (error) {
        console.error('خطأ في /api/version:', error);
        res.status(500).json({
            success: false,
            error: 'فشل في الحصول على معلومات الإصدار'
        });
    }
});

// منع أي طرق أخرى غير GET (أمان إضافي)
router.all('/version', (req, res) => {
    if (req.method !== 'GET') {
        res.status(405).json({
            success: false,
            error: 'Method Not Allowed - استخدم GET فقط'
        });
    }
});

module.exports = router;

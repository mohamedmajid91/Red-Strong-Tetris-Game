# 🎮 Red Strong Tetris Game v57.5

## 📋 المميزات

### الأمان
- ✅ JWT Authentication مع Refresh Tokens
- ✅ 2FA للأدمن (Google Authenticator)
- ✅ Rate Limiting
- ✅ Session Timeout (30 دقيقة)
- ✅ Password Hashing (bcrypt)
- ✅ Hidden Admin Panel Path
- ✅ Phone Number Masking

### اللعبة
- ✅ تتريس كامل مع نقاط ومستويات
- ✅ لوحة المتصدرين
- ✅ عجلة الحظ
- ✅ نظام الإحالات
- ✅ تحديات يومية
- ✅ مسابقات أسبوعية
- ✅ جوائز يومية
- ✅ إنجازات

### لوحة التحكم
- ✅ إدارة اللاعبين
- ✅ إدارة الفائزين
- ✅ إدارة الجوائز
- ✅ إدارة الفروع
- ✅ تقارير PDF
- ✅ تصدير Excel
- ✅ إحصائيات متقدمة
- ✅ Dashboard رسوم بيانية

### اللغات
- ✅ العربية
- ✅ کوردی
- ✅ English

## 🚀 التشغيل

```bash
# تثبيت المكتبات
npm install

# تشغيل
npm start

# أو مع PM2
pm2 start server.js --name tetris
```

## 🔗 الروابط

- اللعبة: `/game.html`
- التحقق من الفوز: `/check.html`
- الفروع: `/branch.html`
- لوحة التحكم: `/ctrl_x7k9m2p4.html`

## 📦 قاعدة البيانات

PostgreSQL مطلوب. الجداول تُنشأ تلقائياً عند التشغيل.

## 🔐 بيانات الدخول الافتراضية

- **Admin**: admin / Admin@Tetris2024!

// ============== Multi-Language System ==============
const translations = {
    // العربية
    ar: {
        // عام
        app_name: "Red Strong",
        loading: "جاري التحميل...",
        save: "حفظ",
        cancel: "إلغاء",
        delete: "حذف",
        edit: "تعديل",
        add: "إضافة",
        search: "بحث",
        filter: "تصفية",
        export: "تصدير",
        back: "رجوع",
        next: "التالي",
        previous: "السابق",
        yes: "نعم",
        no: "لا",
        ok: "موافق",
        close: "إغلاق",
        success: "نجاح",
        error: "خطأ",
        warning: "تحذير",
        
        // اللعبة
        game_title: "لعبة تتريس",
        start_game: "ابدأ اللعبة",
        pause: "إيقاف مؤقت",
        resume: "استمرار",
        game_over: "انتهت اللعبة",
        score: "النقاط",
        level: "المستوى",
        lines: "الخطوط",
        high_score: "أعلى نقاط",
        new_game: "لعبة جديدة",
        play_again: "العب مرة أخرى",
        
        // التسجيل
        register: "تسجيل",
        login: "دخول",
        logout: "خروج",
        phone: "رقم الهاتف",
        name: "الاسم",
        province: "المحافظة",
        enter_phone: "أدخل رقم الهاتف",
        enter_name: "أدخل الاسم",
        select_province: "اختر المحافظة",
        
        // التحقق من الفوز
        check_win: "تحقق من فوزك",
        check_now: "تحقق الآن",
        checking: "جاري التحقق...",
        winner: "مبروك! أنت فائز!",
        not_winner: "لم تفز بعد",
        not_registered: "رقم غير مسجل",
        prize_code: "كود الجائزة",
        keep_code: "احتفظ بصورة من هذا الكود",
        claim_steps: "خطوات الاستلام",
        step1: "احتفظ بصورة من الكود",
        step2: "توجه لأقرب فرع Red Strong",
        step3: "أظهر الكود للموظف",
        step4: "استلم جائزتك!",
        share_whatsapp: "مشاركة واتساب",
        back_to_game: "العودة للعبة",
        keep_playing: "استمر باللعب لزيادة فرصك!",
        register_play: "سجّل والعب",
        
        // الفروع
        branch_login: "دخول الفرع",
        branch_name: "اسم الفرع",
        verify_prize: "التحقق من الجائزة",
        enter_prize_code: "أدخل كود الجائزة",
        verify: "تحقق",
        claim_prize: "تسليم الجائزة",
        prize_claimed: "تم تسليم الجائزة",
        invalid_code: "كود غير صحيح",
        already_claimed: "تم استلام الجائزة مسبقاً",
        employee_name: "اسم الموظف",
        notes: "ملاحظات",
        confirm_claim: "تأكيد التسليم",
        
        // لوحة التحكم
        dashboard: "لوحة التحكم",
        players: "اللاعبين",
        winners: "الفائزين",
        prizes: "الجوائز",
        branches: "الفروع",
        settings: "الإعدادات",
        reports: "التقارير",
        statistics: "الإحصائيات",
        total_players: "إجمالي اللاعبين",
        total_winners: "إجمالي الفائزين",
        pending_claims: "بانتظار الاستلام",
        claimed_prizes: "جوائز مستلمة",
        today: "اليوم",
        this_week: "هذا الأسبوع",
        this_month: "هذا الشهر",
        all_time: "الكل",
        
        // المحافظات
        baghdad: "بغداد",
        basra: "البصرة",
        erbil: "أربيل",
        sulaymaniyah: "السليمانية",
        duhok: "دهوك",
        kirkuk: "كركوك",
        nineveh: "نينوى",
        anbar: "الأنبار",
        babylon: "بابل",
        diyala: "ديالى",
        karbala: "كربلاء",
        najaf: "النجف",
        wasit: "واسط",
        maysan: "ميسان",
        dhi_qar: "ذي قار",
        muthanna: "المثنى",
        qadisiyah: "القادسية",
        saladin: "صلاح الدين",
        
        // رسائل
        phone_required: "رقم الهاتف مطلوب",
        invalid_phone: "رقم الهاتف غير صحيح",
        name_required: "الاسم مطلوب",
        province_required: "المحافظة مطلوبة",
        connection_error: "خطأ في الاتصال",
        try_again: "حاول مرة أخرى",
        session_expired: "انتهت الجلسة",
        
        // الوقت
        days: "يوم",
        hours: "ساعة",
        minutes: "دقيقة",
        seconds: "ثانية"
    },
    
    // English
    en: {
        // General
        app_name: "Red Strong",
        loading: "Loading...",
        save: "Save",
        cancel: "Cancel",
        delete: "Delete",
        edit: "Edit",
        add: "Add",
        search: "Search",
        filter: "Filter",
        export: "Export",
        back: "Back",
        next: "Next",
        previous: "Previous",
        yes: "Yes",
        no: "No",
        ok: "OK",
        close: "Close",
        success: "Success",
        error: "Error",
        warning: "Warning",
        
        // Game
        game_title: "Tetris Game",
        start_game: "Start Game",
        pause: "Pause",
        resume: "Resume",
        game_over: "Game Over",
        score: "Score",
        level: "Level",
        lines: "Lines",
        high_score: "High Score",
        new_game: "New Game",
        play_again: "Play Again",
        
        // Registration
        register: "Register",
        login: "Login",
        logout: "Logout",
        phone: "Phone Number",
        name: "Name",
        province: "Province",
        enter_phone: "Enter phone number",
        enter_name: "Enter name",
        select_province: "Select province",
        
        // Check Win
        check_win: "Check Your Win",
        check_now: "Check Now",
        checking: "Checking...",
        winner: "Congratulations! You Won!",
        not_winner: "Not a winner yet",
        not_registered: "Number not registered",
        prize_code: "Prize Code",
        keep_code: "Keep a screenshot of this code",
        claim_steps: "How to Claim",
        step1: "Screenshot the code",
        step2: "Visit nearest Red Strong branch",
        step3: "Show the code to staff",
        step4: "Get your prize!",
        share_whatsapp: "Share on WhatsApp",
        back_to_game: "Back to Game",
        keep_playing: "Keep playing to increase your chances!",
        register_play: "Register & Play",
        
        // Branch
        branch_login: "Branch Login",
        branch_name: "Branch Name",
        verify_prize: "Verify Prize",
        enter_prize_code: "Enter prize code",
        verify: "Verify",
        claim_prize: "Claim Prize",
        prize_claimed: "Prize Claimed",
        invalid_code: "Invalid Code",
        already_claimed: "Already Claimed",
        employee_name: "Employee Name",
        notes: "Notes",
        confirm_claim: "Confirm Claim",
        
        // Admin Panel
        dashboard: "Dashboard",
        players: "Players",
        winners: "Winners",
        prizes: "Prizes",
        branches: "Branches",
        settings: "Settings",
        reports: "Reports",
        statistics: "Statistics",
        total_players: "Total Players",
        total_winners: "Total Winners",
        pending_claims: "Pending Claims",
        claimed_prizes: "Claimed Prizes",
        today: "Today",
        this_week: "This Week",
        this_month: "This Month",
        all_time: "All Time",
        
        // Provinces
        baghdad: "Baghdad",
        basra: "Basra",
        erbil: "Erbil",
        sulaymaniyah: "Sulaymaniyah",
        duhok: "Duhok",
        kirkuk: "Kirkuk",
        nineveh: "Nineveh",
        anbar: "Anbar",
        babylon: "Babylon",
        diyala: "Diyala",
        karbala: "Karbala",
        najaf: "Najaf",
        wasit: "Wasit",
        maysan: "Maysan",
        dhi_qar: "Dhi Qar",
        muthanna: "Muthanna",
        qadisiyah: "Qadisiyah",
        saladin: "Saladin",
        
        // Messages
        phone_required: "Phone number is required",
        invalid_phone: "Invalid phone number",
        name_required: "Name is required",
        province_required: "Province is required",
        connection_error: "Connection error",
        try_again: "Try again",
        session_expired: "Session expired",
        
        // Time
        days: "Days",
        hours: "Hours",
        minutes: "Minutes",
        seconds: "Seconds"
    },
    
    // کوردی
    ku: {
        // گشتی
        app_name: "رێد سترۆنگ",
        loading: "چاوەڕوان بە...",
        save: "پاشەکەوت",
        cancel: "پاشگەزبوونەوە",
        delete: "سڕینەوە",
        edit: "دەستکاری",
        add: "زیادکردن",
        search: "گەڕان",
        filter: "فلتەر",
        export: "هەناردن",
        back: "گەڕانەوە",
        next: "دواتر",
        previous: "پێشتر",
        yes: "بەڵێ",
        no: "نەخێر",
        ok: "باشە",
        close: "داخستن",
        success: "سەرکەوتوو",
        error: "هەڵە",
        warning: "ئاگاداری",
        
        // یاری
        game_title: "یاری تێتریس",
        start_game: "دەستپێکردن",
        pause: "وەستان",
        resume: "بەردەوامبوون",
        game_over: "یاری تەواو بوو",
        score: "خاڵ",
        level: "ئاست",
        lines: "هێڵ",
        high_score: "باڵاترین خاڵ",
        new_game: "یاری نوێ",
        play_again: "دووبارە یاری بکە",
        
        // تۆمارکردن
        register: "تۆمارکردن",
        login: "چوونەژوورەوە",
        logout: "چوونەدەرەوە",
        phone: "ژمارەی مۆبایل",
        name: "ناو",
        province: "پارێزگا",
        enter_phone: "ژمارەی مۆبایل بنووسە",
        enter_name: "ناو بنووسە",
        select_province: "پارێزگا هەڵبژێرە",
        
        // پشکنینی بردنەوە
        check_win: "پشکنینی بردنەوە",
        check_now: "ئێستا پشکنین بکە",
        checking: "پشکنین دەکرێت...",
        winner: "پیرۆزە! تۆ بردیتەوە!",
        not_winner: "هێشتا نەبردووە",
        not_registered: "ژمارە تۆمار نەکراوە",
        prize_code: "کۆدی خەڵات",
        keep_code: "وێنەیەک لەم کۆدە بگرە",
        claim_steps: "هەنگاوەکانی وەرگرتن",
        step1: "وێنەیەک لە کۆدەکە بگرە",
        step2: "بڕۆ بۆ نزیکترین لق",
        step3: "کۆدەکە پیشانی کارمەند بدە",
        step4: "خەڵاتەکەت وەربگرە!",
        share_whatsapp: "هاوبەشی لە واتساپ",
        back_to_game: "گەڕانەوە بۆ یاری",
        keep_playing: "بەردەوام بە لە یاری بۆ زیادکردنی هەلەکانت!",
        register_play: "تۆمار بکە و یاری بکە",
        
        // لق
        branch_login: "چوونەژوورەوەی لق",
        branch_name: "ناوی لق",
        verify_prize: "پشکنینی خەڵات",
        enter_prize_code: "کۆدی خەڵات بنووسە",
        verify: "پشکنین",
        claim_prize: "وەرگرتنی خەڵات",
        prize_claimed: "خەڵات وەرگیرا",
        invalid_code: "کۆد هەڵەیە",
        already_claimed: "پێشتر وەرگیراوە",
        employee_name: "ناوی کارمەند",
        notes: "تێبینی",
        confirm_claim: "دڵنیاکردنەوە",
        
        // پانێڵی بەڕێوەبەر
        dashboard: "داشبۆرد",
        players: "یاریزانەکان",
        winners: "بردنەوەکان",
        prizes: "خەڵاتەکان",
        branches: "لقەکان",
        settings: "ڕێکخستنەکان",
        reports: "ڕاپۆرتەکان",
        statistics: "ئامارەکان",
        total_players: "کۆی یاریزانەکان",
        total_winners: "کۆی بردنەوەکان",
        pending_claims: "چاوەڕوانی وەرگرتن",
        claimed_prizes: "خەڵاتی وەرگیراو",
        today: "ئەمڕۆ",
        this_week: "ئەم هەفتەیە",
        this_month: "ئەم مانگە",
        all_time: "هەموو",
        
        // پارێزگاکان
        baghdad: "بەغدا",
        basra: "بەسرە",
        erbil: "هەولێر",
        sulaymaniyah: "سلێمانی",
        duhok: "دهۆک",
        kirkuk: "کەرکووک",
        nineveh: "نەینەوا",
        anbar: "ئەنبار",
        babylon: "بابل",
        diyala: "دیالە",
        karbala: "کەربەلا",
        najaf: "نەجەف",
        wasit: "واسیت",
        maysan: "مەیسان",
        dhi_qar: "زیقار",
        muthanna: "موسەننا",
        qadisiyah: "قادسیە",
        saladin: "سەلاحەدین",
        
        // پەیامەکان
        phone_required: "ژمارەی مۆبایل پێویستە",
        invalid_phone: "ژمارەی مۆبایل هەڵەیە",
        name_required: "ناو پێویستە",
        province_required: "پارێزگا پێویستە",
        connection_error: "هەڵەی پەیوەندی",
        try_again: "دووبارە هەوڵ بدەرەوە",
        session_expired: "کاتی دانیشتن تەواو بوو",
        
        // کات
        days: "ڕۆژ",
        hours: "کاتژمێر",
        minutes: "خولەک",
        seconds: "چرکە"
    }
};

// ============== Language Manager ==============
class LanguageManager {
    constructor() {
        this.currentLang = localStorage.getItem('rs_language') || 'ar';
        this.direction = this.currentLang === 'en' ? 'ltr' : 'rtl';
    }
    
    setLanguage(lang) {
        if (!translations[lang]) return;
        this.currentLang = lang;
        this.direction = lang === 'en' ? 'ltr' : 'rtl';
        localStorage.setItem('rs_language', lang);
        document.documentElement.setAttribute('dir', this.direction);
        document.documentElement.setAttribute('lang', lang);
        this.updatePage();
    }
    
    t(key) {
        return translations[this.currentLang]?.[key] || translations['ar']?.[key] || key;
    }
    
    updatePage() {
        document.querySelectorAll('[data-translate]').forEach(el => {
            const key = el.getAttribute('data-translate');
            el.textContent = this.t(key);
        });
        document.querySelectorAll('[data-translate-placeholder]').forEach(el => {
            const key = el.getAttribute('data-translate-placeholder');
            el.placeholder = this.t(key);
        });
        document.querySelectorAll('[data-translate-title]').forEach(el => {
            const key = el.getAttribute('data-translate-title');
            el.title = this.t(key);
        });
    }
    
    getCurrentLang() {
        return this.currentLang;
    }
    
    getLanguages() {
        return [
            { code: 'ar', name: 'العربية', flag: '🇮🇶' },
            { code: 'ku', name: 'کوردی', flag: '🟢' },
            { code: 'en', name: 'English', flag: '🇬🇧' }
        ];
    }
    
    createSelector(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        const languages = this.getLanguages();
        const currentLang = languages.find(l => l.code === this.currentLang);
        
        container.innerHTML = `
            <div class="lang-selector">
                <button class="lang-btn" onclick="langManager.toggleDropdown()">
                    <span>${currentLang?.flag || '🌐'}</span>
                    <span>${currentLang?.name || 'Language'}</span>
                </button>
                <div class="lang-dropdown" id="lang-dropdown">
                    ${languages.map(l => `
                        <div class="lang-option ${l.code === this.currentLang ? 'active' : ''}" onclick="langManager.setLanguage('${l.code}')">
                            <span>${l.flag}</span>
                            <span>${l.name}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    toggleDropdown() {
        const dropdown = document.getElementById('lang-dropdown');
        if (dropdown) {
            dropdown.classList.toggle('show');
        }
    }
}

// Create global instance
const langManager = new LanguageManager();

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.lang-selector')) {
        const dropdown = document.getElementById('lang-dropdown');
        if (dropdown) dropdown.classList.remove('show');
    }
});

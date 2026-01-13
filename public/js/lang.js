/**
 * Red Strong - Unified Multi-Language System
 * Supports: Arabic, Kurdish, English
 * Used by: All pages including Admin Panel
 */
(function() {
    'use strict';
    
    // ========== COMPLETE TRANSLATIONS ==========
    const T = {
        ar: {
            // ===== GAME & COMMON =====
            play: 'العب الآن',
            score: 'النقاط',
            level: 'المستوى',
            lines: 'الخطوط',
            game_over: 'انتهت اللعبة',
            new_game: 'لعبة جديدة',
            pause: 'إيقاف',
            resume: 'استمرار',
            exit: 'خروج',
            
            // Registration
            register: 'تسجيل',
            name: 'الاسم',
            phone: 'الهاتف',
            province: 'المحافظة',
            enter_name: 'أدخل اسمك',
            enter_phone: 'أدخل رقم الهاتف',
            select_province: 'اختر المحافظة',
            
            // Check Win
            check_win: 'تحقق من فوزك',
            check_now: 'تحقق الآن',
            winner: 'فائز',
            not_winner: 'لم تفز بعد',
            prize_code: 'كود الجائزة',
            back_to_game: 'العودة للعبة',
            share: 'مشاركة',
            
            // Stats
            your_stats: 'إحصائياتك',
            your_score: 'نقاطك',
            your_games: 'ألعابك',
            your_rank: 'ترتيبك',
            progress: 'تقدمك نحو الفوز',
            
            // Countdown
            next_draw: 'السحب القادم خلال',
            days: 'يوم',
            hours: 'ساعة',
            minutes: 'دقيقة',
            seconds: 'ثانية',
            
            // Prize
            weekly_prize: 'جائزة الأسبوع',
            play_and_win: 'العب واربح!',
            
            // Common
            loading: 'جاري التحميل...',
            error: 'حدث خطأ',
            success: 'تم بنجاح',
            save: '💾 حفظ',
            cancel: 'إلغاء',
            close: 'إغلاق',
            confirm: 'تأكيد',
            yes: 'نعم',
            no: 'لا',
            delete: 'حذف',
            edit: 'تعديل',
            add: 'إضافة',
            refresh: '🔄 تحديث',
            no_data: 'لا يوجد بيانات',
            
            // ===== ADMIN PANEL =====
            // Login
            login_title: 'لوحة التحكم',
            username: 'اسم المستخدم',
            password: 'كلمة المرور',
            login_btn: '🔐 تسجيل الدخول',
            
            // Menu Sections
            menu_main: 'الرئيسية',
            menu_settings: 'الإعدادات',
            menu_system: 'النظام',
            
            // Menu Items
            dashboard: 'لوحة المعلومات',
            players: 'اللاعبين',
            roulette: 'الروليت',
            prizes: 'الجوائز',
            announcements: 'الإعلانات',
            branches: 'الفروع',
            users: 'المستخدمين',
            coupons: 'الكوبونات',
            settings: 'إعدادات',
            game: 'اللعبة',
            points: 'النقاط',
            brand: 'هوية الموقع',
            social: 'السوشيال',
            contact: 'التواصل',
            contest: 'المسابقة',
            display: 'خيارات العرض',
            blocked_provinces: 'حظر المحافظات',
            danger_zone: 'منطقة الخطر',
            backup: 'النسخ الاحتياطي',
            logs: 'سجل النشاطات',
            referrals: 'الإحالات',
            whatsapp: 'WhatsApp',
            reports: 'التقارير',
            analytics: 'التحليلات',
            blocking: 'الحظر',
            lucky_wheel: 'عجلة الحظ',
            
            // Dashboard
            total_players: 'إجمالي اللاعبين',
            winners: 'الفائزين',
            claimed: 'تم الاستلام',
            pending: 'بانتظار الاستلام',
            new_players: 'اللاعبين الجدد',
            province_distribution: 'توزيع المحافظات',
            recent_activity: 'آخر النشاطات',
            top_scores: 'أعلى النقاط',
            winners_by_province: 'الفائزين حسب المحافظة',
            
            // Players
            player_list: 'قائمة اللاعبين',
            search: 'بحث...',
            all_provinces: 'كل المحافظات',
            all_status: 'كل الحالات',
            registered: 'مسجل',
            export_excel: '📥 تصدير Excel',
            date: 'التاريخ',
            actions: 'إجراءات',
            status: 'الحالة',
            
            // Roulette
            spin_roulette: 'سحب الروليت',
            eligible_players: 'اللاعبين المؤهلين',
            min_score: 'الحد الأدنى',
            spin_btn: '🎰 سحب فائز',
            the_winner: '🎉 الفائز',
            code: 'الكود',
            eligible_for_spin: 'المؤهلين للسحب',
            
            // Users
            add_user: '+ إضافة مستخدم',
            edit_user: 'تعديل مستخدم',
            username_label: 'اسم المستخدم',
            full_name: 'الاسم الكامل',
            role: 'الصلاحية',
            admin: '👑 مدير',
            moderator: '👤 مشرف',
            staff: '🏪 موظف',
            active: 'فعال',
            inactive: 'موقف',
            last_login: 'آخر دخول',
            account_active: 'الحساب فعال',
            roles_explanation: 'شرح الصلاحيات',
            admin_desc: 'جميع الصلاحيات - إعدادات، حذف، إضافة مستخدمين',
            moderator_desc: 'عرض وتعديل اللاعبين، الروليت، الجوائز',
            staff_desc: 'تسليم الجوائز فقط',
            
            // Settings
            game_status: 'حالة اللعبة',
            game_status_desc: 'تفعيل أو إيقاف اللعبة بالكامل',
            require_location: 'الموقع الجغرافي إجباري',
            require_location_desc: 'طلب صلاحية الموقع من اللاعبين',
            num_rounds: 'عدد الجولات',
            cooldown: 'فترة الانتظار (دقيقة)',
            difficulty: 'صعوبة الجولة',
            save_settings: '💾 حفظ الإعدادات',
            min_roulette: 'الحد الأدنى للروليت',
            max_winners: 'الحد الأقصى للفائزين',
            site_name: 'اسم الموقع (بالإنجليزي)',
            page_title: 'عنوان الصفحة',
            subtitle: 'العنوان الفرعي',
            logo_letters: 'حروف اللوغو',
            footer_company: 'اسم الشركة (الفوتر)',
            logo_image: 'صورة اللوغو',
            colors: '🌈 الألوان',
            primary_color: 'اللون الرئيسي',
            secondary_color: 'اللون الثانوي',
            gold_color: 'اللون الذهبي',
            show_social: 'إظهار روابط السوشيال',
            show_social_desc: 'عرض أيقونات التواصل الاجتماعي',
            facebook: '📘 رابط فيسبوك',
            instagram: '📸 رابط انستغرام',
            tiktok: '🎵 رابط تيك توك',
            show_contact: 'إظهار معلومات التواصل',
            show_contact_desc: 'عرض رقم الهاتف والإيميل',
            contact_phone: 'رقم الهاتف',
            contact_email: 'البريد الإلكتروني',
            contact_address: 'العنوان',
            contest_desc: 'وصف المسابقة',
            show_countdown: 'عرض العد التنازلي',
            show_countdown_desc: 'إظهار الوقت المتبقي للمسابقة',
            start_date: 'تاريخ بداية المسابقة',
            end_date: 'تاريخ نهاية المسابقة',
            show_features: 'إظهار قائمة الميزات',
            show_leaderboard: 'إظهار لوحة المتصدرين',
            show_players_count: 'إظهار عدد اللاعبين',
            show_achievements: 'إظهار الإنجازات',
            select_blocked: 'اختر المحافظات التي تريد منع التسجيل منها:',
            danger_warning: 'هذه الإجراءات لا يمكن التراجع عنها!',
            reset_winners: '🔄 إعادة تعيين الفائزين',
            delete_all: '🗑️ حذف جميع اللاعبين',
            reset_scores: '📊 إعادة تعيين النقاط',
            
            // Backup
            create_backup: '+ إنشاء نسخة',
            auto_backup: 'نسخ احتياطي تلقائي',
            auto_backup_desc: 'إنشاء نسخة يومية تلقائياً',
            saved_backups: '📁 النسخ المحفوظة',
            download: '📥 تحميل',
            restore: '🔄 استعادة',
            
            // Logs
            activity_logs: 'سجل النشاطات',
            time: 'الوقت',
            user: 'المستخدم',
            action: 'الإجراء',
            details: 'التفاصيل',
            ip: 'IP',
            
            // Notifications
            notifications: '🔔 الإشعارات',
            mark_all_read: 'قراءة الكل',
            no_notifications: 'لا يوجد إشعارات',
            
            // Time
            now: 'الآن',
            minutes_ago: 'منذ {n} دقيقة',
            hours_ago: 'منذ {n} ساعة',
            
            // Confirmations
            confirm_delete_player: 'هل أنت متأكد من حذف هذا اللاعب؟',
            confirm_make_winner: 'هل تريد تعيين هذا اللاعب كفائز؟',
            confirm_delete_user: 'هل أنت متأكد من حذف هذا المستخدم؟',
            confirm_reset_winners: 'سيتم إزالة حالة الفوز من جميع اللاعبين. هل أنت متأكد؟',
            confirm_reset_all: 'سيتم حذف جميع بيانات اللاعبين نهائياً! هل أنت متأكد؟',
            confirm_reset_scores: 'سيتم إعادة نقاط جميع اللاعبين إلى صفر. هل أنت متأكد؟',
            
            // Welcome
            welcome: 'مرحباً',
            
            // Branch
            branch_login: 'دخول الفرع',
            verify_code: 'تحقق من الكود',
            claim_prize: 'تسليم الجائزة',
            branch_name: 'اسم الفرع',
            branch_phone: 'رقم الفرع',
            location: 'الموقع'
        },
        
        ku: {
            // ===== GAME & COMMON =====
            play: 'ئێستا یاری بکە',
            score: 'خاڵ',
            level: 'ئاست',
            lines: 'هێڵ',
            game_over: 'یاری تەواو بوو',
            new_game: 'یاری نوێ',
            pause: 'وەستان',
            resume: 'بەردەوامبوون',
            exit: 'دەرچوون',
            
            // Registration
            register: 'تۆمارکردن',
            name: 'ناو',
            phone: 'ژمارەی مۆبایل',
            province: 'پارێزگا',
            enter_name: 'ناوت بنووسە',
            enter_phone: 'ژمارەی مۆبایل بنووسە',
            select_province: 'پارێزگا هەڵبژێرە',
            
            // Check Win
            check_win: 'پشکنینی بردنەوە',
            check_now: 'ئێستا پشکنین بکە',
            winner: 'براوە',
            not_winner: 'هێشتا نەبردووە',
            prize_code: 'کۆدی خەڵات',
            back_to_game: 'گەڕانەوە بۆ یاری',
            share: 'هاوبەشیکردن',
            
            // Stats
            your_stats: 'ئامارەکانت',
            your_score: 'خاڵەکانت',
            your_games: 'یاریەکانت',
            your_rank: 'پلەت',
            progress: 'پێشکەوتنت بۆ بردنەوە',
            
            // Countdown
            next_draw: 'پشکی داهاتوو لە ماوەی',
            days: 'ڕۆژ',
            hours: 'کاتژمێر',
            minutes: 'خولەک',
            seconds: 'چرکە',
            
            // Prize
            weekly_prize: 'خەڵاتی هەفتانە',
            play_and_win: 'یاری بکە و ببەرەوە!',
            
            // Common
            loading: 'چاوەڕوان بە...',
            error: 'هەڵە ڕوویدا',
            success: 'سەرکەوتوو بوو',
            save: '💾 پاشەکەوتکردن',
            cancel: 'پاشگەزبوونەوە',
            close: 'داخستن',
            confirm: 'دڵنیاکردنەوە',
            yes: 'بەڵێ',
            no: 'نەخێر',
            delete: 'سڕینەوە',
            edit: 'دەستکاری',
            add: 'زیادکردن',
            refresh: '🔄 نوێکردنەوە',
            no_data: 'داتا نیە',
            
            // ===== ADMIN PANEL =====
            // Login
            login_title: 'پانێڵی کۆنترۆڵ',
            username: 'ناوی بەکارهێنەر',
            password: 'وشەی نهێنی',
            login_btn: '🔐 چوونەژوورەوە',
            
            // Menu Sections
            menu_main: 'سەرەکی',
            menu_settings: 'ڕێکخستنەکان',
            menu_system: 'سیستەم',
            
            // Menu Items
            dashboard: 'داشبۆرد',
            players: 'یاریزانەکان',
            roulette: 'ڕولێت',
            prizes: 'خەڵاتەکان',
            announcements: 'ڕاگەیاندنەکان',
            branches: 'لقەکان',
            users: 'بەکارهێنەرەکان',
            coupons: 'کوپۆنەکان',
            settings: 'ڕێکخستنەکان',
            game: 'یاری',
            points: 'خاڵەکان',
            brand: 'ناسنامەی ماڵپەڕ',
            social: 'تۆڕە کۆمەڵایەتیەکان',
            contact: 'پەیوەندی',
            contest: 'پێشبڕکێ',
            display: 'بژاردەکانی پیشاندان',
            blocked_provinces: 'پارێزگاکانی قەدەغەکراو',
            danger_zone: 'ناوچەی مەترسیدار',
            backup: 'پاشگری',
            logs: 'تۆماری چالاکیەکان',
            referrals: 'ئاماژەکان',
            whatsapp: 'واتساپ',
            reports: 'ڕاپۆرتەکان',
            analytics: 'شیکاری',
            blocking: 'بلۆک',
            lucky_wheel: 'چەرخی بەختەوەری',
            
            // Dashboard
            total_players: 'کۆی یاریزانەکان',
            winners: 'بردنەوەکان',
            claimed: 'وەرگیراو',
            pending: 'چاوەڕوان',
            new_players: 'یاریزانە نوێکان',
            province_distribution: 'دابەشبوونی پارێزگاکان',
            recent_activity: 'دوایین چالاکیەکان',
            top_scores: 'باڵاترین خاڵەکان',
            winners_by_province: 'براوەکان بەپێی پارێزگا',
            
            // Players
            player_list: 'لیستی یاریزانەکان',
            search: 'گەڕان...',
            all_provinces: 'هەموو پارێزگاکان',
            all_status: 'هەموو دۆخەکان',
            registered: 'تۆمارکراو',
            export_excel: '📥 هەناردەی ئێکسڵ',
            date: 'بەروار',
            actions: 'کردارەکان',
            status: 'دۆخ',
            
            // Roulette
            spin_roulette: 'ڕولێت',
            eligible_players: 'یاریزانە شایستەکان',
            min_score: 'کەمترین خاڵ',
            spin_btn: '🎰 پشک بکێشە',
            the_winner: '🎉 براوە',
            code: 'کۆد',
            eligible_for_spin: 'شایستەی پشک',
            
            // Users
            add_user: '+ زیادکردنی بەکارهێنەر',
            edit_user: 'دەستکاری بەکارهێنەر',
            username_label: 'ناوی بەکارهێنەر',
            full_name: 'ناوی تەواو',
            role: 'ڕۆڵ',
            admin: '👑 بەڕێوەبەر',
            moderator: '👤 سەرپەرشتیار',
            staff: '🏪 کارمەند',
            active: 'چالاک',
            inactive: 'ناچالاک',
            last_login: 'دوایین چوونەژوورەوە',
            account_active: 'هەژمار چالاکە',
            roles_explanation: 'ڕوونکردنەوەی ڕۆڵەکان',
            admin_desc: 'هەموو دەسەڵاتەکان',
            moderator_desc: 'بینین و دەستکاری یاریزانەکان',
            staff_desc: 'پێدانی خەڵات تەنها',
            
            // Settings
            game_status: 'دۆخی یاری',
            game_status_desc: 'چالاککردن یان ناچالاککردنی یاری',
            require_location: 'پێویستی شوێن',
            require_location_desc: 'داواکردنی مۆڵەتی شوێن',
            num_rounds: 'ژمارەی قۆناغەکان',
            cooldown: 'کاتی چاوەڕوانی (خولەک)',
            difficulty: 'ئاستی سەختی',
            save_settings: '💾 پاشەکەوتکردن',
            min_roulette: 'کەمترین بۆ ڕولێت',
            max_winners: 'زۆرترین براوە',
            site_name: 'ناوی ماڵپەڕ',
            page_title: 'ناونیشانی پەڕە',
            subtitle: 'ژێرناونیشان',
            logo_letters: 'پیتەکانی لۆگۆ',
            footer_company: 'ناوی کۆمپانیا',
            logo_image: 'وێنەی لۆگۆ',
            colors: '🌈 ڕەنگەکان',
            primary_color: 'ڕەنگی سەرەکی',
            secondary_color: 'ڕەنگی دووەم',
            gold_color: 'ڕەنگی زێڕین',
            show_social: 'پیشاندانی لینکەکانی کۆمەڵایەتی',
            show_social_desc: 'پیشاندانی ئایکۆنەکان',
            facebook: '📘 لینکی فەیسبووک',
            instagram: '📸 لینکی ئینستاگرام',
            tiktok: '🎵 لینکی تیکتۆک',
            show_contact: 'پیشاندانی زانیاری پەیوەندی',
            show_contact_desc: 'پیشاندانی ژمارە و ئیمەیڵ',
            contact_phone: 'ژمارەی تەلەفۆن',
            contact_email: 'ئیمەیڵ',
            contact_address: 'ناونیشان',
            contest_desc: 'وەسفی پێشبڕکێ',
            show_countdown: 'پیشاندانی ژمێردنەوە',
            show_countdown_desc: 'پیشاندانی کاتی ماوە',
            start_date: 'بەرواری دەستپێکردن',
            end_date: 'بەرواری کۆتایی',
            show_features: 'پیشاندانی تایبەتمەندیەکان',
            show_leaderboard: 'پیشاندانی پلەبەندی',
            show_players_count: 'پیشاندانی ژمارەی یاریزان',
            show_achievements: 'پیشاندانی دەستکەوتەکان',
            select_blocked: 'پارێزگاکان هەڵبژێرە بۆ قەدەغەکردن:',
            danger_warning: 'ئەم کردارانە ناگەڕێنەوە!',
            reset_winners: '🔄 ڕیسێتی براوەکان',
            delete_all: '🗑️ سڕینەوەی هەموو',
            reset_scores: '📊 ڕیسێتی خاڵەکان',
            
            // Backup
            create_backup: '+ دروستکردنی پاشگری',
            auto_backup: 'پاشگری ئۆتۆماتیکی',
            auto_backup_desc: 'دروستکردنی پاشگری ڕۆژانە',
            saved_backups: '📁 پاشگریە هەڵگیراوەکان',
            download: '📥 داگرتن',
            restore: '🔄 گەڕاندنەوە',
            
            // Logs
            activity_logs: 'تۆماری چالاکیەکان',
            time: 'کات',
            user: 'بەکارهێنەر',
            action: 'کردار',
            details: 'وردەکاری',
            ip: 'IP',
            
            // Notifications
            notifications: '🔔 ئاگاداریەکان',
            mark_all_read: 'خوێندنەوەی هەموو',
            no_notifications: 'ئاگاداری نیە',
            
            // Time
            now: 'ئێستا',
            minutes_ago: 'پێش {n} خولەک',
            hours_ago: 'پێش {n} کاتژمێر',
            
            // Confirmations
            confirm_delete_player: 'دڵنیایت لە سڕینەوەی ئەم یاریزانە؟',
            confirm_make_winner: 'دەتەوێت ئەم یاریزانە براوە بکەیت؟',
            confirm_delete_user: 'دڵنیایت لە سڕینەوەی ئەم بەکارهێنەرە؟',
            confirm_reset_winners: 'دۆخی براوە لە هەموو یاریزانەکان دەسڕێتەوە. دڵنیایت؟',
            confirm_reset_all: 'هەموو داتای یاریزانەکان دەسڕێتەوە! دڵنیایت؟',
            confirm_reset_scores: 'خاڵی هەموو یاریزانەکان دەگەڕێتەوە بۆ سفر. دڵنیایت؟',
            
            // Welcome
            welcome: 'بەخێربێیت',
            
            // Branch
            branch_login: 'چوونەژوورەوەی لق',
            verify_code: 'پشکنینی کۆد',
            claim_prize: 'وەرگرتنی خەڵات',
            branch_name: 'ناوی لق',
            branch_phone: 'ژمارەی لق',
            location: 'شوێن'
        },
        
        en: {
            // ===== GAME & COMMON =====
            play: 'Play Now',
            score: 'Score',
            level: 'Level',
            lines: 'Lines',
            game_over: 'Game Over',
            new_game: 'New Game',
            pause: 'Pause',
            resume: 'Resume',
            exit: 'Exit',
            
            // Registration
            register: 'Register',
            name: 'Name',
            phone: 'Phone',
            province: 'Province',
            enter_name: 'Enter your name',
            enter_phone: 'Enter phone number',
            select_province: 'Select province',
            
            // Check Win
            check_win: 'Check Your Win',
            check_now: 'Check Now',
            winner: 'Winner',
            not_winner: 'Not a winner yet',
            prize_code: 'Prize Code',
            back_to_game: 'Back to Game',
            share: 'Share',
            
            // Stats
            your_stats: 'Your Stats',
            your_score: 'Your Score',
            your_games: 'Your Games',
            your_rank: 'Your Rank',
            progress: 'Progress to Win',
            
            // Countdown
            next_draw: 'Next Draw In',
            days: 'Days',
            hours: 'Hours',
            minutes: 'Minutes',
            seconds: 'Seconds',
            
            // Prize
            weekly_prize: 'Weekly Prize',
            play_and_win: 'Play & Win!',
            
            // Common
            loading: 'Loading...',
            error: 'Error occurred',
            success: 'Success',
            save: '💾 Save',
            cancel: 'Cancel',
            close: 'Close',
            confirm: 'Confirm',
            yes: 'Yes',
            no: 'No',
            delete: 'Delete',
            edit: 'Edit',
            add: 'Add',
            refresh: '🔄 Refresh',
            no_data: 'No data',
            
            // ===== ADMIN PANEL =====
            // Login
            login_title: 'Control Panel',
            username: 'Username',
            password: 'Password',
            login_btn: '🔐 Login',
            
            // Menu Sections
            menu_main: 'Main',
            menu_settings: 'Settings',
            menu_system: 'System',
            
            // Menu Items
            dashboard: 'Dashboard',
            players: 'Players',
            roulette: 'Roulette',
            prizes: 'Prizes',
            announcements: 'Announcements',
            branches: 'Branches',
            users: 'Users',
            coupons: 'Coupons',
            settings: 'Settings',
            game: 'Game',
            points: 'Points',
            brand: 'Branding',
            social: 'Social Media',
            contact: 'Contact',
            contest: 'Contest',
            display: 'Display Options',
            blocked_provinces: 'Blocked Provinces',
            danger_zone: 'Danger Zone',
            backup: 'Backup',
            logs: 'Activity Logs',
            referrals: 'Referrals',
            whatsapp: 'WhatsApp',
            reports: 'Reports',
            analytics: 'Analytics',
            blocking: 'Blocking',
            lucky_wheel: 'Lucky Wheel',
            
            // Dashboard
            total_players: 'Total Players',
            winners: 'Winners',
            claimed: 'Claimed',
            pending: 'Pending',
            new_players: 'New Players',
            province_distribution: 'Province Distribution',
            recent_activity: 'Recent Activity',
            top_scores: 'Top Scores',
            winners_by_province: 'Winners by Province',
            
            // Players
            player_list: 'Players List',
            search: 'Search...',
            all_provinces: 'All Provinces',
            all_status: 'All Status',
            registered: 'Registered',
            export_excel: '📥 Export Excel',
            date: 'Date',
            actions: 'Actions',
            status: 'Status',
            
            // Roulette
            spin_roulette: 'Spin Roulette',
            eligible_players: 'Eligible Players',
            min_score: 'Minimum Score',
            spin_btn: '🎰 Spin',
            the_winner: '🎉 Winner',
            code: 'Code',
            eligible_for_spin: 'Eligible for Spin',
            
            // Users
            add_user: '+ Add User',
            edit_user: 'Edit User',
            username_label: 'Username',
            full_name: 'Full Name',
            role: 'Role',
            admin: '👑 Admin',
            moderator: '👤 Moderator',
            staff: '🏪 Staff',
            active: 'Active',
            inactive: 'Inactive',
            last_login: 'Last Login',
            account_active: 'Account Active',
            roles_explanation: 'Roles Explanation',
            admin_desc: 'Full access - Settings, Delete, Add users',
            moderator_desc: 'View and edit players, roulette, prizes',
            staff_desc: 'Prize delivery only',
            
            // Settings
            game_status: 'Game Status',
            game_status_desc: 'Enable or disable the game',
            require_location: 'Require Location',
            require_location_desc: 'Request location permission from players',
            num_rounds: 'Number of Rounds',
            cooldown: 'Cooldown (minutes)',
            difficulty: 'Round Difficulty',
            save_settings: '💾 Save Settings',
            min_roulette: 'Minimum for Roulette',
            max_winners: 'Maximum Winners',
            site_name: 'Site Name (English)',
            page_title: 'Page Title',
            subtitle: 'Subtitle',
            logo_letters: 'Logo Letters',
            footer_company: 'Footer Company',
            logo_image: 'Logo Image',
            colors: '🌈 Colors',
            primary_color: 'Primary Color',
            secondary_color: 'Secondary Color',
            gold_color: 'Gold Color',
            show_social: 'Show Social Links',
            show_social_desc: 'Display social media icons',
            facebook: '📘 Facebook URL',
            instagram: '📸 Instagram URL',
            tiktok: '🎵 TikTok URL',
            show_contact: 'Show Contact Info',
            show_contact_desc: 'Display phone and email',
            contact_phone: 'Phone Number',
            contact_email: 'Email',
            contact_address: 'Address',
            contest_desc: 'Contest Description',
            show_countdown: 'Show Countdown',
            show_countdown_desc: 'Display remaining time',
            start_date: 'Start Date',
            end_date: 'End Date',
            show_features: 'Show Features',
            show_leaderboard: 'Show Leaderboard',
            show_players_count: 'Show Players Count',
            show_achievements: 'Show Achievements',
            select_blocked: 'Select provinces to block:',
            danger_warning: 'These actions cannot be undone!',
            reset_winners: '🔄 Reset Winners',
            delete_all: '🗑️ Delete All Players',
            reset_scores: '📊 Reset Scores',
            
            // Backup
            create_backup: '+ Create Backup',
            auto_backup: 'Auto Backup',
            auto_backup_desc: 'Create daily backup automatically',
            saved_backups: '📁 Saved Backups',
            download: '📥 Download',
            restore: '🔄 Restore',
            
            // Logs
            activity_logs: 'Activity Logs',
            time: 'Time',
            user: 'User',
            action: 'Action',
            details: 'Details',
            ip: 'IP',
            
            // Notifications
            notifications: '🔔 Notifications',
            mark_all_read: 'Mark all read',
            no_notifications: 'No notifications',
            
            // Time
            now: 'Now',
            minutes_ago: '{n} minutes ago',
            hours_ago: '{n} hours ago',
            
            // Confirmations
            confirm_delete_player: 'Are you sure you want to delete this player?',
            confirm_make_winner: 'Do you want to make this player a winner?',
            confirm_delete_user: 'Are you sure you want to delete this user?',
            confirm_reset_winners: 'This will remove winner status from all players. Are you sure?',
            confirm_reset_all: 'This will permanently delete all player data! Are you sure?',
            confirm_reset_scores: 'This will reset all player scores to zero. Are you sure?',
            
            // Welcome
            welcome: 'Welcome',
            
            // Branch
            branch_login: 'Branch Login',
            verify_code: 'Verify Code',
            claim_prize: 'Claim Prize',
            branch_name: 'Branch Name',
            branch_phone: 'Branch Phone',
            location: 'Location'
        }
    };
    
    // ========== LANGUAGE MANAGER ==========
    const Lang = {
        current: localStorage.getItem('rs_lang') || 'ar',
        isAdmin: window.location.pathname.includes('admin') || window.location.pathname.includes('ctrl_'),
        
        // Get translation
        t: function(key) {
            return T[this.current]?.[key] || T['ar']?.[key] || key;
        },
        
        // Set language
        set: function(lang) {
            if (!T[lang]) return;
            this.current = lang;
            localStorage.setItem('rs_lang', lang);
            
            // Update direction
            const dir = lang === 'en' ? 'ltr' : 'rtl';
            document.documentElement.setAttribute('dir', dir);
            document.documentElement.setAttribute('lang', lang);
            
            // Update all elements with data-lang attribute
            document.querySelectorAll('[data-lang]').forEach(el => {
                const key = el.getAttribute('data-lang');
                if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                    el.placeholder = this.t(key);
                } else {
                    el.textContent = this.t(key);
                }
            });
            
            // Update button display
            this.updateBtn();
            
            // Dispatch event for custom handlers (like admin panel)
            window.dispatchEvent(new CustomEvent('langChanged', { detail: { lang } }));
        },
        
        // Update button display
        updateBtn: function() {
            const btn = document.getElementById('rs-lang-btn');
            if (!btn) return;
            const flags = { ar: '🇮🇶', ku: '🟢', en: '🇬🇧' };
            btn.textContent = flags[this.current] || '🌐';
        },
        
        // Toggle language (cycle through)
        toggle: function() {
            const langs = ['ar', 'ku', 'en'];
            const idx = langs.indexOf(this.current);
            const next = langs[(idx + 1) % langs.length];
            this.set(next);
        },
        
        // Create language selector button (for non-admin pages)
        createBtn: function() {
            // Don't create button for admin pages - they have their own UI
            if (this.isAdmin) return;
            
            if (document.getElementById('rs-lang-btn')) return;
            
            const btn = document.createElement('button');
            btn.id = 'rs-lang-btn';
            btn.title = 'Change Language';
            btn.onclick = () => this.toggle();
            
            btn.style.cssText = `
                position: fixed;
                bottom: 20px;
                left: 20px;
                width: 50px;
                height: 50px;
                border-radius: 50%;
                border: none;
                background: rgba(0,0,0,0.7);
                color: white;
                font-size: 24px;
                cursor: pointer;
                z-index: 99999;
                box-shadow: 0 4px 15px rgba(0,0,0,0.3);
                transition: transform 0.2s;
            `;
            
            btn.onmouseenter = () => btn.style.transform = 'scale(1.1)';
            btn.onmouseleave = () => btn.style.transform = 'scale(1)';
            
            document.body.appendChild(btn);
            this.updateBtn();
        },
        
        // Initialize
        init: function() {
            // Set initial direction
            const dir = this.current === 'en' ? 'ltr' : 'rtl';
            document.documentElement.setAttribute('dir', dir);
            document.documentElement.setAttribute('lang', this.current);
            
            // Create button when DOM ready (only for non-admin)
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.createBtn());
            } else {
                this.createBtn();
            }
        }
    };
    
    // ========== EXPORT ==========
    window.Lang = Lang;
    window.T = T; // Export translations for admin to use
    // Note: window.t not exported to avoid conflicts with pages that define their own t()
    
    // Auto initialize
    Lang.init();
    
})();

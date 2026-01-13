// ============ Desktop.js ============

const DesktopApp = {
    settings: {},
    countdownInterval: null,
    
    // Initialize
    async init() {
        await this.loadSettings();
        this.generateQRCode();
    },
    
    // Load settings from server
    async loadSettings() {
        try {
            this.settings = await API.getSettings();
            this.applySettings();
        } catch (e) {
            console.log('Using default settings');
        }
    },
    
    // Apply settings to UI
    applySettings() {
        const s = this.settings;
        
        // Site name
        if (s.site_name) {
            document.title = s.site_name + ' - العب واربح';
            document.getElementById('site-title').textContent = s.site_name;
            document.getElementById('footer-company').textContent = s.site_name;
        }
        
        // Logo
        if (s.logo_image) {
            document.getElementById('logo-img').src = s.logo_image;
            document.getElementById('logo-img').style.display = 'block';
            document.getElementById('logo-letter').style.display = 'none';
        } else if (s.logo_letter) {
            document.getElementById('logo-letter').textContent = s.logo_letter;
        }
        
        // Description
        if (s.site_description) {
            document.getElementById('site-subtitle').textContent = s.site_description;
        }
        
        // Colors
        if (s.primary_color) {
            document.documentElement.style.setProperty('--accent', s.primary_color);
        }
        if (s.gold_color) {
            document.documentElement.style.setProperty('--gold', s.gold_color);
        }
        
        // Social Links
        if (s.show_social !== 'false') {
            if (s.facebook_url) {
                const fb = document.getElementById('social-facebook');
                fb.href = s.facebook_url;
                fb.style.display = 'flex';
            }
            if (s.instagram_url) {
                const ig = document.getElementById('social-instagram');
                ig.href = s.instagram_url;
                ig.style.display = 'flex';
            }
            if (s.whatsapp_number) {
                const wa = document.getElementById('social-whatsapp');
                wa.href = 'https://wa.me/' + s.whatsapp_number.replace(/\D/g, '');
                wa.style.display = 'flex';
            }
        }
        
        // Contact
        if (s.show_contact !== 'false' && (s.contact_phone || s.contact_email)) {
            document.getElementById('contact-section').style.display = 'block';
            
            if (s.contact_phone) {
                document.getElementById('contact-phone').textContent = s.contact_phone;
                document.getElementById('contact-phone-item').style.display = 'flex';
            }
            if (s.contact_email) {
                document.getElementById('contact-email').textContent = s.contact_email;
                document.getElementById('contact-email-item').style.display = 'flex';
            }
        }
        
        // Countdown
        if (s.show_countdown !== 'false' && s.contest_end_date) {
            this.startCountdown(s.contest_end_date);
        }
        
        // Features
        if (s.show_features === 'false') {
            document.getElementById('features-section').style.display = 'none';
        }
    },
    
    // Generate QR Code
    generateQRCode() {
        new QRious({
            element: document.getElementById('qr-code'),
            value: window.location.origin,
            size: 160,
            foreground: '#1a1a2e',
            background: '#ffffff',
            level: 'H'
        });
    },
    
    // Start countdown timer
    startCountdown(endDate) {
        const end = new Date(endDate).getTime();
        if (isNaN(end)) return;
        
        document.getElementById('countdown-section').style.display = 'block';
        
        const update = () => {
            const now = Date.now();
            const diff = end - now;
            
            if (diff <= 0) {
                document.getElementById('countdown-section').innerHTML = 
                    '<p style="color:var(--accent); text-align:center; padding: 20px;">⏰ انتهت المسابقة!</p>';
                clearInterval(this.countdownInterval);
                return;
            }
            
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            
            document.getElementById('countdown-days').textContent = days.toString().padStart(2, '0');
            document.getElementById('countdown-hours').textContent = hours.toString().padStart(2, '0');
            document.getElementById('countdown-mins').textContent = mins.toString().padStart(2, '0');
        };
        
        update();
        this.countdownInterval = setInterval(update, 60000);
    }
};

// Initialize on load
window.addEventListener('load', () => DesktopApp.init());
// ============ Utils.js ============
const Utils = {
    
    // Check if mobile device
    isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) 
            || (navigator.maxTouchPoints && navigator.maxTouchPoints > 2);
    },
    
    // Format phone number
    formatPhone(phone) {
        let cleaned = phone.replace(/\D/g, '');
        if (cleaned.startsWith('0')) cleaned = cleaned.substring(1);
        if (cleaned.startsWith('964')) cleaned = cleaned.substring(3);
        if (!cleaned.startsWith('7')) return null;
        if (!CONFIG.PHONE.VALID_PREFIXES.includes(cleaned.substring(0, 2))) return null;
        if (cleaned.length !== CONFIG.PHONE.LENGTH) return null;
        return cleaned;
    },
    
    // Show toast notification
    showToast(msg, isError = false) {
        const toast = document.getElementById('toast');
        if (!toast) return;
        toast.textContent = msg;
        toast.className = 'toast' + (isError ? ' error' : '');
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    },
    
    // Get device info
    getDeviceInfo() {
        return {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            screenWidth: screen.width,
            screenHeight: screen.height,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            isMobile: this.isMobile(),
            deviceId: this.getDeviceId()
        };
    },
    
    // Generate/Get device ID
    getDeviceId() {
        let deviceId = localStorage.getItem('device_id');
        if (!deviceId) {
            deviceId = 'dev_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('device_id', deviceId);
        }
        return deviceId;
    },
    
    // Get user location
    getLocation() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation not supported'));
                return;
            }
            navigator.geolocation.getCurrentPosition(
                pos => resolve({
                    latitude: pos.coords.latitude,
                    longitude: pos.coords.longitude,
                    accuracy: pos.coords.accuracy
                }),
                err => reject(err),
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        });
    },
    
    // Format time (seconds to MM:SS)
    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    },
    
    // Save to localStorage
    save(key, value) {
        try {
            localStorage.setItem(key, typeof value === 'object' ? JSON.stringify(value) : value);
        } catch (e) {
            console.error('Storage save error:', e);
        }
    },
    
    // Load from localStorage
    load(key, defaultValue = null) {
        try {
            const value = localStorage.getItem(key);
            if (!value) return defaultValue;
            try {
                return JSON.parse(value);
            } catch {
                return value;
            }
        } catch (e) {
            return defaultValue;
        }
    },
    
    // Share on WhatsApp
    shareWhatsApp(text) {
        window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank');
    }
};

window.Utils = Utils;
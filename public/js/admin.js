// ============ Admin.js ============

const AdminApp = {
    settings: {},
    players: [],
    branches: [],
    claims: [],
    currentTab: 'dashboard',
    
    // Initialize
    async init() {
        // Check if logged in
        const token = API.admin.getToken();
        if (token) {
            this.showDashboard();
            await this.loadAll();
        }
        
        this.setupEventListeners();
    },
    
    // Setup event listeners
    setupEventListeners() {
        // Login form
        document.getElementById('login-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });
        
        // Tab clicks
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', () => {
                this.switchTab(tab.dataset.tab);
            });
        });
    },
    
    // Handle login
    async handleLogin() {
        const username = document.getElementById('admin-username').value;
        const password = document.getElementById('admin-password').value;
        
        const res = await API.admin.login(username, password);
        
        if (res.success) {
            this.showDashboard();
            await this.loadAll();
            Utils.showToast('مرحباً بك');
        } else {
            Utils.showToast(res.error || 'خطأ في تسجيل الدخول', true);
        }
    },
    
    // Show dashboard
    showDashboard() {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('dashboard').classList.add('active');
    },
    
    // Logout
    logout() {
        localStorage.removeItem('adminToken');
        location.reload();
    },
    
    // Load all data
    async loadAll() {
        await Promise.all([
            this.loadStats(),
            this.loadSettings(),
            this.loadPlayers(),
            this.loadBranches(),
            this.loadClaims()
        ]);
    },
    
    // Switch tab
    switchTab(tabId) {
        this.currentTab = tabId;
        
        // Update tab buttons
        document.querySelectorAll('.tab').forEach(t => {
            t.classList.toggle('active', t.dataset.tab === tabId);
        });
        
        // Update tab content
        document.querySelectorAll('.tab-content').forEach(c => {
            c.classList.toggle('active', c.id === 'tab-' + tabId);
        });
        
        // Load tab specific data
        switch(tabId) {
            case 'players': this.loadPlayers(); break;
            case 'roulette': this.loadRoulettePlayers(); break;
            case 'branches': this.loadBranches(); break;
        }
    },
    
    // ============ STATS ============
    async loadStats() {
        try {
            const stats = await API.admin.getStats();
            
            document.getElementById('stat-total').textContent = stats.total || 0;
            document.getElementById('stat-today').textContent = stats.today || 0;
            document.getElementById('stat-winners').textContent = stats.winners || 0;
            document.getElementById('stat-claimed').textContent = stats.claimed || 0;
            
            if (stats.settings) {
                this.settings = stats.settings;
                this.applySettings();
            }
        } catch (e) {
            console.error('Failed to load stats:', e);
        }
    },
    
    // ============ SETTINGS ============
    async loadSettings() {
        try {
            const stats = await API.admin.getStats();
            if (stats.settings) {
                this.settings = stats.settings;
                this.applySettings();
            }
        } catch (e) {
            console.error('Failed to load settings:', e);
        }
    },
    
    applySettings() {
        const s = this.settings;
        
        // Game settings
        this.setChecked('set-game-enabled', s.game_enabled === 'true');
        this.setChecked('set-require-location', s.require_location === 'true');
        this.setValue('set-min-roulette', s.min_score_for_roulette || '1500');
        this.setValue('set-max-winners', s.max_winners || '5');
        
        // Branding
        this.setValue('set-site-name', s.site_name || '');
        this.setValue('set-logo-letter', s.logo_letter || '');
        this.setValue('set-primary-color', s.primary_color || '#e94560');
        this.setValue('set-gold-color', s.gold_color || '#ffd700');
        
        // Logo preview
        if (s.logo_image) {
            const preview = document.getElementById('logo-preview');
            if (preview) {
                preview.innerHTML = `<img src="${s.logo_image}" alt="Logo">`;
            }
        }
        
        // Social
        this.setValue('set-facebook', s.facebook_url || '');
        this.setValue('set-instagram', s.instagram_url || '');
        this.setValue('set-whatsapp', s.whatsapp_number || '');
        this.setChecked('set-show-social', s.show_social !== 'false');
        
        // Contact
        this.setValue('set-contact-phone', s.contact_phone || '');
        this.setValue('set-contact-email', s.contact_email || '');
        this.setChecked('set-show-contact', s.show_contact !== 'false');
        
        // Contest
        this.setValue('set-description', s.site_description || '');
        this.setValue('set-end-date', s.contest_end_date ? s.contest_end_date.slice(0, 16) : '');
        this.setChecked('set-show-countdown', s.show_countdown === 'true');
        this.setChecked('set-show-features', s.show_features !== 'false');
        this.setChecked('set-show-leaderboard', s.show_leaderboard !== 'false');
        
        // Blocked provinces
        this.updateBlockedProvinces(s.blocked_provinces);
    },
    
    setValue(id, value) {
        const el = document.getElementById(id);
        if (el) el.value = value;
    },
    
    setChecked(id, checked) {
        const el = document.getElementById(id);
        if (el) el.checked = checked;
    },
    
    updateBlockedProvinces(blocked) {
        try {
            const list = JSON.parse(blocked || '[]');
            CONFIG.PROVINCES.forEach(p => {
                const cb = document.getElementById('cb-' + p);
                if (cb) {
                    cb.checked = list.includes(p);
                    cb.parentElement.classList.toggle('blocked', list.includes(p));
                }
            });
        } catch (e) {}
    },
    
    // Save setting
    async saveSetting(key, value) {
        const settings = {};
        settings[key] = typeof value === 'boolean' ? value.toString() : value;
        
        const res = await API.admin.saveSettings(settings);
        if (res.success) {
            Utils.showToast('تم الحفظ ✅');
        } else {
            Utils.showToast('فشل الحفظ', true);
        }
    },
    
    // Save multiple settings
    async saveSettings(settings) {
        const res = await API.admin.saveSettings(settings);
        if (res.success) {
            Utils.showToast('تم الحفظ ✅');
        } else {
            Utils.showToast('فشل الحفظ', true);
        }
    },
    
    // Save branding
    async saveBranding() {
        await this.saveSettings({
            site_name: document.getElementById('set-site-name').value,
            logo_letter: document.getElementById('set-logo-letter').value,
            primary_color: document.getElementById('set-primary-color').value,
            gold_color: document.getElementById('set-gold-color').value
        });
    },
    
    // Save social
    async saveSocial() {
        await this.saveSettings({
            facebook_url: document.getElementById('set-facebook').value,
            instagram_url: document.getElementById('set-instagram').value,
            whatsapp_number: document.getElementById('set-whatsapp').value
        });
    },
    
    // Save contact
    async saveContact() {
        await this.saveSettings({
            contact_phone: document.getElementById('set-contact-phone').value,
            contact_email: document.getElementById('set-contact-email').value
        });
    },
    
    // Save contest
    async saveContest() {
        await this.saveSettings({
            site_description: document.getElementById('set-description').value,
            contest_end_date: document.getElementById('set-end-date').value
        });
    },
    
    // Toggle province
    async toggleProvince(province, checkbox) {
        try {
            let blocked = JSON.parse(this.settings.blocked_provinces || '[]');
            
            if (checkbox.checked) {
                if (!blocked.includes(province)) blocked.push(province);
            } else {
                blocked = blocked.filter(p => p !== province);
            }
            
            checkbox.parentElement.classList.toggle('blocked', checkbox.checked);
            
            await this.saveSettings({
                blocked_provinces: JSON.stringify(blocked)
            });
        } catch (e) {
            Utils.showToast('حدث خطأ', true);
        }
    },
    
    // Upload logo
    async uploadLogo(input) {
        const file = input.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = async (e) => {
            const base64 = e.target.result;
            
            // Preview
            document.getElementById('logo-preview').innerHTML = `<img src="${base64}" alt="Logo">`;
            
            // Save
            await this.saveSettings({ logo_image: base64 });
        };
        reader.readAsDataURL(file);
    },
    
    // ============ PLAYERS ============
    async loadPlayers(filters = {}) {
        try {
            const players = await API.admin.getPlayers(filters);
            this.players = players;
            this.renderPlayers();
        } catch (e) {
            console.error('Failed to load players:', e);
        }
    },
    
    renderPlayers() {
        const tbody = document.getElementById('players-table');
        if (!tbody) return;
        
        if (!this.players.length) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text-muted);">لا يوجد لاعبين</td></tr>';
            return;
        }
        
        tbody.innerHTML = this.players.map(p => `
            <tr>
                <td>${p.name}</td>
                <td>${p.phone}</td>
                <td>${p.province}</td>
                <td><strong style="color:var(--gold)">${p.score}</strong></td>
                <td><span class="status ${p.status}">${this.getStatusText(p.status)}</span></td>
                <td>${this.formatDate(p.created_at)}</td>
                <td>
                    ${p.status === 'registered' ? `<button class="action-btn winner" onclick="AdminApp.makeWinner(${p.id})">🏆</button>` : ''}
                    ${p.status === 'winner' ? `<button class="action-btn edit" onclick="AdminApp.removeWinner(${p.id})">↩️</button>` : ''}
                    <button class="action-btn delete" onclick="AdminApp.deletePlayer(${p.id})">🗑️</button>
                </td>
            </tr>
        `).join('');
    },
    
    getStatusText(status) {
        const texts = {
            'registered': 'مسجل',
            'winner': 'فائز',
            'claimed': 'مستلم'
        };
        return texts[status] || status;
    },
    
    formatDate(date) {
        if (!date) return '-';
        return new Date(date).toLocaleDateString('ar-IQ');
    },
    
    // Filter players
    filterPlayers() {
        const search = document.getElementById('filter-search')?.value || '';
        const status = document.getElementById('filter-status')?.value || '';
        const province = document.getElementById('filter-province')?.value || '';
        
        this.loadPlayers({ search, status, province });
    },
    
    // Make winner
    async makeWinner(playerId) {
        if (!confirm('هل تريد جعل هذا اللاعب فائز؟')) return;
        
        const res = await API.admin.makeWinner(playerId);
        if (res.success) {
            Utils.showToast('تم تعيين الفائز ✅');
            this.loadPlayers();
            this.loadStats();
        } else {
            Utils.showToast(res.error || 'فشل العملية', true);
        }
    },
    
    // Remove winner
    async removeWinner(playerId) {
        if (!confirm('هل تريد إلغاء فوز هذا اللاعب؟')) return;
        
        const res = await API.admin.removeWinner(playerId);
        if (res.success) {
            Utils.showToast('تم إلغاء الفوز ✅');
            this.loadPlayers();
            this.loadStats();
        } else {
            Utils.showToast(res.error || 'فشل العملية', true);
        }
    },
    
    // Delete player
    async deletePlayer(playerId) {
        if (!confirm('هل تريد حذف هذا اللاعب نهائياً؟')) return;
        
        const res = await API.admin.deletePlayer(playerId);
        if (res.success) {
            Utils.showToast('تم الحذف ✅');
            this.loadPlayers();
            this.loadStats();
        } else {
            Utils.showToast(res.error || 'فشل الحذف', true);
        }
    },
    
    // ============ ROULETTE ============
    roulettePlayers: [],
    isSpinning: false,
    
    async loadRoulettePlayers() {
        try {
            const players = await API.admin.getRoulettePlayers();
            this.roulettePlayers = players;
            this.renderRoulettePlayers();
        } catch (e) {
            console.error('Failed to load roulette players:', e);
        }
    },
    
    renderRoulettePlayers() {
        const container = document.getElementById('roulette-players');
        if (!container) return;
        
        if (!this.roulettePlayers.length) {
            container.innerHTML = '<p style="color:var(--text-muted);">لا يوجد لاعبين مؤهلين</p>';
            return;
        }
        
        container.innerHTML = this.roulettePlayers.map(p => `
            <div class="roulette-player" data-id="${p.id}">
                ${p.name} (${p.score})
            </div>
        `).join('');
    },
    
    // Spin roulette
    spinRoulette() {
        if (this.isSpinning || !this.roulettePlayers.length) return;
        
        this.isSpinning = true;
        const wheel = document.getElementById('roulette-wheel');
        
        // Random rotation
        const spins = 5 + Math.random() * 5;
        const degrees = spins * 360 + Math.random() * 360;
        
        wheel.style.transform = `rotate(${degrees}deg)`;
        
        // Select winner after animation
        setTimeout(async () => {
            const winner = this.roulettePlayers[Math.floor(Math.random() * this.roulettePlayers.length)];
            
            // Highlight winner
            document.querySelectorAll('.roulette-player').forEach(el => {
                el.classList.toggle('winner', el.dataset.id == winner.id);
            });
            
            // Make winner in database
            const res = await API.admin.makeWinner(winner.id);
            if (res.success) {
                Utils.showToast(`🎉 الفائز هو: ${winner.name}`);
                
                // Send WhatsApp notification
                if (res.notificationSent) {
                    Utils.showToast('تم إرسال إشعار واتساب');
                }
            }
            
            this.isSpinning = false;
            this.loadStats();
            this.loadRoulettePlayers();
        }, 5000);
    },
    
    // ============ BRANCHES ============
    async loadBranches() {
        try {
            const branches = await API.admin.getBranches();
            this.branches = branches;
            this.renderBranches();
        } catch (e) {
            console.error('Failed to load branches:', e);
        }
    },
    
    renderBranches() {
        const tbody = document.getElementById('branches-table');
        if (!tbody) return;
        
        if (!this.branches.length) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);">لا يوجد فروع</td></tr>';
            return;
        }
        
        tbody.innerHTML = this.branches.map(b => `
            <tr>
                <td>${b.name}</td>
                <td>${b.location || '-'}</td>
                <td>${b.province || '-'}</td>
                <td>${b.phone}</td>
                <td><span class="status ${b.active ? 'winner' : 'registered'}">${b.active ? 'فعال' : 'معطل'}</span></td>
                <td>
                    <button class="action-btn edit" onclick="AdminApp.editBranch(${b.id})">✏️</button>
                    <button class="action-btn view" onclick="AdminApp.copyBranchLink('${b.phone}')">📋</button>
                    <button class="action-btn delete" onclick="AdminApp.deleteBranch(${b.id})">🗑️</button>
                </td>
            </tr>
        `).join('');
    },
    
    // Show add branch modal
    showAddBranchModal() {
        document.getElementById('branch-modal-title').textContent = 'إضافة فرع جديد';
        document.getElementById('branch-id').value = '';
        document.getElementById('branch-name').value = '';
        document.getElementById('branch-location').value = '';
        document.getElementById('branch-province').value = '';
        document.getElementById('branch-phone').value = '';
        document.getElementById('branch-password').value = '';
        document.getElementById('branch-modal').classList.add('active');
    },
    
    // Edit branch
    editBranch(id) {
        const branch = this.branches.find(b => b.id === id);
        if (!branch) return;
        
        document.getElementById('branch-modal-title').textContent = 'تعديل الفرع';
        document.getElementById('branch-id').value = branch.id;
        document.getElementById('branch-name').value = branch.name;
        document.getElementById('branch-location').value = branch.location || '';
        document.getElementById('branch-province').value = branch.province || '';
        document.getElementById('branch-phone').value = branch.phone;
        document.getElementById('branch-password').value = '';
        document.getElementById('branch-modal').classList.add('active');
    },
    
    // Close modal
    closeModal(modalId) {
        document.getElementById(modalId).classList.remove('active');
    },
    
    // Save branch
    async saveBranch() {
        const id = document.getElementById('branch-id').value;
        const data = {
            name: document.getElementById('branch-name').value,
            location: document.getElementById('branch-location').value,
            province: document.getElementById('branch-province').value,
            phone: document.getElementById('branch-phone').value,
            password: document.getElementById('branch-password').value
        };
        
        let res;
        if (id) {
            res = await API.admin.updateBranch(id, data);
        } else {
            res = await API.admin.addBranch(data);
        }
        
        if (res.success) {
            Utils.showToast('تم الحفظ ✅');
            this.closeModal('branch-modal');
            this.loadBranches();
        } else {
            Utils.showToast(res.error || 'فشل الحفظ', true);
        }
    },
    
    // Delete branch
    async deleteBranch(id) {
        if (!confirm('هل تريد حذف هذا الفرع؟')) return;
        
        const res = await API.admin.deleteBranch(id);
        if (res.success) {
            Utils.showToast('تم الحذف ✅');
            this.loadBranches();
        } else {
            Utils.showToast(res.error || 'فشل الحذف', true);
        }
    },
    
    // Copy branch link
    copyBranchLink(phone) {
        const url = `${window.location.origin}/branch.html`;
        const text = `رابط صفحة الفرع:\n${url}\n\nرقم الدخول: ${phone}`;
        
        navigator.clipboard.writeText(text).then(() => {
            Utils.showToast('تم النسخ ✅');
        });
    },
    
    // ============ CLAIMS ============
    async loadClaims() {
        try {
            const claims = await API.admin.getClaims();
            this.claims = claims;
            this.renderClaims();
        } catch (e) {
            console.error('Failed to load claims:', e);
        }
    },
    
    renderClaims() {
        const tbody = document.getElementById('claims-table');
        if (!tbody) return;
        
        if (!this.claims.length) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);">لا يوجد تسليمات</td></tr>';
            return;
        }
        
        tbody.innerHTML = this.claims.map(c => `
            <tr>
                <td>${c.player_name}</td>
                <td>${c.prize_code}</td>
                <td>${c.branch_name}</td>
                <td>${c.employee_name}</td>
                <td>${c.notes || '-'}</td>
                <td>${this.formatDate(c.claimed_at)}</td>
            </tr>
        `).join('');
    },
    
    // ============ DANGER ZONE ============
    async resetAllScores() {
        if (!confirm('⚠️ هل أنت متأكد؟ سيتم حذف جميع النقاط!')) return;
        if (!confirm('⚠️ تأكيد نهائي: سيتم إعادة جميع النقاط إلى صفر!')) return;
        
        // Implement this endpoint in server.js
        Utils.showToast('تم إعادة النقاط ✅');
        this.loadStats();
        this.loadPlayers();
    },
    
    async deleteAllPlayers() {
        if (!confirm('⚠️ هل أنت متأكد؟ سيتم حذف جميع اللاعبين!')) return;
        if (!confirm('⚠️ تأكيد نهائي: سيتم حذف كل البيانات!')) return;
        
        // Implement this endpoint in server.js
        Utils.showToast('تم الحذف ✅');
        this.loadStats();
        this.loadPlayers();
    }
};

// Initialize on load
window.addEventListener('load', () => AdminApp.init());
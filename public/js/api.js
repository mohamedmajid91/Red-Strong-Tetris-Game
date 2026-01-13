// ============ API.js ============
const API = {
    
    // Base request function
    async request(endpoint, method = 'GET', data = null, token = null) {
        const options = {
            method,
            headers: { 'Content-Type': 'application/json' }
        };
        
        if (token) {
            options.headers['Authorization'] = 'Bearer ' + token;
        }
        
        if (data) {
            options.body = JSON.stringify(data);
        }
        
        try {
            const res = await fetch(CONFIG.API_URL + endpoint, options);
            return await res.json();
        } catch (err) {
            console.error('API Error:', err);
            return { error: 'حدث خطأ في الاتصال' };
        }
    },
    
    // ============ Public APIs ============
    
    // Get game status
    async getGameStatus() {
        return this.request('/game-status');
    },
    
    // Get public settings
    async getSettings() {
        return this.request('/settings/public');
    },
    
    // Get leaderboard
    async getLeaderboard() {
        return this.request('/leaderboard');
    },
    
    // Register player
    async register(name, phone, province, deviceInfo, location = null) {
        return this.request('/register', 'POST', {
            name, phone, province, deviceInfo, location
        });
    },
    
    // Submit score
    async submitScore(phone, score) {
        return this.request('/score', 'POST', { phone, score });
    },
    
    // Check win status
    async checkWin(phone, deviceInfo) {
        return this.request('/check-win', 'POST', { phone, deviceInfo });
    },
    
    // Get announcements
    async getAnnouncements() {
        return this.request('/announcements');
    },
    
    // Get player session info
    async getSession(phone) {
        return this.request('/session/' + phone);
    },
    
    // Start a new round
    async startSession(phone) {
        return this.request('/session/start', 'POST', { phone });
    },
    
    // End a round and save score
    async endSession(phone, sessionId, roundScore) {
        return this.request('/session/end', 'POST', { phone, sessionId, roundScore });
    },
    
    // ============ Admin APIs ============
    
    admin: {
        token: null,
        
        setToken(token) {
            this.token = token;
            Utils.save('adminToken', token);
        },
        
        getToken() {
            if (!this.token) {
                this.token = Utils.load('adminToken');
            }
            return this.token;
        },
        
        async login(username, password) {
            const res = await API.request('/admin/login', 'POST', { username, password });
            if (res.success && res.token) {
                this.setToken(res.token);
            }
            return res;
        },
        
        async getPlayers(filters = {}) {
            return API.request('/admin/players?' + new URLSearchParams(filters), 'GET', null, this.getToken());
        },
        
        async getStats() {
            return API.request('/admin/stats', 'GET', null, this.getToken());
        },
        
        async getSettings() {
            return API.request('/admin/stats', 'GET', null, this.getToken());
        },
        
        async saveSettings(settings) {
            return API.request('/admin/settings', 'POST', { settings }, this.getToken());
        },
        
        async getRoulettePlayers() {
            return API.request('/admin/roulette-players', 'GET', null, this.getToken());
        },
        
        async makeWinner(playerId) {
            return API.request('/admin/make-winner/' + playerId, 'POST', null, this.getToken());
        },
        
        async removeWinner(playerId) {
            return API.request('/admin/remove-winner/' + playerId, 'POST', null, this.getToken());
        },
        
        async claimPrize(playerId) {
            return API.request('/admin/claim/' + playerId, 'POST', null, this.getToken());
        },
        
        async deletePlayer(playerId) {
            return API.request('/admin/player/' + playerId, 'DELETE', null, this.getToken());
        },
        
        async getBranches() {
            return API.request('/admin/branches', 'GET', null, this.getToken());
        },
        
        async addBranch(data) {
            return API.request('/admin/branches', 'POST', data, this.getToken());
        },
        
        async updateBranch(id, data) {
            return API.request('/admin/branches/' + id, 'PUT', data, this.getToken());
        },
        
        async deleteBranch(id) {
            return API.request('/admin/branches/' + id, 'DELETE', null, this.getToken());
        },
        
        async getClaims() {
            return API.request('/admin/claims', 'GET', null, this.getToken());
        },
        
        async getAnnouncements() {
            return API.request('/admin/announcements', 'GET', null, this.getToken());
        },
        
        async addAnnouncement(data) {
            return API.request('/admin/announcements', 'POST', data, this.getToken());
        },
        
        async updateAnnouncement(id, data) {
            return API.request('/admin/announcements/' + id, 'PUT', data, this.getToken());
        },
        
        async toggleAnnouncement(id) {
            return API.request('/admin/announcements/' + id + '/toggle', 'PATCH', null, this.getToken());
        },
        
        async deleteAnnouncement(id) {
            return API.request('/admin/announcements/' + id, 'DELETE', null, this.getToken());
        },
        
        async getSessions() {
            return API.request('/admin/sessions', 'GET', null, this.getToken());
        }
    },
    
    // ============ Branch APIs ============
    
    branch: {
        token: null,
        
        setToken(token) {
            this.token = token;
            Utils.save('branchToken', token);
        },
        
        getToken() {
            if (!this.token) {
                this.token = Utils.load('branchToken');
            }
            return this.token;
        },
        
        async login(phone, password) {
            const res = await API.request('/branch/login', 'POST', { phone, password });
            if (res.success && res.token) {
                this.setToken(res.token);
            }
            return res;
        },
        
        async verify(prizeCode) {
            return API.request('/branch/verify', 'POST', { prizeCode });
        },
        
        async claim(playerId, prizeCode, employeeName, notes = '') {
            return API.request('/branch/claim', 'POST', {
                playerId, prizeCode, employeeName, notes
            }, this.getToken());
        },
        
        async getHistory() {
            return API.request('/branch/claims', 'GET', null, this.getToken());
        }
    }
};

window.API = API;
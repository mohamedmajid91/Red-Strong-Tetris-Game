// ============ RED STRONG TETRIS v2.5 ============
const CONFIG = {
    version: '2.5.0',
    company: 'Red Strong Iraq',
    developer: 'Developer',
    gameTime: 180,
    minScore: 1500,
    provinces: ['بغداد', 'البصرة', 'نينوى', 'أربيل', 'النجف', 'كربلاء', 'السليمانية', 'ذي قار', 'الأنبار', 'ديالى', 'كركوك', 'صلاح الدين', 'بابل', 'واسط', 'ميسان', 'المثنى', 'القادسية', 'دهوك']
};

const App = {
    player: null, settings: {},

    async init() {
        await this.loadSettings();
        this.applySettings();
        this.populateProvinces();
        this.loadPlayer();
        this.showSplash();
    },

    async loadSettings() {
        try { const r = await fetch('/api/settings/public'); this.settings = await r.json(); } catch (e) { }
    },

    applySettings() {
        const s = this.settings;
        if (s.game_time) CONFIG.gameTime = parseInt(s.game_time) || 180;
        if (s.min_score_for_roulette) CONFIG.minScore = parseInt(s.min_score_for_roulette) || 1500;
        if (s.site_name || s.company_name) CONFIG.company = s.company_name || s.site_name;
        if (s.developer_name) CONFIG.developer = s.developer_name;
        if (s.version) CONFIG.version = s.version;
        if (s.primary_color) document.documentElement.style.setProperty('--primary', s.primary_color);
        if (s.secondary_color) document.documentElement.style.setProperty('--secondary', s.secondary_color);

        const els = { 'splash-ver': 'v' + CONFIG.version, 'splash-company': CONFIG.company, 'menu-title': CONFIG.company, 'menu-footer': '© 2025 ' + CONFIG.company, 'about-ver': 'v' + CONFIG.version, 'about-company': CONFIG.company, 'about-dev': CONFIG.developer, 'about-version': CONFIG.version, 'about-time': Math.floor(CONFIG.gameTime / 60) + ' دقائق', 'about-min': CONFIG.minScore + ' نقطة' };
        for (const [id, val] of Object.entries(els)) { const el = document.getElementById(id); if (el) el.textContent = val; }
    },

    populateProvinces() {
        const select = document.getElementById('reg-province');
        if (!select) return;
        CONFIG.provinces.forEach(p => { const opt = document.createElement('option'); opt.value = p; opt.textContent = p; select.appendChild(opt); });
    },

    loadPlayer() {
        const saved = localStorage.getItem('rs_player');
        if (saved) { this.player = JSON.parse(saved); document.getElementById('reg-name').value = this.player.name || ''; document.getElementById('reg-phone').value = this.player.phone || ''; document.getElementById('reg-province').value = this.player.province || ''; }
    },

    savePlayer() { localStorage.setItem('rs_player', JSON.stringify(this.player)); },

    showSplash() {
        const fill = document.getElementById('load-fill');
        let p = 0;
        const int = setInterval(() => { p += Math.random() * 15 + 5; if (p >= 100) { p = 100; fill.style.width = p + '%'; clearInterval(int); setTimeout(() => this.showScreen('menu'), 500); } else { fill.style.width = p + '%'; } }, 150);
    },

    showScreen(id) {
        document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
        document.getElementById(id + '-screen')?.classList.remove('hidden');
        if (id === 'check') this.checkWin();
    },

    toast(msg, err = false) {
        const t = document.getElementById('toast');
        t.textContent = msg; t.className = 'toast' + (err ? ' error' : ''); t.classList.add('show');
        setTimeout(() => t.classList.remove('show'), 3000);
    },

    formatPhone(phone) { let c = phone.replace(/\D/g, ''); if (c.startsWith('964')) c = c.substring(3); if (c.startsWith('0')) c = c.substring(1); return (c.length === 10 && c.startsWith('7')) ? c : null; },

    getDeviceId() { let id = localStorage.getItem('device_id'); if (!id) { id = 'dev_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9); localStorage.setItem('device_id', id); } return id; },

    async register(e) {
        e.preventDefault();
        const name = document.getElementById('reg-name').value.trim();
        const phone = this.formatPhone(document.getElementById('reg-phone').value);
        const province = document.getElementById('reg-province').value;
        if (!phone) { this.toast('رقم الهاتف غير صحيح!', true); return; }
        this.player = { name, phone, province }; this.savePlayer();
        try { const r = await fetch('/api/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, phone, province, deviceInfo: { userAgent: navigator.userAgent, deviceId: this.getDeviceId() } }) }); const data = await r.json(); if (data.success) { this.player = data.player; this.savePlayer(); } } catch (e) { }
        this.toast('مرحباً ' + name + '!'); this.startGame();
    },

    startGame() { if (!this.player) { this.showScreen('register'); return; } this.showScreen('game'); setTimeout(() => Game.start(), 300); },
    playAgain() { this.startGame(); },
    exitGame() { Game.stop(); document.getElementById('pause-overlay').classList.add('hidden'); this.showScreen('menu'); },

    gameOver(score) {
        document.getElementById('final-score').textContent = score; this.showScreen('gameover');
        if (this.player?.phone) { fetch('/api/score', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: this.player.phone, score }) }).catch(() => { }); }
    },

    async checkWin() {
        const loading = document.getElementById('check-loading'), result = document.getElementById('check-result'), noPlayer = document.getElementById('check-no-player');
        if (!this.player?.phone) { loading.classList.add('hidden'); result.innerHTML = ''; noPlayer.style.display = 'block'; return; }
        loading.classList.remove('hidden'); result.innerHTML = ''; noPlayer.style.display = 'none';
        try {
            const r = await fetch('/api/check-win', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: this.player.phone }) });
            const data = await r.json(); loading.classList.add('hidden');
            if (data.isWinner) { result.innerHTML = `<div class="result-box winner"><div style="font-size:50px;">🎉</div><h3 style="color:var(--primary);margin:10px 0;">مبروك! أنت فائز!</h3><div class="prize-code">${data.prizeCode}</div><p class="msg">احتفظ بهذا الكود وراجع أقرب فرع</p></div>`; }
            else { result.innerHTML = `<div class="result-box loser"><div style="font-size:40px;">😔</div><h3 style="color:#333;margin:10px 0;">لم تفز هذه المرة</h3><p class="msg">نقاطك: <strong>${data.score || 0}</strong></p></div><button class="btn primary full" onclick="App.startGame()" style="margin-top:15px;">🎮 العب مرة أخرى</button>`; }
        } catch (e) { loading.classList.add('hidden'); result.innerHTML = '<div class="result-box loser"><p>تعذر الاتصال</p></div>'; }
    },

    share() { const score = document.getElementById('final-score').textContent; window.open('https://wa.me/?text=' + encodeURIComponent(`🎮 لعبت ${CONFIG.company} Tetris وجبت ${score} نقطة! 🔥\n\nجرب حظك 🐂\n${window.location.origin}`), '_blank'); }
};

const Game = {
    canvas: null, ctx: null, holdCanvas: null, holdCtx: null, nextCanvas: null, nextCtx: null,
    board: [], current: null, next: null, hold: null, canHold: true,
    score: 0, level: 1, lines: 0, mult: 1, special: 0, time: 180, timer: null,
    dropInt: 1000, dropCnt: 0, lastT: 0, animId: null, playing: false, paused: false,
    COLS: 10, ROWS: 20, BLOCK: 0,
    COLORS: [null, '#e31e24', '#ffd700', '#ff6b35', '#ffcc00', '#00d9a5', '#9b59b6', '#3498db'],
    SHAPES: [[], [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]], [[2, 0, 0], [2, 2, 2], [0, 0, 0]], [[0, 0, 3], [3, 3, 3], [0, 0, 0]], [[4, 4], [4, 4]], [[0, 5, 5], [5, 5, 0], [0, 0, 0]], [[0, 6, 0], [6, 6, 6], [0, 0, 0]], [[7, 7, 0], [0, 7, 7], [0, 0, 0]]],

    start() {
        this.canvas = document.getElementById('game-canvas'); this.ctx = this.canvas.getContext('2d');
        this.holdCanvas = document.getElementById('hold-canvas'); this.holdCtx = this.holdCanvas.getContext('2d');
        this.nextCanvas = document.getElementById('next-canvas'); this.nextCtx = this.nextCanvas.getContext('2d');
        this.calcSize(); this.reset(); this.setupInput(); this.countdown();
    },

    calcSize() { const maxH = window.innerHeight - 160, maxW = window.innerWidth - 140; this.BLOCK = Math.max(16, Math.min(Math.floor(Math.min(maxH / this.ROWS, maxW / this.COLS)), 26)); this.canvas.width = this.COLS * this.BLOCK; this.canvas.height = this.ROWS * this.BLOCK; },

    reset() { this.board = Array(this.ROWS).fill().map(() => Array(this.COLS).fill(0)); this.score = 0; this.level = 1; this.lines = 0; this.mult = 1; this.special = 0; this.time = CONFIG.gameTime; this.dropInt = 1000; this.hold = null; this.canHold = true; this.playing = false; this.paused = false; this.spawn(); this.genNext(); this.updateUI(); this.draw(); },

    countdown() { const el = document.getElementById('countdown'), txt = document.getElementById('countdown-text'); el.classList.remove('hidden'); let n = 3; txt.textContent = n; const int = setInterval(() => { n--; if (n > 0) txt.textContent = n; else if (n === 0) txt.textContent = 'GO!'; else { clearInterval(int); el.classList.add('hidden'); this.begin(); } }, 700); },

    begin() { this.playing = true; this.startTimer(); this.lastT = performance.now(); this.loop(); },
    startTimer() { this.stopTimer(); this.timer = setInterval(() => { this.time--; this.updateTimer(); if (this.time <= 0) this.end(); }, 1000); },
    stopTimer() { if (this.timer) clearInterval(this.timer); },
    updateTimer() { const m = Math.floor(this.time / 60), s = this.time % 60, el = document.getElementById('timer'); el.textContent = m + ':' + s.toString().padStart(2, '0'); el.classList.toggle('warn', this.time <= 30); },

    spawn() { if (this.next) { this.current = { ...this.next, x: Math.floor(this.COLS / 2) - 1, y: 0 }; this.current.shape = this.next.shape.map(r => [...r]); } else { const t = Math.floor(Math.random() * 7) + 1; this.current = { shape: this.SHAPES[t].map(r => [...r]), type: t, x: Math.floor(this.COLS / 2) - 1, y: 0 }; } this.genNext(); this.canHold = true; if (this.collide()) this.end(); },
    genNext() { const t = Math.floor(Math.random() * 7) + 1; this.next = { shape: this.SHAPES[t].map(r => [...r]), type: t }; this.drawNext(); },

    collide(ox = 0, oy = 0, shape = this.current?.shape) { if (!shape) return false; for (let y = 0; y < shape.length; y++) for (let x = 0; x < shape[y].length; x++) if (shape[y][x]) { const nx = this.current.x + x + ox, ny = this.current.y + y + oy; if (nx < 0 || nx >= this.COLS || ny >= this.ROWS) return true; if (ny >= 0 && this.board[ny][nx]) return true; } return false; },
    merge() { this.current.shape.forEach((row, y) => row.forEach((v, x) => { if (v && this.current.y + y >= 0) this.board[this.current.y + y][this.current.x + x] = v; })); },

    rotate() { if (!this.playing || this.paused || !this.current) return; const s = this.current.shape, r = s.map((row, i) => row.map((_, j) => s[s.length - 1 - j][i])); if (!this.collide(0, 0, r)) this.current.shape = r; },
    move(d) { if (!this.playing || this.paused) return; if (!this.collide(d, 0)) this.current.x += d; },
    drop() { if (!this.playing || this.paused) return; if (!this.collide(0, 1)) this.current.y++; else { this.merge(); this.clearLines(); this.spawn(); } this.dropCnt = 0; },
    hardDrop() { if (!this.playing || this.paused) return; while (!this.collide(0, 1)) { this.current.y++; this.score += 2; } this.merge(); this.clearLines(); this.spawn(); this.updateUI(); },

    doHold() { if (!this.canHold || !this.playing || this.paused) return; if (this.hold) { const tmp = this.hold; this.hold = { shape: this.SHAPES[this.current.type].map(r => [...r]), type: this.current.type }; this.current = { shape: tmp.shape.map(r => [...r]), type: tmp.type, x: Math.floor(this.COLS / 2) - 1, y: 0 }; } else { this.hold = { shape: this.SHAPES[this.current.type].map(r => [...r]), type: this.current.type }; this.spawn(); } this.canHold = false; this.drawHold(); },

    clearLines() { let cleared = 0; for (let y = this.ROWS - 1; y >= 0; y--) { if (this.board[y].every(c => c)) { this.board.splice(y, 1); this.board.unshift(Array(this.COLS).fill(0)); cleared++; y++; } } if (cleared) { this.score += [0, 100, 300, 500, 800][cleared] * this.mult; this.lines += cleared; if (cleared >= 2) this.mult = Math.min(this.mult + 0.5, 5); this.special = Math.min(this.special + cleared * 15, 100); this.level = Math.floor(this.lines / 10) + 1; this.dropInt = Math.max(100, 1000 - (this.level - 1) * 100); } else if (this.mult > 1) this.mult = Math.max(1, this.mult - 0.25); this.updateUI(); },

    ghostY() { let gy = this.current.y; while (!this.collide(0, gy - this.current.y + 1)) gy++; return gy; },

    draw() { const c = this.ctx, b = this.BLOCK; c.fillStyle = '#8fa4c4'; c.fillRect(0, 0, this.canvas.width, this.canvas.height); c.strokeStyle = 'rgba(255,255,255,0.15)'; for (let x = 0; x <= this.COLS; x++) { c.beginPath(); c.moveTo(x * b, 0); c.lineTo(x * b, this.canvas.height); c.stroke(); } for (let y = 0; y <= this.ROWS; y++) { c.beginPath(); c.moveTo(0, y * b); c.lineTo(this.canvas.width, y * b); c.stroke(); } this.board.forEach((row, y) => row.forEach((v, x) => { if (v) this.drawBlock(x, y, this.COLORS[v]); })); if (this.current && this.playing) { const gy = this.ghostY(); this.current.shape.forEach((row, y) => row.forEach((v, x) => { if (v) this.drawBlock(this.current.x + x, gy + y, this.COLORS[v], true); })); } if (this.current) this.current.shape.forEach((row, y) => row.forEach((v, x) => { if (v) this.drawBlock(this.current.x + x, this.current.y + y, this.COLORS[v]); })); },

    drawBlock(x, y, color, ghost = false) { const c = this.ctx, b = this.BLOCK, px = x * b, py = y * b; if (ghost) { c.fillStyle = color; c.globalAlpha = 0.25; c.fillRect(px + 1, py + 1, b - 2, b - 2); c.globalAlpha = 1; return; } c.fillStyle = color; c.fillRect(px + 1, py + 1, b - 2, b - 2); c.fillStyle = 'rgba(255,255,255,0.35)'; c.fillRect(px + 1, py + 1, b - 2, 3); c.fillRect(px + 1, py + 1, 3, b - 2); c.fillStyle = 'rgba(0,0,0,0.15)'; c.fillRect(px + b - 3, py + 1, 2, b - 2); c.fillRect(px + 1, py + b - 3, b - 2, 2); },

    drawHold() { this.holdCtx.clearRect(0, 0, 40, 40); if (!this.hold) return; const s = this.hold.shape, bs = 8, ox = (40 - s[0].length * bs) / 2, oy = (40 - s.length * bs) / 2; s.forEach((row, y) => row.forEach((v, x) => { if (v) { this.holdCtx.fillStyle = this.COLORS[v]; this.holdCtx.fillRect(ox + x * bs, oy + y * bs, bs - 1, bs - 1); } })); },
    drawNext() { this.nextCtx.clearRect(0, 0, 40, 40); if (!this.next) return; const s = this.next.shape, bs = 8, ox = (40 - s[0].length * bs) / 2, oy = (40 - s.length * bs) / 2; s.forEach((row, y) => row.forEach((v, x) => { if (v) { this.nextCtx.fillStyle = this.COLORS[v]; this.nextCtx.fillRect(ox + x * bs, oy + y * bs, bs - 1, bs - 1); } })); },

    updateUI() { document.getElementById('score').textContent = this.score; document.getElementById('mult-val').textContent = this.mult + 'x'; document.getElementById('mult-fill').style.height = (this.mult / 5 * 100) + '%'; document.getElementById('special-fill').style.height = this.special + '%'; },

    pause() { if (!this.playing) return; this.paused = true; this.stopTimer(); cancelAnimationFrame(this.animId); document.getElementById('pause-overlay').classList.remove('hidden'); },
    resume() { if (!this.playing) return; this.paused = false; this.startTimer(); document.getElementById('pause-overlay').classList.add('hidden'); this.lastT = performance.now(); this.loop(); },
    stop() { this.playing = false; this.stopTimer(); cancelAnimationFrame(this.animId); },
    end() { this.stop(); setTimeout(() => App.gameOver(this.score), 300); },

    loop(t = 0) { if (!this.playing || this.paused) return; this.dropCnt += t - this.lastT; this.lastT = t; if (this.dropCnt > this.dropInt) this.drop(); this.draw(); this.animId = requestAnimationFrame(time => this.loop(time)); },

    setupInput() {
        document.addEventListener('keydown', e => { if (!this.playing || this.paused) return; switch (e.key) { case 'ArrowLeft': this.move(-1); break; case 'ArrowRight': this.move(1); break; case 'ArrowDown': this.drop(); break; case 'ArrowUp': this.rotate(); break; case ' ': this.hardDrop(); break; case 'c': case 'C': this.doHold(); break; case 'p': case 'P': this.pause(); break; } if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault(); });
        let tx = 0, ty = 0, tt = 0;
        this.canvas.addEventListener('touchstart', e => { e.preventDefault(); tx = e.touches[0].clientX; ty = e.touches[0].clientY; tt = Date.now(); });
        this.canvas.addEventListener('touchmove', e => { e.preventDefault(); if (!this.playing || this.paused) return; const dx = e.touches[0].clientX - tx, dy = e.touches[0].clientY - ty; if (Math.abs(dx) > 30) { this.move(dx > 0 ? 1 : -1); tx = e.touches[0].clientX; } if (dy > 30) { this.drop(); ty = e.touches[0].clientY; } });
        this.canvas.addEventListener('touchend', e => { e.preventDefault(); if (!this.playing || this.paused) return; if (Date.now() - tt < 200) this.rotate(); });
        document.querySelector('.panel-box')?.addEventListener('click', () => this.doHold());
    }
};

window.addEventListener('load', () => App.init());
window.addEventListener('resize', () => { if (Game.canvas) { Game.calcSize(); Game.draw(); } });

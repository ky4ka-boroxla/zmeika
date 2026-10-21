const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
const scoreDisplay = document.getElementById('score');
const comboDisplay = document.getElementById('comboDisplay');
const menu = document.getElementById('menu');
const gameOverMenu = document.getElementById('gameOverMenu');
const pauseMenu = document.getElementById('pauseMenu');
const settingsMenu = document.getElementById('settingsMenu');
const statsMenu = document.getElementById('statsMenu');
const achMenu = document.getElementById('achMenu');
const recordsMenu = document.getElementById('recordsMenu');
const gameOverTitle = document.getElementById('gameOverTitle');
const startBtn = document.getElementById('startBtn');
const retryBtn = document.getElementById('retryBtn');
const finalScore = document.getElementById('finalScore');
const bestScoreEl = document.getElementById('bestScore');
const pauseBtn = document.getElementById('pauseBtn');
const soundBtn = document.getElementById('soundBtn');
const musicBtn = document.getElementById('musicBtn');
const resumeBtn = document.getElementById('resumeBtn');
const restartBtn = document.getElementById('restartBtn');
const toMenuBtn = document.getElementById('toMenuBtn');
const pauseScoreEl = document.getElementById('pauseScore');
const settingsBtn = document.getElementById('settingsBtn');
const statsBtn = document.getElementById('statsBtn');
const achBtn = document.getElementById('achBtn');
const recordsBtn = document.getElementById('recordsBtn');
const backFromSettings = document.getElementById('backFromSettings');
const backFromStats = document.getElementById('backFromStats');
const backFromAch = document.getElementById('backFromAch');
const backFromRecords = document.getElementById('backFromRecords');
const skinButtons = document.querySelectorAll('.skin-btn');
const musicVolInput = document.getElementById('musicVol');
const sfxVolInput = document.getElementById('sfxVol');
const wrapToggle = document.getElementById('wrapToggle');
const reducedMotionToggle = document.getElementById('reducedMotionToggle');
const resetProgressBtn = document.getElementById('resetProgressBtn');
const resetMusicWarnBtn = document.getElementById('resetMusicWarnBtn');
const toastContainer = document.getElementById('toastContainer');

const tileCount = canvas.width / CONFIG.gridSize;

let snake = [];
let direction = { x: 1, y: 0 };
let nextDirection = { x: 1, y: 0 };
let directionChanged = false;
let food = { x: 0, y: 0, gold: false, born: 0 };
let score = 0;
let gameLoopRAF = null;
let lastTick = 0;
let baseSpeed = CONFIG.speeds.easy;
let currentSpeed = baseSpeed;
let gameState = 'menu';
let soundEnabled = true;
let musicEnabled = false;
let pausedThisGame = false;
let comboCount = 0;
let comboTimer = 0;
let lastEatTime = 0;
let particles = [];
let shake = 0;
let snakeSnapshot = null;
let prevSnake = null;
let skin = 'classic';
let wrapMode = CONFIG.wrap;
let unlockedAch = new Set();
let stats = { games: 0, points: 0, longest: 0, bestScores: [] };

const store = {
    get(k, def) {
        try { return JSON.parse(localStorage.getItem(CONFIG.storagePrefix + k)) ?? def; }
        catch { return def; }
    },
    set(k, v) {
        try { localStorage.setItem(CONFIG.storagePrefix + k, JSON.stringify(v)); } catch {}
    },
    del(k) { try { localStorage.removeItem(CONFIG.storagePrefix + k); } catch {} }
};

const bestKey = (speed) => 'best_' + speed;

function loadBest() {
    const val = store.get(bestKey(baseSpeed), 0);
    bestScoreEl.textContent = 'Рекорд: ' + val;
    return val;
}

function saveBest() {
    const key = bestKey(baseSpeed);
    const prev = store.get(key, 0);
    if (score > prev) store.set(key, score);
}

function loadSettings() {
    skin = store.get('skin', 'classic');
    wrapMode = store.get('wrap', CONFIG.wrap);
    soundEnabled = store.get('sound', true);
    musicEnabled = store.get('music', false);
    stats = store.get('stats', stats);
    unlockedAch = new Set(store.get('ach', []));
    const mv = store.get('musicVol', CONFIG.musicVolume);
    const sv = store.get('sfxVol', CONFIG.sfxVolume);
    CONFIG.musicVolume = mv;
    CONFIG.sfxVolume = sv;
    if (musicVolInput) musicVolInput.value = Math.round(mv * 100);
    if (sfxVolInput) sfxVolInput.value = Math.round(sv * 100);
    if (wrapToggle) wrapToggle.checked = wrapMode;
    if (soundBtn) soundBtn.textContent = soundEnabled ? '🔊' : '🔇';
    if (musicBtn) musicBtn.textContent = musicEnabled ? '🎵' : '🔕';
    if (store.get('reducedMotion', false)) document.body.classList.add('force-reduced-motion');
    applySkin();
}

function saveSettings() {
    store.set('skin', skin);
    store.set('wrap', wrapMode);
    store.set('sound', soundEnabled);
    store.set('music', musicEnabled);
    store.set('musicVol', CONFIG.musicVolume);
    store.set('sfxVol', CONFIG.sfxVolume);
}

function applySkin() {
    skinButtons.forEach(b => b.classList.toggle('active', b.dataset.skin === skin));
}

let audioCtx = null;
function getAudio() {
    if (!audioCtx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) audioCtx = new AC();
    }
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
}

function beep(freq, dur, type = 'square', vol = 1) {
    if (!soundEnabled) return;
    const c = getAudio();
    if (!c) return;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.value = 0.05 * CONFIG.sfxVolume * vol;
    o.connect(g);
    g.connect(c.destination);
    o.start();
    o.stop(c.currentTime + dur);
}

const pausePlayerEl = document.getElementById('playerToggle');
const playerPrev = document.getElementById('playerPrev');
const playerNext = document.getElementById('playerNext');
const playerTitle = document.getElementById('playerTitle');
const playerFill = document.getElementById('playerFill');
const playerProgress = document.getElementById('playerProgress');
const playerVol = document.getElementById('playerVol');
const playerFile = document.getElementById('playerFile');
const playerListEl = document.getElementById('playerList');

const AUDIO_EXT = /\.(mp3|wav|ogg|m4a|mp4|flac|opus|aac)$/i;

let tracks = [];
let currentTrackIndex = 0;

const bgm = new Audio();
bgm.loop = false;
bgm.volume = CONFIG.musicVolume;

function prettyTitle(filename) {
    const base = decodeURIComponent(filename.split('/').pop());
    return base.replace(AUDIO_EXT, '').replace(/[_-]+/g, ' ').trim() || base;
}

async function loadTracks() {
    let list = [];
    try {
        const r = await fetch('music/', { cache: 'no-store' });
        if (r.ok) {
            const html = await r.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            doc.querySelectorAll('a[href]').forEach(a => {
                const href = a.getAttribute('href');
                if (href && AUDIO_EXT.test(href) && !href.startsWith('..')) {
                    const name = href.split('/').pop();
                    if (!list.some(x => x.file.endsWith(name))) {
                        list.push({ title: prettyTitle(name), file: 'music/' + name });
                    }
                }
            });
        }
    } catch (e) { }

    if (!list.length) {
        try {
            const r = await fetch('music/list.json', { cache: 'no-store' });
            if (r.ok) {
                const data = await r.json();
                if (Array.isArray(data)) {
                    list = data
                        .filter(f => typeof f === 'string' && AUDIO_EXT.test(f))
                        .map(f => ({ title: prettyTitle(f), file: 'music/' + f }));
                }
            }
        } catch (e) { }
    }

    if (!list.length && typeof MUSIC_TRACKS !== 'undefined' && Array.isArray(MUSIC_TRACKS)) {
        list = MUSIC_TRACKS.slice();
    }
    if (!list.length && typeof MUSIC_TRACKS_FALLBACK !== 'undefined') {
        list = MUSIC_TRACKS_FALLBACK.slice();
    }

    tracks = list;
    renderTrackList();
    return tracks;
}

function renderTrackList() {
    if (!playerListEl) return;
    playerListEl.innerHTML = '';
    if (!tracks.length) {
        playerListEl.innerHTML = '<li class="player-item empty">Треков не найдено</li>';
        return;
    }
    tracks.forEach((t, i) => {
        const li = document.createElement('li');
        li.className = 'player-item' + (i === currentTrackIndex ? ' active' : '');
        li.textContent = t.title;
        li.dataset.index = i;
        li.addEventListener('click', () => setTrack(i, true));
        playerListEl.appendChild(li);
    });
}

function highlightActive() {
    if (!playerListEl) return;
    playerListEl.querySelectorAll('.player-item').forEach(li => {
        li.classList.toggle('active', parseInt(li.dataset.index, 10) === currentTrackIndex);
    });
}

function setTrack(i, autoplay) {
    if (!tracks.length) return;
    currentTrackIndex = ((i % tracks.length) + tracks.length) % tracks.length;
    const track = tracks[currentTrackIndex];
    bgm.src = track.file;
    if (playerTitle) playerTitle.textContent = track.title;
    store.set('trackIndex', currentTrackIndex);
    highlightActive();
    if (autoplay && musicEnabled) bgm.play().catch(() => {});
}

function tryPlayMusic() {
    if (!musicEnabled || !tracks.length) return;
    bgm.volume = CONFIG.musicVolume;
    if (!bgm.src) setTrack(currentTrackIndex, false);
    bgm.play().catch(() => {});
}

function pauseMusic() { bgm.pause(); }

function updatePlayerButton() {
    if (!pausePlayerEl) return;
    pausePlayerEl.textContent = bgm.paused ? '▶' : '⏸';
}

bgm.addEventListener('ended', () => {
    if (tracks.length > 1) setTrack(currentTrackIndex + 1, true);
    else if (musicEnabled) { bgm.currentTime = 0; bgm.play().catch(() => {}); }
});

bgm.addEventListener('timeupdate', () => {
    if (playerFill && bgm.duration) {
        playerFill.style.width = (bgm.currentTime / bgm.duration * 100) + '%';
    }
});

bgm.addEventListener('play', updatePlayerButton);
bgm.addEventListener('pause', updatePlayerButton);
bgm.addEventListener('error', () => {
    console.warn('Не удалось воспроизвести трек:', bgm.src);
});

if (playerPrev) playerPrev.addEventListener('click', () => setTrack(currentTrackIndex - 1, true));
if (playerNext) playerNext.addEventListener('click', () => setTrack(currentTrackIndex + 1, true));
if (pausePlayerEl) pausePlayerEl.addEventListener('click', () => {
    if (bgm.paused) tryPlayMusic();
    else pauseMusic();
});

if (playerProgress) playerProgress.addEventListener('click', (e) => {
    const rect = playerProgress.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    if (bgm.duration) bgm.currentTime = ratio * bgm.duration;
});

if (playerVol) {
    playerVol.addEventListener('input', () => {
        const v = playerVol.value / 100;
        bgm.volume = v;
        CONFIG.musicVolume = v;
        saveSettings();
    });
}

if (playerFile) playerFile.addEventListener('change', () => {
    const f = playerFile.files[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    const track = { title: f.name, file: url };
    const idx = tracks.findIndex(t => t.file === url);
    if (idx === -1) tracks.push(track);
    renderTrackList();
    setTrack(tracks.length - 1, true);
});

function setDirection(x, y) {
    if (gameState !== 'playing') return;
    if (directionChanged) return;
    if (direction.x === -x && direction.y === -y) return;
    if (direction.x === x && direction.y === y) return;
    nextDirection = { x, y };
    directionChanged = true;
}

function generateFood() {
    const snakeSet = new Set(snake.map(s => s.x + ',' + s.y));
    const freeCells = [];
    for (let i = 0; i < tileCount; i++) {
        for (let j = 0; j < tileCount; j++) {
            if (!snakeSet.has(i + ',' + j)) freeCells.push({ x: i, y: j });
        }
    }
    if (freeCells.length === 0) {
        gameState = 'win';
        statusEl.textContent = 'ПОБЕДА!';
        finishGame('ПОБЕДА!');
        return false;
    }
    const head = snake[0];
    const far = freeCells.filter(c => Math.abs(c.x - head.x) + Math.abs(c.y - head.y) > 2);
    const pool = far.length ? far : freeCells;
    const spot = pool[Math.floor(Math.random() * pool.length)];
    const isGold = Math.random() < CONFIG.goldChance;
    food = { x: spot.x, y: spot.y, gold: isGold, born: performance.now() };
    return true;
}

function addParticles(x, y, color, count = 12) {
    if (document.body.classList.contains('force-reduced-motion')) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const cx = x * CONFIG.gridSize + CONFIG.gridSize / 2;
    const cy = y * CONFIG.gridSize + CONFIG.gridSize / 2;
    for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = 1 + Math.random() * 3;
        particles.push({
            x: cx, y: cy,
            vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
            life: 1, color, size: 2 + Math.random() * 2
        });
    }
}

function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx * dt * 0.06;
        p.y += p.vy * dt * 0.06;
        p.vx *= 0.94;
        p.vy *= 0.94;
        p.life -= dt * 0.0025;
        if (p.life <= 0) particles.splice(i, 1);
    }
}

function drawParticles() {
    particles.forEach(p => {
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.globalAlpha = 1;
}

function roundRectPath(x, y, w, h, r) {
    if (ctx.roundRect) { ctx.roundRect(x, y, w, h, r); return; }
    ctx.rect(x, y, w, h);
}

function drawSegment(x, y, color, r, square) {
    const gs = CONFIG.gridSize;
    ctx.fillStyle = color;
    if (!square && SKINS[skin]?.glow) {
        ctx.shadowColor = color;
        ctx.shadowBlur = 12;
    }
    ctx.beginPath();
    roundRectPath(x * gs + 1, y * gs + 1, gs - 2, gs - 2, square ? 0 : (r || 4));
    ctx.fill();
    ctx.shadowBlur = 0;
}

function drawGrid() {
    const gs = CONFIG.gridSize;
    ctx.strokeStyle = 'rgba(255,165,2,0.05)';
    ctx.lineWidth = 1;
    for (let i = 1; i < tileCount; i++) {
        ctx.beginPath(); ctx.moveTo(i * gs, 0); ctx.lineTo(i * gs, canvas.height); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i * gs); ctx.lineTo(canvas.width, i * gs); ctx.stroke();
    }
}

function drawFood(now) {
    const gs = CONFIG.gridSize;
    const fx = food.x * gs + gs / 2;
    const fy = food.y * gs + gs / 2;
    const isGold = food.gold;
    const pulse = 1 + Math.sin(now / 200) * 0.1;
    ctx.fillStyle = isGold ? '#ffd700' : '#ff4757';
    if (SKINS[skin]?.glow || isGold) { ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 16; }
    ctx.beginPath();
    ctx.arc(fx, fy, (gs / 2 - 2) * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath();
    ctx.arc(fx - 3, fy - 3, 2, 0, Math.PI * 2);
    ctx.fill();
    if (isGold) {
        const elapsed = now - food.born;
        const remain = 1 - Math.min(1, elapsed / CONFIG.goldLifetime);
        ctx.strokeStyle = 'rgba(255,215,0,0.85)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(fx, fy, gs / 2 + 3, -Math.PI / 2, -Math.PI / 2 + remain * Math.PI * 2);
        ctx.stroke();
    }
}

function interpolatedSnake() {
    if (!snakeSnapshot) return snake;
    const t = Math.min(1, (performance.now() - lastTick) / currentSpeed);
    return snake.map((s, i) => {
        const prev = prevSnake?.[i] || snake[i + 1] || s;
        return { x: prev.x + (s.x - prev.x) * t, y: prev.y + (s.y - prev.y) * t };
    });
}

function adjustColor(hex, percent) {
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) + percent;
    let g = ((n >> 8) & 0xff) + percent;
    let b = (n & 0xff) + percent;
    r = Math.max(0, Math.min(255, r));
    g = Math.max(0, Math.min(255, g));
    b = Math.max(0, Math.min(255, b));
    return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}

function draw() {
    const now = performance.now();
    ctx.save();
    if (shake > 0) {
        ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
        shake *= 0.85;
        if (shake < 0.5) shake = 0;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid();

    const skinDef = SKINS[skin] || SKINS.classic;
    const interp = gameState === 'playing' || gameState === 'paused' ? interpolatedSnake() : snake;
    const gs = CONFIG.gridSize;

    if (interp.length > 0) {
        const hx = interp[0].x;
        const hy = interp[0].y;
        if (skinDef.glow) {
            ctx.shadowColor = skinDef.head;
            ctx.shadowBlur = 14;
        }
        ctx.fillStyle = skinDef.head;
        ctx.beginPath();
        roundRectPath(hx * gs + 1, hy * gs + 1, gs - 2, gs - 2, skinDef.square ? 0 : 6);
        ctx.fill();
        ctx.shadowBlur = 0;

        const cx = hx * gs + gs / 2;
        const cy = hy * gs + gs / 2;
        ctx.fillStyle = '#12141c';
        const off = 3;
        let ex1, ey1, ex2, ey2;
        if (direction.x === 1) { ex1 = cx + off; ey1 = cy - off; ex2 = cx + off; ey2 = cy + off; }
        else if (direction.x === -1) { ex1 = cx - off; ey1 = cy - off; ex2 = cx - off; ey2 = cy + off; }
        else if (direction.y === 1) { ex1 = cx - off; ey1 = cy + off; ex2 = cx + off; ey2 = cy + off; }
        else { ex1 = cx - off; ey1 = cy - off; ex2 = cx + off; ey2 = cy - off; }
        ctx.beginPath();
        ctx.arc(ex1, ey1, 1.6, 0, Math.PI * 2);
        ctx.arc(ex2, ey2, 1.6, 0, Math.PI * 2);
        ctx.fill();
    }

    for (let i = interp.length - 1; i >= 1; i--) {
        const s = interp[i];
        let color = skinDef.body;
        if (skinDef.gradient) {
            const f = i / interp.length;
            color = `hsl(${30 - f * 30}, 100%, ${50 - f * 20}%)`;
        } else if (!skinDef.square) {
            color = i % 2 ? skinDef.body : adjustColor(skinDef.body, -12);
        }
        drawSegment(s.x, s.y, color, 5, skinDef.square);
    }

    drawFood(now);
    drawParticles();
    ctx.restore();
}

function update() {
    direction = nextDirection;
    directionChanged = false;
    prevSnake = snake.map(s => ({ ...s }));

    const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };

    if (wrapMode) {
        head.x = (head.x + tileCount) % tileCount;
        head.y = (head.y + tileCount) % tileCount;
    } else if (head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount) {
        return die();
    }

    for (let i = 0; i < snake.length - 1; i++) {
        if (snake[i].x === head.x && snake[i].y === head.y) return die();
    }

    snake.unshift(head);

    if (head.x === food.x && head.y === food.y) {
        const now = performance.now();
        if (now - lastEatTime < CONFIG.comboWindow && comboCount < CONFIG.comboMax) {
            comboCount++;
        } else {
            comboCount = 1;
        }
        lastEatTime = now;
        updateComboUI();

        const pts = (food.gold ? CONFIG.goldPoints : CONFIG.pointsPerFood) * comboCount;
        score += pts;
        scoreDisplay.textContent = 'Очки: ' + score;
        stats.points += pts;
        stats.longest = Math.max(stats.longest, snake.length);

        addParticles(food.x, food.y, food.gold ? '#ffd700' : '#ff4757', food.gold ? 22 : 12);
        beep(food.gold ? 1400 : 880, 0.08, 'square');
        if (food.gold) beep(1800, 0.15, 'triangle', 0.8);

        checkAchievements();

        if (score % CONFIG.speedEvery === 0 && currentSpeed > CONFIG.minSpeed) {
            currentSpeed = Math.max(CONFIG.minSpeed, currentSpeed - CONFIG.speedStep);
        }
        if (!generateFood()) return;
    } else {
        snake.pop();
    }
    snakeSnapshot = snake;
}

function updateComboUI() {
    if (!comboDisplay) return;
    if (comboCount > 1) {
        comboDisplay.classList.add('visible');
        comboTimer = performance.now();
        if (comboCount >= 5) unlockAch('combo_5');
    } else {
        comboDisplay.classList.remove('visible');
    }
}

function renderCombo() {
    if (!comboDisplay) return;
    if (comboCount > 1) {
        const elapsed = performance.now() - comboTimer;
        const remain = Math.max(0, (CONFIG.comboWindow - elapsed) / 1000);
        const label = comboDisplay.querySelector('.combo-label');
        const timer = comboDisplay.querySelector('.combo-timer');
        if (label) label.textContent = '🔥 x' + comboCount;
        if (timer) timer.textContent = remain.toFixed(1) + 'с';
        comboDisplay.style.setProperty('--combo-progress', (remain / (CONFIG.comboWindow / 1000)));
        if (remain <= 0) {
            comboCount = 0;
            comboDisplay.classList.remove('visible');
        }
    }
}

function die() {
    gameState = 'gameover';
    statusEl.textContent = 'ИГРА ОКОНЧЕНА';
    beep(120, 0.3, 'sawtooth');
    shake = 14;
    finishGame('ИГРА ОКОНЧЕНА');
}

function finishGame(title) {
    stopLoop();
    pauseMusic();
    saveBest();
    const best = loadBest();
    finalScore.textContent = 'Очки: ' + score + '   |   Рекорд: ' + best;

    stats.games++;
    stats.bestScores.push({ score, speed: baseSpeed, date: Date.now() });
    stats.bestScores.sort((a, b) => b.score - a.score);
    stats.bestScores = stats.bestScores.slice(0, 10);
    store.set('stats', stats);
    if (!pausedThisGame && score >= 200) unlockAch('no_pause');

    if (gameOverTitle) gameOverTitle.textContent = title;
    gameOverMenu.classList.remove('hidden');
    pauseBtn.classList.add('hidden');
}

function checkAchievements() {
    if (snake.length >= 15) unlockAch('len_15');
    if (snake.length >= 30) unlockAch('len_30');
    if (score >= 100) unlockAch('score_100');
    if (score >= 300) unlockAch('score_300');
    if (food.gold) unlockAch('gold_eater');
    if (baseSpeed === CONFIG.speeds.insane && score >= 100) unlockAch('insane_win');
}

function unlockAch(id) {
    if (unlockedAch.has(id)) return;
    unlockedAch.add(id);
    store.set('ach', Array.from(unlockedAch));
    const meta = ACHIEVEMENTS.find(a => a.id === id);
    if (meta) showToast('🏆 ' + meta.title + ' — ' + meta.desc);
    beep(1600, 0.12, 'sine', 1.2);
    beep(2000, 0.15, 'sine', 1.2);
}

function showToast(text) {
    if (!toastContainer) return;
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = text;
    toastContainer.appendChild(el);
    setTimeout(() => { el.classList.add('hide'); }, 3000);
    setTimeout(() => { el.remove(); }, 3600);
}

function loopRAF(t) {
    gameLoopRAF = requestAnimationFrame(loopRAF);
    const dt = t - (lastTick || t);
    updateParticles(dt);
    if (gameState === 'playing') {
        if (t - lastTick >= currentSpeed) {
            lastTick = t;
            update(dt);
            snakeSnapshot = snake;
        }
    }
    renderCombo();
    draw();
}

function startLoop() {
    stopLoop();
    lastTick = performance.now();
    gameLoopRAF = requestAnimationFrame(loopRAF);
}

function stopLoop() {
    if (gameLoopRAF) cancelAnimationFrame(gameLoopRAF);
    gameLoopRAF = null;
}

function startGame() {
    stopLoop();
    menu.classList.remove('entering');
    snake = [{ x: 10, y: 10 }];
    direction = { x: 1, y: 0 };
    nextDirection = { x: 1, y: 0 };
    directionChanged = false;
    score = 0;
    currentSpeed = baseSpeed;
    gameState = 'playing';
    pausedThisGame = false;
    comboCount = 0;
    particles = [];
    shake = 0;
    lastEatTime = 0;
    scoreDisplay.textContent = 'Очки: 0';
    if (comboDisplay) comboDisplay.classList.remove('visible');
    statusEl.textContent = '';
    menu.classList.add('hidden');
    gameOverMenu.classList.add('hidden');
    pauseMenu.classList.add('hidden');
    settingsMenu?.classList.add('hidden');
    statsMenu?.classList.add('hidden');
    achMenu?.classList.add('hidden');
    recordsMenu?.classList.add('hidden');
    pauseBtn.classList.remove('hidden');
    pauseBtn.textContent = '⏸';
    document.body.classList.remove('paused', 'leaving-to-main');
    canvas.classList.remove('blurred');
    loadBest();
    generateFood();
    prevSnake = snake.map(s => ({ ...s }));
    snakeSnapshot = snake;
    tryPlayMusic();
    startLoop();
}

function enterPause() {
    gameState = 'paused';
    pausedThisGame = true;
    stopLoop();
    if (pauseScoreEl) pauseScoreEl.textContent = score;
    pauseBtn.textContent = '▶';
    document.body.classList.add('paused');
    canvas.classList.add('blurred');
    pauseMenu.classList.remove('hidden');
    pauseMenu.classList.remove('leaving');
    pauseMenu.classList.add('entering');
    setTimeout(() => pauseMenu.classList.remove('entering'), 600);
    bgm.volume = CONFIG.musicVolume * 0.4;
}

function resumeGame() {
    if (gameState !== 'paused') return;
    pauseMenu.classList.add('leaving');
    canvas.classList.remove('blurred');
    document.body.classList.remove('paused');
    setTimeout(() => {
        pauseMenu.classList.add('hidden');
        pauseMenu.classList.remove('leaving');
    }, 400);
    gameState = 'playing';
    pauseBtn.textContent = '⏸';
    bgm.volume = CONFIG.musicVolume;
    startLoop();
}

function togglePause() {
    if (gameState === 'playing') enterPause();
    else if (gameState === 'paused') resumeGame();
}

function showMenu(animated) {
    gameState = 'menu';
    stopLoop();
    bgm.volume = CONFIG.musicVolume;

    if (animated) {
        document.body.classList.add('leaving-to-main');
        pauseMenu.classList.remove('entering');
        pauseMenu.classList.add('leaving');
        canvas.classList.add('blurred');
        setTimeout(() => {
            pauseMenu.classList.add('hidden');
            pauseMenu.classList.remove('leaving');
            canvas.classList.remove('blurred');
            document.body.classList.remove('paused', 'leaving-to-main');
            menu.classList.remove('hidden', 'entering');
            void menu.offsetWidth;
            menu.classList.add('entering');
            setTimeout(() => menu.classList.remove('entering'), 750);
            gameOverMenu.classList.add('hidden');
            pauseBtn.classList.add('hidden');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            statusEl.textContent = '';
            scoreDisplay.textContent = 'Очки: 0';
            loadBest();
        }, 450);
    } else {
        document.body.classList.remove('paused', 'leaving-to-main');
        pauseMenu.classList.add('hidden');
        pauseMenu.classList.remove('leaving', 'entering');
        canvas.classList.remove('blurred');
        menu.classList.remove('hidden', 'entering');
        gameOverMenu.classList.add('hidden');
        pauseBtn.classList.add('hidden');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        statusEl.textContent = '';
        scoreDisplay.textContent = 'Очки: 0';
        loadBest();
    }
}

function renderStats() {
    if (!statsMenu) return;
    statsMenu.querySelector('#statGames').textContent = stats.games;
    statsMenu.querySelector('#statPoints').textContent = stats.points;
    statsMenu.querySelector('#statLongest').textContent = stats.longest;
}

function renderRecords() {
    if (!recordsMenu) return;
    const list = recordsMenu.querySelector('#recordsList');
    list.innerHTML = '';
    if (!stats.bestScores.length) {
        list.innerHTML = '<li class="empty">Пока пусто</li>';
        return;
    }
    stats.bestScores.forEach((r, i) => {
        const li = document.createElement('li');
        const date = new Date(r.date).toLocaleDateString();
        const spd = r.speed === 200 ? 'Лёгкий' : r.speed === 130 ? 'Средний' : r.speed === 80 ? 'Сложный' : 'Хардкор';
        li.innerHTML = `<span class="rank">#${i + 1}</span><span class="pts">${r.score}</span><span class="meta">${spd} · ${date}</span>`;
        list.appendChild(li);
    });
}

function renderAch() {
    if (!achMenu) return;
    const list = achMenu.querySelector('#achList');
    list.innerHTML = '';
    ACHIEVEMENTS.forEach(a => {
        const li = document.createElement('li');
        const got = unlockedAch.has(a.id);
        li.className = got ? 'ach got' : 'ach';
        li.innerHTML = `<span class="ach-icon">${got ? '🏆' : '🔒'}</span><div><b>${a.title}</b><div class="ach-desc">${a.desc}</div></div>`;
        list.appendChild(li);
    });
}

document.querySelectorAll('.menu .difficulty button').forEach(btn => {
    btn.addEventListener('click', function () {
        document.querySelectorAll('.menu .difficulty button').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        baseSpeed = parseInt(this.dataset.speed, 10);
        if (gameState === 'menu') loadBest();
    });
});

startBtn.addEventListener('click', () => { getAudio(); startGame(); });
retryBtn.addEventListener('click', () => { getAudio(); startGame(); });
if (resumeBtn) resumeBtn.addEventListener('click', resumeGame);
if (restartBtn) restartBtn.addEventListener('click', () => {
    pauseMenu.classList.add('hidden');
    pauseMenu.classList.remove('leaving', 'entering');
    canvas.classList.remove('blurred');
    document.body.classList.remove('paused', 'leaving-to-main');
    startGame();
});
if (toMenuBtn) toMenuBtn.addEventListener('click', () => showMenu(true));
if (pauseBtn) pauseBtn.addEventListener('click', togglePause);

if (soundBtn) {
    soundBtn.addEventListener('click', () => {
        soundEnabled = !soundEnabled;
        soundBtn.textContent = soundEnabled ? '🔊' : '🔇';
        saveSettings();
    });
}
if (musicBtn) {
    musicBtn.addEventListener('click', () => {
        musicEnabled = !musicEnabled;
        musicBtn.textContent = musicEnabled ? '🎵' : '🔕';
        
        if (musicEnabled) {
            tryPlayMusic(); 
            if (!store.get('musicWarned', false)) {
                setTimeout(() => {
                    alert('🎧 Внимание!\n\nВ игре используется музыка из игр (Minecraft, Stray и др.).\nЕсли вы стримите или записываете видео — отключите музыку, чтобы не получить блокировку за авторские права!');
                }, 100);
                store.set('musicWarned', true);
            }
        } else {
            pauseMusic();
        }
        saveSettings();
    });
}
if (settingsBtn) settingsBtn.addEventListener('click', () => {
    menu.classList.add('hidden');
    settingsMenu.classList.remove('hidden');
});
if (statsBtn) statsBtn.addEventListener('click', () => {
    renderStats();
    menu.classList.add('hidden');
    statsMenu.classList.remove('hidden');
});
if (achBtn) achBtn.addEventListener('click', () => {
    renderAch();
    menu.classList.add('hidden');
    achMenu.classList.remove('hidden');
});
if (recordsBtn) recordsBtn.addEventListener('click', () => {
    renderRecords();
    menu.classList.add('hidden');
    recordsMenu.classList.remove('hidden');
});
backFromSettings?.addEventListener('click', () => { settingsMenu.classList.add('hidden'); menu.classList.remove('hidden'); });
backFromStats?.addEventListener('click', () => { statsMenu.classList.add('hidden'); menu.classList.remove('hidden'); });
backFromAch?.addEventListener('click', () => { achMenu.classList.add('hidden'); menu.classList.remove('hidden'); });
backFromRecords?.addEventListener('click', () => { recordsMenu.classList.add('hidden'); menu.classList.remove('hidden'); });

skinButtons.forEach(btn => btn.addEventListener('click', () => {
    skin = btn.dataset.skin;
    applySkin();
    saveSettings();
    if (gameState === 'menu') { ctx.clearRect(0, 0, canvas.width, canvas.height); }
}));

musicVolInput?.addEventListener('input', () => {
    CONFIG.musicVolume = musicVolInput.value / 100;
    bgm.volume = CONFIG.musicVolume;
    if (playerVol) playerVol.value = Math.round(CONFIG.musicVolume * 100);
    saveSettings();
});
sfxVolInput?.addEventListener('input', () => {
    CONFIG.sfxVolume = sfxVolInput.value / 100;
    saveSettings();
});
wrapToggle?.addEventListener('change', () => {
    wrapMode = wrapToggle.checked;
    saveSettings();
});
reducedMotionToggle?.addEventListener('change', () => {
    document.body.classList.toggle('force-reduced-motion', reducedMotionToggle.checked);
    if (reducedMotionToggle.checked) store.set('reducedMotion', true);
    else store.del('reducedMotion');
});

resetProgressBtn?.addEventListener('click', () => {
    if (!confirm('Сбросить рекорды, статистику и достижения?')) return;
    ['best_easy', 'best_medium', 'best_hard', 'best_insane', 'stats', 'ach', 'trackIndex'].forEach(k => store.del(k));
    unlockedAch = new Set();
    stats = { games: 0, points: 0, longest: 0, bestScores: [] };
    loadBest();
    showToast('Прогресс сброшен');
});

if (resetMusicWarnBtn) {
    resetMusicWarnBtn.addEventListener('click', () => {
        store.del('musicWarned');
        showToast('Предупреждение о музыке сброшено');
    });
}

document.addEventListener('visibilitychange', () => {
    if (document.hidden && gameState === 'playing') enterPause();
});

window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && gameState === 'playing') enterPause();
});

loadSettings();
showMenu(false);

loadTracks().then(() => {
    const savedIdx = store.get('trackIndex', 0);
    currentTrackIndex = (savedIdx >= 0 && savedIdx < tracks.length) ? savedIdx : 0;
    if (tracks.length) setTrack(currentTrackIndex, false);
    if (playerVol) playerVol.value = Math.round(CONFIG.musicVolume * 100);
});
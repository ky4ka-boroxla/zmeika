const Music = (() => {
    const $ = (id) => document.getElementById(id);
    const playerEl = $('player');
    const listEl = $('playerList');
    const titleEl = $('playerTitle');
    const subEl = $('playerSub');
    const seekEl = $('playerSeek');
    const fillEl = $('playerFill');
    const knobEl = $('playerKnob');
    const curEl = $('playerCur');
    const durEl = $('playerDur');
    const toggleBtn = $('playerToggle');
    const prevBtn = $('playerPrev');
    const nextBtn = $('playerNext');
    const shuffleBtn = $('playerShuffle');
    const repeatBtn = $('playerRepeat');
    const muteBtn = $('playerMute');
    const volEl = $('playerVol');
    const fileInput = $('playerFile');
    const folderInput = $('playerFolder');
    const emptyEl = $('playerEmpty');
    const deckEl = $('playerDeck');
    const vizEl = $('playerViz');

    const svg = (inner, cls) => `<svg viewBox="0 0 24 24" class="${cls}" aria-hidden="true">${inner}</svg>`;
    const ICON = {
        play: svg('<path d="M8 5.5v13a1 1 0 0 0 1.5.86l10-6.5a1 1 0 0 0 0-1.72l-10-6.5A1 1 0 0 0 8 5.5z"/>', 'i-fill'),
        pause: svg('<rect x="6" y="5" width="4.5" height="14" rx="1.2"/><rect x="13.5" y="5" width="4.5" height="14" rx="1.2"/>', 'i-fill'),
        prev: svg('<rect x="5" y="5" width="2.6" height="14" rx="1"/><path d="M19 6v12a1 1 0 0 1-1.6.8l-8-6a1 1 0 0 1 0-1.6l8-6A1 1 0 0 1 19 6z"/>', 'i-fill'),
        next: svg('<rect x="16.4" y="5" width="2.6" height="14" rx="1"/><path d="M5 6v12a1 1 0 0 0 1.6.8l8-6a1 1 0 0 0 0-1.6l-8-6A1 1 0 0 0 5 6z"/>', 'i-fill'),
        shuffle: svg('<path d="M16 3h5v5"/><path d="M4 20 21 3"/><path d="M21 16v5h-5"/><path d="M15 15l6 6"/><path d="M4 4l5 5"/>', 'i-stroke'),
        repeat: svg('<path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/>', 'i-stroke'),
        repeatOne: svg('<path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/><path d="M11 10h1.2v4"/>', 'i-stroke'),
        vol: svg('<path d="M11 5 6 9H3v6h3l5 4z" class="i-solid"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/>', 'i-stroke'),
        mute: svg('<path d="M11 5 6 9H3v6h3l5 4z" class="i-solid"/><path d="M22 9l-6 6"/><path d="M16 9l6 6"/>', 'i-stroke'),
        close: svg('<path d="M6 6l12 12M18 6 6 18"/>', 'i-stroke')
    };

    let shuffle = store.get('shuffleMode', false);
    let repeat = store.get('repeatMode', 'all');
    let dragIndex = null;
    let scrubbing = false;
    let raf = 0;
    let db = null;

    const fmt = (s) => {
        if (!isFinite(s) || s < 0) return '0:00';
        const m = Math.floor(s / 60);
        const r = Math.floor(s % 60);
        return m + ':' + String(r).padStart(2, '0');
    };
    const fmtSize = (b) => b >= 1048576 ? (b / 1048576).toFixed(b >= 10485760 ? 0 : 1) + ' МБ' : Math.max(1, Math.round(b / 1024)) + ' КБ';
    const cleanTitle = (name) => name.replace(AUDIO_EXT, '').replace(/_+/g, ' ').trim() || name;

    function openDB() {
        if (db) return Promise.resolve(db);
        return new Promise((resolve, reject) => {
            if (!window.indexedDB) return reject(new Error('no idb'));
            const req = indexedDB.open('snake_music', 1);
            req.onupgradeneeded = () => req.result.createObjectStore('tracks', { keyPath: 'id', autoIncrement: true });
            req.onsuccess = () => { db = req.result; resolve(db); };
            req.onerror = () => reject(req.error);
        });
    }

    async function dbAll() {
        const d = await openDB();
        return new Promise((resolve, reject) => {
            const r = d.transaction('tracks', 'readonly').objectStore('tracks').getAll();
            r.onsuccess = () => resolve(r.result || []);
            r.onerror = () => reject(r.error);
        });
    }

    async function dbAdd(rec) {
        const d = await openDB();
        return new Promise((resolve, reject) => {
            const r = d.transaction('tracks', 'readwrite').objectStore('tracks').add(rec);
            r.onsuccess = () => resolve(r.result);
            r.onerror = () => reject(r.error);
        });
    }

    async function dbDel(id) {
        const d = await openDB();
        return new Promise((resolve, reject) => {
            const r = d.transaction('tracks', 'readwrite').objectStore('tracks').delete(id);
            r.onsuccess = () => resolve();
            r.onerror = () => reject(r.error);
        });
    }

    function saveOrder() {
        store.set('trackOrder', tracks.map(t => t.key));
    }

    function applyOrder() {
        const cur = tracks[currentTrackIndex];
        const saved = store.get('trackOrder', null);
        if (Array.isArray(saved)) {
            tracks.sort((a, b) => {
                const ia = saved.indexOf(a.key);
                const ib = saved.indexOf(b.key);
                if (ia === -1 && ib === -1) return 0;
                if (ia === -1) return 1;
                if (ib === -1) return -1;
                return ia - ib;
            });
        }
        const idx = tracks.indexOf(cur);
        currentTrackIndex = idx === -1 ? 0 : idx;
    }

    function findNext(dir) {
        const n = tracks.length;
        if (!n) return -1;
        const alive = tracks.map((t, i) => (t.broken ? -1 : i)).filter(i => i !== -1);
        if (!alive.length) return -1;
        if (shuffle && alive.length > 1) {
            const pool = alive.filter(i => i !== currentTrackIndex);
            return pool[Math.floor(Math.random() * pool.length)];
        }
        for (let s = 1; s <= n; s++) {
            const i = (((currentTrackIndex + dir * s) % n) + n) % n;
            if (!tracks[i].broken) return i;
        }
        return -1;
    }

    function selectAndPlay(i) {
        if (!tracks[i]) return;
        tracks[i].broken = false;
        setTrack(i, false);
        setEnabled(true);
    }

    function activate(on) {
        musicEnabled = on;
        if (musicBtn) musicBtn.textContent = on ? '🎵' : '🔕';
        saveSettings();
        if (on) {
            ensureAnalyser();
            tryPlayMusic();
        } else pauseMusic();
        paintState();
    }

    function setEnabled(on, opts = {}) {
        if (on && !tracks.length) {
            showToast('Сначала добавь треки в плеере');
            return false;
        }
        if (on && !opts.silent && !store.get('musicWarned', false)) {
            UI.musicWarning().then(choice => {
                if (choice === 'ok') {
                    store.set('musicWarned', true);
                    activate(true);
                }
            });
            return true;
        }
        activate(on);
        return true;
    }

    function step(dir) {
        const i = findNext(dir);
        if (i === -1) return;
        setTrack(i, true);
    }

    const BARS = 32;
    const vctx = vizEl.getContext('2d');
    const levels = new Array(BARS).fill(0);
    const peaks = new Array(BARS).fill(0);
    let analyser = null;
    let freq = null;
    let binMap = [];
    let vizRaf = 0;
    let vizW = 0;
    let vizH = 0;
    let vizGrad = null;
    let vizDpr = 1;

    function buildBins(sampleRate) {
        const nyq = sampleRate / 2;
        const bins = analyser.frequencyBinCount;
        const lo = 55;
        const hi = Math.min(14000, nyq * 0.9);
        binMap = [];
        for (let i = 0; i < BARS; i++) {
            const f0 = lo * Math.pow(hi / lo, i / BARS);
            const f1 = lo * Math.pow(hi / lo, (i + 1) / BARS);
            const b0 = Math.min(bins - 1, Math.floor(f0 / nyq * bins));
            const b1 = Math.min(bins, Math.max(b0 + 1, Math.ceil(f1 / nyq * bins)));
            binMap.push([b0, b1]);
        }
    }

    function ensureAnalyser() {
        if (analyser) return true;
        const ac = getAudio();
        if (!ac || ac.state !== 'running') return false;
        try {
            const src = ac.createMediaElementSource(bgm);
            const node = ac.createAnalyser();
            node.fftSize = 1024;
            node.smoothingTimeConstant = 0.6;
            node.minDecibels = -88;
            node.maxDecibels = -22;
            src.connect(node);
            node.connect(ac.destination);
            analyser = node;
            freq = new Uint8Array(node.frequencyBinCount);
            buildBins(ac.sampleRate);
            return true;
        } catch (e) {
            analyser = null;
            return false;
        }
    }

    function sizeViz() {
        const r = vizEl.getBoundingClientRect();
        if (!r.width) return;
        vizDpr = window.devicePixelRatio || 1;
        vizW = r.width;
        vizH = r.height;
        vizEl.width = Math.round(vizW * vizDpr);
        vizEl.height = Math.round(vizH * vizDpr);
        vizGrad = vctx.createLinearGradient(0, vizH, 0, 0);
        vizGrad.addColorStop(0, '#ff9500');
        vizGrad.addColorStop(0.6, '#ffc21a');
        vizGrad.addColorStop(1, '#fff0a0');
        renderViz();
    }

    function renderViz() {
        if (!vizW) return;
        vctx.setTransform(vizDpr, 0, 0, vizDpr, 0, 0);
        vctx.clearRect(0, 0, vizW, vizH);
        const gap = 2;
        const bw = Math.max(2, (vizW - gap * (BARS - 1)) / BARS);
        for (let i = 0; i < BARS; i++) {
            const x = i * (bw + gap);
            const h = Math.max(2, levels[i] * vizH);
            const idle = levels[i] < 0.02;
            vctx.globalAlpha = idle ? 0.4 : 1;
            vctx.fillStyle = vizGrad;
            const r = Math.min(bw / 2, h / 2);
            vctx.beginPath();
            vctx.roundRect ? vctx.roundRect(x, vizH - h, bw, h, r) : vctx.rect(x, vizH - h, bw, h);
            vctx.fill();
            if (!idle && peaks[i] > levels[i] + 0.04) {
                vctx.globalAlpha = 0.9;
                vctx.fillStyle = '#fff4c2';
                vctx.fillRect(x, vizH - peaks[i] * vizH - 3, bw, 2);
            }
        }
        vctx.globalAlpha = 1;
    }

    function drawViz() {
        vizRaf = 0;
        if (musicMenu.classList.contains('hidden')) return;
        const live = !bgm.paused && !!analyser;
        if (live) analyser.getByteFrequencyData(freq);
        const volNorm = 1 / Math.pow(Math.max(0.35, bgm.volume), 0.45);
        let energy = 0;
        for (let i = 0; i < BARS; i++) {
            let target = 0;
            if (live) {
                const [b0, b1] = binMap[i];
                let sum = 0;
                let mx = 0;
                for (let b = b0; b < b1; b++) {
                    sum += freq[b];
                    if (freq[b] > mx) mx = freq[b];
                }
                const raw = (sum / (b1 - b0) * 0.4 + mx * 0.6) / 255;
                const v = Math.min(1, raw * volNorm);
                target = Math.min(1, Math.pow(v, 1.5) * (1 + i / BARS * 0.55));
            }
            levels[i] += (target - levels[i]) * (target > levels[i] ? 0.6 : 0.14);
            if (levels[i] < 0.004) levels[i] = 0;
            if (levels[i] >= peaks[i]) peaks[i] = levels[i];
            else peaks[i] = Math.max(levels[i], peaks[i] - 0.014);
            energy += levels[i];
        }
        const band = (a, b) => {
            let s = 0;
            for (let i = a; i < b; i++) s += levels[i];
            return Math.min(1, 0.18 + (s / (b - a)) * 1.15).toFixed(3);
        };
        playerEl.style.setProperty('--b0', band(0, 9));
        playerEl.style.setProperty('--b1', band(9, 21));
        playerEl.style.setProperty('--b2', band(21, BARS));
        renderViz();
        if (live || energy > 0.01) vizRaf = requestAnimationFrame(drawViz);
    }

    function startViz() {
        if (!vizRaf) vizRaf = requestAnimationFrame(drawViz);
    }

    if (window.ResizeObserver) new ResizeObserver(sizeViz).observe(vizEl);

    const armEl = deckEl.querySelector('.tonearm');
    let lastArm = 0;
    let lastPlaying = false;
    let armTimer = 0;

    function moveArm(settle) {
        const angle = playerEl.classList.contains('playing') ? 24 + 16 * lastArm : 0;
        if (settle) {
            armEl.classList.add('settle');
            clearTimeout(armTimer);
            armTimer = setTimeout(() => armEl.classList.remove('settle'), 1100);
        }
        armEl.style.setProperty('--ang', angle.toFixed(2) + 'deg');
    }

    function paintProgress(ratio, cur, dur) {
        if (Math.abs(ratio - lastArm) > 0.002 || ratio === 0 || ratio === 1) {
            lastArm = ratio;
            moveArm(false);
        }
        fillEl.style.transform = 'scaleX(' + ratio + ')';
        knobEl.style.left = (ratio * 100) + '%';
        curEl.textContent = fmt(cur);
        durEl.textContent = dur ? fmt(dur) : '0:00';
    }

    function sync() {
        const d = bgm.duration;
        const ok = isFinite(d) && d > 0;
        paintProgress(ok ? Math.min(1, bgm.currentTime / d) : 0, bgm.currentTime || 0, ok ? d : 0);
    }

    function tick() {
        raf = 0;
        if (musicMenu.classList.contains('hidden')) return;
        if (!scrubbing) sync();
        if (!bgm.paused) raf = requestAnimationFrame(tick);
    }

    function startTick() {
        if (!raf) raf = requestAnimationFrame(tick);
    }

    function paintState() {
        const playing = !bgm.paused;
        playerEl.classList.toggle('playing', playing);
        if (playing !== lastPlaying) {
            lastPlaying = playing;
            moveArm(true);
        }
        const st = playing ? 'pause' : 'play';
        if (toggleBtn.dataset.st !== st) {
            toggleBtn.dataset.st = st;
            toggleBtn.innerHTML = ICON[st];
        }
        toggleBtn.setAttribute('aria-label', playing ? 'Пауза' : 'Играть');
        volEl.style.setProperty('--v', volEl.value + '%');
        shuffleBtn.classList.toggle('on', shuffle);
        repeatBtn.classList.toggle('on', repeat !== 'off');
        repeatBtn.innerHTML = repeat === 'one' ? ICON.repeatOne : ICON.repeat;
        muteBtn.innerHTML = bgm.muted || bgm.volume === 0 ? ICON.mute : ICON.vol;
        if (playing) {
            ensureAnalyser();
            startTick();
        }
        startViz();
    }

    function paintInfo() {
        const t = tracks[currentTrackIndex];
        if (!t) {
            titleEl.textContent = 'Нет треков';
            subEl.textContent = 'Добавь свои файлы ниже';
            paintProgress(0, 0, 0);
            return;
        }
        titleEl.textContent = t.title;
        subEl.textContent = (currentTrackIndex + 1) + ' из ' + tracks.length + (t.user ? ' · свой файл' : '') + (t.broken ? ' · файл не найден' : '');
        listEl.querySelectorAll('.track').forEach(li => li.classList.toggle('active', Number(li.dataset.index) === currentTrackIndex));
        if ('mediaSession' in navigator && window.MediaMetadata) {
            navigator.mediaSession.metadata = new MediaMetadata({ title: t.title, artist: 'Змейка' });
        }
    }

    function render() {
        const has = tracks.length > 0;
        playerEl.classList.toggle('empty', !has);
        [toggleBtn, prevBtn, nextBtn, shuffleBtn, repeatBtn].forEach(b => { b.disabled = !has; });
        emptyEl.hidden = has;
        listEl.hidden = !has;
        listEl.innerHTML = '';
        tracks.forEach((t, i) => {
            const li = document.createElement('li');
            li.className = 'track' + (i === currentTrackIndex ? ' active' : '') + (t.broken ? ' broken' : '');
            li.dataset.index = i;
            li.draggable = !isTouch;
            li.style.setProperty('--n', Math.min(i, 12));
            const num = document.createElement('span');
            num.className = 'track-num';
            num.textContent = i + 1;
            const eq = document.createElement('span');
            eq.className = 'mini-eq';
            eq.innerHTML = '<b></b><b></b><b></b>';
            const name = document.createElement('span');
            name.className = 'track-name';
            name.textContent = t.title;
            const tag = document.createElement('span');
            tag.className = 'track-tag';
            tag.textContent = t.broken ? 'нет файла' : (t.user && t.size ? fmtSize(t.size) : '');
            li.append(num, eq, name, tag);
            if (t.user) {
                const del = document.createElement('button');
                del.className = 'track-del';
                del.title = 'Удалить из плеера';
                del.innerHTML = ICON.close;
                del.addEventListener('click', (e) => { e.stopPropagation(); removeTrack(i); });
                li.appendChild(del);
            }
            li.addEventListener('click', () => selectAndPlay(i));
            li.addEventListener('dragstart', (e) => {
                dragIndex = i;
                li.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', String(i));
            });
            li.addEventListener('dragend', () => {
                dragIndex = null;
                li.classList.remove('dragging');
                listEl.querySelectorAll('.over-top,.over-bottom').forEach(n => n.classList.remove('over-top', 'over-bottom'));
            });
            li.addEventListener('dragover', (e) => {
                if (dragIndex === null) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                const r = li.getBoundingClientRect();
                const before = e.clientY < r.top + r.height / 2;
                li.classList.toggle('over-top', before);
                li.classList.toggle('over-bottom', !before);
            });
            li.addEventListener('dragleave', () => li.classList.remove('over-top', 'over-bottom'));
            li.addEventListener('drop', (e) => {
                if (dragIndex === null) return;
                e.preventDefault();
                const r = li.getBoundingClientRect();
                let to = e.clientY < r.top + r.height / 2 ? i : i + 1;
                const from = dragIndex;
                dragIndex = null;
                if (from < to) to--;
                if (from === to) { render(); return; }
                const cur = tracks[currentTrackIndex];
                const [moved] = tracks.splice(from, 1);
                tracks.splice(to, 0, moved);
                currentTrackIndex = tracks.indexOf(cur);
                saveOrder();
                render();
            });
            listEl.appendChild(li);
        });
        paintInfo();
        paintState();
    }

    async function removeTrack(i) {
        const t = tracks[i];
        if (!t || !t.user) return;
        const wasCurrent = i === currentTrackIndex;
        const cur = tracks[currentTrackIndex];
        tracks.splice(i, 1);
        try { if (t.id != null) await dbDel(t.id); } catch (e) { }
        try { URL.revokeObjectURL(t.file); } catch (e) { }
        if (wasCurrent) {
            bgm.pause();
            bgm.removeAttribute('src');
            bgm.load();
            if (tracks.length) setTrack(Math.min(i, tracks.length - 1), false);
            else { currentTrackIndex = 0; if (musicEnabled) setEnabled(false, { silent: true }); }
        } else {
            currentTrackIndex = tracks.indexOf(cur);
        }
        saveOrder();
        render();
        showToast('Трек удалён');
    }

    async function addFiles(list) {
        const files = Array.from(list || []).filter(f => AUDIO_EXT.test(f.name) || (f.type && f.type.startsWith('audio/')));
        if (!files.length) {
            showToast('Здесь нет аудиофайлов');
            return;
        }
        const hadNone = !tracks.length;
        let added = 0;
        let saved = true;
        for (const f of files) {
            if (tracks.some(t => t.user && t.name === f.name && t.size === f.size)) continue;
            let id = null;
            try {
                id = await dbAdd({ name: f.name, size: f.size, type: f.type, blob: f, added: Date.now() });
            } catch (e) {
                saved = false;
            }
            tracks.push({
                title: cleanTitle(f.name),
                file: URL.createObjectURL(f),
                key: id != null ? 'u:' + id : 'tmp:' + f.name + ':' + f.size,
                user: true,
                id,
                name: f.name,
                size: f.size
            });
            added++;
        }
        if (!added) {
            showToast('Эти треки уже в плеере');
            return;
        }
        saveOrder();
        if (hadNone) {
            currentTrackIndex = 0;
            setTrack(0, false);
        }
        render();
        showToast('Добавлено треков: ' + added + (saved ? '' : ' (до перезагрузки)'));
    }

    async function pruneMissing() {
        const statics = tracks.filter(t => !t.user);
        await Promise.all(statics.map(async t => {
            try {
                const r = await fetch(t.file, { method: 'HEAD', cache: 'no-store' });
                if (r.status === 404) t.gone = true;
            } catch (e) {
                if (/^(chrome|moz)-extension:$/.test(location.protocol)) t.gone = true;
            }
        }));
        for (let i = tracks.length - 1; i >= 0; i--) if (tracks[i].gone) tracks.splice(i, 1);
    }

    async function loadUserTracks() {
        try {
            const rows = await dbAll();
            rows.forEach(r => {
                if (!r.blob) return;
                tracks.push({
                    title: cleanTitle(r.name),
                    file: URL.createObjectURL(r.blob),
                    key: 'u:' + r.id,
                    user: true,
                    id: r.id,
                    name: r.name,
                    size: r.size
                });
            });
        } catch (e) { }
    }

    function onEnded() {
        if (repeat === 'one') {
            bgm.currentTime = 0;
            bgm.play().catch(() => { });
            return;
        }
        const last = currentTrackIndex === tracks.length - 1;
        if (repeat === 'off' && !shuffle && last) {
            paintState();
            return;
        }
        step(1);
    }

    function onError() {
        if (!bgm.getAttribute('src')) return;
        const t = tracks[currentTrackIndex];
        if (!t) return;
        t.broken = true;
        if (musicEnabled) showToast('Не удалось открыть: ' + t.title);
        const next = findNext(1);
        if (next !== -1 && next !== currentTrackIndex && musicEnabled) setTrack(next, true);
        else if (musicEnabled) setEnabled(false, { silent: true });
        render();
    }

    function seekFromEvent(e) {
        const r = seekEl.getBoundingClientRect();
        const ratio = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
        const d = bgm.duration;
        paintProgress(ratio, isFinite(d) ? ratio * d : 0, isFinite(d) ? d : 0);
        return ratio;
    }

    seekEl.addEventListener('pointerdown', (e) => {
        if (!isFinite(bgm.duration)) return;
        scrubbing = true;
        seekEl.classList.add('scrub');
        try { seekEl.setPointerCapture(e.pointerId); } catch (err) { }
        seekFromEvent(e);
    });
    seekEl.addEventListener('pointermove', (e) => { if (scrubbing) seekFromEvent(e); });
    const endScrub = (e) => {
        if (!scrubbing) return;
        scrubbing = false;
        seekEl.classList.remove('scrub');
        const ratio = seekFromEvent(e);
        if (isFinite(bgm.duration)) bgm.currentTime = ratio * bgm.duration;
        startTick();
    };
    seekEl.addEventListener('pointerup', endScrub);
    seekEl.addEventListener('pointercancel', () => { scrubbing = false; seekEl.classList.remove('scrub'); });

    toggleBtn.addEventListener('click', () => setEnabled(bgm.paused));
    nextBtn.addEventListener('click', () => step(1));
    prevBtn.addEventListener('click', () => {
        if (bgm.currentTime > 3) bgm.currentTime = 0;
        else step(-1);
    });
    shuffleBtn.addEventListener('click', () => {
        shuffle = !shuffle;
        store.set('shuffleMode', shuffle);
        paintState();
        showToast(shuffle ? 'Случайный порядок включён' : 'Случайный порядок выключен');
    });
    repeatBtn.addEventListener('click', () => {
        repeat = repeat === 'all' ? 'one' : repeat === 'one' ? 'off' : 'all';
        store.set('repeatMode', repeat);
        paintState();
        showToast(repeat === 'all' ? 'Повтор: все треки' : repeat === 'one' ? 'Повтор: один трек' : 'Повтор выключен');
    });
    muteBtn.addEventListener('click', () => {
        bgm.muted = !bgm.muted;
        paintState();
    });
    volEl.addEventListener('input', () => {
        const v = volEl.value / 100;
        CONFIG.musicVolume = v;
        bgm.volume = v;
        if (bgm.muted && v > 0) bgm.muted = false;
        if (musicVolInput) musicVolInput.value = volEl.value;
        saveSettings();
        paintState();
    });
    musicVolInput?.addEventListener('input', () => { volEl.value = musicVolInput.value; paintState(); });

    fileInput.addEventListener('change', () => { addFiles(fileInput.files); fileInput.value = ''; });
    folderInput.addEventListener('change', () => { addFiles(folderInput.files); folderInput.value = ''; });

    ['dragenter', 'dragover'].forEach(ev => playerEl.addEventListener(ev, (e) => {
        if (dragIndex !== null || !e.dataTransfer || !Array.from(e.dataTransfer.types || []).includes('Files')) return;
        e.preventDefault();
        playerEl.classList.add('dropping');
    }));
    ['dragleave', 'drop'].forEach(ev => playerEl.addEventListener(ev, (e) => {
        if (ev === 'dragleave' && playerEl.contains(e.relatedTarget)) return;
        playerEl.classList.remove('dropping');
    }));
    playerEl.addEventListener('drop', (e) => {
        if (dragIndex !== null || !e.dataTransfer || !e.dataTransfer.files.length) return;
        e.preventDefault();
        addFiles(e.dataTransfer.files);
    });

    bgm.addEventListener('play', paintState);
    bgm.addEventListener('pause', paintState);
    bgm.addEventListener('ended', onEnded);
    bgm.addEventListener('error', onError);
    bgm.addEventListener('loadedmetadata', () => { if (!scrubbing) sync(); });
    bgm.addEventListener('volumechange', paintState);
    window.addEventListener('trackchange', () => { paintInfo(); paintState(); if (!scrubbing) sync(); });

    if ('mediaSession' in navigator) {
        try {
            navigator.mediaSession.setActionHandler('play', () => setEnabled(true));
            navigator.mediaSession.setActionHandler('pause', () => setEnabled(false));
            navigator.mediaSession.setActionHandler('previoustrack', () => step(-1));
            navigator.mediaSession.setActionHandler('nexttrack', () => step(1));
        } catch (e) { }
    }

    prevBtn.innerHTML = ICON.prev;
    nextBtn.innerHTML = ICON.next;
    shuffleBtn.innerHTML = ICON.shuffle;

    function refresh() {
        startViz();
        listEl.classList.add('fresh');
        setTimeout(() => listEl.classList.remove('fresh'), 900);
        render();
        sync();
        startTick();
    }

    (async () => {
        volEl.value = Math.round(CONFIG.musicVolume * 100);
        render();
        await window.tracksReady;
        await pruneMissing();
        await loadUserTracks();
        applyOrder();
        const key = store.get('trackKey', null);
        const idx = tracks.findIndex(t => t.key === key);
        currentTrackIndex = idx === -1 ? 0 : idx;
        if (tracks.length) setTrack(currentTrackIndex, false);
        volEl.value = Math.round(CONFIG.musicVolume * 100);
        render();
    })();

    return { setEnabled, refresh, addFiles };
})();

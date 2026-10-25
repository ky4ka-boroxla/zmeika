const Book = (() => {
    const $ = (id) => document.getElementById(id);
    const root = $('aboutMenu');
    const stage = $('bookStage');
    const bookEl = $('book');
    const prevBtn = $('bookPrev');
    const nextBtn = $('bookNext');
    const dotsEl = $('bookDots');
    const captionEl = $('bookCaption');
    const mq = window.matchMedia('(max-width: 760px)');

    const ru = (n) => String(n).replace('.', ',');

    const entries = () => [
        {
            label: 'Предисловие',
            title: 'Как читать эту книгу',
            img: 'book/intro.png',
            caption: 'Поле, змейка и добыча',
            text: [
                'Здесь собрано всё, что встречается на поле. Листай стрелками, свайпом или нажимай на край страницы.',
                'Правила просты: ешь, расти и не врезайся — ни в стену, ни в собственный хвост.'
            ],
            chips: ['Стрелки или WASD', 'Свайпы на телефоне']
        },
        {
            label: 'Предмет № 1',
            title: 'Красное яблоко',
            img: 'book/apple.png',
            caption: 'Обычная еда',
            text: [
                'Основная добыча. Каждое яблоко даёт ' + CONFIG.pointsPerFood + ' очков и удлиняет змейку на один сегмент.',
                'Появляется на свободной клетке и никогда не вплотную к голове.'
            ],
            chips: ['+' + CONFIG.pointsPerFood + ' очков', '+1 сегмент']
        },
        {
            label: 'Предмет № 2',
            title: 'Золотое яблоко',
            img: 'book/gold.png',
            caption: 'Редкая добыча',
            text: [
                'Иногда вместо обычного яблока появляется золотое — шанс около ' + Math.round(CONFIG.goldChance * 100) + ' %. Очки за него умножаются на текущее комбо.',
                'Кольцо вокруг показывает, сколько времени осталось. Не успел — яблоко исчезнет, а на его месте появится обычное.'
            ],
            chips: ['+' + CONFIG.goldPoints + ' очков', ru(CONFIG.goldLifetime / 1000) + ' с на сбор']
        },
        {
            label: 'Предмет № 3',
            title: 'Комбо',
            img: 'book/combo.png',
            caption: 'Множитель очков',
            text: [
                'Съедай еду одну за другой, пока не истёк таймер, — и множитель растёт, вплоть до ×' + CONFIG.comboMax + '. Каждая следующая порция очков умножается на него.',
                'Не успел вовремя — множитель сбрасывается. Пауза таймер не съедает.'
            ],
            chips: ['до ×' + CONFIG.comboMax, 'окно ' + ru(CONFIG.comboWindow / 1000) + ' с']
        },
        {
            label: 'Предмет № 4',
            title: 'Ускорение',
            img: 'book/speed.png',
            caption: 'Темп растёт вместе со счётом',
            text: [
                'Каждые ' + CONFIG.speedEvery + ' очков змейка становится быстрее на ' + CONFIG.speedStep + ' мс за ход — пока не упрётся в предел скорости.',
                'На «Хардкоре» темп и так максимальный, поэтому там ускорения нет.'
            ],
            chips: ['каждые ' + CONFIG.speedEvery + ' очков', '−' + CONFIG.speedStep + ' мс за ход']
        },
        {
            label: 'Предмет № 5',
            title: 'Стены и порталы',
            img: 'book/walls.png',
            caption: 'Режим «сквозь стены»',
            text: [
                'Обычно стена — конец партии. В настройках можно включить режим «сквозь стены»: змейка выходит с одной стороны поля и появляется с противоположной.',
                'Рекорды для двух режимов ведутся отдельно.'
            ],
            chips: ['Стены убивают', 'Сквозь стены — в настройках']
        },
        {
            label: 'Предмет № 6',
            title: 'Скины',
            img: 'book/skins.png',
            caption: 'Четыре облика змейки',
            text: [
                'Скин меняет цвет и свечение змейки, на игру он не влияет. Доступны Классика, Neon, Retro и Fire.',
                'Выбрать облик можно в настройках — он сразу виден на поле.'
            ],
            chips: ['Классика', 'Neon', 'Retro', 'Fire']
        }
    ];

    let es = [];
    let mode = null;
    let k = 0;
    let E = 0;
    let L = 0;
    let leaves = [];
    const timers = new Map();
    let openTimer = null;
    let leaveTimers = [];

    const chipsHTML = (e) => '<div class="chips">' + e.chips.map(c => '<span>' + c + '</span>').join('') + '</div>';
    const paragraphs = (e) => e.text.map(t => '<p>' + t + '</p>').join('');

    const coverFace = () => '<div class="face-in cover-in"><div class="cover-frame"></div><img class="cover-emblem" src="book/emblem.png" alt="" draggable="false"><div class="cover-title">ЗМЕЙКА</div><div class="cover-rule"></div><div class="cover-sub">Книга предметов</div></div>';
    const artFace = (e, n) => '<div class="face-in art"><figure class="plate"><img src="' + e.img + '" alt="' + e.title + '" draggable="false"><figcaption>' + e.caption + '</figcaption></figure><div class="pgnum">' + n + '</div></div>';
    const textFace = (e, n) => '<div class="face-in txt"><div class="eyebrow">' + e.label + '</div><h3>' + e.title + '</h3><div class="orn">❦</div>' + paragraphs(e) + chipsHTML(e) + '<div class="pgnum">' + n + '</div></div>';
    const singleFace = (e, n) => '<div class="face-in single"><figure class="plate"><img src="' + e.img + '" alt="' + e.title + '" draggable="false"></figure><div class="eyebrow">' + e.label + '</div><h3>' + e.title + '</h3>' + paragraphs(e) + chipsHTML(e) + '<div class="pgnum">' + n + '</div></div>';

    function leafEl(frontHTML, frontCls, backHTML, backCls) {
        const l = document.createElement('div');
        l.className = 'leaf';
        l.innerHTML = '<div class="face front ' + frontCls + '">' + frontHTML + '<div class="shade"></div></div><div class="face back ' + backCls + '">' + backHTML + '<div class="shade"></div></div>';
        return l;
    }

    function build(newMode) {
        mode = newMode;
        es = entries();
        E = es.length;
        L = E + 1;
        bookEl.querySelectorAll('.leaf').forEach(n => n.remove());
        leaves = [];
        for (let i = 0; i < L; i++) {
            let l;
            if (mode === 'spread') {
                const front = i === 0 ? coverFace() : textFace(es[i - 1], 2 * i + 1);
                const back = i < E ? artFace(es[i], 2 * i + 2) : '';
                l = leafEl(front, i === 0 ? 'cover' : 'paper right', back, i < E ? 'paper left' : 'paper left blank');
            } else {
                const front = i === 0 ? coverFace() : singleFace(es[i - 1], i + 1);
                l = leafEl(front, i === 0 ? 'cover' : 'paper right', '', 'paper left blank');
            }
            bookEl.appendChild(l);
            leaves.push(l);
        }
        dotsEl.innerHTML = '';
        es.forEach((e, i) => {
            const d = document.createElement('button');
            d.className = 'dot';
            d.setAttribute('aria-label', e.title);
            d.addEventListener('click', () => goTo(i + 1));
            dotsEl.appendChild(d);
        });
        bookEl.dataset.mode = mode;
        root.classList.toggle('single', mode === 'single');
    }

    function zFor(i, flipped) {
        return flipped ? i : L - i;
    }

    function setLeaf(i, flipped) {
        const l = leaves[i];
        l.classList.toggle('flipped', flipped);
        l.style.setProperty('--z', zFor(i, flipped));
    }

    function turn(i, flipped, fast) {
        const l = leaves[i];
        if (!l) return;
        clearTimeout(timers.get(i));
        l.classList.toggle('fast', !!fast);
        l.classList.add('turning');
        l.style.zIndex = L + 5;
        setLeaf(i, flipped);
        timers.set(i, setTimeout(() => {
            l.classList.remove('turning');
            l.style.zIndex = zFor(i, flipped);
        }, UI.reduced() ? 0 : (fast ? 800 : 1050)));
    }

    function paintUI() {
        bookEl.classList.toggle('is-closed', k === 0);
        bookEl.classList.toggle('is-last', k === E);
        prevBtn.disabled = k === 0;
        nextBtn.disabled = k === E;
        dotsEl.querySelectorAll('.dot').forEach((d, i) => d.classList.toggle('on', i === k - 1));
        const text = k === 0 ? 'Книга предметов' : es[k - 1].title;
        if (captionEl.textContent !== text) {
            captionEl.classList.remove('swap');
            void captionEl.offsetWidth;
            captionEl.textContent = text;
            captionEl.classList.add('swap');
        }
    }

    function applyInstant() {
        bookEl.classList.add('no-anim');
        leaves.forEach((l, i) => {
            clearTimeout(timers.get(i));
            l.classList.remove('turning');
            setLeaf(i, i < k);
            l.style.zIndex = zFor(i, i < k);
        });
        paintUI();
        void bookEl.offsetWidth;
        requestAnimationFrame(() => bookEl.classList.remove('no-anim'));
    }

    function goTo(target, opts = {}) {
        target = Math.max(0, Math.min(E, target));
        if (target === k) return;
        const stagger = opts.fast ? 38 : (Math.abs(target - k) > 1 ? 110 : 0);
        if (target > k) {
            for (let i = k; i < target; i++) {
                const d = (i - k) * stagger;
                setTimeout(() => turn(i, true, opts.fast), UI.reduced() ? 0 : d);
            }
        } else {
            for (let i = k - 1; i >= target; i--) {
                const d = (k - 1 - i) * stagger;
                setTimeout(() => turn(i, false, opts.fast), UI.reduced() ? 0 : d);
            }
        }
        k = target;
        paintUI();
    }

    const next = () => goTo(k + 1);
    const prev = () => goTo(k - 1);

    function enter() {
        const m = mq.matches ? 'single' : 'spread';
        if (m !== mode || !leaves.length) build(m);
        leaveTimers.forEach(clearTimeout);
        leaveTimers = [];
        k = 0;
        applyInstant();
        stage.classList.remove('leaving', 'enter');
        void stage.offsetWidth;
        stage.classList.add('enter');
        clearTimeout(openTimer);
        openTimer = setTimeout(() => goTo(1), UI.reduced() ? 0 : 800);
    }

    function leave() {
        return new Promise(resolve => {
            clearTimeout(openTimer);
            const n = k;
            if (n > 0) goTo(0, { fast: true });
            const flipWait = UI.reduced() ? 0 : (n > 0 ? 560 + n * 38 : 0);
            leaveTimers.push(setTimeout(() => {
                stage.classList.add('leaving');
                leaveTimers.push(setTimeout(resolve, UI.reduced() ? 0 : 480));
            }, flipWait));
        });
    }

    mq.addEventListener('change', () => {
        if (root.classList.contains('hidden')) {
            mode = null;
            return;
        }
        const keep = k;
        build(mq.matches ? 'single' : 'spread');
        k = keep;
        applyInstant();
    });

    prevBtn.addEventListener('click', prev);
    nextBtn.addEventListener('click', next);

    document.addEventListener('keydown', (e) => {
        if (root.classList.contains('hidden') || document.querySelector('.modal-root')) return;
        if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); next(); }
        else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); prev(); }
        else if (e.key === 'Home') { e.preventDefault(); goTo(0); }
        else if (e.key === 'End') { e.preventDefault(); goTo(E); }
    });

    let sx = 0;
    let sy = 0;
    let tracking = false;
    stage.addEventListener('pointerdown', (e) => {
        if (e.target.closest('button')) return;
        tracking = true;
        sx = e.clientX;
        sy = e.clientY;
    });
    stage.addEventListener('pointercancel', () => { tracking = false; });
    stage.addEventListener('pointerup', (e) => {
        if (!tracking) return;
        tracking = false;
        const dx = e.clientX - sx;
        const dy = e.clientY - sy;
        if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) {
            if (dx < 0) next(); else prev();
            return;
        }
        if (Math.hypot(dx, dy) > 10) return;
        const r = bookEl.getBoundingClientRect();
        if (mode === 'spread' && k > 0) {
            if (e.clientX < r.left + r.width / 2) prev(); else next();
        } else if (mode === 'single' && k > 0 && e.clientX < r.left + r.width * 0.28) {
            prev();
        } else {
            next();
        }
    });

    return { enter, leave, goTo };
})();

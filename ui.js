const UI = (() => {
    const reduced = () => document.body.classList.contains('force-reduced-motion') || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const wait = (ms) => new Promise(r => setTimeout(r, reduced() ? 0 : ms));
    const SUBMENUS = [settingsMenu, statsMenu, achMenu, recordsMenu, musicMenu, aboutMenu];
    let busy = false;
    let modalEl = null;

    function stagger(el) {
        Array.from(el.children).forEach((k, i) => k.style.setProperty('--i', i));
    }

    function enter(el, rev) {
        stagger(el);
        el.classList.remove('hidden', 'screen-out', 'rev');
        el.classList.toggle('rev', !!rev);
        void el.offsetWidth;
        el.classList.add('screen-in');
        setTimeout(() => el.classList.remove('screen-in', 'rev'), 1100);
    }

    function pop(el) {
        enter(el, false);
    }

    async function go(from, to, rev) {
        if (busy) return;
        busy = true;
        if (from && !from.classList.contains('hidden')) {
            from.classList.toggle('rev', !!rev);
            from.classList.add('screen-out');
            await wait(240);
            from.classList.add('hidden');
            from.classList.remove('screen-out', 'rev');
        }
        enter(to, rev);
        await wait(160);
        busy = false;
    }

    function ask({ icon, title, text, actions }) {
        return new Promise(resolve => {
            if (modalEl) modalEl.remove();
            if (typeof gameState !== 'undefined' && gameState === 'playing') enterPause();
            const root = document.createElement('div');
            root.className = 'modal-root';
            const card = document.createElement('div');
            card.className = 'modal';
            card.setAttribute('role', 'dialog');
            card.setAttribute('aria-modal', 'true');
            const ic = document.createElement('div');
            ic.className = 'modal-icon';
            ic.textContent = icon || '';
            const h = document.createElement('h3');
            h.textContent = title;
            const p = document.createElement('p');
            p.textContent = text;
            const box = document.createElement('div');
            box.className = 'modal-actions';
            card.append(ic, h, p, box);
            let done = false;
            const onKey = (e) => {
                if (e.key === 'Escape') {
                    e.preventDefault();
                    e.stopPropagation();
                    close(null);
                }
            };
            const close = (value) => {
                if (done) return;
                done = true;
                document.removeEventListener('keydown', onKey, true);
                root.classList.add('closing');
                setTimeout(() => {
                    root.remove();
                    if (modalEl === root) modalEl = null;
                    resolve(value);
                }, reduced() ? 0 : 220);
            };
            actions.forEach(a => {
                const b = document.createElement('button');
                b.textContent = a.label;
                b.className = a.kind || '';
                b.addEventListener('click', () => close(a.value === undefined ? null : a.value));
                box.appendChild(b);
            });
            document.addEventListener('keydown', onKey, true);
            root.addEventListener('pointerdown', (e) => { if (e.target === root) close(null); });
            root.appendChild(card);
            document.body.appendChild(root);
            modalEl = root;
            const first = box.querySelector('.primary') || box.firstElementChild;
            if (first) first.focus();
        });
    }

    function musicWarning() {
        return ask({
            icon: '🎧',
            title: 'Про авторские права',
            text: 'Если ты стримишь или записываешь видео — выключи музыку: платформа может заглушить ролик или выдать страйк за чужие треки.\n\nСвои файлы ты добавляешь на свою ответственность.',
            actions: [
                { label: 'Понятно, включить', kind: 'primary', value: 'ok' },
                { label: 'Не включать', value: 'off' }
            ]
        });
    }

    function confirmReset() {
        return ask({
            icon: '🗑',
            title: 'Сбросить прогресс?',
            text: 'Рекорды, статистика и достижения будут удалены. Это нельзя отменить.',
            actions: [
                { label: 'Отмена' },
                { label: 'Сбросить', kind: 'danger', value: 'yes' }
            ]
        }).then(v => v === 'yes');
    }

    [
        [settingsBtn, settingsMenu, null],
        [statsBtn, statsMenu, () => renderStats()],
        [achBtn, achMenu, () => renderAch()],
        [recordsBtn, recordsMenu, () => renderRecords()],
        [musicMenuBtn, musicMenu, () => { if (typeof Music !== 'undefined') Music.refresh(); }]
    ].forEach(([btn, target, pre]) => {
        if (!btn) return;
        btn.addEventListener('click', () => {
            if (pre) pre();
            go(menu, target, false);
        });
    });

    [
        [backFromSettings, settingsMenu],
        [backFromStats, statsMenu],
        [backFromAch, achMenu],
        [backFromRecords, recordsMenu],
        [backFromMusic, musicMenu]
    ].forEach(([btn, from]) => {
        if (btn) btn.addEventListener('click', () => go(from, menu, true));
    });

    aboutBtn?.addEventListener('click', async () => {
        await go(menu, aboutMenu, false);
        Book.enter();
    });

    document.getElementById('closeBook')?.addEventListener('click', async () => {
        if (busy) return;
        await Book.leave();
        go(aboutMenu, menu, true);
    });

    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape' || gameState !== 'menu' || modalEl) return;
        if (!aboutMenu.classList.contains('hidden')) {
            document.getElementById('closeBook').click();
            return;
        }
        const open = SUBMENUS.find(m => !m.classList.contains('hidden'));
        if (open) go(open, menu, true);
    });

    if (new URLSearchParams(location.search).get('open') === 'music') {
        setTimeout(() => musicMenuBtn?.click(), 700);
    }

    return { reduced, wait, go, enter, pop, ask, musicWarning, confirmReset };
})();

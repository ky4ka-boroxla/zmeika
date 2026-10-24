const KEYMAP = {
    ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
    KeyW: [0, -1], KeyS: [0, 1], KeyA: [-1, 0], KeyD: [1, 0]
};

function startAllowed() {
    if (gameState === 'gameover' || gameState === 'win') return !gameOverMenu.classList.contains('hidden') || performance.now() - endedAt >= 450;
    if (gameState === 'menu') return !menu.classList.contains('hidden');
    return false;
}

document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const code = e.code;
    if (code === 'Space' || code === 'Enter' || code === 'NumpadEnter') {
        if (gameState === 'playing' || gameState === 'paused') {
            e.preventDefault();
            if (!e.repeat) togglePause();
        } else if (startAllowed()) {
            const tag = e.target && e.target.tagName;
            if (gameState === 'menu' && (tag === 'BUTTON' || tag === 'INPUT' || tag === 'A')) return;
            e.preventDefault();
            if (!e.repeat) requestStart();
        }
        return;
    }
    if (code === 'Escape') {
        if (gameState === 'playing' || gameState === 'paused') {
            e.preventDefault();
            togglePause();
        }
        return;
    }
    if (gameState !== 'playing' && gameState !== 'ready') return;
    const dir = KEYMAP[code];
    if (dir) {
        e.preventDefault();
        setDirection(dir[0], dir[1]);
    }
});

document.addEventListener('keyup', (e) => {
    if ((e.code === 'Space' || e.code === 'Enter') && gameState !== 'menu') e.preventDefault();
});

document.querySelectorAll('.touch-btn').forEach(btn => {
    btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        const dir = btn.dataset.dir;
        if (dir === 'up') setDirection(0, -1);
        else if (dir === 'down') setDirection(0, 1);
        else if (dir === 'left') setDirection(-1, 0);
        else if (dir === 'right') setDirection(1, 0);
        if (navigator.vibrate) navigator.vibrate(6);
    }, { passive: false });
    btn.addEventListener('contextmenu', e => e.preventDefault());
});

const SWIPE_MIN = 18;
let swipeId = null;
let swipeX = 0;
let swipeY = 0;

canvas.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse') return;
    swipeId = e.pointerId;
    swipeX = e.clientX;
    swipeY = e.clientY;
    try { canvas.setPointerCapture(e.pointerId); } catch {}
});

canvas.addEventListener('pointermove', (e) => {
    if (e.pointerId !== swipeId) return;
    const dx = e.clientX - swipeX;
    const dy = e.clientY - swipeY;
    if (Math.abs(dx) < SWIPE_MIN && Math.abs(dy) < SWIPE_MIN) return;
    if (Math.abs(dx) > Math.abs(dy)) setDirection(dx > 0 ? 1 : -1, 0);
    else setDirection(0, dy > 0 ? 1 : -1);
    swipeX = e.clientX;
    swipeY = e.clientY;
    if (navigator.vibrate) navigator.vibrate(6);
});

const endSwipe = (e) => { if (e.pointerId === swipeId) swipeId = null; };
canvas.addEventListener('pointerup', endSwipe);
canvas.addEventListener('pointercancel', endSwipe);
canvas.addEventListener('contextmenu', e => e.preventDefault());

const gamepadState = { lastPause: false };
let padRAF = null;

function pollGamepad() {
    padRAF = requestAnimationFrame(pollGamepad);
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = pads && pads[0];
    if (!gp) return;

    const ax = gp.axes[0] || 0;
    const ay = gp.axes[1] || 0;
    let dir = null;
    if (Math.abs(ax) > 0.5 || Math.abs(ay) > 0.5) {
        if (Math.abs(ax) > Math.abs(ay)) dir = [ax > 0 ? 1 : -1, 0];
        else dir = [0, ay > 0 ? 1 : -1];
    }
    if (gp.buttons[12]?.pressed) dir = [0, -1];
    if (gp.buttons[13]?.pressed) dir = [0, 1];
    if (gp.buttons[14]?.pressed) dir = [-1, 0];
    if (gp.buttons[15]?.pressed) dir = [1, 0];

    if (dir && (gameState === 'playing' || gameState === 'ready')) setDirection(dir[0], dir[1]);

    const pressed = !!gp.buttons[9]?.pressed;
    if (pressed && !gamepadState.lastPause) {
        if (gameState === 'playing' || gameState === 'paused') togglePause();
        else if (startAllowed()) requestStart();
    }
    gamepadState.lastPause = pressed;
}

window.addEventListener('gamepadconnected', () => { if (!padRAF) pollGamepad(); });
window.addEventListener('gamepaddisconnected', () => {
    const any = Array.from(navigator.getGamepads ? navigator.getGamepads() : []).some(Boolean);
    if (!any && padRAF) {
        cancelAnimationFrame(padRAF);
        padRAF = null;
    }
});
if (navigator.getGamepads && Array.from(navigator.getGamepads()).some(Boolean)) pollGamepad();


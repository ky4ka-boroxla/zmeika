document.querySelectorAll('.touch-btn').forEach(btn => {
    const handler = (e) => {
        e.preventDefault();
        if (gameState !== 'playing') return;
        const dir = btn.dataset.dir;
        if (dir === 'up') setDirection(0, -1);
        else if (dir === 'down') setDirection(0, 1);
        else if (dir === 'left') setDirection(-1, 0);
        else if (dir === 'right') setDirection(1, 0);
    };
    btn.addEventListener('pointerdown', handler, { passive: false });
    btn.addEventListener('contextmenu', e => e.preventDefault());
});

let swX = 0, swY = 0, swActive = false;
const threshold = 24;

canvas.addEventListener('pointerdown', (e) => {
    swActive = true;
    swX = e.clientX;
    swY = e.clientY;
}, { passive: true });

canvas.addEventListener('pointerup', (e) => {
    if (!swActive) return;
    swActive = false;
    if (gameState !== 'playing') return;
    const dx = e.clientX - swX;
    const dy = e.clientY - swY;
    if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return;
    if (Math.abs(dx) > Math.abs(dy)) setDirection(dx > 0 ? 1 : -1, 0);
    else setDirection(0, dy > 0 ? 1 : -1);
    if (navigator.vibrate) navigator.vibrate(8);
}, { passive: true });

canvas.addEventListener('touchmove', e => e.preventDefault(), { passive: false });
canvas.addEventListener('contextmenu', e => e.preventDefault());
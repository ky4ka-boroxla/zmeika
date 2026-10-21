const KEYMAP = {
    ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
    w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0],
    ц: [0, -1], ы: [0, 1], ф: [-1, 0], в: [1, 0]
};

document.addEventListener('keydown', (e) => {
    const key = e.key;
    if (key === ' ' || key === 'Spacebar' || key === 'Enter') {
        e.preventDefault();
        if (gameState === 'menu' || gameState === 'gameover' || gameState === 'win') startGame();
        else if (gameState === 'playing' || gameState === 'paused') togglePause();
        return;
    }
    if (key === 'Escape') {
        e.preventDefault();
        if (gameState === 'playing' || gameState === 'paused') togglePause();
        return;
    }
    if (gameState !== 'playing') return;
    const map = KEYMAP;
    if (map[key]) { e.preventDefault(); setDirection(map[key][0], map[key][1]); }
});

const gamepadState = { lastDir: null, lastPause: false };

function pollGamepad() {
    requestAnimationFrame(pollGamepad);
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = pads && pads[0];
    if (!gp) return;

    const ax = gp.axes[0], ay = gp.axes[1];
    let dir = null;
    if (Math.abs(ax) > 0.5 || Math.abs(ay) > 0.5) {
        if (Math.abs(ax) > Math.abs(ay)) dir = [ax > 0 ? 1 : -1, 0];
        else dir = [0, ay > 0 ? 1 : -1];
    }
    const btn = [gp.buttons[12]?.pressed, gp.buttons[13]?.pressed, gp.buttons[14]?.pressed, gp.buttons[15]?.pressed];
    if (btn[0]) dir = [0, -1];
    if (btn[1]) dir = [0, 1];
    if (btn[2]) dir = [-1, 0];
    if (btn[3]) dir = [1, 0];

    if (dir && gameState === 'playing') setDirection(dir[0], dir[1]);

    const pausePressed = gp.buttons[9]?.pressed;
    if (pausePressed && !gamepadState.lastPause) {
        if (gameState === 'playing' || gameState === 'paused') togglePause();
        else if (gameState === 'menu' || gameState === 'gameover') startGame();
    }
    gamepadState.lastPause = pausePressed;
}
pollGamepad();
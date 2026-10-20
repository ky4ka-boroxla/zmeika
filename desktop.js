document.addEventListener('keydown', (e) => {
    const key = e.key;

    if (key === ' ' || key === 'Spacebar' || key === 'Enter') {
        e.preventDefault();
        if (gameState === 'menu' || gameState === 'gameover' || gameState === 'win') {
            startGame();
        } else if (gameState === 'playing' || gameState === 'paused') {
            togglePause();
        }
        return;
    }

    if (key === 'Escape') {
        e.preventDefault();
        if (gameState === 'playing' || gameState === 'paused') togglePause();
        return;
    }

    if (gameState !== 'playing') return;

    const map = {
        ArrowUp: [0, -1],
        ArrowDown: [0, 1],
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
        w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0],
        ц: [0, -1], ы: [0, 1], ф: [-1, 0], в: [1, 0]
    };

    if (map[key]) {
        e.preventDefault();
        setDirection(map[key][0], map[key][1]);
    }
});
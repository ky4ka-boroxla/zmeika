document.addEventListener('keydown', (e) => {
    const key = e.key;
    if (key === ' ' && gameStarted) {
        startGame();
        return;
    }
    if (!gameStarted || gameOver) return;
    const newDir = {...nextDirection};
    if (key === 'ArrowUp' && direction.y !== 1) { newDir.x = 0; newDir.y = -1; }
    else if (key === 'ArrowDown' && direction.y !== -1) { newDir.x = 0; newDir.y = 1; }
    else if (key === 'ArrowLeft' && direction.x !== 1) { newDir.x = -1; newDir.y = 0; }
    else if (key === 'ArrowRight' && direction.x !== -1) { newDir.x = 1; newDir.y = 0; }
    else return;
    nextDirection = newDir;
});

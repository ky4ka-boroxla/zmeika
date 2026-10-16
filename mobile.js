document.querySelectorAll('.touch-btn').forEach(btn => {
    btn.addEventListener('click', function(e) {
        e.preventDefault();
        if (!gameStarted || gameOver) return;
        const dir = this.dataset.dir;
        if (dir === 'up' && direction.y !== 1) { nextDirection = {x: 0, y: -1}; }
        else if (dir === 'down' && direction.y !== -1) { nextDirection = {x: 0, y: 1}; }
        else if (dir === 'left' && direction.x !== 1) { nextDirection = {x: -1, y: 0}; }
        else if (dir === 'right' && direction.x !== -1) { nextDirection = {x: 1, y: 0}; }
    });
});

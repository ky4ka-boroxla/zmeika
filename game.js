const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
const scoreDisplay = document.getElementById('score');
const menu = document.getElementById('menu');
const gameOverMenu = document.getElementById('gameOverMenu');
const pauseMenu = document.getElementById('pauseMenu');
const gameOverTitle = document.getElementById('gameOverTitle');
const startBtn = document.getElementById('startBtn');
const retryBtn = document.getElementById('retryBtn');
const finalScore = document.getElementById('finalScore');
const bestScoreEl = document.getElementById('bestScore');
const pauseBtn = document.getElementById('pauseBtn');
const soundBtn = document.getElementById('soundBtn');
const resumeBtn = document.getElementById('resumeBtn');
const restartBtn = document.getElementById('restartBtn');
const toMenuBtn = document.getElementById('toMenuBtn');
const pauseScoreEl = document.getElementById('pauseScore');

const CONFIG = {
    gridSize: 20,
    speeds: { easy: 200, medium: 130, hard: 80, insane: 40 },
    minSpeed: 45,
    speedStep: 4,
    speedEvery: 50,
    pointsPerFood: 10,
    wrap: false
};

const tileCount = canvas.width / CONFIG.gridSize;

let snake = [];
let direction = { x: 1, y: 0 };
let nextDirection = { x: 1, y: 0 };
let directionChanged = false;
let food = { x: 0, y: 0 };
let score = 0;
let gameLoop = null;
let baseSpeed = CONFIG.speeds.easy;
let currentSpeed = baseSpeed;
let gameState = 'menu';
let soundEnabled = true;

const bestKey = (speed) => 'snake_best_' + speed;

function loadBest() {
    const val = parseInt(localStorage.getItem(bestKey(baseSpeed)) || '0', 10);
    bestScoreEl.textContent = 'Рекорд: ' + val;
    return val;
}

function saveBest() {
    const key = bestKey(baseSpeed);
    const prev = parseInt(localStorage.getItem(key) || '0', 10);
    if (score > prev) localStorage.setItem(key, String(score));
}

function beep(freq, dur, type) {
    if (!soundEnabled) return;
    try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        if (!beep.ctx) beep.ctx = new AC();
        const c = beep.ctx;
        const o = c.createOscillator();
        const g = c.createGain();
        o.type = type || 'square';
        o.frequency.value = freq;
        g.gain.value = 0.05;
        o.connect(g);
        g.connect(c.destination);
        o.start();
        o.stop(c.currentTime + dur);
    } catch (e) {}
}

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
    food = pool[Math.floor(Math.random() * pool.length)];
    return true;
}

function finishGame(title) {
    if (gameLoop) {
        clearInterval(gameLoop);
        gameLoop = null;
    }
    saveBest();
    const best = loadBest();
    finalScore.textContent = 'Очки: ' + score + '   |   Рекорд: ' + best;
    if (gameOverTitle) gameOverTitle.textContent = title;
    gameOverMenu.classList.remove('hidden');
    pauseBtn.classList.add('hidden');
}

function drawSegment(x, y, color, r) {
    const gs = CONFIG.gridSize;
    ctx.fillStyle = color;
    ctx.beginPath();
    if (ctx.roundRect) {
        ctx.roundRect(x * gs + 1, y * gs + 1, gs - 2, gs - 2, r || 4);
    } else {
        ctx.rect(x * gs + 1, y * gs + 1, gs - 2, gs - 2);
    }
    ctx.fill();
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const gs = CONFIG.gridSize;

    ctx.strokeStyle = 'rgba(255,165,2,0.05)';
    ctx.lineWidth = 1;
    for (let i = 1; i < tileCount; i++) {
        ctx.beginPath();
        ctx.moveTo(i * gs, 0);
        ctx.lineTo(i * gs, canvas.height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i * gs);
        ctx.lineTo(canvas.width, i * gs);
        ctx.stroke();
    }

    for (let i = snake.length - 1; i >= 1; i--) {
        const s = snake[i];
        drawSegment(s.x, s.y, '#00c647', 5);
    }

    const head = snake[0];
    drawSegment(head.x, head.y, '#ffa502', 6);

    const cx = head.x * gs + gs / 2;
    const cy = head.y * gs + gs / 2;
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

    const fx = food.x * gs + gs / 2;
    const fy = food.y * gs + gs / 2;
    const pulse = 1 + Math.sin(Date.now() / 200) * 0.1;
    ctx.fillStyle = '#ff4757';
    ctx.beginPath();
    ctx.arc(fx, fy, (gs / 2 - 2) * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath();
    ctx.arc(fx - 3, fy - 3, 2, 0, Math.PI * 2);
    ctx.fill();
}

function update() {
    if (gameState !== 'playing') return;
    direction = nextDirection;
    directionChanged = false;

    const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };

    if (CONFIG.wrap) {
        head.x = (head.x + tileCount) % tileCount;
        head.y = (head.y + tileCount) % tileCount;
    } else if (head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount) {
        gameState = 'gameover';
        statusEl.textContent = 'ИГРА ОКОНЧЕНА';
        beep(120, 0.3, 'sawtooth');
        finishGame('ИГРА ОКОНЧЕНА');
        return;
    }

    for (let i = 0; i < snake.length - 1; i++) {
        if (snake[i].x === head.x && snake[i].y === head.y) {
            gameState = 'gameover';
            statusEl.textContent = 'ИГРА ОКОНЧЕНА';
            beep(120, 0.3, 'sawtooth');
            finishGame('ИГРА ОКОНЧЕНА');
            return;
        }
    }

    snake.unshift(head);

    if (head.x === food.x && head.y === food.y) {
        score += CONFIG.pointsPerFood;
        scoreDisplay.textContent = 'Очки: ' + score;
        beep(880, 0.08, 'square');
        if (score % CONFIG.speedEvery === 0 && currentSpeed > CONFIG.minSpeed) {
            currentSpeed = Math.max(CONFIG.minSpeed, currentSpeed - CONFIG.speedStep);
            restartLoop();
        }
        if (!generateFood()) return;
    } else {
        snake.pop();
    }
}

function restartLoop() {
    if (gameLoop) clearInterval(gameLoop);
    gameLoop = setInterval(gameStep, currentSpeed);
}

function gameStep() {
    update();
    draw();
}

function startGame() {
    if (gameLoop) {
        clearInterval(gameLoop);
        gameLoop = null;
    }
    menu.classList.remove('entering');
    snake = [{ x: 10, y: 10 }];
    direction = { x: 1, y: 0 };
    nextDirection = { x: 1, y: 0 };
    directionChanged = false;
    score = 0;
    currentSpeed = baseSpeed;
    gameState = 'playing';
    scoreDisplay.textContent = 'Очки: 0';
    statusEl.textContent = '';
    menu.classList.add('hidden');
    gameOverMenu.classList.add('hidden');
    pauseMenu.classList.add('hidden');
    pauseMenu.classList.remove('entering');
    pauseMenu.classList.remove('leaving');
    pauseBtn.classList.remove('hidden');
    pauseBtn.textContent = '⏸';
    document.body.classList.remove('paused');
    document.body.classList.remove('leaving-to-main');
    canvas.classList.remove('blurred');
    loadBest();
    generateFood();
    restartLoop();
    draw();
}

function enterPause() {
    gameState = 'paused';
    if (gameLoop) {
        clearInterval(gameLoop);
        gameLoop = null;
    }
    if (pauseScoreEl) pauseScoreEl.textContent = score;
    pauseBtn.textContent = '▶';
    document.body.classList.add('paused');
    canvas.classList.add('blurred');
    pauseMenu.classList.remove('hidden');
    pauseMenu.classList.remove('leaving');
    pauseMenu.classList.add('entering');
    setTimeout(() => pauseMenu.classList.remove('entering'), 600);
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
    restartLoop();
}

function togglePause() {
    if (gameState === 'playing') {
        enterPause();
    } else if (gameState === 'paused') {
        resumeGame();
    }
}

function showMenu(animated) {
    gameState = 'menu';
    if (gameLoop) {
        clearInterval(gameLoop);
        gameLoop = null;
    }

    if (animated) {
        document.body.classList.add('leaving-to-main');
        pauseMenu.classList.remove('entering');
        pauseMenu.classList.add('leaving');
        canvas.classList.add('blurred');

        setTimeout(() => {
            pauseMenu.classList.add('hidden');
            pauseMenu.classList.remove('leaving');
            canvas.classList.remove('blurred');
            document.body.classList.remove('paused');
            document.body.classList.remove('leaving-to-main');

            menu.classList.remove('hidden');
            menu.classList.remove('entering');
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
        document.body.classList.remove('paused');
        document.body.classList.remove('leaving-to-main');
        pauseMenu.classList.add('hidden');
        pauseMenu.classList.remove('leaving');
        pauseMenu.classList.remove('entering');
        canvas.classList.remove('blurred');
        menu.classList.remove('hidden');
        menu.classList.remove('entering');
        gameOverMenu.classList.add('hidden');
        pauseBtn.classList.add('hidden');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        statusEl.textContent = '';
        scoreDisplay.textContent = 'Очки: 0';
        loadBest();
    }
}

document.querySelectorAll('.menu .difficulty button').forEach(btn => {
    btn.addEventListener('click', function () {
        document.querySelectorAll('.menu .difficulty button').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        baseSpeed = parseInt(this.dataset.speed, 10);
        if (gameState === 'menu') loadBest();
    });
});

startBtn.addEventListener('click', startGame);
retryBtn.addEventListener('click', startGame);
if (resumeBtn) resumeBtn.addEventListener('click', resumeGame);
if (restartBtn) restartBtn.addEventListener('click', () => {
    pauseMenu.classList.add('hidden');
    pauseMenu.classList.remove('leaving');
    pauseMenu.classList.remove('entering');
    canvas.classList.remove('blurred');
    document.body.classList.remove('paused');
    document.body.classList.remove('leaving-to-main');
    startGame();
});
if (toMenuBtn) toMenuBtn.addEventListener('click', () => {
    showMenu(true);
});
if (pauseBtn) pauseBtn.addEventListener('click', togglePause);
if (soundBtn) {
    soundBtn.addEventListener('click', () => {
        soundEnabled = !soundEnabled;
        soundBtn.textContent = soundEnabled ? '🔊' : '🔇';
    });
}

showMenu(false);
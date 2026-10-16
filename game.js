const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const status = document.getElementById('status');
const scoreDisplay = document.getElementById('score');
const menu = document.getElementById('menu');
const gameOverMenu = document.getElementById('gameOverMenu');
const startBtn = document.getElementById('startBtn');
const retryBtn = document.getElementById('retryBtn');
const finalScore = document.getElementById('finalScore');
const gridSize = 20;
const tileCount = canvas.width / gridSize;
let snake = [{x: 10, y: 10}];
let direction = {x: 1, y: 0};
let nextDirection = {x: 1, y: 0};
let food = {x: 15, y: 10};
let score = 0;
let gameOver = false;
let gameLoop;
let currentSpeed = 200;
let gameStarted = false;

function generateFood() {
    const totalCells = tileCount * tileCount;
    if (snake.length >= totalCells) {
        gameOver = true;
        status.textContent = 'ПОБЕДА!';
        showGameOver();
        return false;
    }
    const snakeSet = new Set(snake.map(s => `${s.x},${s.y}`));
    const freeCells = [];
    for (let i = 0; i < tileCount; i++) {
        for (let j = 0; j < tileCount; j++) {
            if (!snakeSet.has(`${i},${j}`)) {
                freeCells.push({x: i, y: j});
            }
        }
    }
    if (freeCells.length === 0) {
        gameOver = true;
        status.textContent = 'ПОБЕДА!';
        showGameOver();
        return false;
    }
    const randomIndex = Math.floor(Math.random() * freeCells.length);
    food = freeCells[randomIndex];
    return true;
}

function showGameOver() {
    finalScore.textContent = 'Очки: ' + score;
    gameOverMenu.classList.remove('hidden');
    if (gameLoop) clearInterval(gameLoop);
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#00c647';
    for (let i = 0; i < snake.length; i++) {
        const s = snake[i];
        ctx.fillRect(s.x * gridSize, s.y * gridSize, gridSize - 2, gridSize - 2);
    }
    const head = snake[0];
    ctx.fillStyle = '#ffa502';
    ctx.fillRect(head.x * gridSize, head.y * gridSize, gridSize - 2, gridSize - 2);
    ctx.fillStyle = '#ff4757';
    ctx.fillRect(food.x * gridSize, food.y * gridSize, gridSize - 2, gridSize - 2);
}

function update() {
    if (gameOver || !gameStarted) return;
    direction = nextDirection;
    const head = {...snake[0]};
    head.x += direction.x;
    head.y += direction.y;
    if (head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount) {
        gameOver = true;
        status.textContent = 'ИГРА ОКОНЧЕНА';
        showGameOver();
        return;
    }
    for (let i = 0; i < snake.length; i++) {
        if (snake[i].x === head.x && snake[i].y === head.y) {
            gameOver = true;
            status.textContent = 'ИГРА ОКОНЧЕНА';
            showGameOver();
            return;
        }
    }
    snake.unshift(head);
    if (head.x === food.x && head.y === food.y) {
        score += 10;
        scoreDisplay.textContent = 'Очки: ' + score;
        const success = generateFood();
        if (!success) {
            clearInterval(gameLoop);
        }
    } else {
        snake.pop();
    }
}

function gameStep() {
    update();
    draw();
}

function startGame() {
    if (gameLoop) clearInterval(gameLoop);
    snake = [{x: 10, y: 10}];
    direction = {x: 1, y: 0};
    nextDirection = {x: 1, y: 0};
    gameOver = false;
    score = 0;
    scoreDisplay.textContent = 'Очки: 0';
    status.textContent = '';
    gameStarted = true;
    menu.classList.add('hidden');
    gameOverMenu.classList.add('hidden');
    generateFood();
    gameLoop = setInterval(gameStep, currentSpeed);
    draw();
}

function showMenu() {
    gameStarted = false;
    if (gameLoop) clearInterval(gameLoop);
    menu.classList.remove('hidden');
    gameOverMenu.classList.add('hidden');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    status.textContent = '';
    scoreDisplay.textContent = 'Очки: 0';
}

document.querySelectorAll('.menu .difficulty button').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.menu .difficulty button').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        currentSpeed = parseInt(this.dataset.speed);
    });
});

startBtn.addEventListener('click', startGame);
retryBtn.addEventListener('click', startGame);
showMenu();

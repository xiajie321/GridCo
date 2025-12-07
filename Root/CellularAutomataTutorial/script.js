// 元胞自动机 (Cellular Automata) 演示脚本 - 康威生命游戏

const config = {
    cellSize: 8, // 细胞大小 (像素)
    speed: 30, // 初始 FPS
    density: 0.2, // 随机密度
    color: { r: 76, g: 175, b: 80 } // 绿色 #4CAF50
};

const canvas = document.getElementById('ca-canvas');
const ctx = canvas.getContext('2d');
let width, height;
let cols, rows;
let grid = []; // 使用一维数组存储: 0=死, 1=活
let nextGrid = [];
let isPlaying = true;
let animationId;
let lastTime = 0;
let frameInterval = 1000 / config.speed;

// 初始化
function init() {
    resizeCanvas();
    randomize();
    animate();
}

function resizeCanvas() {
    if (!canvas) return;
    const container = canvas.parentElement;
    canvas.width = container.clientWidth;
    canvas.height = 400;
    
    width = canvas.width;
    height = canvas.height;
    
    cols = Math.ceil(width / config.cellSize);
    rows = Math.ceil(height / config.cellSize);
    
    // 重置数组
    grid = new Uint8Array(cols * rows);
    nextGrid = new Uint8Array(cols * rows);
}

function randomize() {
    for (let i = 0; i < grid.length; i++) {
        grid[i] = Math.random() < config.density ? 1 : 0;
    }
}

function clearGrid() {
    grid.fill(0);
}

// 核心逻辑：计算下一代
function computeNextGen() {
    // 遍历所有细胞
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            const index = y * cols + x;
            const state = grid[index];
            const neighbors = countNeighbors(x, y);
            
            // 康威生命游戏规则：
            // 1. 如果活细胞周围有 2 或 3 个活邻居，存活。
            // 2. 如果死细胞周围有 3 个活邻居，重生。
            // 3. 其他情况死亡。
            
            if (state === 1 && (neighbors < 2 || neighbors > 3)) {
                nextGrid[index] = 0; // 孤独或拥挤而死
            } else if (state === 0 && neighbors === 3) {
                nextGrid[index] = 1; // 繁殖
            } else {
                nextGrid[index] = state; // 保持现状
            }
        }
    }
    
    // 交换数组
    let temp = grid;
    grid = nextGrid;
    nextGrid = temp;
}

function countNeighbors(x, y) {
    let sum = 0;
    for (let i = -1; i < 2; i++) {
        for (let j = -1; j < 2; j++) {
            if (i === 0 && j === 0) continue; // 跳过自己
            
            // 环绕边界 (Toroidal Array)
            const col = (x + i + cols) % cols;
            const row = (y + j + rows) % rows;
            
            sum += grid[row * cols + col];
        }
    }
    return sum;
}

function draw() {
    // 使用 clearRect 清空
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);
    
    ctx.fillStyle = `rgb(${config.color.r}, ${config.color.g}, ${config.color.b})`;
    
    // 优化绘制：只绘制活细胞
    // 如果格子太小，可以用 putImageData 优化，但 cellSize=8 时 fillRect 足够快且清晰
    ctx.beginPath();
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            if (grid[y * cols + x] === 1) {
                ctx.rect(x * config.cellSize, y * config.cellSize, config.cellSize - 1, config.cellSize - 1);
            }
        }
    }
    ctx.fill();
}

function animate(timestamp) {
    if (!isPlaying) {
        draw(); // 暂停时也要绘制，以便看到鼠标绘制的结果
        animationId = requestAnimationFrame(animate);
        return;
    }

    const elapsed = timestamp - lastTime;
    
    if (elapsed > frameInterval) {
        lastTime = timestamp - (elapsed % frameInterval);
        computeNextGen();
        draw();
    }
    
    animationId = requestAnimationFrame(animate);
}

// 预设图案
const patterns = {
    gliderGun: [
        [1, 5], [1, 6], [2, 5], [2, 6],
        [11, 5], [11, 6], [11, 7],
        [12, 4], [12, 8],
        [13, 3], [13, 9],
        [14, 3], [14, 9],
        [15, 6],
        [16, 4], [16, 8],
        [17, 5], [17, 6], [17, 7],
        [18, 6],
        [21, 3], [21, 4], [21, 5],
        [22, 3], [22, 4], [22, 5],
        [23, 2], [23, 6],
        [25, 1], [25, 2], [25, 6], [25, 7],
        [35, 3], [35, 4],
        [36, 3], [36, 4]
    ]
};

function placePattern(name) {
    clearGrid();
    const pattern = patterns[name];
    const offsetX = 10;
    const offsetY = 10;
    
    for (let [x, y] of pattern) {
        const gx = x + offsetX;
        const gy = y + offsetY;
        if (gx < cols && gy < rows) {
            grid[gy * cols + gx] = 1;
        }
    }
    draw();
}

// 交互
let isDrawing = false;
let drawState = 1;

function getGridPos(e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    return {
        x: Math.floor(x / config.cellSize),
        y: Math.floor(y / config.cellSize)
    };
}

canvas.addEventListener('mousedown', (e) => {
    isDrawing = true;
    const pos = getGridPos(e);
    if (pos.x >= 0 && pos.x < cols && pos.y >= 0 && pos.y < rows) {
        // 反转当前状态作为绘制状态
        const index = pos.y * cols + pos.x;
        drawState = grid[index] === 1 ? 0 : 1;
        grid[index] = drawState;
        draw();
    }
});

canvas.addEventListener('mousemove', (e) => {
    if (!isDrawing) return;
    const pos = getGridPos(e);
    if (pos.x >= 0 && pos.x < cols && pos.y >= 0 && pos.y < rows) {
        grid[pos.y * cols + pos.x] = drawState;
        draw(); // 实时反馈
    }
});

canvas.addEventListener('mouseup', () => isDrawing = false);
canvas.addEventListener('mouseleave', () => isDrawing = false);

// UI 绑定
function setupUI() {
    const btnPlay = document.getElementById('btn-play');
    
    btnPlay.addEventListener('click', () => {
        isPlaying = !isPlaying;
        btnPlay.textContent = isPlaying ? "暂停" : "播放";
    });

    document.getElementById('btn-clear').addEventListener('click', clearGrid);
    document.getElementById('btn-random').addEventListener('click', randomize);
    document.getElementById('btn-gun').addEventListener('click', () => placePattern('gliderGun'));

    const speedRange = document.getElementById('range-speed');
    speedRange.addEventListener('input', (e) => {
        config.speed = parseInt(e.target.value);
        frameInterval = 1000 / config.speed;
        document.getElementById('val-speed').textContent = config.speed;
    });
}

window.addEventListener('resize', resizeCanvas);
window.addEventListener('load', () => {
    init();
    setupUI();
});

/**
 * 对象池 (Object Pooling) 互动演示
 * 对比无池 vs 有池的内存和 GC 表现
 */

const gameCanvas = document.getElementById('game-canvas');
const gameCtx = gameCanvas.getContext('2d');
const memCanvas = document.getElementById('memory-canvas');
const memCtx = memCanvas.getContext('2d');
const gameStats = document.getElementById('game-stats');
const memStats = document.getElementById('memory-stats');
const modeDesc = document.getElementById('mode-desc');

const btnNoPool = document.getElementById('btn-no-pool');
const btnPool = document.getElementById('btn-pool');
const btnFire = document.getElementById('btn-fire');

// 状态
let usePool = false;
let bullets = []; // 活动子弹
let pool = []; // 对象池 (inactive bullets)
let garbage = []; // 垃圾内存 (destroyed bullets)
let memoryBlocks = []; // 内存块可视化数据

let lastTime = 0;
let bulletIdCounter = 0;
let gcTimer = 0;
let isGCing = false;

// 配置
const MEMORY_SIZE = 100; // 内存格总数
const SPAWN_POS = { x: 50, y: 200 };

// 内存块类
class MemBlock {
    constructor(id, type) {
        this.id = id;
        this.type = type; // 'active', 'pool', 'garbage'
        this.life = 0; // 用于动画
    }
}

// 子弹类
class Bullet {
    constructor(id) {
        this.id = id;
        this.reset();
    }
    
    reset() {
        this.x = SPAWN_POS.x;
        this.y = SPAWN_POS.y;
        this.speed = 5;
        this.active = true;
    }
}

function init() {
    bullets = [];
    pool = [];
    garbage = [];
    memoryBlocks = [];
    bulletIdCounter = 0;
    gcTimer = 0;
    isGCing = false;
}

function updateMemory() {
    // 重建内存视图数据
    memoryBlocks = [];
    
    // 1. 活动对象
    bullets.forEach(b => memoryBlocks.push(new MemBlock(b.id, 'active')));
    
    // 2. 池中对象 (只在有池模式下存在)
    pool.forEach(b => memoryBlocks.push(new MemBlock(b.id, 'pool')));
    
    // 3. 垃圾对象 (只在无池模式下积累)
    garbage.forEach(b => memoryBlocks.push(new MemBlock(b.id, 'garbage')));
}

// 模拟 GC
function triggerGC() {
    if (garbage.length > 20 && !isGCing) {
        isGCing = true;
        setTimeout(() => {
            garbage = []; // 清空垃圾
            isGCing = false;
        }, 500); // GC 耗时模拟
    }
}

function spawnBullet() {
    let bullet;
    if (usePool && pool.length > 0) {
        // 从池里拿
        bullet = pool.pop();
        bullet.reset();
    } else {
        // 创建新的
        bullet = new Bullet(++bulletIdCounter);
    }
    bullets.push(bullet);
}

function update() {
    // 更新子弹
    for (let i = bullets.length - 1; i >= 0; i--) {
        let b = bullets[i];
        b.x += b.speed;
        
        // 超出屏幕
        if (b.x > gameCanvas.width) {
            b.active = false;
            bullets.splice(i, 1);
            
            if (usePool) {
                // 归还到池子
                pool.push(b);
            } else {
                // 变成垃圾
                garbage.push(b);
            }
        }
    }

    if (!usePool) triggerGC();
    
    updateMemory();
    
    // 更新 UI
    let memUsage = memoryBlocks.length * 4; // 假设每块 4KB
    memStats.textContent = `内存占用: ${memUsage} KB`;
    if (isGCing) {
        memStats.textContent += " [GCING!!!]";
        memStats.style.color = "red";
    } else {
        memStats.style.color = "white";
    }
}

function drawGame() {
    gameCtx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);
    
    // 绘制发射器
    gameCtx.fillStyle = '#666';
    gameCtx.fillRect(10, 180, 40, 40);
    
    // 绘制子弹
    gameCtx.fillStyle = '#FFD93D';
    bullets.forEach(b => {
        gameCtx.beginPath();
        gameCtx.arc(b.x, b.y, 8, 0, Math.PI * 2);
        gameCtx.fill();
        gameCtx.strokeStyle = '#000';
        gameCtx.lineWidth = 1;
        gameCtx.stroke();
    });

    if (isGCing) {
        // GC 时的卡顿特效 (红屏)
        gameCtx.fillStyle = 'rgba(255, 0, 0, 0.3)';
        gameCtx.fillRect(0, 0, gameCanvas.width, gameCanvas.height);
        gameCtx.fillStyle = '#FFF';
        gameCtx.font = '30px Arial';
        gameCtx.fillText("LAG (GC)...", 150, 200);
    }
}

function drawMemory() {
    memCtx.clearRect(0, 0, memCanvas.width, memCanvas.height);
    
    // 绘制内存格子
    let blockSize = 30;
    let cols = 10;
    let padding = 5;
    
    memoryBlocks.forEach((block, index) => {
        let col = index % cols;
        let row = Math.floor(index / cols);
        let x = col * (blockSize + padding) + 20;
        let y = row * (blockSize + padding) + 20;
        
        if (block.type === 'active') memCtx.fillStyle = '#4CAF50'; // 绿
        else if (block.type === 'pool') memCtx.fillStyle = '#2196F3'; // 蓝
        else if (block.type === 'garbage') memCtx.fillStyle = '#9E9E9E'; // 灰
        
        memCtx.fillRect(x, y, blockSize, blockSize);
        
        // 绘制 ID
        memCtx.fillStyle = '#FFF';
        memCtx.font = '10px Arial';
        memCtx.textAlign = 'center';
        memCtx.textBaseline = 'middle';
        memCtx.fillText(block.id, x + blockSize/2, y + blockSize/2);
    });
}

function loop(timestamp) {
    // 简单的帧率控制，GC 时卡顿
    if (isGCing && Math.random() > 0.1) {
        requestAnimationFrame(loop);
        return; // 模拟掉帧
    }
    
    update();
    drawGame();
    drawMemory();
    
    requestAnimationFrame(loop);
}

// 交互
btnNoPool.addEventListener('click', () => {
    usePool = false;
    btnNoPool.classList.add('active');
    btnPool.classList.remove('active');
    modeDesc.innerHTML = "<strong>无对象池模式：</strong> 子弹销毁后变成灰色方块（垃圾）。当垃圾堆积到一定程度，触发 GC（红屏卡顿），一次性清除。这模拟了内存分配和回收的开销。";
    init();
});

btnPool.addEventListener('click', () => {
    usePool = true;
    btnPool.classList.add('active');
    btnNoPool.classList.remove('active');
    modeDesc.innerHTML = "<strong>对象池模式：</strong> 子弹销毁后变成蓝色方块（回到池中）。再次发射时直接复用蓝色方块，不产生新的内存块。内存占用稳定，无 GC 卡顿。";
    init();
});

btnFire.addEventListener('click', spawnBullet);
window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') spawnBullet();
});

// 启动
init();
loop();

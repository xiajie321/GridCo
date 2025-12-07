/**
 * 协程、线程、进程 互动演示 - 2.0 直观版
 * 采用泳道/资源视图来清晰展示内存模型和调度差异
 */

const canvas = document.getElementById('concurrency-canvas');
const ctx = canvas.getContext('2d');

// 按钮
const btnProcess = document.querySelector('[data-mode="process"]');
const btnThread = document.querySelector('[data-mode="thread"]');
const btnCoroutine = document.querySelector('[data-mode="coroutine"]');
const modeDesc = document.getElementById('mode-desc');

let currentMode = 'process';
let actors = []; // 参与者（进程/线程/协程）
let cores = [];  // CPU 核心

// 配置
const CONFIG = {
    process: { color: '#FF9800', label: '进程', switchCost: 60, coreCount: 1 }, // 单核多进程演示切换
    thread: { color: '#4CAF50', label: '线程', switchCost: 20, coreCount: 2 },  // 多核多线程演示并行
    coroutine: { color: '#2196F3', label: '协程', switchCost: 0, coreCount: 1 } // 单核协程演示无缝
};

// 参与者类
class Actor {
    constructor(id, type, y) {
        this.id = id;
        this.type = type;
        this.progress = 0;
        this.totalWork = 100;
        this.state = 'waiting'; // waiting, running, switching
        
        // 视觉位置
        this.x = 200; // 内存区域起始 X
        this.y = y;
        this.width = 300;
        this.height = 50;
        
        this.color = CONFIG[type].color;
    }

    draw() {
        // 绘制内存容器背景
        ctx.fillStyle = '#EEE';
        // 进程模式下，每个Actor有独立的边框（模拟独立内存）
        // 线程/协程模式下，背景看起来是连通的
        if (this.type === 'process') {
            ctx.fillStyle = '#f9f9f9';
            ctx.fillRect(this.x, this.y, this.width, this.height); // 增加填充
            ctx.strokeStyle = '#666'; // 加深边框颜色
            ctx.lineWidth = 2;
            ctx.strokeRect(this.x, this.y, this.width, this.height);
        } else if (this.id === 0) {
            // 线程/协程画一个大框背景
            ctx.fillStyle = '#f0f8ff';
            ctx.fillRect(this.x, this.y, this.width, this.height * actors.length + 10);
            ctx.strokeStyle = '#999';
            ctx.lineWidth = 2;
            ctx.strokeRect(this.x, this.y, this.width, this.height * actors.length + 10);
        }

        // 绘制任务条
        let barWidth = 200;
        let barX = this.x + 50;
        let barY = this.y + 15;
        
        // 进度槽
        ctx.fillStyle = '#DDD';
        ctx.fillRect(barX, barY, barWidth, 20);
        
        // 进度
        ctx.fillStyle = this.color;
        ctx.fillRect(barX, barY, barWidth * (this.progress / this.totalWork), 20);
        
        // 状态标识
        ctx.fillStyle = '#000';
        ctx.font = '14px Consolas';
        ctx.textAlign = 'right';
        ctx.fillText(`${CONFIG[this.type].label} #${this.id}`, this.x - 10, this.y + 30);

        // 运行状态高亮
        if (this.state === 'running') {
            ctx.strokeStyle = '#FFD93D'; // 活跃亮黄
            ctx.lineWidth = 3;
            ctx.strokeRect(barX - 2, barY - 2, barWidth + 4, 24);
            
            ctx.fillStyle = '#000';
            ctx.textAlign = 'left';
            ctx.fillText("RUNNING", barX + barWidth + 10, barY + 15);
        } else if (this.state === 'switching') {
            ctx.fillStyle = '#999';
            ctx.textAlign = 'left';
            ctx.fillText("加载中...", barX + barWidth + 10, barY + 15);
        }
    }
}

// CPU 核心类
class Core {
    constructor(id, x, y) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.currentActor = null;
        this.switchTimer = 0;
    }

    draw() {
        ctx.fillStyle = '#333';
        ctx.fillRect(this.x, this.y, 60, 60);
        ctx.fillStyle = '#FFD93D';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`CPU ${this.id}`, this.x + 30, this.y + 35);

        // 连线
        if (this.currentActor) {
            ctx.beginPath();
            ctx.moveTo(this.x + 60, this.y + 30);
            // 连线到任务条左侧
            ctx.lineTo(this.currentActor.x + 50, this.currentActor.y + 25);
            ctx.strokeStyle = this.switchTimer > 0 ? '#999' : '#FFD93D';
            ctx.lineWidth = this.switchTimer > 0 ? 1 : 3;
            ctx.setLineDash(this.switchTimer > 0 ? [5, 5] : []);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }
}

function init() {
    actors = [];
    cores = [];
    
    let conf = CONFIG[currentMode];
    
    // 创建核心
    for(let i=0; i<conf.coreCount; i++) {
        cores.push(new Core(i, 50, 100 + i * 150));
    }

    // 创建参与者
    let count = 4;
    for(let i=0; i<count; i++) {
        actors.push(new Actor(i+1, currentMode, 50 + i * 60));
    }
}

function update() {
    let conf = CONFIG[currentMode];

    cores.forEach(core => {
        // 如果正在切换
        if (core.switchTimer > 0) {
            core.switchTimer--;
            if (core.currentActor) core.currentActor.state = 'switching';
            return;
        }

        // 调度逻辑
        if (!core.currentActor || core.currentActor.progress >= 100 || shouldYield(core.currentActor)) {
            // 当前任务完成或让出，寻找新任务
            // 简单调度：找一个没完成且没被其他核占用的
            let next = actors.find(a => a.progress < 100 && !isOccupiedByOther(a, core));
            
            // 如果所有都完成了，重置
            if (!next && actors.every(a => a.progress >= 100)) {
                actors.forEach(a => { a.progress = 0; a.state = 'waiting'; });
                return;
            }

            if (next && next !== core.currentActor) {
                // 发生切换
                if (core.currentActor) core.currentActor.state = 'waiting';
                core.currentActor = next;
                core.switchTimer = conf.switchCost; // 设置切换惩罚
            }
        }

        // 执行
        if (core.currentActor && core.currentActor.progress < 100) {
            core.currentActor.state = 'running';
            core.currentActor.progress += 0.5; // 执行速度
        }
    });
}

function isOccupiedByOther(actor, selfCore) {
    return cores.some(c => c !== selfCore && c.currentActor === actor);
}

function shouldYield(actor) {
    // 模拟时间片轮转：每执行 20% 就让出，模拟并发
    // 协程模式下，也模拟自动 yield
    return Math.floor(actor.progress) % 25 === 0 && Math.floor(actor.progress) > 0 && Math.abs(actor.progress % 25) < 0.6;
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 绘制内存区域背景标签
    ctx.fillStyle = '#666';
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText("内存空间 (Memory Space)", 200, 30);

    actors.forEach(a => a.draw());
    cores.forEach(c => c.draw());
}

function animate() {
    update();
    draw();
    requestAnimationFrame(animate);
}

// 交互绑定
function setMode(mode) {
    currentMode = mode;
    [btnProcess, btnThread, btnCoroutine].forEach(btn => btn.classList.remove('active'));
    
    if (mode === 'process') {
        btnProcess.classList.add('active');
        modeDesc.innerHTML = "<strong>多进程模式 (单核演示)：</strong> 每个任务有独立边框（内存隔离）。切换时会有明显的停顿（Context Switch 开销大）。";
    } else if (mode === 'thread') {
        btnThread.classList.add('active');
        modeDesc.innerHTML = "<strong>多线程模式 (多核演示)：</strong> 所有任务共享一大块内存背景。两个 CPU 可以同时工作（并行），效率翻倍。";
    } else if (mode === 'coroutine') {
        btnCoroutine.classList.add('active');
        modeDesc.innerHTML = "<strong>协程模式 (单核演示)：</strong> 虽然只有一个 CPU，但在同一个线程内极速切换。任务之间没有'加载中'的停顿，像流水线一样顺畅。";
    }
    
    init();
}

btnProcess.addEventListener('click', () => setMode('process'));
btnThread.addEventListener('click', () => setMode('thread'));
btnCoroutine.addEventListener('click', () => setMode('coroutine'));

// 启动
init();
animate();

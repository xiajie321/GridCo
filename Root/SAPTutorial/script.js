// --- 通用工具 ---
function randomColor() {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98FB98', '#DDA0DD'];
    return colors[Math.floor(Math.random() * colors.length)];
}

function drawRect(ctx, x, y, w, h, color, border = true) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
    if (border) {
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, w, h);
    }
}

// --- Step 1: 排序演示 ---
const sortCanvas = document.getElementById('sortCanvas');
const sortCtx = sortCanvas.getContext('2d');
let sortObjects = [];
let nextSortId = 1;

class SortObject {
    constructor(x, y, w, h) {
        this.id = nextSortId++;
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.color = randomColor();
    }

    get minX() { return this.x; }
    get maxX() { return this.x + this.w; }
}

function updateSortCanvas() {
    sortCtx.clearRect(0, 0, sortCanvas.width, sortCanvas.height);

    // 绘制 X 轴
    sortCtx.beginPath();
    sortCtx.moveTo(0, 250);
    sortCtx.lineTo(600, 250);
    sortCtx.strokeStyle = '#333';
    sortCtx.lineWidth = 2;
    sortCtx.stroke();
    sortCtx.fillStyle = '#333';
    sortCtx.fillText("X 轴", 570, 240);

    // 排序
    sortObjects.sort((a, b) => a.minX - b.minX);

    // 更新列表显示
    const listDisplay = document.getElementById('sortListDisplay');
    listDisplay.innerHTML = "排序列表: [" + sortObjects.map(o => `<span style='color:${o.color}'>ID:${o.id}</span>`).join(", ") + "]";

    // 绘制物体和投影
    sortObjects.forEach(obj => {
        // 物体
        drawRect(sortCtx, obj.x, obj.y, obj.w, obj.h, obj.color);
        sortCtx.fillStyle = '#000';
        sortCtx.font = '12px Arial';
        sortCtx.fillText(`ID:${obj.id}`, obj.x + 5, obj.y + 15);

        // 投影线
        sortCtx.beginPath();
        sortCtx.setLineDash([5, 5]);
        sortCtx.moveTo(obj.x, obj.y + obj.h);
        sortCtx.lineTo(obj.x, 250); // 左脚
        sortCtx.moveTo(obj.x + obj.w, obj.y + obj.h);
        sortCtx.lineTo(obj.x + obj.w, 250); // 右脚
        sortCtx.strokeStyle = '#aaa';
        sortCtx.stroke();
        sortCtx.setLineDash([]);

        // X轴上的区间
        sortCtx.fillStyle = obj.color;
        sortCtx.fillRect(obj.x, 248, obj.w, 4);
    });
}

document.getElementById('addSortObjBtn').addEventListener('click', () => {
    const w = 40 + Math.random() * 40;
    const h = 40 + Math.random() * 40;
    const x = Math.random() * (sortCanvas.width - w);
    const y = Math.random() * (200 - h); // 留出底部画轴的空间
    sortObjects.push(new SortObject(x, y, w, h));
    updateSortCanvas();
    updateSweepDemo(); // 同时更新Step 2的数据
});

document.getElementById('clearSortObjBtn').addEventListener('click', () => {
    sortObjects = [];
    nextSortId = 1;
    updateSortCanvas();
    updateSweepDemo();
});

// 点击添加
sortCanvas.addEventListener('mousedown', (e) => {
    const rect = sortCanvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (mouseY < 200) {
        const w = 50;
        const h = 50;
        sortObjects.push(new SortObject(mouseX - w/2, mouseY - h/2, w, h));
        updateSortCanvas();
        updateSweepDemo();
    }
});


// --- Step 2: 扫描演示 ---
// 复用 Step 1 的物体数据，但展示扫描过程
const sweepCanvas = document.getElementById('sweepCanvas');
const sweepCtx = sweepCanvas.getContext('2d');
const sweepSlider = document.getElementById('sweepSlider');

function updateSweepDemo() {
    const sweepX = parseInt(sweepSlider.value);
    sweepCtx.clearRect(0, 0, sweepCanvas.width, sweepCanvas.height);

    // 1. 绘制背景物体 (半透明)
    sortObjects.forEach(obj => {
        sweepCtx.globalAlpha = 0.3;
        drawRect(sweepCtx, obj.x, obj.y, obj.w, obj.h, obj.color);
        sweepCtx.globalAlpha = 1.0;
        
        // ID
        sweepCtx.fillStyle = '#000';
        sweepCtx.fillText(obj.id, obj.x + 5, obj.y + 15);
    });

    // 2. 模拟 SAP 过程找到 Active List
    // 这里的逻辑：为了演示，我们显示“扫掠线位置”对应的 Active List
    // 扫掠线位置 sweepX 代表我们处理到了哪里。
    // 在真正的 SAP 中，我们是遍历排好序的物体。
    // 这里为了视觉效果，我们认为扫掠线扫过的地方就是当前处理进度。
    
    // 找到第一个 MinX > sweepX 的物体，作为“还没处理到的边界”
    // 换句话说，我们假设当前正在处理位于 sweepX 处的那个虚拟物体，或者刚刚被扫过的物体。
    
    // 更好的可视化：
    // 滑块控制 sweepX。
    // Active List 包含所有: MinX <= sweepX 且 MaxX >= sweepX 的物体。
    // 也就说，在这个 X 坐标上，这些物体都“活着”。
    
    let activeList = [];
    let potentialCollisions = [];

    sortObjects.forEach(obj => {
        if (obj.minX <= sweepX && obj.maxX >= sweepX) {
            activeList.push(obj);
        }
    });

    // 绘制 Active 物体 (高亮)
    activeList.forEach(obj => {
        sweepCtx.lineWidth = 4;
        sweepCtx.strokeStyle = '#FF0000';
        sweepCtx.strokeRect(obj.x, obj.y, obj.w, obj.h);
        
        // 检查两两碰撞 (仅针对 Active List)
        activeList.forEach(other => {
            if (obj !== other) {
                // 简单的 AABB 检测
                if (obj.x < other.x + other.w &&
                    obj.x + obj.w > other.x &&
                    obj.y < other.y + other.h &&
                    obj.y + obj.h > other.y) {
                    // 记录碰撞对，避免重复 (1-2 和 2-1)
                    const pairId = [obj.id, other.id].sort().join('-');
                    if (!potentialCollisions.includes(pairId)) {
                        potentialCollisions.push(pairId);
                    }
                }
            }
        });
    });

    // 绘制扫掠线
    sweepCtx.beginPath();
    sweepCtx.moveTo(sweepX, 0);
    sweepCtx.lineTo(sweepX, sweepCanvas.height);
    sweepCtx.strokeStyle = 'red';
    sweepCtx.lineWidth = 2;
    sweepCtx.stroke();

    // 更新 DOM
    const activeDisplay = document.getElementById('activeListDisplay');
    activeDisplay.innerHTML = "活跃列表 (Active List): [" + activeList.map(o => o.id).join(", ") + "]";

    const collisionDisplay = document.getElementById('collisionDisplay');
    if (potentialCollisions.length > 0) {
        collisionDisplay.innerHTML = "💥 检测到碰撞: " + potentialCollisions.join(", ");
        collisionDisplay.style.color = "red";
    } else {
        collisionDisplay.innerHTML = "潜在碰撞对: 无";
        collisionDisplay.style.color = "#333";
    }
}

sweepSlider.addEventListener('input', updateSweepDemo);


// --- Step 3: Battle Mode ---
const battleCanvas = document.getElementById('battleCanvas');
const battleCtx = battleCanvas.getContext('2d');
let battleObjects = [];
let isSAPMode = false;
let battleRunning = false;
let animationId;

class BattleObject {
    constructor(id) {
        this.id = id;
        this.w = 20;
        this.h = 20;
        this.x = Math.random() * (battleCanvas.width - this.w);
        this.y = Math.random() * (battleCanvas.height - this.h);
        this.vx = (Math.random() - 0.5) * 4;
        this.vy = (Math.random() - 0.5) * 4;
        this.color = '#888';
        this.isColliding = false;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;

        if (this.x <= 0 || this.x + this.w >= battleCanvas.width) this.vx *= -1;
        if (this.y <= 0 || this.y + this.h >= battleCanvas.height) this.vy *= -1;

        // 边界约束
        this.x = Math.max(0, Math.min(this.x, battleCanvas.width - this.w));
        this.y = Math.max(0, Math.min(this.y, battleCanvas.height - this.h));

        this.isColliding = false; // 重置状态
        this.color = '#888';
    }

    draw(ctx) {
        if (this.isColliding) this.color = '#FF4444';
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.w, this.h);
    }
}

function checkCollision(a, b) {
    return a.x < b.x + b.w &&
           a.x + a.w > b.x &&
           a.y < b.y + b.h &&
           a.y + a.h > b.y;
}

function battleLoop() {
    if (!battleRunning) return;

    battleCtx.clearRect(0, 0, battleCanvas.width, battleCanvas.height);
    
    // Update movement
    battleObjects.forEach(obj => obj.update());

    let checks = 0;

    if (!isSAPMode) {
        // --- 暴力法 O(N^2) ---
        for (let i = 0; i < battleObjects.length; i++) {
            for (let j = i + 1; j < battleObjects.length; j++) {
                checks++;
                if (checkCollision(battleObjects[i], battleObjects[j])) {
                    battleObjects[i].isColliding = true;
                    battleObjects[j].isColliding = true;
                }
            }
        }
    } else {
        // --- SAP O(N log N) ---
        
        // 1. Sort (X axis)
        // 注意：这里为了演示真实开销，每次都重新排序。
        // 在实际引擎中，通常使用插入排序利用帧间连贯性。
        battleObjects.sort((a, b) => a.x - b.x);

        // 2. Sweep & Prune
        let activeList = [];
        
        for (let i = 0; i < battleObjects.length; i++) {
            let current = battleObjects[i];
            
            // 倒序检查活跃列表
            for (let j = activeList.length - 1; j >= 0; j--) {
                let active = activeList[j];
                
                // Prune: 如果活跃物体的最大X 小于 当前物体的最小X
                if (active.x + active.w < current.x) {
                    activeList.splice(j, 1); // 移除它，因为它和后续任何物体都不可能相撞了
                } else {
                    // Check
                    checks++;
                    if (checkCollision(current, active)) {
                        current.isColliding = true;
                        active.isColliding = true;
                    }
                }
            }
            
            activeList.push(current);
        }
    }

    // Draw
    battleObjects.forEach(obj => obj.draw(battleCtx));

    // Update Stats
    let modeText = isSAPMode ? 'SAP (轴扫掠)' : '暴力法 (N²)<br><span style="font-size:0.8em;color:#666">(已优化: N*(N-1)/2)</span>';
    
    document.getElementById('perfStats').innerHTML = `
        模式: ${modeText}<br>
        物体: ${battleObjects.length}<br>
        检测次数: ${checks}
    `;

    animationId = requestAnimationFrame(battleLoop);
}

document.getElementById('add50Btn').addEventListener('click', () => {
    for(let i=0; i<50; i++) {
        battleObjects.push(new BattleObject(battleObjects.length));
    }
});

document.getElementById('resetBattleBtn').addEventListener('click', () => {
    battleObjects = [];
});

document.getElementById('toggleModeBtn').addEventListener('click', (e) => {
    isSAPMode = !isSAPMode;
    e.target.innerText = `切换模式：当前[${isSAPMode ? 'SAP法' : '暴力法'}]`;
});

// 初始化：预先添加几个物体，避免Canvas空白
for(let i=0; i<3; i++) {
    const w = 40 + Math.random() * 40;
    const h = 40 + Math.random() * 40;
    const x = Math.random() * (sortCanvas.width - w);
    const y = Math.random() * (200 - h);
    sortObjects.push(new SortObject(x, y, w, h));
}

updateSortCanvas();
updateSweepDemo();

// Start Battle Loop
battleRunning = true;
battleLoop();

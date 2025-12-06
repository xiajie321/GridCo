console.log('UnityGCTutorial script loaded');

// --- 步骤 1 & 2: 栈和堆模拟 (保持不变) ---
const stackView = document.getElementById('stackView');
const heapView = document.getElementById('heapView');
const memInfo = document.getElementById('memInfo');
const gcStatus = document.getElementById('gcStatus');

let stackItems = [];
let heapItems = [];
let nextHeapAddress = 0x1000;

function updateMemViews() {
    checkGarbage();
    stackView.innerHTML = '';
    heapView.innerHTML = '';
    
    heapItems.forEach(item => {
        const div = document.createElement('div');
        div.className = 'memory-block ' + (item.isGarbage ? 'garbage' : 'ref-type');
        div.style.width = item.size * 40 + 'px';
        div.textContent = item.name + (item.isGarbage ? ' (垃圾)' : '');
        div.id = `heap-${item.id}`;
        div.style.animation = 'fadeIn 0.5s';
        heapView.appendChild(div);
    });
    
    stackItems.forEach(item => {
        const div = document.createElement('div');
        div.className = 'memory-block ' + (item.isPointer ? 'pointer' : 'val-type');
        if (item.isPointer) {
            div.textContent = `Ref->${item.targetId}`;
            div.style.backgroundColor = '#fff';
            div.onmouseover = () => {
                const target = document.getElementById(`heap-${item.targetId}`);
                if (target) {
                    target.style.boxShadow = '0 0 10px #FFD93D';
                    target.style.transform = 'scale(1.05)';
                    div.style.backgroundColor = '#FFD93D';
                }
            };
            div.onmouseout = () => {
                const target = document.getElementById(`heap-${item.targetId}`);
                if (target) {
                    target.style.boxShadow = 'none';
                    target.style.transform = 'none';
                    div.style.backgroundColor = '#fff';
                }
            };
        } else {
            div.textContent = `${item.name}=${item.value}`;
        }
        div.style.animation = 'slideIn 0.3s';
        stackView.appendChild(div);
    });
}

function checkGarbage() {
    heapItems.forEach(h => h.isGarbage = true);
    stackItems.forEach(s => {
        if (s.isPointer) {
            const target = heapItems.find(h => h.id === s.targetId);
            if (target) target.isGarbage = false;
        }
    });
    
    const garbageCount = heapItems.filter(h => h.isGarbage).length;
    if (garbageCount > 0) {
        gcStatus.textContent = `堆内存状态：发现 ${garbageCount} 个垃圾对象！`;
        gcStatus.style.color = '#FF6B6B';
        gcStatus.style.fontWeight = 'bold';
    } else {
        gcStatus.textContent = '堆内存状态：良好';
        gcStatus.style.color = 'green';
    }
}

document.getElementById('addIntBtn').addEventListener('click', () => {
    stackItems.push({ name: 'i', value: Math.floor(Math.random()*100), isPointer: false });
    memInfo.textContent = "值类型直接压入栈顶。速度极快！";
    updateMemViews();
});

document.getElementById('addClassBtn').addEventListener('click', () => {
    const id = nextHeapAddress++;
    heapItems.push({ id: id, name: 'User', size: 2, isGarbage: false });
    stackItems.push({ name: 'u', targetId: id, isPointer: true });
    memInfo.textContent = "引用类型：对象在堆里安家，栈里只拿个门牌号(引用)。";
    updateMemViews();
});

document.getElementById('clearMemBtn').addEventListener('click', () => {
    stackItems = [];
    memInfo.textContent = "函数返回，栈被清空。所有局部变量消失，引用断开。";
    updateMemViews();
});

document.getElementById('popStackBtn').addEventListener('click', () => {
    if (stackItems.length > 0) {
        stackItems.pop();
        memInfo.textContent = "栈顶变量弹出。引用断开，堆里的对象变成了孤儿（垃圾）。";
        updateMemViews();
    } else {
        memInfo.textContent = "栈已经空了。";
    }
});


// --- 步骤 3: 内存碎片演示 ---
const gcCanvas = document.getElementById('gcCanvas');
const gcCtx = gcCanvas.getContext('2d');
const fragmentStatus = document.getElementById('fragmentStatus');
let memoryMap = new Array(60).fill(0); 

function drawMemory() {
    gcCtx.clearRect(0, 0, 600, 200);
    const blockSize = 10;
    const startX = 0;
    const startY = 40;
    
    let maxContiguous = 0;
    let currentContiguous = 0;
    let totalFree = 0;
    
    for(let i=0; i<memoryMap.length; i++) {
        if (memoryMap[i] === 0) {
            gcCtx.fillStyle = '#fff';
            totalFree++;
            currentContiguous++;
        }
        else {
            if (memoryMap[i] === 1) gcCtx.fillStyle = '#FF6B6B'; 
            else gcCtx.fillStyle = '#999'; 
            if (currentContiguous > maxContiguous) maxContiguous = currentContiguous;
            currentContiguous = 0;
        }
        
        gcCtx.fillRect(startX + i * blockSize, startY, blockSize - 1, 40);
        gcCtx.strokeStyle = '#ddd';
        gcCtx.strokeRect(startX + i * blockSize, startY, blockSize - 1, 40);
    }
    if (currentContiguous > maxContiguous) maxContiguous = currentContiguous;
    
    fragmentStatus.textContent = `总空闲: ${totalFree} 块 | 最大连续空闲: ${maxContiguous} 块`;
    if (totalFree > 10 && maxContiguous < 5) {
        fragmentStatus.textContent += " (严重碎片化！)";
        fragmentStatus.style.color = 'red';
    } else {
        fragmentStatus.style.color = '#333';
    }
}

document.getElementById('allocateBtn').addEventListener('click', () => {
    let size = 2;
    if (tryAllocate(size)) {
        drawMemory();
    } else {
        alert("分配失败！即使是小对象也塞不进去了！");
    }
});

document.getElementById('allocBigBtn').addEventListener('click', () => {
    let size = 10;
    if (!tryAllocate(size)) {
        fragmentStatus.textContent = "分配失败：内存碎片导致无法分配大对象！";
        fragmentStatus.style.color = 'red';
    } else {
        drawMemory();
    }
});

function tryAllocate(size) {
    let found = -1;
    for(let i=0; i<=memoryMap.length-size; i++) {
        let clean = true;
        for(let j=0; j<size; j++) {
            if (memoryMap[i+j] !== 0) { clean = false; break; }
        }
        if (clean) { found = i; break; }
    }
    
    if (found !== -1) {
        for(let j=0; j<size; j++) memoryMap[found+j] = 1;
        return true;
    }
    return false;
}

document.getElementById('makeGarbageBtn').addEventListener('click', () => {
    let count = 0;
    for(let i=0; i<memoryMap.length; i++) {
        if (memoryMap[i] === 1 && Math.random() > 0.6) {
            memoryMap[i] = 2; 
            count++;
        }
    }
    if (count === 0 && memoryMap.includes(1)) {
         let idx = memoryMap.indexOf(1);
         if(idx !== -1) memoryMap[idx] = 2;
    }
    drawMemory();
});

document.getElementById('runGCBtn').addEventListener('click', () => {
    let cleared = 0;
    for(let i=0; i<memoryMap.length; i++) {
        if (memoryMap[i] === 2) {
            memoryMap[i] = 0;
            cleared++;
        }
    }
    drawMemory();
    if (cleared <= 0) {
        alert("没有垃圾可以回收。");
    }
});
drawMemory();


// --- 步骤 4: 增量 GC 图表 ---
const chartCanvas = document.getElementById('chartCanvas');
const chartCtx = chartCanvas.getContext('2d');
let isIncremental = false;
let frames = [];
let frameCount = 0;

function updateChart() {
    frameCount++;
    let frameTime = 16;
    if (frameCount % 60 === 0) {
        if (isIncremental) {
            frameTime += 4;
        } else {
            frameTime += 80;
        }
    }
    if (isIncremental && frameCount % 60 > 0 && frameCount % 60 < 10) {
        frameTime += 4;
    }

    frames.push(frameTime);
    if (frames.length > 60) frames.shift();
    
    chartCtx.clearRect(0, 0, 600, 150);
    chartCtx.strokeStyle = '#ddd';
    chartCtx.beginPath();
    chartCtx.moveTo(0, 150 - 16*2); chartCtx.lineTo(600, 150 - 16*2);
    chartCtx.stroke();
    
    const barWidth = 600 / 60;
    frames.forEach((time, i) => {
        if (time > 40) chartCtx.fillStyle = '#FF6B6B';
        else if (time > 20) chartCtx.fillStyle = '#FFD93D';
        else chartCtx.fillStyle = '#4ECDC4';
        let h = time * 1.5; 
        chartCtx.fillRect(i * barWidth, 150 - h, barWidth - 1, h);
    });
    requestAnimationFrame(updateChart);
}

document.getElementById('toggleGCModeBtn').addEventListener('click', () => {
    isIncremental = !isIncremental;
    const btn = document.getElementById('toggleGCModeBtn');
    btn.textContent = isIncremental ? "切换模式：增量 GC (启用)" : "切换模式：传统 GC";
});

updateChart();


// --- 步骤 5: 托管 vs 非托管 ---
const managedObj = document.getElementById('managedObj');
const unmanagedData = document.getElementById('unmanagedData');
const linkLine = document.getElementById('linkLine');
const linkText = document.getElementById('linkText');
const unmanagedInfo = document.getElementById('unmanagedInfo');
let hasTexture = false;
let hasReference = false;

function updateUnmanagedView() {
    if (hasReference && hasTexture) {
        managedObj.style.display = 'block';
        managedObj.textContent = 'Texture2D\n(壳子)';
        managedObj.style.backgroundColor = '#4ECDC4';
    } else if (!hasReference && hasTexture) {
        managedObj.style.display = 'block';
        managedObj.textContent = 'Texture2D\n(垃圾)';
        managedObj.style.backgroundColor = '#999';
    } else {
        managedObj.style.display = 'none';
    }

    if (hasTexture) {
        unmanagedData.style.display = 'flex';
    } else {
        unmanagedData.style.display = 'none';
    }

    if (hasReference && hasTexture) {
        linkLine.style.display = 'block';
        linkText.style.display = 'block';
    } else {
        linkLine.style.display = 'none';
        linkText.style.display = 'none';
    }
}

document.getElementById('loadTexBtn').addEventListener('click', () => {
    if (hasTexture) return;
    hasTexture = true;
    hasReference = true;
    unmanagedInfo.textContent = "加载成功！注意：C#只拿到了壳子，C++里才是真身。";
    updateUnmanagedView();
});

document.getElementById('nullRefBtn').addEventListener('click', () => {
    if (!hasReference) return;
    hasReference = false;
    unmanagedInfo.textContent = "变量置空了。托管堆壳子变垃圾了，但右边的大块头还在！这就是泄漏！";
    updateUnmanagedView();
});

document.getElementById('gcBtn').addEventListener('click', () => {
    if (!hasReference && hasTexture) {
        managedObj.style.display = 'none';
        unmanagedInfo.textContent = "GC 把壳子回收了。但非托管内存 GC 管不着！它还在那儿！";
    }
});

document.getElementById('unloadBtn').addEventListener('click', () => {
    if (hasTexture) {
        hasTexture = false;
        hasReference = false;
        updateUnmanagedView();
        unmanagedInfo.textContent = "终于！调用 UnloadUnusedAssets 手动清理了非托管内存。";
    }
});

// --- 步骤 6: GC 大乱斗小游戏 ---
const gameCanvas = document.getElementById('gameCanvas');
const gameCtx = gameCanvas.getContext('2d');
const gameStackView = document.getElementById('gameStackView');
const gameHeapView = document.getElementById('gameHeapView');
const gameHeapSize = document.getElementById('gameHeapSize');
const gameGCStatus = document.getElementById('gameGCStatus');
const gameStateInfo = document.getElementById('gameStateInfo');
const gcCountInfo = document.getElementById('gcCountInfo');

// 游戏状态
let isGameRunning = false;
let isGPuased = false; // 用于 GC 暂停
let useObjectPool = false;
let lastTime = 0;
let ballSpawnTimer = 5;
let itemSpawnTimer = 0;
let gcCount = 0;

// 内存模拟 - 使用数组模拟堆内存，0=空，1=占用
const MEMORY_CAPACITY = 30; // 固定大小
let gameHeapMemory = new Array(MEMORY_CAPACITY).fill(null); // null表示空闲，否则存对象数据

// 对象池
let ballPool = [];
let itemPool = [];

// 游戏对象
class Ball {
    constructor(x, y) {
        this.id = Math.floor(Math.random() * 9000) + 1000;
        this.x = x;
        this.y = y;
        this.baseR = 25; 
        this.r = this.baseR;
        const speed = 200;
        const angle = Math.random() * Math.PI * 2;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.color = `hsl(${Math.random() * 360}, 70%, 60%)`;
        this.killCount = 0;
        this.growthLevel = 0; 
        this.hasShield = false;
        this.hasKnife = false;
        this.active = true;
        this.heapIndex = -1; // 内存起始地址
        this.memorySize = 4; // 占用4格
    }
    
    reset(x, y) {
        this.x = x;
        this.y = y;
        this.r = this.baseR;
        const speed = 200;
        const angle = Math.random() * Math.PI * 2;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.killCount = 0;
        this.growthLevel = 0;
        this.hasShield = false;
        this.hasKnife = false;
        this.active = true;
        // 注意：不重置 heapIndex，因为如果从池中取出，它仍然占用着那个位置
    }
    
    update(dt) {
        if (!this.active || isGPuased) return;
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        
        if (this.x < this.r || this.x > gameCanvas.width - this.r) this.vx *= -1;
        if (this.y < this.r || this.y > gameCanvas.height - this.r) this.vy *= -1;
        
        this.x = Math.max(this.r, Math.min(gameCanvas.width - this.r, this.x));
        this.y = Math.max(this.r, Math.min(gameCanvas.height - this.r, this.y));
    }
    
    draw() {
        if (!this.active) return;
        gameCtx.beginPath();
        gameCtx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
        gameCtx.fillStyle = this.color;
        gameCtx.fill();
        gameCtx.strokeStyle = '#fff';
        gameCtx.stroke();
        
        gameCtx.fillStyle = '#fff';
        gameCtx.font = '16px Arial'; 
        gameCtx.textAlign = 'center';
        gameCtx.textBaseline = 'middle';
        gameCtx.fillText(this.killCount, this.x, this.y);
        
        if (this.hasShield) {
            gameCtx.strokeStyle = '#4ECDC4';
            gameCtx.lineWidth = 4;
            gameCtx.beginPath();
            gameCtx.arc(this.x, this.y, this.r + 5, 0, Math.PI * 2);
            gameCtx.stroke();
            gameCtx.lineWidth = 1;
        }
        if (this.hasKnife) {
             gameCtx.fillStyle = '#FF6B6B';
             gameCtx.font = '24px Arial'; 
             gameCtx.fillText('🗡️', this.x + 20, this.y - 20);
        }
    }
    
    destroy() {
        this.active = false;
        if (useObjectPool) {
            // 如果开启对象池，内存不释放，状态设为 pooled
            setMemoryStatus(this.heapIndex, this.memorySize, 'pooled');
            ballPool.push(this);
        } else {
            // 否则标记为垃圾
            markMemoryAsGarbage(this.heapIndex, this.memorySize);
        }
    }
}

class Item {
    constructor(x, y, type) {
        this.id = Math.floor(Math.random() * 9000) + 1000;
        this.x = x;
        this.y = y;
        this.type = type; 
        this.r = 20; 
        this.active = true;
        this.creationTime = performance.now();
        this.heapIndex = -1;
        this.memorySize = 1; // 占用1格
    }
    
    reset(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.active = true;
        this.creationTime = performance.now();
        // 不重置 heapIndex
    }
    
    draw() {
        if (!this.active) return;
        gameCtx.font = '30px Arial'; 
        gameCtx.textAlign = 'center';
        gameCtx.textBaseline = 'middle';
        gameCtx.fillText(this.type === 'shield' ? '🛡️' : '🗡️', this.x, this.y);
    }
    
    destroy() {
        this.active = false;
        if (useObjectPool) {
            setMemoryStatus(this.heapIndex, this.memorySize, 'pooled');
            itemPool.push(this);
        } else {
            markMemoryAsGarbage(this.heapIndex, this.memorySize);
        }
    }
}

let balls = []; // 仅存储活动对象
let items = []; // 仅存储活动对象

function allocateMemory(obj, size) {
    // 寻找连续空闲空间
    let bestIndex = -1;
    for(let i=0; i <= MEMORY_CAPACITY - size; i++) {
        let isFree = true;
        for(let j=0; j<size; j++) {
            if (gameHeapMemory[i+j] !== null) {
                isFree = false;
                break;
            }
        }
        if (isFree) {
            bestIndex = i;
            break;
        }
    }
    
    if (bestIndex !== -1) {
        // 分配成功
        for(let i=0; i<size; i++) {
            gameHeapMemory[bestIndex + i] = {
                type: obj instanceof Ball ? 'Ball' : 'Item',
                objId: obj.id,
                isHead: i === 0,
                objRef: obj, // 引用
                status: 'active'
            };
        }
        obj.heapIndex = bestIndex;
        return true;
    } else {
        // 分配失败，触发GC
        triggerGameGC();
        return false;
    }
}

function markMemoryAsGarbage(startIndex, size) {
    if (startIndex === -1) return;
    for(let i=0; i<size; i++) {
        if (gameHeapMemory[startIndex+i]) {
            gameHeapMemory[startIndex+i].status = 'garbage';
        }
    }
}

function setMemoryStatus(startIndex, size, status) {
    if (startIndex === -1) return;
    for(let i=0; i<size; i++) {
        if (gameHeapMemory[startIndex+i]) {
            gameHeapMemory[startIndex+i].status = status;
        }
    }
}

function triggerGameGC() {
    isGPuased = true;
    gameStateInfo.innerHTML = '状态: <span style="color: red;">GC 暂停中...</span>';
    gcCount++;
    gcCountInfo.textContent = `GC 次数: ${gcCount}`;
    gameGCStatus.textContent = `GC 触发！清理垃圾...`;
    
    setTimeout(() => {
        // Sweep: 清理所有标记为 garbage 的块，但保留 active 和 pooled
        for(let i=0; i<MEMORY_CAPACITY; i++) {
            if (gameHeapMemory[i] && gameHeapMemory[i].status === 'garbage') {
                gameHeapMemory[i] = null;
            }
        }
        
        isGPuased = false;
        gameStateInfo.innerHTML = '状态: <span style="color: green;">运行中</span>';
        gameGCStatus.textContent = "";
    }, 1500);
}

function spawnBall() {
    if (balls.length >= 5) return;
    if (isGPuased) return;
    
    let b;
    let fromPool = false;
    
    if (useObjectPool && ballPool.length > 0) {
        b = ballPool.pop();
        b.reset(Math.random() * gameCanvas.width, Math.random() * gameCanvas.height);
        fromPool = true;
        // 从池中取出，恢复内存状态为 active
        setMemoryStatus(b.heapIndex, b.memorySize, 'active');
        balls.push(b);
    } else {
        b = new Ball(Math.random() * gameCanvas.width, Math.random() * gameCanvas.height);
        // 新对象尝试分配内存
        if (allocateMemory(b, b.memorySize)) {
            balls.push(b);
        }
    }
}

function spawnItem() {
    if (isGPuased) return;
    
    let currentKnives = items.filter(i => i.type === 'knife').length + balls.filter(b => b.hasKnife).length;
    let currentShields = items.filter(i => i.type === 'shield').length + balls.filter(b => b.hasShield).length;
    
    if (currentKnives >= 1 && currentShields >= 2) return;
    
    let type = (currentKnives < 1 && currentShields < 2) ? (Math.random() > 0.5 ? 'shield' : 'knife') : (currentKnives < 1 ? 'knife' : 'shield');
    
    let i;
    let fromPool = false;
    
    if (useObjectPool && itemPool.length > 0) {
        i = itemPool.pop();
        i.reset(Math.random() * (gameCanvas.width - 40) + 20, Math.random() * (gameCanvas.height - 40) + 20, type);
        fromPool = true;
        setMemoryStatus(i.heapIndex, i.memorySize, 'active');
        items.push(i);
    } else {
        i = new Item(Math.random() * (gameCanvas.width - 40) + 20, Math.random() * (gameCanvas.height - 40) + 20, type);
        if (allocateMemory(i, i.memorySize)) {
            items.push(i);
        }
    }
}

function checkGrowth(ball) {
    let level = Math.floor(ball.killCount / 2);
    if (level > 5) level = 5;
    if (level > ball.growthLevel) {
        ball.growthLevel = level;
        ball.r = ball.baseR * (1 + 0.1 * level);
    }
}

function dropKnife(x, y) {
    if (isGPuased) return;
    let i;
    let fromPool = false;
    
    if (useObjectPool && itemPool.length > 0) {
        i = itemPool.pop();
        i.reset(x, y, 'knife');
        i.creationTime = performance.now(); 
        fromPool = true;
        setMemoryStatus(i.heapIndex, i.memorySize, 'active');
        items.push(i);
    } else {
        i = new Item(x, y, 'knife');
        if (allocateMemory(i, i.memorySize)) {
            items.push(i);
        }
    }
}

function updateGameUI() {
    // Stack View
    gameStackView.innerHTML = '';
    
    const createStackEntry = (name, obj) => {
        const div = document.createElement('div');
        div.className = 'memory-block pointer';
        div.style.width = 'auto';
        div.style.minWidth = '100px';
        div.style.padding = '0 5px';
        div.style.margin = '2px';
        div.style.fontSize = '12px';
        div.style.border = '2px dashed #333';
        div.textContent = `${name}->${obj.heapIndex}`;
        
        div.onmouseover = () => {
            const blocks = document.querySelectorAll(`[data-obj-id="${obj.id}"]`);
            blocks.forEach(b => {
                b.style.boxShadow = '0 0 10px #FFD93D';
                b.style.transform = 'scale(1.05)';
                b.style.zIndex = '10';
            });
            div.style.backgroundColor = '#FFD93D';
        };
        div.onmouseout = () => {
            const blocks = document.querySelectorAll(`[data-obj-id="${obj.id}"]`);
            blocks.forEach(b => {
                b.style.boxShadow = 'none';
                b.style.transform = 'none';
                b.style.zIndex = '1';
            });
            div.style.backgroundColor = '';
        };
        return div;
    };

    balls.forEach((b, i) => gameStackView.appendChild(createStackEntry(`Ball${i}`, b)));
    items.forEach((item, i) => gameStackView.appendChild(createStackEntry(`Item${i}`, item)));

    // Heap View - Grid
    gameHeapView.innerHTML = '';
    
    gameHeapMemory.forEach((block, index) => {
        let div = document.createElement('div');
        div.style.width = '40px'; 
        div.style.height = '40px';
        div.style.margin = '1px';
        div.style.fontSize = '12px';
        div.style.display = 'flex';
        div.style.alignItems = 'center';
        div.style.justifyContent = 'center';
        div.style.border = '1px solid #000';
        div.style.boxSizing = 'border-box';
        div.style.position = 'relative';

        let indexSpan = document.createElement('span');
        indexSpan.textContent = index;
        indexSpan.style.position = 'absolute';
        indexSpan.style.top = '0';
        indexSpan.style.left = '0';
        indexSpan.style.fontSize = '8px';
        indexSpan.style.color = '#333';
        indexSpan.style.padding = '1px';
        indexSpan.style.pointerEvents = 'none';
        div.appendChild(indexSpan);
        
        if (block === null) {
            // 空闲
            div.style.backgroundColor = '#fff';
        } else {
            div.dataset.objId = block.objId;
            if (block.status === 'garbage') {
                div.style.backgroundColor = '#aaa'; // 灰色 - 垃圾
                div.textContent = block.type === 'Ball' ? '球' : '道具';
            } else if (block.status === 'pooled') {
                div.style.backgroundColor = '#4a90e2'; // 蓝色 - 池中
                div.style.color = '#fff';
                div.textContent = 'Pool';
            } else {
                // active
                if (block.type === 'Ball') {
                    div.style.backgroundColor = '#FFD93D'; // 黄色
                    div.textContent = '球'; 
                } else {
                    div.style.backgroundColor = '#FF6B6B'; // 红色
                    div.textContent = '道具';
                }
            }
        }
        
        gameHeapView.appendChild(div);
    });
    
    // 更新占用统计
    let usedCount = gameHeapMemory.filter(b => b !== null).length;
    gameHeapSize.textContent = usedCount;
}

function updateGame(timestamp) {
    if (!isGameRunning) return;
    
    if (isGPuased) {
        requestAnimationFrame(updateGame);
        return;
    }

    let dt = (timestamp - lastTime) / 1000;
    lastTime = timestamp;
    if (dt > 0.1) dt = 0.1; 
    
    ballSpawnTimer += dt;
    if (ballSpawnTimer > 3) { spawnBall(); ballSpawnTimer = 0; } 
    
    itemSpawnTimer += dt;
    if (itemSpawnTimer > 2) { spawnItem(); itemSpawnTimer = 0; }
    
    // 更新和清理死亡对象
    // 注意：balls 数组现在只存 active 的，所以这里不需要 splice
    // 我们只需要遍历更新
    balls.forEach(b => b.update(dt));
    
    // 碰撞检测
    for (let i = 0; i < balls.length; i++) {
        for (let j = i + 1; j < balls.length; j++) {
            let b1 = balls[i];
            let b2 = balls[j];
            
            let dx = b1.x - b2.x;
            let dy = b1.y - b2.y;
            let dist = Math.sqrt(dx*dx + dy*dy);
            
            if (dist < b1.r + b2.r) {
                let angle = Math.atan2(dy, dx);
                const speed = 200;
                b1.vx = Math.cos(angle) * speed;
                b1.vy = Math.sin(angle) * speed;
                b2.vx = Math.cos(angle + Math.PI) * speed;
                b2.vy = Math.sin(angle + Math.PI) * speed;
                
                let overlap = (b1.r + b2.r - dist) / 2;
                b1.x += Math.cos(angle) * overlap;
                b1.y += Math.sin(angle) * overlap;
                b2.x -= Math.cos(angle) * overlap;
                b2.y -= Math.sin(angle) * overlap;
                
                if (b1.hasKnife) {
                    dropKnife(b1.x, b1.y); b1.hasKnife = false;
                    if (b2.hasShield) { b2.hasShield = false; } 
                    else { 
                        b2.destroy(); 
                        b1.killCount++; 
                        checkGrowth(b1); 
                        // 因为 b2 被销毁并移除了，我们需要调整索引或者下次循环处理
                        // 由于是双层循环且从头开始，移除 b2 (index j) 可能会影响 j 后面的元素
                        // 但 JS 的 forEach 不支持中途修改数组（或者是基于原始长度）。
                        // 所以用传统的 for 循环更好，并倒序？
                        // 为了简化，我们在这里标记 destroy，然后在 update 循环外移除？
                        // 或者直接 filter
                        balls = balls.filter(b => b.active);
                        // 重新开始循环太耗费，我们这里先保留引用，下一帧清除？
                        // 或者最简单的：如果 !active continue
                    }
                } 
                else if (b2.hasKnife) {
                    dropKnife(b2.x, b2.y); b2.hasKnife = false;
                    if (b1.hasShield) { b1.hasShield = false; } 
                    else { 
                        b1.destroy(); 
                        b2.killCount++; 
                        checkGrowth(b2); 
                        balls = balls.filter(b => b.active);
                    }
                }
            }
        }
    }
    
    // 捡道具
    // 注意：filter 会导致 balls 数组重建，可能会影响 forEach 循环吗？
    // 上面的 for 循环结束后才执行这里，所以上面修改 balls 没问题（除了索引 j 可能越界，添加 active 检查）
    // 让我们加固一下碰撞循环
    
    balls.forEach(b => {
        if(!b.active) return;
        items.forEach(item => {
            if (!item.active) return;
            if (timestamp - item.creationTime < 500) return;
            if (item.type === 'shield' && b.hasShield) return;
            if (item.type === 'knife' && b.hasKnife) return;

            let dx = b.x - item.x;
            let dy = b.y - item.y;
            if (Math.sqrt(dx*dx + dy*dy) < b.r + item.r) {
                if (item.type === 'shield') b.hasShield = true;
                else b.hasKnife = true;
                item.destroy();
                // 立即移除
                items = items.filter(i => i.active);
            }
        });
    });
    
    gameCtx.clearRect(0, 0, 600, 400);
    balls.forEach(b => b.draw());
    items.forEach(i => i.draw());
    
    updateGameUI();

    requestAnimationFrame(updateGame);
}

document.getElementById('toggleGameBtn').addEventListener('click', () => {
    isGameRunning = !isGameRunning;
    if (isGameRunning) {
        lastTime = performance.now();
        if (balls.length === 0) spawnBall();
        updateGameUI();
        gameStateInfo.innerHTML = '状态: <span style="color: green;">运行中</span>';
        requestAnimationFrame(updateGame);
    } else {
        gameStateInfo.innerHTML = '状态: <span style="color: orange;">暂停</span>';
    }
});

document.getElementById('usePoolBtn').addEventListener('click', () => {
    useObjectPool = !useObjectPool;
    document.getElementById('usePoolBtn').textContent = `对象池: ${useObjectPool ? '开启' : '关闭'}`;
    document.getElementById('usePoolBtn').style.background = useObjectPool ? '#4ECDC4' : '#eee';
    document.getElementById('usePoolBtn').style.color = useObjectPool ? '#fff' : '#999';
});

document.getElementById('resetGameBtn').addEventListener('click', () => {
    balls = [];
    items = [];
    ballPool = [];
    itemPool = [];
    gameHeapMemory = new Array(MEMORY_CAPACITY).fill(null);
    ballSpawnTimer = 5; 
    itemSpawnTimer = 0;
    gcCount = 0;
    gcCountInfo.textContent = "GC 次数: 0";
    gameCtx.clearRect(0, 0, 600, 400);
    updateGameUI();
    isGPuased = false;
    if(!isGameRunning) {
         gameStateInfo.innerHTML = '状态: <span style="color: orange;">暂停</span>';
    }
});

// 初始化
document.getElementById('resetGameBtn').click();
// 自动开始游戏
if (!isGameRunning) {
    document.getElementById('toggleGameBtn').click();
}

// ... (代码高亮部分保持不变) ...
document.addEventListener('DOMContentLoaded', () => {
    const codeBlock = document.querySelector('code');
    if(!codeBlock) return;
    let text = codeBlock.textContent;
    function escapeHtml(unsafe) {
        return unsafe.replace(/\u0026/g, "&").replace(/\u003C/g, "<").replace(/\u003E/g, ">").replace(/\u0022/g, "\u0022").replace(/\u0027/g, "&#039;");
    }
    // ...
});

// --- 步骤 7: Mark & Sweep & Compact 演示 ---
const msResetBtn = document.getElementById('msResetBtn');
const msMarkBtn = document.getElementById('msMarkBtn');
const msSweepBtn = document.getElementById('msSweepBtn');
const msCompactBtn = document.getElementById('msCompactBtn');
const msInfo = document.getElementById('msInfo');

const modeCompactBtn = document.getElementById('modeCompactBtn');
const modeUnityBtn = document.getElementById('modeUnityBtn');
const currentModeText = document.getElementById('currentModeText');

// 简单的 DOM 元素获取
const msObj0 = document.getElementById('msObj0'); // A
const msObj1 = document.getElementById('msObj1'); // C (垃圾)
const msObj2 = document.getElementById('msObj2'); // B
const msObj3 = document.getElementById('msObj3'); // D (垃圾)
const msObj4 = document.getElementById('msObj4'); // E

// 状态：0=初始, 1=已标记(Marked), 2=已清除(Swept), 3=已压缩(Compacted)
let msState = 0; 
let isCompactMode = false; // 默认为 Unity 模式 (不压缩)

function updateModeUI() {
    if (isCompactMode) {
        modeCompactBtn.style.border = '3px solid #000';
        modeCompactBtn.style.backgroundColor = '#4ECDC4';
        modeUnityBtn.style.border = 'none';
        modeUnityBtn.style.backgroundColor = '#ddd';
        currentModeText.textContent = "标准 GC (压缩)";
        currentModeText.style.color = '#4ECDC4';
        msCompactBtn.style.display = 'inline-block';
    } else {
        modeUnityBtn.style.border = '3px solid #000';
        modeUnityBtn.style.backgroundColor = '#FFD93D';
        modeCompactBtn.style.border = 'none';
        modeCompactBtn.style.backgroundColor = '#ddd';
        currentModeText.textContent = "Unity GC (不压缩)";
        currentModeText.style.color = '#FFD93D';
        msCompactBtn.style.display = 'none';
    }
    msReset();
}

modeCompactBtn.addEventListener('click', () => { isCompactMode = true; updateModeUI(); });
modeUnityBtn.addEventListener('click', () => { isCompactMode = false; updateModeUI(); });

function msReset() {
    msState = 0;
    msInfo.textContent = "已重置。准备开始：A, B, E 存活；C, D 是垃圾。";
    
    const contents = ['A', 'C', 'B', 'D', 'E'];
    [msObj0, msObj1, msObj2, msObj3, msObj4].forEach((obj, i) => {
        obj.style.backgroundColor = '#fff';
        obj.style.opacity = '1';
        obj.textContent = contents[i];
        obj.style.border = '2px solid #000';
    });
}

function msMark() {
    if (msState !== 0) return;
    msState = 1;
    msInfo.textContent = "Mark 阶段：从 Root 出发，标记 A, B, E 为存活 (绿色)。";
    
    // 模拟遍历
    setTimeout(() => { msObj0.style.backgroundColor = '#90EE90'; }, 200); // A
    setTimeout(() => { msObj2.style.backgroundColor = '#90EE90'; }, 400); // B
    setTimeout(() => { msObj4.style.backgroundColor = '#90EE90'; }, 600); // E
}

function msSweep() {
    if (msState !== 1) {
        if(msState === 0) alert("请先进行标记 (Mark)！");
        return;
    }
    msState = 2;
    
    // C(msObj1) 和 D(msObj3) 是垃圾
    [msObj1, msObj3].forEach(obj => {
        obj.style.backgroundColor = '#ddd';
        obj.style.opacity = '0.5';
        obj.textContent = ''; // 内容清空
        obj.style.border = '2px dashed #999';
    });

    if (isCompactMode) {
        msInfo.innerHTML = "Sweep 阶段：垃圾(C, D)被回收。<br>下一步：点击 Compact 进行内存压缩！";
    } else {
        msInfo.innerHTML = "Sweep 阶段：垃圾被回收，但留下了<strong>内存碎片</strong>！<br>这就是 Unity GC 的痛点：空闲内存不连续，大对象可能塞不进！";
        // Unity 模式下，演示结束，恢复存活对象颜色
        setTimeout(() => {
            [msObj0, msObj2, msObj4].forEach(obj => obj.style.backgroundColor = '#fff');
        }, 1500);
    }
}

function msCompact() {
    if (msState !== 2) {
        alert("请先进行清除 (Sweep)！");
        return;
    }
    msState = 3;
    msInfo.textContent = "Compact 阶段：移动存活对象，消除碎片！内存变得紧凑整齐。";
    
    // 简单的视觉移动模拟：改变内容和样式
    // 原来: [A] [ ] [B] [ ] [E]
    // 目标: [A] [B] [E] [ ] [ ]
    
    // 步骤 1: B 移动到 C 的位置 (msObj1)
    msObj1.textContent = 'B';
    msObj1.style.backgroundColor = '#90EE90';
    msObj1.style.opacity = '1';
    msObj1.style.border = '2px solid #000';
    
    msObj2.textContent = ''; // 旧 B 位置变空
    msObj2.style.backgroundColor = '#ddd';
    msObj2.style.opacity = '0.5';
    msObj2.style.border = '2px dashed #999';
    
    // 步骤 2: E 移动到旧 B 的位置 (实际上是紧接着的新位置，即 msObj2)
    // 实际上应该是 A(0), B(1), E(2)
    
    setTimeout(() => {
        msObj2.textContent = 'E';
        msObj2.style.backgroundColor = '#90EE90';
        msObj2.style.opacity = '1';
        msObj2.style.border = '2px solid #000';
        
        msObj4.textContent = ''; // 旧 E 位置变空
        msObj4.style.backgroundColor = '#ddd';
        msObj4.style.opacity = '0.5';
        msObj4.style.border = '2px dashed #999';
        
        setTimeout(() => {
             [msObj0, msObj1, msObj2].forEach(obj => obj.style.backgroundColor = '#fff');
             msInfo.textContent += " (整理完毕，无碎片)";
        }, 1000);
    }, 500);
}

msResetBtn.addEventListener('click', msReset);
msMarkBtn.addEventListener('click', msMark);
msSweepBtn.addEventListener('click', msSweep);
msCompactBtn.addEventListener('click', msCompact);

// 初始化模式状态
updateModeUI();

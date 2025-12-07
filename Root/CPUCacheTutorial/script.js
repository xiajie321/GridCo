// 1. 可视化演示：缓存行
const memoryGrid = document.getElementById('memoryGrid');
const cacheLineView = document.getElementById('cacheLine');
const hitCountEl = document.getElementById('hitCount');
const missCountEl = document.getElementById('missCount');
const resetDemoBtn = document.getElementById('resetDemoBtn');

let hitCount = 0;
let missCount = 0;
let currentCacheLine = -1;
const CACHE_LINE_SIZE = 4; // 假设缓存行大小为4个内存块
const TOTAL_BLOCKS = 32;

function initMemoryGrid() {
    memoryGrid.innerHTML = '';
    for (let i = 0; i < TOTAL_BLOCKS; i++) {
        const cell = document.createElement('div');
        cell.className = 'memory-cell';
        cell.textContent = i;
        cell.dataset.index = i;
        cell.addEventListener('click', () => accessMemory(i));
        memoryGrid.appendChild(cell);
    }
    resetStats();
}

function accessMemory(index) {
    const cells = memoryGrid.querySelectorAll('.memory-cell');
    
    // 清除之前的访问高亮
    cells.forEach(c => c.classList.remove('accessed'));
    cells[index].classList.add('accessed');
    
    // 计算所属的缓存行
    const cacheLineIndex = Math.floor(index / CACHE_LINE_SIZE);
    
    // 检查是否命中
    if (cacheLineIndex === currentCacheLine) {
        // Cache Hit
        hitCount++;
        hitCountEl.textContent = hitCount;
        showFeedback(true);
    } else {
        // Cache Miss
        missCount++;
        missCountEl.textContent = missCount;
        currentCacheLine = cacheLineIndex;
        updateCacheView(cacheLineIndex);
        highlightCachedCells(cacheLineIndex);
        showFeedback(false);
    }
}

function updateCacheView(lineIndex) {
    const start = lineIndex * CACHE_LINE_SIZE;
    cacheLineView.innerHTML = '';
    
    for (let i = 0; i < CACHE_LINE_SIZE; i++) {
        const block = document.createElement('div');
        block.className = 'cache-block pulse';
        block.textContent = start + i;
        cacheLineView.appendChild(block);
    }
}

function highlightCachedCells(lineIndex) {
    const cells = memoryGrid.querySelectorAll('.memory-cell');
    const start = lineIndex * CACHE_LINE_SIZE;
    
    cells.forEach(c => c.classList.remove('cached'));
    
    for (let i = 0; i < CACHE_LINE_SIZE; i++) {
        if (start + i < cells.length) {
            cells[start + i].classList.add('cached');
        }
    }
}

function showFeedback(isHit) {
    const feedback = document.createElement('div');
    feedback.textContent = isHit ? "Hit!" : "Miss!";
    feedback.style.position = 'fixed';
    feedback.style.left = '50%';
    feedback.style.top = '50%';
    feedback.style.transform = 'translate(-50%, -50%)';
    feedback.style.padding = '20px';
    feedback.style.background = isHit ? 'var(--cache-hit-color)' : 'var(--cache-miss-color)';
    feedback.style.color = 'white';
    feedback.style.borderRadius = '10px';
    feedback.style.fontSize = '2em';
    feedback.style.pointerEvents = 'none';
    feedback.style.zIndex = '1000';
    feedback.style.boxShadow = '0 0 20px rgba(0,0,0,0.5)';
    
    document.body.appendChild(feedback);
    
    setTimeout(() => {
        feedback.remove();
    }, 500);
}

function resetStats() {
    hitCount = 0;
    missCount = 0;
    hitCountEl.textContent = 0;
    missCountEl.textContent = 0;
    currentCacheLine = -1;
    cacheLineView.innerHTML = '<div class="cache-block">?</div><div class="cache-block">?</div><div class="cache-block">?</div><div class="cache-block">?</div>';
    const cells = memoryGrid.querySelectorAll('.memory-cell');
    cells.forEach(c => {
        c.classList.remove('accessed');
        c.classList.remove('cached');
    });
}

resetDemoBtn.addEventListener('click', resetStats);
initMemoryGrid();


// 2. 顺序 vs 随机 模拟
const runSequentialBtn = document.getElementById('runSequentialBtn');
const runRandomBtn = document.getElementById('runRandomBtn');
const simulationLog = document.getElementById('simulationLog');

function log(msg) {
    const p = document.createElement('div');
    p.textContent = msg;
    simulationLog.appendChild(p);
    simulationLog.scrollTop = simulationLog.scrollHeight;
}

function runSimulation(type) {
    simulationLog.innerHTML = '';
    log(`开始${type === 'seq' ? '顺序' : '随机'}访问模拟...`);
    
    const size = 100;
    let cacheLine = -1;
    let hits = 0;
    let misses = 0;
    const lineSize = 8; // 模拟更大的缓存行
    
    const accessSequence = [];
    if (type === 'seq') {
        for(let i=0; i<size; i++) accessSequence.push(i);
    } else {
        for(let i=0; i<size; i++) accessSequence.push(Math.floor(Math.random() * size));
    }
    
    let i = 0;
    const interval = setInterval(() => {
        if (i >= size) {
            clearInterval(interval);
            const rate = ((hits / size) * 100).toFixed(1);
            log(`=== 结果 ===`);
            log(`命中: ${hits}, 未命中: ${misses}`);
            log(`命中率: ${rate}%`);
            log(type === 'seq' ? "评价: 完美利用缓存！" : "评价: 缓存抖动严重！");
            return;
        }
        
        const addr = accessSequence[i];
        const line = Math.floor(addr / lineSize);
        
        if (line === cacheLine) {
            hits++;
            // log(`访问 ${addr}: Hit`);
        } else {
            misses++;
            cacheLine = line;
            log(`访问 ${addr}: Miss (加载行 ${line})`);
        }
        
        i++;
    }, 20); // 快速模拟
}

runSequentialBtn.addEventListener('click', () => runSimulation('seq'));
runRandomBtn.addEventListener('click', () => runSimulation('rnd'));

// 莫顿码教程脚本

// --- 工具函数 ---

// 将数字转换为二进制字符串，指定位数
function toBinary(num, bits) {
    return num.toString(2).padStart(bits, '0');
}

// 计算莫顿码 (交错位) - 简单循环实现用于教学
function interleaveBits(x, y) {
    let result = 0;
    for (let i = 0; i < 16; i++) {
        // 取 x 的第 i 位，放到结果的第 2i 位
        result |= (x & (1 << i)) << i;
        // 取 y 的第 i 位，放到结果的第 2i+1 位
        result |= (y & (1 << i)) << (i + 1);
    }
    return result;
}

// --- 步骤 1: 位交错演示 ---

const sliderX = document.getElementById('sliderX');
const sliderY = document.getElementById('sliderY');
const valX = document.getElementById('valX');
const valY = document.getElementById('valY');
const bitDisplay = document.getElementById('bitDisplay');
const mortonVal = document.getElementById('mortonVal');

function updateBitDisplay() {
    const x = parseInt(sliderX.value);
    const y = parseInt(sliderY.value);
    
    valX.textContent = x;
    valY.textContent = y;

    const binX = toBinary(x, 3);
    const binY = toBinary(y, 3);
    
    const mCode = interleaveBits(x, y);
    mortonVal.textContent = mCode;

    // 构建交错显示的 HTML
    let html = '';
    // 我们只展示低3位 (总共6位结果)，因为滑块最大是7 (111)
    // 莫顿码位顺序: Y2 X2 Y1 X1 Y0 X0
    for (let i = 2; i >= 0; i--) {
        const bitX = binX[2 - i]; // binX 是字符串，从左到右是高位到低位
        const bitY = binY[2 - i];
        
        html += `<span class="bit-y">${bitY}</span><span class="bit-x">${bitX}</span>`;
    }
    html += `<span style="color: #aaa; margin-left: 10px;"> = </span><span class="bit-val">${mCode}</span>`;
    
    bitDisplay.innerHTML = html;
}

if (sliderX && sliderY) {
    sliderX.addEventListener('input', updateBitDisplay);
    sliderY.addEventListener('input', updateBitDisplay);
    updateBitDisplay(); // 初始化
}

// --- 步骤 2: Z 曲线绘制 ---

const zCanvas = document.getElementById('zCurveCanvas');
const zCtx = zCanvas ? zCanvas.getContext('2d') : null;
const playZBtn = document.getElementById('playZBtn');
const resetZBtn = document.getElementById('resetZBtn');
let zAnimFrame = null;
let currentZIndex = 0;
const gridSize = 8;
const cellSize = 320 / gridSize;

function drawGrid(ctx, width, height) {
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for(let i=0; i<=gridSize; i++) {
        ctx.moveTo(i * cellSize, 0);
        ctx.lineTo(i * cellSize, height);
        ctx.moveTo(0, i * cellSize);
        ctx.lineTo(width, i * cellSize);
    }
    ctx.stroke();
}

function getXYFromMorton(code) {
    let x = 0;
    let y = 0;
    for (let i = 0; i < 16; i++) {
        x |= ((code >> (2 * i)) & 1) << i;
        y |= ((code >> (2 * i + 1)) & 1) << i;
    }
    return { x, y };
}

function drawZCurveStep() {
    if (!zCtx) return;

    // 绘制当前的连线
    if (currentZIndex > 0 && currentZIndex < gridSize * gridSize) {
        const prev = getXYFromMorton(currentZIndex - 1);
        const curr = getXYFromMorton(currentZIndex);
        
        zCtx.strokeStyle = '#FF6B6B';
        zCtx.lineWidth = 2;
        zCtx.beginPath();
        zCtx.moveTo(prev.x * cellSize + cellSize/2, prev.y * cellSize + cellSize/2);
        zCtx.lineTo(curr.x * cellSize + cellSize/2, curr.y * cellSize + cellSize/2);
        zCtx.stroke();
        
        // 画个小圆点
        zCtx.fillStyle = '#FF6B6B';
        zCtx.beginPath();
        zCtx.arc(curr.x * cellSize + cellSize/2, curr.y * cellSize + cellSize/2, 3, 0, Math.PI * 2);
        zCtx.fill();
    } else if (currentZIndex === 0) {
        // 第一个点
        const curr = getXYFromMorton(0);
        zCtx.fillStyle = '#FF6B6B';
        zCtx.beginPath();
        zCtx.arc(curr.x * cellSize + cellSize/2, curr.y * cellSize + cellSize/2, 3, 0, Math.PI * 2);
        zCtx.fill();
    }

    currentZIndex++;

    if (currentZIndex < gridSize * gridSize) {
        zAnimFrame = requestAnimationFrame(drawZCurveStep);
    }
}

function resetZCurve() {
    if (zAnimFrame) cancelAnimationFrame(zAnimFrame);
    currentZIndex = 0;
    if (zCtx) {
        zCtx.clearRect(0, 0, zCanvas.width, zCanvas.height);
        drawGrid(zCtx, zCanvas.width, zCanvas.height);
    }
}

if (playZBtn) {
    playZBtn.addEventListener('click', () => {
        resetZCurve();
        drawZCurveStep();
    });
}

if (resetZBtn) {
    resetZBtn.addEventListener('click', resetZCurve);
}

// 初始化 Z 曲线画布网格
if (zCtx) drawGrid(zCtx, zCanvas.width, zCanvas.height);


// --- 步骤 3: 交互式网格探索 ---

const gridContainer = document.getElementById('gridContainer');
const gridInfo = document.getElementById('gridInfo');

function initGridExplorer() {
    if (!gridContainer) return;

    gridContainer.innerHTML = ''; // 清空

    for (let i = 0; i < gridSize * gridSize; i++) {
        // 这里按普通行优先顺序生成 div，但我们要计算每个格子对应的莫顿码
        const row = Math.floor(i / gridSize);
        const col = i % gridSize;
        
        const cell = document.createElement('div');
        cell.className = 'grid-cell';
        
        const mCode = interleaveBits(col, row);
        cell.textContent = mCode;
        cell.dataset.mcode = mCode;
        cell.dataset.x = col;
        cell.dataset.y = row;

        cell.addEventListener('mouseenter', () => {
            cell.classList.add('active');
            const binStr = toBinary(mCode, 6);
            // 格式化二进制显示
            let coloredBin = '';
            for(let b=0; b<6; b++) {
                // 位顺序: Y2 X2 Y1 X1 Y0 X0
                // 索引: 0  1  2  3  4  5
                // 如果是偶数索引(0,2,4)则是Y位，奇数(1,3,5)是X位
                const bitVal = binStr[b];
                const isY = (b % 2 === 0);
                coloredBin += `<span class="${isY ? 'bit-y' : 'bit-x'}">${bitVal}</span>`;
            }

            gridInfo.innerHTML = `坐标: (${col}, ${row}) <br> 莫顿码: ${mCode} <br> 二进制: ${coloredBin}`;
        });

        cell.addEventListener('mouseleave', () => {
            cell.classList.remove('active');
            gridInfo.textContent = '把鼠标放在格子上...';
        });

        gridContainer.appendChild(cell);
    }
}

initGridExplorer();

// --- 步骤 4: 对比示例 ---

const rowCanvas = document.getElementById('rowMajorCanvas');
const zCompCanvas = document.getElementById('zOrderCompCanvas');
const compareBtn = document.getElementById('compareBtn');
const compareResult = document.getElementById('compareResult');

function drawComparison() {
    if (!rowCanvas || !zCompCanvas) return;
    
    const ctx1 = rowCanvas.getContext('2d');
    const ctx2 = zCompCanvas.getContext('2d');
    const w = 200, h = 200;
    const gs = 8; // Grid size for comparison
    const cs = w / gs;

    // 清空
    ctx1.clearRect(0,0,w,h);
    ctx2.clearRect(0,0,w,h);
    
    // 画网格线
    drawGrid(ctx1, w, h);
    drawGrid(ctx2, w, h);

    // 假设我们查询 (2,2) 到 (3,3) 的 2x2 区域
    const targetX = 2, targetY = 2;
    const targetW = 2, targetH = 2;

    ctx1.fillStyle = 'rgba(255, 0, 0, 0.3)';
    ctx2.fillStyle = 'rgba(0, 0, 255, 0.3)';

    // 标记区域
    ctx1.fillRect(targetX * cs, targetY * cs, targetW * cs, targetH * cs);
    ctx2.fillRect(targetX * cs, targetY * cs, targetW * cs, targetH * cs);

    return { ctx1, ctx2, cs };
}

drawComparison();

if (compareBtn) {
    compareBtn.addEventListener('click', () => {
        const { ctx1, ctx2, cs } = drawComparison();
        
        // 模拟访问
        let rowAccess = [];
        let zAccess = [];

        // 目标区域: (2,2), (3,2), (2,3), (3,3)
        // 对应索引：
        // Row: y*8 + x
        // (2,2)->18, (3,2)->19, (2,3)->26, (3,3)->27
        // 差值: 1, 7, 1
        
        // Z-Order:
        // (2,2)->12 (1100), (3,2)->13 (1101), (2,3)->14 (1110), (3,3)->15 (1111)
        // 差值: 1, 1, 1 -> 完美的连续！

        const points = [
            {x:2, y:2}, {x:3, y:2},
            {x:2, y:3}, {x:3, y:3}
        ];

        // 绘制访问顺序线
        ctx1.strokeStyle = 'red';
        ctx2.strokeStyle = 'blue';
        ctx1.lineWidth = 2;
        ctx2.lineWidth = 2;

        ctx1.beginPath();
        ctx2.beginPath();

        points.forEach((p, i) => {
            const centerX = p.x * cs + cs/2;
            const centerY = p.y * cs + cs/2;
            
            if (i === 0) {
                ctx1.moveTo(centerX, centerY);
                ctx2.moveTo(centerX, centerY);
            } else {
                ctx1.lineTo(centerX, centerY);
                ctx2.lineTo(centerX, centerY);
            }
            
            // 标记点
            ctx1.fillStyle = 'red';
            ctx1.fillRect(centerX-2, centerY-2, 4, 4);
            ctx2.fillStyle = 'blue';
            ctx2.fillRect(centerX-2, centerY-2, 4, 4);
        });

        ctx1.stroke();
        ctx2.stroke();

        compareResult.innerHTML = 
            `<strong>普通扫描索引:</strong> 18, 19, 26, 27 (最大跳跃 7)<br>` + 
            `<strong>莫顿码索引:</strong> 12, 13, 14, 15 (最大跳跃 1)<br>` + 
            `<span style="color:green; font-weight:bold;">结论: 莫顿码在此区域完全连续！缓存极度友好！</span>`;
    });
}

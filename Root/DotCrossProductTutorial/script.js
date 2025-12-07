/**
 * 向量点乘与叉乘 互动演示
 */

const canvas = document.getElementById('vector-canvas');
const ctx = canvas.getContext('2d');

// 控件
const btnDot = document.querySelector('[data-mode="dot"]');
const btnCross = document.querySelector('[data-mode="cross"]');
const resultBox = document.getElementById('result-display');

let currentMode = 'dot';
let origin = { x: 400, y: 200 };
let vecA = { x: 550, y: 150 }; // 红色向量终点
let vecB = { x: 500, y: 300 }; // 蓝色向量终点
let dragging = null;
const PIXELS_PER_UNIT = 50; // 50像素代表1个单位长度

// 向量计算辅助
function getVector(end) {
    return { x: end.x - origin.x, y: end.y - origin.y };
}

function magnitude(v) {
    return Math.sqrt(v.x * v.x + v.y * v.y);
}

function normalize(v) {
    let m = magnitude(v);
    return m === 0 ? { x: 0, y: 0 } : { x: v.x / m, y: v.y / m };
}

function dotProduct(a, b) {
    return a.x * b.x + a.y * b.y;
}

function crossProduct2D(a, b) {
    return a.x * b.y - a.y * b.x;
}

function drawArrow(from, to, color, width = 3) {
    let headlen = 15;
    let angle = Math.atan2(to.y - from.y, to.x - from.x);
    
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(to.x - headlen * Math.cos(angle - Math.PI / 6), to.y - headlen * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(to.x - headlen * Math.cos(angle + Math.PI / 6), to.y - headlen * Math.sin(angle + Math.PI / 6));
    ctx.fillStyle = color;
    ctx.fill();
}

function drawPoint(p, color) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 绘制网格
    ctx.strokeStyle = '#f0f0f0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = origin.x % PIXELS_PER_UNIT; x < canvas.width; x += PIXELS_PER_UNIT) {
        ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height);
    }
    for (let y = origin.y % PIXELS_PER_UNIT; y < canvas.height; y += PIXELS_PER_UNIT) {
        ctx.moveTo(0, y); ctx.lineTo(canvas.width, y);
    }
    ctx.stroke();

    // 绘制坐标轴
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, origin.y); ctx.lineTo(canvas.width, origin.y);
    ctx.moveTo(origin.x, 0); ctx.lineTo(origin.x, canvas.height);
    ctx.stroke();

    // 获取向量（注意 Y 轴翻转，Canvas Y 向下为正，数学通常向上）
    // 为了直观，我们直接用屏幕坐标计算，但解释时需注意方向
    let vA = getVector(vecA);
    let vB = getVector(vecB);

    // 归一化向量用于点乘投影显示
    let nA = normalize(vA);
    let nB = normalize(vB);

    if (currentMode === 'dot') {
        // 点乘计算
        // 使用屏幕坐标系，但为了符合数学直觉，Y轴取反计算数值会更符合习惯
        // 不过这里演示的是几何关系，直接用屏幕坐标也行
        // A · B
        let dot = dotProduct(vA, vB);
        
        // 数值显示优化：转换为单位坐标系 (除以 scale 的平方)
        let displayDot = dot / (PIXELS_PER_UNIT * PIXELS_PER_UNIT);

        // 计算投影长度 (A 在 B 上的投影)
        let projLen = dot / magnitude(vB);
        let projVec = { x: nB.x * projLen, y: nB.y * projLen };
        let projEnd = { x: origin.x + projVec.x, y: origin.y + projVec.y };

        // 绘制投影线
        ctx.setLineDash([5, 5]);
        ctx.strokeStyle = '#999';
        ctx.beginPath();
        ctx.moveTo(vecA.x, vecA.y);
        ctx.lineTo(projEnd.x, projEnd.y);
        ctx.stroke();
        ctx.setLineDash([]);

        // 绘制投影向量 (绿色)
        drawArrow(origin, projEnd, '#4CAF50', 4);

        // 更新结果文本
        // 归一化点乘结果更直观 (-1 到 1)
        let dotNorm = dotProduct(nA, nB);
        let angle = Math.acos(Math.max(-1, Math.min(1, dotNorm))) * 180 / Math.PI;
        
        resultBox.innerHTML = `
            <strong>点乘结果 (A·B):</strong> ${displayDot.toFixed(2)} <span style="color:#999;font-size:0.8em">(基于网格单位)</span><br>
            <strong>归一化结果:</strong> ${dotNorm.toFixed(2)}<br>
            <strong>夹角:</strong> ${Math.round(angle)}°<br>
            ${dotNorm > 0 ? "方向基本一致 (锐角)" : dotNorm < 0 ? "方向相反 (钝角)" : "垂直 (90°)"}
        `;

    } else if (currentMode === 'cross') {
        // 叉乘计算 (2D 伪叉乘)
        // 结果是 Z 轴分量，代表面积
        let crossZ = crossProduct2D(vA, vB);
        let displayCross = crossZ / (PIXELS_PER_UNIT * PIXELS_PER_UNIT);
        
        // 绘制平行四边形
        let pSum = { x: origin.x + vA.x + vB.x, y: origin.y + vA.y + vB.y };
        
        ctx.fillStyle = 'rgba(33, 150, 243, 0.2)'; // 半透明蓝
        ctx.beginPath();
        ctx.moveTo(origin.x, origin.y);
        ctx.lineTo(vecA.x, vecA.y);
        ctx.lineTo(pSum.x, pSum.y);
        ctx.lineTo(vecB.x, vecB.y);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#2196F3';
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);

        // 更新结果文本
        resultBox.innerHTML = `
            <strong>叉乘结果 (Z轴分量):</strong> ${displayCross.toFixed(2)} <span style="color:#999;font-size:0.8em">(基于网格单位)</span><br>
            <strong>几何意义:</strong> 平行四边形面积<br>
            <strong>方向判断:</strong> ${displayCross > 0 ? "B 在 A 的左侧 (逆时针)" : "B 在 A 的右侧 (顺时针)"}
        `;
    }

    // 绘制原始向量
    drawArrow(origin, vecA, '#FF6B6B'); // A 红色
    drawArrow(origin, vecB, '#00BCD4'); // B 蓝色
    
    // 绘制拖动点
    drawPoint(vecA, '#FF6B6B');
    drawPoint(vecB, '#00BCD4');

    // 标签
    ctx.fillStyle = '#FF6B6B';
    ctx.font = 'bold 16px Arial';
    ctx.fillText("A", vecA.x + 10, vecA.y);
    
    ctx.fillStyle = '#00BCD4';
    ctx.fillText("B", vecB.x + 10, vecB.y);
}

// 交互
function setMode(mode) {
    currentMode = mode;
    btnDot.classList.toggle('active', mode === 'dot');
    btnCross.classList.toggle('active', mode === 'cross');
    draw();
}

btnDot.addEventListener('click', () => setMode('dot'));
btnCross.addEventListener('click', () => setMode('cross'));

// 鼠标拖拽逻辑
function getDist(p1, p2) {
    let dx = p1.x - p2.x;
    let dy = p1.y - p2.y;
    return Math.sqrt(dx*dx + dy*dy);
}

function getMousePos(e) {
    const rect = canvas.getBoundingClientRect();
    // 计算缩放比例 (Canvas 内部分辨率 / CSS 显示尺寸)
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
    };
}

canvas.addEventListener('mousedown', (e) => {
    let mouse = getMousePos(e);

    // 增加判定半径到 30，更容易选中
    if (getDist(mouse, vecA) < 30) dragging = 'A';
    else if (getDist(mouse, vecB) < 30) dragging = 'B';
});

window.addEventListener('mousemove', (e) => {
    if (dragging) {
        let mouse = getMousePos(e);
        
        // 限制在画布范围内
        mouse.x = Math.max(0, Math.min(canvas.width, mouse.x));
        mouse.y = Math.max(0, Math.min(canvas.height, mouse.y));

        if (dragging === 'A') vecA = mouse;
        else if (dragging === 'B') vecB = mouse;
        
        draw();
    }
});

window.addEventListener('mouseup', () => {
    dragging = null;
});

canvas.addEventListener('mouseup', () => {
    dragging = null;
});

// 启动
draw();

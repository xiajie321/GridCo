/**
 * 贝塞尔曲线与线性插值 互动演示
 */

const canvas = document.getElementById('bezier-canvas');
const ctx = canvas.getContext('2d');

// 控件
const btnLerp = document.querySelector('[data-mode="lerp"]');
const btnQuad = document.querySelector('[data-mode="quad"]');
const btnCubic = document.querySelector('[data-mode="cubic"]');
const rangeT = document.getElementById('range-t');
const valT = document.getElementById('val-t');
const checkAuto = document.getElementById('check-auto');
const checkLines = document.getElementById('check-lines');
const modeDesc = document.getElementById('mode-desc');

let currentMode = 'lerp';
let t = 0.5;
let autoDirection = 1;
let points = [];
let draggingPoint = null;

// 初始化点
function initPoints() {
    if (currentMode === 'lerp') {
        points = [
            { x: 100, y: 300, color: '#FF6B6B', label: 'P0' }, // 起点
            { x: 700, y: 100, color: '#FF6B6B', label: 'P1' }  // 终点
        ];
    } else if (currentMode === 'quad') {
        points = [
            { x: 100, y: 300, color: '#FF6B6B', label: 'P0' },
            { x: 400, y: 50, color: '#00BCD4', label: 'P1 (控制点)' }, // 控制点
            { x: 700, y: 300, color: '#FF6B6B', label: 'P2' }
        ];
    } else if (currentMode === 'cubic') {
        points = [
            { x: 100, y: 300, color: '#FF6B6B', label: 'P0' },
            { x: 250, y: 50, color: '#00BCD4', label: 'P1' }, // 控制点1
            { x: 550, y: 50, color: '#00BCD4', label: 'P2' }, // 控制点2
            { x: 700, y: 300, color: '#FF6B6B', label: 'P3' }
        ];
    }
}

// 线性插值函数
function lerp(a, b, t) {
    return {
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t
    };
}

// 绘制点
function drawPoint(p, radius = 6) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = p.color || '#333';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    if (p.label) {
        ctx.fillStyle = '#333';
        ctx.font = '12px Arial';
        ctx.fillText(p.label, p.x + 10, p.y - 10);
    }
}

// 绘制线
function drawLine(a, b, color = '#ccc', width = 2, dashed = false) {
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    if (dashed) ctx.setLineDash([5, 5]);
    ctx.stroke();
    ctx.setLineDash([]);
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 绘制控制线 (P0-P1-P2...)
    if (checkLines.checked) {
        for (let i = 0; i < points.length - 1; i++) {
            drawLine(points[i], points[i+1], '#ddd', 2, true);
        }
    }

    // 计算中间点和曲线
    let finalPoint = null;

    if (currentMode === 'lerp') {
        // Lerp: 直接在 P0-P1 连线上
        finalPoint = lerp(points[0], points[1], t);
        
        // 绘制轨迹
        drawLine(points[0], points[1], '#333', 1);
        
        // 绘制进度部分
        drawLine(points[0], finalPoint, '#FFD93D', 4);

    } else if (currentMode === 'quad') {
        // 二次贝塞尔: De Casteljau
        // 第一层
        let q0 = lerp(points[0], points[1], t);
        let q1 = lerp(points[1], points[2], t);
        
        // 第二层 (最终点)
        finalPoint = lerp(q0, q1, t);

        // 绘制曲线
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for(let i=0; i<=100; i++) {
            let tempT = i / 100;
            let tempQ0 = lerp(points[0], points[1], tempT);
            let tempQ1 = lerp(points[1], points[2], tempT);
            let p = lerp(tempQ0, tempQ1, tempT);
            ctx.lineTo(p.x, p.y);
        }
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.stroke();

        // 绘制辅助线 Q0-Q1
        if (checkLines.checked) {
            drawLine(q0, q1, '#4CAF50', 2);
            drawPoint(q0, 4);
            drawPoint(q1, 4);
        }

    } else if (currentMode === 'cubic') {
        // 三次贝塞尔
        // 第一层
        let q0 = lerp(points[0], points[1], t);
        let q1 = lerp(points[1], points[2], t);
        let q2 = lerp(points[2], points[3], t);
        
        // 第二层
        let r0 = lerp(q0, q1, t);
        let r1 = lerp(q1, q2, t);
        
        // 第三层 (最终点)
        finalPoint = lerp(r0, r1, t);

        // 绘制曲线
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for(let i=0; i<=100; i++) {
            let tempT = i / 100;
            // 简单起见，这里直接用公式算曲线轨迹
            let u = 1 - tempT;
            let tt = tempT * tempT;
            let uu = u * u;
            let uuu = uu * u;
            let ttt = tt * tempT;
            let p = {
                x: uuu * points[0].x + 3 * uu * tempT * points[1].x + 3 * u * tt * points[2].x + ttt * points[3].x,
                y: uuu * points[0].y + 3 * uu * tempT * points[1].y + 3 * u * tt * points[2].y + ttt * points[3].y
            };
            ctx.lineTo(p.x, p.y);
        }
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.stroke();

        // 绘制辅助线
        if (checkLines.checked) {
            drawLine(q0, q1, '#4CAF50', 1);
            drawLine(q1, q2, '#4CAF50', 1);
            drawLine(r0, r1, '#2196F3', 2);
            
            drawPoint(q0, 3); drawPoint(q1, 3); drawPoint(q2, 3);
            drawPoint(r0, 4); drawPoint(r1, 4);
        }
    }

    // 绘制控制点
    points.forEach(p => drawPoint(p, 8));

    // 绘制最终点
    if (finalPoint) {
        ctx.beginPath();
        ctx.arc(finalPoint.x, finalPoint.y, 10, 0, Math.PI * 2);
        ctx.fillStyle = '#FFD93D';
        ctx.fill();
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
}

// 动画循环
function animate() {
    if (checkAuto.checked) {
        t += 0.005 * autoDirection;
        if (t > 1) { t = 1; autoDirection = -1; }
        if (t < 0) { t = 0; autoDirection = 1; }
        
        // 更新 UI
        rangeT.value = t;
        valT.textContent = t.toFixed(2);
    }
    
    draw();
    requestAnimationFrame(animate);
}

// 交互逻辑
function setMode(mode) {
    currentMode = mode;
    [btnLerp, btnQuad, btnCubic].forEach(btn => btn.classList.remove('active'));
    
    if (mode === 'lerp') {
        btnLerp.classList.add('active');
        modeDesc.innerHTML = "<strong>Lerp:</strong> 线性插值是两点间的最短路径。t=0 在起点，t=1 在终点。";
    } else if (mode === 'quad') {
        btnQuad.classList.add('active');
        modeDesc.innerHTML = "<strong>二次贝塞尔:</strong> 引入一个控制点 P1。曲线受到 P1 的'引力'吸引，但通常不会经过它。";
    } else if (mode === 'cubic') {
        btnCubic.classList.add('active');
        modeDesc.innerHTML = "<strong>三次贝塞尔:</strong> 两个控制点。可以形成 S 形等更复杂的曲线。Photoshop 的钢笔工具就是这个原理。";
    }
    
    initPoints();
}

// 鼠标拖拽
canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // 寻找最近的点
    for (let p of points) {
        let dx = x - p.x;
        let dy = y - p.y;
        if (dx*dx + dy*dy < 200) { // 半径10左右
            draggingPoint = p;
            checkAuto.checked = false; // 拖动时停止自动播放
            break;
        }
    }
});

canvas.addEventListener('mousemove', (e) => {
    if (draggingPoint) {
        const rect = canvas.getBoundingClientRect();
        draggingPoint.x = e.clientX - rect.left;
        draggingPoint.y = e.clientY - rect.top;
    }
});

canvas.addEventListener('mouseup', () => {
    draggingPoint = null;
});

// UI 绑定
btnLerp.addEventListener('click', () => setMode('lerp'));
btnQuad.addEventListener('click', () => setMode('quad'));
btnCubic.addEventListener('click', () => setMode('cubic'));

rangeT.addEventListener('input', (e) => {
    t = parseFloat(e.target.value);
    valT.textContent = t.toFixed(2);
    checkAuto.checked = false;
});

// 启动
initPoints();
animate();

/**
 * 三角函数 互动演示
 */

const canvas = document.getElementById('trig-canvas');
const ctx = canvas.getContext('2d');

// 控件
const rangeAngle = document.getElementById('range-angle');
const valAngle = document.getElementById('val-angle');
const checkWave = document.getElementById('check-wave');
const btn3D = document.getElementById('btn-3d');
const checkPause = document.getElementById('check-pause');

let angleDeg = 0;
let radius = 120;
let centerX = 200;
let centerY = 200;
let dragging = false;
let is3DMode = false;

// 波形数据
let waveData = [];
const maxWavePoints = 400;

function toRad(deg) {
    return deg * Math.PI / 180;
}

function updateWave() {
    let rad = toRad(angleDeg);
    waveData.push({
        angle: angleDeg,
        sin: Math.sin(rad),
        cos: Math.cos(rad)
    });
    
    if (waveData.length > maxWavePoints) {
        waveData.shift();
    }
}

// ================= 2D 绘制逻辑 =================

function drawGrid() {
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(centerX - radius - 20, centerY);
    ctx.lineTo(centerX + radius + 20, centerY);
    ctx.moveTo(centerX, centerY - radius - 20);
    ctx.lineTo(centerX, centerY + radius + 20);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.stroke();
}

function drawTrig() {
    let rad = toRad(angleDeg);
    let x = Math.cos(rad) * radius;
    let y = Math.sin(rad) * radius; 
    let px = centerX + x;
    let py = centerY - y; 

    // Cos 线 (蓝)
    ctx.beginPath();
    ctx.moveTo(centerX, py);
    ctx.lineTo(px, py);
    ctx.strokeStyle = '#2196F3'; 
    ctx.lineWidth = 4;
    ctx.stroke();

    // Sin 线 (红)
    ctx.beginPath();
    ctx.moveTo(px, centerY);
    ctx.lineTo(px, py);
    ctx.strokeStyle = '#FF6B6B'; 
    ctx.lineWidth = 4;
    ctx.stroke();

    // 半径线
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(px, py);
    ctx.strokeStyle = '#999';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Tan 线 (绿)
    let tanY = Math.tan(rad) * radius;
    if (Math.abs(tanY) < 1000) {
        ctx.beginPath();
        ctx.moveTo(centerX + radius, centerY);
        ctx.lineTo(centerX + radius, centerY - tanY);
        ctx.strokeStyle = '#4CAF50'; 
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
        
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(centerX + radius, centerY - tanY);
        ctx.strokeStyle = '#4CAF50';
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    // 点
    ctx.beginPath();
    ctx.arc(px, py, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#FFD93D'; 
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 文字
    ctx.font = '14px Consolas';
    ctx.fillStyle = '#2196F3';
    ctx.fillText(`Cos: ${Math.cos(rad).toFixed(2)}`, 10, 20);
    ctx.fillStyle = '#FF6B6B';
    ctx.fillText(`Sin: ${Math.sin(rad).toFixed(2)}`, 10, 40);
    ctx.fillStyle = '#4CAF50';
    let tanVal = Math.tan(rad).toFixed(2);
    if (Math.abs(Math.tan(rad)) > 10) tanVal = "Inf";
    ctx.fillText(`Tan: ${tanVal}`, 10, 60);
}

function drawWaves() {
    if (!checkWave.checked) return;

    let startX = 450;
    let width = 300;
    let zeroY = centerY;
    
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(startX, zeroY); ctx.lineTo(startX + width, zeroY);
    ctx.moveTo(startX, zeroY - radius); ctx.lineTo(startX, zeroY + radius);
    ctx.stroke();

    ctx.beginPath();
    for (let i = 0; i < waveData.length; i++) {
        let x = startX + width - i; 
        let y = zeroY - waveData[waveData.length - 1 - i].sin * (radius * 0.5); 
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = '#FF6B6B';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    for (let i = 0; i < waveData.length; i++) {
        let x = startX + width - i;
        let y = zeroY - waveData[waveData.length - 1 - i].cos * (radius * 0.5);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = '#2196F3';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    ctx.fillStyle = '#666';
    ctx.font = '12px Arial';
    ctx.fillText("Time ->", startX + width - 40, zeroY + 20);
}

// ================= 3D 绘制逻辑 =================

function draw3D() {
    // 简单的 3D 投影 (斜二测)
    // X轴向右, Y轴向上, Z轴向深处(左下)
    let originX = 200;
    let originY = 300;
    let scale = 0.8;
    
    // 投影函数 (x, y, z) -> (screenX, screenY)
    // 我们把 Sin/Cos 圆放在 XY 平面上，Z 轴作为时间轴
    function project3D(x, y, z) {
        // 透视或者正交，这里用简单的伪3D
        // Z轴延伸向右侧，展示时间流逝
        let px = originX + z * 1.5 + x * 0.5; // Z轴拉长，X轴有一点透视
        let py = originY - y - x * 0.3; // Y轴向上，X轴有一点透视
        return { x: px, y: py };
    }

    // 绘制坐标轴
    let axisLen = 300;
    let o = project3D(0, 0, 0);
    let xEnd = project3D(radius * 1.5, 0, 0);
    let yEnd = project3D(0, radius * 1.5, 0);
    let zEnd = project3D(0, 0, maxWavePoints); // Z轴向右延伸

    ctx.strokeStyle = '#999';
    ctx.lineWidth = 1;
    
    // Z轴 (时间)
    ctx.beginPath(); ctx.moveTo(o.x, o.y); ctx.lineTo(zEnd.x, zEnd.y); ctx.stroke();
    ctx.fillStyle = '#666'; ctx.fillText("Time (Z)", zEnd.x + 5, zEnd.y);

    // X轴 (Cos)
    ctx.beginPath(); ctx.moveTo(o.x, o.y); ctx.lineTo(xEnd.x, xEnd.y); ctx.strokeStyle = '#2196F3'; ctx.stroke();
    ctx.fillStyle = '#2196F3'; ctx.fillText("Cos (X)", xEnd.x + 5, xEnd.y);

    // Y轴 (Sin)
    ctx.beginPath(); ctx.moveTo(o.x, o.y); ctx.lineTo(yEnd.x, yEnd.y); ctx.strokeStyle = '#FF6B6B'; ctx.stroke();
    ctx.fillStyle = '#FF6B6B'; ctx.fillText("Sin (Y)", yEnd.x + 5, yEnd.y);

    // 绘制螺旋线
    ctx.beginPath();
    for (let i = 0; i < waveData.length; i++) {
        let data = waveData[waveData.length - 1 - i];
        // z = i
        // x = cos * radius
        // y = sin * radius
        let p = project3D(data.cos * radius, data.sin * radius, i);
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
    }
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 绘制当前切面 (圆)
    if (waveData.length > 0) {
        let current = waveData[waveData.length - 1];
        let curP = project3D(current.cos * radius, current.sin * radius, 0);
        
        // 当前点
        ctx.beginPath();
        ctx.arc(curP.x, curP.y, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#FFD93D';
        ctx.fill();
        
        // 连线到轴 (Sin/Cos 投影)
        let z0 = 0;
        let projX = project3D(current.cos * radius, 0, z0); // 在 X 轴上的投影点? 不对，是在 XZ 平面上的投影
        let projY = project3D(0, current.sin * radius, z0); // 在 YZ 平面上的投影
        let originP = project3D(0, 0, z0);

        // Sin 线 (红色，垂直高度)
        ctx.beginPath();
        ctx.moveTo(curP.x, curP.y);
        ctx.lineTo(projX.x, projX.y); // 连到 X轴投影点，这根线的长度代表 Y (Sin)
        ctx.strokeStyle = '#FF6B6B';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Cos 线 (蓝色，水平偏移)
        ctx.beginPath();
        ctx.moveTo(curP.x, curP.y);
        ctx.lineTo(projY.x, projY.y); // 连到 Y轴投影点，这根线的长度代表 X (Cos)
        ctx.strokeStyle = '#2196F3';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        // 为了看清螺旋，绘制阴影/投影线到墙面上
        // Sin 投影 (在 YZ 平面)
        ctx.beginPath();
        for (let i = 0; i < waveData.length; i++) {
            let d = waveData[waveData.length - 1 - i];
            // x = 0
            let p = project3D(0, d.sin * radius, i);
            if (i===0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
        }
        ctx.strokeStyle = 'rgba(255, 107, 107, 0.3)'; // 淡红
        ctx.lineWidth = 1;
        ctx.stroke();

        // Cos 投影 (在 XZ 平面)
        ctx.beginPath();
        for (let i = 0; i < waveData.length; i++) {
            let d = waveData[waveData.length - 1 - i];
            // y = 0
            let p = project3D(d.cos * radius, 0, i);
            if (i===0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
        }
        ctx.strokeStyle = 'rgba(33, 150, 243, 0.3)'; // 淡蓝
        ctx.lineWidth = 1;
        ctx.stroke();
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (is3DMode) {
        draw3D();
    } else {
        drawGrid();
        drawTrig();
        drawWaves();
    }
}

function animate() {
    // 如果没有拖拽，且没有暂停，自动旋转
    if (!dragging && !checkPause.checked) {
        // 自动旋转以便观察 3D 螺旋生成
        angleDeg = (angleDeg + 1) % 360;
        // 如果在交互模式下，不要自动更新UI，以免干扰
        // 但为了演示螺旋，我们需要持续产生数据
        updateWave();
        
        // 仅在非拖拽时同步 UI，防止跳变
        if (!is3DMode) { // 3D模式下让它自动转比较好看
             // rangeAngle.value = angleDeg;
             // valAngle.textContent = Math.round(angleDeg);
        }
    }
    
    draw();
    requestAnimationFrame(animate);
}

// 交互
rangeAngle.addEventListener('input', (e) => {
    angleDeg = parseFloat(e.target.value);
    valAngle.textContent = angleDeg;
    // 手动拖动时不自动 updateWave，因为 updateWave 会 push 数据导致波形前进
    // 我们只在动画循环里 push，或者手动 push
    // 为了简单，这里暂不处理手动波形历史，只改变当前值
});

// 3D 切换
btn3D.addEventListener('click', () => {
    is3DMode = !is3DMode;
    btn3D.textContent = is3DMode ? "切换 2D 视图" : "切换 3D 视图";
    checkWave.disabled = is3DMode; // 3D模式强制显示波形原理
});

// 坐标映射函数
function getMousePos(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
    };
}

// 鼠标拖拽圆上的点
canvas.addEventListener('mousedown', (e) => {
    if (is3DMode) return; // 3D 模式暂不支持拖拽
    let m = getMousePos(e);
    
    let dx = m.x - centerX;
    let dy = m.y - centerY;
    let d = Math.sqrt(dx*dx + dy*dy);
    
    if (Math.abs(d - radius) < 30) {
        dragging = true;
        updateAngleFromMouse(m.x, m.y);
    }
});

window.addEventListener('mousemove', (e) => {
    if (dragging && !is3DMode) {
        let m = getMousePos(e);
        updateAngleFromMouse(m.x, m.y);
    }
});

window.addEventListener('mouseup', () => {
    dragging = false;
});

function updateAngleFromMouse(x, y) {
    let dx = x - centerX;
    let dy = centerY - y; 
    let rad = Math.atan2(dy, dx);
    if (rad < 0) rad += Math.PI * 2;
    angleDeg = rad * 180 / Math.PI;
    rangeAngle.value = angleDeg;
    valAngle.textContent = Math.round(angleDeg);
}

// 初始化波形
for(let i=0; i<maxWavePoints; i++) {
    updateWave();
}

animate();

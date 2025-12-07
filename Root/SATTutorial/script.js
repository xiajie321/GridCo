/**
 * 分离轴定理 (SAT) 互动演示
 */

const canvas = document.getElementById('sat-canvas');
const ctx = canvas.getContext('2d');
const statusBox = document.getElementById('collision-status');

// 形状类
class Polygon {
    constructor(vertices, color, x, y) {
        this.vertices = vertices.map(v => ({x: v.x + x, y: v.y + y}));
        this.color = color;
        this.pos = {x: x, y: y}; // 中心/参考点
    }

    move(dx, dy) {
        this.pos.x += dx;
        this.pos.y += dy;
        for (let v of this.vertices) {
            v.x += dx;
            v.y += dy;
        }
    }

    rotate(angle) {
        let cos = Math.cos(angle);
        let sin = Math.sin(angle);
        for (let v of this.vertices) {
            let dx = v.x - this.pos.x;
            let dy = v.y - this.pos.y;
            v.x = this.pos.x + (dx * cos - dy * sin);
            v.y = this.pos.y + (dx * sin + dy * cos);
        }
    }

    // 获取所有边的法线 (单位向量)
    getNormals() {
        let normals = [];
        for (let i = 0; i < this.vertices.length; i++) {
            let p1 = this.vertices[i];
            let p2 = this.vertices[(i + 1) % this.vertices.length];
            let edge = { x: p2.x - p1.x, y: p2.y - p1.y };
            // 法线：(-y, x)
            let normal = { x: -edge.y, y: edge.x };
            // 归一化
            let len = Math.sqrt(normal.x * normal.x + normal.y * normal.y);
            normals.push({ x: normal.x / len, y: normal.y / len });
        }
        return normals;
    }

    draw(isColliding) {
        ctx.beginPath();
        ctx.moveTo(this.vertices[0].x, this.vertices[0].y);
        for (let i = 1; i < this.vertices.length; i++) {
            ctx.lineTo(this.vertices[i].x, this.vertices[i].y);
        }
        ctx.closePath();
        ctx.fillStyle = isColliding ? '#FF5252' : this.color; // 碰撞变红
        ctx.fill();
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // 绘制中心点
        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, 4, 0, Math.PI*2);
        ctx.fillStyle = '#fff';
        ctx.fill();
    }
}

// 初始化两个形状
// 形状 A (矩形)
let polyA = new Polygon([
    {x: -50, y: -30}, {x: 50, y: -30}, {x: 50, y: 30}, {x: -50, y: 30}
], '#4CAF50', 200, 200);

// 形状 B (三角形)
let polyB = new Polygon([
    {x: 0, y: -50}, {x: 43, y: 25}, {x: -43, y: 25}
], '#2196F3', 500, 200);

let dragging = null;
let lastMouse = {x: 0, y: 0};

// SAT 检测核心
function checkSAT(a, b) {
    let axisList = [...a.getNormals(), ...b.getNormals()];
    let minOverlap = Infinity;
    let smallestAxis = null;
    let separationAxis = null;

    // 遍历所有轴
    for (let axis of axisList) {
        // 投影
        let pA = project(a, axis);
        let pB = project(b, axis);

        // 检查重叠
        if (!overlap(pA, pB)) {
            // 找到分离轴！没撞！
            return { colliding: false, axis: axis };
        } else {
            // 计算重叠量
            let o = getOverlap(pA, pB);
            if (o < minOverlap) {
                minOverlap = o;
                smallestAxis = axis;
            }
        }
    }

    // 所有轴都重叠 -> 撞了
    return { colliding: true, mtvAxis: smallestAxis, mtvMag: minOverlap };
}

function project(poly, axis) {
    let min = Infinity;
    let max = -Infinity;
    let minPoint = null;
    let maxPoint = null;
    for (let v of poly.vertices) {
        let dot = v.x * axis.x + v.y * axis.y;
        if (dot < min) { min = dot; minPoint = v; }
        if (dot > max) { max = dot; maxPoint = v; }
    }
    return { min, max, minPoint, maxPoint };
}

function overlap(a, b) {
    return !(a.max < b.min || b.max < a.min);
}

function getOverlap(a, b) {
    return Math.min(a.max, b.max) - Math.max(a.min, b.min);
}

// 辅助绘图
function drawAxisAndProjection(axis, a, b, isSeparating) {
    // 轴线画在屏幕中心，长一点
    let center = {x: 400, y: 200};
    let scale = 1000;
    
    // 绘制轴线
    ctx.beginPath();
    ctx.moveTo(center.x - axis.x * scale, center.y - axis.y * scale);
    ctx.lineTo(center.x + axis.x * scale, center.y + axis.y * scale);
    ctx.strokeStyle = isSeparating ? '#4CAF50' : '#ddd'; // 分离轴变绿
    ctx.lineWidth = isSeparating ? 4 : 1;
    ctx.stroke();

    // 总是绘制投影区间 (无论是分离轴还是MTV轴)
    let pA = project(a, axis);
    let pB = project(b, axis);
    
    // 增加偏移量，使投影更明显
    drawProjectionInterval(pA, axis, center, '#FF9800', 20);
    drawProjectionInterval(pB, axis, center, '#2196F3', -20);
}

function drawProjectionInterval(p, axis, center, color, offset) {
    // 修正：减去 center 在轴上的投影，以正确显示相对于 center 的位置
    let centerProj = center.x * axis.x + center.y * axis.y;
    let minVal = p.min - centerProj;
    let maxVal = p.max - centerProj;

    // 将投影值映射回屏幕坐标 (相对于 center)
    let start = { x: center.x + axis.x * minVal, y: center.y + axis.y * minVal };
    let end = { x: center.x + axis.x * maxVal, y: center.y + axis.y * maxVal };
    
    // 偏移
    let perp = { x: -axis.y, y: axis.x };
    let startDisp = { x: start.x + perp.x * offset, y: start.y + perp.y * offset };
    let endDisp = { x: end.x + perp.x * offset, y: end.y + perp.y * offset };

    // 绘制投影线
    ctx.beginPath();
    ctx.moveTo(startDisp.x, startDisp.y);
    ctx.lineTo(endDisp.x, endDisp.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = 8;
    ctx.stroke();

    // 绘制连接线 (虚线) - 帮助视觉定位
    ctx.save();
    ctx.setLineDash([5, 5]);
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#999';
    
    // 从 minPoint 到 startDisp
    ctx.beginPath();
    ctx.moveTo(p.minPoint.x, p.minPoint.y);
    ctx.lineTo(startDisp.x, startDisp.y);
    ctx.stroke();

    // 从 maxPoint 到 endDisp
    ctx.beginPath();
    ctx.moveTo(p.maxPoint.x, p.maxPoint.y);
    ctx.lineTo(endDisp.x, endDisp.y);
    ctx.stroke();
    ctx.restore();
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // SAT 检测
    let result = checkSAT(polyA, polyB);

    // 绘制轴 (为了不乱，只画分离轴或MTV轴)
    if (!result.colliding) {
        drawAxisAndProjection(result.axis, polyA, polyB, true);
        statusBox.innerHTML = `状态：<span style="color:green">未碰撞</span> (找到分离轴)`;
        statusBox.style.borderColor = "green";
    } else {
        // 如果碰撞，画出推开方向
        // 简单画一条线示意 MTV
        drawAxisAndProjection(result.mtvAxis, polyA, polyB, false);
        statusBox.innerHTML = `状态：<span style="color:red">碰撞！</span> (最小重叠: ${result.mtvMag.toFixed(1)})`;
        statusBox.style.borderColor = "red";
        
        // 绘制 MTV 箭头
        let centerA = polyA.pos;
        // 简化方向判断：需要推开 A
        // 这里只是演示，严谨的 MTV 需要判断方向
        ctx.beginPath();
        ctx.moveTo(centerA.x, centerA.y);
        ctx.lineTo(centerA.x + result.mtvAxis.x * 50, centerA.y + result.mtvAxis.y * 50);
        ctx.strokeStyle = "red";
        ctx.lineWidth = 4;
        ctx.stroke();
    }

    polyA.draw(result.colliding);
    polyB.draw(result.colliding);
}

// 动画
function animate() {
    // 让 B 缓慢旋转，增加动态感
    if (!dragging) polyB.rotate(0.005);
    draw();
    requestAnimationFrame(animate);
}

// 交互
function getMousePos(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
    };
}

canvas.addEventListener('mousedown', (e) => {
    let m = getMousePos(e);
    // 简单判定：距离中心点
    let dx = m.x - polyA.pos.x;
    let dy = m.y - polyA.pos.y;
    if (dx*dx + dy*dy < 2500) { // 半径50
        dragging = polyA;
        lastMouse = m;
    } else {
        // 也可以拖 B
        dx = m.x - polyB.pos.x;
        dy = m.y - polyB.pos.y;
        if (dx*dx + dy*dy < 2500) {
            dragging = polyB;
            lastMouse = m;
        }
    }
});

window.addEventListener('mousemove', (e) => {
    if (dragging) {
        let m = getMousePos(e);
        dragging.move(m.x - lastMouse.x, m.y - lastMouse.y);
        lastMouse = m;
    }
});

window.addEventListener('mouseup', () => {
    dragging = null;
});

animate();

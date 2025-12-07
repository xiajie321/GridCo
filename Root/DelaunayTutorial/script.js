/**
 * Delaunay 三角剖分 互动演示
 * 实现 Bowyer-Watson 算法
 */

const canvas = document.getElementById('delaunay-canvas');
const ctx = canvas.getContext('2d');

const btnClear = document.getElementById('btn-clear');
const btnRandom = document.getElementById('btn-random');

let points = [];
let triangles = [];
let superTriangle = null;
let mousePos = { x: -1, y: -1 };

// 数据结构
class Vector2 {
    constructor(x, y) { this.x = x; this.y = y; }
    equals(other) { return Math.abs(this.x - other.x) < 0.01 && Math.abs(this.y - other.y) < 0.01; }
}

class Edge {
    constructor(p1, p2) { this.p1 = p1; this.p2 = p2; }
    equals(other) {
        return (this.p1.equals(other.p1) && this.p2.equals(other.p2)) ||
               (this.p1.equals(other.p2) && this.p2.equals(other.p1));
    }
}

class Triangle {
    constructor(p1, p2, p3) {
        this.p1 = p1; this.p2 = p2; this.p3 = p3;
        this.calculateCircumcircle();
    }

    calculateCircumcircle() {
        // 计算外接圆圆心和半径
        let x1 = this.p1.x, y1 = this.p1.y;
        let x2 = this.p2.x, y2 = this.p2.y;
        let x3 = this.p3.x, y3 = this.p3.y;

        let D = 2 * (x1 * (y2 - y3) + x2 * (y3 - y1) + x3 * (y1 - y2));
        let Ux = ((x1 * x1 + y1 * y1) * (y2 - y3) + (x2 * x2 + y2 * y2) * (y3 - y1) + (x3 * x3 + y3 * y3) * (y1 - y2)) / D;
        let Uy = ((x1 * x1 + y1 * y1) * (x3 - x2) + (x2 * x2 + y2 * y2) * (x1 - x3) + (x3 * x3 + y3 * y3) * (x2 - x1)) / D;

        this.center = new Vector2(Ux, Uy);
        this.radiusSq = (x1 - Ux) * (x1 - Ux) + (y1 - Uy) * (y1 - Uy);
        this.radius = Math.sqrt(this.radiusSq);
    }

    inCircumcircle(p) {
        let dx = p.x - this.center.x;
        let dy = p.y - this.center.y;
        return dx * dx + dy * dy <= this.radiusSq; // 使用 <= 处理边界情况
    }

    hasVertex(p) {
        return this.p1.equals(p) || this.p2.equals(p) || this.p3.equals(p);
    }
}

// Bowyer-Watson 算法
function triangulate() {
    triangles = [];
    
    // 1. 超级三角形 (足够大以包含所有点)
    // 假设画布 800x400
    // 顶点要超出边界很多
    let p1 = new Vector2(-1000, -1000);
    let p2 = new Vector2(2000, -1000);
    let p3 = new Vector2(400, 2000);
    superTriangle = new Triangle(p1, p2, p3);
    triangles.push(superTriangle);

    // 2. 逐点插入
    for (let point of points) {
        let badTriangles = [];
        
        // 找出所有外接圆包含该点的三角形
        for (let tri of triangles) {
            if (tri.inCircumcircle(point)) {
                badTriangles.push(tri);
            }
        }

        let polygon = [];
        
        // 找出边缘 (不被两个坏三角形共享的边)
        for (let tri of badTriangles) {
            let edges = [
                new Edge(tri.p1, tri.p2),
                new Edge(tri.p2, tri.p3),
                new Edge(tri.p3, tri.p1)
            ];
            
            for (let edge of edges) {
                let isShared = false;
                for (let otherTri of badTriangles) {
                    if (tri === otherTri) continue;
                    let otherEdges = [
                        new Edge(otherTri.p1, otherTri.p2),
                        new Edge(otherTri.p2, otherTri.p3),
                        new Edge(otherTri.p3, otherTri.p1)
                    ];
                    for (let otherEdge of otherEdges) {
                        if (edge.equals(otherEdge)) {
                            isShared = true;
                            break;
                        }
                    }
                    if (isShared) break;
                }
                if (!isShared) polygon.push(edge);
            }
        }

        // 删除坏三角形
        for (let tri of badTriangles) {
            let index = triangles.indexOf(tri);
            triangles.splice(index, 1);
        }

        // 构建新三角形
        for (let edge of polygon) {
            triangles.push(new Triangle(edge.p1, edge.p2, point));
        }
    }

    // 3. 移除与超级三角形共享顶点的三角形 (可选，为了美观通常移除)
    // 这里为了演示算法完整性，我们只标记它们不绘制，或者直接移除
    // 为了让用户看到完整的剖分结果（即使在边缘），我们移除它们
    triangles = triangles.filter(t => 
        !t.hasVertex(superTriangle.p1) && 
        !t.hasVertex(superTriangle.p2) && 
        !t.hasVertex(superTriangle.p3)
    );
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 绘制三角形
    for (let t of triangles) {
        // 检查鼠标悬停
        let isHovered = ctx.isPointInPath(getPath(t), mousePos.x, mousePos.y);
        // 为了更准确的悬停检测（上面只是简单的路径检测），我们用重心坐标或简单的距离判断
        // 这里简单点，直接计算距离圆心
        let dist = Math.sqrt((mousePos.x - t.center.x)**2 + (mousePos.y - t.center.y)**2);
        // 但这不准确，因为鼠标可能在圆内但不在三角形内
        // 还是用原生的 isPointInPath
        ctx.beginPath();
        ctx.moveTo(t.p1.x, t.p1.y);
        ctx.lineTo(t.p2.x, t.p2.y);
        ctx.lineTo(t.p3.x, t.p3.y);
        ctx.closePath();
        
        let hover = ctx.isPointInPath(mousePos.x, mousePos.y);

        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        ctx.fillStyle = hover ? 'rgba(76, 175, 80, 0.2)' : 'transparent';
        ctx.fill();
        ctx.stroke();

        if (hover) {
            // 绘制外接圆
            ctx.beginPath();
            ctx.arc(t.center.x, t.center.y, t.radius, 0, Math.PI * 2);
            ctx.strokeStyle = '#FF6B6B'; // 红色圆
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.stroke();
            ctx.setLineDash([]);
            
            // 绘制圆心
            ctx.beginPath();
            ctx.arc(t.center.x, t.center.y, 3, 0, Math.PI * 2);
            ctx.fillStyle = '#FF6B6B';
            ctx.fill();
        }
    }

    // 绘制点
    for (let p of points) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#2196F3';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.stroke();
    }
}

function getPath(t) {
    let p = new Path2D();
    p.moveTo(t.p1.x, t.p1.y);
    p.lineTo(t.p2.x, t.p2.y);
    p.lineTo(t.p3.x, t.p3.y);
    p.closePath();
    return p;
}

// 交互
canvas.addEventListener('mousedown', (e) => {
    let rect = canvas.getBoundingClientRect();
    let x = (e.clientX - rect.left) * (canvas.width / rect.width);
    let y = (e.clientY - rect.top) * (canvas.height / rect.height);
    
    points.push(new Vector2(x, y));
    triangulate();
    draw();
});

canvas.addEventListener('mousemove', (e) => {
    let rect = canvas.getBoundingClientRect();
    mousePos.x = (e.clientX - rect.left) * (canvas.width / rect.width);
    mousePos.y = (e.clientY - rect.top) * (canvas.height / rect.height);
    draw();
});

btnClear.addEventListener('click', () => {
    points = [];
    triangles = [];
    draw();
});

btnRandom.addEventListener('click', () => {
    points = [];
    for(let i=0; i<10; i++) {
        points.push(new Vector2(
            Math.random() * canvas.width * 0.8 + canvas.width * 0.1,
            Math.random() * canvas.height * 0.8 + canvas.height * 0.1
        ));
    }
    triangulate();
    draw();
});

// 初始点
points.push(new Vector2(200, 300));
points.push(new Vector2(400, 100));
points.push(new Vector2(600, 300));
triangulate();
draw();

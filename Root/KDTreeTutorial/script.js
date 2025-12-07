// 简单的2D向量类
class Point {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
}

// KD树节点
class KDNode {
    constructor(point, axis, bounds) {
        this.point = point; // 分割点
        this.axis = axis; // 0 for x, 1 for y
        this.left = null;
        this.right = null;
        this.bounds = bounds; // 当前节点代表的矩形区域（可视化用）
    }
}

// 全局变量
const colors = {
    bg: '#FFFFFF',
    point: '#333333',
    splitX: '#FF6B6B',
    splitY: '#4ECDC4',
    highlight: '#FFD93D',
    check: '#95E1D3'
};

// === 第一部分：构建演示 ===
const buildCanvas = document.getElementById('buildCanvas');
const buildCtx = buildCanvas.getContext('2d');
const treeVizCanvas = document.getElementById('treeVizCanvas');
const treeVizCtx = treeVizCanvas.getContext('2d');

let buildPoints = [];
let buildSteps = []; // 存储构建步骤用于动画
let currentStep = 0;
let buildTreeRoot = null;

function initBuild() {
    buildPoints = [];
    resetBuild();
}

function resetBuild() {
    buildCtx.clearRect(0, 0, buildCanvas.width, buildCanvas.height);
    treeVizCtx.clearRect(0, 0, treeVizCanvas.width, treeVizCanvas.height);
    buildSteps = [];
    currentStep = 0;
    buildTreeRoot = null;
    document.getElementById('buildInfo').textContent = "请先点击'随机撒点'...";
    
    // 画背景网格
    drawGrid(buildCtx, buildCanvas.width, buildCanvas.height);
    
    // 树结构背景提示
    treeVizCtx.font = "16px 'ZCOOL KuaiLe'";
    treeVizCtx.fillStyle = "#aaa";
    treeVizCtx.textAlign = "center";
    treeVizCtx.fillText("这里将显示树的结构...", treeVizCanvas.width/2, treeVizCanvas.height/2);
}

function drawGrid(ctx, w, h) {
    ctx.strokeStyle = '#eee';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for(let i=0; i<=w; i+=40) { ctx.moveTo(i,0); ctx.lineTo(i,h); }
    for(let i=0; i<=h; i+=40) { ctx.moveTo(0,i); ctx.lineTo(w,i); }
    ctx.stroke();
}

document.getElementById('addPointsBtn').addEventListener('click', () => {
    resetBuild();
    buildPoints = [];
    for(let i=0; i<20; i++) {
        buildPoints.push(new Point(
            Math.random() * (buildCanvas.width - 40) + 20,
            Math.random() * (buildCanvas.height - 40) + 20
        ));
    }
    drawPoints(buildCtx, buildPoints);
    document.getElementById('buildInfo').textContent = "点已就位！现在点击'切一刀'来看看怎么构建的。";
    
    // 预计算构建步骤
    let bounds = {minX:0, maxX:buildCanvas.width, minY:0, maxY:buildCanvas.height};
    buildSteps = []; // 清空之前的步骤
    // 清空树画布
    treeVizCtx.clearRect(0, 0, treeVizCanvas.width, treeVizCanvas.height);
    
    // 开始递归构建，传入父节点索引 -1 表示根节点
    buildTree(buildPoints, 0, bounds, -1, 'root');
});

function drawPoints(ctx, points) {
    ctx.fillStyle = colors.point;
    points.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fill();
    });
}

// 模拟构建过程，记录步骤
function buildTree(points, depth, bounds, parentIndex, childType) {
    if (points.length === 0) return;

    let axis = depth % 2; // 0 for x, 1 for y
    
    // 排序
    points.sort((a, b) => axis === 0 ? a.x - b.x : a.y - b.y);
    
    let mid = Math.floor(points.length / 2);
    let median = points[mid];
    
    let currentIndex = buildSteps.length;
    
    // 记录这一步
    buildSteps.push({
        type: 'split',
        point: median,
        axis: axis,
        bounds: {...bounds}, // 拷贝边界
        points: [...points],  // 拷贝当前涉及的点
        depth: depth,
        parentIndex: parentIndex,
        childType: childType,
        index: currentIndex
    });

    // 更新子节点边界
    let leftBounds = {...bounds};
    let rightBounds = {...bounds};
    
    if (axis === 0) {
        leftBounds.maxX = median.x;
        rightBounds.minX = median.x;
    } else {
        leftBounds.maxY = median.y;
        rightBounds.minY = median.y;
    }

    buildTree(points.slice(0, mid), depth + 1, leftBounds, currentIndex, 'left');
    buildTree(points.slice(mid + 1), depth + 1, rightBounds, currentIndex, 'right');
}

document.getElementById('nextStepBtn').addEventListener('click', () => {
    if (buildPoints.length === 0) {
        document.getElementById('buildInfo').textContent = "哎呀，还没撒点呢！";
        return;
    }
    if (currentStep >= buildSteps.length) {
        document.getElementById('buildInfo').textContent = "构建完成！这就是一颗完整的KD树。";
        return;
    }

    let step = buildSteps[currentStep];
    drawStep(step);
    drawTreeNode(step);
    
    let axisName = step.axis === 0 ? "X轴 (竖切)" : "Y轴 (横切)";
    document.getElementById('buildInfo').innerHTML = `第 ${currentStep+1} 步: 沿着 <span style="color:${step.axis===0?colors.splitX:colors.splitY}">${axisName}</span> 切割，中位数点是 (${Math.round(step.point.x)}, ${Math.round(step.point.y)})`;
    
    currentStep++;
});

function drawStep(step) {
    buildCtx.lineWidth = 2;
    buildCtx.strokeStyle = step.axis === 0 ? colors.splitX : colors.splitY;
    
    buildCtx.beginPath();
    if (step.axis === 0) {
        buildCtx.moveTo(step.point.x, step.bounds.minY);
        buildCtx.lineTo(step.point.x, step.bounds.maxY);
    } else {
        buildCtx.moveTo(step.bounds.minX, step.point.y);
        buildCtx.lineTo(step.bounds.maxX, step.point.y);
    }
    buildCtx.stroke();
    
    // 高亮中位数点
    buildCtx.fillStyle = step.axis === 0 ? colors.splitX : colors.splitY;
    buildCtx.beginPath();
    buildCtx.arc(step.point.x, step.point.y, 6, 0, Math.PI * 2);
    buildCtx.fill();
}

// 简单的树节点位置计算器
// 我们不知道树的确切形状，但我们可以使用深度和简单的偏移来放置节点
// 根在 (w/2, 20). 
// 深度 d 的节点 y = 20 + d * 40
// x 偏移量根据深度递减： offset = w / (2^(d+2))
const TREE_NODE_RADIUS = 10;
// 我们需要存储已绘制节点的位置以便连线
let drawnNodes = {}; // index -> {x, y}

function drawTreeNode(step) {
    if (step.index === 0) {
        // 第一步，清除提示文字
        treeVizCtx.clearRect(0, 0, treeVizCanvas.width, treeVizCanvas.height);
        drawnNodes = {};
    }

    let x, y;
    let w = treeVizCanvas.width;
    let h = treeVizCanvas.height;
    
    // 如果是根节点
    if (step.parentIndex === -1) {
        x = w / 2;
        y = 30;
    } else {
        // 根据父节点位置计算
        let parentPos = drawnNodes[step.parentIndex];
        let offset = w / Math.pow(2, step.depth + 1.5); // 稍微调整宽度分布
        y = 30 + step.depth * 40;
        
        if (step.childType === 'left') {
            x = parentPos.x - offset;
        } else {
            x = parentPos.x + offset;
        }
        
        // 画连线
        treeVizCtx.beginPath();
        treeVizCtx.moveTo(parentPos.x, parentPos.y);
        treeVizCtx.lineTo(x, y);
        treeVizCtx.strokeStyle = '#000';
        treeVizCtx.lineWidth = 1;
        treeVizCtx.stroke();
    }
    
    drawnNodes[step.index] = {x, y};
    
    // 画节点圆
    treeVizCtx.beginPath();
    treeVizCtx.arc(x, y, TREE_NODE_RADIUS, 0, Math.PI * 2);
    treeVizCtx.fillStyle = step.axis === 0 ? colors.splitX : colors.splitY;
    treeVizCtx.fill();
    treeVizCtx.strokeStyle = '#000';
    treeVizCtx.lineWidth = 2;
    treeVizCtx.stroke();
    
    // 画轴文字
    treeVizCtx.fillStyle = '#fff';
    treeVizCtx.font = "10px Arial";
    treeVizCtx.textAlign = "center";
    treeVizCtx.textBaseline = "middle";
    treeVizCtx.fillText(step.axis === 0 ? "X" : "Y", x, y);
}

document.getElementById('resetBuildBtn').addEventListener('click', initBuild);


// === 第二部分：搜索演示 ===
const searchCanvas = document.getElementById('searchCanvas');
const searchCtx = searchCanvas.getContext('2d');
let searchPoints = [];
let searchTree = null;
let mousePos = {x: 0, y: 0};

function initSearch() {
    searchPoints = [];
    for(let i=0; i<50; i++) {
        searchPoints.push(new Point(
            Math.random() * (searchCanvas.width - 20) + 10,
            Math.random() * (searchCanvas.height - 20) + 10
        ));
    }
    
    // 构建真正的树结构用于搜索
    let bounds = {minX:0, maxX:searchCanvas.width, minY:0, maxY:searchCanvas.height};
    searchTree = constructKDTree(searchPoints, 0, bounds);
    
    drawSearchScene();
}

function constructKDTree(points, depth, bounds) {
    if (points.length === 0) return null;
    let axis = depth % 2;
    points.sort((a, b) => axis === 0 ? a.x - b.x : a.y - b.y);
    let mid = Math.floor(points.length / 2);
    let node = new KDNode(points[mid], axis, bounds);
    
    let leftBounds = {...bounds};
    let rightBounds = {...bounds};
    if (axis === 0) { leftBounds.maxX = points[mid].x; rightBounds.minX = points[mid].x; }
    else { leftBounds.maxY = points[mid].y; rightBounds.minY = points[mid].y; }
    
    node.left = constructKDTree(points.slice(0, mid), depth + 1, leftBounds);
    node.right = constructKDTree(points.slice(mid + 1), depth + 1, rightBounds);
    
    return node;
}

function drawSearchScene() {
    searchCtx.clearRect(0, 0, searchCanvas.width, searchCanvas.height);
    drawGrid(searchCtx, searchCanvas.width, searchCanvas.height);
    
    // 画树分割线 (淡一点)
    drawTreeLines(searchTree, searchCtx);
    
    // 画点
    drawPoints(searchCtx, searchPoints);
    
    // 寻找最近点
    if (searchTree) {
        let best = { point: null, distSq: Infinity };
        searchNearest(searchTree, mousePos, best);
        
        if (best.point) {
            // 连接线
            searchCtx.strokeStyle = colors.highlight;
            searchCtx.lineWidth = 2;
            searchCtx.beginPath();
            searchCtx.moveTo(mousePos.x, mousePos.y);
            searchCtx.lineTo(best.point.x, best.point.y);
            searchCtx.stroke();
            
            // 高亮最近点
            searchCtx.fillStyle = colors.highlight;
            searchCtx.beginPath();
            searchCtx.arc(best.point.x, best.point.y, 8, 0, Math.PI * 2);
            searchCtx.fill();
            
            document.getElementById('searchInfo').textContent = `最近点距离: ${Math.sqrt(best.distSq).toFixed(1)}`;
        }
        
        // 搜索范围圈
        if(document.getElementById('showSearchVis').checked && best.point) {
             searchCtx.strokeStyle = 'rgba(0,0,0,0.2)';
             searchCtx.beginPath();
             searchCtx.arc(mousePos.x, mousePos.y, Math.sqrt(best.distSq), 0, Math.PI*2);
             searchCtx.stroke();
        }
    }
}

function drawTreeLines(node, ctx) {
    if (!node) return;
    ctx.lineWidth = 1;
    ctx.strokeStyle = node.axis === 0 ? 'rgba(255, 107, 107, 0.3)' : 'rgba(78, 205, 196, 0.3)';
    ctx.beginPath();
    if (node.axis === 0) {
        ctx.moveTo(node.point.x, node.bounds.minY);
        ctx.lineTo(node.point.x, node.bounds.maxY);
    } else {
        ctx.moveTo(node.bounds.minX, node.point.y);
        ctx.lineTo(node.bounds.maxX, node.point.y);
    }
    ctx.stroke();
    
    drawTreeLines(node.left, ctx);
    drawTreeLines(node.right, ctx);
}

function searchNearest(node, target, best) {
    if (!node) return;
    
    let d = distSq(node.point, target);
    if (d < best.distSq) {
        best.distSq = d;
        best.point = node.point;
    }
    
    let axisDist = node.axis === 0 ? target.x - node.point.x : target.y - node.point.y;
    
    let near = axisDist < 0 ? node.left : node.right;
    let far = axisDist < 0 ? node.right : node.left;
    
    searchNearest(near, target, best);
    
    // 剪枝关键：如果"目标点到分割线的距离" < "当前最近距离"，才需要去另一边找
    if (axisDist * axisDist < best.distSq) {
        searchNearest(far, target, best);
    }
}

function distSq(p1, p2) {
    return (p1.x - p2.x)**2 + (p1.y - p2.y)**2;
}

searchCanvas.addEventListener('mousemove', (e) => {
    let rect = searchCanvas.getBoundingClientRect();
    mousePos.x = e.clientX - rect.left;
    mousePos.y = e.clientY - rect.top;
    drawSearchScene();
});
document.getElementById('showSearchVis').addEventListener('change', drawSearchScene);

initSearch();


// === 第三部分：性能PK ===
const battleCanvas = document.getElementById('battleCanvas');
const battleCtx = battleCanvas.getContext('2d');
let battlePoints = [];
let battleTree = null;
let battleMouse = {x:0, y:0};

function initBattle() {
    let count = parseInt(document.getElementById('pointCount').value);
    document.getElementById('pointCountDisplay').innerText = count;
    
    battlePoints = [];
    for(let i=0; i<count; i++) {
        battlePoints.push(new Point(
            Math.random() * battleCanvas.width,
            Math.random() * battleCanvas.height
        ));
    }
    
    // 构建KD树
    let bounds = {minX:0, maxX:battleCanvas.width, minY:0, maxY:battleCanvas.height};
    battleTree = constructKDTree([...battlePoints], 0, bounds); // copy array to avoid sort affecting original order if needed
    
    runBattle();
}

function runBattle() {
    battleCtx.clearRect(0, 0, battleCanvas.width, battleCanvas.height);
    
    // 画所有点
    battleCtx.fillStyle = '#ccc';
    for(let p of battlePoints) {
        battleCtx.fillRect(p.x-1, p.y-1, 2, 2);
    }
    
    // 范围查询半径
    let radius = 50;
    let radiusSq = radius * radius;
    
    // 1. 暴力法
    let bruteCount = 0;
    let bruteChecks = 0;
    for(let p of battlePoints) {
        bruteChecks++;
        if (distSq(p, battleMouse) <= radiusSq) {
            bruteCount++;
        }
    }
    document.getElementById('checkCountBrute').innerText = bruteChecks;
    document.getElementById('bruteFound').innerText = bruteCount;
    
    // 2. KD树查询
    let kdCount = 0;
    let kdChecks = 0;
    
    // 递归范围查询
    function rangeQuery(node, target, rSq) {
        if (!node) return;
        
        kdChecks++; // 统计访问节点的次数
        
        if (distSq(node.point, target) <= rSq) {
            kdCount++;
            // 高亮找到的点
            battleCtx.fillStyle = colors.splitY;
            battleCtx.fillRect(node.point.x-2, node.point.y-2, 4, 4);
        }
        
        let axisDist = node.axis === 0 ? target.x - node.point.x : target.y - node.point.y;
        
        let near = axisDist < 0 ? node.left : node.right;
        let far = axisDist < 0 ? node.right : node.left;
        
        rangeQuery(near, target, rSq);
        
        if (axisDist * axisDist <= rSq) {
            rangeQuery(far, target, rSq);
        }
    }
    
    rangeQuery(battleTree, battleMouse, radiusSq);
    
    document.getElementById('checkCountKD').innerText = kdChecks;
    document.getElementById('kdFound').innerText = kdCount;
    
    // 计算效率提升倍数
    let gain = kdChecks > 0 ? (bruteChecks / kdChecks).toFixed(1) : "Inf";
    document.getElementById('efficiencyGain').innerText = `效率提升: ${gain}x`;

    // 验证结果一致性
    if (bruteCount === kdCount) {
        document.getElementById('resultMatch').style.display = 'block';
        document.getElementById('resultMismatch').style.display = 'none';
    } else {
        document.getElementById('resultMatch').style.display = 'none';
        document.getElementById('resultMismatch').style.display = 'block';
    }
    
    // 画鼠标圈
    battleCtx.strokeStyle = '#000';
    battleCtx.lineWidth = 1;
    battleCtx.beginPath();
    battleCtx.arc(battleMouse.x, battleMouse.y, radius, 0, Math.PI*2);
    battleCtx.stroke();
}

battleCanvas.addEventListener('mousemove', (e) => {
    let rect = battleCanvas.getBoundingClientRect();
    battleMouse.x = e.clientX - rect.left;
    battleMouse.y = e.clientY - rect.top;
    runBattle();
});

document.getElementById('pointCount').addEventListener('input', initBattle);

initBattle();
initBuild();

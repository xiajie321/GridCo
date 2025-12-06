// ... (前面的代码保持不变)
// 为了节省篇幅，我只重写后面的高亮部分，前面的代码我会保留原样，但我需要用 read_file 确认一下前面的代码还在不在... 不，write_to_file 是覆盖。
// 我必须写完整的文件。

// --- 通用类和配置 ---
const COLORS = {
    bg: '#ffffff',
    border: '#000000',
    object: '#333333',
    highlight: '#FF6B6B',
    treeLine: 'rgba(0, 0, 0, 0.2)',
    treeNode: 'rgba(78, 205, 196, 0.1)'
};

class Rect {
    constructor(x, y, w, h) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
    }
}

class GameObject {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.w = 10;
        this.h = 10;
        this.vx = (Math.random() - 0.5) * 2;
        this.vy = (Math.random() - 0.5) * 2;
        this.color = COLORS.object;
    }
    
    update(width, height) {
        this.x += this.vx;
        this.y += this.vy;
        
        if (this.x < 0 || this.x > width) this.vx *= -1;
        if (this.y < 0 || this.y > height) this.vy *= -1;
        
        this.x = Math.max(0, Math.min(width, this.x));
        this.y = Math.max(0, Math.min(height, this.y));
        
        this.color = COLORS.object; // 重置颜色
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - this.w/2, this.y - this.h/2, this.w, this.h);
    }
}

// --- 四叉树核心类 ---
class QuadTree {
    constructor(level, bounds) {
        this.MAX_OBJECTS = 4;
        this.MAX_LEVELS = 5;
        
        this.level = level;
        this.bounds = bounds;
        this.objects = [];
        this.nodes = []; // 4个子节点
    }
    
    clear() {
        this.objects = [];
        for (let i = 0; i < this.nodes.length; i++) {
            if (this.nodes[i]) {
                this.nodes[i].clear();
                this.nodes[i] = null;
            }
        }
        this.nodes = [];
    }
    
    split() {
        let subWidth = this.bounds.w / 2;
        let subHeight = this.bounds.h / 2;
        let x = this.bounds.x;
        let y = this.bounds.y;
        
        this.nodes[0] = new QuadTree(this.level + 1, new Rect(x + subWidth, y, subWidth, subHeight));
        this.nodes[1] = new QuadTree(this.level + 1, new Rect(x, y, subWidth, subHeight));
        this.nodes[2] = new QuadTree(this.level + 1, new Rect(x, y + subHeight, subWidth, subHeight));
        this.nodes[3] = new QuadTree(this.level + 1, new Rect(x + subWidth, y + subHeight, subWidth, subHeight));
    }
    
    getIndex(pRect) {
        let index = -1;
        let verticalMidpoint = this.bounds.x + (this.bounds.w / 2);
        let horizontalMidpoint = this.bounds.y + (this.bounds.h / 2);
        
        // 物体完全在上面
        let topQuadrant = (pRect.y < horizontalMidpoint && pRect.y + pRect.h < horizontalMidpoint);
        // 物体完全在下面
        let bottomQuadrant = (pRect.y > horizontalMidpoint);
        
        // 物体完全在左边
        if (pRect.x < verticalMidpoint && pRect.x + pRect.w < verticalMidpoint) {
            if (topQuadrant) index = 1;
            else if (bottomQuadrant) index = 2;
        }
        // 物体完全在右边
        else if (pRect.x > verticalMidpoint) {
            if (topQuadrant) index = 0;
            else if (bottomQuadrant) index = 3;
        }
        
        return index;
    }
    
    insert(pRect) {
        if (this.nodes[0]) {
            let index = this.getIndex(pRect);
            if (index !== -1) {
                this.nodes[index].insert(pRect);
                return;
            }
        }
        
        this.objects.push(pRect);
        
        if (this.objects.length > this.MAX_OBJECTS && this.level < this.MAX_LEVELS) {
            if (!this.nodes[0]) this.split();
            
            let i = 0;
            while (i < this.objects.length) {
                let index = this.getIndex(this.objects[i]);
                if (index !== -1) {
                    this.nodes[index].insert(this.objects[i]);
                    this.objects.splice(i, 1);
                } else {
                    i++;
                }
            }
        }
    }
    
    retrieve(returnObjects, pRect) {
        let index = this.getIndex(pRect);
        if (index !== -1 && this.nodes[0]) {
            this.nodes[index].retrieve(returnObjects, pRect);
        }
        
        // 获取当前节点的所有物体
        returnObjects.push(...this.objects);
        return returnObjects;
    }
    
    // 辅助绘制
    draw(ctx) {
        ctx.strokeStyle = COLORS.treeLine;
        ctx.strokeRect(this.bounds.x, this.bounds.y, this.bounds.w, this.bounds.h);
        
        if (this.nodes[0]) {
            for (let i = 0; i < this.nodes.length; i++) {
                this.nodes[i].draw(ctx);
            }
        }
    }
}

// --- 步骤 1: 分裂演示 ---
const splitCanvas = document.getElementById('splitCanvas');
const splitCtx = splitCanvas.getContext('2d');
const splitInfo = document.getElementById('splitInfo');
let splitTree = new QuadTree(0, new Rect(0, 0, 400, 400));
let splitPoints = []; // 简单的点对象 {x, y, w:4, h:4}

function updateSplit() {
    splitCtx.clearRect(0, 0, 400, 400);
    splitTree.clear();
    
    // 重新插入所有点
    splitPoints.forEach(p => splitTree.insert(p));
    
    // 绘制树
    splitTree.draw(splitCtx);
    
    // 绘制点
    splitCtx.fillStyle = '#000';
    splitPoints.forEach(p => {
        splitCtx.fillRect(p.x-2, p.y-2, 4, 4);
    });
    
    // 简单的层级检测（非严谨，仅用于显示）
    // 实际层级需要递归遍历，这里简化显示
    splitInfo.textContent = `点数量: ${splitPoints.length}`;
}

splitCanvas.addEventListener('mousedown', (e) => {
    const rect = splitCanvas.getBoundingClientRect();
    splitPoints.push({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        w: 4, h: 4
    });
    updateSplit();
});

document.getElementById('clearSplitBtn').addEventListener('click', () => {
    splitPoints = [];
    updateSplit();
});
updateSplit();

// --- 步骤 2: 插入定位 ---
const insertCanvas = document.getElementById('insertCanvas');
const insertCtx = insertCanvas.getContext('2d');
const insertInfo = document.getElementById('insertInfo');
// 创建一个预设的树结构以便演示
let insertTree = new QuadTree(0, new Rect(0, 0, 400, 400));
// 强制分裂几层
insertTree.split(); 
insertTree.nodes[0].split(); // 右上角再分
insertTree.nodes[2].split(); // 左下角再分

let mouseObj = {x: 200, y: 200, w: 20, h: 20};

function getDeepestNode(node, rect) {
    let index = node.getIndex(rect);
    if (index !== -1 && node.nodes[0]) {
        return getDeepestNode(node.nodes[index], rect);
    }
    return node;
}

function updateInsert() {
    insertCtx.clearRect(0, 0, 400, 400);
    
    // 绘制树
    insertTree.draw(insertCtx);
    
    // 找到鼠标所在的最深节点并高亮
    let targetNode = getDeepestNode(insertTree, mouseObj);
    insertCtx.fillStyle = COLORS.treeNode;
    insertCtx.fillRect(targetNode.bounds.x, targetNode.bounds.y, targetNode.bounds.w, targetNode.bounds.h);
    
    // 绘制鼠标跟随物体
    insertCtx.fillStyle = COLORS.highlight;
    insertCtx.fillRect(mouseObj.x - 10, mouseObj.y - 10, 20, 20);
    
    // 更新文字
    let quadrantNames = ['右上', '左上', '左下', '右下'];
    let idx = insertTree.getIndex(mouseObj);
    let qName = idx !== -1 ? quadrantNames[idx] : "边界上(父节点)";
    insertInfo.textContent = `层级: ${targetNode.level} | 象限: ${qName}`;
    
    requestAnimationFrame(updateInsert);
}

insertCanvas.addEventListener('mousemove', (e) => {
    const rect = insertCanvas.getBoundingClientRect();
    mouseObj.x = e.clientX - rect.left;
    mouseObj.y = e.clientY - rect.top;
});
updateInsert();

// --- 步骤 3: 性能大比拼 ---
const batCanvas = document.getElementById('battleCanvas');
const batCtx = batCanvas.getContext('2d');
const modeBtn = document.getElementById('modeBtn');
const loadBar = document.getElementById('loadBar');
const statsDisplays = {
    mode: document.getElementById('modeDisplay'),
    obj: document.getElementById('objCount'),
    check: document.getElementById('checkCount')
};

let battleObjects = [];
let battleMode = 0; // 0: 暴力, 1: 网格, 2: 四叉树
const MODES = ['暴力法', '网格法', '四叉树'];
// 网格法参数
const GRID_SIZE = 60;

function runBattle() {
    batCtx.clearRect(0, 0, 600, 400);
    
    // 更新物体
    battleObjects.forEach(obj => obj.update(600, 400));
    
    let checks = 0;
    
    if (battleMode === 0) { // 暴力法
        batCtx.strokeStyle = 'rgba(255, 0, 0, 0.1)';
        for (let i = 0; i < battleObjects.length; i++) {
            for (let j = i + 1; j < battleObjects.length; j++) {
                let a = battleObjects[i];
                let b = battleObjects[j];
                checks++;
                
                // 绘制连线
                if (battleObjects.length < 200) {
                    batCtx.beginPath();
                    batCtx.moveTo(a.x, a.y);
                    batCtx.lineTo(b.x, b.y);
                    batCtx.stroke();
                }
                
                checkCollision(a, b);
            }
        }
    } else if (battleMode === 1) { // 网格法
        // 绘制网格背景
        batCtx.strokeStyle = '#eee';
        batCtx.beginPath();
        for(let x=0; x<=600; x+=GRID_SIZE) { batCtx.moveTo(x,0); batCtx.lineTo(x,400); }
        for(let y=0; y<=400; y+=GRID_SIZE) { batCtx.moveTo(0,y); batCtx.lineTo(600,y); }
        batCtx.stroke();
        
        let grid = {};
        battleObjects.forEach(obj => {
            let cx = Math.floor(obj.x / GRID_SIZE);
            let cy = Math.floor(obj.y / GRID_SIZE);
            let key = `${cx},${cy}`;
            if (!grid[key]) grid[key] = [];
            grid[key].push(obj);
        });
        
        batCtx.strokeStyle = 'rgba(0, 255, 0, 0.3)';
        for (let key in grid) {
            let cell = grid[key];
            for (let i = 0; i < cell.length; i++) {
                for (let j = i + 1; j < cell.length; j++) {
                    checks++;
                    batCtx.beginPath();
                    batCtx.moveTo(cell[i].x, cell[i].y);
                    batCtx.lineTo(cell[j].x, cell[j].y);
                    batCtx.stroke();
                    checkCollision(cell[i], cell[j]);
                }
            }
        }
    } else { // 四叉树
        let tree = new QuadTree(0, new Rect(0, 0, 600, 400));
        battleObjects.forEach(obj => tree.insert({x: obj.x, y: obj.y, w: obj.w, h: obj.h, ref: obj}));
        
        // 绘制树结构
        tree.draw(batCtx);
        
        batCtx.strokeStyle = 'rgba(0, 0, 255, 0.3)';
        battleObjects.forEach(obj => {
            let candidates = [];
            tree.retrieve(candidates, {x: obj.x, y: obj.y, w: obj.w, h: obj.h});
            
            for (let other of candidates) {
                if (obj !== other.ref) {
                    // 简单的去重策略：只检测 ID 更大的，或者在这里不处理去重，只为了演示 retrieve 数量
                    // 为了演示准确性，我们这里稍微简化：只要 retrieve 到了就算一次检测
                    // 实际碰撞逻辑应该更严谨
                    checks++; 
                    
                    // 简单的距离判定
                    let dx = obj.x - other.ref.x;
                    let dy = obj.y - other.ref.y;
                    let dist = Math.sqrt(dx*dx + dy*dy);
                    if (dist < 10) { // 碰撞
                        obj.color = COLORS.highlight;
                        other.ref.color = COLORS.highlight;
                    }
                }
            }
        });
        // 四叉树的检测次数通常包含重复对，这里除以2简单估算以公平对比
        checks = Math.floor(checks / 2);
    }
    
    // 绘制物体
    battleObjects.forEach(obj => obj.draw(batCtx));
    
    // 更新UI
    statsDisplays.obj.textContent = battleObjects.length;
    statsDisplays.check.textContent = checks;
    
    const MAX_BENCHMARK = 5000;
    let loadPercent = (checks / MAX_BENCHMARK) * 100;
    if (loadPercent > 100) loadPercent = 100;
    loadBar.style.width = `${loadPercent}%`;
    loadBar.style.backgroundColor = 
        (checks > MAX_BENCHMARK) ? '#8B0000' : 
        (battleMode === 0 ? '#FF6B6B' : (battleMode === 1 ? '#4ECDC4' : '#45B7D1'));
        
    requestAnimationFrame(runBattle);
}

function checkCollision(a, b) {
    let dx = a.x - b.x;
    let dy = a.y - b.y;
    let dist = Math.sqrt(dx*dx + dy*dy);
    if (dist < 10) {
        a.color = COLORS.highlight;
        b.color = COLORS.highlight;
    }
}

modeBtn.addEventListener('click', () => {
    battleMode = (battleMode + 1) % 3;
    modeBtn.textContent = `模式：${MODES[battleMode]}`;
    statsDisplays.mode.textContent = MODES[battleMode];
});

document.getElementById('addRandomBtn').addEventListener('click', () => {
    for(let i=0; i<30; i++) {
        battleObjects.push(new GameObject(Math.random()*600, Math.random()*400));
    }
});

document.getElementById('addClusterBtn').addEventListener('click', () => {
    let cx = Math.random() * 500 + 50;
    let cy = Math.random() * 300 + 50;
    for(let i=0; i<30; i++) {
        battleObjects.push(new GameObject(cx + (Math.random()-0.5)*100, cy + (Math.random()-0.5)*100));
    }
});

document.getElementById('resetBattleBtn').addEventListener('click', () => {
    battleObjects = [];
});

// 初始物体
for(let i=0; i<20; i++) {
    battleObjects.push(new GameObject(Math.random()*600, Math.random()*400));
}
runBattle();

// 代码高亮通用逻辑 (复用之前的)
document.addEventListener('DOMContentLoaded', () => {
    const codeBlock = document.querySelector('code');
    if(!codeBlock) return;
    let text = codeBlock.textContent;
    
    function escapeHtml(unsafe) {
        return unsafe
             .replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "&#039;");
    }

    const keywords = ['public', 'class', 'private', 'void', 'int', 'float', 'string', 'new', 'return', 'foreach', 'if', 'else', 'while', 'for', 'null', 'this'];
    const types = ['QuadTree', 'Rect', 'List', 'GameObject', 'Mathf'];
    
    let lines = text.split('\n');
    let formattedHtml = lines.map(line => {
        let escapedLine = escapeHtml(line);
        let commentIndex = escapedLine.indexOf('//');
        let codePart = escapedLine;
        let commentPart = '';
        
        if (commentIndex !== -1) {
            codePart = escapedLine.substring(0, commentIndex);
            commentPart = `<span class="comment">${escapedLine.substring(commentIndex)}</span>`;
        }
        
        types.forEach(type => {
            codePart = codePart.replace(new RegExp(`\\b${type}\\b`, 'g'), `___TYPE_${type}___`);
        });
        keywords.forEach(kw => {
            codePart = codePart.replace(new RegExp(`\\b${kw}\\b`, 'g'), `___KW_${kw}___`);
        });
        
        types.forEach(type => {
            codePart = codePart.replace(new RegExp(`___TYPE_${type}___`, 'g'), `<span class="type">${type}</span>`);
        });
        keywords.forEach(kw => {
            codePart = codePart.replace(new RegExp(`___KW_${kw}___`, 'g'), `<span class="keyword">${kw}</span>`);
        });
        
        codePart = codePart.replace(/(&quot;.*?&quot;)/g, '<span class="string">$1</span>');
            
        return codePart + commentPart;
    }).join('\n');
    
    codeBlock.innerHTML = formattedHtml;
});

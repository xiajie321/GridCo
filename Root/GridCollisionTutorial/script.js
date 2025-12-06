// 通用工具函数
function drawGrid(ctx, width, height, cellSize, highlightCell = null) {
    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 1;

    for (let x = 0; x <= width; x += cellSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
    }

    for (let y = 0; y <= height; y += cellSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
    }

    // 绘制高亮格子
    if (highlightCell) {
        ctx.fillStyle = 'rgba(255, 107, 107, 0.3)';
        ctx.fillRect(highlightCell.x * cellSize, highlightCell.y * cellSize, cellSize, cellSize);
        
        ctx.strokeStyle = '#FF6B6B';
        ctx.lineWidth = 2;
        ctx.strokeRect(highlightCell.x * cellSize, highlightCell.y * cellSize, cellSize, cellSize);
    }
}

// 步骤 1: 建立网格
const gridCanvas = document.getElementById('gridCanvas');
const gridCtx = gridCanvas.getContext('2d');
const cellSizeSlider = document.getElementById('cellSizeSlider');
const cellSizeDisplay = document.getElementById('cellSizeDisplay');

function updateStep1() {
    const cellSize = parseInt(cellSizeSlider.value);
    cellSizeDisplay.textContent = cellSize;
    drawGrid(gridCtx, gridCanvas.width, gridCanvas.height, cellSize);
    
    // 绘制一些文字说明
    gridCtx.fillStyle = '#333';
    gridCtx.font = '12px Arial';
    gridCtx.fillText(`格子大小: ${cellSize}`, 10, 20);
    gridCtx.fillText(`列数: ${Math.floor(gridCanvas.width/cellSize)}`, 10, 40);
    gridCtx.fillText(`行数: ${Math.floor(gridCanvas.height/cellSize)}`, 10, 60);
}

cellSizeSlider.addEventListener('input', updateStep1);
updateStep1();

// 步骤 2: 物体定位
const posCanvas = document.getElementById('positionCanvas');
const posCtx = posCanvas.getContext('2d');
const posInfo = document.getElementById('positionInfo');
let posCellSize = 80;
let playerPos = { x: -100, y: -100 }; // 初始隐藏

function updateStep2() {
    // 1. 计算格子坐标
    const cellX = Math.floor(playerPos.x / posCellSize);
    const cellY = Math.floor(playerPos.y / posCellSize);
    
    // 2. 绘制背景网格
    drawGrid(posCtx, posCanvas.width, posCanvas.height, posCellSize, 
        (playerPos.x >= 0) ? { x: cellX, y: cellY } : null);

    // 3. 绘制玩家（像素风格小人）
    if (playerPos.x >= 0) {
        posCtx.fillStyle = '#333';
        // 简单的像素人
        const size = 20;
        posCtx.fillRect(playerPos.x - size/2, playerPos.y - size/2, size, size); // 头
        posCtx.fillStyle = '#fff';
        posCtx.fillRect(playerPos.x - 5, playerPos.y - 5, 4, 4); // 左眼
        posCtx.fillRect(playerPos.x + 1, playerPos.y - 5, 4, 4); // 右眼
        
        // 更新信息面板
        posInfo.innerHTML = `
            物体坐标: (${Math.round(playerPos.x)}, ${Math.round(playerPos.y)})<br>
            计算公式: ⌊${Math.round(playerPos.x)} / ${posCellSize}⌋ = <strong>${cellX}</strong><br>
            所在格子: [${cellX}, ${cellY}]
        `;
    }
}

posCanvas.addEventListener('mousedown', (e) => {
    const rect = posCanvas.getBoundingClientRect();
    playerPos.x = e.clientX - rect.left;
    playerPos.y = e.clientY - rect.top;
    updateStep2();
});

updateStep2();

// 步骤 3: 碰撞检测
const colCanvas = document.getElementById('collisionCanvas');
const colCtx = colCanvas.getContext('2d');
const colStats = document.getElementById('collisionStats');
let colCellSize = 100;
let objects = [];
let isSimulating = false;
let animationId;

class GameObj {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 2;
        this.vy = (Math.random() - 0.5) * 2;
        this.size = 15;
        this.color = '#333';
        this.isColliding = false;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;

        // 边界反弹
        if (this.x < 0 || this.x > colCanvas.width) this.vx *= -1;
        if (this.y < 0 || this.y > colCanvas.height) this.vy *= -1;
        
        // 限制在画布内
        this.x = Math.max(0, Math.min(colCanvas.width, this.x));
        this.y = Math.max(0, Math.min(colCanvas.height, this.y));
        
        this.isColliding = false; // 重置状态
        this.color = '#333';
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        if (this.isColliding) {
            ctx.fillStyle = '#FF4444'; // 碰撞时变红
        }
        ctx.fillRect(this.x - this.size/2, this.y - this.size/2, this.size, this.size);
    }
}

function checkCollisions() {
    let checkCount = 0;
    
    // 1. 清空网格
    let grid = {};

    // 2. 将物体填入网格
    for (let obj of objects) {
        let cx = Math.floor(obj.x / colCellSize);
        let cy = Math.floor(obj.y / colCellSize);
        let key = `${cx},${cy}`;
        
        if (!grid[key]) grid[key] = [];
        grid[key].push(obj);
    }

    // 3. 遍历网格进行检测
    for (let key in grid) {
        let cellObjects = grid[key];
        
        // 只检测同一格子内的物体
        if (cellObjects.length > 1) {
            for (let i = 0; i < cellObjects.length; i++) {
                for (let j = i + 1; j < cellObjects.length; j++) {
                    let a = cellObjects[i];
                    let b = cellObjects[j];
                    
                    checkCount++; // 记录检测次数
                    
                    // 简单的距离检测
                    let dx = a.x - b.x;
                    let dy = a.y - b.y;
                    let dist = Math.sqrt(dx*dx + dy*dy);
                    
                    if (dist < (a.size + b.size) / 1.5) { // 简单判定
                        a.isColliding = true;
                        b.isColliding = true;
                    } else {
                        // 虽然在同一格但未接触，这里为了演示，
                        // 我们可以让它们变色表示"正在被检测"
                         a.color = '#555';
                         b.color = '#555';
                    }
                }
            }
        }
    }
    
    return checkCount;
}

function animate() {
    if (!isSimulating) return;

    colCtx.clearRect(0, 0, colCanvas.width, colCanvas.height);
    
    // 绘制背景网格
    drawGrid(colCtx, colCanvas.width, colCanvas.height, colCellSize);

    // 更新所有物体
    objects.forEach(obj => obj.update());

    // 碰撞检测
    let checks = checkCollisions();
    
    // 绘制所有物体
    objects.forEach(obj => obj.draw(colCtx));
    
    // 更新统计
    colStats.innerHTML = `物体数量: ${objects.length} | 实际检测次数: ${checks} <br> (如果不划分网格需要检测: ${objects.length * (objects.length-1) / 2} 次)`;

    animationId = requestAnimationFrame(animate);
}

document.getElementById('toggleSimBtn').addEventListener('click', () => {
    isSimulating = !isSimulating;
    const btn = document.getElementById('toggleSimBtn');
    btn.textContent = isSimulating ? "暂停运动" : "开始运动";
    if (isSimulating) animate();
});

document.getElementById('addObjBtn').addEventListener('click', () => {
    for(let i=0; i<5; i++) {
        objects.push(new GameObj(
            Math.random() * colCanvas.width,
            Math.random() * colCanvas.height
        ));
    }
    if (!isSimulating) {
        // 如果暂停中，至少画出来
        colCtx.clearRect(0, 0, colCanvas.width, colCanvas.height);
        drawGrid(colCtx, colCanvas.width, colCanvas.height, colCellSize);
        objects.forEach(obj => obj.draw(colCtx));
    }
});

document.getElementById('clearObjBtn').addEventListener('click', () => {
    objects = [];
    colCtx.clearRect(0, 0, colCanvas.width, colCanvas.height);
    drawGrid(colCtx, colCanvas.width, colCanvas.height, colCellSize);
    colStats.textContent = "检测次数: 0";
});

// 初始化步骤3
drawGrid(colCtx, colCanvas.width, colCanvas.height, colCellSize);

// 步骤 4: 性能大比拼
const batCanvas = document.getElementById('battleCanvas');
const batCtx = batCanvas.getContext('2d');
const objCountDisplay = document.getElementById('objCount');
const checkCountDisplay = document.getElementById('checkCount');
const loadBar = document.getElementById('loadBar');
const battleModeBtn = document.getElementById('battleModeBtn');

let battleObjects = [];
let isGridMode = false; // false = 暴力法, true = 网格法
let battleCellSize = 60; // 较小的格子以突出优势

function initBattle() {
    // 初始添加一些物体
    for(let i=0; i<30; i++) addBattleObject();
    animateBattle();
}

function addBattleObject() {
    battleObjects.push(new GameObj(
        Math.random() * batCanvas.width,
        Math.random() * batCanvas.height
    ));
}

function updateBattle() {
    // 清空画布
    batCtx.clearRect(0, 0, batCanvas.width, batCanvas.height);
    
    // 如果是网格模式，画网格
    if (isGridMode) {
        drawGrid(batCtx, batCanvas.width, batCanvas.height, battleCellSize);
    }

    // 更新物体位置
    battleObjects.forEach(obj => {
        // 使用GameObj的update逻辑，稍微修改边界
        obj.x += obj.vx;
        obj.y += obj.vy;
        if (obj.x < 0 || obj.x > batCanvas.width) obj.vx *= -1;
        if (obj.y < 0 || obj.y > batCanvas.height) obj.vy *= -1;
        obj.x = Math.max(0, Math.min(batCanvas.width, obj.x));
        obj.y = Math.max(0, Math.min(batCanvas.height, obj.y));
        obj.color = '#333'; // 重置颜色
    });

    let checks = 0;
    
    batCtx.lineWidth = 1;

    if (!isGridMode) {
        // --- 暴力法 ---
        batCtx.strokeStyle = 'rgba(255, 0, 0, 0.1)'; // 非常淡的红线
        
        for (let i = 0; i < battleObjects.length; i++) {
            for (let j = i + 1; j < battleObjects.length; j++) {
                let a = battleObjects[i];
                let b = battleObjects[j];
                
                checks++;
                
                // 绘制检测线（暴力法会画出所有连线，虽然性能差但视觉震撼）
                if (battleObjects.length < 200) { // 太多就画不出来了
                    batCtx.beginPath();
                    batCtx.moveTo(a.x, a.y);
                    batCtx.lineTo(b.x, b.y);
                    batCtx.stroke();
                }

                // 简单的距离检测
                let dx = a.x - b.x;
                let dy = a.y - b.y;
                let dist = Math.sqrt(dx*dx + dy*dy);
                
                if (dist < (a.size + b.size) / 1.5) {
                    a.color = '#FF4444';
                    b.color = '#FF4444';
                }
            }
        }
    } else {
        // --- 网格法 ---
        let grid = {};
        // 1. 填入网格
        for (let obj of battleObjects) {
            let cx = Math.floor(obj.x / battleCellSize);
            let cy = Math.floor(obj.y / battleCellSize);
            let key = `${cx},${cy}`;
            if (!grid[key]) grid[key] = [];
            grid[key].push(obj);
        }

        // 2. 网格内检测
        batCtx.strokeStyle = 'rgba(0, 255, 0, 0.3)'; // 绿线
        
        for (let key in grid) {
            let cellObjs = grid[key];
            if (cellObjs.length > 1) {
                // 绘制格子高亮，表示这个格子正在活跃运算
                let [cx, cy] = key.split(',').map(Number);
                batCtx.fillStyle = 'rgba(0, 255, 0, 0.1)';
                batCtx.fillRect(cx * battleCellSize, cy * battleCellSize, battleCellSize, battleCellSize);

                for (let i = 0; i < cellObjs.length; i++) {
                    for (let j = i + 1; j < cellObjs.length; j++) {
                        let a = cellObjs[i];
                        let b = cellObjs[j];
                        
                        checks++;
                        
                        // 只画网格内的检测线
                        batCtx.beginPath();
                        batCtx.moveTo(a.x, a.y);
                        batCtx.lineTo(b.x, b.y);
                        batCtx.stroke();

                        let dx = a.x - b.x;
                        let dy = a.y - b.y;
                        let dist = Math.sqrt(dx*dx + dy*dy);
                        
                        if (dist < (a.size + b.size) / 1.5) {
                            a.color = '#FF4444';
                            b.color = '#FF4444';
                        }
                    }
                }
            }
        }
    }

    // 绘制物体
    battleObjects.forEach(obj => {
        batCtx.fillStyle = obj.color;
        batCtx.fillRect(obj.x - obj.size/2, obj.y - obj.size/2, obj.size, obj.size);
    });

    // 更新UI数据
    objCountDisplay.textContent = battleObjects.length;
    checkCountDisplay.textContent = checks;
    
    // 计算并显示负载条
    // 设定一个固定的基准值，这样能真实反映运算量的增长
    // 比如 100 个物体的全排列检测约为 5000 次，我们以此为满负载基准
    const MAX_BENCHMARK = 5000; 
    let loadPercent = (checks / MAX_BENCHMARK) * 100;
    
    // 限制最大 100% 防止溢出容器，但如果爆表了可以给个视觉反馈
    if (loadPercent > 100) loadPercent = 100;
    
    loadBar.style.width = `${loadPercent}%`;
    
    // 颜色逻辑：网格法用绿色，暴力法用红色
    // 如果暴力法爆表了，用深红色
    if (isGridMode) {
        loadBar.style.backgroundColor = '#4ECDC4';
    } else {
        loadBar.style.backgroundColor = (checks > MAX_BENCHMARK) ? '#8B0000' : '#FF6B6B';
    }
    
    // 更新负载条文字，显示更具体的信息
    const loadText = document.querySelector('.bar-container span');
    if (loadText) {
        let percentDisplay = Math.round((checks / MAX_BENCHMARK) * 100);
        loadText.textContent = `运算负载: ${percentDisplay}% (检测次数: ${checks})`;
        // 当背景深色时，文字变白以便阅读
        loadText.style.color = (loadPercent > 50) ? '#fff' : '#333';
        loadText.style.zIndex = 10; // 确保文字在进度条上方
    }
}

function animateBattle() {
    updateBattle();
    requestAnimationFrame(animateBattle);
}

// 绑定事件
battleModeBtn.addEventListener('click', () => {
    isGridMode = !isGridMode;
    battleModeBtn.textContent = isGridMode ? "切换模式：当前是[网格法]" : "切换模式：当前是[暴力法]";
    battleModeBtn.style.backgroundColor = isGridMode ? '#4ECDC4' : '#FF6B6B';
});

document.getElementById('add100Btn').addEventListener('click', () => {
    for(let i=0; i<50; i++) addBattleObject();
});

document.getElementById('resetBattleBtn').addEventListener('click', () => {
    battleObjects = [];
    for(let i=0; i<30; i++) addBattleObject();
});

initBattle();

// 代码高亮着色（简单版）
document.addEventListener('DOMContentLoaded', () => {
    const codeBlock = document.querySelector('code');
    // 使用 textContent 获取纯文本
    let text = codeBlock.textContent;

    // 1. 转义 - 使用 unicode 转义避免 XML 解析问题
    function escapeHtml(unsafe) {
        return unsafe
             .replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "&#039;");
    }

    // 2. 占位符策略
    const keywords = ['public', 'class', 'private', 'void', 'int', 'float', 'string', 'new', 'return', 'foreach', 'if', 'var', 'this'];
    const types = ['Dictionary', 'List', 'GameObject', 'Mathf'];
    
    let lines = text.split('\n');
    let formattedHtml = lines.map(line => {
        let escapedLine = escapeHtml(line); // 先整体转义
        
        let commentIndex = escapedLine.indexOf('//');
        let codePart = escapedLine;
        let commentPart = '';
        
        if (commentIndex !== -1) {
            codePart = escapedLine.substring(0, commentIndex);
            commentPart = `<span class="comment">${escapedLine.substring(commentIndex)}</span>`;
        }
        
        // 替换为占位符
        types.forEach(type => {
            codePart = codePart.replace(new RegExp(`\\b${type}\\b`, 'g'), `___TYPE_${type}___`);
        });
        keywords.forEach(kw => {
            codePart = codePart.replace(new RegExp(`\\b${kw}\\b`, 'g'), `___KW_${kw}___`);
        });
        
        // 还原为 HTML
        types.forEach(type => {
            codePart = codePart.replace(new RegExp(`___TYPE_${type}___`, 'g'), `<span class="type">${type}</span>`);
        });
        keywords.forEach(kw => {
            codePart = codePart.replace(new RegExp(`___KW_${kw}___`, 'g'), `<span class="keyword">${kw}</span>`);
        });
        
        // 字符串处理 (简单的双引号)
        // 注意：这里的引号是已经被转义过的 "
        codePart = codePart.replace(/(&quot;.*?&quot;)/g, '<span class="string">$1</span>');
            
        return codePart + commentPart;
    }).join('\n');
    
    codeBlock.innerHTML = formattedHtml;
});

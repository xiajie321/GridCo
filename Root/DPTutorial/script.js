/**
 * 动态规划 (DP) 互动演示
 * 捡金币问题 (Grid Path with Gold)
 */

const canvas = document.getElementById('dp-canvas');
const ctx = canvas.getContext('2d');
const resultBox = document.getElementById('result-display');

const btnGreedy = document.getElementById('btn-greedy');
const btnDP = document.getElementById('btn-dp');
const btnReset = document.getElementById('btn-reset');

// 配置
const ROWS = 8;
const COLS = 12;
const CELL_SIZE = 50;

// 数据
let grid = []; // 存储金币数
let dpTable = []; // 存储 DP 值
let path = []; // 存储路径 [{x, y}]
let currentState = 'idle'; // idle, running, done
let animationStep = 0;
let currentAlgo = ''; // 'greedy' or 'dp'

// 初始化网格
function initGrid() {
    grid = [];
    dpTable = [];
    path = [];
    currentState = 'idle';
    animationStep = 0;
    currentAlgo = '';
    
    // 随机生成金币，稍微倾向于右下角多一点，增加贪心陷阱的可能性
    for (let y = 0; y < ROWS; y++) {
        let row = [];
        for (let x = 0; x < COLS; x++) {
            let val = Math.floor(Math.random() * 10); // 0-9 金币
            // 制造一些高价值区域诱导贪心算法
            if (Math.random() < 0.1) val += 20; 
            row.push(val);
        }
        grid.push(row);
    }
    
    // 初始化 DP 表
    for (let y = 0; y < ROWS; y++) {
        let row = [];
        for (let x = 0; x < COLS; x++) {
            row.push(0);
        }
        dpTable.push(row);
    }

    resultBox.innerHTML = "地图已生成。起点(0,0)在左上，终点在右下。请选择算法。";
    draw();
}

// 贪心算法逻辑 (每次只选下一步金币最多的)
function runGreedy() {
    path = [{x: 0, y: 0}];
    let cx = 0, cy = 0;
    let total = grid[0][0];

    while (cx < COLS - 1 || cy < ROWS - 1) {
        let nextX = -1, nextY = -1;
        let valRight = -1, valDown = -1;

        // 向右
        if (cx < COLS - 1) valRight = grid[cy][cx + 1];
        // 向下
        if (cy < ROWS - 1) valDown = grid[cy + 1][cx];

        if (valRight > valDown) {
            cx++;
        } else if (valDown > valRight) {
            cy++;
        } else {
            // 相等时随便选一个，比如优先向右
            if (cx < COLS - 1) cx++; else cy++;
        }
        
        path.push({x: cx, y: cy});
        total += grid[cy][cx];
    }
    
    return total;
}

// 动态规划逻辑 (计算 DP 表)
function runDP() {
    // 1. 初始化起点
    dpTable[0][0] = grid[0][0];

    // 2. 填表 (为了动画效果，这里一次性算完，但动画会逐步显示)
    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            if (x === 0 && y === 0) continue;

            let fromTop = (y > 0) ? dpTable[y - 1][x] : -1;
            let fromLeft = (x > 0) ? dpTable[y][x - 1] : -1;

            dpTable[y][x] = grid[y][x] + Math.max(fromTop, fromLeft);
        }
    }

    // 3. 回溯路径
    path = [];
    let cx = COLS - 1;
    let cy = ROWS - 1;
    path.push({x: cx, y: cy});

    while (cx > 0 || cy > 0) {
        let valTop = (cy > 0) ? dpTable[cy - 1][cx] : -9999;
        let valLeft = (cx > 0) ? dpTable[cy][cx - 1] : -9999;

        if (valTop > valLeft) {
            cy--;
        } else {
            cx--;
        }
        path.push({x: cx, y: cy});
    }
    path.reverse(); // 翻转为从起点到终点

    return dpTable[ROWS-1][COLS-1];
}

// 绘图
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 绘制网格
    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            let px = x * CELL_SIZE;
            let py = y * CELL_SIZE;

            ctx.strokeRect(px, py, CELL_SIZE, CELL_SIZE);
            
            // 绘制金币数
            ctx.fillStyle = '#666';
            ctx.font = '14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(grid[y][x], px + CELL_SIZE/2, py + CELL_SIZE/2 + 5);

            // 如果是 DP 模式且动画已覆盖该格，显示 DP 值
            if (currentAlgo === 'dp' && currentState === 'running') {
                // 将 animationStep 映射到二维坐标
                let stepY = Math.floor(animationStep / COLS);
                let stepX = animationStep % COLS;
                
                // 已经计算过的格子显示背景色
                if (y < stepY || (y === stepY && x <= stepX)) {
                    ctx.fillStyle = 'rgba(33, 150, 243, 0.2)'; // 浅蓝
                    ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
                    
                    // 显示累积值 (小字)
                    ctx.fillStyle = '#2196F3';
                    ctx.font = '10px Arial';
                    ctx.fillText(dpTable[y][x], px + CELL_SIZE - 10, py + CELL_SIZE - 5);
                }
            }
        }
    }

    // 绘制路径
    if (path.length > 0) {
        ctx.beginPath();
        // 根据动画进度绘制部分路径
        let drawCount = (currentAlgo === 'dp' && currentState === 'running') ? 0 : 
                        (currentState === 'running' ? animationStep : path.length);
        
        // DP 模式是在填表完成后再画路径，或者是填表过程中不画路径
        // 这里设定：DP 模式先填表动画，填完后瞬间显示路径
        // 贪心模式：逐步画路径动画
        
        if (currentAlgo === 'greedy') {
             for (let i = 0; i < drawCount; i++) {
                let p = path[i];
                let px = p.x * CELL_SIZE + CELL_SIZE/2;
                let py = p.y * CELL_SIZE + CELL_SIZE/2;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
        } else if (currentAlgo === 'dp' && currentState === 'done') {
            // DP 完成后画全路径
             for (let i = 0; i < path.length; i++) {
                let p = path[i];
                let px = p.x * CELL_SIZE + CELL_SIZE/2;
                let py = p.y * CELL_SIZE + CELL_SIZE/2;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
        }

        ctx.strokeStyle = '#E91E63';
        ctx.lineWidth = 4;
        ctx.stroke();

        // 绘制当前头节点 (仅贪心模式)
        if (currentAlgo === 'greedy' && drawCount > 0 && drawCount <= path.length) {
            let head = path[drawCount-1];
            ctx.beginPath();
            ctx.arc(head.x * CELL_SIZE + CELL_SIZE/2, head.y * CELL_SIZE + CELL_SIZE/2, 5, 0, Math.PI*2);
            ctx.fillStyle = '#E91E63';
            ctx.fill();
        }
    }
}

function animate() {
    if (currentState === 'running') {
        if (currentAlgo === 'greedy') {
            if (animationStep < path.length) {
                animationStep++;
            } else {
                currentState = 'done';
                let total = 0;
                path.forEach(p => total += grid[p.y][p.x]);
                resultBox.innerHTML = `<strong>贪心算法完成：</strong> 总金币 = ${total}<br>只看眼前利益，通常不是最优解。`;
            }
        } else if (currentAlgo === 'dp') {
            // DP 动画：逐步填表
            if (animationStep < ROWS * COLS) {
                animationStep += 2; // 加快一点填表速度
            } else {
                currentState = 'done';
                let total = dpTable[ROWS-1][COLS-1];
                resultBox.innerHTML = `<strong>动态规划完成：</strong> 总金币 = ${total}<br>全局最优解！(右下角 DP 值)`;
            }
        }
    }
    
    draw();
    if (currentState === 'running') {
        requestAnimationFrame(animate);
    }
}

// 交互
btnGreedy.addEventListener('click', () => {
    if (currentState === 'running') return;
    currentAlgo = 'greedy';
    currentState = 'running';
    animationStep = 0;
    runGreedy(); // 预计算路径
    animate();
});

btnDP.addEventListener('click', () => {
    if (currentState === 'running') return;
    currentAlgo = 'dp';
    currentState = 'running';
    animationStep = 0;
    runDP(); // 预计算 DP 表和路径
    animate();
});

btnReset.addEventListener('click', () => {
    initGrid();
});

// 启动
initGrid();

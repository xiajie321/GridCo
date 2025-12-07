// 定义瓦片类型
const TILES = {
    LAND: 'land',
    COAST: 'coast',
    SEA: 'sea'
};

const COLORS = {
    [TILES.LAND]: '#4CAF50',
    [TILES.COAST]: '#FFC107',
    [TILES.SEA]: '#2196F3'
};

// 定义规则：每种地形可以相邻的地形
const RULES = {
    [TILES.LAND]: [TILES.LAND, TILES.COAST],
    [TILES.COAST]: [TILES.LAND, TILES.COAST, TILES.SEA],
    [TILES.SEA]: [TILES.COAST, TILES.SEA]
};

const GRID_SIZE = 10;
let grid = [];
let isProcessing = false;

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    initGrid();
    initSmallGrids();
    
    document.getElementById('btn-collapse-random').addEventListener('click', () => stepCollapse());
    document.getElementById('btn-auto-run').addEventListener('click', autoRun);
    document.getElementById('btn-reset').addEventListener('click', () => {
        isProcessing = false;
        initGrid();
    });

    document.getElementById('btn-gen-random').addEventListener('click', generateRandomComparison);
    document.getElementById('btn-gen-wfc').addEventListener('click', generateWFCComparison);
});

function initGrid() {
    const gridEl = document.getElementById('wfc-grid');
    gridEl.innerHTML = '';
    grid = [];

    for (let y = 0; y < GRID_SIZE; y++) {
        let row = [];
        for (let x = 0; x < GRID_SIZE; x++) {
            // 初始状态：每个格子包含所有可能性
            let cell = {
                x, y,
                collapsed: false,
                options: [TILES.LAND, TILES.COAST, TILES.SEA],
                element: document.createElement('div')
            };
            cell.element.className = 'cell';
            gridEl.appendChild(cell.element);
            row.push(cell);
            
            updateCellVisual(cell);
        }
        grid.push(row);
    }
    log("网格已重置。所有格子处于叠加态。");
}

function updateCellVisual(cell) {
    cell.element.innerHTML = '';
    cell.element.className = 'cell';

    if (cell.collapsed) {
        cell.element.style.backgroundColor = COLORS[cell.options[0]];
        cell.element.classList.add('collapsed');
    } else {
        // 显示叠加态
        cell.element.style.backgroundColor = '#eee';
        const superposition = document.createElement('div');
        superposition.className = 'superposition';
        
        cell.options.forEach(opt => {
            const mini = document.createElement('div');
            mini.className = `mini-option ${opt}`;
            superposition.appendChild(mini);
        });
        
        cell.element.appendChild(superposition);
    }
}

function log(msg) {
    document.getElementById('status-log').innerText = msg;
}

// 找到熵最小的格子（如果不止一个，随机选一个）
function findLowestEntropyCell() {
    let minEntropy = Infinity;
    let candidates = [];

    for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
            const cell = grid[y][x];
            if (!cell.collapsed) {
                const entropy = cell.options.length;
                if (entropy < minEntropy) {
                    minEntropy = entropy;
                    candidates = [cell];
                } else if (entropy === minEntropy) {
                    candidates.push(cell);
                }
            }
        }
    }

    if (candidates.length === 0) return null;
    return candidates[Math.floor(Math.random() * candidates.length)];
}

async function stepCollapse() {
    if (isProcessing) return;
    
    // 检查是否全部完成
    const cellToCollapse = findLowestEntropyCell();
    if (!cellToCollapse) {
        log("生成完成！所有波函数已坍缩。");
        return;
    }

    isProcessing = true;

    // 1. 观测 (Collapse)
    const pickedOption = cellToCollapse.options[Math.floor(Math.random() * cellToCollapse.options.length)];
    cellToCollapse.options = [pickedOption];
    cellToCollapse.collapsed = true;
    updateCellVisual(cellToCollapse);
    log(`观测坐标 (${cellToCollapse.x}, ${cellToCollapse.y}) -> ${pickedOption}`);

    // 2. 传播 (Propagate)
    await propagate(cellToCollapse);

    isProcessing = false;
}

async function autoRun() {
    if (isProcessing) return;
    isProcessing = true;
    
    while(true) {
        const cell = findLowestEntropyCell();
        if (!cell) {
            log("自动生成完成！");
            break;
        }

        // 坍缩
        const picked = cell.options[Math.floor(Math.random() * cell.options.length)];
        cell.options = [picked];
        cell.collapsed = true;
        updateCellVisual(cell);

        // 传播（不加延时以快速完成，或者加微小延时用于展示）
        await propagate(cell, 10);
        
        // 如果出现错误（无解），通常需要回溯，但这里为了简单直接重置或停止
        if (checkConflict()) {
             log("发生冲突（无解），请重置重试。");
             break;
        }
    }
    isProcessing = false;
}

// 检查是否有格子选项为空（死胡同）
function checkConflict() {
    for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
            if (grid[y][x].options.length === 0) return true;
        }
    }
    return false;
}

// 传播约束
async function propagate(startCell, delay = 50) {
    const stack = [startCell];

    while (stack.length > 0) {
        const current = stack.pop();
        const neighbors = getNeighbors(current.x, current.y);

        for (const neighbor of neighbors) {
            if (neighbor.collapsed) continue;

            // 检查邻居的每个选项是否合法
            const originalCount = neighbor.options.length;
            neighbor.options = neighbor.options.filter(neighborOption => {
                // 邻居的这个选项，是否与当前格子"现存"的任何选项兼容？
                // 注意：这里简化逻辑，只要 current 的可能选项里有一个能兼容 neighborOption 即可
                // 更严格的定义：Is compatible with AT LEAST ONE option of current cell
                
                // 反过来思考更直观：
                // neighborOption 必须能连接到 current.options 中的至少一个
                // 比如 current 可能是 [Land, Coast]。 neighborOption 是 Sea。
                // Sea 可以连 Coast 吗？可以。 所以 Sea 保留。
                
                return current.options.some(curOption => {
                    return RULES[curOption].includes(neighborOption);
                });
            });

            if (neighbor.options.length < originalCount) {
                updateCellVisual(neighbor);
                if (neighbor.options.length === 0) {
                    log("错误：出现无法填入的格子！");
                    return;
                }
                stack.push(neighbor);
                if (delay > 0) await new Promise(r => setTimeout(r, delay));
            }
        }
    }
}

function getNeighbors(x, y) {
    const neighbors = [];
    const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
    
    for (const [dx, dy] of dirs) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE) {
            neighbors.push(grid[ny][nx]);
        }
    }
    return neighbors;
}

// === 对比演示 ===

function initSmallGrids() {
    const randomGrid = document.getElementById('random-grid');
    const wfcGrid = document.getElementById('wfc-small-grid');
    
    // 只是创建格子结构
    for(let i=0; i<25; i++) {
        const cell1 = document.createElement('div');
        cell1.style.background = '#eee';
        randomGrid.appendChild(cell1);
        
        const cell2 = document.createElement('div');
        cell2.style.background = '#eee';
        wfcGrid.appendChild(cell2);
    }
}

function generateRandomComparison() {
    const container = document.getElementById('random-grid');
    const cells = container.children;
    const types = [TILES.LAND, TILES.COAST, TILES.SEA];
    
    for(let cell of cells) {
        const t = types[Math.floor(Math.random() * types.length)];
        cell.style.background = COLORS[t];
    }
}

function generateWFCComparison() {
    // 为小网格运行一次快速无动画的 WFC
    const size = 5;
    let tempGrid = [];
    
    // 初始化
    for (let y = 0; y < size; y++) {
        let row = [];
        for (let x = 0; x < size; x++) {
            row.push({
                x, y,
                collapsed: false,
                options: [TILES.LAND, TILES.COAST, TILES.SEA]
            });
        }
        tempGrid.push(row);
    }

    // 简单 WFC 循环
    let maxSteps = 100;
    while(maxSteps-- > 0) {
        // Find min entropy
        let minEntropy = Infinity;
        let candidates = [];
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                if (!tempGrid[y][x].collapsed) {
                    if (tempGrid[y][x].options.length < minEntropy) {
                        minEntropy = tempGrid[y][x].options.length;
                        candidates = [tempGrid[y][x]];
                    } else if (tempGrid[y][x].options.length === minEntropy) {
                        candidates.push(tempGrid[y][x]);
                    }
                }
            }
        }
        
        if (candidates.length === 0) break; // Done
        
        const cell = candidates[Math.floor(Math.random() * candidates.length)];
        const picked = cell.options[Math.floor(Math.random() * cell.options.length)];
        cell.options = [picked];
        cell.collapsed = true;
        
        // Propagate
        let stack = [cell];
        while(stack.length > 0) {
            let cur = stack.pop();
            const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
            for(let [dx, dy] of dirs) {
                let nx = cur.x + dx, ny = cur.y + dy;
                if(nx >= 0 && nx < size && ny >= 0 && ny < size) {
                    let neighbor = tempGrid[ny][nx];
                    if(neighbor.collapsed) continue;
                    
                    let originalLen = neighbor.options.length;
                    neighbor.options = neighbor.options.filter(nOpt => {
                        return cur.options.some(cOpt => RULES[cOpt].includes(nOpt));
                    });
                    
                    if(neighbor.options.length < originalLen) {
                        stack.push(neighbor);
                    }
                }
            }
        }
    }
    
    // 渲染
    const container = document.getElementById('wfc-small-grid');
    const cells = container.children;
    for(let y=0; y<size; y++) {
        for(let x=0; x<size; x++) {
            const cell = tempGrid[y][x];
            const div = cells[y*size + x];
            if(cell.options.length > 0) {
                 div.style.background = COLORS[cell.options[0]];
            } else {
                 div.style.background = '#000'; // Error
            }
        }
    }
}

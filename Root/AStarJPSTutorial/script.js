// 优先级队列实现 (最小堆)
class PriorityQueue {
    constructor() {
        this.items = [];
    }

    enqueue(element, priority) {
        const queueElement = { element, priority };
        let added = false;
        for (let i = 0; i < this.items.length; i++) {
            if (queueElement.priority < this.items[i].priority) {
                this.items.splice(i, 0, queueElement);
                added = true;
                break;
            }
        }
        if (!added) {
            this.items.push(queueElement);
        }
    }

    dequeue() {
        return this.items.shift();
    }

    isEmpty() {
        return this.items.length === 0;
    }
}

// 寻路可视化控制器
class PathfindingVisualizer {
    constructor(gridSize = 20, containerId = 'main-grid') {
        this.gridSize = gridSize;
        this.grid = [];
        this.container = document.getElementById(containerId);
        this.startPos = { x: 2, y: gridSize / 2 };
        this.endPos = { x: gridSize - 3, y: gridSize / 2 };
        this.isMouseDown = false;
        this.isMovingStart = false;
        this.isMovingEnd = false;
        this.currentAlgorithm = 'astar';
        this.animationSpeed = 20;
        this.isRunning = false;
        
        this.initGrid();
        this.addEventListeners();
    }

    initGrid() {
        this.container.innerHTML = '';
        this.container.style.gridTemplateColumns = `repeat(${this.gridSize}, 25px)`;
        this.grid = [];

        for (let y = 0; y < this.gridSize; y++) {
            const row = [];
            for (let x = 0; x < this.gridSize; x++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.x = x;
                cell.dataset.y = y;
                
                if (x === this.startPos.x && y === this.startPos.y) cell.classList.add('start');
                else if (x === this.endPos.x && y === this.endPos.y) cell.classList.add('end');

                this.container.appendChild(cell);
                row.push({
                    x, y,
                    isWall: false,
                    element: cell
                });
            }
            this.grid.push(row);
        }
    }

    addEventListeners() {
        this.container.addEventListener('mousedown', (e) => {
            if (this.isRunning) return;
            const cell = e.target.closest('.cell');
            if (!cell) return;

            const x = parseInt(cell.dataset.x);
            const y = parseInt(cell.dataset.y);

            if (x === this.startPos.x && y === this.startPos.y) {
                this.isMovingStart = true;
            } else if (x === this.endPos.x && y === this.endPos.y) {
                this.isMovingEnd = true;
            } else {
                this.toggleWall(x, y);
            }
            this.isMouseDown = true;
        });

        document.addEventListener('mouseup', () => {
            this.isMouseDown = false;
            this.isMovingStart = false;
            this.isMovingEnd = false;
        });

        this.container.addEventListener('mousemove', (e) => {
            if (!this.isMouseDown || this.isRunning) return;
            const cell = e.target.closest('.cell');
            if (!cell) return;

            const x = parseInt(cell.dataset.x);
            const y = parseInt(cell.dataset.y);

            if (this.isMovingStart) {
                if (!this.grid[y][x].isWall && (x !== this.endPos.x || y !== this.endPos.y)) {
                    this.grid[this.startPos.y][this.startPos.x].element.classList.remove('start');
                    this.startPos = { x, y };
                    cell.classList.add('start');
                }
            } else if (this.isMovingEnd) {
                if (!this.grid[y][x].isWall && (x !== this.startPos.x || y !== this.startPos.y)) {
                    this.grid[this.endPos.y][this.endPos.x].element.classList.remove('end');
                    this.endPos = { x, y };
                    cell.classList.add('end');
                }
            } else {
                if ((x !== this.startPos.x || y !== this.startPos.y) && 
                    (x !== this.endPos.x || y !== this.endPos.y)) {
                    this.toggleWall(x, y, true); // true for add only usually, but let's just toggle
                }
            }
        });
    }

    toggleWall(x, y, dragMode = false) {
        const node = this.grid[y][x];
        if (dragMode) {
             // 拖动时只添加墙，不移除，除非按住特定键（这里简化为只添加）
             if (!node.isWall) {
                 node.isWall = true;
                 node.element.classList.add('wall');
             }
        } else {
            node.isWall = !node.isWall;
            node.element.classList.toggle('wall');
        }
    }

    clearPath() {
        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                const cell = this.grid[y][x].element;
                cell.classList.remove('open', 'closed', 'path', 'jump-point', 'scanned');
            }
        }
    }

    resetGrid() {
        this.clearPath();
        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                this.grid[y][x].isWall = false;
                this.grid[y][x].element.classList.remove('wall');
            }
        }
    }

    async runAlgorithm() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.clearPath();

        const algo = document.getElementById('algorithm-select').value;
        const speed = document.getElementById('speed-range').value;
        this.animationSpeed = 105 - speed; // 反转速度值，值越大延迟越小

        let result;
        switch (algo) {
            case 'bfs': result = this.bfs(); break;
            case 'dfs': result = this.dfs(); break;
            case 'dijkstra': result = this.astar(true); break; // Dijkstra is A* with h=0
            case 'astar': result = this.astar(false); break;
            case 'jps': result = this.jps(); break;
        }

        await this.animate(result);
        this.isRunning = false;
    }

    // --- 算法实现 ---

    // 广度优先搜索
    bfs() {
        const queue = [this.startPos];
        const visited = new Set();
        const cameFrom = new Map();
        const animations = [];

        visited.add(`${this.startPos.x},${this.startPos.y}`);

        while (queue.length > 0) {
            const current = queue.shift();
            
            if (current.x === this.endPos.x && current.y === this.endPos.y) {
                break;
            }

            animations.push({ type: 'closed', x: current.x, y: current.y });

            const neighbors = this.getNeighbors(current);
            for (const neighbor of neighbors) {
                const key = `${neighbor.x},${neighbor.y}`;
                if (!visited.has(key)) {
                    visited.add(key);
                    cameFrom.set(key, current);
                    queue.push(neighbor);
                    animations.push({ type: 'open', x: neighbor.x, y: neighbor.y });
                }
            }
        }

        return { animations, cameFrom };
    }

    // 深度优先搜索
    dfs() {
        const stack = [this.startPos];
        const visited = new Set();
        const cameFrom = new Map();
        const animations = [];

        while (stack.length > 0) {
            const current = stack.pop(); // Stack -> LIFO
            const key = `${current.x},${current.y}`;

            if (!visited.has(key)) {
                visited.add(key);
                animations.push({ type: 'closed', x: current.x, y: current.y });

                if (current.x === this.endPos.x && current.y === this.endPos.y) {
                    break;
                }

                const neighbors = this.getNeighbors(current).reverse(); // Reverse for consistent visual order
                for (const neighbor of neighbors) {
                    const nKey = `${neighbor.x},${neighbor.y}`;
                    if (!visited.has(nKey)) {
                        cameFrom.set(nKey, current);
                        stack.push(neighbor);
                        animations.push({ type: 'open', x: neighbor.x, y: neighbor.y });
                    }
                }
            }
        }

        return { animations, cameFrom };
    }

    // A* 和 Dijkstra
    astar(isDijkstra) {
        const openSet = new PriorityQueue();
        openSet.enqueue(this.startPos, 0);
        
        const cameFrom = new Map();
        const gScore = new Map();
        const fScore = new Map();
        
        const startKey = `${this.startPos.x},${this.startPos.y}`;
        gScore.set(startKey, 0);
        fScore.set(startKey, isDijkstra ? 0 : this.heuristic(this.startPos, this.endPos));

        const animations = [];
        const closedSet = new Set();

        while (!openSet.isEmpty()) {
            const currentObj = openSet.dequeue();
            const current = currentObj.element;
            const currentKey = `${current.x},${current.y}`;

            if (closedSet.has(currentKey)) continue;
            closedSet.add(currentKey);
            animations.push({ type: 'closed', x: current.x, y: current.y });

            if (current.x === this.endPos.x && current.y === this.endPos.y) {
                break;
            }

            const neighbors = this.getNeighbors(current);
            for (const neighbor of neighbors) {
                const neighborKey = `${neighbor.x},${neighbor.y}`;
                if (closedSet.has(neighborKey)) continue;

                // 假设所有边的权重为 1
                const tentativeG = (gScore.get(currentKey) || 0) + 1;

                if (tentativeG < (gScore.get(neighborKey) || Infinity)) {
                    cameFrom.set(neighborKey, current);
                    gScore.set(neighborKey, tentativeG);
                    const h = isDijkstra ? 0 : this.heuristic(neighbor, this.endPos);
                    fScore.set(neighborKey, tentativeG + h);
                    openSet.enqueue(neighbor, tentativeG + h);
                    animations.push({ type: 'open', x: neighbor.x, y: neighbor.y });
                }
            }
        }

        return { animations, cameFrom };
    }

    // JPS (Jump Point Search)
    jps() {
        const openSet = new PriorityQueue();
        openSet.enqueue(this.startPos, 0);
        
        const cameFrom = new Map();
        const gScore = new Map();
        
        const startKey = `${this.startPos.x},${this.startPos.y}`;
        gScore.set(startKey, 0);

        const animations = [];
        const closedSet = new Set();

        while (!openSet.isEmpty()) {
            const currentObj = openSet.dequeue();
            const current = currentObj.element;
            const currentKey = `${current.x},${current.y}`;

            if (closedSet.has(currentKey)) continue;
            closedSet.add(currentKey);
            animations.push({ type: 'closed', x: current.x, y: current.y });

            if (current.x === this.endPos.x && current.y === this.endPos.y) break;

            const neighbors = this.getJPSNeighbors(current, cameFrom.get(currentKey));
            
            for (const neighbor of neighbors) {
                const jumpPoint = this.jump(neighbor, current, animations);
                
                if (jumpPoint) {
                    const jpKey = `${jumpPoint.x},${jumpPoint.y}`;
                    const dist = Math.abs(jumpPoint.x - current.x) + Math.abs(jumpPoint.y - current.y);
                    const newG = (gScore.get(currentKey) || 0) + dist;

                    if (newG < (gScore.get(jpKey) || Infinity)) {
                        cameFrom.set(jpKey, current);
                        gScore.set(jpKey, newG);
                        const f = newG + this.heuristic(jumpPoint, this.endPos);
                        openSet.enqueue(jumpPoint, f);
                        
                        // JPS特定：标记跳点
                        animations.push({ type: 'jump-point', x: jumpPoint.x, y: jumpPoint.y });
                    }
                }
            }
        }
        
        return { animations, cameFrom, isJPS: true };
    }

    // JPS 递归跳跃
    jump(node, parent, animations) {
        if (!this.isValid(node.x, node.y) || this.grid[node.y][node.x].isWall) return null;

        const dx = node.x - parent.x;
        const dy = node.y - parent.y;

        // 可视化：扫描线
        animations.push({ type: 'scanned', x: node.x, y: node.y });

        if (node.x === this.endPos.x && node.y === this.endPos.y) return node;

        // 4方向 JPS 规则：

        // 0. 目标对齐 (Target Alignment) - 针对空旷区域
        // 如果当前坐标轴与终点对齐，这可能是一个关键转折点
        if (dx !== 0) {
            if (node.x === this.endPos.x) return node;
        }
        if (dy !== 0) {
            if (node.y === this.endPos.y) return node;
        }
        
        // 1. 检查强制邻居 (Forced Neighbors)
        // 强制邻居意味着如果在当前节点不改变方向，就会错过某个路径
        if (dx !== 0) { // 水平移动
            // 检查上方：如果 (x-dx, y-1) 是墙 且 (x, y-1) 是空，说明如果不在这里向上转，就无法到达上方
            if ((this.isValid(node.x, node.y - 1) && !this.grid[node.y - 1][node.x].isWall) &&
                (this.isValid(node.x - dx, node.y - 1) && this.grid[node.y - 1][node.x - dx].isWall)) {
                return node;
            }
            // 检查下方
            if ((this.isValid(node.x, node.y + 1) && !this.grid[node.y + 1][node.x].isWall) &&
                (this.isValid(node.x - dx, node.y + 1) && this.grid[node.y + 1][node.x - dx].isWall)) {
                return node;
            }
        }
        else if (dy !== 0) { // 垂直移动
            // 检查左方
            if ((this.isValid(node.x - 1, node.y) && !this.grid[node.y][node.x - 1].isWall) &&
                (this.isValid(node.x - 1, node.y - dy) && this.grid[node.y - dy][node.x - 1].isWall)) {
                return node;
            }
            // 检查右方
            if ((this.isValid(node.x + 1, node.y) && !this.grid[node.y][node.x + 1].isWall) &&
                (this.isValid(node.x + 1, node.y - dy) && this.grid[node.y - dy][node.x + 1].isWall)) {
                return node;
            }

            // **关键修复**：对于垂直移动，必须检查水平方向是否能找到跳点
            // 这样才能在需要水平转弯的地方停下来
            // 注意：我们传入 animations 以便水平扫描也被可视化
            if (this.jump({x: node.x + 1, y: node.y}, node, animations) || 
                this.jump({x: node.x - 1, y: node.y}, node, animations)) {
                return node;
            }
        }

        // 继续沿当前方向跳跃
        if (this.isValid(node.x + dx, node.y + dy)) {
            return this.jump({ x: node.x + dx, y: node.y + dy }, node, animations);
        }

        return null;
    }

    getJPSNeighbors(node, parent) {
        if (!parent) return this.getNeighbors(node);

        const neighbors = [];
        // 标准化方向
        const dx = (node.x - parent.x) / Math.max(Math.abs(node.x - parent.x), 1);
        const dy = (node.y - parent.y) / Math.max(Math.abs(node.y - parent.y), 1);

        // 在 4 方向 JPS 中，跳点通常是转弯点。
        // 所以我们不仅要尝试直行，还要尝试 90 度转弯。
        // 这与 8 方向 JPS 不同（8 方向通常依靠强制邻居来转弯）。
        // 但为了保证完备性，特别是配合我们的 jump 逻辑（在垂直扫描中检查水平），
        // 我们在这里允许所有 3 个前进方向（直行、左转、右转），只要它们不撞墙。
        
        const tryDirs = [];
        tryDirs.push({x: dx, y: dy}); // 直行
        
        if (dx !== 0) { // 原本水平 -> 尝试垂直转向
            tryDirs.push({x: 0, y: 1});
            tryDirs.push({x: 0, y: -1});
        } else { // 原本垂直 -> 尝试水平转向
            tryDirs.push({x: 1, y: 0});
            tryDirs.push({x: -1, y: 0});
        }

        for (const dir of tryDirs) {
            const nx = node.x + dir.x;
            const ny = node.y + dir.y;
            // 基本检查：不越界，不是墙
            if (this.isValid(nx, ny) && !this.grid[ny][nx].isWall) {
                // 对于转弯，我们不需要检查强制邻居逻辑吗？
                // 在 jump 函数中会进行剪枝。如果我们在这里添加了无效的转弯方向，
                // jump 函数会立即因为没有理由继续而停止（返回 null），除非那个方向有东西。
                // 所以这里宽松一点没问题。
                neighbors.push({ x: nx, y: ny });
            }
        }
        
        // 注意：我们移除了之前的“强制邻居检测”逻辑，因为在这个宽松模式下，
        // 强制邻居的方向（也是转弯方向）已经被包含在 tryDirs 里了。

        return neighbors;
    }


    // 辅助函数
    getNeighbors(node) {
        const neighbors = [];
        const dirs = [[0, -1], [1, 0], [0, 1], [-1, 0]]; // 上右下左
        
        for (const [dx, dy] of dirs) {
            const nx = node.x + dx;
            const ny = node.y + dy;
            if (this.isValid(nx, ny) && !this.grid[ny][nx].isWall) {
                neighbors.push({ x: nx, y: ny });
            }
        }
        return neighbors;
    }

    isValid(x, y) {
        return x >= 0 && x < this.gridSize && y >= 0 && y < this.gridSize;
    }

    heuristic(a, b) {
        // 曼哈顿距离
        return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    }

    async animate(result) {
        const { animations, cameFrom, isJPS } = result;
        
        // 更新统计信息
        document.getElementById('visited-count').textContent = animations.filter(a => a.type === 'closed').length;

        // 播放探索动画
        for (const frame of animations) {
            if (!this.isRunning) return;
            const cell = this.grid[frame.y][frame.x].element;
            if (!cell.classList.contains('start') && !cell.classList.contains('end')) {
                cell.classList.remove('open', 'closed', 'scanned', 'jump-point'); // Clear previous states if overlap
                cell.classList.add(frame.type);
            }
            await new Promise(r => setTimeout(r, this.animationSpeed));
        }

        // 重建路径
        let currentKey = `${this.endPos.x},${this.endPos.y}`;
        let current = this.endPos;
        let pathLength = 0;

        // 注意：如果是 JPS，路径重建需要补全跳点之间的点
        while (cameFrom.has(currentKey)) {
            const prev = cameFrom.get(currentKey);
            
            if (isJPS) {
                // JPS: 绘制两点之间的线
                await this.drawPathLine(prev, current);
            } else {
                // 普通: 绘制单个点
                this.addPathClass(current);
            }
            
            pathLength++;
            current = prev;
            currentKey = `${current.x},${current.y}`;
            await new Promise(r => setTimeout(r, this.animationSpeed));
        }
        this.addPathClass(this.startPos); // 确保起点也亮起
        
        document.getElementById('path-length').textContent = pathLength;
    }

    addPathClass(node) {
        const cell = this.grid[node.y][node.x].element;
        if (!cell.classList.contains('start') && !cell.classList.contains('end')) {
            cell.classList.remove('closed', 'open', 'scanned', 'jump-point');
            cell.classList.add('path');
        }
    }

    async drawPathLine(from, to) {
        const dx = Math.sign(to.x - from.x);
        const dy = Math.sign(to.y - from.y);
        let currX = from.x;
        let currY = from.y;

        while (currX !== to.x || currY !== to.y) {
            if (currX !== from.x || currY !== from.y) { // Skip start of line
                 this.addPathClass({x: currX, y: currY});
            }
            currX += dx;
            currY += dy;
        }
        this.addPathClass(to);
    }
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    const visualizer = new PathfindingVisualizer(20, 'main-grid');

    document.getElementById('btn-run').addEventListener('click', () => visualizer.runAlgorithm());
    document.getElementById('btn-clear').addEventListener('click', () => visualizer.clearPath());
    document.getElementById('btn-reset').addEventListener('click', () => visualizer.resetGrid());
});

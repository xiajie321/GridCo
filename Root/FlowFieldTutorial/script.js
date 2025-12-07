class FlowFieldSystem {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        
        // 网格设置
        this.cols = 30;
        this.rows = 20;
        this.cellSize = 30;
        this.width = this.cols * this.cellSize;
        this.height = this.rows * this.cellSize;
        
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        // 场数据
        this.costField = [];        // 代价场 (1=路, 255=墙)
        this.integrationField = []; // 积分场 (到终点的距离)
        this.flowField = [];        // 流场 (向量)
        
        // 状态
        this.target = { x: 15, y: 10 };
        this.particles = [];
        this.isMouseDown = false;
        this.currentMode = 'wall'; // wall, target, spawn
        
        // 显示选项
        this.showCost = false;
        this.showIntegration = true;
        this.showFlow = true;
        this.showParticles = true;

        this.initFields();
        this.calculateFields();
        this.addEventListeners();
        this.startLoop();
    }

    initFields() {
        for (let x = 0; x < this.cols; x++) {
            this.costField[x] = [];
            this.integrationField[x] = [];
            this.flowField[x] = [];
            for (let y = 0; y < this.rows; y++) {
                this.costField[x][y] = 1; // 默认代价为1
                this.integrationField[x][y] = 65535; // 默认无限远
                this.flowField[x][y] = { x: 0, y: 0 };
            }
        }
    }

    // 核心算法：生成积分场 (Dijkstra)
    calculateIntegrationField() {
        // 1. 重置
        for (let x = 0; x < this.cols; x++) {
            for (let y = 0; y < this.rows; y++) {
                this.integrationField[x][y] = 65535;
            }
        }

        // 2. 从终点开始
        const openList = [];
        this.integrationField[this.target.x][this.target.y] = 0;
        openList.push(this.target);

        // 3. 扩散
        while (openList.length > 0) {
            const current = openList.shift(); // 简单的队列 (BFS/Dijkstra)

            const neighbors = this.getNeighbors(current);
            for (const neighbor of neighbors) {
                // 如果是墙 (代价255)，通常我们跳过它或者给它极高的积分
                if (this.costField[neighbor.x][neighbor.y] === 255) continue;

                const newCost = this.integrationField[current.x][current.y] + this.costField[neighbor.x][neighbor.y];
                
                if (newCost < this.integrationField[neighbor.x][neighbor.y]) {
                    this.integrationField[neighbor.x][neighbor.y] = newCost;
                    openList.push(neighbor);
                }
            }
        }
    }

    // 核心算法：生成流场 (Vector Field)
    calculateFlowField() {
        for (let x = 0; x < this.cols; x++) {
            for (let y = 0; y < this.rows; y++) {
                // 如果是障碍物或终点，向量为0
                if (this.costField[x][y] === 255 || (x === this.target.x && y === this.target.y)) {
                    this.flowField[x][y] = { x: 0, y: 0 };
                    continue;
                }

                let bestDist = this.integrationField[x][y];
                let bestDir = { x: 0, y: 0 };

                // 检查所有邻居，指向积分最小的那个
                const neighbors = this.getNeighbors({x, y});
                for (const n of neighbors) {
                    if (this.integrationField[n.x][n.y] < bestDist) {
                        bestDist = this.integrationField[n.x][n.y];
                        bestDir = { x: n.x - x, y: n.y - y };
                    }
                }
                
                this.flowField[x][y] = bestDir;
            }
        }
    }

    calculateFields() {
        this.calculateIntegrationField();
        this.calculateFlowField();
    }

    getNeighbors(node) {
        const neighbors = [];
        const dirs = [
            {x:0, y:-1}, {x:1, y:-1}, {x:1, y:0}, {x:1, y:1},
            {x:0, y:1}, {x:-1, y:1}, {x:-1, y:0}, {x:-1, y:-1}
        ]; // 8 方向

        for (const dir of dirs) {
            const nx = node.x + dir.x;
            const ny = node.y + dir.y;
            if (nx >= 0 && nx < this.cols && ny >= 0 && ny < this.rows) {
                neighbors.push({ x: nx, y: ny });
            }
        }
        return neighbors;
    }

    spawnParticle(x, y) {
        this.particles.push({
            x: x, 
            y: y,
            vx: (Math.random() - 0.5) * 2,
            vy: (Math.random() - 0.5) * 2,
            color: `hsl(${Math.random() * 60 + 200}, 100%, 50%)` // 蓝色系
        });
    }

    updateParticles() {
        const maxSpeed = 3;
        const steerForce = 0.2;

        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];
            
            // 1. 获取当前格子的流场向量
            const gridX = Math.floor(p.x / this.cellSize);
            const gridY = Math.floor(p.y / this.cellSize);

            if (gridX >= 0 && gridX < this.cols && gridY >= 0 && gridY < this.rows) {
                const flow = this.flowField[gridX][gridY];
                
                // 2. 施加力
                if (flow.x !== 0 || flow.y !== 0) {
                    p.vx += flow.x * steerForce;
                    p.vy += flow.y * steerForce;
                }
            }

            // 3. 限制速度
            const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
            if (speed > maxSpeed) {
                p.vx = (p.vx / speed) * maxSpeed;
                p.vy = (p.vy / speed) * maxSpeed;
            }

            // 4. 更新位置
            p.x += p.vx;
            p.y += p.vy;

            // 5. 到达终点判定
            const dx = p.x - (this.target.x * this.cellSize + this.cellSize/2);
            const dy = p.y - (this.target.y * this.cellSize + this.cellSize/2);
            if (dx*dx + dy*dy < 100) { // 距离小于10
                // 移除或重置
                // 为了演示效果，我们让它们就在终点附近转圈或消失
                // 这里我们稍微减速让它们聚集
                p.vx *= 0.9;
                p.vy *= 0.9;
            }
        }
    }

    draw() {
        this.ctx.clearRect(0, 0, this.width, this.height);

        // 绘制网格和场
        for (let x = 0; x < this.cols; x++) {
            for (let y = 0; y < this.rows; y++) {
                const px = x * this.cellSize;
                const py = y * this.cellSize;

                // 墙壁
                if (this.costField[x][y] === 255) {
                    this.ctx.fillStyle = '#333';
                    this.ctx.fillRect(px, py, this.cellSize, this.cellSize);
                    continue;
                }

                // 积分场 (热力图)
                if (this.showIntegration) {
                    const val = this.integrationField[x][y];
                    if (val < 60000) {
                        // 颜色映射：近=绿，远=红
                        const intensity = Math.min(val * 5, 255);
                        this.ctx.fillStyle = `rgb(${intensity}, ${255 - intensity}, 100)`;
                        this.ctx.fillRect(px, py, this.cellSize, this.cellSize);
                    }
                } else if (this.showCost) {
                     this.ctx.fillStyle = '#eee';
                     this.ctx.fillRect(px, py, this.cellSize, this.cellSize);
                } else {
                     this.ctx.fillStyle = '#fff';
                     this.ctx.fillRect(px, py, this.cellSize, this.cellSize);
                }

                // 网格线
                this.ctx.strokeStyle = '#ccc';
                this.ctx.strokeRect(px, py, this.cellSize, this.cellSize);

                // 流场 (箭头)
                if (this.showFlow && this.costField[x][y] !== 255) {
                    const flow = this.flowField[x][y];
                    if (flow.x !== 0 || flow.y !== 0) {
                        this.drawArrow(
                            px + this.cellSize/2, 
                            py + this.cellSize/2, 
                            flow.x, flow.y
                        );
                    }
                }
            }
        }

        // 绘制终点
        this.ctx.fillStyle = '#F44336';
        this.ctx.beginPath();
        this.ctx.arc(
            this.target.x * this.cellSize + this.cellSize/2,
            this.target.y * this.cellSize + this.cellSize/2,
            this.cellSize/3, 0, Math.PI * 2
        );
        this.ctx.fill();

        // 绘制粒子
        if (this.showParticles) {
            for (const p of this.particles) {
                this.ctx.fillStyle = p.color;
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
    }

    drawArrow(x, y, dx, dy) {
        this.ctx.strokeStyle = 'rgba(0,0,0,0.5)';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
        this.ctx.lineTo(x + dx * 10, y + dy * 10);
        this.ctx.stroke();
        
        // 简单的箭头头部
        // ... (略，为了性能和简单，简单的线段指示方向即可，或者一个小圆点)
        this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
        this.ctx.fillRect(x + dx * 10 - 2, y + dy * 10 - 2, 4, 4);
    }

    startLoop() {
        const loop = () => {
            this.updateParticles();
            this.draw();
            requestAnimationFrame(loop);
        };
        loop();
    }

    addEventListeners() {
        this.canvas.addEventListener('mousedown', (e) => this.handleMouse(e, true));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouse(e, false));
        document.addEventListener('mouseup', () => this.isMouseDown = false);

        // 按钮绑定
        document.getElementById('btn-mode-wall').onclick = () => this.setMode('wall');
        document.getElementById('btn-mode-target').onclick = () => this.setMode('target');
        document.getElementById('btn-mode-spawn').onclick = () => this.setMode('spawn');
        
        document.getElementById('btn-clear-walls').onclick = () => {
            this.initFields();
            this.calculateFields();
        };
        
        document.getElementById('btn-spawn-batch').onclick = () => {
             for(let i=0; i<50; i++) {
                 this.spawnParticle(Math.random()*this.width, Math.random()*this.height);
             }
        };

        // 切换视图
        document.getElementById('chk-flow').onchange = (e) => this.showFlow = e.target.checked;
        document.getElementById('chk-heat').onchange = (e) => this.showIntegration = e.target.checked;
    }

    setMode(mode) {
        this.currentMode = mode;
        document.querySelectorAll('.pixel-btn.mode').forEach(b => b.classList.remove('active'));
        document.getElementById(`btn-mode-${mode}`).classList.add('active');
    }

    handleMouse(e, isClick) {
        if (isClick) this.isMouseDown = true;
        if (!this.isMouseDown) return;

        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const gridX = Math.floor(x / this.cellSize);
        const gridY = Math.floor(y / this.cellSize);

        if (gridX < 0 || gridX >= this.cols || gridY < 0 || gridY >= this.rows) return;

        if (this.currentMode === 'wall') {
            if (this.costField[gridX][gridY] !== 255) {
                this.costField[gridX][gridY] = 255;
                this.calculateFields(); // 实时更新
            }
        } else if (this.currentMode === 'target') {
            this.target = { x: gridX, y: gridY };
            this.calculateFields(); // 实时更新
        } else if (this.currentMode === 'spawn') {
            this.spawnParticle(x, y);
        }
    }
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    new FlowFieldSystem('flow-canvas');
});

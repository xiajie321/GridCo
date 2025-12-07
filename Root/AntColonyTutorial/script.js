// 蚁群算法 (ACO) 演示脚本

// 配置参数
const config = {
    antCount: 50,
    evaporationRate: 0.98, // 信息素挥发率 (1 - 衰减)
    pheromoneStrength: 50, // 蚂蚁留下的信息素强度
    sensorAngle: Math.PI / 4, // 传感器角度
    sensorDist: 20, // 传感器距离
    turnSpeed: 0.2, // 转向速度
    moveSpeed: 2, // 移动速度
    randomness: 0.05, // 随机扰动
    showPheromone: 'food', // 'food', 'home', 'none'
};

// 全局变量
let width, height;
const canvas = document.getElementById('aco-canvas');
const ctx = canvas.getContext('2d');
let ants = [];
let grid = []; // 存储信息素网格
const gridSize = 4; // 网格大小 (像素)
let cols, rows;

// 特殊点
let home = { x: 50, y: 50, radius: 10 };
let food = { x: 300, y: 300, radius: 10 };
let obstacles = []; // 简单的圆形障碍物数组

class Ant {
    constructor() {
        this.reset();
    }

    reset() {
        this.x = home.x;
        this.y = home.y;
        this.angle = Math.random() * Math.PI * 2;
        this.hasFood = false;
    }

    update() {
        // 1. 感知信息素并转向
        this.sense();

        // 2. 随机扰动
        this.angle += (Math.random() - 0.5) * config.randomness;

        // 3. 移动
        this.x += Math.cos(this.angle) * config.moveSpeed;
        this.y += Math.sin(this.angle) * config.moveSpeed;

        // 4. 边界处理 (反弹)
        if (this.x < 0 || this.x > width || this.y < 0 || this.y > height) {
            this.angle = this.angle + Math.PI; // 掉头
            this.x = Math.max(0, Math.min(width, this.x));
            this.y = Math.max(0, Math.min(height, this.y));
        }

        // 5. 状态检查
        this.checkObjectives();
        
        // 6. 留下信息素
        this.deposit();
    }

    sense() {
        // 我们要寻找的目标信息素类型
        // 如果有食物，我们要找家 (HomePheromone - Index 0)
        // 如果没食物，我们要找食物 (FoodPheromone - Index 1)
        const targetType = this.hasFood ? 0 : 1; 

        // 左前，正前，右前
        const sensorLeft = this.getSensorPos(this.angle - config.sensorAngle);
        const sensorFront = this.getSensorPos(this.angle);
        const sensorRight = this.getSensorPos(this.angle + config.sensorAngle);

        const vLeft = this.getPheromoneLevel(sensorLeft.x, sensorLeft.y, targetType);
        const vFront = this.getPheromoneLevel(sensorFront.x, sensorFront.y, targetType);
        const vRight = this.getPheromoneLevel(sensorRight.x, sensorRight.y, targetType);

        if (vFront > vLeft && vFront > vRight) {
            // 继续直行，微调
        } else if (vFront < vLeft && vFront < vRight) {
            // 前方最弱，大幅随机转向
            this.angle += (Math.random() - 0.5) * 2 * config.turnSpeed;
        } else if (vLeft > vRight) {
            this.angle -= config.turnSpeed;
        } else if (vRight > vLeft) {
            this.angle += config.turnSpeed;
        }
    }

    getSensorPos(angle) {
        return {
            x: this.x + Math.cos(angle) * config.sensorDist,
            y: this.y + Math.sin(angle) * config.sensorDist
        };
    }

    getPheromoneLevel(x, y, type) {
        // 转换为网格坐标
        let gx = Math.floor(x / gridSize);
        let gy = Math.floor(y / gridSize);

        if (gx >= 0 && gx < cols && gy >= 0 && gy < rows) {
            return grid[gy * cols + gx][type];
        }
        return -1; // 边界外
    }

    deposit() {
        let gx = Math.floor(this.x / gridSize);
        let gy = Math.floor(this.y / gridSize);

        if (gx >= 0 && gx < cols && gy >= 0 && gy < rows) {
            // 如果拿着食物，留下"有食物"的信息素 (Type 1)，指引别人来食物这里
            // 如果空手，留下"家在这里"的信息素 (Type 0)，指引别人回家
            // 注意：这里逻辑有点绕。
            // 拿着食物的蚂蚁，走过的路径变成了 "ToFood" 路径（因为它刚从食物来）
            // 空手蚂蚁，走过的路径变成了 "ToHome" 路径（因为它刚从家来）
            
            const typeToDeposit = this.hasFood ? 1 : 0;
            // 只有当新信息素更强时才覆盖？或者累加并限制最大值
            let cell = grid[gy * cols + gx];
            cell[typeToDeposit] = Math.min(255, cell[typeToDeposit] + config.pheromoneStrength);
        }
    }

    checkObjectives() {
        // 距离检查
        let distToFood = Math.hypot(this.x - food.x, this.y - food.y);
        let distToHome = Math.hypot(this.x - home.x, this.y - home.y);

        if (!this.hasFood && distToFood < food.radius) {
            this.hasFood = true;
            this.angle += Math.PI; // 拿到食物，掉头回家
        } else if (this.hasFood && distToHome < home.radius) {
            this.hasFood = false;
            this.angle += Math.PI; // 放到家，掉头找吃的
        }
    }
}

function initGrid() {
    width = canvas.width;
    height = canvas.height;
    cols = Math.ceil(width / gridSize);
    rows = Math.ceil(height / gridSize);
    grid = new Array(cols * rows).fill(0).map(() => [0, 0]); // [HomePheromone, FoodPheromone]
}

function resizeCanvas() {
    if (!canvas) return;
    const container = canvas.parentElement;
    canvas.width = container.clientWidth;
    canvas.height = 400;
    
    // 重新初始化网格会丢失信息素，但为了适配大小必须这样做
    initGrid();
    home.x = 50; home.y = canvas.height / 2;
    food.x = canvas.width - 50; food.y = canvas.height / 2;
}

function updatePheromones() {
    for (let i = 0; i < grid.length; i++) {
        // 衰减
        grid[i][0] *= config.evaporationRate;
        grid[i][1] *= config.evaporationRate;
        
        // 极小值清理
        if (grid[i][0] < 0.1) grid[i][0] = 0;
        if (grid[i][1] < 0.1) grid[i][1] = 0;
    }
}

function draw() {
    // 1. 绘制信息素 (直接操作 ImageData 以提高性能)
    // 或者为了简单，用 fillRect 绘制网格
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, width, height);

    if (config.showPheromone !== 'none') {
        const type = config.showPheromone === 'food' ? 1 : 0;
        const colorBase = config.showPheromone === 'food' ? [255, 0, 0] : [0, 0, 255]; // 红/蓝

        // 使用 ImageData
        const imgData = ctx.getImageData(0, 0, width, height);
        const data = imgData.data;

        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                const val = grid[y * cols + x][type];
                if (val > 1) {
                    // 简单的像素放大
                    for (let py = 0; py < gridSize; py++) {
                        for (let px = 0; px < gridSize; px++) {
                            const pixelIndex = ((y * gridSize + py) * width + (x * gridSize + px)) * 4;
                            if (pixelIndex < data.length) {
                                // 绿色显示信息素
                                // 如果是 FoodPheromone (Type 1)，显示为绿色 (代表通往食物的路)
                                // 如果是 HomePheromone (Type 0)，显示为蓝色 (代表回家的路)
                                // 这里简化，统一用绿色，但深浅不同
                                const intensity = Math.min(255, val * 2);
                                data[pixelIndex] = 255 - intensity; // R
                                data[pixelIndex + 1] = 255; // G (White -> Green)
                                data[pixelIndex + 2] = 255 - intensity; // B
                                data[pixelIndex + 3] = 255; // Alpha
                            }
                        }
                    }
                }
            }
        }
        ctx.putImageData(imgData, 0, 0);
    }

    // 2. 绘制家和食物
    ctx.beginPath();
    ctx.arc(home.x, home.y, home.radius, 0, Math.PI * 2);
    ctx.fillStyle = 'blue';
    ctx.fill();
    ctx.fillStyle = 'white';
    ctx.fillText("家", home.x - 6, home.y + 4);

    ctx.beginPath();
    ctx.arc(food.x, food.y, food.radius, 0, Math.PI * 2);
    ctx.fillStyle = 'red';
    ctx.fill();
    ctx.fillStyle = 'white';
    ctx.fillText("食", food.x - 6, food.y + 4);

    // 3. 绘制蚂蚁
    for (let ant of ants) {
        ctx.fillStyle = ant.hasFood ? 'red' : 'black';
        ctx.fillRect(ant.x - 1, ant.y - 1, 3, 3);
    }
}

function animate() {
    updatePheromones();
    for (let ant of ants) {
        ant.update();
    }
    draw();
    requestAnimationFrame(animate);
}

// 初始化
function init() {
    resizeCanvas();
    ants = [];
    for (let i = 0; i < config.antCount; i++) {
        ants.push(new Ant());
    }
}

window.addEventListener('resize', resizeCanvas);
window.addEventListener('load', () => {
    init();
    animate();
    setupUI();
});

// UI 绑定
function setupUI() {
    const bindRange = (id, key, displayId) => {
        const el = document.getElementById(id);
        const display = document.getElementById(displayId);
        if (el) {
            el.addEventListener('input', (e) => {
                config[key] = parseFloat(e.target.value);
                if (display) display.textContent = config[key];
            });
        }
    };

    bindRange('range-ant', 'antCount', 'val-ant');
    bindRange('range-evap', 'evaporationRate', 'val-evap');

    document.getElementById('range-ant').addEventListener('input', (e) => {
        const count = parseInt(e.target.value);
        if (count > ants.length) {
            while (ants.length < count) ants.push(new Ant());
        } else {
            ants.length = count;
        }
    });

    document.getElementById('btn-reset').addEventListener('click', () => {
        // 清空信息素
        grid.fill(0).map(() => [0, 0]); // 这里不能这样 map，fill 是引用
        for(let i=0; i<grid.length; i++) grid[i] = [0, 0];
        // 重置蚂蚁
        for (let ant of ants) ant.reset();
    });
}

// 交互：点击移动目标 (简化为点击设置障碍太复杂，先做点击瞬移食物)
canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // 简单的交互：点击左半边移动家，点击右半边移动食物
    if (x < width / 2) {
        home.x = x; home.y = y;
        // 清除旧的家附近的信息素？不，保留
    } else {
        food.x = x; food.y = y;
    }
});

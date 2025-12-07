/**
 * 双网格系统教程交互脚本
 */

const COLOR_WATER = '#4ECDC4'; // 浅蓝绿
const COLOR_GRASS = '#95D160'; // 鲜绿
const COLOR_GRID_LOGIC = 'rgba(0, 0, 255, 0.3)';
const COLOR_GRID_RENDER = 'rgba(255, 0, 0, 0.5)';
const TILE_SIZE = 32;

// 全局资源
let tilesetImage = null;

window.onload = function() {
    initTileset();
    initBaseShapesDemo(); // 新增
    initPrincipleDemo();
    initEditor();
};

/**
 * 1. 生成并展示 16 个图块 (Marching Squares)
 */
function initTileset() {
    const canvas = document.getElementById('tilesetCanvas');
    const ctx = canvas.getContext('2d');
    
    // 我们生成一个包含 16 个图块的单行图集
    // 每个图块 32x32，为了清晰展示，我们在展示 Canvas 上画大一点
    
    // 创建离屏 Canvas 用于生成实际纹理
    const buffer = document.createElement('canvas');
    buffer.width = TILE_SIZE * 16;
    buffer.height = TILE_SIZE;
    const bCtx = buffer.getContext('2d');

    // 绘制 16 种情况
    for (let i = 0; i < 16; i++) {
        // 使用新的旋转逻辑绘制，证明 "只需5张图" 的理论
        drawRotatedTile(bCtx, i, i * TILE_SIZE, 0, TILE_SIZE);
    }

    // 保存为全局图像资源
    tilesetImage = buffer;

    // 将生成的图集绘制到展示 Canvas 上 (放大显示)
    // 假设展示 Canvas 宽度足够，我们分两行显示
    const displaySize = 64;
    canvas.width = displaySize * 8;
    canvas.height = displaySize * 2;
    ctx.imageSmoothingEnabled = false;

    for (let i = 0; i < 16; i++) {
        // 计算在展示 Canvas 上的位置
        const col = i % 8;
        const row = Math.floor(i / 8);
        
        // 从 buffer 绘制到 display
        ctx.drawImage(
            buffer, 
            i * TILE_SIZE, 0, TILE_SIZE, TILE_SIZE,
            col * displaySize, row * displaySize, displaySize, displaySize
        );

        // 绘制边框和编号
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.strokeRect(col * displaySize, row * displaySize, displaySize, displaySize);
        
        ctx.fillStyle = '#000';
        ctx.font = '14px Consolas';
        ctx.fillText(i, col * displaySize + 5, row * displaySize + 15);
        
        // 绘制二进制角标 (TL, TR, BL, BR)
        // 这个 i 的二进制位分别代表 BL(4), BR(8), TL(1), TR(2) ??? 
        // 让我们统一标准：
        // 1 = TL, 2 = TR, 4 = BL, 8 = BR
        const bits = i.toString(2).padStart(4, '0').split('').reverse().join('');
        ctx.font = '10px monospace';
        ctx.fillStyle = '#666';
        // ctx.fillText(bits, col * displaySize + 5, row * displaySize + displaySize - 5);
    }
}

/**
 * 2.5 进阶：展示 5 个基础形状
 */
function initBaseShapesDemo() {
    const shapes = [
        { id: 'baseShape1', type: 1 }, // 单角
        { id: 'baseShape2', type: 3 }, // 边 (TL+TR)
        { id: 'baseShape3', type: 6 }, // 对角 (TR+BL)
        { id: 'baseShape4', type: 14 }, // 缺角 (!TL)
        { id: 'baseShape5', type: 15 } // 全满
    ];
    
    shapes.forEach(item => {
        const canvas = document.getElementById(item.id);
        if(!canvas) return;
        const ctx = canvas.getContext('2d');
        const size = canvas.width; // 64
        
        // 绘制基础形状
        // 为了复用，我们这里直接调用 drawBaseShape，但需要一个适配层
        // 因为 drawBaseShape 是画在 0,0 的
        drawBaseShape(ctx, item.type, size);
    });
}

/**
 * 核心：只绘制 5 种基础形状
 * @param {CanvasRenderingContext2D} ctx 
 * @param {number} baseType - 基础类型索引 (1, 3, 6, 14, 15)
 * @param {number} size 
 */
function drawBaseShape(ctx, baseType, size) {
    const h = size / 2;
    
    ctx.fillStyle = COLOR_WATER;
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = COLOR_GRASS;
    ctx.beginPath();

    switch(baseType) {
        case 1: // Base 1: 单角 (TL)
            ctx.moveTo(0, 0); ctx.lineTo(h, 0); ctx.quadraticCurveTo(h, h, 0, h); ctx.fill();
            break;
        case 3: // Base 2: 边 (Top Half)
            ctx.rect(0, 0, size, h); ctx.fill();
            break;
        case 6: // Base 3: 对角 (TR+BL)
            // TR
            ctx.moveTo(size, 0); ctx.lineTo(size, h); ctx.quadraticCurveTo(h, h, h, 0);
            // BL
            ctx.moveTo(0, size); ctx.lineTo(0, h); ctx.quadraticCurveTo(h, h, h, size);
            ctx.fill();
            break;
        case 14: // Base 4: 缺角 (!TL) -> 也就是说除了 TL 都是草
            // 填充全草
            ctx.rect(0, 0, size, size); ctx.fill();
            // 切掉 TL
            ctx.fillStyle = COLOR_WATER;
            ctx.beginPath();
            ctx.moveTo(0, 0); ctx.lineTo(h, 0); ctx.quadraticCurveTo(h, h, 0, h); ctx.fill();
            break;
        case 15: // Base 5: 全满
            ctx.rect(0, 0, size, size); ctx.fill();
            break;
    }
}

/**
 * 魔法函数：通过旋转绘制任意图块
 */
function drawRotatedTile(ctx, index, x, y, size) {
    // 查找表：index -> { base, angle }
    // angle: 0, 1(90), 2(180), 3(270)
    const map = {
        0: null, // 全空
        1: { b: 1, r: 0 },
        2: { b: 1, r: 1 },
        3: { b: 3, r: 0 },
        4: { b: 1, r: 3 },
        5: { b: 3, r: 3 },
        6: { b: 6, r: 0 },
        7: { b: 14, r: 2 }, // !BR -> 缺 TL 旋转 180
        8: { b: 1, r: 2 },
        9: { b: 6, r: 1 },
        10: { b: 3, r: 1 },
        11: { b: 14, r: 3 }, // !BL -> 缺 TL 旋转 270
        12: { b: 3, r: 2 },
        13: { b: 14, r: 1 }, // !TR -> 缺 TL 旋转 90
        14: { b: 14, r: 0 },
        15: { b: 15, r: 0 }
    };

    if (index === 0) {
        ctx.fillStyle = COLOR_WATER;
        ctx.fillRect(x, y, size, size);
        return;
    }

    const data = map[index];
    
    // 保存上下文状态
    ctx.save();
    
    // 移动到中心点进行旋转
    ctx.translate(x + size/2, y + size/2);
    ctx.rotate(data.r * 90 * Math.PI / 180);
    ctx.translate(-size/2, -size/2); // 回到左上角 (相对于新的坐标系)
    
    // 绘制基础形状
    drawBaseShape(ctx, data.b, size);
    
    ctx.restore();
}


/**
 * 2. 原理展示 Canvas
 */
function initPrincipleDemo() {
    const canvas = document.getElementById('principleCanvas');
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    
    // 状态
    let mouseX = 0;
    let mouseY = 0;
    
    // 配置
    const gridSize = 40;
    
    function draw() {
        ctx.clearRect(0, 0, w, h);
        
        const showLogic = document.getElementById('showLogicGrid').checked;
        const showRender = document.getElementById('showRenderGrid').checked;
        
        // 绘制逻辑网格 (蓝色)
        if (showLogic) {
            ctx.strokeStyle = COLOR_GRID_LOGIC;
            ctx.lineWidth = 2;
            ctx.beginPath();
            // 垂直线
            for(let x=0; x<=w; x+=gridSize) {
                ctx.moveTo(x, 0); ctx.lineTo(x, h);
            }
            // 水平线
            for(let y=0; y<=h; y+=gridSize) {
                ctx.moveTo(0, y); ctx.lineTo(w, y);
            }
            ctx.stroke();
            
            // 绘制逻辑格子的中心点 (用户点击的地方)
            ctx.fillStyle = 'blue';
            for(let x=0; x<w; x+=gridSize) {
                for(let y=0; y<h; y+=gridSize) {
                    ctx.beginPath();
                    ctx.arc(x + gridSize/2, y + gridSize/2, 2, 0, Math.PI*2);
                    ctx.fill();
                }
            }
        }
        
        // 绘制渲染网格 (红色) - 偏移半个格子
        if (showRender) {
            ctx.strokeStyle = COLOR_GRID_RENDER;
            ctx.lineWidth = 2;
            const offset = gridSize / 2;
            
            ctx.beginPath();
            for(let x=offset; x<=w; x+=gridSize) {
                ctx.moveTo(x, 0); ctx.lineTo(x, h);
            }
            for(let y=offset; y<=h; y+=gridSize) {
                ctx.moveTo(0, y); ctx.lineTo(w, y);
            }
            ctx.stroke();
            
            // 强调：渲染网格的中心 = 逻辑网格的交点
             ctx.fillStyle = 'red';
            for(let x=offset; x<w; x+=gridSize) {
                for(let y=offset; y<h; y+=gridSize) {
                    // 这个点其实是逻辑网格的顶点
                    // ctx.fillRect(x + gridSize/2 - 2, y + gridSize/2 - 2, 4, 4);
                }
            }
        }
        
        // 绘制鼠标交互
        // 计算当前鼠标所在的逻辑格子
        const lX = Math.floor(mouseX / gridSize);
        const lY = Math.floor(mouseY / gridSize);
        
        // 高亮逻辑格子
        if (showLogic) {
            ctx.fillStyle = 'rgba(0, 0, 255, 0.1)';
            ctx.fillRect(lX * gridSize, lY * gridSize, gridSize, gridSize);
            
            // 绘制逻辑中心
            ctx.fillStyle = 'blue';
            ctx.beginPath();
            ctx.arc(lX * gridSize + gridSize/2, lY * gridSize + gridSize/2, 5, 0, Math.PI*2);
            ctx.fill();
        }
        
        // 计算所在的渲染格子
        // 渲染格子偏移了 -half
        const offset = gridSize / 2;
        const rX = Math.floor((mouseX - offset) / gridSize);
        const rY = Math.floor((mouseY - offset) / gridSize);
        
        if (showRender) {
            ctx.fillStyle = 'rgba(255, 0, 0, 0.1)';
            ctx.fillRect(rX * gridSize + offset, rY * gridSize + offset, gridSize, gridSize);
            
            // 绘制渲染格子的中心
            // 它应该正好落在逻辑网格的交点上
            const rcX = rX * gridSize + offset + gridSize/2;
            const rcY = rY * gridSize + offset + gridSize/2;
            
            ctx.fillStyle = 'red';
            ctx.beginPath();
            ctx.arc(rcX, rcY, 5, 0, Math.PI*2);
            ctx.fill();
            
            // 绘制连线：展示该渲染格子依赖哪4个逻辑中心
            // 渲染格子的四个角，正好是逻辑格子的中心！
            // 只有当两个网格都显示时才画线
            if (showLogic) {
                ctx.strokeStyle = '#333';
                ctx.setLineDash([2, 2]);
                ctx.lineWidth = 1;
                ctx.strokeRect(rX * gridSize + offset, rY * gridSize + offset, gridSize, gridSize);
                ctx.setLineDash([]);
            }
        }
        
        requestAnimationFrame(draw);
    }
    
    // 事件监听
    canvas.addEventListener('mousemove', e => {
        const rect = canvas.getBoundingClientRect();
        mouseX = e.clientX - rect.left;
        mouseY = e.clientY - rect.top;
    });
    
    draw();
}

/**
 * 3. 地图编辑器
 */
function initEditor() {
    const canvas = document.getElementById('editorCanvas');
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    
    // 逻辑网格数据 (0=水, 1=草)
    // 尺寸：为了覆盖整个canvas，逻辑网格应该是 canvasSize / TILE_SIZE
    const cols = Math.ceil(w / TILE_SIZE);
    const rows = Math.ceil(h / TILE_SIZE);
    
    let logicMap = new Array(cols * rows).fill(0);
    
    let isDrawing = false;
    let drawValue = 1; // 1=草, 0=水
    
    // 工具函数：获取逻辑值 (带边界检查)
    function getLogic(x, y) {
        if (x < 0 || x >= cols || y < 0 || y >= rows) return 0; // 默认边界外是水
        return logicMap[y * cols + x];
    }
    
    function setLogic(x, y, val) {
        if (x < 0 || x >= cols || y < 0 || y >= rows) return;
        logicMap[y * cols + x] = val;
    }
    
    // 随机生成
    document.getElementById('randomMapBtn').addEventListener('click', () => {
        for(let i=0; i<logicMap.length; i++) {
            logicMap[i] = Math.random() > 0.7 ? 1 : 0;
        }
        render();
    });
    
    // 清空
    document.getElementById('clearMapBtn').addEventListener('click', () => {
        logicMap.fill(0);
        render();
    });

    // 渲染循环
    function render() {
        ctx.clearRect(0, 0, w, h);
        
        // 1. 绘制渲染网格
        // 我们遍历每一个渲染图块的位置
        // 渲染图块 (rx, ry) 的位置其实是 (rx * size - size/2, ry * size - size/2)
        // 也就是它跨越了逻辑格子。
        
        // 实际上，为了方便，通常让 Tile 的左上角对应 Logic(x,y) 的中心?
        // 不，标准实现：
        // Tile(x, y) 的四个角对应 Logic(x, y), (x+1, y), (x, y+1), (x+1, y+1)
        // 这样 Tile(x, y) 的位置就是 Logic(x, y) 的位置。
        // Wait, 这样 Tile 的左上角就是 Logic(x,y) 的左上角吗？
        // 如果 Logic(x,y) 是一个格子，那么它的值代表这个格子整体属性？还是代表中心点属性？
        // Dual Grid 中，逻辑数据是"点"数据。
        // 所以，我们可以认为 Logic(x,y) 是 grid 的顶点。
        
        // 为了配合前面的视觉演示（逻辑格子是方块），我们假定：
        // 逻辑值 Logic(x, y) 代表的是第 x, y 个方块的颜色。
        // 那么渲染图块应该位于 (x-0.5, y-0.5) 的位置。
        
        const offset = -TILE_SIZE / 2;
        
        for (let y = 0; y <= rows; y++) {
            for (let x = 0; x <= cols; x++) {
                // 计算该渲染图块的 4 个角的值
                // 注意：由于 offset，渲染图块 (x,y) 覆盖的逻辑格子是 (x-1, y-1), (x, y-1), (x-1, y), (x, y)
                // 这取决于我们怎么对齐。
                
                // 让我们采用最直观的对齐：
                // 渲染图块 (x,y) 的 Top-Left 角对应 Logic(x-1, y-1)
                // Top-Right 对应 Logic(x, y-1)
                // Bottom-Left 对应 Logic(x-1, y)
                // Bottom-Right 对应 Logic(x, y)
                
                // 这样当我们在 canvas 上画 at (x*size + offset, y*size + offset) 时：
                // x=0, y=0 -> offset, offset. 它的 BR 是 Logic(0,0)
                
                const f_tl = getLogic(x-1, y-1);
                const f_tr = getLogic(x, y-1);
                const f_bl = getLogic(x-1, y);
                const f_br = getLogic(x, y); // 这里的 x,y 是循环变量，对应逻辑坐标
                
                // 计算索引
                // 这里的权重映射要和 drawProceduralTile 一致：
                // TL=1, TR=2, BL=4, BR=8
                const index = f_tl + (f_tr * 2) + (f_bl * 4) + (f_br * 8);
                
                // 绘制图块
                // 位置：x * size - size/2
                if (tilesetImage) {
                     ctx.drawImage(
                        tilesetImage,
                        index * TILE_SIZE, 0, TILE_SIZE, TILE_SIZE,
                        x * TILE_SIZE + offset, y * TILE_SIZE + offset, TILE_SIZE, TILE_SIZE
                    );
                }
            }
        }
        
        // 2. 绘制辅助线 (逻辑网格)
        if (document.getElementById('editorShowGrid').checked) {
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            for (let x = 0; x <= w; x += TILE_SIZE) {
                ctx.moveTo(x, 0); ctx.lineTo(x, h);
            }
            for (let y = 0; y <= h; y += TILE_SIZE) {
                ctx.moveTo(0, y); ctx.lineTo(w, y);
            }
            ctx.stroke();
            
            // 绘制逻辑点(中心)
            ctx.fillStyle = 'rgba(0, 0, 255, 0.3)';
            for (let y = 0; y < rows; y++) {
                for (let x = 0; x < cols; x++) {
                    if (logicMap[y*cols+x] === 1) {
                        ctx.beginPath();
                        ctx.arc(x*TILE_SIZE + TILE_SIZE/2, y*TILE_SIZE + TILE_SIZE/2, 2, 0, Math.PI*2);
                        ctx.fill();
                    }
                }
            }
        }
    }
    
    // 交互事件
    function handleInput(e) {
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // 计算逻辑坐标
        const lx = Math.floor(mouseX / TILE_SIZE);
        const ly = Math.floor(mouseY / TILE_SIZE);
        
        document.getElementById('coordDisplay').innerText = `X: ${lx}, Y: ${ly}`;
        
        // 移动光标
        const cursor = document.getElementById('cursorHighlight');
        if (lx >= 0 && lx < cols && ly >= 0 && ly < rows) {
            cursor.style.display = 'block';
            cursor.style.left = (lx * TILE_SIZE) + 'px';
            cursor.style.top = (ly * TILE_SIZE) + 'px';
            cursor.style.width = TILE_SIZE + 'px';
            cursor.style.height = TILE_SIZE + 'px';
        } else {
            cursor.style.display = 'none';
        }

        if (isDrawing) {
            if (e.buttons === 1) drawValue = 1; // 左键
            else if (e.buttons === 2) drawValue = 0; // 右键
            
            setLogic(lx, ly, drawValue);
            render();
        }
    }
    
    canvas.addEventListener('mousedown', e => {
        isDrawing = true;
        handleInput(e);
    });
    
    window.addEventListener('mouseup', () => {
        isDrawing = false;
    });
    
    canvas.addEventListener('mousemove', handleInput);
    
    // 禁用右键菜单
    canvas.addEventListener('contextmenu', e => e.preventDefault());
    
    // 初始 checkbox 监听
    document.getElementById('editorShowGrid').addEventListener('change', render);

    // 初始随机生成
    document.getElementById('randomMapBtn').click();
    render();
}

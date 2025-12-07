/**
 * 分治算法 (BSP 地牢生成) 互动演示
 */

const canvas = document.getElementById('bsp-canvas');
const ctx = canvas.getContext('2d');

const btnSplit = document.getElementById('btn-split');
const btnRooms = document.getElementById('btn-rooms');
const btnCorridors = document.getElementById('btn-corridors');
const btnReset = document.getElementById('btn-reset');

// BSP 节点类
class BSPNode {
    constructor(x, y, w, h) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.left = null;
        this.right = null;
        this.room = null; // {x, y, w, h}
        this.corridors = []; // 连接线
    }

    // 递归分割
    split(depth) {
        if (depth <= 0) return;

        // 随机选择分割方向 (H or V)
        // 如果太扁，强制切短边
        let splitH = Math.random() > 0.5;
        if (this.w > this.h * 1.5) splitH = false; // 垂直切
        else if (this.h > this.w * 1.5) splitH = true; // 水平切

        let minSize = 50; // 最小区块大小

        if (splitH) {
            // 水平分割 (y轴切开)
            // 检查是否有足够空间
            if (this.h < minSize * 2) return; 
            
            let splitY = Math.floor(Math.random() * (this.h - 2 * minSize)) + minSize;
            
            this.left = new BSPNode(this.x, this.y, this.w, splitY);
            this.right = new BSPNode(this.x, this.y + splitY, this.w, this.h - splitY);
        } else {
            // 垂直分割 (x轴切开)
            if (this.w < minSize * 2) return;

            let splitX = Math.floor(Math.random() * (this.w - 2 * minSize)) + minSize;
            
            this.left = new BSPNode(this.x, this.y, splitX, this.h);
            this.right = new BSPNode(this.x + splitX, this.y, this.w - splitX, this.h);
        }

        // 递归
        this.left.split(depth - 1);
        this.right.split(depth - 1);
    }

    // 生成房间
    createRooms() {
        if (this.left || this.right) {
            if (this.left) this.left.createRooms();
            if (this.right) this.right.createRooms();
        } else {
            // 叶子节点：创建房间
            let padding = 5;
            let rw = Math.floor(Math.random() * (this.w - 2 * padding - 20)) + 20;
            let rh = Math.floor(Math.random() * (this.h - 2 * padding - 20)) + 20;
            let rx = this.x + padding + Math.floor(Math.random() * (this.w - rw - 2 * padding));
            let ry = this.y + padding + Math.floor(Math.random() * (this.h - rh - 2 * padding));
            
            this.room = { x: rx, y: ry, w: rw, h: rh };
        }
    }

    // 获取房间中心点 (如果是分支节点，则取其叶子房间的中心点)
    getRoomCenter() {
        if (this.room) {
            return { x: this.room.x + this.room.w / 2, y: this.room.y + this.room.h / 2 };
        }
        if (this.left && this.right) {
            // 随便选一边作为中心点代表
            return this.left.getRoomCenter();
        }
        if (this.left) return this.left.getRoomCenter();
        if (this.right) return this.right.getRoomCenter();
        return null;
    }

    // 连接房间
    createCorridors() {
        if (this.left || this.right) {
            if (this.left) this.left.createCorridors();
            if (this.right) this.right.createCorridors();

            if (this.left && this.right) {
                // 连接左右子树
                let c1 = this.left.getRoomCenter();
                let c2 = this.right.getRoomCenter();
                if (c1 && c2) {
                    this.corridors.push({ start: c1, end: c2 });
                }
            }
        }
    }

    draw(ctx, showRooms, showCorridors) {
        // 1. 绘制分割线 (区块)
        if (!showRooms) { // 生成房间后就不显示分割线了，为了清爽
            ctx.strokeStyle = '#9C27B0'; // 紫色
            ctx.lineWidth = 1;
            ctx.strokeRect(this.x, this.y, this.w, this.h);
        }

        // 2. 绘制房间
        if (showRooms) {
            if (this.room) {
                ctx.fillStyle = '#8BC34A'; // 绿色
                ctx.fillRect(this.room.x, this.room.y, this.room.w, this.room.h);
                ctx.strokeStyle = '#33691E';
                ctx.strokeRect(this.room.x, this.room.y, this.room.w, this.room.h);
            }
        }

        // 递归绘制子节点
        if (this.left) this.left.draw(ctx, showRooms, showCorridors);
        if (this.right) this.right.draw(ctx, showRooms, showCorridors);

        // 3. 绘制通道 (后绘制，覆盖在上面)
        if (showCorridors) {
            ctx.strokeStyle = '#795548'; // 棕色
            ctx.lineWidth = 4;
            for (let c of this.corridors) {
                ctx.beginPath();
                ctx.moveTo(c.start.x, c.start.y);
                // 简单的 L 形通道
                // 随机决定先横还是先竖
                if (Math.random() > 0.5) {
                    ctx.lineTo(c.end.x, c.start.y);
                } else {
                    ctx.lineTo(c.start.x, c.end.y);
                }
                ctx.lineTo(c.end.x, c.end.y);
                ctx.stroke();
            }
        }
    }
}

// 状态
let rootNode = null;
let step = 0; // 0: init, 1: split, 2: rooms, 3: corridors

function init() {
    step = 0;
    rootNode = new BSPNode(10, 10, canvas.width - 20, canvas.height - 20);
    draw();
    updateButtons();
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 背景网格
    ctx.strokeStyle = '#f0f0f0';
    ctx.lineWidth = 1;
    for(let i=0; i<canvas.width; i+=40) {
        ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i,canvas.height); ctx.stroke();
    }
    for(let i=0; i<canvas.height; i+=40) {
        ctx.beginPath(); ctx.moveTo(0,i); ctx.lineTo(canvas.width,i); ctx.stroke();
    }

    if (rootNode) {
        rootNode.draw(ctx, step >= 2, step >= 3);
    }
}

function updateButtons() {
    btnSplit.disabled = step >= 1;
    btnRooms.disabled = step != 1;
    btnCorridors.disabled = step != 2;
    
    btnSplit.classList.toggle('disabled', step >= 1);
    btnRooms.classList.toggle('disabled', step != 1);
    btnCorridors.classList.toggle('disabled', step != 2);
}

// 事件绑定
btnSplit.addEventListener('click', () => {
    rootNode.split(4); // 递归深度 4
    step = 1;
    draw();
    updateButtons();
});

btnRooms.addEventListener('click', () => {
    rootNode.createRooms();
    step = 2;
    draw();
    updateButtons();
});

btnCorridors.addEventListener('click', () => {
    rootNode.createCorridors();
    step = 3;
    draw();
    updateButtons();
});

btnReset.addEventListener('click', init);

// 启动
init();

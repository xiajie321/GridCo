/**
 * 行为树互动演示
 * 一个微型的行为树引擎 + 可视化
 */

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const treeView = document.getElementById('tree-view');
const btnReset = document.getElementById('btn-reset');

// --- 微型行为树引擎 ---

const NodeState = {
    SUCCESS: 'success',
    FAILURE: 'failure',
    RUNNING: 'running',
    READY: 'ready' // 为了可视化增加的状态
};

class Node {
    constructor(name, type) {
        this.name = name;
        this.type = type; // 'composite', 'decorator', 'leaf'
        this.state = NodeState.READY;
        this.children = [];
        this.id = Math.random().toString(36).substr(2, 9);
        this.domElement = null; // 绑定的 DOM 元素
    }

    // 执行逻辑
    tick(blackboard) { return NodeState.SUCCESS; }

    addChild(node) {
        this.children.push(node);
        return this;
    }

    // 重置状态（用于每帧清理或可视化）
    reset() {
        this.state = NodeState.READY;
        this.children.forEach(c => c.reset());
        this.updateVisual();
    }

    updateVisual() {
        if (!this.domElement) return;
        this.domElement.className = 'node-item';
        if (this.state === NodeState.SUCCESS) this.domElement.classList.add('status-success');
        else if (this.state === NodeState.FAILURE) this.domElement.classList.add('status-failure');
        else if (this.state === NodeState.RUNNING) this.domElement.classList.add('status-running');
    }
}

class Selector extends Node {
    constructor(name = "Selector (?)") { super(name, 'composite'); }
    
    tick(blackboard) {
        this.state = NodeState.RUNNING;
        this.updateVisual();

        for (let child of this.children) {
            let status = child.tick(blackboard);
            if (status === NodeState.SUCCESS) {
                this.state = NodeState.SUCCESS;
                this.updateVisual();
                return NodeState.SUCCESS;
            }
            if (status === NodeState.RUNNING) {
                this.state = NodeState.RUNNING;
                this.updateVisual();
                return NodeState.RUNNING;
            }
        }
        this.state = NodeState.FAILURE;
        this.updateVisual();
        return NodeState.FAILURE;
    }
}

class Sequence extends Node {
    constructor(name = "Sequence (->)") { super(name, 'composite'); }

    tick(blackboard) {
        this.state = NodeState.RUNNING;
        this.updateVisual();

        for (let child of this.children) {
            let status = child.tick(blackboard);
            if (status === NodeState.FAILURE) {
                this.state = NodeState.FAILURE;
                this.updateVisual();
                return NodeState.FAILURE;
            }
            if (status === NodeState.RUNNING) {
                this.state = NodeState.RUNNING;
                this.updateVisual();
                return NodeState.RUNNING;
            }
        }
        this.state = NodeState.SUCCESS;
        this.updateVisual();
        return NodeState.SUCCESS;
    }
}

class Condition extends Node {
    constructor(name, predicate) {
        super(name, 'leaf');
        this.predicate = predicate;
    }

    tick(blackboard) {
        this.state = NodeState.RUNNING; // 为了可视化闪一下
        let result = this.predicate(blackboard) ? NodeState.SUCCESS : NodeState.FAILURE;
        this.state = result;
        this.updateVisual();
        return result;
    }
}

class Action extends Node {
    constructor(name, actionFunc) {
        super(name, 'leaf');
        this.actionFunc = actionFunc;
    }

    tick(blackboard) {
        let result = this.actionFunc(blackboard);
        this.state = result;
        this.updateVisual();
        return result;
    }
}

// --- 游戏逻辑 ---

let player = { x: 300, y: 200, color: 'blue', radius: 15 };
let guard = { x: 100, y: 200, color: 'red', radius: 15, speed: 2, state: 'idle' };
let dragging = false;

// 行为树定义
/*
Root (Selector)
  Sequence (追击)
    Condition: 看见玩家?
    Action: 追逐
  Action: 巡逻 (Default)
*/

let blackboard = {
    player: player,
    guard: guard,
    canvas: canvas
};

let btRoot = new Selector("Root (Selector)");
let chaseSeq = new Sequence("追击序列 (Sequence)");
let condSee = new Condition("看见玩家? (Condition)", (bb) => {
    let dx = bb.player.x - bb.guard.x;
    let dy = bb.player.y - bb.guard.y;
    let dist = Math.sqrt(dx*dx + dy*dy);
    return dist < 150; // 视野半径
});
let actChase = new Action("追逐! (Action)", (bb) => {
    let dx = bb.player.x - bb.guard.x;
    let dy = bb.player.y - bb.guard.y;
    let dist = Math.sqrt(dx*dx + dy*dy);
    
    if (dist > 5) {
        bb.guard.x += (dx / dist) * bb.guard.speed;
        bb.guard.y += (dy / dist) * bb.guard.speed;
        bb.guard.state = "Chasing!";
        return NodeState.RUNNING;
    } else {
        bb.guard.state = "Caught!";
        return NodeState.SUCCESS; // 抓到了
    }
});
let actPatrol = new Action("巡逻 (Action)", (bb) => {
    // 简单的上下巡逻
    let time = Date.now() / 1000;
    bb.guard.y = 200 + Math.sin(time) * 100;
    bb.guard.state = "Patrolling";
    return NodeState.RUNNING; // 巡逻是个持续动作
});

// 构建树
btRoot.addChild(chaseSeq);
chaseSeq.addChild(condSee);
chaseSeq.addChild(actChase);
btRoot.addChild(actPatrol);

// --- 可视化构建 ---

function buildTreeVisual(node, container) {
    let el = document.createElement('div');
    el.className = 'node-item';
    el.style.paddingLeft = '20px';
    el.style.color = '#FFF';
    el.style.fontFamily = 'monospace';
    el.textContent = node.name;
    
    node.domElement = el;
    container.appendChild(el);

    if (node.children) {
        node.children.forEach(child => buildTreeVisual(child, el)); // 嵌套
    }
}

// 扁平化构建，利用缩进来模拟层级，这样更容易控制样式
function buildTreeVisualFlat(node, container, depth=0) {
    let el = document.createElement('div');
    el.style.padding = '5px';
    el.style.paddingLeft = (depth * 20 + 10) + 'px';
    el.style.color = '#FFF';
    el.style.fontFamily = 'monospace';
    el.style.borderBottom = '1px solid #444';
    el.textContent = node.name;
    
    node.domElement = el;
    container.appendChild(el);

    if (node.children) {
        node.children.forEach(child => buildTreeVisualFlat(child, container, depth+1));
    }
}

buildTreeVisualFlat(btRoot, treeView);

// --- 游戏循环 ---

function update() {
    // 重置树状态视觉 (每帧重绘太快，可能看不清，但为了逻辑准确)
    // 实际项目中通常不需要每帧重置，只有变化时才变
    // 这里为了演示，我们每一帧都重新 tick
    
    // 清除上一次的状态类名（这部分稍微耗费性能，但在演示中没问题）
    document.querySelectorAll('.status-success, .status-failure, .status-running').forEach(el => {
        el.classList.remove('status-success', 'status-failure', 'status-running');
    });

    btRoot.tick(blackboard);
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 绘制视野范围
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, 150, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.1)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = 'rgba(255, 0, 0, 0.05)';
    ctx.fill();

    // 绘制卫兵
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, guard.radius, 0, Math.PI * 2);
    ctx.fillStyle = guard.color;
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText("AI", guard.x, guard.y + 4);
    
    // 绘制卫兵状态文字
    ctx.fillStyle = '#333';
    ctx.fillText(guard.state, guard.x, guard.y - 20);

    // 绘制玩家
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
    ctx.fillStyle = player.color;
    ctx.fill();
    ctx.fillStyle = '#FFF';
    ctx.fillText("Player", player.x, player.y + 4);
}

function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

// --- 交互 ---

canvas.addEventListener('mousedown', (e) => {
    let rect = canvas.getBoundingClientRect();
    let x = (e.clientX - rect.left) * (canvas.width / rect.width);
    let y = (e.clientY - rect.top) * (canvas.height / rect.height);
    
    let dx = x - player.x;
    let dy = y - player.y;
    if (dx*dx + dy*dy < player.radius * player.radius * 4) {
        dragging = true;
    }
});

window.addEventListener('mousemove', (e) => {
    if (dragging) {
        let rect = canvas.getBoundingClientRect();
        let x = (e.clientX - rect.left) * (canvas.width / rect.width);
        let y = (e.clientY - rect.top) * (canvas.height / rect.height);
        
        // 限制边界
        player.x = Math.max(15, Math.min(385, x));
        player.y = Math.max(15, Math.min(385, y));
    }
});

window.addEventListener('mouseup', () => {
    dragging = false;
});

btnReset.addEventListener('click', () => {
    player.x = 300; player.y = 200;
    guard.x = 100; guard.y = 200;
});

// 启动
loop();

/**
 * 有限状态机 (FSM) 互动演示
 */

const canvas = document.getElementById('fsm-canvas');
const ctx = canvas.getContext('2d');
const charDisplay = document.getElementById('char-display');
const charStatus = document.getElementById('char-status');

// 控件
const btnMove = document.getElementById('btn-move');
const btnJump = document.getElementById('btn-jump');
const btnAttack = document.getElementById('btn-attack');
const btnStop = document.getElementById('btn-stop');

// 状态定义
const States = {
    IDLE: 'Idle',
    MOVE: 'Move',
    JUMP: 'Jump',
    ATTACK: 'Attack'
};

// 状态图布局
const nodes = {
    [States.IDLE]: { x: 300, y: 200, color: '#FFD93D' },
    [States.MOVE]: { x: 100, y: 200, color: '#4CAF50' },
    [States.JUMP]: { x: 300, y: 50, color: '#2196F3' },
    [States.ATTACK]: { x: 500, y: 200, color: '#FF5252' }
};

// 转换规则 (from -> to)
// 这定义了图中的连线
const transitions = [
    { from: States.IDLE, to: States.MOVE },
    { from: States.IDLE, to: States.JUMP },
    { from: States.IDLE, to: States.ATTACK },
    { from: States.MOVE, to: States.IDLE },
    { from: States.MOVE, to: States.JUMP },
    { from: States.MOVE, to: States.ATTACK },
    { from: States.JUMP, to: States.IDLE }, // 落地
    { from: States.JUMP, to: States.MOVE }, // 空中移动落地
    { from: States.ATTACK, to: States.IDLE } // 攻击后摇结束
];

let currentState = States.IDLE;
let activeTransition = null; // 当前正在发生的高亮连线
let animationTimer = null;

// 状态机逻辑
function changeState(newState) {
    if (currentState === newState) return;

    // 检查是否允许转换 (这里为了演示简化了，基本允许大多数转换，除了 Jump -> Attack)
    if (currentState === States.JUMP && newState === States.ATTACK) return; // 空中不能攻击
    if (currentState === States.ATTACK && newState !== States.IDLE) return; // 攻击硬直中

    // 记录转换用于动画
    activeTransition = { from: currentState, to: newState, progress: 0 };
    
    // 执行状态逻辑
    currentState = newState;
    updateCharacter();
    
    // 自动恢复逻辑 (Jump 和 Attack 是瞬时或有持续时间的)
    if (newState === States.JUMP) {
        setTimeout(() => changeState(States.IDLE), 1000); // 1秒后落地
    } else if (newState === States.ATTACK) {
        setTimeout(() => changeState(States.IDLE), 500); // 0.5秒后攻击结束
    }
}

function updateCharacter() {
    charStatus.textContent = currentState;
    
    // 表情/动作变化
    switch (currentState) {
        case States.IDLE:
            charDisplay.textContent = "😐";
            charDisplay.style.transform = "scale(1)";
            break;
        case States.MOVE:
            charDisplay.textContent = "🏃";
            charDisplay.style.transform = "translateX(20px)";
            setTimeout(() => charDisplay.style.transform = "translateX(-20px)", 200); // 简单抖动
            break;
        case States.JUMP:
            charDisplay.textContent = "🚀";
            charDisplay.style.transform = "translateY(-50px)";
            break;
        case States.ATTACK:
            charDisplay.textContent = "⚔️";
            charDisplay.style.transform = "scale(1.5)";
            break;
    }
}

// 绘图
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 绘制连线
    transitions.forEach(t => {
        let start = nodes[t.from];
        let end = nodes[t.to];
        
        // 绘制箭头
        drawArrow(start, end, '#ddd');
    });

    // 绘制高亮连线
    if (activeTransition) {
        let start = nodes[activeTransition.from];
        let end = nodes[activeTransition.to];
        activeTransition.progress += 0.05;
        
        // 计算插值点
        let curX = start.x + (end.x - start.x) * activeTransition.progress;
        let curY = start.y + (end.y - start.y) * activeTransition.progress;
        
        ctx.beginPath();
        ctx.arc(curX, curY, 8, 0, Math.PI * 2);
        ctx.fillStyle = '#FFD93D';
        ctx.fill();

        if (activeTransition.progress >= 1) activeTransition = null;
    }

    // 绘制节点
    for (let key in nodes) {
        let n = nodes[key];
        let isActive = (key === currentState);
        
        ctx.beginPath();
        ctx.arc(n.x, n.y, 40, 0, Math.PI * 2);
        ctx.fillStyle = isActive ? n.color : '#EEE';
        ctx.fill();
        ctx.strokeStyle = isActive ? '#000' : '#999';
        ctx.lineWidth = isActive ? 4 : 2;
        ctx.stroke();

        ctx.fillStyle = isActive ? '#000' : '#666';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(key, n.x, n.y);
    }

    requestAnimationFrame(draw);
}

function drawArrow(from, to, color) {
    let angle = Math.atan2(to.y - from.y, to.x - from.x);
    let dist = Math.sqrt((to.x-from.x)**2 + (to.y-from.y)**2);
    let r = 40; // 节点半径
    
    // 计算边缘点
    let startX = from.x + Math.cos(angle) * r;
    let startY = from.y + Math.sin(angle) * r;
    let endX = to.x - Math.cos(angle) * r;
    let endY = to.y - Math.sin(angle) * r;

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();

    // 箭头
    let headLen = 10;
    ctx.beginPath();
    ctx.moveTo(endX, endY);
    ctx.lineTo(endX - headLen * Math.cos(angle - Math.PI / 6), endY - headLen * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(endX - headLen * Math.cos(angle + Math.PI / 6), endY - headLen * Math.sin(angle + Math.PI / 6));
    ctx.fillStyle = color;
    ctx.fill();
}

// 绑定按钮
btnMove.addEventListener('click', () => changeState(States.MOVE));
btnJump.addEventListener('click', () => changeState(States.JUMP));
btnAttack.addEventListener('click', () => changeState(States.ATTACK));
btnStop.addEventListener('click', () => changeState(States.IDLE));

// 启动
draw();

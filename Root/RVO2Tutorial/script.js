/**
 * RVO2 避障演示
 * 模拟两个智能体在狭窄空间或对向移动时的不同避障策略
 */

const canvas = document.getElementById('rvo-canvas');
const ctx = canvas.getContext('2d');

// 按钮
const btnNone = document.querySelector('[data-mode="none"]');
const btnForce = document.querySelector('[data-mode="force"]');
const btnRvo = document.querySelector('[data-mode="rvo"]');
const btnReset = document.getElementById('btn-reset');
const modeDesc = document.getElementById('mode-desc');

let currentMode = 'none';

// 智能体类
class Agent {
    constructor(id, x, y, color, targetX, targetY) {
        this.id = id;
        this.pos = { x: x, y: y };
        this.radius = 20;
        this.color = color;
        this.target = { x: targetX, y: targetY };
        this.velocity = { x: 0, y: 0 };
        this.maxSpeed = 2.0;
        this.prefVelocity = { x: 0, y: 0 }; // 期望速度 (指向目标)
    }

    reset(x, y, targetX, targetY) {
        this.pos = { x: x, y: y };
        this.target = { x: targetX, y: targetY };
        this.velocity = { x: 0, y: 0 };
    }

    update() {
        // 计算期望速度
        let dx = this.target.x - this.pos.x;
        let dy = this.target.y - this.pos.y;
        let dist = Math.sqrt(dx*dx + dy*dy);
        
        if (dist > 1) {
            this.prefVelocity = {
                x: (dx / dist) * this.maxSpeed,
                y: (dy / dist) * this.maxSpeed
            };
        } else {
            this.prefVelocity = { x: 0, y: 0 };
        }

        // 根据模式调整实际速度
        let newVelocity = { ...this.prefVelocity };

        if (currentMode === 'force') {
            newVelocity = this.applyForceAvoidance(newVelocity);
        } else if (currentMode === 'rvo') {
            newVelocity = this.applyRVOAvoidance(newVelocity);
        }

        this.velocity = newVelocity;
        
        // 移动
        this.pos.x += this.velocity.x;
        this.pos.y += this.velocity.y;
    }

    // 简单排斥力避障
    applyForceAvoidance(vel) {
        let avoidForce = { x: 0, y: 0 };
        agents.forEach(other => {
            if (other === this) return;
            
            let dx = this.pos.x - other.pos.x;
            let dy = this.pos.y - other.pos.y;
            let d = Math.sqrt(dx*dx + dy*dy);
            
            // 如果太近，产生排斥力
            let safeDist = (this.radius + other.radius) * 1.5;
            if (d < safeDist && d > 0) {
                // 力的大小与距离成反比
                let force = (safeDist - d) / safeDist; 
                avoidForce.x += (dx / d) * force * 2.0; // 强力推开
                avoidForce.y += (dy / d) * force * 2.0;
            }
        });

        return {
            x: vel.x + avoidForce.x,
            y: vel.y + avoidForce.y
        };
    }

    // 模拟 RVO 避障 (简化版逻辑)
    // 真正的 RVO 需要构建 VO 锥体并进行线性规划求解
    // 这里我们用一种简化的"侧向避让"逻辑来模拟其视觉效果
    applyRVOAvoidance(vel) {
        let finalVel = { ...vel };
        
        agents.forEach(other => {
            if (other === this) return;

            // 相对位置
            let relPos = {
                x: other.pos.x - this.pos.x,
                y: other.pos.y - this.pos.y
            };
            let dist = Math.sqrt(relPos.x*relPos.x + relPos.y*relPos.y);
            let combinedRadius = this.radius + other.radius;

            // 预测未来碰撞：如果我们保持当前速度
            // 简单的射线检测：看我们的速度方向是否指向对方
            // 归一化相对位置
            let relDir = { x: relPos.x / dist, y: relPos.y / dist };
            // 归一化速度
            let speed = Math.sqrt(vel.x*vel.x + vel.y*vel.y);
            if (speed < 0.01) return;
            let velDir = { x: vel.x / speed, y: vel.y / speed };

            // 点积计算夹角余弦
            let dot = velDir.x * relDir.x + velDir.y * relDir.y;

            // 如果面对面 (dot > 0.8) 并且距离较近 (预测未来会撞)
            if (dot > 0.7 && dist < combinedRadius * 4) {
                // RVO 核心：互惠。我们向右偏转一点。
                // 计算垂直于相对方向的向量 (向右)
                // (x, y) -> (-y, x) 是逆时针90度，(y, -x) 是顺时针90度
                // 我们统一向"右"避让 (假设右侧通行规则)
                let sideDir = { x: relDir.y, y: -relDir.x };
                
                // 避让力度取决于距离，越近力度越大
                let avoidFactor = 1.0 - (dist / (combinedRadius * 4));
                avoidFactor = Math.max(0, avoidFactor);

                // 叠加避让速度
                finalVel.x += sideDir.x * avoidFactor * 1.5;
                finalVel.y += sideDir.y * avoidFactor * 1.5;
                
                // 稍微减速一点
                finalVel.x *= 0.9; 
                finalVel.y *= 0.9;
            }
        });

        return finalVel;
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.stroke();

        // 绘制目标点连接线
        ctx.beginPath();
        ctx.moveTo(this.pos.x, this.pos.y);
        ctx.lineTo(this.target.x, this.target.y);
        ctx.strokeStyle = this.color;
        ctx.setLineDash([5, 5]);
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.setLineDash([]);

        // 绘制目标点
        ctx.beginPath();
        ctx.arc(this.target.x, this.target.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        
        // 绘制速度向量
        ctx.beginPath();
        ctx.moveTo(this.pos.x, this.pos.y);
        ctx.lineTo(this.pos.x + this.velocity.x * 20, this.pos.y + this.velocity.y * 20);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
}

// 初始化两个对向而行的 Agent
const agents = [
    new Agent(0, 100, 200, '#FF6B6B', 700, 200), // 红色，从左到右
    new Agent(1, 700, 200, '#00BCD4', 100, 200)  // 蓝色，从右到左
];

function resetAgents() {
    agents[0].reset(100, 200, 700, 200);
    agents[1].reset(700, 200, 100, 200);
}

// 动画循环
function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 绘制背景网格（为了更好看）
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 50) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }

    agents.forEach(agent => {
        agent.update();
        agent.draw();
    });

    requestAnimationFrame(animate);
}

// UI 交互
function setMode(mode) {
    currentMode = mode;
    
    // 更新按钮状态
    [btnNone, btnForce, btnRvo].forEach(btn => btn.classList.remove('active'));
    if (mode === 'none') {
        btnNone.classList.add('active');
        modeDesc.innerHTML = "<strong>无避障模式：</strong> 两个单位互相看不见，直接穿过对方，这在现实中是不可能的。";
    } else if (mode === 'force') {
        btnForce.classList.add('active');
        modeDesc.innerHTML = "<strong>排斥力模式：</strong> 只有靠得很近时才互相推挤。你会看到他们在接触瞬间剧烈减速和弹开，很不自然。";
    } else if (mode === 'rvo') {
        btnRvo.classList.add('active');
        modeDesc.innerHTML = "<strong>RVO 模式：</strong> 双方提前预判，各自向右微微偏转。即使还没碰到，就已经规划好了平滑的绕行路径。";
    }
    
    // 重置位置以便观察
    resetAgents();
}

btnNone.addEventListener('click', () => setMode('none'));
btnForce.addEventListener('click', () => setMode('force'));
btnRvo.addEventListener('click', () => setMode('rvo'));
btnReset.addEventListener('click', resetAgents);

// 启动
animate();

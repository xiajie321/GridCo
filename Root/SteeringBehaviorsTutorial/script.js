/**
 * Steering Behaviors 互动演示
 * 包含 Seek, Flee, Arrive, Wander, Pursuit 的实现
 */

const canvas = document.getElementById('steering-canvas');
const ctx = canvas.getContext('2d');

// UI 元素
const btnSeek = document.querySelector('[data-behavior="seek"]');
const btnFlee = document.querySelector('[data-behavior="flee"]');
const btnArrive = document.querySelector('[data-behavior="arrive"]');
const btnWander = document.querySelector('[data-behavior="wander"]');
const btnPursuit = document.querySelector('[data-behavior="pursuit"]');
const btns = [btnSeek, btnFlee, btnArrive, btnWander, btnPursuit];

const rangeSpeed = document.getElementById('range-speed');
const valSpeed = document.getElementById('val-speed');
const rangeForce = document.getElementById('range-force');
const valForce = document.getElementById('val-force');
const checkDebug = document.getElementById('check-debug');
const descBox = document.getElementById('behavior-description');

// 描述文本
const descriptions = {
    seek: "<strong>Seek (追逐):</strong> 智能体全速冲向目标点。就像飞蛾扑火。",
    flee: "<strong>Flee (逃避):</strong> 如果目标进入安全距离，智能体就全速反向逃跑。就像老鼠见猫。",
    arrive: "<strong>Arrive (抵达):</strong> 智能靠近目标时会自动减速，优雅地停在目标点，避免过冲。",
    wander: "<strong>Wander (徘徊):</strong> 智能体在场景中随机漫步。原理是在前方假想一个圆圈，在圆圈上投射一个随机目标。",
    pursuit: "<strong>Pursuit (拦截):</strong> 预测移动目标的未来位置，并直接去往那个未来点。试试点击画布让目标移动！"
};

// 状态
let currentBehavior = 'seek';
let target = { x: canvas.width / 2, y: canvas.height / 2 };
let movingTarget = {
    pos: { x: canvas.width / 2, y: canvas.height / 2 },
    vel: { x: 3, y: 2 } // 移动目标的初始速度
};

// 向量辅助函数
const Vector = {
    add: (v1, v2) => ({ x: v1.x + v2.x, y: v1.y + v2.y }),
    sub: (v1, v2) => ({ x: v1.x - v2.x, y: v1.y - v2.y }),
    mult: (v, n) => ({ x: v.x * n, y: v.y * n }),
    div: (v, n) => ({ x: v.x / n, y: v.y / n }),
    mag: (v) => Math.sqrt(v.x * v.x + v.y * v.y),
    normalize: (v) => {
        const m = Math.sqrt(v.x * v.x + v.y * v.y);
        return m === 0 ? { x: 0, y: 0 } : { x: v.x / m, y: v.y / m };
    },
    limit: (v, max) => {
        const mSq = v.x * v.x + v.y * v.y;
        if (mSq > max * max) {
            const m = Math.sqrt(mSq);
            return { x: (v.x / m) * max, y: (v.y / m) * max };
        }
        return v;
    },
    setMag: (v, len) => {
        const m = Math.sqrt(v.x * v.x + v.y * v.y);
        return m === 0 ? { x: 0, y: 0 } : { x: (v.x / m) * len, y: (v.y / m) * len };
    },
    copy: (v) => ({ x: v.x, y: v.y }),
    dist: (v1, v2) => Math.sqrt(Math.pow(v1.x - v2.x, 2) + Math.pow(v1.y - v2.y, 2))
};

// 智能体类
class Vehicle {
    constructor(x, y) {
        this.pos = { x: x, y: y };
        this.vel = { x: 0, y: 0 };
        this.acc = { x: 0, y: 0 };
        this.maxSpeed = 4;
        this.maxForce = 0.1;
        this.r = 6; // 绘制半径
        
        // Wander 专用变量
        this.wanderTheta = 0; 
    }

    update() {
        this.vel = Vector.add(this.vel, this.acc);
        this.vel = Vector.limit(this.vel, this.maxSpeed);
        this.pos = Vector.add(this.pos, this.vel);
        this.acc = { x: 0, y: 0 }; // 重置加速度

        // 边界处理：环绕
        if (this.pos.x < -this.r) this.pos.x = canvas.width + this.r;
        if (this.pos.y < -this.r) this.pos.y = canvas.height + this.r;
        if (this.pos.x > canvas.width + this.r) this.pos.x = -this.r;
        if (this.pos.y > canvas.height + this.r) this.pos.y = -this.r;
    }

    applyForce(force) {
        this.acc = Vector.add(this.acc, force);
    }

    // --- 行为 ---

    seek(targetPos) {
        // 期望速度 = 目标位置 - 当前位置
        let desired = Vector.sub(targetPos, this.pos);
        desired = Vector.setMag(desired, this.maxSpeed);

        // 转向力 = 期望速度 - 当前速度
        let steer = Vector.sub(desired, this.vel);
        steer = Vector.limit(steer, this.maxForce);

        // 调试绘制
        if (checkDebug.checked) {
            drawVector(this.pos, desired, 'rgba(0,255,0,0.5)', 50); // 绿色期望速度
            drawVector(this.pos, steer, 'rgba(255,0,0,0.5)', 50);   // 红色转向力
        }

        return steer;
    }

    flee(targetPos) {
        let desired = Vector.sub(this.pos, targetPos); // 反向
        let d = Vector.mag(desired);
        
        // 只有在距离内才逃跑
        if (d < 150) {
            desired = Vector.setMag(desired, this.maxSpeed);
            let steer = Vector.sub(desired, this.vel);
            steer = Vector.limit(steer, this.maxForce);
            return steer;
        }
        return { x: 0, y: 0 };
    }

    arrive(targetPos) {
        let desired = Vector.sub(targetPos, this.pos);
        let d = Vector.mag(desired);
        let speed = this.maxSpeed;

        if (d < 100) { // 减速半径 100
            speed = (d / 100) * this.maxSpeed;
        }

        desired = Vector.setMag(desired, speed);
        let steer = Vector.sub(desired, this.vel);
        steer = Vector.limit(steer, this.maxForce);
        return steer;
    }

    wander() {
        // Wander 圆的参数
        let wanderR = 25; // 半径
        let wanderD = 80; // 距离
        let change = 0.3; // 抖动幅度

        this.wanderTheta += (Math.random() * 2 - 1) * change;

        // 圆心位置
        let circlePos = Vector.copy(this.vel);
        circlePos = Vector.setMag(circlePos, wanderD);
        circlePos = Vector.add(this.pos, circlePos);

        // 目标在圆上的位置
        let h = this.vel.heading ? Math.atan2(this.vel.y, this.vel.x) : 0;
        // 如果没有内置 heading，手动计算
        if (!this.vel.heading) h = Math.atan2(this.vel.y, this.vel.x);
        
        let circleOffset = {
            x: wanderR * Math.cos(this.wanderTheta + h),
            y: wanderR * Math.sin(this.wanderTheta + h)
        };
        
        let targetPos = Vector.add(circlePos, circleOffset);
        
        // 调试绘制
        if (checkDebug.checked) {
            ctx.strokeStyle = 'rgba(0,0,0,0.2)';
            ctx.beginPath();
            ctx.arc(circlePos.x, circlePos.y, wanderR, 0, Math.PI * 2);
            ctx.stroke();
            
            ctx.fillStyle = 'red';
            ctx.beginPath();
            ctx.arc(targetPos.x, targetPos.y, 4, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.beginPath();
            ctx.moveTo(this.pos.x, this.pos.y);
            ctx.lineTo(circlePos.x, circlePos.y);
            ctx.lineTo(targetPos.x, targetPos.y);
            ctx.strokeStyle = 'rgba(0,0,0,0.1)';
            ctx.stroke();
        }

        return this.seek(targetPos);
    }

    pursuit(evader) {
        let d = Vector.dist(this.pos, evader.pos);
        // 预测时间 T = 距离 / (我们的速度 + 他们的速度)
        // 简单起见，直接用距离常数
        let T = d / this.maxSpeed; 
        
        let futurePos = Vector.copy(evader.vel);
        futurePos = Vector.mult(futurePos, T);
        futurePos = Vector.add(futurePos, evader.pos);

        if (checkDebug.checked) {
            ctx.fillStyle = 'rgba(255,0,0,0.3)';
            ctx.beginPath();
            ctx.arc(futurePos.x, futurePos.y, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'rgba(255,0,0,0.3)';
            ctx.beginPath();
            ctx.moveTo(evader.pos.x, evader.pos.y);
            ctx.lineTo(futurePos.x, futurePos.y);
            ctx.stroke();
        }

        return this.seek(futurePos);
    }

    display() {
        let angle = Math.atan2(this.vel.y, this.vel.x);
        
        ctx.save();
        ctx.translate(this.pos.x, this.pos.y);
        ctx.rotate(angle);

        // 绘制三角形车体
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        
        ctx.beginPath();
        ctx.moveTo(this.r * 2, 0);
        ctx.lineTo(-this.r, -this.r);
        ctx.lineTo(-this.r, this.r);
        ctx.closePath();
        
        ctx.fill();
        ctx.stroke();

        ctx.restore();
    }
}

// 实例化
const vehicle = new Vehicle(canvas.width / 2, canvas.height / 2);

// 辅助：绘制向量
function drawVector(pos, v, color, scale = 1) {
    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(v.x * scale, v.y * scale);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
}

// 动画循环
function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 绘制目标
    if (currentBehavior === 'pursuit') {
        // 移动目标逻辑
        movingTarget.pos = Vector.add(movingTarget.pos, movingTarget.vel);
        // 碰壁反弹
        if (movingTarget.pos.x < 0 || movingTarget.pos.x > canvas.width) movingTarget.vel.x *= -1;
        if (movingTarget.pos.y < 0 || movingTarget.pos.y > canvas.height) movingTarget.vel.y *= -1;

        // 绘制移动目标
        ctx.fillStyle = '#FF7F50';
        ctx.beginPath();
        ctx.arc(movingTarget.pos.x, movingTarget.pos.y, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    } else if (currentBehavior !== 'wander') {
        // 绘制静态目标
        ctx.beginPath();
        ctx.arc(target.x, target.y, 10, 0, Math.PI * 2);
        ctx.strokeStyle = '#FF7F50';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        ctx.beginPath();
        ctx.arc(target.x, target.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#FF7F50';
        ctx.fill();

        // 绘制 Flee 安全半径
        if (currentBehavior === 'flee' && checkDebug.checked) {
            ctx.beginPath();
            ctx.arc(target.x, target.y, 150, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255,0,0,0.1)';
            ctx.setLineDash([5, 5]);
            ctx.stroke();
            ctx.setLineDash([]);
        }
        // 绘制 Arrive 减速半径
        if (currentBehavior === 'arrive' && checkDebug.checked) {
            ctx.beginPath();
            ctx.arc(target.x, target.y, 100, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(0,0,255,0.1)';
            ctx.setLineDash([5, 5]);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }

    // 更新和绘制车辆
    let steering = { x: 0, y: 0 };
    switch (currentBehavior) {
        case 'seek':
            steering = vehicle.seek(target);
            break;
        case 'flee':
            steering = vehicle.flee(target);
            break;
        case 'arrive':
            steering = vehicle.arrive(target);
            break;
        case 'wander':
            steering = vehicle.wander();
            break;
        case 'pursuit':
            steering = vehicle.pursuit(movingTarget);
            break;
    }

    vehicle.applyForce(steering);
    vehicle.update();
    vehicle.display();

    requestAnimationFrame(animate);
}

// 事件监听
canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // 缩放坐标以匹配 canvas 实际大小
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    target = { x: x * scaleX, y: y * scaleY };
    
    // 在 pursuit 模式下，点击也可以重置移动目标位置
    if (currentBehavior === 'pursuit') {
        movingTarget.pos = { x: target.x, y: target.y };
        // 随机给个新方向
        movingTarget.vel = { 
            x: (Math.random() - 0.5) * 6, 
            y: (Math.random() - 0.5) * 6 
        };
    }
});

btns.forEach(btn => {
    btn.addEventListener('click', () => {
        // 更新 UI
        btns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // 更新行为
        currentBehavior = btn.dataset.behavior;
        descBox.innerHTML = descriptions[currentBehavior];
    });
});

rangeSpeed.addEventListener('input', (e) => {
    vehicle.maxSpeed = parseFloat(e.target.value);
    valSpeed.textContent = vehicle.maxSpeed.toFixed(1);
});

rangeForce.addEventListener('input', (e) => {
    vehicle.maxForce = parseFloat(e.target.value);
    valForce.textContent = vehicle.maxForce.toFixed(2);
});

// 启动
animate();

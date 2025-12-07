// Boids 算法演示脚本

// 配置参数
const config = {
    boidCount: 100,
    perceptionRadius: 50,
    maxSpeed: 4,
    maxForce: 0.1,
    separationWeight: 1.5,
    alignmentWeight: 1.0,
    cohesionWeight: 1.0,
    showRadius: false,
    useGrid: false // 是否使用网格优化（高级选项，演示中可选）
};

// 画布设置
const canvas = document.getElementById('boids-canvas');
const ctx = canvas.getContext('2d');
let width, height;

function resizeCanvas() {
    if (!canvas) return;
    const container = canvas.parentElement;
    canvas.width = container.clientWidth;
    canvas.height = 400; // 固定高度
    width = canvas.width;
    height = canvas.height;
}

window.addEventListener('resize', resizeCanvas);
// 初始调用放在最后

// 向量类
class Vector2 {
    constructor(x, y) {
        this.x = x || 0;
        this.y = y || 0;
    }

    add(v) {
        this.x += v.x;
        this.y += v.y;
        return this;
    }

    sub(v) {
        this.x -= v.x;
        this.y -= v.y;
        return this;
    }

    mult(n) {
        this.x *= n;
        this.y *= n;
        return this;
    }

    div(n) {
        this.x /= n;
        this.y /= n;
        return this;
    }

    mag() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    magSq() {
        return this.x * this.x + this.y * this.y;
    }

    setMag(n) {
        this.normalize();
        this.mult(n);
        return this;
    }

    normalize() {
        let m = this.mag();
        if (m !== 0) {
            this.div(m);
        }
        return this;
    }

    limit(max) {
        const mSq = this.magSq();
        if (mSq > max * max) {
            this.div(Math.sqrt(mSq));
            this.mult(max);
        }
        return this;
    }

    static dist(v1, v2) {
        let dx = v1.x - v2.x;
        let dy = v1.y - v2.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    static distSq(v1, v2) {
        let dx = v1.x - v2.x;
        let dy = v1.y - v2.y;
        return dx * dx + dy * dy;
    }

    copy() {
        return new Vector2(this.x, this.y);
    }
    
    // 静态方法，方便使用
    static sub(v1, v2) {
        return new Vector2(v1.x - v2.x, v1.y - v2.y);
    }
}

// Boid 类
class Boid {
    constructor() {
        this.position = new Vector2(Math.random() * width, Math.random() * height);
        this.velocity = new Vector2(Math.random() * 2 - 1, Math.random() * 2 - 1);
        this.velocity.setMag(Math.random() * 2 + 2);
        this.acceleration = new Vector2(0, 0);
        this.radius = 4; // 绘制大小
    }

    edges() {
        if (this.position.x > width) this.position.x = 0;
        else if (this.position.x < 0) this.position.x = width;
        if (this.position.y > height) this.position.y = 0;
        else if (this.position.y < 0) this.position.y = height;
    }

    // 核心算法：计算三个力
    flock(boids) {
        let separation = this.separation(boids);
        let alignment = this.alignment(boids);
        let cohesion = this.cohesion(boids);

        separation.mult(config.separationWeight);
        alignment.mult(config.alignmentWeight);
        cohesion.mult(config.cohesionWeight);

        this.acceleration.add(separation);
        this.acceleration.add(alignment);
        this.acceleration.add(cohesion);
    }

    update() {
        this.position.add(this.velocity);
        this.velocity.add(this.acceleration);
        this.velocity.limit(config.maxSpeed);
        this.acceleration.mult(0); // 重置加速度
        this.edges();
    }

    show() {
        // 绘制三角形
        let angle = Math.atan2(this.velocity.y, this.velocity.x);
        
        ctx.save();
        ctx.translate(this.position.x, this.position.y);
        ctx.rotate(angle);
        
        ctx.beginPath();
        ctx.moveTo(this.radius * 2, 0);
        ctx.lineTo(-this.radius, -this.radius);
        ctx.lineTo(-this.radius, this.radius);
        ctx.closePath();
        
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim() || '#00BCD4';
        ctx.fill();

        if (config.showRadius) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.beginPath();
            ctx.arc(0, 0, config.perceptionRadius, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.restore();
    }

    // 规则1：分离 (Separation) - 避开拥挤
    separation(boids) {
        let steering = new Vector2(0, 0);
        let total = 0;
        const perceptionRadiusSq = config.perceptionRadius * config.perceptionRadius;
        
        for (let other of boids) {
            if (other === this) continue;
            
            let dSq = Vector2.distSq(this.position, other.position);
            
            if (dSq < perceptionRadiusSq && dSq > 0) {
                let diff = Vector2.sub(this.position, other.position);
                diff.div(dSq); // 距离平方反比
                steering.add(diff);
                total++;
            }
        }
        
        if (total > 0) {
            steering.div(total);
            steering.setMag(config.maxSpeed);
            steering.sub(this.velocity);
            steering.limit(config.maxForce);
        }
        return steering;
    }

    // 规则2：对齐 (Alignment) - 也就是"从众"，跟大家方向一致
    alignment(boids) {
        let steering = new Vector2(0, 0);
        let total = 0;
        const perceptionRadiusSq = config.perceptionRadius * config.perceptionRadius;

        for (let other of boids) {
            if (other === this) continue;
            
            let dSq = Vector2.distSq(this.position, other.position);
            
            if (dSq < perceptionRadiusSq) {
                steering.add(other.velocity);
                total++;
            }
        }

        if (total > 0) {
            steering.div(total);
            steering.setMag(config.maxSpeed);
            steering.sub(this.velocity);
            steering.limit(config.maxForce);
        }
        return steering;
    }

    // 规则3：凝聚 (Cohesion) - 靠近平均中心
    cohesion(boids) {
        let steering = new Vector2(0, 0);
        let total = 0;
        const perceptionRadiusSq = config.perceptionRadius * config.perceptionRadius;

        for (let other of boids) {
            if (other === this) continue;
            
            let dSq = Vector2.distSq(this.position, other.position);
            
            if (dSq < perceptionRadiusSq) {
                steering.add(other.position);
                total++;
            }
        }

        if (total > 0) {
            steering.div(total);
            steering.sub(this.position); // 想要去的方向 = 目标位置 - 当前位置
            steering.setMag(config.maxSpeed);
            steering.sub(this.velocity);
            steering.limit(config.maxForce);
        }
        return steering;
    }
}

// 系统管理
const flock = [];

function init() {
    resizeCanvas();
    flock.length = 0;
    for (let i = 0; i < config.boidCount; i++) {
        flock.push(new Boid());
    }
}

function animate() {
    ctx.clearRect(0, 0, width, height); // 使用 clearRect 而不是 fillRect，显示 CSS 背景
    
    // 如果想要拖尾效果，可以用半透明背景覆盖
    // ctx.fillStyle = 'rgba(34, 34, 34, 0.2)';
    // ctx.fillRect(0, 0, width, height);

    // 为了性能，我们可以使用四叉树（这里为了简单直接 O(N^2)）
    // 教程重点是原理，演示规模较小，直接循环即可
    
    // 拷贝一份数组用于计算（快照），避免顺序依赖问题（可选）
    // 但实时更新通常也没问题
    
    for (let boid of flock) {
        boid.flock(flock);
        boid.update();
        boid.show();
    }

    requestAnimationFrame(animate);
}

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

    bindRange('range-sep', 'separationWeight', 'val-sep');
    bindRange('range-ali', 'alignmentWeight', 'val-ali');
    bindRange('range-coh', 'cohesionWeight', 'val-coh');
    bindRange('range-radius', 'perceptionRadius', 'val-radius');
    
    // 数量控制需要重置
    const countEl = document.getElementById('range-count');
    const countDisplay = document.getElementById('val-count');
    if (countEl) {
        countEl.addEventListener('input', (e) => {
            config.boidCount = parseInt(e.target.value);
            countDisplay.textContent = config.boidCount;
            // 动态增删，保持位置连续性
            if (flock.length < config.boidCount) {
                while (flock.length < config.boidCount) flock.push(new Boid());
            } else {
                flock.length = config.boidCount;
            }
        });
    }

    const radiusToggle = document.getElementById('check-radius');
    if (radiusToggle) {
        radiusToggle.addEventListener('change', (e) => {
            config.showRadius = e.target.checked;
        });
    }

    document.getElementById('btn-reset').addEventListener('click', () => {
        init();
    });
}

// 启动
window.addEventListener('load', () => {
    setupUI();
    init();
    animate();
});

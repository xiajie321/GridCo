document.addEventListener('DOMContentLoaded', () => {
    
    // ---------------------------------------------------------
    // 1. 模拟生成"切片"数据
    // ---------------------------------------------------------
    // 我们用 Canvas 动态生成一套"小汽车"的切片
    const LAYER_COUNT = 12;
    const SIZE = 64;
    const layers = [];

    function generateCarLayers() {
        for(let i=0; i<LAYER_COUNT; i++) {
            const canvas = document.createElement('canvas');
            canvas.width = SIZE;
            canvas.height = SIZE;
            const ctx = canvas.getContext('2d');
            
            // 清空
            ctx.clearRect(0,0,SIZE,SIZE);

            const cx = SIZE/2;
            const cy = SIZE/2;

            // 绘制逻辑：根据层数不同画不同东西 (简单的像素画)
            
            // 阴影 (Layer 0)
            if(i === 0) {
                ctx.fillStyle = 'rgba(0,0,0,0.5)';
                ctx.fillRect(cx-12, cy-20, 24, 40);
            }
            // 轮胎 (Layer 1-3)
            else if(i >= 1 && i <= 3) {
                ctx.fillStyle = '#222';
                // 四个轮子
                ctx.fillRect(cx-14, cy-18, 4, 10);
                ctx.fillRect(cx+10, cy-18, 4, 10);
                ctx.fillRect(cx-14, cy+8, 4, 10);
                ctx.fillRect(cx+10, cy+8, 4, 10);
                
                // 底盘连接
                if(i === 2) {
                    ctx.fillStyle = '#444';
                    ctx.fillRect(cx-10, cy-20, 20, 40);
                }
            }
            // 车身主体 (Layer 4-7)
            else if(i >= 4 && i <= 7) {
                ctx.fillStyle = '#F44336'; // 红色车身
                ctx.fillRect(cx-12, cy-22, 24, 44);
                
                // 车灯
                if(i === 5) {
                    ctx.fillStyle = '#FFEB3B'; // 黄色前灯
                    ctx.fillRect(cx-10, cy-24, 6, 2);
                    ctx.fillRect(cx+4, cy-24, 6, 2);
                }
            }
            // 车窗和车顶 (Layer 8-10)
            else if(i >= 8 && i <= 10) {
                // 驾驶室略小
                ctx.fillStyle = '#2196F3'; // 蓝色玻璃
                ctx.fillRect(cx-10, cy-10, 20, 20);
                
                if(i === 10) {
                    ctx.fillStyle = '#D32F2F'; // 车顶
                    ctx.fillRect(cx-10, cy-10, 20, 20);
                }
            }
            // 警灯 (Layer 11)
            else if(i === 11) {
                ctx.fillStyle = '#FF0000';
                ctx.fillRect(cx-4, cy-4, 8, 8);
            }

            layers.push(canvas);
        }
    }

    generateCarLayers();

    // ---------------------------------------------------------
    // 2. 显示层级拆解 (Explode View)
    // ---------------------------------------------------------
    const layerContainer = document.getElementById('layer-container');
    if(layerContainer) {
        layers.forEach((layerCanvas, index) => {
            const card = document.createElement('div');
            card.className = 'layer-card';
            
            // 克隆 Canvas 用于展示
            const displayCanvas = document.createElement('canvas');
            displayCanvas.width = SIZE;
            displayCanvas.height = SIZE;
            displayCanvas.getContext('2d').drawImage(layerCanvas, 0, 0);
            
            const label = document.createElement('span');
            label.textContent = `Layer ${index}`;
            
            card.appendChild(displayCanvas);
            card.appendChild(label);
            layerContainer.appendChild(card);
        });
    }

    // ---------------------------------------------------------
    // 3. 实时堆叠渲染 (Stacking Renderer)
    // ---------------------------------------------------------
    const mainCanvas = document.getElementById('canvas-stack');
    const ctx = mainCanvas.getContext('2d');
    
    const rangeRotation = document.getElementById('range-rotation');
    const rangeSpread = document.getElementById('range-spread');
    const valRotation = document.getElementById('val-rotation');
    const valSpread = document.getElementById('val-spread');

    let rotation = 0;
    let spread = 1.0;

    function renderStack() {
        if(!mainCanvas) return;
        
        // 清空画布
        ctx.clearRect(0, 0, mainCanvas.width, mainCanvas.height);
        
        // 开启像素艺术模式
        ctx.imageSmoothingEnabled = false;

        const centerX = mainCanvas.width / 2;
        const centerY = mainCanvas.height / 2;
        
        // 渲染每一层
        layers.forEach((layer, index) => {
            ctx.save();
            
            // 1. 移动到中心
            ctx.translate(centerX, centerY);
            
            // 2. 计算堆叠偏移 (Stacking Offset)
            // 关键：每一层向上移动一点点 (Y轴负方向)
            // 简单的垂直堆叠：
            const yOffset = -index * spread * 4; // *4 是为了放大效果明显一点
            ctx.translate(0, yOffset);
            
            // 3. 旋转 (Rotation)
            // 注意：我们旋转的是图片本身！围绕图片中心旋转。
            ctx.rotate(rotation * Math.PI / 180);
            
            // 4. 绘制图片 (居中绘制)
            // 放大一点显示 (scale 4x)
            const scale = 4;
            ctx.drawImage(layer, -SIZE*scale/2, -SIZE*scale/2, SIZE*scale, SIZE*scale);
            
            ctx.restore();
        });
    }

    // 动画循环
    function animate() {
        // 如果想让它自动转，可以取消注释下面这行
        // rotation = (rotation + 1) % 360; 
        // rangeRotation.value = rotation;
        // valRotation.textContent = rotation;
        
        renderStack();
        requestAnimationFrame(animate);
    }

    // 事件绑定
    if(rangeRotation) {
        rangeRotation.addEventListener('input', (e) => {
            rotation = parseInt(e.target.value);
            valRotation.textContent = rotation;
            renderStack();
        });
    }

    if(rangeSpread) {
        rangeSpread.addEventListener('input', (e) => {
            spread = parseFloat(e.target.value);
            valSpread.textContent = spread;
            renderStack();
        });
    }

    // 启动
    renderStack();
    
    // 自动演示一下旋转
    let autoRotateCount = 0;
    function introAnimate() {
        if(autoRotateCount < 360) {
            rotation = (rotation + 2) % 360;
            if(rangeRotation) rangeRotation.value = rotation;
            if(valRotation) valRotation.textContent = rotation;
            renderStack();
            autoRotateCount += 2;
            requestAnimationFrame(introAnimate);
        }
    }
    // 延迟一点启动自动演示
    setTimeout(introAnimate, 1000);
});

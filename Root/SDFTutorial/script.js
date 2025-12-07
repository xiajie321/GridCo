document.addEventListener('DOMContentLoaded', () => {
    initComparisonDemo();
    initDistanceDemo();
    initSignedDemo();
    initEffectDemo();
});

// 1. 位图 vs SDF 对比演示
function initComparisonDemo() {
    const bitmapCanvas = document.getElementById('bitmapCanvas');
    const sdfCanvas = document.getElementById('sdfPreviewCanvas');
    const zoomSlider = document.getElementById('zoomSlider');
    const zoomValue = document.getElementById('zoomValue');

    if (!bitmapCanvas || !sdfCanvas || !zoomSlider) return;

    const ctxB = bitmapCanvas.getContext('2d');
    const ctxS = sdfCanvas.getContext('2d');
    const size = 200;
    
    // 生成一个小尺寸的源图像 (32x32)，用于模拟低分辨率位图
    const sourceSize = 32;
    const sourceCanvas = document.createElement('canvas');
    sourceCanvas.width = sourceSize;
    sourceCanvas.height = sourceSize;
    const sCtx = sourceCanvas.getContext('2d');
    
    // 在源图像上画一个圆
    sCtx.fillStyle = '#000'; // 黑色背景
    sCtx.fillRect(0, 0, sourceSize, sourceSize);
    sCtx.fillStyle = '#fff'; // 白色圆形
    sCtx.beginPath();
    sCtx.arc(sourceSize/2, sourceSize/2, sourceSize/3, 0, Math.PI * 2);
    sCtx.fill();

    // 生成 SDF 数据 (简单版：计算每个像素到最近边缘的距离)
    // 这里我们直接用数学公式模拟一个完美的圆的 SDF，因为如果是从位图生成SDF比较复杂且容易出错
    // 我们的目的是展示 SDF 的放大效果，所以用数学公式生成"无限精度"的数据源是最合适的

    function draw() {
        const zoom = parseFloat(zoomSlider.value);
        zoomValue.textContent = zoom.toFixed(1) + 'x';

        // 1. 绘制普通位图 (Nearest Neighbor 放大模拟像素感)
        ctxB.imageSmoothingEnabled = false; // 关键：关闭平滑，展示像素锯齿
        ctxB.fillStyle = '#eee';
        ctxB.fillRect(0, 0, size, size);
        
        // 计算居中绘制的尺寸
        const drawSize = sourceSize * zoom * 2; // 基础放大一点以便观察
        const offset = (size - drawSize) / 2;
        
        ctxB.drawImage(sourceCanvas, offset, offset, drawSize, drawSize);

        // 2. 绘制 SDF (数学计算模拟 Shader 渲染)
        // 我们不使用 drawImage，而是遍历像素进行"SDF 渲染"
        // 实际上为了性能，我们可以只用 Canvas API 模拟平滑圆
        // 但为了展示"SDF原理"，我们写一个简单的片元着色模拟器
        
        ctxS.fillStyle = '#eee';
        ctxS.fillRect(0, 0, size, size);
        
        const imageData = ctxS.createImageData(size, size);
        const data = imageData.data;
        
        const centerX = size / 2;
        const centerY = size / 2;
        const radius = (sourceSize / 3) * zoom * 2; // 保持和位图一样的大小比例
        
        // SDF 渲染逻辑
        // 对于圆形，SDF = length(p - center) - radius
        // 边缘平滑度应该是固定的屏幕像素单位，而不是随缩放变化的
        const smoothing = 1.0; // 1个像素的抗锯齿

        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                // 计算到圆心的距离
                const dx = x - centerX;
                const dy = y - centerY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                // SDF 值：负数在内，正数在外
                const sdf = dist - radius;
                
                // 使用 smoothstep 进行抗锯齿渲染
                // 我们希望在 sdf = -0.5 到 0.5 之间进行过渡
                // alpha = 1.0 - smoothstep(-0.5, 0.5, sdf);
                // 简化版：
                let alpha = 0;
                if (sdf < -0.5) alpha = 1;
                else if (sdf > 0.5) alpha = 0;
                else alpha = 0.5 - sdf; // 线性插值模拟
                
                // 绘制白色圆形 (255, 255, 255)
                const index = (y * size + x) * 4;
                
                // 混合背景色 #eee (238, 238, 238) 和 前景色 #fff (但为了对比明显，我们用黑色圆)
                // 修正：上面的位图是黑底白圆，这里我们也统一一下。
                // 为了美观，我们用透明背景上画黑色圆，或者统一风格。
                // 之前的位图是黑底白圆缩放。
                // 让我们改成：白底黑圆，这样更符合通常的文字渲染习惯。
                
                // 重新调整位图源：白底黑圆
                // (代码在循环外修改，为了不重写上面的代码，我在渲染时处理颜色)
                
                // 最终颜色混合
                // 背景: 238 (eee)
                // 前景: 30 (深色)
                const bg = 238;
                const fg = 50;
                const color = bg * (1 - alpha) + fg * alpha;
                
                data[index] = color;
                data[index + 1] = color;
                data[index + 2] = color;
                data[index + 3] = 255;
            }
        }
        ctxS.putImageData(imageData, 0, 0);
        
        // 重新绘制位图以匹配颜色风格 (白底黑圆)
        ctxB.fillStyle = '#eee';
        ctxB.fillRect(0, 0, size, size);
        
        // 创建临时的白底黑圆源图
        const tempC = document.createElement('canvas');
        tempC.width = sourceSize;
        tempC.height = sourceSize;
        const tCtx = tempC.getContext('2d');
        tCtx.clearRect(0,0,sourceSize,sourceSize); // 透明
        // tCtx.fillStyle = '#333'; 
        // 画一个抗锯齿很差的圆 (手动画像素)
        const cx = sourceSize/2;
        const cy = sourceSize/2;
        const r = sourceSize/3;
        tCtx.fillStyle = '#323232';
        for(let py=0; py<sourceSize; py++){
            for(let px=0; px<sourceSize; px++){
                if((px-cx)*(px-cx) + (py-cy)*(py-cy) <= r*r){
                    tCtx.fillRect(px, py, 1, 1);
                }
            }
        }
        
        ctxB.drawImage(tempC, offset, offset, drawSize, drawSize);
    }

    zoomSlider.addEventListener('input', draw);
    draw(); // 初始绘制
}

// 2. 距离场演示 (热力图)
function initDistanceDemo() {
    const canvas = document.getElementById('distanceCanvas');
    const distValue = document.getElementById('distanceValue');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    const centerX = width / 2;
    const centerY = height / 2;
    
    // 预渲染背景热力图 (静态部分) - 其实是动态的，因为要显示到圆心的距离
    // 为了性能，我们只在每一帧根据鼠标位置绘制交互
    // 但题目是"距离场"，通常是指整个空间的场。
    // 这里我们绘制一个静态的"距离圆心"的场图。
    
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;
    
    // 生成距离场背景
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const dx = x - centerX;
            const dy = y - centerY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            // 归一化距离用于显示颜色 (0-255)
            // 距离越近越亮
            const maxDist = Math.sqrt(width*width/4 + height*height/4);
            const brightness = 255 - (dist / maxDist) * 255;
            
            const index = (y * width + x) * 4;
            data[index] = brightness;     // R
            data[index + 1] = brightness; // G
            data[index + 2] = brightness; // B
            data[index + 3] = 255;        // A
        }
    }
    
    // 缓存背景
    const bgCanvas = document.createElement('canvas');
    bgCanvas.width = width;
    bgCanvas.height = height;
    bgCanvas.getContext('2d').putImageData(imageData, 0, 0);

    function render(mouseX, mouseY) {
        // 绘制背景
        ctx.drawImage(bgCanvas, 0, 0);
        
        // 绘制圆心
        ctx.fillStyle = '#FF6B6B';
        ctx.beginPath();
        ctx.arc(centerX, centerY, 5, 0, Math.PI * 2);
        ctx.fill();
        
        if (mouseX !== undefined) {
            // 绘制鼠标点
            ctx.fillStyle = '#4ECDC4';
            ctx.beginPath();
            ctx.arc(mouseX, mouseY, 5, 0, Math.PI * 2);
            ctx.fill();
            
            // 绘制连线
            ctx.strokeStyle = '#FFD93D';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(mouseX, mouseY);
            ctx.stroke();
            
            // 计算距离
            const dist = Math.sqrt(Math.pow(mouseX - centerX, 2) + Math.pow(mouseY - centerY, 2));
            distValue.textContent = `距离: ${dist.toFixed(1)} 像素`;
        }
    }

    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        render(e.clientX - rect.left, e.clientY - rect.top);
    });
    
    canvas.addEventListener('mouseleave', () => {
        render(); // 清除连线
        distValue.textContent = "距离: 0";
    });

    render();
}

// 3. 有向距离演示 (Signed)
function initSignedDemo() {
    const canvas = document.getElementById('signedCanvas');
    const showNumbers = document.getElementById('showNumbers');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = 80;

    // 缓存背景
    const bgCanvas = document.createElement('canvas');
    bgCanvas.width = width;
    bgCanvas.height = height;
    const bgCtx = bgCanvas.getContext('2d');
    
    const imageData = bgCtx.createImageData(width, height);
    const data = imageData.data;
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const dx = x - centerX;
            const dy = y - centerY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const sdf = dist - radius;
            
            const index = (y * width + x) * 4;
            
            // 内部为红，外部为绿
            if (sdf < 0) {
                // 内部：红色，越深越红
                const intensity = 100 + Math.min(155, Math.abs(sdf) * 2);
                data[index] = intensity;
                data[index + 1] = 50;
                data[index + 2] = 50;
            } else {
                // 外部：绿色，越远越暗
                const intensity = 255 - Math.min(200, sdf);
                data[index] = 50;
                data[index + 1] = intensity;
                data[index + 2] = 50;
            }
            
            // 边缘线 (0 附近)
            if (Math.abs(sdf) < 1.5) {
                data[index] = 255;
                data[index + 1] = 255;
                data[index + 2] = 255;
            }
            
            data[index + 3] = 255;
        }
    }
    bgCtx.putImageData(imageData, 0, 0);

    function render(mouseX, mouseY) {
        ctx.drawImage(bgCanvas, 0, 0);
        
        // 绘制圆环轮廓指示
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.stroke();

        if (mouseX !== undefined && showNumbers.checked) {
            // 计算鼠标位置的 SDF
            const dist = Math.sqrt(Math.pow(mouseX - centerX, 2) + Math.pow(mouseY - centerY, 2));
            const sdf = dist - radius;
            
            // 绘制点
            ctx.fillStyle = 'yellow';
            ctx.beginPath();
            ctx.arc(mouseX, mouseY, 4, 0, Math.PI * 2);
            ctx.fill();
            
            // 显示数值
            ctx.font = '20px monospace';
            ctx.fillStyle = 'white';
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 3;
            
            const text = `SDF: ${sdf.toFixed(1)}`;
            ctx.strokeText(text, mouseX + 10, mouseY - 10);
            ctx.fillText(text, mouseX + 10, mouseY - 10);
            
            // 绘制最短距离线
            // 计算圆上最近点
            const angle = Math.atan2(mouseY - centerY, mouseX - centerX);
            const edgeX = centerX + Math.cos(angle) * radius;
            const edgeY = centerY + Math.sin(angle) * radius;
            
            ctx.beginPath();
            ctx.moveTo(mouseX, mouseY);
            ctx.lineTo(edgeX, edgeY);
            ctx.strokeStyle = 'yellow';
            ctx.setLineDash([5, 5]);
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }

    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        render(e.clientX - rect.left, e.clientY - rect.top);
    });
    
    showNumbers.addEventListener('change', () => {
        // 触发重绘，这里简单模拟一个鼠标移出
        render(); 
    });

    render();
}

// 4. SDF 特效演示
function initEffectDemo() {
    const canvas = document.getElementById('effectCanvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // 控件
    const thresholdSlider = document.getElementById('thresholdSlider');
    const smoothSlider = document.getElementById('smoothSlider');
    const outlineSlider = document.getElementById('outlineSlider');
    const shadowSlider = document.getElementById('shadowSlider');
    
    const thresholdVal = document.getElementById('thresholdValue');
    const smoothVal = document.getElementById('smoothValue');
    const outlineVal = document.getElementById('outlineValue');
    const shadowVal = document.getElementById('shadowValue');
    
    // 生成一个复杂的 SDF 场 (比如一个字母 A 或者混合形状)
    // 为了简单且效果好，我们组合几个形状：一个圆和一个矩形
    // SDF 组合：Union = min(d1, d2)
    
    // 预计算 SDF 数据
    const sdfData = new Float32Array(width * height);
    
    function sdCircle(px, py, cx, cy, r) {
        const dx = px - cx;
        const dy = py - cy;
        return Math.sqrt(dx * dx + dy * dy) - r;
    }
    
    function sdBox(px, py, cx, cy, w, h) {
        const dx = Math.abs(px - cx) - w;
        const dy = Math.abs(py - cy) - h;
        return Math.sqrt(Math.max(dx, 0) ** 2 + Math.max(dy, 0) ** 2) + Math.min(Math.max(dx, dy), 0);
    }
    
    // 初始化 SDF 场数据 (归一化到 0-1 范围以便作为贴图使用)
    // 但我们的 slider 是基于 0.5 作为边缘
    // 所以我们将 SDF 映射到 0-1，其中 0.5 是边缘 (SDF=0)
    // 假设最大距离为 100
    
    const maxDist = 100;
    
    for(let y=0; y<height; y++) {
        for(let x=0; x<width; x++) {
            // 形状 1: 圆
            const d1 = sdCircle(x, y, width*0.35, height*0.4, 60);
            // 形状 2: 矩形
            const d2 = sdBox(x, y, width*0.65, height*0.6, 60, 40);
            
            // 融合 (Smooth Union) - 可选，这里直接用简单的 Min
            // const d = Math.min(d1, d2);
            
            // 让我们用一个更加有趣的形状：平滑融合 (Metaball 效果)
            const k = 32.0;
            const h = Math.max(k - Math.abs(d1 - d2), 0.0) / k;
            const d = Math.min(d1, d2) - h * h * k * (1.0 / 4.0);
            
            // 映射到 0-1
            // dist = 0 -> 0.5
            // dist = -max -> 0
            // dist = +max -> 1
            let norm = 0.5 + (d / (2 * maxDist));
            norm = Math.max(0, Math.min(1, norm));
            
            sdfData[y * width + x] = norm;
        }
    }
    
    const imgData = ctx.createImageData(width, height);
    const pixels = imgData.data;

    function render() {
        const threshold = parseFloat(thresholdSlider.value);
        const smoothing = parseFloat(smoothSlider.value);
        const outlineWidth = parseFloat(outlineSlider.value);
        const shadowOffset = parseFloat(shadowSlider.value);
        
        // 更新显示数值
        thresholdVal.textContent = threshold.toFixed(2);
        smoothVal.textContent = smoothing.toFixed(2);
        outlineVal.textContent = outlineWidth.toFixed(2);
        shadowVal.textContent = shadowOffset.toFixed(2);
        
        for(let i = 0; i < sdfData.length; i++) {
            const dist = sdfData[i];
            
            // 计算主形状 alpha
            // smoothstep(edge0, edge1, x)
            // edge = threshold
            // range = smoothing
            const lower = threshold - smoothing;
            const upper = threshold + smoothing;
            
            // 简单的 smoothstep 实现
            let alpha = 0;
            if (dist < lower) alpha = 1; // 内部 (注意：我们要显示的是 dist < threshold 的部分)
            // 等等，我们之前的映射是：小值在内？
            // 原始 d: 负数在内。
            // 映射 norm = 0.5 + d/...
            // 所以 norm < 0.5 是内部。
            // Slider threshold 默认 0.5。如果我们将 threshold 调大，意味着包含更多正距离区域 -> 形状变胖
            // 所以条件是：dist < threshold -> 显示
            
            // 修正 alpha 计算：
            // 我们希望 dist < threshold 时 alpha = 1
            // 边缘在 threshold 处
            // 过渡带为 threshold +/- smoothing
            
            // 反转 smoothstep: 1.0 - smoothstep(...)
            let t = (dist - lower) / (upper - lower);
            t = Math.max(0, Math.min(1, t));
            alpha = 1.0 - (t * t * (3 - 2 * t)); // 标准 smoothstep 曲线
            
            // 描边计算
            // 描边区域：dist 在 [threshold, threshold + outline] 之间 (外描边)
            // 或者 [threshold - outline, threshold] (内描边)
            // 让我们做居中描边或者简单的外扩描边
            // 假设 outlineWidth 是增加的厚度
            // 描边 alpha
            const outlineEdge = threshold + outlineWidth;
            const outlineLower = outlineEdge - smoothing;
            const outlineUpper = outlineEdge + smoothing;
            
            let tOutline = (dist - outlineLower) / (outlineUpper - outlineLower);
            tOutline = Math.max(0, Math.min(1, tOutline));
            const outlineAlpha = 1.0 - (tOutline * tOutline * (3 - 2 * tOutline));
            
            // 阴影 (简单的偏移采样比较耗费，这里直接基于 SDF 做假阴影)
            // 阴影就是形状再胖一点，但是是黑色的，且有大模糊
            const shadowEdge = threshold - shadowOffset; // 偏移会让阴影出现在一侧吗？
            // SDF 的阴影通常是通过偏移 UV 采样的。但在单像素循环里无法偏移 UV。
            // 这里我们用"软阴影"效果：基于距离场的辉光
            // 只要 dist < threshold + shadowOffset + 0.1
            const shadowDist = dist - (threshold + 0.05); // 稍微扩一点
            // 阴影总是很柔和
            const shadowAlpha = 1.0 - Math.min(1, Math.max(0, shadowDist * 5)); 
            
            // 颜色混合
            // 基础色
            let r=0, g=0, b=0, a=0;
            
            // 1. 绘制阴影
            if (shadowOffset > 0) {
                 // 简单的全局阴影效果
                 // 实际上这更像是一个辉光/外发光
                 r = 0; g = 0; b = 0;
                 a = shadowAlpha * 0.5; // 半透明黑
            }
            
            // 2. 绘制描边 (白色描边)
            // 描边层在阴影之上
            if (outlineWidth > 0) {
                // 混合描边
                // 描边区域是 outlineAlpha > 0 的区域
                // 实际上我们想要的是：outlineAlpha - alpha (只显示环)
                // 或者直接覆盖
                
                // 真正的描边逻辑：
                // 如果在描边范围内 (dist < threshold + outline) 且 不在核心范围内 (dist < threshold)
                // 这里为了简单，直接叠加
                
                // 描边色 (白色)
                const oa = outlineAlpha;
                r = r * (1-oa) + 255 * oa;
                g = g * (1-oa) + 255 * oa;
                b = b * (1-oa) + 255 * oa;
                a = Math.max(a, oa);
            }
            
            // 3. 绘制主体 (比如蓝色)
            // 主体色 #4ECDC4 (78, 205, 196)
            const ma = alpha;
            r = r * (1-ma) + 78 * ma;
            g = g * (1-ma) + 205 * ma;
            b = b * (1-ma) + 196 * ma;
            a = Math.max(a, ma);
            
            // 背景混合 (白色)
            const finalR = 255 * (1-a) + r * a;
            const finalG = 255 * (1-a) + g * a;
            const finalB = 255 * (1-a) + b * a;
            
            const pIdx = i * 4;
            pixels[pIdx] = finalR;
            pixels[pIdx+1] = finalG;
            pixels[pIdx+2] = finalB;
            pixels[pIdx+3] = 255;
        }
        
        ctx.putImageData(imgData, 0, 0);
    }
    
    // 监听事件
    thresholdSlider.addEventListener('input', render);
    smoothSlider.addEventListener('input', render);
    outlineSlider.addEventListener('input', render);
    shadowSlider.addEventListener('input', render);
    
    render();
}

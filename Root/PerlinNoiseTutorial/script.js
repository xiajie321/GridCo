document.addEventListener('DOMContentLoaded', () => {
    
    // 初始化 Perlin 实例
    const noise = new Perlin();

    // ---------------------------------------------------------
    // 1. 对比演示 (Random vs Perlin)
    // ---------------------------------------------------------
    function drawRandom(canvasId) {
        const canvas = document.getElementById(canvasId);
        if(!canvas) return;
        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;
        const imgData = ctx.createImageData(w, h);
        const data = imgData.data;

        for (let i = 0; i < data.length; i += 4) {
            const val = Math.random() * 255;
            data[i] = val;     // R
            data[i+1] = val;   // G
            data[i+2] = val;   // B
            data[i+3] = 255;   // A
        }
        ctx.putImageData(imgData, 0, 0);
    }

    function drawPerlinIntro(canvasId) {
        const canvas = document.getElementById(canvasId);
        if(!canvas) return;
        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;
        const imgData = ctx.createImageData(w, h);
        const data = imgData.data;

        const scale = 0.05; // 较大的缩放以显示平滑
        
        for (let x = 0; x < w; x++) {
            for (let y = 0; y < h; y++) {
                // Perlin noise 返回 -1 到 1 之间，映射到 0-1
                let val = (noise.noise(x * scale, y * scale) + 1) / 2;
                val = val * 255;

                const index = (y * w + x) * 4;
                data[index] = val;
                data[index+1] = val;
                data[index+2] = val;
                data[index+3] = 255;
            }
        }
        ctx.putImageData(imgData, 0, 0);
    }

    // 初始绘制
    drawRandom('canvas-random');
    drawPerlinIntro('canvas-perlin-intro');

    // ---------------------------------------------------------
    // 2. 互动实验室
    // ---------------------------------------------------------
    const playgroundCanvas = document.getElementById('canvas-playground');
    const rangeScale = document.getElementById('range-scale');
    const rangeOffsetX = document.getElementById('range-offset-x');
    const rangeOffsetY = document.getElementById('range-offset-y');
    const btnRegen = document.getElementById('btn-regen');

    // 显示值的 span
    const valScale = document.getElementById('val-scale');
    const valOffsetX = document.getElementById('val-offset-x');
    const valOffsetY = document.getElementById('val-offset-y');

    function drawPlayground() {
        if(!playgroundCanvas) return;
        const ctx = playgroundCanvas.getContext('2d');
        const w = playgroundCanvas.width;
        const h = playgroundCanvas.height;
        const imgData = ctx.createImageData(w, h);
        const data = imgData.data;

        const scale = parseFloat(rangeScale.value);
        const offsetX = parseFloat(rangeOffsetX.value);
        const offsetY = parseFloat(rangeOffsetY.value);

        // 更新数值显示
        valScale.textContent = scale;
        valOffsetX.textContent = offsetX;
        valOffsetY.textContent = offsetY;

        // 在 Unity 中，采样坐标通常是 (x / width * scale)
        // 这里我们也模拟这个逻辑
        for (let x = 0; x < w; x++) {
            for (let y = 0; y < h; y++) {
                
                // 计算采样坐标
                // 加上 offset 实现滚动效果
                let xCoord = (x / w * scale) + offsetX;
                let yCoord = (y / h * scale) + offsetY;

                let val = (noise.noise(xCoord, yCoord) + 1) / 2;
                
                // 简单的地形着色：水、沙、草、山、雪
                let r, g, b;
                
                if (val < 0.3) { // 深水
                    r = 0; g = 50; b = 150;
                } else if (val < 0.4) { // 浅水
                    r = 0; g = 100; b = 200;
                } else if (val < 0.45) { // 沙滩
                    r = 240; g = 240; b = 100;
                } else if (val < 0.7) { // 草地
                    r = 34; g = 139; b = 34;
                } else if (val < 0.85) { // 岩石
                    r = 100; g = 100; b = 100;
                } else { // 雪顶
                    r = 255; g = 255; b = 255;
                }

                const index = (y * w + x) * 4;
                data[index] = r;
                data[index+1] = g;
                data[index+2] = b;
                data[index+3] = 255;
            }
        }
        ctx.putImageData(imgData, 0, 0);
    }

    // 绑定事件
    if(rangeScale && rangeOffsetX && rangeOffsetY) {
        rangeScale.addEventListener('input', drawPlayground);
        rangeOffsetX.addEventListener('input', drawPlayground);
        rangeOffsetY.addEventListener('input', drawPlayground);
    }

    if(btnRegen) {
        btnRegen.addEventListener('click', () => {
            noise.seed(); // 重新生成随机种子
            drawPerlinIntro('canvas-perlin-intro'); // 同时也刷新介绍图
            drawPlayground();
        });
    }

    // 初始绘制
    drawPlayground();

});

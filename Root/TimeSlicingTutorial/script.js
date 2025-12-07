/**
 * 分帧计算 (Time Slicing) 互动演示
 */

const spinner = document.getElementById('spinner');
const fpsDisplay = document.getElementById('fps-display');
const progressBar = document.getElementById('progress-bar');
const statusText = document.getElementById('status-text');
const btnHeavy = document.getElementById('btn-heavy');
const btnSliced = document.getElementById('btn-sliced');

let isProcessing = false;
let startTime = 0;
let lastFrameTime = 0;
let frameCount = 0;

// FPS 计数器
function updateFPS(timestamp) {
    if (!lastFrameTime) lastFrameTime = timestamp;
    let delta = timestamp - lastFrameTime;
    
    // 如果两帧间隔超过 100ms，说明卡顿严重
    if (delta > 100) {
        fpsDisplay.style.color = 'red';
    } else {
        fpsDisplay.style.color = '#333';
    }
    
    if (delta >= 1000) {
        let fps = Math.round((frameCount * 1000) / delta);
        fpsDisplay.textContent = `FPS: ${fps}`;
        lastFrameTime = timestamp;
        frameCount = 0;
    }
    frameCount++;
    
    // 让方块旋转，直观展示卡顿
    let angle = (timestamp / 10) % 360;
    spinner.style.transform = `rotate(${angle}deg)`;

    requestAnimationFrame(updateFPS);
}
requestAnimationFrame(updateFPS);

// 模拟繁重任务 (计算密集型)
// 为了在 JS 中模拟"卡死"，我们需要一个同步的循环
function heavyTask(iterations) {
    let result = 0;
    for(let i=0; i<iterations; i++) {
        result += Math.sqrt(i) * Math.sin(i);
    }
    return result;
}

// 模式 1: 一键执行 (卡顿)
btnHeavy.addEventListener('click', () => {
    if (isProcessing) return;
    isProcessing = true;
    resetUI();
    
    statusText.innerHTML = "正在执行 100,000,000 次计算... <span style='color:red'>(注意：浏览器界面会卡死！)</span>";
    
    // 使用 setTimeout 给 UI 一点时间刷新，然后再卡死它
    setTimeout(() => {
        let start = performance.now();
        
        // 这是一个巨大的同步循环，会阻塞主线程
        heavyTask(100000000); 
        
        let end = performance.now();
        progressBar.style.width = '100%';
        statusText.innerHTML = `执行完成！耗时: ${(end - start).toFixed(2)} ms。 <br>刚才是不是什么都动不了了？`;
        isProcessing = false;
    }, 100);
});

// 模式 2: 分帧执行 (流畅)
btnSliced.addEventListener('click', () => {
    if (isProcessing) return;
    isProcessing = true;
    resetUI();
    
    statusText.innerHTML = "分帧执行中... <span style='color:green'>(观察 FPS 和旋转方块)</span>";
    
    let totalItems = 100000000;
    let currentItem = 0;
    let batchSize = 1000000; // 每次做一点点

    // 使用 requestAnimationFrame 或 setTimeout 来分片
    function processBatch() {
        let batchStart = performance.now();
        
        // 设定时间预算 (比如 8ms)
        let timeBudget = 8; 
        
        // 在预算时间内尽可能多做
        while (performance.now() - batchStart < timeBudget && currentItem < totalItems) {
            // 这里为了演示进度条效果，稍微减少单次循环量
            heavyTask(50000); 
            currentItem += 50000;
        }

        // 更新进度条
        let progress = (currentItem / totalItems) * 100;
        progressBar.style.width = `${progress}%`;

        if (currentItem < totalItems) {
            // 还没做完，申请下一帧继续
            requestAnimationFrame(processBatch);
        } else {
            statusText.innerHTML = "分帧执行完成！全程保持响应。";
            isProcessing = false;
        }
    }
    
    processBatch();
});

function resetUI() {
    progressBar.style.width = '0%';
    statusText.textContent = "准备就绪";
}

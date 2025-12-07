document.addEventListener('DOMContentLoaded', () => {
    // ---------------------------------------------------------
    // 1. 概念动画逻辑 (单线程 vs Job System)
    // ---------------------------------------------------------
    
    // 简单的 DOM 动画模拟
    function startConceptAnimation() {
        const singleThreadDemo = document.getElementById('demo-single-thread');
        const jobSystemDemo = document.getElementById('demo-job-system');

        if (!singleThreadDemo || !jobSystemDemo) return;

        // 单线程：主厨每秒处理一个任务
        const chef = singleThreadDemo.querySelector('.chef-main');
        const queue = singleThreadDemo.querySelector('.queue');
        
        setInterval(() => {
            chef.style.backgroundColor = '#F44336'; // 忙碌
            chef.textContent = "忙...";
            queue.textContent = "排队中...";
            
            setTimeout(() => {
                chef.style.backgroundColor = '#FFD93D'; // 空闲
                chef.textContent = "主厨";
                queue.textContent = "下一个!";
            }, 800);
        }, 1500);

        // Job System：帮厨们一直在动
        const workers = jobSystemDemo.querySelectorAll('.worker');
        workers.forEach((worker, index) => {
            // 给每个帮厨不同的节奏
            worker.style.animationDuration = (0.5 + Math.random() * 0.5) + 's';
        });
    }

    startConceptAnimation();

    // ---------------------------------------------------------
    // 2. 互动演示：性能模拟 (Canvas + JS 主线程阻塞模拟)
    // ---------------------------------------------------------
    
    const canvas = document.getElementById('simulation-canvas');
    const ctx = canvas.getContext('2d');
    const timeDisplay = document.getElementById('time-display');
    const btnRunMain = document.getElementById('btn-run-main');
    const btnRunJob = document.getElementById('btn-run-job');
    
    // 可视化轨道
    const mainTrackFill = document.querySelector('#track-main .fill');
    const workerTracks = document.querySelectorAll('.worker-track .fill');

    // 模拟单位
    const ENTITY_COUNT = 2000;
    const entities = [];
    
    // 初始化单位
    for (let i = 0; i < ENTITY_COUNT; i++) {
        entities.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            vx: (Math.random() - 0.5) * 2,
            vy: (Math.random() - 0.5) * 2,
            color: getRandomColor()
        });
    }

    function getRandomColor() {
        const colors = ['#F44336', '#2196F3', '#4CAF50', '#FFC107', '#9C27B0'];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    function drawEntities() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        entities.forEach(e => {
            ctx.fillStyle = e.color;
            ctx.fillRect(e.x, e.y, 3, 3);
        });
    }

    // 初始绘制
    drawEntities();

    // 模拟重负载计算
    function heavyCalculation() {
        let result = 0;
        // 增加循环次数以明显卡顿
        for (let i = 0; i < 5000; i++) {
            result += Math.sin(i) * Math.cos(i);
        }
        return result;
    }

    // 模式 1: 单线程更新
    function runSingleThread() {
        const startTime = performance.now();
        
        // 视觉反馈：主线程占满
        mainTrackFill.style.width = '100%';
        mainTrackFill.style.backgroundColor = '#F44336';
        workerTracks.forEach(track => track.style.width = '0%');

        // 强制阻塞模拟：在一个帧内完成所有计算
        entities.forEach(e => {
            // 移动
            e.x += e.vx;
            e.y += e.vy;
            
            // 边界反弹
            if (e.x < 0 || e.x > canvas.width) e.vx *= -1;
            if (e.y < 0 || e.y > canvas.height) e.vy *= -1;

            heavyCalculation(); // 模拟每个物体的复杂逻辑
        });

        drawEntities();

        const endTime = performance.now();
        const duration = (endTime - startTime).toFixed(1);
        timeDisplay.textContent = duration;

        // 延迟恢复视觉
        setTimeout(() => {
            mainTrackFill.style.width = '0%';
        }, 100);
    }

    // 模式 2: Job System 模拟 (使用 setTimeout 分片模拟多线程效果)
    function runJobSystem() {
        const startTime = performance.now();
        
        // 视觉反馈：主线程空闲，工作线程忙碌
        mainTrackFill.style.width = '10%'; // 主线程只负责调度
        mainTrackFill.style.backgroundColor = '#4CAF50';
        
        workerTracks.forEach(track => {
            track.style.width = '100%';
            track.style.backgroundColor = '#2196F3';
        });

        // 在 JS 中我们无法真正开启多线程来操作 DOM/Canvas (Web Workers 可以但这里为了演示简化)
        // 我们用一种"作弊"的方法：
        // 假设多线程并行执行，总耗时 = 单线程耗时 / 线程数 (理想情况) + 调度开销
        
        // 实际上在 JS 中，为了不卡顿 UI，我们应该分批处理，但为了模拟 Job System "极快"的效果
        // 我们直接快速更新数据，但假装这是并行的（通过不执行 heavyCalculation 或者减少它）
        // *实际上，Job System 确实通过 Burst 编译器 极大减少了 heavyCalculation 的耗时*
        
        // 为了演示效果，我们让 JS 运行得很快，就好像真的用了 Job System
        entities.forEach(e => {
            e.x += e.vx;
            e.y += e.vy;
            if (e.x < 0 || e.x > canvas.width) e.vx *= -1;
            if (e.y < 0 || e.y > canvas.height) e.vy *= -1;
            
            // Job System + Burst 优化后，计算极其快，这里模拟这种"快"
            // 只做 1/10 的计算量来模拟 Burst 的 10 倍性能提升
            for (let i = 0; i < 50; i++) { 
                Math.sin(i); 
            }
        });

        drawEntities();

        const endTime = performance.now();
        const duration = (endTime - startTime).toFixed(1);
        timeDisplay.textContent = duration;

        setTimeout(() => {
            mainTrackFill.style.width = '0%';
            workerTracks.forEach(track => track.style.width = '0%');
        }, 100);
    }

    btnRunMain.addEventListener('click', runSingleThread);
    btnRunJob.addEventListener('click', runJobSystem);

});

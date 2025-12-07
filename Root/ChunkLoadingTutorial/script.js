document.addEventListener('DOMContentLoaded', () => {
    // --- 主要互动演示 ---
    const gridEl = document.getElementById('chunk-grid');
    const playerPosEl = document.getElementById('player-pos');
    const loadedCountEl = document.getElementById('loaded-count');
    const statusTextEl = document.getElementById('status-text');
    const renderDistInput = document.getElementById('render-dist');
    const renderDistVal = document.getElementById('render-dist-val');
    const resetBtn = document.getElementById('btn-reset');

    const gridSize = 15; // 15x15 网格
    const center = Math.floor(gridSize / 2);
    let playerPos = { x: center, y: center };
    let renderDistance = parseInt(renderDistInput.value);
    
    // 存储所有单元格引用的二维数组
    const cells = [];
    // 存储每个单元格的 timeout ID，用于清理动画
    const cellTimeouts = new Map(); // Key: "x,y", Value: timeoutId
    // 使用 Set 存储已加载区块的坐标字符串 "x,y"
    let loadedChunks = new Set();

    // 初始化网格
    function initGrid() {
        gridEl.innerHTML = '';
        cells.length = 0; // 清空数组
        cellTimeouts.clear();

        for (let y = 0; y < gridSize; y++) {
            const row = [];
            for (let x = 0; x < gridSize; x++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                
                // 添加坐标提示
                // cell.title = `(${x}, ${y})`;
                
                // 点击移动事件
                cell.addEventListener('click', () => {
                    movePlayer(x, y);
                });

                gridEl.appendChild(cell);
                row.push(cell);
            }
            cells.push(row);
        }
        
        updateView();
    }
    
    // 清除单元格上的所有状态类和定时器
    function clearCellState(x, y, cell) {
        const key = `${x},${y}`;
        if (cellTimeouts.has(key)) {
            clearTimeout(cellTimeouts.get(key));
            cellTimeouts.delete(key);
        }
        cell.classList.remove('loading', 'loaded', 'unloading', 'ring-1', 'ring-2', 'ring-3');
    }

    // 更新视图（核心逻辑）
    function updateView() {
        // 1. 更新玩家位置显示
        playerPosEl.textContent = `${playerPos.x}, ${playerPos.y}`;
        
        // 2. 清除之前的玩家标记
        document.querySelectorAll('.cell.player').forEach(el => {
            el.classList.remove('player');
            el.textContent = '';
        });

        // 3. 设置新玩家位置
        const playerCell = cells[playerPos.y][playerPos.x];
        playerCell.classList.add('player');
        playerCell.textContent = 'P';

        // 4. 计算应该加载的区块
        const shouldLoad = new Set();
        
        // 遍历以玩家为中心的矩形区域（切比雪夫距离）
        // 或者使用欧几里得距离（圆形）- 这里为了简单和像 Minecraft，使用方形
        /*
           在实际游戏中，通常是方形或者圆形。
           方形更容易实现循环。
        */
        for (let y = -renderDistance; y <= renderDistance; y++) {
            for (let x = -renderDistance; x <= renderDistance; x++) {
                const targetX = playerPos.x + x;
                const targetY = playerPos.y + y;

                // 检查边界
                if (targetX >= 0 && targetX < gridSize && targetY >= 0 && targetY < gridSize) {
                    shouldLoad.add(`${targetX},${targetY}`);
                }
            }
        }

        // 5. 处理加载和卸载
        let loadCount = 0;
        let unloadCount = 0;

        // 检查需要卸载的 (在 loadedChunks 中但不在 shouldLoad 中)
        const toUnload = [...loadedChunks].filter(coord => !shouldLoad.has(coord));
        
        // 检查需要加载的 (在 shouldLoad 中但不在 loadedChunks 中)
        const toLoad = [...shouldLoad].filter(coord => !loadedChunks.has(coord));

        // 应用视觉变化
        
        // 卸载处理
        toUnload.forEach(coord => {
            const [x, y] = coord.split(',').map(Number);
            const cell = cells[y][x];
            
            // 清除之前的状态和定时器
            clearCellState(x, y, cell);

            cell.classList.add('unloading');
            
            // 动画结束后移除类
            const timeoutId = setTimeout(() => {
                cell.classList.remove('unloading');
                cellTimeouts.delete(coord);
            }, 500);
            
            cellTimeouts.set(coord, timeoutId);
            loadedChunks.delete(coord);
            unloadCount++;
        });

        // 加载处理
        toLoad.forEach(coord => {
            const [x, y] = coord.split(',').map(Number);
            const cell = cells[y][x];
            
            // 清除之前的状态和定时器
            clearCellState(x, y, cell);
            
            // 模拟加载延迟动画
            cell.classList.add('loading');
            
            const timeoutId = setTimeout(() => {
                cell.classList.remove('loading');
                cell.classList.add('loaded');
                
                // 添加距离环效果（可选，为了美观）
                const dist = Math.max(Math.abs(x - playerPos.x), Math.abs(y - playerPos.y));
                cell.classList.remove('ring-1', 'ring-2', 'ring-3');
                if (dist === 1) cell.classList.add('ring-1');
                if (dist === 2) cell.classList.add('ring-2');
                if (dist >= 3) cell.classList.add('ring-3');
                
                cellTimeouts.delete(coord);
            }, 300 + Math.random() * 200); // 随机一点延迟，看起来更自然
            
            cellTimeouts.set(coord, timeoutId);
            loadedChunks.add(coord);
            loadCount++;
        });

        // 更新统计
        loadedCountEl.textContent = loadedChunks.size;
        
        if (loadCount > 0 || unloadCount > 0) {
            statusTextEl.textContent = `加载: ${loadCount}, 卸载: ${unloadCount}`;
            statusTextEl.style.color = '#e65100'; // 橙色
            setTimeout(() => {
                statusTextEl.textContent = '就绪';
                statusTextEl.style.color = 'inherit';
            }, 1000);
        }
    }

    function movePlayer(x, y) {
        if (x === playerPos.x && y === playerPos.y) return;
        
        playerPos = { x, y };
        updateView();
    }

    // 事件监听
    renderDistInput.addEventListener('input', (e) => {
        renderDistance = parseInt(e.target.value);
        renderDistVal.textContent = renderDistance;
        updateView();
    });

    resetBtn.addEventListener('click', () => {
        playerPos = { x: center, y: center };
        renderDistInput.value = 2;
        renderDistance = 2;
        renderDistVal.textContent = 2;
        // 重置所有加载状态
        cells.forEach(row => row.forEach(cell => {
            cell.className = 'cell';
        }));
        loadedChunks.clear();
        updateView();
    });

    // 初始化
    initGrid();


    // --- 对比演示 ---
    
    // 普通加载演示
    const normalGrid = document.getElementById('normal-loading-demo');
    const btnNormal = document.getElementById('btn-demo-normal');
    
    // 初始化小网格
    function initSmallGrid(container) {
        container.innerHTML = '';
        const size = 10;
        const cells = [];
        for(let i=0; i<size*size; i++) {
            const cell = document.createElement('div');
            cell.className = 'small-cell';
            container.appendChild(cell);
            cells.push(cell);
        }
        return cells;
    }

    const normalCells = initSmallGrid(normalGrid);
    const chunkDemoGrid = document.getElementById('chunk-loading-demo');
    const chunkCells = initSmallGrid(chunkDemoGrid);
    const btnChunk = document.getElementById('btn-demo-chunk');

    btnNormal.addEventListener('click', async () => {
        btnNormal.disabled = true;
        // 重置
        normalCells.forEach(c => c.style.backgroundColor = '#fff');
        
        // 模拟逐个加载，非常慢
        for(let i=0; i<normalCells.length; i++) {
            normalCells[i].style.backgroundColor = '#FFD740'; // Loading
            await new Promise(r => setTimeout(r, 20));
            normalCells[i].style.backgroundColor = '#4CAF50'; // Loaded
        }
        
        btnNormal.disabled = false;
    });

    btnChunk.addEventListener('click', async () => {
        btnChunk.disabled = true;
        // 重置
        chunkCells.forEach(c => c.style.backgroundColor = '#fff');
        
        // 只加载中间的一小部分
        const centerIdx = 45; // roughly center of 10x10
        const indicesToLoad = [
            centerIdx, centerIdx-1, centerIdx+1, 
            centerIdx-10, centerIdx-11, centerIdx-9,
            centerIdx+10, centerIdx+9, centerIdx+11
        ];

        for(let idx of indicesToLoad) {
            if(chunkCells[idx]) {
                chunkCells[idx].style.backgroundColor = '#FFD740';
                await new Promise(r => setTimeout(r, 50));
                chunkCells[idx].style.backgroundColor = '#4CAF50';
            }
        }
        
        btnChunk.disabled = false;
    });

});

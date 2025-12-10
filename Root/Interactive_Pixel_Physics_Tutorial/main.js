document.addEventListener('DOMContentLoaded', () => {
    initModule1();
    initModule2();
    initModule3();
    initModule4();
    initModule5();
    initModule6();
});

// --- Module 1: The Nature of the World ---
function initModule1() {
    const canvas = document.getElementById('canvas1');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const pixelInfo = document.getElementById('pixelInfo');
    const toggleGrid = document.getElementById('toggleGrid');

    const width = canvas.width;
    const height = canvas.height;

    // Initialize with a simple pattern
    ctx.fillStyle = '#87CEEB'; // Sky
    ctx.fillRect(0, 0, width, height);
    
    ctx.fillStyle = '#8B4513'; // Ground
    ctx.beginPath();
    ctx.moveTo(0, height);
    ctx.lineTo(width, height);
    ctx.lineTo(width, height - 50);
    ctx.lineTo(0, height - 80);
    ctx.fill();

    // Cache image data
    let imageData = ctx.getImageData(0, 0, width, height);
    let data = imageData.data;

    // Helper to get pixel data
    function getPixel(x, y) {
        if (x < 0 || x >= width || y < 0 || y >= height) return null;
        const index = (Math.floor(y) * width + Math.floor(x)) * 4;
        return {
            r: data[index],
            g: data[index + 1],
            b: data[index + 2],
            a: data[index + 3],
            isEmpty: data[index + 3] === 0 // Basic isEmpty check based on alpha
        };
    }

    // Interactive Loop
    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        const x = Math.floor(e.clientX - rect.left);
        const y = Math.floor(e.clientY - rect.top);

        const pixel = getPixel(x, y);
        if (pixel) {
            pixelInfo.textContent = `X: ${x}, Y: ${y} | RGBA: (${pixel.r}, ${pixel.g}, ${pixel.b}, ${pixel.a}) | isEmpty: ${pixel.isEmpty}`;
            
            // Redraw to clear previous highlight and show grid if enabled
            render(x, y);
        }
    });

    toggleGrid.addEventListener('change', () => {
        render();
    });

    function render(highlightX = -1, highlightY = -1) {
        // Restore original image
        ctx.putImageData(imageData, 0, 0);

        // Draw Grid if enabled
        if (toggleGrid.checked) {
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
            ctx.beginPath();
            // Draw a coarser grid for visualization performance
            const gridSize = 10; 
            for (let x = 0; x < width; x += gridSize) {
                ctx.moveTo(x, 0);
                ctx.lineTo(x, height);
            }
            for (let y = 0; y < height; y += gridSize) {
                ctx.moveTo(0, y);
                ctx.lineTo(width, y);
            }
            ctx.stroke();
        }

        // Draw Highlight
        if (highlightX >= 0 && highlightY >= 0) {
            ctx.strokeStyle = 'red';
            ctx.strokeRect(highlightX - 0.5, highlightY - 0.5, 2, 2); // Highlight single pixel area
        }
    }
}

// --- Module 2: Destruction & Creation ---
function initModule2() {
    const canvas = document.getElementById('canvas2');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const brushSizeInput = document.getElementById('brushSize');
    const brushSizeVal = document.getElementById('brushSizeVal');
    const btnBrush = document.getElementById('toolBrush');
    const btnEraser = document.getElementById('toolEraser');

    let currentTool = 'eraser'; // 'brush' or 'eraser'
    let isDrawing = false;
    let brushRadius = 5;

    const width = canvas.width;
    const height = canvas.height;

    // Fill with "Ground"
    ctx.fillStyle = '#654321';
    ctx.fillRect(0, 0, width, height);

    // Initial state
    let imageData = ctx.getImageData(0, 0, width, height);
    let data = imageData.data;

    // Tool selection
    btnBrush.addEventListener('click', () => {
        currentTool = 'brush';
        btnBrush.style.border = '2px solid white';
        btnEraser.style.border = '3px solid black';
    });

    btnEraser.addEventListener('click', () => {
        currentTool = 'eraser';
        btnEraser.style.border = '2px solid white';
        btnBrush.style.border = '3px solid black';
    });
    
    // Highlight active tool initially
    btnEraser.style.border = '2px solid white';


    brushSizeInput.addEventListener('input', (e) => {
        brushRadius = parseInt(e.target.value);
        brushSizeVal.textContent = brushRadius + 'px';
    });

    // Drawing Logic
    function draw(mouseX, mouseY) {
        const r = brushRadius;
        const rSquared = r * r;
        
        let modified = false;

        // Bounding box for optimization
        const startX = Math.max(0, mouseX - r);
        const endX = Math.min(width, mouseX + r);
        const startY = Math.max(0, mouseY - r);
        const endY = Math.min(height, mouseY + r);

        for (let y = startY; y < endY; y++) {
            for (let x = startX; x < endX; x++) {
                const dx = x - mouseX;
                const dy = y - mouseY;
                if (dx*dx + dy*dy <= rSquared) {
                    const index = (y * width + x) * 4;
                    
                    if (currentTool === 'eraser') {
                        // Set alpha to 0 (Transparent)
                        if (data[index + 3] !== 0) {
                            data[index + 3] = 0;
                            modified = true;
                        }
                    } else if (currentTool === 'brush') {
                        // Set color (Greenish) and alpha to 255
                        if (data[index + 3] !== 255) { // Simple check, could be color check
                            data[index] = 76;   // R
                            data[index + 1] = 175; // G
                            data[index + 2] = 80;  // B
                            data[index + 3] = 255; // A
                            modified = true;
                        }
                    }
                }
            }
        }

        if (modified) {
            ctx.putImageData(imageData, 0, 0);
        }
    }

    canvas.addEventListener('mousedown', (e) => {
        isDrawing = true;
        const rect = canvas.getBoundingClientRect();
        draw(Math.floor(e.clientX - rect.left), Math.floor(e.clientY - rect.top));
    });

    canvas.addEventListener('mousemove', (e) => {
        if (!isDrawing) return;
        const rect = canvas.getBoundingClientRect();
        draw(Math.floor(e.clientX - rect.left), Math.floor(e.clientY - rect.top));
    });

    canvas.addEventListener('mouseup', () => isDrawing = false);
    canvas.addEventListener('mouseleave', () => isDrawing = false);
}

// --- Module 3: Basic Movement (Sub-pixel) ---
function initModule3() {
    const canvas = document.getElementById('canvas3');
    const ctx = canvas.getContext('2d');
    const speedInput = document.getElementById('speedInput');
    const speedVal = document.getElementById('speedVal');
    const toggleSubPixel = document.getElementById('toggleSubPixel');
    const posInfo = document.getElementById('posInfo');

    const width = canvas.width;
    const height = canvas.height;

    let x = 10;
    let subPixelRemainder = 0;
    
    // Config
    let speed = parseFloat(speedInput.value);
    let useSubPixel = toggleSubPixel.checked;

    speedInput.addEventListener('input', (e) => {
        speed = parseFloat(e.target.value);
        speedVal.textContent = speed;
    });

    toggleSubPixel.addEventListener('change', (e) => {
        useSubPixel = e.target.checked;
        // Reset state on toggle to make comparison easier
        x = 10;
        subPixelRemainder = 0;
    });

    function update() {
        ctx.clearRect(0, 0, width, height);

        // Draw ruler
        ctx.strokeStyle = '#999';
        ctx.beginPath();
        for (let i = 0; i < width; i+=10) {
            ctx.moveTo(i, height/2 + 10);
            ctx.lineTo(i, height/2 - 10);
        }
        ctx.stroke();

        // Logic
        if (useSubPixel) {
            subPixelRemainder += speed;
            const moveAmount = Math.floor(subPixelRemainder); // Using floor for simplicity in JS
            
            if (moveAmount >= 1) {
                x += moveAmount;
                subPixelRemainder -= moveAmount;
            }
        } else {
            // Without sub-pixel, we just cast speed to int each frame (which is usually 0 if speed < 1)
            x += Math.floor(speed); 
        }

        // Loop around
        if (x > width) x = 0;

        // Draw Object
        ctx.fillStyle = 'red';
        ctx.fillRect(x, height/2 - 5, 10, 10);

        posInfo.textContent = `Pos: ${x}, Remainder: ${subPixelRemainder.toFixed(2)}`;

        requestAnimationFrame(update);
    }
    update();
}

// --- Module 4: Collision Detection ---
function initModule4() {
    const canvas = document.getElementById('canvas4');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const collisionInfo = document.getElementById('collisionInfo');

    const width = canvas.width;
    const height = canvas.height;
    
    // Player
    const player = {
        x: 50,
        y: 50,
        width: 20,
        height: 20,
        color: 'blue'
    };

    // Terrain (Static Obstacles)
    // Draw some obstacles once to get ImageData
    ctx.fillStyle = '#eee';
    ctx.fillRect(0, 0, width, height); // Background
    ctx.fillStyle = '#333'; // Walls
    ctx.fillRect(100, 50, 50, 100);
    ctx.fillRect(200, 100, 80, 20);
    
    // Cache terrain data
    let terrainImageData = ctx.getImageData(0, 0, width, height);
    let terrainData = terrainImageData.data;

    // Helper to check pixel emptiness
    function isPixelEmpty(px, py) {
        if (px < 0 || px >= width || py < 0 || py >= height) return false; // Bounds check (treat out of bounds as wall)
        const index = (py * width + px) * 4;
        // Checking color: our walls are #333 (approx rgb(51,51,51))
        // Background is #eee (rgb(238,238,238))
        // Let's say if it's dark, it's a wall.
        return terrainData[index] > 100; // > 100 means light color (empty)
    }

    // Input
    const keys = {};
    window.addEventListener('keydown', (e) => keys[e.key] = true);
    window.addEventListener('keyup', (e) => keys[e.key] = false);

    // Collision Check Function
    function checkCollision(newX, newY) {
        // Bounding Box
        const startX = Math.floor(newX);
        const endX = Math.floor(newX + player.width);
        const startY = Math.floor(newY);
        const endY = Math.floor(newY + player.height);

        let colliding = false;

        // Check every pixel in the bounding box (Naive but accurate for pixel physics)
        // Optimization: In reality we might only check borders or corners, but for "Pixel Physics" we often check the mask.
        // Here we simulate checking the underlying grid.
        
        // Visualizing the check
        ctx.putImageData(terrainImageData, 0, 0); // Redraw terrain
        
        // Draw debug overlay for checks
        ctx.fillStyle = 'rgba(0, 255, 0, 0.3)'; // Green (Safe)
        
        for (let y = startY; y < endY; y++) {
            for (let x = startX; x < endX; x++) {
                if (!isPixelEmpty(x, y)) {
                    colliding = true;
                    // Visualize collision point
                    ctx.fillStyle = 'rgba(255, 0, 0, 0.5)'; // Red (Collision)
                    ctx.fillRect(x, y, 1, 1);
                }
            }
        }
        
        return colliding;
    }

    function update() {
        let dx = 0;
        let dy = 0;
        const speed = 2;

        if (keys['ArrowUp'] || keys['w']) dy = -speed;
        if (keys['ArrowDown'] || keys['s']) dy = speed;
        if (keys['ArrowLeft'] || keys['a']) dx = -speed;
        if (keys['ArrowRight'] || keys['d']) dx = speed;

        // X Axis Movement
        if (checkCollision(player.x + dx, player.y)) {
            // Collision! Don't move
            collisionInfo.textContent = "状态: 碰撞 (X轴)";
            collisionInfo.style.color = 'red';
        } else {
            player.x += dx;
            collisionInfo.textContent = "状态: 安全";
            collisionInfo.style.color = 'green';
        }

        // Y Axis Movement
        if (checkCollision(player.x, player.y + dy)) {
            // Collision!
             collisionInfo.textContent = "状态: 碰撞 (Y轴)";
             collisionInfo.style.color = 'red';
        } else {
            player.y += dy;
        }

        // Draw Player
        ctx.fillStyle = player.color;
        ctx.fillRect(player.x, player.y, player.width, player.height);

        requestAnimationFrame(update);
    }
    
    // Initial draw to start loop (will be cleared immediately but sets structure)
    update();
}

// --- Module 5: Falling Sand Simulation ---
function initModule5() {
    const canvas = document.getElementById('canvas5');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const stickinessInput = document.getElementById('stickinessInput');
    const stickinessVal = document.getElementById('stickinessVal');
    const resetBtn = document.getElementById('resetSand');

    const width = canvas.width;
    const height = canvas.height;
    
    // Config
    let stickiness = parseFloat(stickinessInput.value);
    
    stickinessInput.addEventListener('input', (e) => {
        stickiness = parseFloat(e.target.value);
        stickinessVal.textContent = stickiness;
    });

    // Grid State: 0 = Empty, 1 = Wall, 2 = Sand
    const grid = new Int8Array(width * height);
    
    function reset() {
        grid.fill(0);
        
        // Create a "Funnel" shape
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (y > height - 20) {
                    grid[y * width + x] = 1; // Floor
                } else if (x < 20 || x > width - 20) {
                    grid[y * width + x] = 1; // Walls
                } else if (y > 100 && (x < 100 || x > width - 100)) {
                   // Obstacles
                   grid[y * width + x] = 1;
                }
            }
        }
    }
    
    resetBtn.addEventListener('click', reset);
    reset();

    // Spawn sand on click
    let isSpawning = false;
    canvas.addEventListener('mousedown', () => isSpawning = true);
    canvas.addEventListener('mouseup', () => isSpawning = false);
    canvas.addEventListener('mouseleave', () => isSpawning = false);
    
    canvas.addEventListener('mousemove', (e) => {
        if (!isSpawning) return;
        const rect = canvas.getBoundingClientRect();
        const mouseX = Math.floor(e.clientX - rect.left);
        const mouseY = Math.floor(e.clientY - rect.top);
        
        // Spawn a blob of sand
        const r = 3;
        for(let dy=-r; dy<=r; dy++) {
            for(let dx=-r; dx<=r; dx++) {
                const x = mouseX + dx;
                const y = mouseY + dy;
                if(x >= 0 && x < width && y >=0 && y < height) {
                    const idx = y * width + x;
                    if(grid[idx] === 0) grid[idx] = 2; // Sand
                }
            }
        }
    });

    function update() {
        // We need to process from bottom to top to avoid sand falling through multiple pixels in one frame (naive implementation)
        // Or use double buffering. Let's process bottom-up for simplicity.
        
        // Random horizontal processing order to avoid bias
        
        for (let y = height - 2; y >= 0; y--) {
            // Processing order: Left to Right or Right to Left randomly?
            // Simple: Left to Right
            for (let x = 0; x < width; x++) {
                const idx = y * width + x;
                
                if (grid[idx] === 2) { // Is Sand
                    // Check below
                    const idxBelow = (y + 1) * width + x;
                    const idxBelowLeft = (y + 1) * width + (x - 1);
                    const idxBelowRight = (y + 1) * width + (x + 1);

                    // Stickiness check
                    if (Math.random() < stickiness) continue;

                    if (grid[idxBelow] === 0) {
                        // Fall straight down
                        grid[idx] = 0;
                        grid[idxBelow] = 2;
                    } else {
                        // Try diagonal
                        let moved = false;
                        const tryLeft = Math.random() > 0.5;
                        
                        if (tryLeft) {
                             if (x > 0 && grid[idxBelowLeft] === 0) {
                                 grid[idx] = 0;
                                 grid[idxBelowLeft] = 2;
                                 moved = true;
                             } else if (x < width - 1 && grid[idxBelowRight] === 0) {
                                 grid[idx] = 0;
                                 grid[idxBelowRight] = 2;
                                 moved = true;
                             }
                        } else {
                             if (x < width - 1 && grid[idxBelowRight] === 0) {
                                 grid[idx] = 0;
                                 grid[idxBelowRight] = 2;
                                 moved = true;
                             } else if (x > 0 && grid[idxBelowLeft] === 0) {
                                 grid[idx] = 0;
                                 grid[idxBelowLeft] = 2;
                                 moved = true;
                             }
                        }
                    }
                }
            }
        }

        render();
        requestAnimationFrame(update);
    }

    function render() {
        // Create ImageData
        const imgData = ctx.createImageData(width, height);
        const data = imgData.data;

        for (let i = 0; i < grid.length; i++) {
            const type = grid[i];
            const idx = i * 4;
            if (type === 1) { // Wall
                data[idx] = 100; data[idx+1] = 100; data[idx+2] = 100; data[idx+3] = 255;
            } else if (type === 2) { // Sand
                data[idx] = 246; data[idx+1] = 215; data[idx+2] = 176; data[idx+3] = 255;
            }
        }
        ctx.putImageData(imgData, 0, 0);
    }
    
    update();
}

// --- Module 6: Explosions ---
function initModule6() {
    const canvas = document.getElementById('canvas6');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const slowMotionCheck = document.getElementById('slowMotion');

    const width = canvas.width;
    const height = canvas.height;

    // Particles list
    let particles = [];
    const gravity = 0.2;

    // Terrain grid (True = Wall, False = Empty)
    const grid = new Int8Array(width * height);
    
    // Initialize Terrain
    for(let i=0; i<grid.length; i++) grid[i] = 1; // All solid
    // Carve some empty space
    for(let y=0; y<height/2; y++) {
        for(let x=0; x<width; x++) {
             grid[y*width+x] = 0;
        }
    }
    
    function explode(cx, cy, radius) {
        const rSq = radius * radius;
        const startX = Math.max(0, cx - radius);
        const endX = Math.min(width, cx + radius);
        const startY = Math.max(0, cy - radius);
        const endY = Math.min(height, cy + radius);

        for (let y = startY; y < endY; y++) {
            for (let x = startX; x < endX; x++) {
                const dx = x - cx;
                const dy = y - cy;
                if (dx*dx + dy*dy <= rSq) {
                    const idx = y * width + x;
                    if (grid[idx] === 1) { // If it's solid
                        grid[idx] = 0; // Destroy it
                        
                        // Chance to spawn particle
                        if (Math.random() < 0.3) {
                            particles.push({
                                x: x,
                                y: y,
                                vx: dx * (Math.random() * 0.1 + 0.05) + (Math.random() - 0.5),
                                vy: dy * (Math.random() * 0.1 + 0.05) - 2, // Upward bias
                                color: [100, 100, 100] // Wall color
                            });
                        }
                    }
                }
            }
        }
    }

    canvas.addEventListener('mousedown', (e) => {
        const rect = canvas.getBoundingClientRect();
        const x = Math.floor(e.clientX - rect.left);
        const y = Math.floor(e.clientY - rect.top);
        explode(x, y, 30);
    });

    function update() {
        // Slow motion?
        if (slowMotionCheck.checked && Math.random() > 0.1) {
            requestAnimationFrame(update);
            return;
        }

        // Update Particles
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.vy += gravity;
            p.x += p.vx;
            p.y += p.vy;

            // Bounds / Collision
            if (p.x < 0 || p.x >= width || p.y >= height) {
                particles.splice(i, 1);
                continue;
            }
            
            // Simple floor collision (turn back into terrain)
            const floorY = Math.floor(p.y);
            const floorX = Math.floor(p.x);
            
            if (floorY >= 0 && floorY < height && floorX >= 0 && floorX < width) {
                const idx = floorY * width + floorX;
                // If hits solid ground or bottom
                if (grid[idx] === 1 || p.y > height - 5) {
                    // Turn into terrain (Stack)
                    // Find nearest empty spot above? simplified: just solidify at current int pos
                    if (floorY > 0 && grid[idx] === 1) {
                         // Hit something solid, solidify above it
                         const aboveIdx = (floorY - 1) * width + floorX;
                         if (grid[aboveIdx] === 0) {
                            grid[aboveIdx] = 1;
                         }
                    } else {
                         grid[idx] = 1;
                    }
                    particles.splice(i, 1);
                }
            }
        }
        
        render();
        requestAnimationFrame(update);
    }

    function render() {
        // Draw Terrain + Particles
        const imgData = ctx.createImageData(width, height);
        const data = imgData.data;

        // Draw Terrain
        for (let i = 0; i < grid.length; i++) {
            if (grid[i] === 1) {
                 const idx = i * 4;
                 data[idx] = 100; data[idx+1] = 100; data[idx+2] = 100; data[idx+3] = 255;
            }
        }

        // Draw Particles manually on top
        for (const p of particles) {
            const px = Math.floor(p.x);
            const py = Math.floor(p.y);
            if(px >= 0 && px < width && py >=0 && py < height) {
                const idx = (py * width + px) * 4;
                data[idx] = 255; data[idx+1] = 100; data[idx+2] = 100; data[idx+3] = 255; // Red debris
            }
        }

        ctx.putImageData(imgData, 0, 0);
    }
    
    update();
}

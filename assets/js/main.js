// ====================== CORE GAME STATE ======================
const BOARD_SIZE = 4;
const CELL_PADDING = 15;
const GRID_PADDING = 20;
let board = [];
let score = 0;
let bestScore = localStorage.getItem('bestScore') || 0;
let moveCount = 0;
let gameWon = false;
let gameOver = false;
let history = [];
let canUndo = false;
let app = null;
let boardContainer = null;
let gridGraphics = null;
const tileContainers = [];
const tileMap = new Map();


// Color scheme for tiles
const tileColors = {
    2: {bg: 0x7d8cc4, text: 0xffffff},
    4: {bg: 0x6a7bb2, text: 0xffffff},
    8: {bg: 0x5a69a0, text: 0xffffff},
    16: {bg: 0x4a5890, text: 0xffffff},
    32: {bg: 0x3d4a80, text: 0xffffff},
    64: {bg: 0x303d70, text: 0xffffff},
    128: {bg: 0x253060, text: 0xffffff},
    256: {bg: 0x1d2550, text: 0xffffff},
    512: {bg: 0x161d40, text: 0xffffff},
    1024: {bg: 0x101530, text: 0xffffff},
    2048: {bg: 0x0b0f20, text: 0xffd700},
    default: {bg: 0x0b0f20, text: 0xffffff}
};

// DOM Elements
const pixiContainer = document.getElementById('pixi-container');
const errorContainer = document.getElementById('error-container');
const scoreElement = document.getElementById('score');
const bestScoreElement = document.getElementById('best-score');
const movesElement = document.getElementById('moves');
const undoBtn = document.getElementById('undo-btn');
const restartBtn = document.getElementById('restart-btn');
const retryBtn = document.getElementById('retry-btn');
const keepPlayingBtn = document.getElementById('keep-playing');
const gameOverEl = document.getElementById('game-over');
const gameWonEl = document.getElementById('game-won');
const reloadBtn = document.getElementById('reload-btn');

bestScoreElement.textContent = bestScore;

// ====================== PIXIJS V8 - FIXED GRAPHICS API ======================
async function initializePixi() {
    try {
        pixiContainer.style.minHeight = '400px';
        const width = Math.max(320, pixiContainer.clientWidth);
        const height = Math.max(320, pixiContainer.clientHeight);
        
        console.log('Initializing PixiJS with dimensions:', width, 'x', height);
        
        app = new PIXI.Application();
        await app.init({
            width: width,
            height: height,
            backgroundColor: 0x16213e,
            resolution: Math.min(2, window.devicePixelRatio || 1),
            autoDensity: true,
            antialias: true,
            powerPreference: 'high-performance'
        });
        
        console.log('PixiJS initialized successfully');
        
        if (app.canvas) {
            while (pixiContainer.firstChild) {
                pixiContainer.removeChild(pixiContainer.firstChild);
            }
            pixiContainer.appendChild(app.canvas);
            console.log('Canvas appended successfully');
        } else {
            throw new Error('Canvas not created by PixiJS');
        }
        
        boardContainer = new PIXI.Container();
        app.stage.addChild(boardContainer);
        
        gridGraphics = new PIXI.Graphics();
        boardContainer.addChild(gridGraphics);
        
        return true;
        
    } catch (error) {
        console.error('❌ PixiJS Initialization Failed:', error);
        showError('Failed to initialize game graphics. Please try again or use a different browser.');
        return false;
    }
}

function showError(message) {
    errorContainer.style.display = 'flex';
    errorContainer.querySelector('p').textContent = message;
}

function hideError() {
    errorContainer.style.display = 'none';
}

// ====================== FIXED GRAPHICS DRAWING (V8 API) ======================
function drawBoard() {
    if (!gridGraphics || !app) return;
    
    const containerWidth = pixiContainer.clientWidth;
    const containerHeight = pixiContainer.clientHeight;
    
    gridGraphics.clear();
    
    gridGraphics.rect(
        GRID_PADDING, 
        GRID_PADDING, 
        containerWidth - GRID_PADDING * 2, 
        containerHeight - GRID_PADDING * 2
    ).fill({ 
        color: 0x1a1a2e, 
        alpha: 0.9 
    }).roundRect(
        GRID_PADDING, 
        GRID_PADDING, 
        containerWidth - GRID_PADDING * 2, 
        containerHeight - GRID_PADDING * 2, 
        15
    ).stroke({ 
        width: 0 
    });
    
    const cellWidth = (containerWidth - GRID_PADDING * 2 - CELL_PADDING * (BOARD_SIZE - 1)) / BOARD_SIZE;
    const cellHeight = (containerHeight - GRID_PADDING * 2 - CELL_PADDING * (BOARD_SIZE - 1)) / BOARD_SIZE;
    
    for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
            const x = GRID_PADDING + col * (cellWidth + CELL_PADDING);
            const y = GRID_PADDING + row * (cellHeight + CELL_PADDING);
            
            gridGraphics.roundRect(x, y, cellWidth, cellHeight, 8)
                .fill({ color: 0x0f3460, alpha: 0.7 });
        }
    }
    
    positionTileContainers(containerWidth, containerHeight);
    renderTiles(containerWidth, containerHeight);
}

function positionTileContainers(containerWidth, containerHeight) {
    const cellWidth = (containerWidth - GRID_PADDING * 2 - CELL_PADDING * (BOARD_SIZE - 1)) / BOARD_SIZE;
    const cellHeight = (containerHeight - GRID_PADDING * 2 - CELL_PADDING * (BOARD_SIZE - 1)) / BOARD_SIZE;
    
    for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
            const index = row * BOARD_SIZE + col;
            let container = tileContainers[index];
            
            if (!container) {
                container = new PIXI.Container();
                tileContainers.push(container);
                boardContainer.addChild(container);
            }
            
            const x = GRID_PADDING + col * (cellWidth + CELL_PADDING) + cellWidth / 2;
            const y = GRID_PADDING + row * (cellHeight + CELL_PADDING) + cellHeight / 2;
            
            container.position.set(x, y);
        }
    }
}

function renderTiles(containerWidth, containerHeight) {
    const cellWidth = (containerWidth - GRID_PADDING * 2 - CELL_PADDING * (BOARD_SIZE - 1)) / BOARD_SIZE;
    const cellHeight = (containerHeight - GRID_PADDING * 2 - CELL_PADDING * (BOARD_SIZE - 1)) / BOARD_SIZE;
    const tileSize = Math.min(cellWidth, cellHeight) * 0.9;
    
    for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
            const value = board[row][col];
            const index = row * BOARD_SIZE + col;
            const container = tileContainers[index];
            
            if (container.tile) {
                container.removeChild(container.tile);
                container.removeChild(container.text);
                container.tile = null;
                container.text = null;
            }
            
            if (value !== 0) {
                const tile = new PIXI.Graphics();
                const colors = tileColors[value] || tileColors.default;
                
                if (value >= 128) {
                    const glow = new PIXI.Graphics();
                    glow.roundRect(-tileSize/2 - 5, -tileSize/2 - 5, tileSize + 10, tileSize + 10, 10)
                        .fill({ color: colors.bg, alpha: 0.3 });
                    container.addChild(glow);
                }
                
                tile.roundRect(-tileSize/2, -tileSize/2, tileSize, tileSize, 10)
                    .fill({ color: colors.bg });
                
                tile.roundRect(-tileSize/2 + 3, -tileSize/2 + 3, tileSize - 6, tileSize - 6, 7)
                    .fill({ color: 0x000000, alpha: 0.2 });
                
                container.addChild(tile);
                container.tile = tile;
                
                const text = new PIXI.Text({
                    text: value.toString(),
                    style: {
                        fontFamily: 'Arial, sans-serif',
                        fontSize: value > 999 ? tileSize * 0.3 : tileSize * 0.45,
                        fill: colors.text,
                        fontWeight: 'bold'
                    }
                });
                
                if (value === 2048) {
                    text.style.fill = 0xffd700;
                    text.style.stroke = { color: 0x000000, width: 3 };
                }
                
                text.anchor.set(0.5);
                container.addChild(text);
                container.text = text;
                
                tileMap.set(`${row},${col}`, container);
            }
        }
    }
}

function addRandomTile() {
    const emptyCells = [];
    
    for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
            if (board[row][col] === 0) {
                emptyCells.push({row, col});
            }
        }
    }
    
    if (emptyCells.length > 0) {
        const {row, col} = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        board[row][col] = Math.random() < 0.9 ? 2 : 4;
        animateNewTile(row, col, board[row][col]);
    }
}

function animateNewTile(row, col, value) {
    const index = row * BOARD_SIZE + col;
    const container = tileContainers[index];
    
    if (!container) return;
    
    gsap.fromTo(container.scale, 
        {x: 0.1, y: 0.1}, 
        {x: 1, y: 1, duration: 0.3, ease: "back.out(1.7)"}
    );
    
    gsap.fromTo(container, 
        {alpha: 0.7}, 
        {alpha: 1, duration: 0.5, ease: "power2.out"}
    );
    
    createParticles(container.position.x, container.position.y, value);
}

function createParticles(x, y, value) {
    if (!boardContainer) return;
    
    const colors = tileColors[value] || tileColors.default;
    const particleCount = value > 16 ? 12 : 8;
    
    for (let i = 0; i < particleCount; i++) {
        const particle = new PIXI.Graphics();
        particle.circle(0, 0, Math.random() * 3 + 1)
            .fill({ color: colors.bg, alpha: 0.8 });
        
        particle.position.set(x, y);
        boardContainer.addChild(particle);
        
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 3 + 1;
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;
        const duration = Math.random() * 0.8 + 0.5;
        const scale = Math.random() * 0.5 + 0.5;
        
        gsap.to(particle, {
            x: `+=${vx * 30}`,
            y: `+=${vy * 30}`,
            alpha: 0,
            scale: scale,
            duration: duration,
            ease: "power2.in",
            onComplete: () => {
                if (boardContainer && boardContainer.children.includes(particle)) {
                    boardContainer.removeChild(particle);
                }
            }
        });
    }
}

function move(direction) {
    if (gameOver || gameWon || !app) return;
    saveState();
    
    let moved = false;
    const oldScore = score;
    
    switch(direction) {
        case 'up': moved = moveUp(); break;
        case 'down': moved = moveDown(); break;
        case 'left': moved = moveLeft(); break;
        case 'right': moved = moveRight(); break;
    }
    
    if (moved) {
        moveCount++;
        movesElement.textContent = moveCount;
        canUndo = true;
        undoBtn.disabled = false;
        
        setTimeout(() => {
            if (!app) return;
            
            // Render updated board state
            renderTiles(pixiContainer.clientWidth, pixiContainer.clientHeight);
            
            // Add new tile AFTER rendering (creates smooth appearance)
            addRandomTile();
            
            // Check game state AFTER adding the new tile
            setTimeout(() => {
                checkGameState();
            }, 100);
            
        }, 250);
    }
    
    if (score !== oldScore) updateScore();
}

function saveState() {
    if (history.length > 10) history.shift();
    
    history.push({
        board: board.map(row => [...row]),
        score: score,
        moveCount: moveCount,
        gameWon: gameWon
    });
}

function undo() {
    if (history.length === 0 || !canUndo || !app) return;
    
    const prevState = history.pop();
    board = prevState.board.map(row => [...row]);
    score = prevState.score;
    moveCount = prevState.moveCount;
    gameWon = prevState.gameWon;
    gameOver = false;
    
    updateScore();
    movesElement.textContent = moveCount;
    renderTiles(pixiContainer.clientWidth, pixiContainer.clientHeight);
    
    if (history.length === 0) {
        canUndo = false;
        undoBtn.disabled = true;
    }
    
    gameOverEl.classList.remove('show');
    gameWonEl.classList.remove('show');
}

function updateScore() {
    scoreElement.textContent = score;
    if (score > bestScore) {
        bestScore = score;
        bestScoreElement.textContent = bestScore;
        localStorage.setItem('bestScore', bestScore);
        
        gsap.fromTo(bestScoreElement, 
            {scale: 1, color: '#ffd166'}, 
            {scale: 1.2, color: '#ffffff', duration: 0.3, yoyo: true, repeat: 1, ease: "power2.out"}
        );
    }
}

function checkGameState() {
    if (!gameWon) {
        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                if (board[row][col] === 2048) {
                    gameWon = true;
                    setTimeout(() => {
                        gameWonEl.classList.add('show');
                    }, 300);
                    createWinParticles();
                    return;
                }
            }
        }
    }
    
    // Check for game over condition
    if (!canMove()) {
        gameOver = true;
        setTimeout(() => {
            gameOverEl.classList.add('show');
        }, 300);
    }
}

function createWinParticles() {
    if (!boardContainer) return;
    
    const containerWidth = pixiContainer.clientWidth;
    const containerHeight = pixiContainer.clientHeight;
    
    for (let i = 0; i < 50; i++) {
        const particle = new PIXI.Graphics();
        const color = [0xffd700, 0xff9e6d, 0xff6584, 0xffffff][Math.floor(Math.random() * 4)];
        particle.star(0, 0, 5, Math.random() * 3 + 2, Math.random() * 2 + 1)
            .fill({ color: color, alpha: 0.9 });
        
        particle.position.set(
            Math.random() * containerWidth,
            Math.random() * containerHeight * 0.5
        );
        boardContainer.addChild(particle);
        
        const duration = Math.random() * 2 + 2;
        const endX = Math.random() * containerWidth;
        const endY = containerHeight + 50;
        
        gsap.to(particle, {
            x: endX,
            y: endY,
            alpha: 0,
            scale: Math.random() * 0.5 + 0.5,
            duration: duration,
            ease: "power1.in",
            onComplete: () => {
                if (boardContainer && boardContainer.children.includes(particle)) {
                    boardContainer.removeChild(particle);
                }
            }
        });
    }
}

function canMove() {
    for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
            if (board[row][col] === 0) return true;
        }
    }
    
    for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE - 1; col++) {
            if (board[row][col] === board[row][col + 1]) return true;
        }
    }
    
    for (let row = 0; row < BOARD_SIZE - 1; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
            if (board[row][col] === board[row + 1][col]) return true;
        }
    }
    
    return false;
}

// ====================== MOVEMENT LOGIC ======================
function moveUp() {
    let moved = false;
    for (let col = 0; col < BOARD_SIZE; col++) {
        let tiles = [];
        for (let row = 0; row < BOARD_SIZE; row++) {
            if (board[row][col] !== 0) {
                tiles.push({value: board[row][col], row, col});
            }
        }
        let newRow = 0;
        for (let i = 0; i < tiles.length; i++) {
            if (i < tiles.length - 1 && tiles[i].value === tiles[i+1].value) {
                const newValue = tiles[i].value * 2;
                board[newRow][col] = newValue;
                score += newValue;
                animateMerge(tiles[i].row, col, tiles[i+1].row, col, newRow, col, newValue);
                newRow++;
                i++;
                moved = true;
            } else {
                if (tiles[i].row !== newRow) {
                    board[newRow][col] = tiles[i].value;
                    board[tiles[i].row][col] = 0;
                    animateTileMove(tiles[i].row, col, newRow, col);
                    moved = true;
                } else {
                    board[newRow][col] = tiles[i].value;
                }
                newRow++;
            }
        }
        for (let row = newRow; row < BOARD_SIZE; row++) {
            if (board[row][col] !== 0) {
                board[row][col] = 0;
                moved = true;
            }
        }
    }
    return moved;
}

function moveDown() {
    let moved = false;
    for (let col = 0; col < BOARD_SIZE; col++) {
        let tiles = [];
        for (let row = BOARD_SIZE - 1; row >= 0; row--) {
            if (board[row][col] !== 0) {
                tiles.push({value: board[row][col], row, col});
            }
        }
        let newRow = BOARD_SIZE - 1;
        for (let i = 0; i < tiles.length; i++) {
            if (i < tiles.length - 1 && tiles[i].value === tiles[i+1].value) {
                const newValue = tiles[i].value * 2;
                board[newRow][col] = newValue;
                score += newValue;
                animateMerge(tiles[i].row, col, tiles[i+1].row, col, newRow, col, newValue);
                newRow--;
                i++;
                moved = true;
            } else {
                if (tiles[i].row !== newRow) {
                    board[newRow][col] = tiles[i].value;
                    board[tiles[i].row][col] = 0;
                    animateTileMove(tiles[i].row, col, newRow, col);
                    moved = true;
                } else {
                    board[newRow][col] = tiles[i].value;
                }
                newRow--;
            }
        }
        for (let row = newRow; row >= 0; row--) {
            if (board[row][col] !== 0) {
                board[row][col] = 0;
                moved = true;
            }
        }
    }
    return moved;
}

function moveLeft() {
    let moved = false;
    for (let row = 0; row < BOARD_SIZE; row++) {
        let tiles = [];
        for (let col = 0; col < BOARD_SIZE; col++) {
            if (board[row][col] !== 0) {
                tiles.push({value: board[row][col], row, col});
            }
        }
        let newCol = 0;
        for (let i = 0; i < tiles.length; i++) {
            if (i < tiles.length - 1 && tiles[i].value === tiles[i+1].value) {
                const newValue = tiles[i].value * 2;
                board[row][newCol] = newValue;
                score += newValue;
                animateMerge(row, tiles[i].col, row, tiles[i+1].col, row, newCol, newValue);
                newCol++;
                i++;
                moved = true;
            } else {
                if (tiles[i].col !== newCol) {
                    board[row][newCol] = tiles[i].value;
                    board[row][tiles[i].col] = 0;
                    animateTileMove(row, tiles[i].col, row, newCol);
                    moved = true;
                } else {
                    board[row][newCol] = tiles[i].value;
                }
                newCol++;
            }
        }
        for (let col = newCol; col < BOARD_SIZE; col++) {
            if (board[row][col] !== 0) {
                board[row][col] = 0;
                moved = true;
            }
        }
    }
    return moved;
}

function moveRight() {
    let moved = false;
    for (let row = 0; row < BOARD_SIZE; row++) {
        let tiles = [];
        for (let col = BOARD_SIZE - 1; col >= 0; col--) {
            if (board[row][col] !== 0) {
                tiles.push({value: board[row][col], row, col});
            }
        }
        let newCol = BOARD_SIZE - 1;
        for (let i = 0; i < tiles.length; i++) {
            if (i < tiles.length - 1 && tiles[i].value === tiles[i+1].value) {
                const newValue = tiles[i].value * 2;
                board[row][newCol] = newValue;
                score += newValue;
                animateMerge(row, tiles[i].col, row, tiles[i+1].col, row, newCol, newValue);
                newCol--;
                i++;
                moved = true;
            } else {
                if (tiles[i].col !== newCol) {
                    board[row][newCol] = tiles[i].value;
                    board[row][tiles[i].col] = 0;
                    animateTileMove(row, tiles[i].col, row, newCol);
                    moved = true;
                } else {
                    board[row][newCol] = tiles[i].value;
                }
                newCol--;
            }
        }
        for (let col = newCol; col >= 0; col--) {
            if (board[row][col] !== 0) {
                board[row][col] = 0;
                moved = true;
            }
        }
    }
    return moved;
}

// ====================== FIXED ANIMATION FUNCTIONS (NO .clone()) ======================
function animateTileMove(oldRow, oldCol, newRow, newCol) {
    const oldIndex = oldRow * BOARD_SIZE + oldCol;
    const newIndex = newRow * BOARD_SIZE + newCol;
    const oldContainer = tileContainers[oldIndex];
    const newContainer = tileContainers[newIndex];
    
    if (oldContainer?.tile && newContainer && boardContainer) {
        
        const cloneTile = oldContainer.tile.clone();
        
        const oldText = oldContainer.text;
        const cloneText = new PIXI.Text({
            text: oldText.text,
            style: {
                fontFamily: oldText.style.fontFamily,
                fontSize: oldText.style.fontSize,
                fill: oldText.style.fill,
                fontWeight: oldText.style.fontWeight,
                stroke: oldText.style.stroke
            }
        });
        cloneText.anchor.set(0.5);
        
        const tempContainer = new PIXI.Container();
        tempContainer.addChild(cloneTile);
        tempContainer.addChild(cloneText);
        tempContainer.position.copyFrom(oldContainer.position);
        boardContainer.addChild(tempContainer);
        
        gsap.to(tempContainer.position, {
            x: newContainer.position.x,
            y: newContainer.position.y,
            duration: 0.2,
            ease: "power2.out",
            onComplete: () => {
                if (boardContainer && boardContainer.children.includes(tempContainer)) {
                    boardContainer.removeChild(tempContainer);
                }
            }
        });
        
        gsap.fromTo(tempContainer.scale, 
            {x: 1, y: 1}, 
            {x: 1.1, y: 1.1, duration: 0.1, yoyo: true, repeat: 1, ease: "power1.inOut"}
        );
    }
}

function animateMerge(row1, col1, row2, col2, newRow, newCol, newValue) {
    const index1 = row1 * BOARD_SIZE + col1;
    const index2 = row2 * BOARD_SIZE + col2;
    const newIndex = newRow * BOARD_SIZE + newCol;
    
    const container1 = tileContainers[index1];
    const container2 = tileContainers[index2];
    const newContainer = tileContainers[newIndex];
    
    if (container1?.tile && container2?.tile && newContainer && boardContainer) {
        const mergeContainer = new PIXI.Container();
        mergeContainer.position.copyFrom(newContainer.position);
        boardContainer.addChild(mergeContainer);
        
        const clone1 = container1.tile.clone();
        const text1 = container1.text;
        const cloneText1 = new PIXI.Text({
            text: text1.text,
            style: {
                fontFamily: text1.style.fontFamily,
                fontSize: text1.style.fontSize,
                fill: text1.style.fill,
                fontWeight: text1.style.fontWeight,
                stroke: text1.style.stroke
            }
        });
        cloneText1.anchor.set(0.5);
        
        const clone2 = container2.tile.clone();
        const text2 = container2.text;
        const cloneText2 = new PIXI.Text({
            text: text2.text,
            style: {
                fontFamily: text2.style.fontFamily,
                fontSize: text2.style.fontSize,
                fill: text2.style.fill,
                fontWeight: text2.style.fontWeight,
                stroke: text2.style.stroke
            }
        });
        cloneText2.anchor.set(0.5);
        
        const temp1 = new PIXI.Container();
        temp1.addChild(clone1);
        temp1.addChild(cloneText1);
        temp1.position.copyFrom(container1.position);
        
        const temp2 = new PIXI.Container();
        temp2.addChild(clone2);
        temp2.addChild(cloneText2);
        temp2.position.copyFrom(container2.position);
        
        mergeContainer.addChild(temp1);
        mergeContainer.addChild(temp2);
        
        gsap.to(temp1.position, {
            x: 0,
            y: 0,
            duration: 0.2,
            ease: "power2.in",
            onComplete: () => {
                if (boardContainer && boardContainer.children.includes(mergeContainer)) {
                    boardContainer.removeChild(mergeContainer);
                }
            }
        });
        
        gsap.to(temp2.position, {
            x: 0,
            y: 0,
            duration: 0.2,
            ease: "power2.in"
        });
        
        gsap.fromTo(mergeContainer.scale, 
            {x: 0.8, y: 0.8}, 
            {x: 1.2, y: 1.2, duration: 0.2, ease: "back.out(1.7)"}
        );
        
        gsap.to(mergeContainer, {
            alpha: 0,
            duration: 0.3,
            delay: 0.15
        });
        
        createMergeParticles(newContainer.position.x, newContainer.position.y, newValue);
    }
}

function createMergeParticles(x, y, value) {
    if (!boardContainer) return;
    
    const colors = tileColors[value] || tileColors.default;
    const particleCount = 15;
    
    for (let i = 0; i < particleCount; i++) {
        const particle = new PIXI.Graphics();
        particle.circle(0, 0, Math.random() * 2 + 1)
            .fill({ color: colors.bg, alpha: 0.9 });
        
        particle.position.set(x, y);
        boardContainer.addChild(particle);
        
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 4 + 2;
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;
        const duration = Math.random() * 0.6 + 0.4;
        
        gsap.to(particle, {
            x: `+=${vx * 20}`,
            y: `+=${vy * 20}`,
            alpha: 0,
            duration: duration,
            ease: "power2.in",
            onComplete: () => {
                if (boardContainer && boardContainer.children.includes(particle)) {
                    boardContainer.removeChild(particle);
                }
            }
        });
    }
    
    const text = new PIXI.Text({
        text: value.toString(),
        style: {
            fontFamily: 'Arial, sans-serif',
            fontSize: 30,
            fill: (value === 2048) ? 0xffd700 : (tileColors[value] || tileColors.default).text,
            fontWeight: 'bold',
            stroke: { color: 0x000000, width: (value === 2048) ? 4 : 0 }
        }
    });
    
    text.anchor.set(0.5);
    text.position.set(x, y);
    text.alpha = 0.9;
    boardContainer.addChild(text);
    
    gsap.to(text, {
        y: y - 30,
        alpha: 0,
        duration: 0.7,
        ease: "power2.in",
        onComplete: () => {
            if (boardContainer && boardContainer.children.includes(text)) {
                boardContainer.removeChild(text);
            }
        }
    });
}

// ====================== EVENT HANDLERS =====================
document.addEventListener('keydown', (e) => {
    if (!app) return;
    
    if (e.key === 'ArrowUp') { e.preventDefault(); move('up'); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); move('down'); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); move('left'); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); move('right'); }
    else if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo(); }
});

let touchStartX = 0, touchStartY = 0, touchEndX = 0, touchEndY = 0;

function handleTouchStart(e) {
    touchStartX = e.changedTouches?.[0]?.screenX || e.screenX || 0;
    touchStartY = e.changedTouches?.[0]?.screenY || e.screenY || 0;
}

function handleTouchEnd(e) {
    touchEndX = e.changedTouches?.[0]?.screenX || e.screenX || 0;
    touchEndY = e.changedTouches?.[0]?.screenY || e.screenY || 0;
    handleSwipe();
}

pixiContainer.addEventListener('touchstart', handleTouchStart, { passive: true });
pixiContainer.addEventListener('touchend', handleTouchEnd, { passive: true });
pixiContainer.addEventListener('mousedown', handleTouchStart);
pixiContainer.addEventListener('mouseup', handleTouchEnd);

function handleSwipe() {
    if (!app) return;
    
    const dx = touchEndX - touchStartX;
    const dy = touchEndY - touchStartY;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    
    if (absDx > 20 || absDy > 20) {
        if (absDx > absDy) {
            if (dx > 0) move('right');
            else move('left');
        } else {
            if (dy > 0) move('down');
            else move('up');
        }
    }
}

restartBtn.addEventListener('click', () => { 
    if (app) {
        gameOverEl.classList.remove('show');
        gameWonEl.classList.remove('show');
        initGame(); 
    }
});

retryBtn.addEventListener('click', () => { 
    if (app) {
        gameOverEl.classList.remove('show');
        gameWonEl.classList.remove('show');
        initGame(); 
    }
});
undoBtn.addEventListener('click', undo);
keepPlayingBtn.addEventListener('click', () => gameWonEl.classList.remove('show'));
reloadBtn.addEventListener('click', startGame);

let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    setTimeout(() => {
        document.getElementById('installPrompt').classList.add('show');
    }, 3000);
});

document.getElementById('installBtn').addEventListener('click', async () => {
  if (!deferredPrompt) return;

  document
    .getElementById('installPrompt')
    .classList.remove('show');

  deferredPrompt.prompt();

  const { outcome } = await deferredPrompt.userChoice;
  console.log('Install result:', outcome);

  deferredPrompt = null;
});

window.addEventListener('appinstalled', () => {
  deferredPrompt = null;
  document
    .getElementById('installPrompt')
    .classList.remove('show');
});

// ====================== RESPONSIVE HANDLING ======================
let resizeTimeout;
function resize() {
    if (!app || !pixiContainer) return;
    
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        const width = pixiContainer.clientWidth;
        const height = pixiContainer.clientHeight;
        
        if (width > 0 && height > 0) {
            app.renderer.resize(width, height);
            drawBoard();
        }
    }, 100);
}

window.addEventListener('resize', resize);

// ====================== SERVICE WORKER ======================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        const swCode = `
            const CACHE_NAME = '2048-game-v1';
            const urlsToCache = ['/'];
            
            self.addEventListener('install', event => {
                event.waitUntil(
                    caches.open(CACHE_NAME)
                        .then(cache => cache.addAll(urlsToCache))
                );
            });
            
            self.addEventListener('fetch', event => {
                event.respondWith(
                    caches.match(event.request)
                        .then(response => response || fetch(event.request))
                );
            });
        `;
        
        const blob = new Blob([swCode], {type: 'application/javascript'});
        const swURL = URL.createObjectURL(blob);
        
        navigator.serviceWorker.register(swURL)
            .then(reg => console.log('ServiceWorker registered:', reg.scope))
            .catch(err => console.log('ServiceWorker registration failed:', err));
    });
}

// ======================  GAME FUNCTIONS ======================
function initGame() {
    board = Array(BOARD_SIZE).fill().map(() => Array(BOARD_SIZE).fill(0));
    score = 0;
    moveCount = 0;
    gameWon = false;
    gameOver = false;
    history = [];
    canUndo = false;
    
    updateScore();
    movesElement.textContent = moveCount;
    undoBtn.disabled = true;
    
    gameOverEl.classList.remove('show');
    gameWonEl.classList.remove('show');
    hideError();
    
    tileContainers.forEach(container => {
        if (container.tile) {
            container.removeChild(container.tile);
            container.removeChild(container.text);
            container.tile = null;
            container.text = null;
        }
    });
    
    tileMap.clear();
    
    addRandomTile();
    addRandomTile();
    
    drawBoard();
}

// ======================  GAME STARTUP ======================
async function startGame() {
    console.log('🚀 Starting 2048 Game...');
    
    pixiContainer.innerHTML = '<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);color:white;font-size:1.5rem;">Loading game...</div>';
    
    const success = await initializePixi();
    
    if (success) {
        console.log('✅ Game initialized successfully');
        initGame();
        resize();
    } else {
        console.error('❌ Game initialization failed');
    }
}

window.addEventListener('load', startGame);
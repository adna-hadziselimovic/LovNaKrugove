document.addEventListener('DOMContentLoaded', function () {
    const canvas = document.getElementById('gameCanvas');

    canvas.style.pointerEvents = 'auto';
    const ctx = canvas.getContext('2d');

    const startScreen = document.getElementById('startScreen');
    const gameScreen = document.getElementById('gameScreen');
    const gameOverScreen = document.getElementById('gameOverScreen');
    const startBtn = document.getElementById('startBtn');
    const restartBtn = document.getElementById('restartBtn');
    const usernameInput = document.getElementById('username');

    let gameRunning = false;
    let player;
    let circles = [];
    let mouse = { x: 0, y: 0 };
    let points = 0;
    let playerName = 'Igrač';
    let playerSkin = 'classic';
    let spawnTimer = 0;
    let particles = [];
    let gameTime = 0;
    let difficultyTimer = 0;
    let circlesEaten = 0;
    let topScore = localStorage.getItem('topScore') || 0;
    let startTime = 0;
    let powerUps = [];
    let magnetActive = false;
    let magnetTimer = 0;
    let ghostActive = false;
    let ghostTimer = 0;
    let powerUpSpawnTimer = 0;

    let CANVAS_WIDTH = window.innerWidth;
    let CANVAS_HEIGHT = window.innerHeight;
    const INITIAL_PLAYER_RADIUS = 30;
    const GROWTH_RATE = 1.0;
    const NUM_CIRCLES = 25;
    const MIN_CIRCLE_RADIUS = 8;
    const CIRCLE_SPEED = 0.8;
    const PLAYER_SPEED = 4;
    const AI_GROWTH_FACTOR = 0.25;
    const MAGNET_DURATION = 300;
    const GHOST_DURATION = 240;
    const MAGNET_RADIUS = 300;
    const POWERUP_SPAWN_INTERVAL = 600;

    // SKINOVI
    const skins = {
        classic: { baseColor: '#ff6b9d', accentColor: '#ffb3d9', name: 'Bubblegum', pattern: 'solid' },
        fire: { baseColor: '#ff6b35', accentColor: '#ffd93d', name: 'Orange Pop', pattern: 'swirl' },
        ice: { baseColor: '#6bcfff', accentColor: '#b8e6ff', name: 'Mint Ice' },
        gold: { baseColor: '#ffd700', accentColor: '#fff4a3', name: 'Honey Drop' },
        grape: { baseColor: '#8B5FBF', accentColor: '#D4A5FF', name: 'Grape', pattern: 'solid' },
        rainbow: {
            baseColor: 'rainbow',
            colors: ['#ff0000', '#ff7f00', '#ffff00', '#00ff00', '#0000ff', '#8b00ff'],
            name: 'Rainbow Pop',
            pattern: 'rainbow'
        }
    };

    // Odabir skinova
    const skinOptions = document.querySelectorAll('.skin-option');
    skinOptions.forEach(option => {
        option.addEventListener('click', function () {
            skinOptions.forEach(opt => opt.classList.remove('selected'));
            this.classList.add('selected');
            playerSkin = this.getAttribute('data-skin');
        });
    });

    let bgGradient;
    // Set canvas size
    function resizeCanvas() {
        CANVAS_WIDTH = window.innerWidth;
        CANVAS_HEIGHT = window.innerHeight;
        canvas.width = CANVAS_WIDTH;
        canvas.height = CANVAS_HEIGHT;

        bgGradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
        bgGradient.addColorStop(0, '#cadede');
        bgGradient.addColorStop(0.5, '#fae2e2');
        bgGradient.addColorStop(1, '#c3c5e2');
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    function showScreen(screen) {
        startScreen.classList.add('hidden');
        gameScreen.classList.add('hidden');
        gameOverScreen.classList.remove('hidden');

        if (screen === 'start') {
            startScreen.classList.remove('hidden');
            gameOverScreen.classList.add('hidden');
        } else if (screen === 'game') {
            gameScreen.classList.remove('hidden');
            gameOverScreen.classList.add('hidden');
        } else if (screen === 'gameOver') {
            gameOverScreen.classList.remove('hidden');
        }
    }

    function getDarkerColor(color) {
        if (color.startsWith('#')) {
            const r = parseInt(color.slice(1, 3), 16);
            const g = parseInt(color.slice(3, 5), 16);
            const b = parseInt(color.slice(5, 7), 16);
            return `rgb(${Math.floor(r * 0.5)}, ${Math.floor(g * 0.5)}, ${Math.floor(b * 0.5)})`;
        }
        return 'rgba(0, 0, 0, 0.7)';
    }

    function drawGlossyHighlight(x, y, radius, opacity1 = 0.8, opacity2 = 0.3) {
        const highlight = ctx.createRadialGradient(x - radius * 0.3, y - radius * 0.3, 0, x, y, radius);
        highlight.addColorStop(0, `rgba(255, 255, 255, ${opacity1})`);
        highlight.addColorStop(0.4, `rgba(255, 255, 255, ${opacity2})`);
        highlight.addColorStop(1, 'transparent');
        ctx.fillStyle = highlight;
        ctx.fill();
    }

    function updateStat(id, value) {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    }
    class Circle {
        constructor(x, y, radius, color, isPlayer = false, skinData = null) {
            this.x = x;
            this.y = y;
            this.radius = radius;
            this.initialRadius = radius;
            this.color = color;
            this.isPlayer = isPlayer;
            this.skinData = skinData;

            if (!isPlayer) {
                const angle = Math.random() * Math.PI * 2;
                this.vx = Math.cos(angle) * CIRCLE_SPEED;
                this.vy = Math.sin(angle) * CIRCLE_SPEED;
                this.directionChangeTimer = Math.random() * 100 + 50;
            }
        }

        draw() {
            ctx.save();
            if (this.isPlayer && this.skinData) {
                this.drawCircleContent(this.skinData, true);
            } else {
                this.drawCircleContent({ baseColor: this.color }, false);
            }
            ctx.restore();
        }

        drawCircleContent(data, isPlayerSkin) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);

            if (isPlayerSkin && data.pattern === 'rainbow') {
                const gradient = ctx.createConicGradient(0, this.x, this.y);
                data.colors.forEach((color, index) => {
                    gradient.addColorStop(index / data.colors.length, color);
                });
                ctx.fillStyle = gradient;
            } else if (isPlayerSkin && data.pattern === 'swirl') {
                const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius);
                gradient.addColorStop(0, data.baseColor);
                gradient.addColorStop(0.5, data.accentColor);
                gradient.addColorStop(1, data.baseColor);
                ctx.fillStyle = gradient;
            } else {
                ctx.fillStyle = data.baseColor;
            }
            ctx.fill();

            drawGlossyHighlight(this.x, this.y, this.radius);

            if (isPlayerSkin) {
                ctx.strokeStyle = getDarkerColor(data.baseColor);
                ctx.lineWidth = 3;
            } else {
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
                ctx.lineWidth = 2;
            }
            ctx.stroke();
        }

        update() {
            if (this.isPlayer) {
                const dx = mouse.x - this.x;
                const dy = mouse.y - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance > 5) {
                    this.x += (dx / distance) * PLAYER_SPEED;
                    this.y += (dy / distance) * PLAYER_SPEED;
                }
            } else {
                if (player) {
                    const playerGrowthRatio = player.radius / INITIAL_PLAYER_RADIUS;
                    const aiGrowthRatio = 1 + (playerGrowthRatio - 1) * AI_GROWTH_FACTOR;
                    const targetRadius = this.initialRadius * aiGrowthRatio;
                    this.radius += (targetRadius - this.radius) * 0.05;
                }

                // MAGNET EFEKAT
                if (magnetActive && player && this.radius < player.radius) {
                    const distToPlayer = getDistance(this.x, this.y, player.x, player.y);
                    if (distToPlayer < MAGNET_RADIUS) {
                        const dx = player.x - this.x;
                        const dy = player.y - this.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        if (distance > 0) {
                            this.x += (dx / distance) * 2;
                            this.y += (dy / distance) * 2;
                        }
                    }
                }

                // Pomjeranje krugova
                this.x += this.vx;
                this.y += this.vy;

                // Nasumična promjena smjera
                this.directionChangeTimer--;
                if (this.directionChangeTimer <= 0) {
                    const angle = Math.random() * Math.PI * 2;
                    this.vx = Math.cos(angle) * CIRCLE_SPEED;
                    this.vy = Math.sin(angle) * CIRCLE_SPEED;
                    this.directionChangeTimer = Math.random() * 100 + 50;
                }
            }

            // Kolizija s ivicama canvasa
            if (this.x - this.radius < 0) {
                this.x = this.radius;
                if (!this.isPlayer) this.vx = Math.abs(this.vx);
            }
            if (this.x + this.radius > CANVAS_WIDTH) {
                this.x = CANVAS_WIDTH - this.radius;
                if (!this.isPlayer) this.vx = -Math.abs(this.vx);
            }
            if (this.y - this.radius < 0) {
                this.y = this.radius;
                if (!this.isPlayer) this.vy = Math.abs(this.vy);
            }
            if (this.y + this.radius > CANVAS_HEIGHT) {
                this.y = CANVAS_HEIGHT - this.radius;
                if (!this.isPlayer) this.vy = -Math.abs(this.vy);
            }
        }

        drawLabel() {
            if (this.isPlayer) {
                ctx.fillStyle = 'white';
                ctx.font = `bold ${Math.max(12, this.radius / 3)}px Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
                ctx.shadowBlur = 4;
                ctx.fillText(playerName, this.x, this.y);
                ctx.shadowBlur = 0;
            }
        }
    }

    // Vizuelni efekat nakon jedenja kruga
    class Particle {
        constructor(x, y, color) {
            this.x = x;
            this.y = y;
            this.radius = Math.random() * 4 + 2;
            this.color = color;
            this.alpha = 1;
            this.velocity = {
                x: (Math.random() - 0.5) * 8,
                y: (Math.random() - 0.5) * 8
            };
            this.life = 0;
            this.maxLife = 30;
        }

        update() {
            this.x += this.velocity.x;
            this.y += this.velocity.y;
            this.velocity.x *= 0.95;
            this.velocity.y *= 0.95;
            this.life++;
            this.alpha = 1 - (this.life / this.maxLife);
            this.radius *= 0.96;
        }

        draw() {
            ctx.save();
            ctx.globalAlpha = this.alpha;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.fill();
            ctx.restore();
        }

        isDead() {
            return this.life >= this.maxLife;
        }
    }

    // POWER-UP
    class PowerUp {
        constructor(x, y, type) {
            this.x = x;
            this.y = y;
            this.radius = 20;
            this.type = type;
            this.pulseTimer = 0;
            this.lifeTimer = 0;
            this.maxLife = 600;
            this.warningThreshold = 180;
        }

        draw() {
            this.pulseTimer += 0.1;
            this.lifeTimer++;

            const pulse = Math.sin(this.pulseTimer) * 3;

            // Upozorenje za istek trajanja
            const shouldBlink = this.lifeTimer > (this.maxLife - this.warningThreshold);
            const blinkVisible = shouldBlink ? Math.floor(this.lifeTimer / 10) % 2 === 0 : true;

            if (!blinkVisible) return;

            ctx.save();

            // Nestajanje
            const fadeStart = this.maxLife - this.warningThreshold;
            if (this.lifeTimer > fadeStart) {
                const fadeProgress = (this.lifeTimer - fadeStart) / this.warningThreshold;
                ctx.globalAlpha = 1 - (fadeProgress * 0.5);
            }

            this.drawTriangle(pulse);

            ctx.restore();
        }

        drawTriangle(pulse) {
            const size = this.radius + pulse;

            ctx.beginPath();
            ctx.moveTo(this.x, this.y - size);
            ctx.lineTo(this.x + size * 0.87, this.y + size * 0.5);
            ctx.lineTo(this.x - size * 0.87, this.y + size * 0.5);
            ctx.closePath();

            const gradient = ctx.createRadialGradient(
                this.x, this.y, 0,
                this.x, this.y, size
            );

            if (this.type === 'magnet') {
                gradient.addColorStop(0, '#9D4EDD');
                gradient.addColorStop(0.5, '#C77DFF');
                gradient.addColorStop(1, '#7209B7');
            } else if (this.type === 'ghost') {
                gradient.addColorStop(0, '#06FFA5');
                gradient.addColorStop(0.5, '#00D9FF');
                gradient.addColorStop(1, '#0099CC');
            }

            ctx.fillStyle = gradient;
            ctx.fill();

            drawGlossyHighlight(this.x, this.y, size, 0.9, 0.3);

            ctx.strokeStyle = 'white';
            ctx.lineWidth = 3;
            ctx.stroke();

            // Oznaka tipa power-upa
            ctx.fillStyle = 'white';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            ctx.shadowBlur = 3;
            ctx.fillText(this.type === 'magnet' ? 'M' : 'G', this.x, this.y);
            ctx.shadowBlur = 0;
        }

        isExpired() {
            return this.lifeTimer >= this.maxLife;
        }
    }

    // Detekcija kolizije
    function getDistance(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    }

    function checkCollision(circle1, circle2) {
        const distance = getDistance(circle1.x, circle1.y, circle2.x, circle2.y);
        return distance < circle1.radius + circle2.radius;
    }

    // Pokretanje igre
    function initGame() {
        circles = [];
        points = 0;
        gameTime = 0;
        difficultyTimer = 0;
        spawnTimer = 0;
        particles = [];
        circlesEaten = 0;
        startTime = Date.now();
        powerUps = [];
        magnetActive = false;
        magnetTimer = 0;
        ghostActive = false;
        ghostTimer = 0;
        powerUpSpawnTimer = 0;
        playerName = usernameInput.value.trim() || 'Igrač';

        player = new Circle(
            CANVAS_WIDTH / 2,
            CANVAS_HEIGHT / 2,
            INITIAL_PLAYER_RADIUS,
            '#ff6b9d',
            true,
            skins[playerSkin]
        );

        for (let i = 0; i < NUM_CIRCLES; i++) {
            let x, y, radius, overlapping;

            do {
                overlapping = false;
                x = Math.random() * (CANVAS_WIDTH - 200) + 100;
                y = Math.random() * (CANVAS_HEIGHT - 200) + 100;

                if (Math.random() < 0.7) {
                    radius = Math.random() * (INITIAL_PLAYER_RADIUS * 0.7 - MIN_CIRCLE_RADIUS) + MIN_CIRCLE_RADIUS;
                } else {
                    radius = Math.random() * 8 + INITIAL_PLAYER_RADIUS * 1.1;
                }

                const distToPlayer = getDistance(x, y, player.x, player.y);
                if (distToPlayer < radius + player.radius + 250) {
                    overlapping = true;
                }
            } while (overlapping);

            const hue = Math.random() * 360;
            const color = `hsl(${hue}, 70%, 60%)`;
            circles.push(new Circle(x, y, radius, color));
        }
    }

    function gameLoop() {
        if (!gameRunning) return;

        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        ctx.strokeStyle = 'rgba(255, 182, 193, 0.25)';
        ctx.lineWidth = 1;

        for (let i = 0; i < CANVAS_WIDTH; i += 50) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i, CANVAS_HEIGHT);
            ctx.stroke();
        }

        for (let i = 0; i < CANVAS_HEIGHT; i += 50) {
            ctx.beginPath();
            ctx.moveTo(0, i);
            ctx.lineTo(CANVAS_WIDTH, i);
            ctx.stroke();
        }

        gameTime++;
        difficultyTimer++;

        // Power-up timeri
        if (magnetActive) {
            magnetTimer--;
            if (magnetTimer <= 0) magnetActive = false;
        }

        if (ghostActive) {
            ghostTimer--;
            if (ghostTimer <= 0) ghostActive = false;
        }

        powerUpSpawnTimer++;
        if (powerUpSpawnTimer >= POWERUP_SPAWN_INTERVAL) {
            powerUpSpawnTimer = 0;
            const type = Math.random() < 0.5 ? 'magnet' : 'ghost';
            let x, y, tooClose;

            do {
                tooClose = false;
                x = Math.random() * (CANVAS_WIDTH - 100) + 50;
                y = Math.random() * (CANVAS_HEIGHT - 100) + 50;
                const dist = getDistance(x, y, player.x, player.y);
                if (dist < 150) tooClose = true;
            } while (tooClose);

            powerUps.push(new PowerUp(x, y, type));
        }

        if (difficultyTimer >= 3600) {
            difficultyTimer = 0;
            circles.forEach(circle => {
                if (!circle.isPlayer) {
                    circle.vx *= 1.02;
                    circle.vy *= 1.02;
                }
            });
        }

        // Crtanje i update krugova
        for (let i = circles.length - 1; i >= 0; i--) {
            circles[i].update();
            circles[i].draw();
        }

        // Crtanje i update power-upova
        for (let i = powerUps.length - 1; i >= 0; i--) {
            if (powerUps[i].isExpired()) {
                powerUps.splice(i, 1);
                continue;
            }

            powerUps[i].draw();

            const dist = getDistance(player.x, player.y, powerUps[i].x, powerUps[i].y);
            if (dist < player.radius + powerUps[i].radius) {
                if (powerUps[i].type === 'magnet') {
                    magnetActive = true;
                    magnetTimer = MAGNET_DURATION;
                } else if (powerUps[i].type === 'ghost') {
                    ghostActive = true;
                    ghostTimer = GHOST_DURATION;
                }
                powerUps.splice(i, 1);
            }
        }

        // Crtanje i update čestica
        for (let i = particles.length - 1; i >= 0; i--) {
            particles[i].update();
            particles[i].draw();
            if (particles[i].isDead()) particles.splice(i, 1);
        }

        // Crtanje i update igrača
        player.update();
        if (ghostActive) {
            ctx.save();
            ctx.globalAlpha = 0.5;
        }
        player.draw();
        player.drawLabel();
        if (ghostActive) {
            ctx.restore();
        }

        // Provjera kolizije
        for (let i = circles.length - 1; i >= 0; i--) {
            if (checkCollision(player, circles[i])) {
                if (player.radius > circles[i].radius) {
                    const eatenCircle = circles[i];
                    player.radius += GROWTH_RATE;
                    points += Math.floor(eatenCircle.radius);
                    circlesEaten++;

                    createEatEffect(eatenCircle.x, eatenCircle.y, eatenCircle.color, eatenCircle.radius);

                    circles.splice(i, 1);
                } else if (!ghostActive) {
                    gameOver();
                    return;
                }
            }
        }

        // Spawn novih krugova
        spawnTimer++;
        const baseSpawnInterval = 180;
        const minSpawnInterval = 90;
        const spawnReduction = Math.floor(gameTime / 3600);
        const currentSpawnInterval = Math.max(minSpawnInterval, baseSpawnInterval - spawnReduction * 15);

        if (spawnTimer >= currentSpawnInterval) {
            spawnTimer = 0;
            const numToSpawn = Math.random() < 0.6 ? 1 : 2;

            for (let i = 0; i < numToSpawn; i++) {
                let x, y, radius, tooCloseToPlayer;
                const SAFE_ZONE_RADIUS = 200;
                let attempts = 0;

                do {
                    tooCloseToPlayer = false;
                    x = Math.random() * (CANVAS_WIDTH - 100) + 50;
                    y = Math.random() * (CANVAS_HEIGHT - 100) + 50;

                    const distToPlayer = getDistance(x, y, player.x, player.y);
                    if (distToPlayer < SAFE_ZONE_RADIUS + player.radius) {
                        tooCloseToPlayer = true;
                    }

                    attempts++;
                    if (attempts > 50) break;
                } while (tooCloseToPlayer);

                const currentPlayerRadius = player.radius;
                radius = Math.random() < 0.6
                    ? Math.random() * (currentPlayerRadius * 0.75 - MIN_CIRCLE_RADIUS) + MIN_CIRCLE_RADIUS
                    : Math.random() * (currentPlayerRadius * 0.4) + currentPlayerRadius * 1.15;

                const hue = Math.random() * 360;
                const color = `hsl(${hue}, 70%, 60%)`;
                circles.push(new Circle(x, y, radius, color));
            }
        }

        updateStat('playerPoints', points);

        // Power-up status
        if (magnetActive || ghostActive) {
            ctx.save();
            ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
            ctx.strokeStyle = '#ff69b4';
            ctx.lineWidth = 3;
            const boxHeight = magnetActive && ghostActive ? 70 : 50;
            ctx.fillRect(CANVAS_WIDTH / 2 - 110, 10, 220, boxHeight);
            ctx.strokeRect(CANVAS_WIDTH / 2 - 110, 10, 220, boxHeight);

            ctx.fillStyle = '#ff1493';
            ctx.font = 'bold 18px Arial';
            ctx.textAlign = 'center';

            let yPos = 35;
            if (magnetActive) {
                ctx.fillText(`Magnet: ${Math.ceil(magnetTimer / 60)}s`, CANVAS_WIDTH / 2, yPos);
                yPos += 30;
            }
            if (ghostActive) {
                ctx.fillText(`Ghost: ${Math.ceil(ghostTimer / 60)}s`, CANVAS_WIDTH / 2, yPos);
            }
            ctx.restore();
        }

        requestAnimationFrame(gameLoop);
    }

    function createEatEffect(x, y, color, radius) {
        const particleCount = Math.floor(radius / 2) + 15;

        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 * i) / particleCount;
            const speed = Math.random() * 6 + 3;

            particles.push(new Particle(x, y, color));

            if (i % 3 === 0) {
                const specialColor = ['#ffffff', '#ffff00', '#ff69b4'][Math.floor(Math.random() * 3)];
                particles.push(new Particle(
                    x, y, specialColor,
                    Math.cos(angle) * speed * 1.5,
                    Math.sin(angle) * speed * 1.5
                ));
            }
        }

        ctx.save();
        ctx.globalAlpha = 0.7;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(x, y, radius + 8, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    function gameOver() {
        gameRunning = false;

        const timeAliveSeconds = Math.floor((Date.now() - startTime) / 1000);
        const minutes = Math.floor(timeAliveSeconds / 60);
        const seconds = timeAliveSeconds % 60;
        const timeString = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

        if (points > topScore) {
            topScore = points;
            localStorage.setItem('topScore', topScore);
        }

        updateStat('timeAlive', timeString);
        updateStat('circlesEatenStat', circlesEaten);
        updateStat('finalSize', Math.floor(player.radius));
        updateStat('finalPoints', points);
        updateStat('topScoreStat', topScore);

        showScreen('gameOver');

        const loader = document.getElementById('gameOverLoader');
        const loadingText = document.getElementById('gameOverLoadingText');
        const content = document.getElementById('gameOverContent');

        loader.style.display = content.style.display = loadingText.style.display = 'block';
        content.style.display = 'none';

        setTimeout(() => {
            loader.style.display = loadingText.style.display = 'none';
            content.style.display = 'block';
        }, 1000);
    }

    // Praćenje pozicije miša
    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        mouse.x = e.clientX - rect.left;
        mouse.y = e.clientY - rect.top;
    });

    // Počni igru
    startBtn.addEventListener('click', () => {
        const loadingOverlay = document.getElementById('gameLoadingOverlay');
        loadingOverlay.classList.add('active');

        setTimeout(() => {
            showScreen('game');
            loadingOverlay.classList.remove('active');
            startGame();
        }, 1000);
    });

    // Restartuj igru
    restartBtn.addEventListener('click', () => {
        showScreen('game');
        startGame();
    });

    function startGame() {
        gameRunning = true;
        initGame();
        requestAnimationFrame(gameLoop);
    }
});
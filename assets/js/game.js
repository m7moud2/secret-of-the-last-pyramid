/**
 * Secret of the Last Pyramid — Pharaoh Zuma Edition
 * 60FPS Egyptian Marble Shooter Engine
 */

const EGYPT_COLORS = [
    { name: 'red', label: 'ياقوت رع', hex: '#ef4444', glow: '#f87171', border: '#b91c1c' },
    { name: 'blue', label: 'لازورد إيزيس', hex: '#3b82f6', glow: '#60a5fa', border: '#1d4ed8' },
    { name: 'green', label: 'زمرد حورس', hex: '#10b981', glow: '#34d399', border: '#047857' },
    { name: 'yellow', label: 'ذهب الفراعنة', hex: '#f59e0b', glow: '#fbbf24', border: '#b45309' },
    { name: 'purple', label: 'جمشت أنوبيس', hex: '#8b5cf6', glow: '#a78bfa', border: '#6d28d9' }
];

const MARBLE_RADIUS = 16;
const MARBLE_DIAMETER = MARBLE_RADIUS * 2;
const BASE_SHOOT_SPEED = 22;

class PharaohZumaGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.width = 900;
        this.height = 600;

        // Player & State
        this.score = 0;
        this.coins = parseInt(localStorage.getItem('pyramid_coins') || '500');
        this.sunStones = parseInt(localStorage.getItem('pyramid_stones') || '10');
        this.currentLevel = 1;
        this.unlockedLevel = parseInt(localStorage.getItem('pyramid_unlocked_lvl') || '1');
        this.gameState = 'menu'; // 'menu', 'playing', 'paused', 'gameover', 'victory'

        // Scarab Cannon
        this.cannon = {
            x: 450,
            y: 310,
            angle: 0,
            currentMarble: null,
            nextMarble: null,
            radius: 38,
            level: parseInt(localStorage.getItem('scarab_level') || '1'),
            powerMultiplier: 1.0
        };

        // Projectile in air
        this.activeShot = null;

        // Track & Chain
        this.trackPoints = [];
        this.chain = [];
        this.particles = [];
        this.floatingTexts = [];
        this.bonusCoins = [];
        this.bonusSpawnTimer = 0;

        // Modifiers & Timers
        this.isFrozen = false;
        this.freezeTimer = 0;
        this.isReversing = false;
        this.reverseTimer = 0;
        this.comboCount = 0;
        this.levelMarblesTotal = 36;
        this.marblesSpawned = 0;
        this.spawnTimer = 0;
        this.dangerLevel = 0;
        this.shakeTimer = 0;
        this.shakeIntensity = 0;

        this.mousePos = { x: 450, y: 150 };

        this.init();
    }

    init() {
        this.setupControls();
        this.generateTrack(1);
        this.prepareCannon();
        this.updateHUD();

        this.lastTime = performance.now();
        requestAnimationFrame((t) => this.loop(t));
    }

    setupControls() {
        const updateAim = (clientX, clientY) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mousePos.x = (clientX - rect.left) * (this.width / rect.width);
            this.mousePos.y = (clientY - rect.top) * (this.height / rect.height);

            const dx = this.mousePos.x - this.cannon.x;
            const dy = this.mousePos.y - this.cannon.y;
            this.cannon.angle = Math.atan2(dy, dx);
        };

        this.canvas.addEventListener('mousemove', (e) => updateAim(e.clientX, e.clientY));
        this.canvas.addEventListener('mousedown', (e) => {
            if (this.gameState !== 'playing') return;
            if (e.button === 0) {
                this.shoot();
            } else if (e.button === 2) {
                this.swapMarbles();
            }
        });
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

        // Touch support for Mobile
        this.canvas.addEventListener('touchstart', (e) => {
            if (this.gameState !== 'playing') return;
            e.preventDefault();
            const touch = e.touches[0];
            updateAim(touch.clientX, touch.clientY);
            this.shoot();
        }, { passive: false });

        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            updateAim(touch.clientX, touch.clientY);
        }, { passive: false });

        // Keyboard Controls
        window.addEventListener('keydown', (e) => {
            if (this.gameState !== 'playing') return;
            if (e.key === ' ' || e.key === 'Control') {
                this.swapMarbles();
            }
            if (e.key === '1') this.useBooster('bomb');
            if (e.key === '2') this.useBooster('freeze');
            if (e.key === '3') this.useBooster('reverse');
        });
    }

    // Generate Ancient Egyptian Winding Tracks
    generateTrack(level) {
        const pts = [];
        const mode = ((level - 1) % 3) + 1;

        if (mode === 1) {
            // Winding S-Track across Pyramids
            for (let t = 0; t <= 1; t += 0.003) {
                const x = 70 + (t * 760);
                const y = 300 + Math.sin(t * Math.PI * 3.6) * 195;
                pts.push({ x, y });
            }
        } else if (mode === 2) {
            // Egyptian Infinity Loop (حلقة اللانهاية المقدسة)
            for (let t = 0; t <= Math.PI * 2; t += 0.012) {
                const scale = 350;
                const denom = 1 + Math.sin(t) * Math.sin(t);
                const x = 450 + (scale * Math.cos(t)) / denom;
                const y = 300 + (scale * Math.sin(t) * Math.cos(t)) / denom;
                pts.push({ x, y });
            }
        } else {
            // Spiral Maze of Anubis (متاهة أنوبيس الحلزونية)
            for (let t = 0; t <= 1; t += 0.003) {
                const angle = t * Math.PI * 2.8;
                const r = 320 - (t * 140);
                pts.push({
                    x: 450 + Math.cos(angle) * r,
                    y: 300 + Math.sin(angle) * (r * 0.8)
                });
            }
        }

        // Resample track uniformly at 2.5px steps
        this.trackPoints = [pts[0]];
        let accDist = 0;
        for (let i = 1; i < pts.length; i++) {
            const dx = pts[i].x - pts[i - 1].x;
            const dy = pts[i].y - pts[i - 1].y;
            const dist = Math.hypot(dx, dy);
            accDist += dist;
            if (accDist >= 2.5) {
                this.trackPoints.push(pts[i]);
                accDist = 0;
            }
        }

        this.cavePoint = this.trackPoints[this.trackPoints.length - 1];
    }

    startLevel(level) {
        this.currentLevel = level;
        this.generateTrack(level);
        this.chain = [];
        this.bonusCoins = [];
        this.activeShot = null;
        this.marblesSpawned = 0;
        this.levelMarblesTotal = 30 + (level * 8);
        this.isFrozen = false;
        this.isReversing = false;
        this.comboCount = 0;
        this.dangerLevel = 0;
        this.gameState = 'playing';

        this.prepareCannon();
        this.updateHUD();

        document.querySelectorAll('.game-overlay').forEach(el => el.classList.add('hidden'));
        document.getElementById('hud-panel').classList.remove('hidden');

        if (window.soundEngine) window.soundEngine.playMatch(1);
    }

    getRandomColor() {
        if (this.chain.length > 5 && Math.random() < 0.75) {
            const activeColors = [...new Set(this.chain.map(m => m.color.name))];
            const choice = activeColors[Math.floor(Math.random() * activeColors.length)];
            const match = EGYPT_COLORS.find(c => c.name === choice);
            if (match) return match;
        }
        return EGYPT_COLORS[Math.floor(Math.random() * EGYPT_COLORS.length)];
    }

    createMarble(dist = 0, color = null, power = 'normal') {
        const assignedColor = color || this.getRandomColor();
        let pType = power;
        if (power === 'normal' && Math.random() < 0.08) {
            const types = ['bomb', 'reverse', 'freeze', 'lightning'];
            pType = types[Math.floor(Math.random() * types.length)];
        }

        return {
            dist: dist,
            color: assignedColor,
            power: pType,
            radius: MARBLE_RADIUS
        };
    }

    prepareCannon() {
        if (!this.cannon.currentMarble) {
            this.cannon.currentMarble = this.createMarble(0, this.getRandomColor(), 'normal');
        }
        this.cannon.nextMarble = this.createMarble(0, this.getRandomColor(), 'normal');
    }

    swapMarbles() {
        if (this.activeShot) return;
        const temp = this.cannon.currentMarble;
        this.cannon.currentMarble = this.cannon.nextMarble;
        this.cannon.nextMarble = temp;
        if (window.soundEngine) window.soundEngine.playSwap();
    }

    shoot() {
        if (this.activeShot || !this.cannon.currentMarble) return;

        const spd = BASE_SHOOT_SPEED + (this.cannon.level * 0.8);
        const vx = Math.cos(this.cannon.angle) * spd;
        const vy = Math.sin(this.cannon.angle) * spd;

        this.activeShot = {
            x: this.cannon.x + Math.cos(this.cannon.angle) * 36,
            y: this.cannon.y + Math.sin(this.cannon.angle) * 36,
            vx: vx,
            vy: vy,
            marble: this.cannon.currentMarble
        };

        this.cannon.currentMarble = this.cannon.nextMarble;
        this.cannon.nextMarble = this.createMarble(0, this.getRandomColor(), 'normal');

        if (window.soundEngine) window.soundEngine.playShoot();
    }

    // Boosters System
    useBooster(type) {
        if (this.gameState !== 'playing') return;

        if (type === 'bomb') {
            if (this.coins < 50) return;
            this.coins -= 50;
            this.triggerExplosion(this.mousePos.x, this.mousePos.y, 90);
            this.saveStorage();
            this.updateHUD();
        } else if (type === 'freeze') {
            if (this.coins < 40) return;
            this.coins -= 40;
            this.isFrozen = true;
            this.freezeTimer = 5.0; // 5 sec freeze
            if (window.soundEngine) window.soundEngine.playFreeze();
            this.saveStorage();
            this.updateHUD();
        } else if (type === 'reverse') {
            if (this.coins < 30) return;
            this.coins -= 30;
            this.isReversing = true;
            this.reverseTimer = 3.5;
            if (window.soundEngine) window.soundEngine.playRewind();
            this.saveStorage();
            this.updateHUD();
        }
    }

    triggerExplosion(x, y, radius = 80) {
        if (window.soundEngine) window.soundEngine.playBomb();
        this.shake(0.3, 10);

        // Particle blast
        for (let i = 0; i < 35; i++) {
            const angle = Math.random() * Math.PI * 2;
            const spd = Math.random() * 8 + 2;
            this.particles.push({
                x, y,
                vx: Math.cos(angle) * spd,
                vy: Math.sin(angle) * spd,
                color: '#f59e0b',
                size: Math.random() * 6 + 2,
                life: 0.6,
                maxLife: 0.6
            });
        }

        // Destroy marbles within radius
        const toRemove = [];
        this.chain.forEach(m => {
            const pt = this.getTrackPoint(m.dist);
            if (pt && Math.hypot(pt.x - x, pt.y - y) <= radius) {
                toRemove.push(m);
            }
        });

        toRemove.forEach(m => {
            const idx = this.chain.indexOf(m);
            if (idx !== -1) this.chain.splice(idx, 1);
        });

        if (toRemove.length > 0) {
            this.score += toRemove.length * 100;
            this.coins += toRemove.length * 5;
            this.spawnFloatingText(x, y - 20, `+${toRemove.length * 100} قنبلة!`, '#f59e0b');
        }
    }

    getTrackPoint(dist) {
        const idx = Math.floor(dist / 2.5);
        if (idx < 0) return this.trackPoints[0];
        if (idx >= this.trackPoints.length) return this.trackPoints[this.trackPoints.length - 1];
        return this.trackPoints[idx];
    }

    // Main Update Loop
    update(dt) {
        if (this.gameState !== 'playing') return;

        // Timers for Power-ups
        if (this.isFrozen) {
            this.freezeTimer -= dt;
            if (this.freezeTimer <= 0) this.isFrozen = false;
        }

        if (this.isReversing) {
            this.reverseTimer -= dt;
            if (this.reverseTimer <= 0) this.isReversing = false;
        }

        // Screen Shake
        if (this.shakeTimer > 0) {
            this.shakeTimer -= dt;
        }

        // Spawn Marbles onto track
        if (this.marblesSpawned < this.levelMarblesTotal) {
            this.spawnTimer += dt;
            if (this.spawnTimer >= 0.55) {
                this.spawnTimer = 0;
                if (this.chain.length === 0 || this.chain[this.chain.length - 1].dist > MARBLE_DIAMETER) {
                    this.chain.push(this.createMarble(0));
                    this.marblesSpawned++;
                }
            }
        }

        // Move Chain
        const baseSpeed = 48; // px per second
        let moveStep = 0;
        if (this.isFrozen) {
            moveStep = 0;
        } else if (this.isReversing) {
            moveStep = -baseSpeed * 2.2 * dt;
        } else {
            moveStep = baseSpeed * dt;
        }

        // Push front marbles forward
        if (this.chain.length > 0 && moveStep !== 0) {
            this.chain[0].dist += moveStep;
            for (let i = 1; i < this.chain.length; i++) {
                const prev = this.chain[i - 1];
                const curr = this.chain[i];
                if (moveStep > 0) {
                    if (curr.dist < prev.dist - MARBLE_DIAMETER) {
                        curr.dist += moveStep * 1.5;
                    } else {
                        curr.dist = prev.dist - MARBLE_DIAMETER;
                    }
                } else {
                    curr.dist += moveStep;
                }
            }
        }

        // Check Danger & Game Over
        const maxDist = (this.trackPoints.length - 1) * 2.5;
        if (this.chain.length > 0) {
            const headDist = this.chain[0].dist;
            this.dangerLevel = Math.max(0, Math.min(1, (headDist - maxDist * 0.7) / (maxDist * 0.3)));
            if (this.dangerLevel > 0.85 && Math.random() < 0.05) {
                if (window.soundEngine) window.soundEngine.playDanger();
            }

            if (headDist >= maxDist) {
                this.gameOver();
                return;
            }
        }

        // Check Victory (all spawned and chain cleared)
        if (this.marblesSpawned >= this.levelMarblesTotal && this.chain.length === 0) {
            this.victory();
            return;
        }

        // Update Active Shot
        if (this.activeShot) {
            this.activeShot.x += this.activeShot.vx;
            this.activeShot.y += this.activeShot.vy;

            // Check collision with Chain Marbles
            let hit = false;
            for (let i = 0; i < this.chain.length; i++) {
                const m = this.chain[i];
                const pt = this.getTrackPoint(m.dist);
                if (pt && Math.hypot(pt.x - this.activeShot.x, pt.y - this.activeShot.y) < MARBLE_DIAMETER) {
                    this.insertMarbleIntoChain(i, this.activeShot.marble);
                    hit = true;
                    break;
                }
            }

            // Check collision with Bonus Coins
            for (let i = this.bonusCoins.length - 1; i >= 0; i--) {
                const coin = this.bonusCoins[i];
                if (Math.hypot(coin.x - this.activeShot.x, coin.y - this.activeShot.y) < 30) {
                    this.coins += 50;
                    this.sunStones += 1;
                    if (window.soundEngine) window.soundEngine.playCoin();
                    this.spawnFloatingText(coin.x, coin.y, '+50 🪙 +1 ☀️', '#f59e0b');
                    this.bonusCoins.splice(i, 1);
                }
            }

            // Out of bounds
            if (this.activeShot.x < -50 || this.activeShot.x > this.width + 50 ||
                this.activeShot.y < -50 || this.activeShot.y > this.height + 50) {
                this.activeShot = null;
            }

            if (hit) {
                this.activeShot = null;
            }
        }

        // Bonus Coin Spawner
        this.bonusSpawnTimer += dt;
        if (this.bonusSpawnTimer >= 14 && this.bonusCoins.length < 2) {
            this.bonusSpawnTimer = 0;
            this.bonusCoins.push({
                x: 180 + Math.random() * 540,
                y: 120 + Math.random() * 360,
                life: 9.0
            });
        }
        for (let i = this.bonusCoins.length - 1; i >= 0; i--) {
            this.bonusCoins[i].life -= dt;
            if (this.bonusCoins[i].life <= 0) this.bonusCoins.splice(i, 1);
        }

        // Update Particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= dt;
            if (p.life <= 0) this.particles.splice(i, 1);
        }

        // Update Floating Texts
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const ft = this.floatingTexts[i];
            ft.y -= 30 * dt;
            ft.life -= dt;
            if (ft.life <= 0) this.floatingTexts.splice(i, 1);
        }
    }

    insertMarbleIntoChain(index, shotMarble) {
        if (window.soundEngine) window.soundEngine.playClack();

        // Calculate distance offset
        const targetDist = this.chain[index].dist;
        shotMarble.dist = targetDist - (MARBLE_DIAMETER * 0.5);
        this.chain.splice(index, 0, shotMarble);

        // Adjust subsequent marbles
        for (let i = index + 1; i < this.chain.length; i++) {
            this.chain[i].dist -= MARBLE_DIAMETER;
        }

        // Check for Matches of 3 or more
        this.checkMatches(index);
    }

    checkMatches(startIndex) {
        if (startIndex < 0 || startIndex >= this.chain.length) return;
        const colorName = this.chain[startIndex].color.name;

        let left = startIndex;
        while (left > 0 && this.chain[left - 1].color.name === colorName) {
            left--;
        }

        let right = startIndex;
        while (right < this.chain.length - 1 && this.chain[right + 1].color.name === colorName) {
            right++;
        }

        const matchCount = (right - left) + 1;

        if (matchCount >= 3) {
            this.comboCount++;
            if (window.soundEngine) window.soundEngine.playMatch(this.comboCount);

            // Check Special Marble Powers
            for (let i = left; i <= right; i++) {
                const m = this.chain[i];
                if (m.power === 'bomb') {
                    const pt = this.getTrackPoint(m.dist);
                    this.triggerExplosion(pt.x, pt.y, 110);
                } else if (m.power === 'freeze') {
                    this.isFrozen = true;
                    this.freezeTimer = 5.0;
                    if (window.soundEngine) window.soundEngine.playFreeze();
                } else if (m.power === 'reverse') {
                    this.isReversing = true;
                    this.reverseTimer = 3.5;
                    if (window.soundEngine) window.soundEngine.playRewind();
                }
            }

            // Burst particles
            const midPt = this.getTrackPoint(this.chain[Math.floor((left + right) / 2)].dist);
            for (let i = 0; i < matchCount * 6; i++) {
                const angle = Math.random() * Math.PI * 2;
                const spd = Math.random() * 6 + 1;
                this.particles.push({
                    x: midPt.x,
                    y: midPt.y,
                    vx: Math.cos(angle) * spd,
                    vy: Math.sin(angle) * spd,
                    color: this.chain[startIndex].color.hex,
                    size: Math.random() * 5 + 2,
                    life: 0.5,
                    maxLife: 0.5
                });
            }

            const points = matchCount * 100 * this.comboCount;
            this.score += points;
            this.coins += matchCount * 2;
            this.spawnFloatingText(midPt.x, midPt.y - 20, `+${points}${this.comboCount > 1 ? ` x${this.comboCount} COMBO!` : ''}`, '#fde047');

            // Remove matched marbles
            this.chain.splice(left, matchCount);

            // Check magnetic attraction if remaining chain has gap
            setTimeout(() => {
                if (left > 0 && left < this.chain.length) {
                    if (this.chain[left - 1].color.name === this.chain[left].color.name) {
                        this.checkMatches(left);
                    }
                }
            }, 250);
        } else {
            this.comboCount = 0;
        }

        this.updateHUD();
    }

    spawnFloatingText(x, y, text, color = '#ffffff') {
        this.floatingTexts.push({ x, y, text, color, life: 0.9 });
    }

    shake(duration, intensity) {
        this.shakeTimer = duration;
        this.shakeIntensity = intensity;
    }

    gameOver() {
        this.gameState = 'gameover';
        if (window.soundEngine) window.soundEngine.playGameOver();
        document.getElementById('gameover-score').innerText = this.score;
        document.getElementById('gameover-modal').classList.remove('hidden');
    }

    victory() {
        this.gameState = 'victory';
        if (window.soundEngine) window.soundEngine.playVictory();
        if (this.currentLevel >= this.unlockedLevel) {
            this.unlockedLevel = Math.min(15, this.currentLevel + 1);
            localStorage.setItem('pyramid_unlocked_lvl', this.unlockedLevel);
        }
        this.coins += 100;
        this.sunStones += 3;
        this.saveStorage();

        document.getElementById('victory-level').innerText = this.currentLevel;
        document.getElementById('victory-score').innerText = this.score;
        document.getElementById('victory-coins').innerText = '+100 🪙  +3 ☀️';
        document.getElementById('victory-modal').classList.remove('hidden');
    }

    saveStorage() {
        localStorage.setItem('pyramid_coins', this.coins);
        localStorage.setItem('pyramid_stones', this.sunStones);
        localStorage.setItem('scarab_level', this.cannon.level);
    }

    updateHUD() {
        document.getElementById('hud-score').innerText = this.score;
        document.getElementById('hud-coins').innerText = this.coins;
        document.getElementById('hud-stones').innerText = this.sunStones;
        document.getElementById('hud-level').innerText = `المرحلة ${this.currentLevel}`;

        // Progress bar
        const pct = Math.min(100, Math.round((this.marblesSpawned / this.levelMarblesTotal) * 100));
        document.getElementById('hud-progress-fill').style.width = `${pct}%`;
    }

    // Render Canvas
    render() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.width, this.height);

        ctx.save();
        if (this.shakeTimer > 0) {
            ctx.translate((Math.random() - 0.5) * this.shakeIntensity, (Math.random() - 0.5) * this.shakeIntensity);
        }

        // 1. Ancient Egyptian Sandstone Background
        this.drawBackground(ctx);

        // 2. Draw Hieroglyphic Marble Track
        this.drawTrack(ctx);

        // 3. Draw Tomb Cave (The Entrance / Mouth of Sphinx)
        this.drawCave(ctx);

        // 4. Draw Rolling Marble Chain
        this.chain.forEach(m => {
            const pt = this.getTrackPoint(m.dist);
            if (pt) {
                this.drawMarble(ctx, pt.x, pt.y, m.color, m.power);
            }
        });

        // 5. Draw Bonus Coins (Golden Scarabs)
        this.bonusCoins.forEach(c => {
            ctx.save();
            ctx.translate(c.x, c.y);
            ctx.fillStyle = '#f59e0b';
            ctx.beginPath();
            ctx.arc(0, 0, 18, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#fef08a';
            ctx.lineWidth = 3;
            ctx.stroke();
            ctx.fillStyle = '#0f172a';
            ctx.font = 'bold 16px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('☥', 0, 1);
            ctx.restore();
        });

        // 6. Draw Active Shot
        if (this.activeShot) {
            this.drawMarble(ctx, this.activeShot.x, this.activeShot.y, this.activeShot.marble.color, this.activeShot.marble.power);
        }

        // 7. Draw Golden Scarab Cannon (مدفع الجعران الذهبي)
        this.drawScarabCannon(ctx);

        // 8. Draw Particles & Floating Texts
        this.particles.forEach(p => {
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        });

        this.floatingTexts.forEach(ft => {
            ctx.fillStyle = ft.color;
            ctx.font = 'bold 18px Cairo';
            ctx.textAlign = 'center';
            ctx.fillText(ft.text, ft.x, ft.y);
        });

        ctx.restore();
    }

    drawBackground(ctx) {
        // Deep desert / pyramid twilight gradient
        const bgGrad = ctx.createRadialGradient(450, 300, 50, 450, 300, 500);
        bgGrad.addColorStop(0, '#1c1917');
        bgGrad.addColorStop(0.6, '#0f172a');
        bgGrad.addColorStop(1, '#020617');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, this.width, this.height);

        // Pyramid Silhouette Outline in background
        ctx.strokeStyle = 'rgba(212, 175, 55, 0.12)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(150, 480);
        ctx.lineTo(450, 120);
        ctx.lineTo(750, 480);
        ctx.stroke();

        // Hieroglyphic Watermarks
        ctx.fillStyle = 'rgba(212, 175, 55, 0.04)';
        ctx.font = '40px serif';
        ctx.fillText('𓃀 𓃁 𓃂 𓃃 𓃄 𓃅', 100, 80);
        ctx.fillText('𓆈 𓆉 𓆊 𓆋 𓆌 𓆍', 600, 540);
    }

    drawTrack(ctx) {
        if (this.trackPoints.length < 2) return;

        // Track Shadow / Trench
        ctx.strokeStyle = '#05070a';
        ctx.lineWidth = MARBLE_DIAMETER + 10;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(this.trackPoints[0].x, this.trackPoints[0].y);
        for (let i = 1; i < this.trackPoints.length; i++) {
            ctx.lineTo(this.trackPoints[i].x, this.trackPoints[i].y);
        }
        ctx.stroke();

        // Carved Sandstone Bed
        ctx.strokeStyle = '#292524';
        ctx.lineWidth = MARBLE_DIAMETER + 4;
        ctx.stroke();

        // Golden Hieroglyph Rails
        ctx.strokeStyle = 'rgba(212, 175, 55, 0.4)';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    drawCave(ctx) {
        if (!this.cavePoint) return;
        ctx.save();
        ctx.translate(this.cavePoint.x, this.cavePoint.y);

        // Golden Egyptian Sarcophagus / Tomb Mouth
        ctx.fillStyle = this.dangerLevel > 0.7 ? '#dc2626' : '#78350f';
        ctx.beginPath();
        ctx.arc(0, 0, 36, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 4;
        ctx.stroke();

        // Skull / Horus Eye Icon
        ctx.fillStyle = '#fef08a';
        ctx.font = 'bold 24px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('𓂀', 0, 0);

        ctx.restore();
    }

    drawMarble(ctx, x, y, color, power = 'normal') {
        ctx.save();
        ctx.translate(x, y);

        // Marble Sphere Gradient
        const grad = ctx.createRadialGradient(-5, -5, 2, 0, 0, MARBLE_RADIUS);
        grad.addColorStop(0, color.glow);
        grad.addColorStop(0.6, color.hex);
        grad.addColorStop(1, color.border);

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, MARBLE_RADIUS, 0, Math.PI * 2);
        ctx.fill();

        // Gloss Highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
        ctx.beginPath();
        ctx.arc(-5, -5, 5, 0, Math.PI * 2);
        ctx.fill();

        // Power-Up Symbol inside Marble
        if (power !== 'normal') {
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 12px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            let symbol = '';
            if (power === 'bomb') symbol = '💣';
            if (power === 'freeze') symbol = '❄️';
            if (power === 'reverse') symbol = '⏪';
            if (power === 'lightning') symbol = '⚡';
            ctx.fillText(symbol, 0, 0);
        }

        ctx.restore();
    }

    drawScarabCannon(ctx) {
        ctx.save();
        ctx.translate(this.cannon.x, this.cannon.y);
        ctx.rotate(this.cannon.angle);

        // Golden Winged Scarab Body
        ctx.fillStyle = '#d97706';
        ctx.beginPath();
        ctx.arc(0, 0, 34, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Wings
        ctx.fillStyle = '#b45309';
        ctx.beginPath();
        ctx.ellipse(-8, -26, 14, 22, -0.4, 0, Math.PI * 2);
        ctx.ellipse(-8, 26, 14, 22, 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#f59e0b';
        ctx.stroke();

        // Eye of Horus Engraving
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('☥', -10, 0);

        // Next Marble (Resting on Scarab's back)
        if (this.cannon.nextMarble) {
            this.drawMarble(ctx, -14, 0, this.cannon.nextMarble.color, this.cannon.nextMarble.power);
        }

        // Current Marble (Held in Claws to Shoot)
        if (this.cannon.currentMarble) {
            this.drawMarble(ctx, 32, 0, this.cannon.currentMarble.color, this.cannon.currentMarble.power);
        }

        ctx.restore();
    }

    loop(now) {
        const dt = Math.min((now - this.lastTime) / 1000, 0.1);
        this.lastTime = now;

        this.update(dt);
        this.render();

        requestAnimationFrame((t) => this.loop(t));
    }
}

window.PharaohZumaGame = PharaohZumaGame;

/**
 * Secret of the Last Pyramid — Core Game Engine
 * Action RPG in Ancient Egyptian Tombs
 */

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // World & Canvas Setup
        this.canvas.width = 1280;
        this.canvas.height = 720;
        this.worldWidth = 2400;
        this.worldHeight = 1800;

        // Camera
        this.camera = { x: 0, y: 0, targetX: 0, targetY: 0 };

        // Game State
        this.state = 'MENU'; // 'MENU', 'PLAYING', 'PAUSED', 'GAMEOVER', 'VICTORY'
        this.floor = 1;
        this.score = 0;
        this.coins = 500;
        this.sunStones = 5;
        this.wave = 1;
        this.maxWaves = 3;
        this.isBossFloor = false;

        // Player Data
        this.player = {
            x: 600,
            y: 600,
            vx: 0,
            vy: 0,
            speed: 4.8,
            angle: 0,
            radius: 24,
            hp: 100,
            maxHp: 100,
            energy: 100,
            maxEnergy: 100,
            isDodging: false,
            dodgeTimer: 0,
            dodgeCooldown: 0,
            isAttacking: false,
            attackTimer: 0,
            attackAngle: 0,
            attackCombo: 0,
            skillCooldown: 0,
            poisonedTimer: 0,
            torchFlicker: 0,
            equippedWeapon: 'sword'
        };

        // Weapons Registry
        this.weapons = {
            dagger: {
                id: 'dagger',
                name: 'خنجر الرمال',
                icon: '🗡️',
                type: 'نادر',
                level: 3,
                baseDmg: 35,
                attackSpeed: 1.5,
                range: 65,
                critRate: 0.25,
                rune: null
            },
            sword: {
                id: 'sword',
                name: 'سيف الفرعون',
                icon: '⚔️',
                type: 'ملحمي',
                level: 7,
                baseDmg: 65,
                attackSpeed: 1.1,
                range: 90,
                critRate: 0.15,
                rune: 'fire'
            },
            spear: {
                id: 'spear',
                name: 'رمح رع المقدس',
                icon: '🔱',
                type: 'نخبوي',
                level: 4,
                baseDmg: 85,
                attackSpeed: 0.9,
                range: 130,
                critRate: 0.18,
                rune: 'lightning'
            },
            bow: {
                id: 'bow',
                name: 'قوس أوزوريس',
                icon: '🏹',
                type: 'أسطوري',
                level: 1,
                baseDmg: 55,
                attackSpeed: 1.2,
                range: 400,
                critRate: 0.3,
                rune: null
            },
            anubis: {
                id: 'anubis',
                name: 'شفرة أنوبيس',
                icon: '⚡',
                type: 'مقدس',
                level: 1,
                baseDmg: 120,
                attackSpeed: 1.3,
                range: 110,
                critRate: 0.35,
                rune: 'dark'
            }
        };

        // Entities & Systems
        this.enemies = [];
        this.projectiles = [];
        this.particles = [];
        this.floatingTexts = [];
        this.chests = [];
        this.traps = [];
        this.pillars = [];
        this.braziers = [];
        this.portal = null;
        this.boss = null;

        // Input
        this.keys = {};
        this.mouse = { x: 0, y: 0, isDown: false, worldX: 0, worldY: 0 };
        this.joystick = { active: false, dx: 0, dy: 0 };

        // Timing
        this.lastTime = performance.now();

        this.initInput();
        this.initDungeon();
    }

    // Input handlers
    initInput() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
            if (e.key === ' ' || e.key === 'j' || e.key === 'J') {
                this.attack();
            }
            if (e.key === 'k' || e.key === 'K') {
                this.useSkill();
            }
            if (e.key === 'l' || e.key === 'L' || e.key === 'Shift') {
                this.dodge();
            }
            if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
                this.togglePause();
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });

        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            this.mouse.x = (e.clientX - rect.left) * scaleX;
            this.mouse.y = (e.clientY - rect.top) * scaleY;
            this.mouse.worldX = this.mouse.x + this.camera.x;
            this.mouse.worldY = this.mouse.y + this.camera.y;
        });

        this.canvas.addEventListener('mousedown', (e) => {
            if (this.state !== 'PLAYING') return;
            if (e.button === 0) {
                this.attack();
            } else if (e.button === 2) {
                this.useSkill();
            }
        });

        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

        // Mobile touch controls setup
        this.setupTouchControls();
    }

    setupTouchControls() {
        const joyZone = document.getElementById('virtual-joystick-zone');
        const joyStick = document.getElementById('joystick-stick');
        if (!joyZone) return;

        let touchId = null;
        let startX = 0, startY = 0;

        joyZone.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.changedTouches[0];
            touchId = touch.identifier;
            const rect = joyZone.getBoundingClientRect();
            startX = rect.left + rect.width / 2;
            startY = rect.top + rect.height / 2;
            this.joystick.active = true;
        }, { passive: false });

        const moveHandler = (e) => {
            if (!this.joystick.active) return;
            for (let i = 0; i < e.changedTouches.length; i++) {
                const touch = e.changedTouches[i];
                if (touch.identifier === touchId) {
                    const dx = touch.clientX - startX;
                    const dy = touch.clientY - startY;
                    const dist = Math.hypot(dx, dy);
                    const maxDist = 45;
                    const clampedDist = Math.min(dist, maxDist);
                    const angle = Math.atan2(dy, dx);

                    const stickX = Math.cos(angle) * clampedDist;
                    const stickY = Math.sin(angle) * clampedDist;
                    joyStick.style.transform = `translate(${stickX}px, ${stickY}px)`;

                    this.joystick.dx = (stickX / maxDist);
                    this.joystick.dy = (stickY / maxDist);
                }
            }
        };

        const endHandler = (e) => {
            for (let i = 0; i < e.changedTouches.length; i++) {
                if (e.changedTouches[i].identifier === touchId) {
                    this.joystick.active = false;
                    this.joystick.dx = 0;
                    this.joystick.dy = 0;
                    joyStick.style.transform = `translate(0px, 0px)`;
                    touchId = null;
                }
            }
        };

        window.addEventListener('touchmove', moveHandler, { passive: false });
        window.addEventListener('touchend', endHandler);
        window.addEventListener('touchcancel', endHandler);

        // Check if mobile device to show touch controls
        if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
            joyZone.style.display = 'flex';
            const actions = document.getElementById('mobile-actions');
            if (actions) actions.style.display = 'grid';
        }
    }

    // Dungeon & Level Generation
    initDungeon() {
        this.enemies = [];
        this.projectiles = [];
        this.particles = [];
        this.chests = [];
        this.traps = [];
        this.pillars = [];
        this.braziers = [];
        this.portal = null;
        this.boss = null;

        this.player.x = 400;
        this.player.y = 400;
        this.player.hp = this.player.maxHp;

        // Generate Pillars
        const cols = 5;
        const rows = 4;
        for (let r = 1; r < rows; r++) {
            for (let c = 1; c < cols; c++) {
                const px = c * 480;
                const py = r * 420;
                this.pillars.push({ x: px, y: py, radius: 42 });
                // Add braziers next to some pillars
                if ((r + c) % 2 === 0) {
                    this.braziers.push({ x: px + 65, y: py, flicker: Math.random() * Math.PI });
                }
            }
        }

        // Generate Traps (Floor spikes)
        for (let i = 0; i < 6; i++) {
            this.traps.push({
                x: 600 + (i % 3) * 500,
                y: 500 + Math.floor(i / 3) * 600,
                width: 70,
                height: 70,
                activeTimer: Math.random() * 3,
                isDangerous: false
            });
        }

        // Generate Chests
        this.chests.push({ x: 300, y: 1500, opened: false });
        this.chests.push({ x: 2100, y: 300, opened: false });
        this.chests.push({ x: 2100, y: 1500, opened: false });

        // Spawn Wave 1 Enemies
        this.spawnWave();
    }

    spawnWave() {
        if (this.floor % 3 === 0) {
            // Boss Floor!
            this.isBossFloor = true;
            this.spawnBoss();
            return;
        }

        this.isBossFloor = false;
        const enemyCount = 5 + this.wave * 3;
        for (let i = 0; i < enemyCount; i++) {
            const types = ['scorpion', 'cobra', 'mummy', 'shadow'];
            const chosenType = types[Math.floor(Math.random() * types.length)];
            const dist = 600 + Math.random() * 800;
            const angle = Math.random() * Math.PI * 2;
            const ex = Math.max(100, Math.min(this.worldWidth - 100, this.player.x + Math.cos(angle) * dist));
            const ey = Math.max(100, Math.min(this.worldHeight - 100, this.player.y + Math.sin(angle) * dist));

            this.createEnemy(chosenType, ex, ey);
        }
    }

    createEnemy(type, x, y) {
        let e = {
            type: type,
            x: x,
            y: y,
            vx: 0,
            vy: 0,
            angle: 0,
            hitCooldown: 0,
            attackTimer: 0
        };

        if (type === 'scorpion') {
            // عقرب الصحراء: سريع، يلدغ بالسم
            e.name = 'عقرب الصحراء';
            e.radius = 22;
            e.hp = 80;
            e.maxHp = 80;
            e.speed = 3.8;
            e.color = '#1e293b';
            e.accentColor = '#22c55e'; // أخضر سام
            e.dmg = 12;
            e.scoreVal = 50;
            e.coinsVal = 25;
        } else if (type === 'cobra') {
            // أفعى الكوبرا الملكية: تبصق السم عن بعد
            e.name = 'الكوبرا الملكية';
            e.radius = 20;
            e.hp = 95;
            e.maxHp = 95;
            e.speed = 2.4;
            e.color = '#ca8a04';
            e.accentColor = '#ef4444';
            e.dmg = 15;
            e.scoreVal = 70;
            e.coinsVal = 35;
        } else if (type === 'mummy') {
            // المومياء الحارسة: تنهض ثانية بعد الموت!
            e.name = 'المومياء الحارسة';
            e.radius = 28;
            e.hp = 160;
            e.maxHp = 160;
            e.speed = 1.9;
            e.color = '#e2e8f0';
            e.accentColor = '#d4af37';
            e.dmg = 24;
            e.canRevive = true;
            e.hasRevived = false;
            e.scoreVal = 120;
            e.coinsVal = 60;
        } else if (type === 'shadow') {
            // جندي الظل: يختفي ويهاجم فجأة
            e.name = 'جندي الظل';
            e.radius = 24;
            e.hp = 130;
            e.maxHp = 130;
            e.speed = 4.2;
            e.color = '#020617';
            e.accentColor = '#38bdf8';
            e.dmg = 28;
            e.opacity = 0.8;
            e.scoreVal = 150;
            e.coinsVal = 75;
        }

        this.enemies.push(e);
    }

    spawnBoss() {
        this.boss = {
            name: 'حارس المعبد الحجري (Stone Guardian)',
            type: 'boss',
            x: 1200,
            y: 900,
            radius: 65,
            hp: 1200,
            maxHp: 1200,
            speed: 2.1,
            slamCooldown: 4.0,
            throwCooldown: 3.0,
            angle: 0,
            hitCooldown: 0,
            color: '#78716c',
            accentColor: '#38bdf8'
        };
        this.enemies.push(this.boss);
        if (window.soundEngine) window.soundEngine.playBossSlam();
    }

    // Actions: Attack, Skill, Dodge
    attack() {
        if (this.state !== 'PLAYING' || this.player.isAttacking) return;
        const wp = this.weapons[this.player.equippedWeapon];
        this.player.isAttacking = true;
        this.player.attackTimer = 0.22 / (wp.attackSpeed || 1);
        this.player.attackAngle = this.player.angle;
        this.player.attackCombo = (this.player.attackCombo + 1) % 3;

        if (window.soundEngine) window.soundEngine.playSlash();

        // Calculate attack box
        const reach = wp.range;
        const currentDmg = this.getWeaponDamage(wp);

        if (wp.id === 'bow') {
            // Shoot 3 arrows!
            for (let off = -0.25; off <= 0.25; off += 0.25) {
                this.projectiles.push({
                    x: this.player.x,
                    y: this.player.y,
                    vx: Math.cos(this.player.angle + off) * 14,
                    vy: Math.sin(this.player.angle + off) * 14,
                    radius: 5,
                    dmg: currentDmg * 0.9,
                    isPlayer: true,
                    color: '#fce588',
                    life: 1.2
                });
            }
            return;
        }

        // Melee Arc Strike
        this.enemies.forEach(e => {
            const dx = e.x - this.player.x;
            const dy = e.y - this.player.y;
            const dist = Math.hypot(dx, dy);

            if (dist < reach + e.radius) {
                const angleToEnemy = Math.atan2(dy, dx);
                let diff = angleToEnemy - this.player.attackAngle;
                while (diff < -Math.PI) diff += Math.PI * 2;
                while (diff > Math.PI) diff -= Math.PI * 2;

                if (Math.abs(diff) < 1.1) { // 120 degree slash arc
                    const isCrit = Math.random() < wp.critRate;
                    const finalDmg = isCrit ? Math.round(currentDmg * 1.8) : currentDmg;
                    this.damageEnemy(e, finalDmg, isCrit);

                    // Rune effects
                    if (wp.rune === 'fire') {
                        this.createEmberParticles(e.x, e.y, 8, '#f97316');
                    } else if (wp.rune === 'lightning') {
                        this.createEmberParticles(e.x, e.y, 8, '#38bdf8');
                    }
                }
            }
        });

        // Break chests if nearby
        this.chests.forEach(ch => {
            if (!ch.opened) {
                const d = Math.hypot(ch.x - this.player.x, ch.y - this.player.y);
                if (d < reach + 40) {
                    this.openChest(ch);
                }
            }
        });
    }

    useSkill() {
        if (this.state !== 'PLAYING' || this.player.skillCooldown > 0 || this.player.energy < 30) return;
        this.player.energy -= 30;
        this.player.skillCooldown = 5.0; // 5 sec cooldown

        if (window.soundEngine) window.soundEngine.playMagicBeam();

        // Solar Beam of Ra (شعاع رع الذهبي)
        const beamAngle = this.player.angle;
        const beamLength = 650;
        const beamEndX = this.player.x + Math.cos(beamAngle) * beamLength;
        const beamEndY = this.player.y + Math.sin(beamAngle) * beamLength;

        // Visual beam effect
        for (let i = 0; i < 35; i++) {
            const prog = i / 35;
            this.particles.push({
                x: this.player.x + Math.cos(beamAngle) * (beamLength * prog),
                y: this.player.y + Math.sin(beamAngle) * (beamLength * prog),
                vx: (Math.random() - 0.5) * 3,
                vy: (Math.random() - 0.5) * 3,
                color: '#fde047',
                size: Math.random() * 8 + 4,
                life: 0.6,
                maxLife: 0.6
            });
        }

        // Damage all enemies in beam ray
        this.enemies.forEach(e => {
            const dx = e.x - this.player.x;
            const dy = e.y - this.player.y;
            const dist = Math.hypot(dx, dy);
            if (dist < beamLength) {
                const angleToEnemy = Math.atan2(dy, dx);
                let diff = angleToEnemy - beamAngle;
                while (diff < -Math.PI) diff += Math.PI * 2;
                while (diff > Math.PI) diff -= Math.PI * 2;

                if (Math.abs(diff) < 0.25) { // Very concentrated beam
                    this.damageEnemy(e, 180, true);
                }
            }
        });
    }

    dodge() {
        if (this.state !== 'PLAYING' || this.player.isDodging || this.player.dodgeCooldown > 0) return;
        this.player.isDodging = true;
        this.player.dodgeTimer = 0.25;
        this.player.dodgeCooldown = 1.0;

        if (window.soundEngine) window.soundEngine.playDodge();

        // Burst speed
        const moveAngle = Math.atan2(this.player.vy || Math.sin(this.player.angle), this.player.vx || Math.cos(this.player.angle));
        this.player.vx = Math.cos(moveAngle) * (this.player.speed * 2.8);
        this.player.vy = Math.sin(moveAngle) * (this.player.speed * 2.8);

        // Sand particles
        this.createEmberParticles(this.player.x, this.player.y, 10, '#d4af37');
    }

    damageEnemy(e, dmg, isCrit = false) {
        e.hp -= dmg;
        e.hitCooldown = 0.15;
        if (window.soundEngine) window.soundEngine.playHit();

        // Spawn damage pop
        this.spawnDamageText(e.x, e.y - 20, dmg, isCrit ? '#fde047' : '#ffffff', isCrit);

        // Knockback
        const kbAngle = Math.atan2(e.y - this.player.y, e.x - this.player.x);
        e.vx += Math.cos(kbAngle) * 5;
        e.vy += Math.sin(kbAngle) * 5;

        // Blood / sand splat
        this.createEmberParticles(e.x, e.y, 8, e.accentColor || '#ef4444');

        if (e.hp <= 0) {
            // Check Mummy Revive
            if (e.canRevive && !e.hasRevived) {
                e.hasRevived = true;
                e.hp = e.maxHp * 0.6;
                this.spawnDamageText(e.x, e.y - 40, 'نهوض المومياء!', '#d4af37', true);
                this.createEmberParticles(e.x, e.y, 16, '#fce588');
                return;
            }

            this.killEnemy(e);
        }
    }

    killEnemy(e) {
        const idx = this.enemies.indexOf(e);
        if (idx !== -1) {
            this.enemies.splice(idx, 1);
        }

        this.score += e.scoreVal || 100;
        this.coins += e.coinsVal || 30;

        if (window.soundEngine) window.soundEngine.playCoin();

        // Chance to drop Sun Stone ☀️
        if (Math.random() < 0.28 || e.type === 'boss') {
            const count = e.type === 'boss' ? 5 : 1;
            this.sunStones += count;
            if (window.soundEngine) window.soundEngine.playStonePickup();
            this.spawnDamageText(e.x, e.y - 50, `+${count} حجر شمس ☀️`, '#f59e0b', true);
        }

        // Death explosion particles
        this.createEmberParticles(e.x, e.y, 20, e.color);

        // Check if wave/floor cleared
        if (this.enemies.length === 0) {
            this.onWaveCleared();
        }
    }

    onWaveCleared() {
        if (this.wave < this.maxWaves) {
            this.wave++;
            this.spawnDamageText(this.player.x, this.player.y - 60, `الموجة ${this.wave}!`, '#38bdf8', true);
            setTimeout(() => this.spawnWave(), 1500);
        } else {
            // Spawn Portal to next floor!
            this.portal = {
                x: 1200,
                y: 900,
                radius: 40,
                angle: 0
            };
            if (window.soundEngine) window.soundEngine.playVictory();
            this.spawnDamageText(this.player.x, this.player.y - 80, 'بوابة حورس انفتحت!', '#fde047', true);
        }
    }

    openChest(ch) {
        ch.opened = true;
        this.coins += 150;
        this.sunStones += 2;
        if (window.soundEngine) window.soundEngine.playStonePickup();
        this.spawnDamageText(ch.x, ch.y - 30, '+150 🪙  +2 ☀️', '#f59e0b', true);
        this.createEmberParticles(ch.x, ch.y, 18, '#fbbf24');
    }

    damagePlayer(amount) {
        if (this.player.isDodging || this.state !== 'PLAYING') return;
        this.player.hp -= amount;
        if (window.soundEngine) window.soundEngine.playPlayerHurt();

        this.spawnDamageText(this.player.x, this.player.y - 30, `-${amount}`, '#ef4444', true);

        // Screen Shake
        this.camera.x += (Math.random() - 0.5) * 14;
        this.camera.y += (Math.random() - 0.5) * 14;

        if (this.player.hp <= 0) {
            this.player.hp = 0;
            this.gameOver();
        }
    }

    gameOver() {
        this.state = 'GAMEOVER';
        const modal = document.getElementById('game-over-modal');
        if (modal) modal.classList.add('modal-active');
    }

    victory() {
        this.state = 'VICTORY';
        if (window.soundEngine) window.soundEngine.playVictory();
        const modal = document.getElementById('victory-modal');
        if (modal) modal.classList.add('modal-active');
    }

    // Weapon Stat Helper
    getWeaponDamage(wp) {
        // Base dmg + (Level * 12%)
        const lvlMultiplier = 1 + (wp.level * 0.12);
        return Math.round(wp.baseDmg * lvlMultiplier);
    }

    // Upgrade Weapon
    upgradeWeapon(wpId) {
        const wp = this.weapons[wpId];
        if (!wp || wp.level >= 20) return { success: false, reason: 'السلاح في أقصى مستوى' };

        // Cost Formula
        const goldCost = 300 + wp.level * 180;
        const stonesCost = 1 + Math.floor(wp.level / 4);

        if (this.coins < goldCost) return { success: false, reason: 'لا يوجد ذهب كافٍ' };
        if (this.sunStones < stonesCost) return { success: false, reason: 'لا توجد أحجار شمس كافية' };

        this.coins -= goldCost;
        this.sunStones -= stonesCost;

        // Success rate based on Copilot design
        let chance = 1.0;
        if (wp.level >= 5 && wp.level < 10) chance = 0.80;
        else if (wp.level >= 10 && wp.level < 15) chance = 0.55;
        else if (wp.level >= 15) chance = 0.30;

        if (Math.random() <= chance) {
            wp.level++;
            if (window.soundEngine) window.soundEngine.playUpgradeSuccess();
            return { success: true, newLevel: wp.level, chance };
        } else {
            if (window.soundEngine) window.soundEngine.playUpgradeFail();
            return { success: false, reason: 'فشل التطوير!', failed: true, chance };
        }
    }

    // Particle & VFX Helpers
    createEmberParticles(x, y, count, color) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const spd = Math.random() * 5 + 1;
            this.particles.push({
                x, y,
                vx: Math.cos(angle) * spd,
                vy: Math.sin(angle) * spd,
                color,
                size: Math.random() * 5 + 2,
                life: Math.random() * 0.4 + 0.2,
                maxLife: 0.6
            });
        }
    }

    spawnDamageText(x, y, text, color, isBig = false) {
        this.floatingTexts.push({
            x, y,
            text,
            color,
            isBig,
            life: 0.8,
            maxLife: 0.8
        });
    }

    togglePause() {
        if (this.state === 'PLAYING') {
            this.state = 'PAUSED';
            document.getElementById('pause-modal')?.classList.add('modal-active');
        } else if (this.state === 'PAUSED') {
            this.state = 'PLAYING';
            document.getElementById('pause-modal')?.classList.remove('modal-active');
        }
    }

    // Update Loop
    update(dt) {
        if (this.state !== 'PLAYING') return;

        // Player Movement
        let mx = 0;
        let my = 0;

        if (this.keys['w'] || this.keys['arrowup']) my -= 1;
        if (this.keys['s'] || this.keys['arrowdown']) my += 1;
        if (this.keys['a'] || this.keys['arrowleft']) mx -= 1;
        if (this.keys['d'] || this.keys['arrowright']) mx += 1;

        // Joystick override
        if (this.joystick.active) {
            mx = this.joystick.dx;
            my = this.joystick.dy;
        }

        const len = Math.hypot(mx, my);
        if (len > 0) {
            const spd = this.player.isDodging ? this.player.speed * 2.2 : this.player.speed;
            this.player.vx = (mx / len) * spd;
            this.player.vy = (my / len) * spd;
            this.player.angle = Math.atan2(my, mx);
        } else if (!this.player.isDodging) {
            this.player.vx *= 0.7;
            this.player.vy *= 0.7;
        }

        // Aim towards mouse on desktop
        if (!this.joystick.active) {
            const dx = this.mouse.worldX - this.player.x;
            const dy = this.mouse.worldY - this.player.y;
            if (Math.hypot(dx, dy) > 20) {
                this.player.angle = Math.atan2(dy, dx);
            }
        }

        // Apply Player Pos
        this.player.x += this.player.vx;
        this.player.y += this.player.vy;

        // World Bounds
        this.player.x = Math.max(50, Math.min(this.worldWidth - 50, this.player.x));
        this.player.y = Math.max(50, Math.min(this.worldHeight - 50, this.player.y));

        // Pillar Collisions
        this.pillars.forEach(p => {
            const dx = this.player.x - p.x;
            const dy = this.player.y - p.y;
            const dist = Math.hypot(dx, dy);
            const minDist = p.radius + this.player.radius;
            if (dist < minDist) {
                const angle = Math.atan2(dy, dx);
                this.player.x = p.x + Math.cos(angle) * minDist;
                this.player.y = p.y + Math.sin(angle) * minDist;
            }
        });

        // Cooldowns & Timers
        if (this.player.attackTimer > 0) this.player.attackTimer -= dt;
        else this.player.isAttacking = false;

        if (this.player.dodgeTimer > 0) this.player.dodgeTimer -= dt;
        else this.player.isDodging = false;

        if (this.player.dodgeCooldown > 0) this.player.dodgeCooldown -= dt;
        if (this.player.skillCooldown > 0) this.player.skillCooldown -= dt;

        // Energy Regen
        if (this.player.energy < this.player.maxEnergy) {
            this.player.energy = Math.min(this.player.maxEnergy, this.player.energy + 15 * dt);
        }

        // Traps Update
        this.traps.forEach(tr => {
            tr.activeTimer += dt;
            if (tr.activeTimer >= 3.0) tr.activeTimer = 0;
            tr.isDangerous = tr.activeTimer > 1.8;

            if (tr.isDangerous) {
                const inX = this.player.x > tr.x && this.player.x < tr.x + tr.width;
                const inY = this.player.y > tr.y && this.player.y < tr.y + tr.height;
                if (inX && inY) {
                    this.damagePlayer(8);
                }
            }
        });

        // Portal Entry Check
        if (this.portal) {
            this.portal.angle += dt * 2;
            const pd = Math.hypot(this.portal.x - this.player.x, this.portal.y - this.player.y);
            if (pd < this.portal.radius + this.player.radius) {
                this.floor++;
                this.wave = 1;
                this.portal = null;
                this.initDungeon();
                this.spawnDamageText(this.player.x, this.player.y - 60, `الطابق ${this.floor}!`, '#fde047', true);
            }
        }

        // Update Enemies
        this.enemies.forEach(e => {
            if (e.hitCooldown > 0) e.hitCooldown -= dt;

            // AI Movement towards player
            const dx = this.player.x - e.x;
            const dy = this.player.y - e.y;
            const dist = Math.hypot(dx, dy);
            e.angle = Math.atan2(dy, dx);

            if (dist > e.radius + 15 && dist < 1200) {
                e.vx += Math.cos(e.angle) * (e.speed * 0.15);
                e.vy += Math.sin(e.angle) * (e.speed * 0.15);
            }

            // Cap enemy velocity
            const curSpd = Math.hypot(e.vx, e.vy);
            if (curSpd > e.speed) {
                e.vx = (e.vx / curSpd) * e.speed;
                e.vy = (e.vy / curSpd) * e.speed;
            }

            e.x += e.vx;
            e.y += e.vy;
            e.vx *= 0.9;
            e.vy *= 0.9;

            // Melee Hit against player
            if (dist < e.radius + this.player.radius) {
                e.attackTimer = (e.attackTimer || 0) + dt;
                if (e.attackTimer >= 1.0) {
                    e.attackTimer = 0;
                    this.damagePlayer(e.dmg);
                }
            }

            // Cobra Spitting Venom
            if (e.type === 'cobra') {
                e.attackTimer = (e.attackTimer || 0) + dt;
                if (e.attackTimer >= 2.5 && dist < 450) {
                    e.attackTimer = 0;
                    this.projectiles.push({
                        x: e.x,
                        y: e.y,
                        vx: Math.cos(e.angle) * 7,
                        vy: Math.sin(e.angle) * 7,
                        radius: 6,
                        dmg: e.dmg,
                        isPlayer: false,
                        color: '#22c55e',
                        life: 2.0
                    });
                }
            }

            // Boss Attacks
            if (e.type === 'boss') {
                e.slamCooldown -= dt;
                if (e.slamCooldown <= 0) {
                    e.slamCooldown = 4.5;
                    if (window.soundEngine) window.soundEngine.playBossSlam();
                    // Shockwave circle
                    for (let a = 0; a < Math.PI * 2; a += 0.35) {
                        this.projectiles.push({
                            x: e.x,
                            y: e.y,
                            vx: Math.cos(a) * 6,
                            vy: Math.sin(a) * 6,
                            radius: 12,
                            dmg: 25,
                            isPlayer: false,
                            color: '#eab308',
                            life: 2.5
                        });
                    }
                }
            }
        });

        // Update Projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= dt;

            // Check collision
            if (p.isPlayer) {
                this.enemies.forEach(e => {
                    if (Math.hypot(e.x - p.x, e.y - p.y) < e.radius + p.radius) {
                        this.damageEnemy(e, p.dmg);
                        p.life = 0;
                    }
                });
            } else {
                if (Math.hypot(this.player.x - p.x, this.player.y - p.y) < this.player.radius + p.radius) {
                    this.damagePlayer(p.dmg);
                    p.life = 0;
                }
            }

            if (p.life <= 0) {
                this.projectiles.splice(i, 1);
            }
        }

        // Update Particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const pt = this.particles[i];
            pt.x += pt.vx;
            pt.y += pt.vy;
            pt.life -= dt;
            if (pt.life <= 0) this.particles.splice(i, 1);
        }

        // Update Floating Text
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const ft = this.floatingTexts[i];
            ft.y -= 35 * dt;
            ft.life -= dt;
            if (ft.life <= 0) this.floatingTexts.splice(i, 1);
        }

        // Smooth Camera Follow
        this.camera.targetX = this.player.x - this.canvas.width / 2;
        this.camera.targetY = this.player.y - this.canvas.height / 2;
        this.camera.targetX = Math.max(0, Math.min(this.worldWidth - this.canvas.width, this.camera.targetX));
        this.camera.targetY = Math.max(0, Math.min(this.worldHeight - this.canvas.height, this.camera.targetY));

        this.camera.x += (this.camera.targetX - this.camera.x) * 0.1;
        this.camera.y += (this.camera.targetY - this.camera.y) * 0.1;

        // Update Torch Flicker
        this.player.torchFlicker += dt * 5;
    }

    // Render Canvas
    render() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        ctx.save();
        ctx.translate(-this.camera.x, -this.camera.y);

        // 1. Draw Sandstone Floor Tiles with Hieroglyphic Grid
        this.drawFloor(ctx);

        // 2. Draw Traps
        this.traps.forEach(tr => {
            ctx.fillStyle = tr.isDangerous ? '#7f1d1d' : '#292524';
            ctx.fillRect(tr.x, tr.y, tr.width, tr.height);
            ctx.strokeStyle = '#d4af37';
            ctx.lineWidth = 2;
            ctx.strokeRect(tr.x, tr.y, tr.width, tr.height);

            if (tr.isDangerous) {
                // Spikes
                ctx.fillStyle = '#f87171';
                for (let sx = tr.x + 10; sx < tr.x + tr.width; sx += 20) {
                    for (let sy = tr.y + 10; sy < tr.y + tr.height; sy += 20) {
                        ctx.beginPath();
                        ctx.arc(sx, sy, 4, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
            }
        });

        // 3. Draw Chests
        this.chests.forEach(ch => {
            ctx.save();
            ctx.translate(ch.x, ch.y);
            ctx.fillStyle = ch.opened ? '#44403c' : '#b45309';
            ctx.fillRect(-22, -16, 44, 32);
            ctx.strokeStyle = '#fce588';
            ctx.lineWidth = 3;
            ctx.strokeRect(-22, -16, 44, 32);
            // Lock
            ctx.fillStyle = '#fde047';
            ctx.beginPath();
            ctx.arc(0, 0, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });

        // 4. Draw Portal if open
        if (this.portal) {
            ctx.save();
            ctx.translate(this.portal.x, this.portal.y);
            ctx.rotate(this.portal.angle);
            const grad = ctx.createRadialGradient(0, 0, 10, 0, 0, this.portal.radius);
            grad.addColorStop(0, '#fef08a');
            grad.addColorStop(0.5, '#d97706');
            grad.addColorStop(1, 'rgba(15, 76, 129, 0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(0, 0, this.portal.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#fde047';
            ctx.lineWidth = 4;
            ctx.stroke();
            ctx.restore();
        }

        // 5. Draw Enemies
        this.enemies.forEach(e => {
            ctx.save();
            ctx.translate(e.x, e.y);
            ctx.rotate(e.angle);

            // Enemy Body
            ctx.fillStyle = e.hitCooldown > 0 ? '#ffffff' : e.color;
            ctx.beginPath();
            ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
            ctx.fill();

            // Accent details / Eyes
            ctx.fillStyle = e.accentColor || '#ef4444';
            ctx.beginPath();
            ctx.arc(e.radius * 0.6, -e.radius * 0.35, 4, 0, Math.PI * 2);
            ctx.arc(e.radius * 0.6, e.radius * 0.35, 4, 0, Math.PI * 2);
            ctx.fill();

            // Distinctive Enemy Shapes
            if (e.type === 'scorpion') {
                // Pincers
                ctx.strokeStyle = e.color;
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.moveTo(e.radius * 0.6, -14);
                ctx.lineTo(e.radius + 12, -20);
                ctx.moveTo(e.radius * 0.6, 14);
                ctx.lineTo(e.radius + 12, 20);
                ctx.stroke();
            } else if (e.type === 'mummy') {
                // Gold collar band
                ctx.strokeStyle = '#d4af37';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(0, 0, e.radius * 0.7, -Math.PI / 2, Math.PI / 2);
                ctx.stroke();
            }

            ctx.restore();

            // Health bar above enemy
            if (e.hp < e.maxHp) {
                const bw = e.radius * 2;
                const bh = 5;
                ctx.fillStyle = 'rgba(0,0,0,0.6)';
                ctx.fillRect(e.x - bw / 2, e.y - e.radius - 12, bw, bh);
                ctx.fillStyle = '#ef4444';
                ctx.fillRect(e.x - bw / 2, e.y - e.radius - 12, bw * (e.hp / e.maxHp), bh);
            }
        });

        // 6. Draw Player (آدم المستكشف)
        ctx.save();
        ctx.translate(this.player.x, this.player.y);
        ctx.rotate(this.player.angle);

        // Body
        ctx.fillStyle = this.player.isDodging ? 'rgba(212, 175, 55, 0.4)' : '#1e293b';
        ctx.beginPath();
        ctx.arc(0, 0, this.player.radius, 0, Math.PI * 2);
        ctx.fill();

        // Explorer Hat / Head
        ctx.fillStyle = '#d97706';
        ctx.beginPath();
        ctx.arc(-2, 0, this.player.radius * 0.6, 0, Math.PI * 2);
        ctx.fill();

        // Weapon in hand
        const wp = this.weapons[this.player.equippedWeapon];
        ctx.fillStyle = '#fce588';
        ctx.strokeStyle = '#d4af37';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(12, 16);
        ctx.lineTo(wp.range * 0.6, 16);
        ctx.stroke();

        // Attack Slash Effect
        if (this.player.isAttacking) {
            ctx.fillStyle = 'rgba(253, 224, 71, 0.4)';
            ctx.strokeStyle = '#fde047';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(0, 0, wp.range, -0.6, 0.6);
            ctx.stroke();
        }

        ctx.restore();

        // 7. Draw Pillars & Braziers
        this.pillars.forEach(p => {
            ctx.save();
            ctx.translate(p.x, p.y);
            // Pillar Base
            ctx.fillStyle = '#44403c';
            ctx.beginPath();
            ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
            ctx.fill();
            // Golden Egyptian Rim
            ctx.strokeStyle = '#d4af37';
            ctx.lineWidth = 4;
            ctx.stroke();
            // Hieroglyphic Core
            ctx.fillStyle = '#78716c';
            ctx.beginPath();
            ctx.arc(0, 0, p.radius * 0.6, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });

        // Braziers with Fire
        this.braziers.forEach(b => {
            b.flicker += 0.15;
            const fSize = Math.sin(b.flicker) * 3 + 12;
            ctx.fillStyle = '#b45309';
            ctx.fillRect(b.x - 10, b.y - 10, 20, 20);
            // Flame
            ctx.fillStyle = '#f97316';
            ctx.beginPath();
            ctx.arc(b.x, b.y, fSize, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fef08a';
            ctx.beginPath();
            ctx.arc(b.x, b.y, fSize * 0.5, 0, Math.PI * 2);
            ctx.fill();
        });

        // 8. Draw Projectiles
        this.projectiles.forEach(p => {
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 8;
            ctx.shadowColor = p.color;
        });
        ctx.shadowBlur = 0;

        // 9. Draw Particles
        this.particles.forEach(pt => {
            ctx.fillStyle = pt.color;
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, pt.size || 3, 0, Math.PI * 2);
            ctx.fill();
        });

        // 10. Draw Floating Texts
        this.floatingTexts.forEach(ft => {
            ctx.fillStyle = ft.color;
            ctx.font = ft.isBig ? 'bold 20px Cairo' : 'bold 15px Cairo';
            ctx.textAlign = 'center';
            ctx.fillText(ft.text, ft.x, ft.y);
        });

        // 11. Dynamic Darkness & Torchlight Vignette
        this.drawLighting(ctx);

        ctx.restore();
    }

    drawFloor(ctx) {
        const tileSize = 120;
        const startX = Math.floor(this.camera.x / tileSize) * tileSize;
        const startY = Math.floor(this.camera.y / tileSize) * tileSize;
        const endX = startX + this.canvas.width + tileSize * 2;
        const endY = startY + this.canvas.height + tileSize * 2;

        for (let x = startX; x < endX; x += tileSize) {
            for (let y = startY; y < endY; y += tileSize) {
                // Stone tile color alternate
                const alt = (Math.floor(x / tileSize) + Math.floor(y / tileSize)) % 2 === 0;
                ctx.fillStyle = alt ? '#1c1917' : '#171412';
                ctx.fillRect(x, y, tileSize, tileSize);

                // Hieroglyphic grid seams
                ctx.strokeStyle = 'rgba(212, 175, 55, 0.08)';
                ctx.lineWidth = 1;
                ctx.strokeRect(x, y, tileSize, tileSize);

                // Hieroglyphic Ankh watermark on select tiles
                if ((Math.floor(x / tileSize) * 7 + Math.floor(y / tileSize) * 3) % 9 === 0) {
                    ctx.fillStyle = 'rgba(212, 175, 55, 0.05)';
                    ctx.font = '28px serif';
                    ctx.fillText('☥', x + 45, y + 65);
                }
            }
        }
    }

    drawLighting(ctx) {
        // Darkness mask
        const lightGrad = ctx.createRadialGradient(
            this.player.x, this.player.y, 40,
            this.player.x, this.player.y, 460 + Math.sin(this.player.torchFlicker) * 15
        );
        lightGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
        lightGrad.addColorStop(0.7, 'rgba(11, 15, 23, 0.65)');
        lightGrad.addColorStop(1, 'rgba(5, 7, 12, 0.95)');

        ctx.fillStyle = lightGrad;
        ctx.fillRect(this.camera.x, this.camera.y, this.canvas.width, this.canvas.height);
    }

    // Game Main Loop
    run() {
        const loop = (now) => {
            const dt = Math.min((now - this.lastTime) / 1000, 0.1);
            this.lastTime = now;

            this.update(dt);
            this.render();

            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    }
}

window.Game = Game;


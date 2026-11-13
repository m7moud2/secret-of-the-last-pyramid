/**
 * Secret of the Last Pyramid — UI Controller
 * Integrates HUD, Modals, Upgrade Center & Inventory
 */

document.addEventListener('DOMContentLoaded', () => {
    // Instantiate Game
    const game = new Game();
    window.game = game;

    // Start Game Button
    const startBtn = document.getElementById('start-game-btn');
    const startModal = document.getElementById('start-modal');
    if (startBtn) {
        startBtn.addEventListener('click', () => {
            startModal.classList.remove('modal-active');
            game.state = 'PLAYING';
            if (window.soundEngine) window.soundEngine.playUpgradeSuccess();
        });
    }

    // Mobile Action Buttons
    const btnAttack = document.getElementById('btn-attack');
    const btnSkill = document.getElementById('btn-skill');
    const btnDodge = document.getElementById('btn-dodge');
    const btnPotion = document.getElementById('btn-potion');

    if (btnAttack) btnAttack.addEventListener('touchstart', (e) => { e.preventDefault(); game.attack(); });
    if (btnSkill) btnSkill.addEventListener('touchstart', (e) => { e.preventDefault(); game.useSkill(); });
    if (btnDodge) btnDodge.addEventListener('touchstart', (e) => { e.preventDefault(); game.dodge(); });
    if (btnPotion) btnPotion.addEventListener('touchstart', (e) => { e.preventDefault(); usePotion(); });

    // Inventory & Upgrade Modals
    window.openUpgradeModal = (wpId) => {
        const modal = document.getElementById('upgrade-modal');
        if (!modal) return;
        selectedUpgradeWeapon = wpId || game.player.equippedWeapon;
        renderUpgradeModal();
        modal.classList.add('modal-active');
    };

    window.closeUpgradeModal = () => {
        document.getElementById('upgrade-modal')?.classList.remove('modal-active');
    };

    window.openInventoryModal = () => {
        renderInventoryList();
        document.getElementById('inventory-modal')?.classList.add('modal-active');
    };

    window.closeInventoryModal = () => {
        document.getElementById('inventory-modal')?.classList.remove('modal-active');
    };

    window.openShopModal = () => {
        document.getElementById('shop-modal')?.classList.add('modal-active');
    };

    window.closeShopModal = () => {
        document.getElementById('shop-modal')?.classList.remove('modal-active');
    };

    window.restartGame = () => {
        document.querySelectorAll('.modal').forEach(m => m.classList.remove('modal-active'));
        game.player.hp = game.player.maxHp;
        game.floor = 1;
        game.wave = 1;
        game.score = 0;
        game.initDungeon();
        game.state = 'PLAYING';
    };

    function usePotion() {
        if (game.coins >= 50 && game.player.hp < game.player.maxHp) {
            game.coins -= 50;
            game.player.hp = Math.min(game.player.maxHp, game.player.hp + 40);
            game.spawnDamageText(game.player.x, game.player.y - 30, '+40 ❤️', '#4ade80', true);
            if (window.soundEngine) window.soundEngine.playStonePickup();
        }
    }

    // Upgrade Logic
    let selectedUpgradeWeapon = 'sword';

    function renderUpgradeModal() {
        const wp = game.weapons[selectedUpgradeWeapon];
        if (!wp) return;

        const currentDmg = game.getWeaponDamage(wp);
        const nextDmg = Math.round(wp.baseDmg * (1 + (wp.level + 1) * 0.12));
        const currentCrit = Math.round(wp.critRate * 100);
        const nextCrit = Math.min(60, currentCrit + 2);

        const goldCost = 300 + wp.level * 180;
        const stonesCost = 1 + Math.floor(wp.level / 4);

        // Success probability
        let successRate = 100;
        if (wp.level >= 5 && wp.level < 10) successRate = 80;
        else if (wp.level >= 10 && wp.level < 15) successRate = 55;
        else if (wp.level >= 15) successRate = 30;

        document.getElementById('upg-name').innerText = wp.name;
        document.getElementById('upg-icon').innerText = wp.icon;
        document.getElementById('upg-level').innerText = `المستوى +${wp.level}`;
        document.getElementById('upg-type').innerText = wp.type;
        document.getElementById('upg-power').innerText = `${currentDmg} → ${nextDmg}`;
        document.getElementById('upg-crit').innerText = `${currentCrit}% → ${nextCrit}%`;
        document.getElementById('upg-success-rate').innerText = `${successRate}% ✅`;
        document.getElementById('upg-fail-rate').innerText = `${100 - successRate}% ❌`;

        document.getElementById('upg-gold-cost').innerText = `${goldCost} ذهب`;
        document.getElementById('upg-stone-cost').innerText = `${stonesCost} حجر شمس ☀️`;

        // Update modal header balances
        document.getElementById('upg-coins-balance').innerText = game.coins;
        document.getElementById('upg-stones-balance').innerText = game.sunStones;
    }

    const doUpgradeBtn = document.getElementById('do-upgrade-btn');
    if (doUpgradeBtn) {
        doUpgradeBtn.addEventListener('click', () => {
            const res = game.upgradeWeapon(selectedUpgradeWeapon);
            const feedback = document.getElementById('upgrade-feedback');
            if (feedback) {
                feedback.classList.remove('hidden', 'text-green-400', 'text-red-400');
                if (res.success) {
                    feedback.classList.add('text-green-400');
                    feedback.innerText = `✨✨ تم التطوير بنجاح! (+${res.newLevel}) ✨✨`;
                } else {
                    feedback.classList.add('text-red-400');
                    feedback.innerText = `⚠️ ${res.reason || 'فشل التطوير!'}`;
                }
            }
            renderUpgradeModal();
        });
    }

    // Inventory Renderer
    function renderInventoryList() {
        const container = document.getElementById('inventory-list');
        if (!container) return;
        container.innerHTML = '';

        Object.values(game.weapons).forEach(wp => {
            const isEquipped = game.player.equippedWeapon === wp.id;
            const card = document.createElement('div');
            card.className = `p-3 rounded-xl border flex items-center justify-between transition-all ${
                isEquipped ? 'border-amber-400 bg-amber-500/10' : 'border-slate-700 bg-slate-800/60'
            }`;

            card.innerHTML = `
                <div class="flex items-center gap-3">
                    <span class="text-3xl">${wp.icon}</span>
                    <div>
                        <div class="font-bold text-amber-300 flex items-center gap-2">
                            ${wp.name}
                            <span class="text-xs px-2 py-0.5 rounded bg-slate-700 text-slate-300">+${wp.level}</span>
                        </div>
                        <div class="text-xs text-slate-400">الضرر: ${game.getWeaponDamage(wp)} | السرعة: ${wp.attackSpeed}x</div>
                    </div>
                </div>
                <div class="flex gap-2">
                    <button onclick="window.equipWeapon('${wp.id}')" class="px-3 py-1 rounded-lg text-xs font-bold ${
                        isEquipped ? 'bg-amber-500 text-slate-900' : 'bg-slate-700 hover:bg-slate-600 text-white'
                    }">
                        ${isEquipped ? 'مُجهّز ✅' : 'تجهيز'}
                    </button>
                    <button onclick="window.openUpgradeModal('${wp.id}')" class="px-3 py-1 rounded-lg text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40 hover:bg-amber-500/40">
                        تطوير ⚒️
                    </button>
                </div>
            `;
            container.appendChild(card);
        });
    }

    window.equipWeapon = (wpId) => {
        if (game.weapons[wpId]) {
            game.player.equippedWeapon = wpId;
            if (window.soundEngine) window.soundEngine.playSlash();
            renderInventoryList();
        }
    };

    // HUD Update Loop (60 FPS synced)
    function syncHUD() {
        // Player HP
        const hpPct = Math.max(0, (game.player.hp / game.player.maxHp) * 100);
        const hpBar = document.getElementById('hud-hp-bar');
        const hpText = document.getElementById('hud-hp-text');
        if (hpBar) hpBar.style.width = `${hpPct}%`;
        if (hpText) hpText.innerText = `${Math.round(game.player.hp)} / ${game.player.maxHp}`;

        // Player Energy
        const enPct = Math.max(0, (game.player.energy / game.player.maxEnergy) * 100);
        const enBar = document.getElementById('hud-energy-bar');
        if (enBar) enBar.style.width = `${enPct}%`;

        // Coins & Stones & Floor
        const coinsEl = document.getElementById('hud-coins');
        const stonesEl = document.getElementById('hud-stones');
        const floorEl = document.getElementById('hud-floor');
        const scoreEl = document.getElementById('hud-score');

        if (coinsEl) coinsEl.innerText = game.coins;
        if (stonesEl) stonesEl.innerText = game.sunStones;
        if (floorEl) floorEl.innerText = `الطابق ${game.floor} - الموجة ${game.wave}`;
        if (scoreEl) scoreEl.innerText = game.score;

        // Skill cooldown HUD
        const skillBtn = document.getElementById('btn-skill');
        if (skillBtn) {
            if (game.player.skillCooldown > 0) {
                skillBtn.style.opacity = '0.5';
            } else {
                skillBtn.style.opacity = '1.0';
            }
        }

        // Boss Bar
        const bossBar = document.getElementById('boss-hud-panel');
        if (bossBar) {
            if (game.boss && game.boss.hp > 0) {
                bossBar.classList.remove('hidden');
                const bossPct = (game.boss.hp / game.boss.maxHp) * 100;
                document.getElementById('boss-hp-fill').style.width = `${bossPct}%`;
                document.getElementById('boss-title').innerText = game.boss.name;
            } else {
                bossBar.classList.add('hidden');
            }
        }

        requestAnimationFrame(syncHUD);
    }

    // Start Loops
    game.run();
    requestAnimationFrame(syncHUD);
});


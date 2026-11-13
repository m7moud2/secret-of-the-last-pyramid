/**
 * Secret of the Last Pyramid: Pharaoh Zuma — UI Controller
 */

document.addEventListener('DOMContentLoaded', () => {
    const game = new PharaohZumaGame();
    window.game = game;

    // Level Select Modal
    window.openLevelSelect = () => {
        const grid = document.getElementById('levels-grid');
        if (!grid) return;
        grid.innerHTML = '';

        for (let i = 1; i <= 15; i++) {
            const isUnlocked = i <= game.unlockedLevel;
            const btn = document.createElement('button');
            btn.className = `w-14 h-14 rounded-2xl font-black text-lg flex flex-col items-center justify-center transition-all ${
                isUnlocked
                    ? 'bg-gradient-to-b from-amber-400 to-amber-600 text-slate-950 border-2 border-amber-300 shadow-lg hover:scale-105 active:scale-95'
                    : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
            }`;

            btn.innerHTML = `
                <span>${isUnlocked ? i : '🔒'}</span>
                <span class="text-[9px] ${isUnlocked ? 'text-slate-900' : 'text-slate-600'}">★★★</span>
            `;

            if (isUnlocked) {
                btn.onclick = () => {
                    closeLevelSelect();
                    game.startLevel(i);
                };
            }

            grid.appendChild(btn);
        }

        document.getElementById('level-select-overlay')?.classList.remove('hidden');
    };

    window.closeLevelSelect = () => {
        document.getElementById('level-select-overlay')?.classList.add('hidden');
    };

    // Upgrade Center Modal (مدفع الجعران الذهبي)
    window.openUpgradeModal = () => {
        renderUpgradeUI();
        document.getElementById('upgrade-modal')?.classList.remove('hidden');
    };

    window.closeUpgradeModal = () => {
        document.getElementById('upgrade-modal')?.classList.add('hidden');
    };

    function renderUpgradeUI() {
        const lvl = game.cannon.level;
        const goldCost = 200 + lvl * 150;
        const stonesCost = 1 + Math.floor(lvl / 3);

        const currentSpd = Math.round(BASE_SHOOT_SPEED + (lvl * 0.8));
        const nextSpd = Math.round(BASE_SHOOT_SPEED + ((lvl + 1) * 0.8));

        document.getElementById('upg-level-badge').innerText = `المستوى +${lvl}`;
        document.getElementById('upg-coins-balance').innerText = game.coins;
        document.getElementById('upg-stones-balance').innerText = game.sunStones;
        document.getElementById('upg-speed-stat').innerText = `${currentSpd} → ${nextSpd}`;
        document.getElementById('upg-gold-cost').innerText = `${goldCost} ذهب`;
        document.getElementById('upg-stone-cost').innerText = `${stonesCost} حجر شمس ☀️`;
    }

    window.doUpgradeScarab = () => {
        const lvl = game.cannon.level;
        if (lvl >= 20) return;

        const goldCost = 200 + lvl * 150;
        const stonesCost = 1 + Math.floor(lvl / 3);

        if (game.coins < goldCost || game.sunStones < stonesCost) {
            alert('لا توجد موارد كافية لتطوير المدفع!');
            return;
        }

        game.coins -= goldCost;
        game.sunStones -= stonesCost;
        game.cannon.level++;
        game.saveStorage();
        game.updateHUD();

        if (window.soundEngine) window.soundEngine.playMatch(3);
        renderUpgradeUI();
    };

    // Shop Modal
    window.openShopModal = () => {
        document.getElementById('shop-modal')?.classList.remove('hidden');
    };

    window.closeShopModal = () => {
        document.getElementById('shop-modal')?.classList.add('hidden');
    };

    // Navigation Buttons
    window.nextLevel = () => {
        document.getElementById('victory-modal')?.classList.add('hidden');
        game.startLevel(game.currentLevel + 1);
    };

    window.retryLevel = () => {
        document.getElementById('gameover-modal')?.classList.add('hidden');
        game.startLevel(game.currentLevel);
    };

    window.goToMenu = () => {
        document.querySelectorAll('.game-overlay').forEach(el => el.classList.add('hidden'));
        document.getElementById('main-menu-overlay')?.classList.remove('hidden');
        game.gameState = 'menu';
    };

    window.pauseGame = () => {
        if (game.gameState === 'playing') {
            game.gameState = 'paused';
            document.getElementById('pause-modal')?.classList.remove('hidden');
        } else if (game.gameState === 'paused') {
            game.gameState = 'playing';
            document.getElementById('pause-modal')?.classList.add('hidden');
        }
    };
});

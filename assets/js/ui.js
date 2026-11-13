/**
 * Secret of the Last Pyramid: Pharaoh Zuma — UI Controller (PRO UPGRADE)
 */

document.addEventListener('DOMContentLoaded', () => {
    const game = new PharaohZumaGame();
    window.game = game;

    // Level Select Modal with Live Stars
    window.openLevelSelect = () => {
        const grid = document.getElementById('levels-grid');
        if (!grid) return;
        grid.innerHTML = '';

        for (let i = 1; i <= 15; i++) {
            const isUnlocked = i <= game.unlockedLevel;
            const starsEarned = game.levelStars[i] || 0;
            const btn = document.createElement('button');
            btn.className = `w-14 h-14 rounded-2xl font-black text-lg flex flex-col items-center justify-center transition-all ${
                isUnlocked
                    ? 'bg-gradient-to-b from-amber-400 to-amber-600 text-slate-950 border-2 border-amber-300 shadow-lg hover:scale-105 active:scale-95'
                    : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
            }`;

            const starHtml = isUnlocked
                ? '★'.repeat(starsEarned) + '<span class="text-amber-800">' + '★'.repeat(3 - starsEarned) + '</span>'
                : '🔒';

            btn.innerHTML = `
                <span>${isUnlocked ? i : '🔒'}</span>
                <span class="text-[9px] ${isUnlocked ? 'text-slate-950' : 'text-slate-600'}">${isUnlocked ? starHtml : ''}</span>
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

        const currentSpd = Math.round(BASE_SHOOT_SPEED + (lvl * 0.85));
        const nextSpd = Math.round(BASE_SHOOT_SPEED + ((lvl + 1) * 0.85));

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

    // Daily Pharaoh Gift 🎁
    window.claimDailyGift = () => {
        const lastClaim = localStorage.getItem('pyramid_daily_claim');
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;

        if (lastClaim && now - parseInt(lastClaim) < oneDay) {
            const hoursLeft = Math.ceil((oneDay - (now - parseInt(lastClaim))) / (1000 * 60 * 60));
            alert(`لقد استلمت هدية اليوم بالفعل! عد بعد ${hoursLeft} ساعة.`);
            return;
        }

        localStorage.setItem('pyramid_daily_claim', now.toString());
        game.coins += 300;
        game.sunStones += 3;
        game.saveStorage();
        game.updateHUD();

        if (window.soundEngine) window.soundEngine.playVictory();
        alert('🎉 مبروك! استلمت هدية الفراعنة اليومية: +300 🪙 ذهب و +3 ☀️ أحجار شمس!');
    };

    // Sound & BGM Toggles
    window.toggleSound = () => {
        const state = window.soundEngine.toggleSound();
        const btn = document.getElementById('btn-sound-toggle');
        if (btn) btn.innerText = state ? '🔊' : '🔇';
    };

    window.toggleBGM = () => {
        const state = window.soundEngine.toggleBGM();
        const btn = document.getElementById('btn-bgm-toggle');
        if (btn) btn.innerText = state ? '🎵' : '🚫';
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
        if (window.soundEngine) window.soundEngine.stopBGM();
    };

    window.pauseGame = () => {
        if (game.gameState === 'playing') {
            game.gameState = 'paused';
            document.getElementById('pause-modal')?.classList.remove('hidden');
            if (window.soundEngine) window.soundEngine.stopBGM();
        } else if (game.gameState === 'paused') {
            game.gameState = 'playing';
            document.getElementById('pause-modal')?.classList.add('hidden');
            if (window.soundEngine) window.soundEngine.startBGM();
        }
    };
});

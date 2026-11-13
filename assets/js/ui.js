/**
 * Secret of the Last Pyramid: Pharaoh Zuma — UI Controller (MASTER EDITION)
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
            const isBoss = i % 5 === 0;

            const btn = document.createElement('button');
            btn.className = `w-14 h-14 rounded-2xl font-black text-lg flex flex-col items-center justify-center transition-all ${
                isUnlocked
                    ? isBoss 
                        ? 'bg-gradient-to-b from-red-500 to-amber-700 text-white border-2 border-red-400 shadow-lg hover:scale-105 active:scale-95' 
                        : 'bg-gradient-to-b from-amber-400 to-amber-600 text-slate-950 border-2 border-amber-300 shadow-lg hover:scale-105 active:scale-95'
                    : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
            }`;

            const starHtml = isUnlocked
                ? '★'.repeat(starsEarned) + '<span class="text-amber-900">' + '★'.repeat(3 - starsEarned) + '</span>'
                : '🔒';

            btn.innerHTML = `
                <span>${isUnlocked ? (isBoss ? `👑${i}` : i) : '🔒'}</span>
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

    // Sacred Idols Skins Closet Modal
    window.openIdolsModal = () => {
        renderIdolsCloset();
        document.getElementById('idols-modal')?.classList.remove('hidden');
    };

    window.closeIdolsModal = () => {
        document.getElementById('idols-modal')?.classList.add('hidden');
    };

    function renderIdolsCloset() {
        const skins = [
            { id: 'scarab', name: 'الجعران الذهبي المقدس', icon: '𓆣', costCoins: 0, costStones: 0, desc: 'التوازن والدقة الكلاسيكية' },
            { id: 'horus', name: 'صقر حورس السماوي', icon: '🦅', costCoins: 800, costStones: 5, desc: 'زيادة سرعة الإطلاق +15% وخط ليزر أزرق' },
            { id: 'anubis', name: 'أنوبيس حارس الظلام', icon: '🐺', costCoins: 1500, costStones: 12, desc: 'زيادة مساحة انفجار القنابل +25%' }
        ];

        const container = document.getElementById('idols-list');
        if (!container) return;
        container.innerHTML = '';

        skins.forEach(s => {
            const isUnlocked = game.unlockedSkins.includes(s.id);
            const isEquipped = game.activeSkin === s.id;

            const card = document.createElement('div');
            card.className = `p-3 rounded-2xl border flex items-center justify-between transition-all ${
                isEquipped ? 'border-amber-400 bg-amber-500/10' : 'border-slate-800 bg-slate-900/80'
            }`;

            card.innerHTML = `
                <div class="flex items-center gap-3">
                    <span class="text-3xl">${s.icon}</span>
                    <div>
                        <div class="font-bold text-amber-300 text-sm flex items-center gap-2">
                            ${s.name}
                            ${isEquipped ? '<span class="text-[10px] px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-bold">مُجهّز</span>' : ''}
                        </div>
                        <div class="text-[11px] text-slate-400">${s.desc}</div>
                    </div>
                </div>
                <div>
                    ${
                        isUnlocked
                            ? `<button onclick="equipSkin('${s.id}')" class="px-3.5 py-1.5 rounded-xl text-xs font-bold ${
                                  isEquipped ? 'bg-slate-700 text-slate-400 cursor-default' : 'gold-btn'
                              }">${isEquipped ? 'الحالي' : 'تجهيز'}</button>`
                            : `<button onclick="unlockSkin('${s.id}', ${s.costCoins}, ${s.costStones})" class="px-3 py-1.5 rounded-xl text-xs font-black gold-btn">
                                🔓 ${s.costCoins}🪙 + ${s.costStones}☀️
                              </button>`
                    }
                </div>
            `;
            container.appendChild(card);
        });
    }

    window.equipSkin = (skinId) => {
        game.activeSkin = skinId;
        game.cannon.skin = skinId;
        game.saveStorage();
        if (window.soundEngine) window.soundEngine.playSwap();
        renderIdolsCloset();
    };

    window.unlockSkin = (skinId, coins, stones) => {
        if (game.coins < coins || game.sunStones < stones) {
            alert('لا توجد موارد كافية لشراء هذا التمثال المقدس!');
            return;
        }

        game.coins -= coins;
        game.sunStones -= stones;
        game.unlockedSkins.push(skinId);
        game.activeSkin = skinId;
        game.cannon.skin = skinId;
        game.saveStorage();
        game.updateHUD();

        if (window.soundEngine) window.soundEngine.playVictory();
        alert('🎉 تم فتح وتجهيز التمثال المقدس بنجاح!');
        renderIdolsCloset();
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

    window.toggleFastForward = () => {
        game.toggleFastForward();
    };

    // Navigation Buttons
    window.nextLevel = () => {
        document.getElementById('victory-modal')?.classList.add('hidden');
        if (game.isEndlessMode) {
            game.startEndlessMode();
        } else {
            game.startLevel(game.currentLevel + 1);
        }
    };

    window.retryLevel = () => {
        document.getElementById('gameover-modal')?.classList.add('hidden');
        if (game.isEndlessMode) {
            game.startEndlessMode();
        } else {
            game.startLevel(game.currentLevel);
        }
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
            if (window.soundEngine) window.soundEngine.startBGM(game.isBossLevel);
        }
    };
});

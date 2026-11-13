/**
 * Secret of the Last Pyramid: Pharaoh Zuma — Sound Engine
 * Procedural Web Audio API for Egyptian Marble Shooter
 */

class SoundEngine {
    constructor() {
        this.ctx = null;
        this.enabled = true;
        this.bgmOsc = null;
        this.bgmGain = null;
        this.isBgmPlaying = false;
        this.initOnUserGesture();
    }

    initOnUserGesture() {
        const unlock = () => {
            if (!this.ctx) {
                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                if (AudioCtx) this.ctx = new AudioCtx();
            }
            if (this.ctx && this.ctx.state === 'suspended') {
                this.ctx.resume();
            }
            ['click', 'touchstart', 'keydown'].forEach(e => window.removeEventListener(e, unlock));
        };
        ['click', 'touchstart', 'keydown'].forEach(e => window.addEventListener(e, unlock, { once: false }));
    }

    ensureContext() {
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) this.ctx = new AudioCtx();
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    playTone(freq, type = 'sine', duration = 0.15, gainVal = 0.2, pitchBend = 0) {
        if (!this.enabled) return;
        this.ensureContext();
        if (!this.ctx) return;

        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const now = this.ctx.currentTime;

            osc.type = type;
            osc.frequency.setValueAtTime(freq, now);
            if (pitchBend !== 0) {
                osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq + pitchBend), now + duration);
            }

            gain.gain.setValueAtTime(gainVal, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + duration);
        } catch (e) {}
    }

    // Shoot Marble from Scarab
    playShoot() {
        this.playTone(520, 'triangle', 0.12, 0.25, -280);
    }

    // Marble Clack / Insert
    playClack() {
        this.playTone(850, 'sine', 0.05, 0.2, -400);
    }

    // Swap Ball in Scarab
    playSwap() {
        this.playTone(400, 'triangle', 0.08, 0.15, 300);
    }

    // Match 3+ Marbles Blasted!
    playMatch(combo = 1) {
        const baseFreq = 440 + Math.min(combo * 90, 600);
        this.playTone(baseFreq, 'triangle', 0.15, 0.3, 100);
        setTimeout(() => {
            this.playTone(baseFreq * 1.25, 'sine', 0.2, 0.35, 80);
        }, 70);
    }

    // Bomb / Explosion
    playBomb() {
        this.playTone(120, 'sawtooth', 0.35, 0.45, -70);
        this.playTone(60, 'triangle', 0.5, 0.5, -30);
    }

    // Freeze Time Booster
    playFreeze() {
        this.playTone(700, 'sine', 0.4, 0.25, -350);
        setTimeout(() => this.playTone(900, 'triangle', 0.3, 0.2, -450), 120);
    }

    // Rewind / Reverse Chain
    playRewind() {
        this.playTone(220, 'sine', 0.25, 0.25, 350);
    }

    // Coin / Golden Scarab Collected
    playCoin() {
        this.playTone(987.77, 'sine', 0.08, 0.25, 200);
        setTimeout(() => this.playTone(1318.51, 'sine', 0.15, 0.3, 100), 60);
    }

    // Danger Pulse (When marbles are near tomb)
    playDanger() {
        this.playTone(180, 'sawtooth', 0.18, 0.3, -50);
    }

    // Stage Cleared / Victory
    playVictory() {
        const notes = [392, 523.25, 659.25, 783.99, 1046.5];
        notes.forEach((f, i) => {
            setTimeout(() => this.playTone(f, 'triangle', 0.35, 0.3), i * 110);
        });
    }

    // Game Over
    playGameOver() {
        const notes = [400, 350, 300, 220];
        notes.forEach((f, i) => {
            setTimeout(() => this.playTone(f, 'sawtooth', 0.3, 0.35, -40), i * 140);
        });
    }

    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    }
}

window.soundEngine = new SoundEngine();

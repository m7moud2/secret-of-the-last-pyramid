/**
 * Secret of the Last Pyramid: Pharaoh Zuma — Pro Sound & Music Engine
 * Procedural Web Audio API for Egyptian Marble Shooter + Dynamic Egyptian BGM + Boss Effects
 */

class SoundEngine {
    constructor() {
        this.ctx = null;
        this.enabled = localStorage.getItem('pyramid_sound_enabled') !== 'false';
        this.bgmEnabled = localStorage.getItem('pyramid_bgm_enabled') !== 'false';
        this.isBgmPlaying = false;
        this.bgmInterval = null;
        this.tempo = 110; // BPM
        this.step = 0;
        this.isBossTheme = false;

        // Ancient Egyptian Phrygian Dominant scale frequencies (D Phrygian Dominant)
        this.scale = [146.83, 155.56, 185.00, 196.00, 220.00, 233.08, 277.18, 293.66, 311.13, 369.99];

        this.initOnUserGesture();
    }

    initOnUserGesture() {
        const unlock = () => {
            this.ensureContext();
            if (this.bgmEnabled && !this.isBgmPlaying) {
                this.startBGM();
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

    // Dynamic Procedural Egyptian BGM (Darbuka Rhythm + Mystic Oud Arpeggio)
    startBGM(isBoss = false) {
        if (!this.bgmEnabled) return;
        this.ensureContext();
        if (!this.ctx) return;
        this.stopBGM();
        this.isBgmPlaying = true;
        this.isBossTheme = isBoss;
        this.tempo = isBoss ? 135 : 110;

        const melody = isBoss 
            ? [4, 5, 7, 8, 7, 5, 4, 3, 5, 4, 3, 2, 3, 2, 1, 0]
            : [0, 2, 3, 4, 3, 2, 1, 0, 4, 5, 7, 5, 4, 3, 2, 1];

        const bass = [0, 0, 4, 0, 3, 0, 1, 0];

        const tick = () => {
            if (!this.isBgmPlaying || !this.bgmEnabled) return;

            // Percussion: Darbuka Dum & Tak
            const beat = this.step % 8;
            if (beat === 0 || beat === 4) {
                this.playPercussion(isBoss ? 55 : 65, 0.14, isBoss ? 0.25 : 0.18, 'triangle');
            } else if (beat === 2 || beat === 6 || beat === 7) {
                this.playPercussion(isBoss ? 320 : 280, 0.05, 0.12, 'sine');
            }

            // Mystic Oud Note
            const noteIdx = melody[this.step % melody.length];
            const freq = this.scale[noteIdx] || 220;
            this.playTone(freq, isBoss ? 'sawtooth' : 'triangle', 0.22, isBoss ? 0.09 : 0.06, -10);

            // Drone Bass
            if (this.step % 4 === 0) {
                const bassIdx = bass[(this.step / 4) % bass.length];
                this.playTone(this.scale[bassIdx] * 0.5, 'sine', 0.45, 0.1, 0);
            }

            this.step++;
            const intervalMs = (60 / this.tempo / 2) * 1000;
            this.bgmInterval = setTimeout(tick, intervalMs);
        };

        tick();
    }

    stopBGM() {
        this.isBgmPlaying = false;
        if (this.bgmInterval) clearTimeout(this.bgmInterval);
    }

    setDangerTempo(isDanger) {
        if (!this.isBossTheme) {
            this.tempo = isDanger ? 140 : 110;
        }
    }

    playPercussion(freq, duration, gainVal, type = 'sine') {
        if (!this.enabled || !this.ctx) return;
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const now = this.ctx.currentTime;
            osc.type = type;
            osc.frequency.setValueAtTime(freq, now);
            osc.frequency.exponentialRampToValueAtTime(30, now + duration);
            gain.gain.setValueAtTime(gainVal, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + duration);
        } catch (e) {}
    }

    // Shoot Marble
    playShoot() {
        this.playTone(520, 'triangle', 0.12, 0.22, -280);
    }

    // Marble Clack / Insert
    playClack() {
        this.playTone(850, 'sine', 0.05, 0.18, -400);
    }

    // Swap Ball in Scarab
    playSwap() {
        this.playTone(400, 'triangle', 0.08, 0.15, 300);
    }

    // Match 3+ Marbles Blasted!
    playMatch(combo = 1) {
        const baseFreq = 440 + Math.min(combo * 95, 650);
        this.playTone(baseFreq, 'triangle', 0.15, 0.28, 100);
        setTimeout(() => {
            this.playTone(baseFreq * 1.25, 'sine', 0.2, 0.32, 80);
        }, 70);
    }

    // Boss Hit Impact
    playBossHit() {
        this.playTone(200, 'sawtooth', 0.18, 0.35, -120);
        this.playTone(100, 'triangle', 0.25, 0.4, -40);
    }

    // Boss Defeated Roar & Fanfare
    playBossDefeated() {
        this.playTone(80, 'sawtooth', 0.8, 0.5, -40);
        setTimeout(() => this.playVictory(), 400);
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

    // Danger Warning Pulse
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

    toggleSound() {
        this.enabled = !this.enabled;
        localStorage.setItem('pyramid_sound_enabled', this.enabled);
        return this.enabled;
    }

    toggleBGM() {
        this.bgmEnabled = !this.bgmEnabled;
        localStorage.setItem('pyramid_bgm_enabled', this.bgmEnabled);
        if (this.bgmEnabled) {
            this.startBGM(this.isBossTheme);
        } else {
            this.stopBGM();
        }
        return this.bgmEnabled;
    }
}

window.soundEngine = new SoundEngine();

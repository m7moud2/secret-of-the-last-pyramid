/**
 * Secret of the Last Pyramid — Procedural Web Audio Sound Engine
 * Zero external audio files needed; full Web Audio synthesis.
 */

class SoundEngine {
    constructor() {
        this.ctx = null;
        this.enabled = true;
        this.ambientPlaying = false;
        this.initOnUserGesture();
    }

    initOnUserGesture() {
        const unlock = () => {
            if (!this.ctx) {
                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                if (AudioCtx) {
                    this.ctx = new AudioCtx();
                }
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

    // Play quick tone
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
        } catch (e) {
            // Ignore audio context errors
        }
    }

    // Sword Slash / Swing
    playSlash() {
        if (!this.enabled) return;
        this.ensureContext();
        if (!this.ctx) return;

        try {
            const bufferSize = this.ctx.sampleRate * 0.12;
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
            }
            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(800, this.ctx.currentTime);
            filter.frequency.exponentialRampToValueAtTime(2200, this.ctx.currentTime + 0.12);

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.12);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);

            noise.start();
        } catch (e) {}
    }

    // Hit Enemy / Damage Impact
    playHit() {
        this.playTone(180, 'triangle', 0.1, 0.25, -120);
        this.playTone(90, 'sawtooth', 0.15, 0.2, -50);
    }

    // Player Hurt
    playPlayerHurt() {
        this.playTone(240, 'sawtooth', 0.2, 0.3, -150);
    }

    // Dodge / Dash Whoosh
    playDodge() {
        this.playTone(400, 'sine', 0.18, 0.15, -250);
    }

    // Sun Beam / Solar Magic (شعاع رع)
    playMagicBeam() {
        if (!this.enabled) return;
        this.ensureContext();
        if (!this.ctx) return;

        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(300, now);
            osc.frequency.exponentialRampToValueAtTime(1200, now + 0.2);
            osc.frequency.exponentialRampToValueAtTime(600, now + 0.5);

            gain.gain.setValueAtTime(0.25, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.5);
        } catch (e) {}
    }

    // Coin Pickup (ذهبي)
    playCoin() {
        this.playTone(987.77, 'sine', 0.08, 0.2, 200); // B5
        setTimeout(() => {
            this.playTone(1318.51, 'sine', 0.15, 0.22, 100); // E6
        }, 60);
    }

    // Sun Stone Pickup (حجر الشمس ☀️)
    playStonePickup() {
        this.playTone(523.25, 'triangle', 0.12, 0.3, 100);
        setTimeout(() => this.playTone(659.25, 'triangle', 0.12, 0.3, 100), 70);
        setTimeout(() => this.playTone(783.99, 'sine', 0.2, 0.35, 100), 140);
        setTimeout(() => this.playTone(1046.50, 'sine', 0.35, 0.4, 0), 220);
    }

    // Upgrade Success Fanfare!
    playUpgradeSuccess() {
        const notes = [440, 554.37, 659.25, 880];
        notes.forEach((freq, idx) => {
            setTimeout(() => {
                this.playTone(freq, 'triangle', 0.22, 0.3, 0);
            }, idx * 90);
        });
    }

    // Upgrade Failure Thud
    playUpgradeFail() {
        this.playTone(280, 'sawtooth', 0.25, 0.3, -160);
        setTimeout(() => {
            this.playTone(180, 'sawtooth', 0.35, 0.35, -90);
        }, 120);
    }

    // Boss Roar / Earthquake
    playBossSlam() {
        this.playTone(80, 'sawtooth', 0.6, 0.4, -40);
        this.playTone(55, 'triangle', 0.8, 0.5, -25);
    }

    // Level Clear / Victory
    playVictory() {
        const chord = [392, 493.88, 587.33, 783.99];
        chord.forEach((f, i) => {
            setTimeout(() => this.playTone(f, 'triangle', 0.4, 0.25), i * 110);
        });
    }

    // Toggle mute
    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    }
}

window.soundEngine = new SoundEngine();


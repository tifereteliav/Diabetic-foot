/**
 * Hyperbaric Rescue Audio Engine
 * Uses the Web Audio API to synthesize medical sound effects and ambient humming dynamically.
 * Self-contained, zero external asset dependencies.
 */

class GameAudioEngine {
    constructor() {
        this.ctx = null;
        this.isMuted = false;
        
        // References for running loops
        this.humNodes = null;
        this.alarmInterval = null;
        this.alarmOsc = null;
    }

    // Lazy initialization of AudioContext on user gesture (browser safety rule)
    init() {
        if (!this.ctx) {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContextClass();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    setMute(muteState) {
        this.isMuted = muteState;
        if (this.isMuted) {
            this.stopHum();
            this.stopAlarm();
        } else {
            // If hum was supposed to be running, re-enable it when unmuting
            if (this.ctx && this.humNodes) {
                this.startHum();
            }
        }
    }

    // Standard short beep
    playBeep(freq = 440, type = 'sine', duration = 0.1, volume = 0.1) {
        if (this.isMuted) return;
        this.init();

        try {
            const osc = this.ctx.createOscillator();
            const gainNode = this.ctx.createGain();

            osc.type = type;
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

            gainNode.gain.setValueAtTime(volume, this.ctx.currentTime);
            // Exponential decay
            gainNode.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

            osc.connect(gainNode);
            gainNode.connect(this.ctx.destination);

            osc.start();
            osc.stop(this.ctx.currentTime + duration);
        } catch (e) {
            console.warn("Audio playback error:", e);
        }
    }

    // UI click sound
    playClick() {
        this.playBeep(800, 'sine', 0.05, 0.05);
    }

    // Correct answer sound: optimistic upward arpeggio
    playSuccess() {
        if (this.isMuted) return;
        this.init();

        const now = this.ctx.currentTime;
        const notes = [261.63, 329.63, 392.00, 523.25]; // C major chord
        const noteDuration = 0.08;

        notes.forEach((freq, idx) => {
            setTimeout(() => {
                this.playBeep(freq, 'sine', 0.25, 0.08);
            }, idx * noteDuration * 1000);
        });
    }

    // Wrong answer sound: low buzz down-sweep
    playError() {
        if (this.isMuted) return;
        this.init();

        try {
            const osc = this.ctx.createOscillator();
            const gainNode = this.ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(150, this.ctx.currentTime);
            osc.frequency.linearRampToValueAtTime(80, this.ctx.currentTime + 0.35);

            gainNode.gain.setValueAtTime(0.12, this.ctx.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.0001, this.ctx.currentTime + 0.35);

            osc.connect(gainNode);
            gainNode.connect(this.ctx.destination);

            osc.start();
            osc.stop(this.ctx.currentTime + 0.35);
        } catch (e) {
            console.warn(e);
        }
    }

    // TcPO2 Laser scanning sound: sweeping frequency
    playScan() {
        if (this.isMuted) return;
        this.init();

        try {
            const osc = this.ctx.createOscillator();
            const gainNode = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(300, this.ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1500, this.ctx.currentTime + 0.4);

            gainNode.gain.setValueAtTime(0.05, this.ctx.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.4);

            osc.connect(gainNode);
            gainNode.connect(this.ctx.destination);

            osc.start();
            osc.stop(this.ctx.currentTime + 0.4);
        } catch (e) {
            console.warn(e);
        }
    }

    // Continuous hyperbaric hum (ventilation, gas flow)
    startHum() {
        if (this.isMuted) return;
        this.init();
        
        // Stop current if already running
        this.stopHum();

        try {
            const osc1 = this.ctx.createOscillator();
            const osc2 = this.ctx.createOscillator();
            const filter = this.ctx.createBiquadFilter();
            const gainNode = this.ctx.createGain();

            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(65.41, this.ctx.currentTime); // Low C

            osc2.type = 'triangle';
            osc2.frequency.setValueAtTime(98.00, this.ctx.currentTime); // Low G

            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(120, this.ctx.currentTime);

            gainNode.gain.setValueAtTime(0.08, this.ctx.currentTime); // Subtle background drone

            osc1.connect(filter);
            osc2.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(this.ctx.destination);

            osc1.start();
            osc2.start();

            this.humNodes = { osc1, osc2, gainNode };
        } catch (e) {
            console.warn("Error starting hum:", e);
        }
    }

    stopHum() {
        if (this.humNodes) {
            try {
                this.humNodes.osc1.stop();
                this.humNodes.osc2.stop();
            } catch (e) {}
            this.humNodes = null;
        }
    }

    // Hypoglycemia alarm: flashing medical siren
    startAlarm() {
        if (this.isMuted) return;
        this.init();
        
        this.stopAlarm();

        let highPitch = true;
        
        const triggerBeep = () => {
            const freq = highPitch ? 880 : 660; // Alternating dual pitch medical alarm
            this.playBeep(freq, 'sine', 0.25, 0.1);
            highPitch = !highPitch;
        };

        triggerBeep();
        this.alarmInterval = setInterval(triggerBeep, 400);
    }

    stopAlarm() {
        if (this.alarmInterval) {
            clearInterval(this.alarmInterval);
            this.alarmInterval = null;
        }
    }
}

// Global singleton instance
const gameAudio = new GameAudioEngine();
window.gameAudio = gameAudio;

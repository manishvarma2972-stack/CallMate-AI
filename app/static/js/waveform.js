/**
 * CallMate.ai — 60fps Curved Audio Waveform Visualizer (Section 3)
 * Real-time acoustic feedback for bidirectional voice streaming:
 * - Real-time microphone inbound audio (Audio Cyan #32C7D9)
 * - Real-time AI synthesized outbound audio (Focus/Electric Blue #69A5FF / #3478F6)
 * - Flat resting baseline when silent (never fabricates fake activity without audio)
 * - Low CPU overhead on M1 Mac, pauses when tab is hidden, respects reduced motion.
 */

class AudioWaveformVisualizer {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.inboundLevel = 0;
    this.outboundLevel = 0;
    this.targetInboundLevel = 0;
    this.targetOutboundLevel = 0;
    this.time = 0;
    this.animId = null;
    this.isPaused = false;

    this.boundResize = this.resize.bind(this);
    this.boundVisibility = this.onVisibilityChange.bind(this);

    if (this.canvas) {
      this.resize();
      window.addEventListener('resize', this.boundResize);
      document.addEventListener('visibilitychange', this.boundVisibility);
      this.start();
    }
  }

  resize() {
    if (!this.canvas) return;
    const rect = this.canvas.parentElement ? this.canvas.parentElement.getBoundingClientRect() : null;
    const width = rect ? rect.width : 300;
    const height = rect ? (rect.height || 90) : 90;
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    if (this.ctx) {
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.ctx.scale(dpr, dpr);
    }
  }

  setLevel(source, level) {
    const clamped = Math.max(0, Math.min(100, level));
    if (source === 'mic') {
      this.targetInboundLevel = clamped;
    } else if (source === 'spk') {
      this.targetOutboundLevel = clamped;
    }
  }

  start() {
    if (this.animId) return;
    this.isPaused = false;
    const loop = () => {
      if (!this.isPaused) {
        this.render();
      }
      this.animId = requestAnimationFrame(loop);
    };
    this.animId = requestAnimationFrame(loop);
  }

  stop() {
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
  }

  onVisibilityChange() {
    if (document.hidden) {
      // Pause 60fps render loop when tab is backgrounded
      this.isPaused = true;
    } else {
      this.isPaused = false;
    }
  }

  destroy() {
    this.stop();
    window.removeEventListener('resize', this.boundResize);
    document.removeEventListener('visibilitychange', this.boundVisibility);
    this.canvas = null;
    this.ctx = null;
  }

  render() {
    if (!this.ctx || !this.canvas) return;
    const width = parseFloat(this.canvas.style.width) || 300;
    const height = parseFloat(this.canvas.style.height) || 90;
    const midY = height / 2;

    this.ctx.clearRect(0, 0, width, height);

    const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Smooth LERP level smoothing
    this.inboundLevel += (this.targetInboundLevel - this.inboundLevel) * 0.3;
    this.outboundLevel += (this.targetOutboundLevel - this.outboundLevel) * 0.3;

    if (!prefersReducedMotion) {
      this.time += 0.038;
    }

    const activeLevel = Math.max(this.inboundLevel, this.outboundLevel);
    const isOutbound = this.outboundLevel >= this.inboundLevel && this.outboundLevel > 1.5;
    const isInbound = this.inboundLevel > 1.5;
    const isSilent = activeLevel < 1.5;

    const isLight = document.documentElement.getAttribute('data-theme') === 'light';

    // 1. Draw baseline reference axis
    this.ctx.save();
    this.ctx.strokeStyle = isLight ? 'rgba(17, 24, 39, 0.08)' : 'rgba(255, 255, 255, 0.05)';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(0, midY);
    this.ctx.lineTo(width, midY);
    this.ctx.stroke();
    this.ctx.restore();

    // 2. Clear Distinction Wave Color Gradient (Section 3)
    const gradient = this.ctx.createLinearGradient(0, 0, width, 0);
    if (isOutbound) {
      // Outgoing AI Speech: Focus Blue (#69A5FF) to Electric Blue (#3478F6)
      gradient.addColorStop(0, 'rgba(52, 120, 246, 0.2)');
      gradient.addColorStop(0.5, '#69A5FF');
      gradient.addColorStop(1, 'rgba(50, 199, 217, 0.25)');
    } else if (isInbound) {
      // Inbound Mic Audio: Audio Cyan (#32C7D9)
      gradient.addColorStop(0, 'rgba(50, 199, 217, 0.2)');
      gradient.addColorStop(0.5, '#32C7D9');
      gradient.addColorStop(1, 'rgba(52, 120, 246, 0.25)');
    } else {
      // Idle / Resting (Muted subtle graphite electric blue)
      gradient.addColorStop(0, 'rgba(52, 120, 246, 0.1)');
      gradient.addColorStop(0.5, 'rgba(52, 120, 246, 0.25)');
      gradient.addColorStop(1, 'rgba(50, 199, 217, 0.1)');
    }

    // 3. Audio Activity: If silent, do NOT fabricate false audio waves!
    if (isSilent) {
      // Flat resting acoustic line with very gentle breath
      this.ctx.save();
      this.ctx.strokeStyle = gradient;
      this.ctx.globalAlpha = isLight ? 0.35 : 0.25;
      this.ctx.lineWidth = 1.5;
      this.ctx.beginPath();
      const restingAmp = prefersReducedMotion ? 0 : 0.8;
      for (let x = 0; x <= width; x += 4) {
        const envelope = Math.sin((x / width) * Math.PI);
        const y = midY + Math.sin(x * 0.02 + this.time * 0.8) * restingAmp * envelope;
        if (x === 0) this.ctx.moveTo(x, y);
        else this.ctx.lineTo(x, y);
      }
      this.ctx.stroke();
      this.ctx.restore();
      return;
    }

    // 4. Active Spoken Turns: Multi-layer harmonic acoustic sine curves
    const baseAmp1 = prefersReducedMotion ? 2 : (activeLevel / 100) * 34;
    const baseAmp2 = prefersReducedMotion ? 1.5 : (activeLevel / 100) * 22;
    const baseAmp3 = prefersReducedMotion ? 1 : (activeLevel / 100) * 14;

    const waves = [
      { amp: baseAmp1, freq: 0.018, speed: prefersReducedMotion ? 0 : 2.2, alpha: 0.88, width: 2.5 },
      { amp: baseAmp2, freq: 0.024, speed: prefersReducedMotion ? 0 : -1.8, alpha: 0.52, width: 1.5 },
      { amp: baseAmp3, freq: 0.035, speed: prefersReducedMotion ? 0 : 1.2, alpha: 0.30, width: 1.0 }
    ];

    for (const w of waves) {
      this.ctx.save();
      this.ctx.strokeStyle = gradient;
      this.ctx.globalAlpha = w.alpha;
      this.ctx.lineWidth = w.width;
      this.ctx.beginPath();

      for (let x = 0; x <= width; x += 3) {
        // Window function to taper edges gracefully into baseline
        const envelope = Math.sin((x / width) * Math.PI);
        const y = midY + Math.sin(x * w.freq + this.time * w.speed) * w.amp * envelope;
        if (x === 0) {
          this.ctx.moveTo(x, y);
        } else {
          this.ctx.lineTo(x, y);
        }
      }
      this.ctx.stroke();
      this.ctx.restore();
    }
  }
}

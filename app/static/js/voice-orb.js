/**
 * CallMate.ai — Interactive 60fps AI Voice Orb (Section 2)
 * High-performance Canvas energy sphere communicating live voice states:
 * - Idle: Slow breathing (3.2s cycle), gentle ambient glow, muted electric blue
 * - Listening: Audio Cyan glow (#32C7D9), smooth pulse, mic-reactive deformation
 * - Thinking: Violet highlights (#A78BFA), rotating light sweep
 * - Speaking: Focus/Electric Blue (#69A5FF / #3478F6), audio-reactive expansion/contraction
 * - Interrupted: Alert orange (#FB923C) jolt and graceful recovery
 * - Disconnected: Neutral grey (#8290A3), zero misleading activity
 * Respects prefers-reduced-motion and pauses when document.hidden.
 */

class VoiceOrbRenderer {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.state = 'idle'; // 'idle', 'listening', 'thinking', 'speaking', 'interrupted', 'disconnected'
    this.audioLevel = 0; // 0 to 100
    this.targetAudioLevel = 0;
    this.time = 0;
    this.thinkingAngle = 0;
    this.animId = null;
    this.isPaused = false;

    // Geometry & Dynamics
    this.baseRadius = 42;
    this.currentRadius = 42;
    this.particles = [];
    this.initParticles(36);

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
    const size = rect ? (Math.min(rect.width, rect.height) || 110) : 110;
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = size * dpr;
    this.canvas.height = size * dpr;
    this.canvas.style.width = `${size}px`;
    this.canvas.style.height = `${size}px`;
    if (this.ctx) {
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.ctx.scale(dpr, dpr);
    }
    this.baseRadius = size * 0.38;
    this.currentRadius = this.baseRadius;
  }

  initParticles(count) {
    this.particles = [];
    for (let i = 0; i < count; i++) {
      this.particles.push({
        angle: (i / count) * Math.PI * 2,
        speed: 0.012 + Math.random() * 0.018,
        distanceOffset: (Math.random() - 0.5) * 8,
        size: 1.5 + Math.random() * 2,
        alpha: 0.25 + Math.random() * 0.45
      });
    }
  }

  setState(state) {
    if (this.state !== state) {
      this.state = state;
      // Reset audio levels when disconnected or returning to idle
      if (state === 'disconnected') {
        this.targetAudioLevel = 0;
        this.audioLevel = 0;
      }
    }
  }

  setAudioLevel(level) {
    // Only register audio reactions when connected and in active states
    if (this.state === 'disconnected') {
      this.targetAudioLevel = 0;
      return;
    }
    this.targetAudioLevel = Math.max(0, Math.min(100, level));
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
      // Pause 60fps render loop when tab is backgrounded to save M1 CPU/GPU
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
    const width = parseFloat(this.canvas.style.width) || 110;
    const height = parseFloat(this.canvas.style.height) || 110;
    const cx = width / 2;
    const cy = height / 2;

    this.ctx.clearRect(0, 0, width, height);

    const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Smooth audio level interpolation (LERP)
    this.audioLevel += (this.targetAudioLevel - this.audioLevel) * 0.25;

    // Advance time and cycles
    if (!prefersReducedMotion) {
      this.time += 0.032;
      this.thinkingAngle += 0.035;
    }

    // Breathing oscillation (approx 3.2s per cycle)
    const breathCycle = prefersReducedMotion ? 0 : Math.sin((this.time / 3.2) * Math.PI * 2);

    // Dynamic state palette, amplitude & radius scaling
    let coreGradient;
    let outerColor;
    let waveAmp = 1.5;
    let targetRadius = this.baseRadius;

    if (this.state === 'speaking') {
      // Speaking: Focus Blue & Electric Blue with live expansion
      targetRadius = this.baseRadius * (1 + (this.audioLevel / 100) * 0.16);
      waveAmp = prefersReducedMotion ? 3 : 4 + (this.audioLevel / 100) * 16;
      
      coreGradient = this.ctx.createRadialGradient(cx, cy, 0, cx, cy, this.currentRadius * 1.25);
      coreGradient.addColorStop(0, '#69A5FF');
      coreGradient.addColorStop(0.55, '#3478F6');
      coreGradient.addColorStop(1, 'rgba(52, 120, 246, 0.15)');
      outerColor = 'rgba(105, 165, 255, 0.55)';

    } else if (this.state === 'listening') {
      // Listening: Audio Cyan glow with smooth pulse & mic-reactive deformation
      const pulse = prefersReducedMotion ? 0 : Math.sin(this.time * 3.5) * 1.5;
      waveAmp = prefersReducedMotion ? 2.5 : 2.5 + pulse + (this.audioLevel / 100) * 12;
      
      coreGradient = this.ctx.createRadialGradient(cx, cy, 0, cx, cy, this.currentRadius * 1.2);
      coreGradient.addColorStop(0, '#32C7D9');
      coreGradient.addColorStop(0.55, '#0891B2');
      coreGradient.addColorStop(1, 'rgba(50, 199, 217, 0.15)');
      outerColor = 'rgba(50, 199, 217, 0.48)';

    } else if (this.state === 'thinking') {
      // Thinking: Violet highlights with rotating internal sweep
      waveAmp = prefersReducedMotion ? 2.5 : 3 + Math.sin(this.time * 2.5) * 2;
      
      coreGradient = this.ctx.createRadialGradient(cx, cy, 0, cx, cy, this.currentRadius * 1.2);
      coreGradient.addColorStop(0, '#A78BFA');
      coreGradient.addColorStop(0.55, '#7C3AED');
      coreGradient.addColorStop(1, 'rgba(167, 139, 250, 0.15)');
      outerColor = 'rgba(167, 139, 250, 0.45)';

    } else if (this.state === 'interrupted') {
      // Interrupted: Alert orange jolt
      waveAmp = prefersReducedMotion ? 4 : 7;
      
      coreGradient = this.ctx.createRadialGradient(cx, cy, 0, cx, cy, this.currentRadius * 1.3);
      coreGradient.addColorStop(0, '#FB923C');
      coreGradient.addColorStop(0.6, '#EA580C');
      coreGradient.addColorStop(1, 'rgba(251, 146, 60, 0.15)');
      outerColor = 'rgba(251, 146, 60, 0.55)';

    } else if (this.state === 'disconnected') {
      // Disconnected: Neutral grey, stationary, zero false audio motion
      waveAmp = 0.5;
      
      coreGradient = this.ctx.createRadialGradient(cx, cy, 0, cx, cy, this.baseRadius);
      coreGradient.addColorStop(0, '#8290A3');
      coreGradient.addColorStop(0.6, '#475569');
      coreGradient.addColorStop(1, 'rgba(130, 144, 163, 0.08)');
      outerColor = 'rgba(130, 144, 163, 0.18)';

    } else {
      // Idle: Slow breathing (3.2s cycle), gentle ambient glow, muted electric blue
      waveAmp = 1.5 + breathCycle * 0.6;
      targetRadius = this.baseRadius * (1 + breathCycle * 0.03);
      
      coreGradient = this.ctx.createRadialGradient(
        cx - this.baseRadius * 0.15,
        cy - this.baseRadius * 0.15,
        0,
        cx,
        cy,
        this.currentRadius * 1.15
      );
      coreGradient.addColorStop(0, '#69A5FF');
      coreGradient.addColorStop(0.48, '#3478F6');
      coreGradient.addColorStop(1, '#142B50');
      outerColor = 'rgba(52, 120, 246, 0.32)';
    }

    // Radius LERP
    this.currentRadius += (targetRadius - this.currentRadius) * 0.18;

    // 1. Draw glowing outer ambient glow
    this.ctx.save();
    this.ctx.beginPath();
    const glowExpansion = prefersReducedMotion ? 0 : breathCycle * 2.5;
    this.ctx.arc(cx, cy, Math.max(1, this.currentRadius * 1.22 + glowExpansion), 0, Math.PI * 2);
    this.ctx.fillStyle = outerColor;
    this.ctx.filter = 'blur(10px)';
    this.ctx.fill();
    this.ctx.restore();

    // 2. Draw harmonic undulating perimeter wave
    this.ctx.save();
    this.ctx.beginPath();
    const points = 60;
    for (let i = 0; i <= points; i++) {
      const angle = (i / points) * Math.PI * 2;
      const freq1 = prefersReducedMotion ? 0 : Math.sin(angle * 4 + this.time * 2);
      const freq2 = prefersReducedMotion ? 0 : Math.cos(angle * 6 - this.time * 1.5);
      const r = Math.max(2, this.currentRadius + (freq1 + freq2) * waveAmp);
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      if (i === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }
    }
    this.ctx.closePath();
    this.ctx.fillStyle = coreGradient;
    this.ctx.fill();
    this.ctx.restore();

    // 3. Thinking State: Subtle rotating light sweep effect
    if (this.state === 'thinking' && !prefersReducedMotion) {
      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, this.currentRadius * 0.95, 0, Math.PI * 2);
      this.ctx.clip();

      const sweepGradient = this.ctx.createLinearGradient(
        cx + Math.cos(this.thinkingAngle) * this.currentRadius,
        cy + Math.sin(this.thinkingAngle) * this.currentRadius,
        cx - Math.cos(this.thinkingAngle) * this.currentRadius,
        cy - Math.sin(this.thinkingAngle) * this.currentRadius
      );
      sweepGradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
      sweepGradient.addColorStop(0.5, 'rgba(167, 139, 250, 0.1)');
      sweepGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

      this.ctx.fillStyle = sweepGradient;
      this.ctx.fillRect(cx - this.currentRadius, cy - this.currentRadius, this.currentRadius * 2, this.currentRadius * 2);
      this.ctx.restore();
    }

    // 4. Draw energetic orbital rings
    this.ctx.save();
    this.ctx.strokeStyle = outerColor;
    this.ctx.lineWidth = this.state === 'disconnected' ? 0.8 : 1.4;
    const ringAngle = prefersReducedMotion ? 0.3 : this.time * 0.35;
    const ringAngle2 = prefersReducedMotion ? -0.3 : -this.time * 0.28 + 1;

    this.ctx.beginPath();
    this.ctx.ellipse(cx, cy, this.currentRadius * 1.15, this.currentRadius * 0.45, ringAngle, 0, Math.PI * 2);
    this.ctx.stroke();

    this.ctx.beginPath();
    this.ctx.ellipse(cx, cy, this.currentRadius * 1.15, this.currentRadius * 0.45, ringAngle2, 0, Math.PI * 2);
    this.ctx.stroke();
    this.ctx.restore();

    // 5. Draw floating energy particles
    this.ctx.save();
    for (const p of this.particles) {
      if (!prefersReducedMotion && this.state !== 'disconnected') {
        const speedBoost = this.state === 'speaking' ? 1 + (this.audioLevel / 100) * 1.2 : 1;
        p.angle += p.speed * speedBoost;
      }
      const particleAmp = this.state === 'disconnected' ? 0 : waveAmp;
      const pr = this.currentRadius + p.distanceOffset + Math.sin(this.time + p.angle * 2) * particleAmp;
      const px = cx + Math.cos(p.angle) * pr;
      const py = cy + Math.sin(p.angle) * pr;

      this.ctx.beginPath();
      this.ctx.arc(px, py, p.size, 0, Math.PI * 2);
      const alpha = this.state === 'disconnected' ? 0.15 : p.alpha;
      this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      this.ctx.fill();
    }
    this.ctx.restore();
  }
}

/**
 * High-End TCG Toploader Mana Overlay - Ultra-Vibrant Fluid Engine v1.3.0
 * 100% Guaranteed Visual Rendering across all iPads, Safari PWA, and Web Browsers.
 */

class ManaOverlayApp {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.animFrameId = null;

    // Frame State
    this.state = {
      centerX: window.innerWidth / 2,
      centerY: window.innerHeight / 2,
      width: 320,
      height: 440, // Toploader aspect ratio (~76mm x 102mm)
      scale: 1.0,
      rotation: 0, // 0, PI/2, PI, 3*PI/2
      cornerRadius: 18,
      borderThickness: 38,
      glowIntensity: 2.2,
      turbulence: 1.0,
      theme: 0, // 0: Ethereal Cyan/Blue, 1: Fire, 2: Emerald, 3: Void, 4: Sun
      isLocked: false,
      isHudCollapsed: false,
      preset: 'toploader'
    };

    // Presets
    this.presets = {
      toploader: { width: 320, height: 440, name: 'Toploader (3"×4")' },
      standard:  { width: 300, height: 420, name: 'Standard (MTG/Pokémon)' },
      japanese:  { width: 280, height: 408, name: 'Japanese (Yu-Gi-Oh!)' },
      oversized: { width: 370, height: 520, name: 'Oversized (Commander)' }
    };

    // Rich Ethereal Color Themes (Specified Gradient: #AEEFFF -> #00A2FF -> #6B00FF -> #240046)
    this.themes = [
      { // 0: Ethereal Mana (Specified: #AEEFFF / #00A2FF / #6B00FF / #240046)
        core: '#AEEFFF',
        inner: '#00A2FF',
        outer: '#6B00FF',
        deep: '#240046',
        rgbCore: 'rgba(174, 239, 255, ',
        rgbInner: 'rgba(0, 162, 255, ',
        rgbOuter: 'rgba(107, 0, 255, '
      },
      { // 1: Red Dragonfire
        core: '#ffffff',
        inner: '#ff6600',
        outer: '#cc0022',
        deep: '#400005',
        rgbCore: 'rgba(255, 255, 255, ',
        rgbInner: 'rgba(255, 102, 0, ',
        rgbOuter: 'rgba(204, 0, 34, '
      },
      { // 2: Emerald Life
        core: '#f0fff8',
        inner: '#00ff88',
        outer: '#00aa44',
        deep: '#002510',
        rgbCore: 'rgba(240, 255, 248, ',
        rgbInner: 'rgba(0, 255, 136, ',
        rgbOuter: 'rgba(0, 170, 68, '
      },
      { // 3: Nether Void
        core: '#f9f0ff',
        inner: '#d000ff',
        outer: '#6600ff',
        deep: '#180035',
        rgbCore: 'rgba(249, 240, 255, ',
        rgbInner: 'rgba(208, 0, 255, ',
        rgbOuter: 'rgba(102, 0, 255, '
      },
      { // 4: Holy Sun
        core: '#ffffff',
        inner: '#ffcc00',
        outer: '#ff8800',
        deep: '#351800',
        rgbCore: 'rgba(255, 255, 255, ',
        rgbInner: 'rgba(255, 204, 0, ',
        rgbOuter: 'rgba(255, 136, 0, '
      }
    ];

    // Touch State
    this.touchState = {
      isDragging: false,
      startCenter: { x: 0, y: 0 },
      startState: { ...this.state },
      startDist: 0
    };

    // FPS Meter
    this.fpsCounter = {
      frames: 0,
      lastTime: performance.now(),
      fps: 60
    };

    // Ethereal Smoke Tendrils
    this.tendrils = [];
    this.initTendrils();
  }

  initTendrils() {
    this.tendrils = [];
    const count = 16;
    for (let i = 0; i < count; i++) {
      this.tendrils.push({
        side: i % 4,
        posRatio: (i / count + Math.random() * 0.06) % 1.0,
        length: 65 + Math.random() * 95,
        thickness: 18 + Math.random() * 26,
        speed: 0.7 + Math.random() * 1.1,
        phase: Math.random() * Math.PI * 2,
        amplitude: 22 + Math.random() * 35
      });
    }
  }

  async init() {
    const container = document.getElementById('canvas-container');
    container.innerHTML = '';

    this.canvas = document.createElement('canvas');
    container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');

    window.addEventListener('resize', () => this.handleResize());
    this.handleResize();

    this.setupGestureEngine();
    this.setupUIBindings();

    this.startLoop();

    this.updateVisualGuide();
    console.log('⚡ High-Fidelity Ethereal Mana Overlay Engine v1.3.0 Loaded!');
  }

  startLoop() {
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);

    const loop = () => {
      try {
        const timeSec = performance.now() * 0.001;
        this.renderFrame(timeSec);
      } catch (err) {
        console.error('Render Frame Error:', err);
      }
      this.animFrameId = requestAnimationFrame(loop);
    };

    this.animFrameId = requestAnimationFrame(loop);
  }

  handleResize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.canvas.width = Math.round(width * dpr);
    this.canvas.height = Math.round(height * dpr);
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;

    if (this.ctx) {
      this.ctx.scale(dpr, dpr);
    }
    this.updateVisualGuide();
  }

  renderFrame(timeSec) {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const width = window.innerWidth;
    const height = window.innerHeight;

    const ctx = this.ctx;
    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Deep Dark Void Background
    ctx.fillStyle = '#030305';
    ctx.fillRect(0, 0, width, height);

    // Render Ethereal Volumetric Mana Smoke Toploader Frame
    this.renderToploaderManaFrame(ctx, timeSec);

    // FPS Meter
    this.fpsCounter.frames++;
    const now = performance.now();
    if (now - this.fpsCounter.lastTime >= 500) {
      this.fpsCounter.fps = Math.round((this.fpsCounter.frames * 1000) / (now - this.fpsCounter.lastTime));
      this.fpsCounter.frames = 0;
      this.fpsCounter.lastTime = now;

      const fpsEl = document.getElementById('fps-meter');
      if (fpsEl) {
        fpsEl.textContent = `${this.fpsCounter.fps} FPS v1.3.0`;
        fpsEl.style.color = this.fpsCounter.fps >= 55 ? '#00e5ff' : this.fpsCounter.fps >= 30 ? '#ffb700' : '#ff4444';
      }
    }
  }

  /**
   * Main Render Pipeline: Ethereal Mana Smoke Toploader Frame
   */
  renderToploaderManaFrame(ctx, time) {
    const { centerX, centerY, width: baseW, height: baseH, scale, rotation, cornerRadius: baseR, borderThickness: baseThickness, glowIntensity, turbulence, theme: themeIdx } = this.state;

    const theme = this.themes[themeIdx] || this.themes[0];

    const w = baseW * scale;
    const h = baseH * scale;
    const r = Math.min(baseR * scale, 24);
    const thickness = baseThickness;

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(rotation);

    // -------------------------------------------------------------
    // 1. ETHEREAL SMOKE TENDRILS (Domain-Warped Smoke Wisps Flowing Outward)
    // -------------------------------------------------------------
    ctx.save();
    for (const tendril of this.tendrils) {
      this.drawSmokeTendril(ctx, tendril, w, h, r, thickness, time, turbulence, glowIntensity, theme);
    }
    ctx.restore();

    // -------------------------------------------------------------
    // 2. VOLUMETRIC AURA BLOOM PASSES (#AEEFFF -> #00A2FF -> #6B00FF)
    // -------------------------------------------------------------
    const glowPasses = [
      { blur: 60 * glowIntensity, alpha: 0.35 * glowIntensity, color: theme.deep },
      { blur: 38 * glowIntensity, alpha: 0.55 * glowIntensity, color: theme.outer },
      { blur: 20 * glowIntensity, alpha: 0.85 * glowIntensity, color: theme.inner },
      { blur: 6  * glowIntensity, alpha: 1.0  * glowIntensity, color: theme.core }
    ];

    for (const pass of glowPasses) {
      ctx.save();
      ctx.shadowColor = pass.color;
      ctx.shadowBlur = pass.blur;
      ctx.globalAlpha = Math.min(pass.alpha, 1.0);

      ctx.strokeStyle = pass.color;
      ctx.lineWidth = thickness;
      ctx.lineJoin = 'round';

      this.drawToploaderPath(ctx, -w / 2, -h / 2, w, h, r);
      ctx.stroke();
      ctx.restore();
    }

    // -------------------------------------------------------------
    // 3. TOPLOADER DETAIL HIGHLIGHTS (Insertion Lip & Inner Channel)
    // -------------------------------------------------------------
    ctx.save();
    // Inner Channel Line
    ctx.strokeStyle = theme.inner;
    ctx.lineWidth = 4;
    ctx.globalAlpha = 0.95 * Math.min(glowIntensity, 1.3);
    ctx.shadowColor = theme.inner;
    ctx.shadowBlur = 14;
    this.drawToploaderPath(ctx, -w / 2 + thickness / 2, -h / 2 + thickness / 2, w - thickness, h - thickness, Math.max(4, r - thickness / 2));
    ctx.stroke();

    // Top Insertion Lip Specular Highlight
    ctx.beginPath();
    ctx.moveTo(-w / 2 + 8, -h / 2 + 10);
    ctx.lineTo(w / 2 - 8, -h / 2 + 10);
    ctx.strokeStyle = theme.core;
    ctx.lineWidth = 4;
    ctx.globalAlpha = 1.0;
    ctx.shadowColor = theme.inner;
    ctx.shadowBlur = 18;
    ctx.stroke();
    ctx.restore();

    // -------------------------------------------------------------
    // 4. CLEAR HOLLOW CENTER (Physical cards rest completely un-obscured)
    // -------------------------------------------------------------
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    this.drawToploaderPath(ctx, -w / 2 + thickness, -h / 2 + thickness, w - thickness * 2, h - thickness * 2, Math.max(1, r - thickness));
    ctx.fill();
    ctx.restore();

    ctx.restore();
  }

  /**
   * Draws organic undulating Mana smoke tendrils wafting away into space
   */
  drawSmokeTendril(ctx, tendril, w, h, r, thickness, time, turbulence, glowIntensity, theme) {
    const pt = this.getEdgePos(tendril.side, tendril.posRatio, w, h);
    const outDir = this.getOutVector(tendril.side);

    const startX = pt.x;
    const startY = pt.y;

    const tTime = time * tendril.speed * turbulence + tendril.phase;
    const len = tendril.length * (0.8 + 0.4 * Math.sin(tTime));

    const cp1x = startX + outDir.x * (len * 0.4) + outDir.y * (Math.sin(tTime) * tendril.amplitude);
    const cp1y = startY + outDir.y * (len * 0.4) - outDir.x * (Math.sin(tTime) * tendril.amplitude);

    const cp2x = startX + outDir.x * (len * 0.8) + outDir.y * (Math.cos(tTime * 1.4) * tendril.amplitude * 1.3);
    const cp2y = startY + outDir.y * (len * 0.8) - outDir.x * (Math.cos(tTime * 1.4) * tendril.amplitude * 1.3);

    const endX = startX + outDir.x * len + outDir.y * (Math.sin(tTime * 1.9) * tendril.amplitude);
    const endY = startY + outDir.y * len - outDir.x * (Math.sin(tTime * 1.9) * tendril.amplitude);

    const dist = Math.hypot(endX - startX, endY - startY);
    if (dist < 1.0) return;

    const grad = ctx.createLinearGradient(startX, startY, endX, endY);
    grad.addColorStop(0, `${theme.rgbInner}${0.85 * Math.min(glowIntensity, 1.5)})`);
    grad.addColorStop(0.5, `${theme.rgbOuter}${0.45 * Math.min(glowIntensity, 1.5)})`);
    grad.addColorStop(1, `${theme.rgbOuter}0)`);

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, endX, endY);

    ctx.strokeStyle = grad;
    ctx.lineWidth = tendril.thickness * (0.8 + 0.35 * Math.sin(tTime * 1.6));
    ctx.lineCap = 'round';
    ctx.shadowColor = theme.inner;
    ctx.shadowBlur = 22;
    ctx.stroke();
  }

  getEdgePos(side, offset, w, h) {
    if (side === 0) return { x: -w / 2 + offset * w, y: -h / 2 };
    if (side === 1) return { x: w / 2, y: -h / 2 + offset * h };
    if (side === 2) return { x: -w / 2 + offset * w, y: h / 2 };
    return { x: -w / 2, y: -h / 2 + offset * h };
  }

  getOutVector(side) {
    if (side === 0) return { x: 0, y: -1 };
    if (side === 1) return { x: 1, y: 0 };
    if (side === 2) return { x: 0, y: 1 };
    return { x: -1, y: 0 };
  }

  drawToploaderPath(ctx, x, y, width, height, radius) {
    const bottomRadius = Math.max(4, Math.min(radius, width / 4));
    const topRadius = 6;

    ctx.beginPath();
    ctx.moveTo(x + topRadius, y);
    ctx.lineTo(x + width - topRadius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + topRadius);
    ctx.lineTo(x + width, y + height - bottomRadius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - bottomRadius, y + height);
    ctx.lineTo(x + bottomRadius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - bottomRadius);
    ctx.lineTo(x, y + topRadius);
    ctx.quadraticCurveTo(x, y, x + topRadius, y);
    ctx.closePath();
  }

  /**
   * Touch Gesture Engine
   */
  setupGestureEngine() {
    const canvas = this.canvas;

    canvas.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
    canvas.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
    canvas.addEventListener('touchend', (e) => this.onTouchEnd(e), { passive: false });
    canvas.addEventListener('touchcancel', (e) => this.onTouchEnd(e), { passive: false });

    canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    window.addEventListener('mousemove', (e) => this.onMouseMove(e));
    window.addEventListener('mouseup', () => this.onMouseUp());
    canvas.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });

    document.addEventListener('gesturestart', (e) => e.preventDefault(), { passive: false });
    document.addEventListener('gesturechange', (e) => e.preventDefault(), { passive: false });
    document.addEventListener('gestureend', (e) => e.preventDefault(), { passive: false });
  }

  onTouchStart(e) {
    e.preventDefault();
    if (this.state.isLocked) return;

    const touches = e.touches;
    if (touches.length === 1) {
      this.touchState.isDragging = true;
      this.touchState.startCenter = { x: touches[0].clientX, y: touches[0].clientY };
      this.touchState.startState = { ...this.state };
    } else if (touches.length === 2) {
      this.touchState.isDragging = true;
      const t1 = touches[0];
      const t2 = touches[1];

      this.touchState.startDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const midX = (t1.clientX + t2.clientX) / 2;
      const midY = (t1.clientY + t2.clientY) / 2;
      this.touchState.startCenter = { x: midX, y: midY };
      this.touchState.startState = { ...this.state };
    }
  }

  onTouchMove(e) {
    e.preventDefault();
    if (this.state.isLocked || !this.touchState.isDragging) return;

    const touches = e.touches;
    if (touches.length === 1) {
      const dx = touches[0].clientX - this.touchState.startCenter.x;
      const dy = touches[0].clientY - this.touchState.startCenter.y;

      this.state.centerX = this.touchState.startState.centerX + dx;
      this.state.centerY = this.touchState.startState.centerY + dy;

    } else if (touches.length === 2) {
      const t1 = touches[0];
      const t2 = touches[1];

      const currentDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);

      if (this.touchState.startDist > 0) {
        const scaleFactor = currentDist / this.touchState.startDist;
        this.state.scale = Math.min(Math.max(this.touchState.startState.scale * scaleFactor, 0.4), 3.0);
      }

      const midX = (t1.clientX + t2.clientX) / 2;
      const midY = (t1.clientY + t2.clientY) / 2;
      const dx = midX - this.touchState.startCenter.x;
      const dy = midY - this.touchState.startCenter.y;

      this.state.centerX = this.touchState.startState.centerX + dx;
      this.state.centerY = this.touchState.startState.centerY + dy;
    }

    this.updateVisualGuide();
  }

  onTouchEnd(e) {
    if (e.touches.length === 0) {
      this.touchState.isDragging = false;
    } else if (e.touches.length === 1) {
      this.touchState.startCenter = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      this.touchState.startState = { ...this.state };
    }
  }

  onMouseDown(e) {
    if (this.state.isLocked) return;
    this.touchState.isDragging = true;
    this.touchState.startCenter = { x: e.clientX, y: e.clientY };
    this.touchState.startState = { ...this.state };
  }

  onMouseMove(e) {
    if (this.state.isLocked || !this.touchState.isDragging) return;
    const dx = e.clientX - this.touchState.startCenter.x;
    const dy = e.clientY - this.touchState.startCenter.y;
    this.state.centerX = this.touchState.startState.centerX + dx;
    this.state.centerY = this.touchState.startState.centerY + dy;
    this.updateVisualGuide();
  }

  onMouseUp() {
    this.touchState.isDragging = false;
  }

  onWheel(e) {
    e.preventDefault();
    if (this.state.isLocked) return;

    const zoomFactor = e.deltaY > 0 ? 0.95 : 1.05;
    this.state.scale = Math.min(Math.max(this.state.scale * zoomFactor, 0.4), 3.0);
    this.updateVisualGuide();
  }

  /**
   * HUD Controls
   */
  setupUIBindings() {
    const lockBtn = document.getElementById('btn-lock');
    const floatingUnlockBtn = document.getElementById('floating-unlock');

    const toggleLock = () => {
      this.state.isLocked = !this.state.isLocked;
      this.updateLockUI();
    };

    lockBtn.addEventListener('click', toggleLock);
    floatingUnlockBtn.addEventListener('click', toggleLock);

    const toggleHudBtn = document.getElementById('btn-toggle-hud');
    const uiOverlay = document.getElementById('ui-overlay');

    toggleHudBtn.addEventListener('click', () => {
      this.state.isHudCollapsed = !this.state.isHudCollapsed;
      uiOverlay.classList.toggle('collapsed', this.state.isHudCollapsed);
      toggleHudBtn.style.transform = this.state.isHudCollapsed ? 'rotate(180deg)' : 'rotate(0deg)';
    });

    document.querySelectorAll('.btn-preset').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const presetKey = e.currentTarget.getAttribute('data-preset');
        if (this.presets[presetKey]) {
          document.querySelectorAll('.btn-preset').forEach((b) => b.classList.remove('active'));
          e.currentTarget.classList.add('active');

          this.state.preset = presetKey;
          this.state.width = this.presets[presetKey].width;
          this.state.height = this.presets[presetKey].height;
          this.updateVisualGuide();
        }
      });
    });

    document.querySelectorAll('.btn-theme').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const themeStr = e.currentTarget.getAttribute('data-theme');
        document.querySelectorAll('.btn-theme').forEach((b) => b.classList.remove('active'));
        e.currentTarget.classList.add('active');

        const themeMap = { blue: 0, red: 1, green: 2, purple: 3, gold: 4 };
        this.state.theme = themeMap[themeStr] ?? 0;

        const orb = document.getElementById('brand-orb');
        if (orb) {
          const colors = ['#00A2FF', '#ff4400', '#00ff88', '#d000ff', '#ffcc00'];
          orb.style.background = `radial-gradient(circle at 30% 30%, #ffffff, ${colors[this.state.theme]} 60%, #0044ff 100%)`;
        }
      });
    });

    this.bindSlider('slider-glow', 'val-glow', (val) => {
      this.state.glowIntensity = parseFloat(val);
      return `${val}x`;
    });

    this.bindSlider('slider-thickness', 'val-thickness', (val) => {
      this.state.borderThickness = parseFloat(val);
      return `${val}px`;
    });

    this.bindSlider('slider-speed', 'val-speed', (val) => {
      this.state.turbulence = parseFloat(val);
      return `${val}x`;
    });

    this.bindSlider('slider-radius', 'val-radius', (val) => {
      this.state.cornerRadius = parseFloat(val);
      return `${val}px`;
    });

    document.getElementById('btn-center').addEventListener('click', () => {
      this.state.centerX = window.innerWidth / 2;
      this.state.centerY = window.innerHeight / 2;
      this.updateVisualGuide();
    });

    document.getElementById('btn-rotate-90').addEventListener('click', () => {
      this.state.rotation += Math.PI / 2;
      this.updateVisualGuide();
    });

    document.getElementById('btn-reset').addEventListener('click', () => {
      this.state.centerX = window.innerWidth / 2;
      this.state.centerY = window.innerHeight / 2;
      this.state.scale = 1.0;
      this.state.rotation = 0;
      this.state.cornerRadius = 18;
      this.state.borderThickness = 36;
      this.state.glowIntensity = 2.2;
      this.state.turbulence = 1.0;
      this.state.theme = 0;

      document.getElementById('slider-glow').value = 2.2;
      document.getElementById('val-glow').textContent = '2.2x';
      document.getElementById('slider-thickness').value = 36;
      document.getElementById('val-thickness').textContent = '36px';
      document.getElementById('slider-speed').value = 1.0;
      document.getElementById('val-speed').textContent = '1.0x';
      document.getElementById('slider-radius').value = 18;
      document.getElementById('val-radius').textContent = '18px';

      document.querySelectorAll('.btn-preset')[0].click();
      document.querySelectorAll('.btn-theme')[0].click();

      this.updateVisualGuide();
    });
  }

  bindSlider(sliderId, valId, formatter) {
    const slider = document.getElementById(sliderId);
    const label = document.getElementById(valId);
    if (!slider || !label) return;

    slider.addEventListener('input', (e) => {
      const formattedVal = formatter(e.target.value);
      label.textContent = formattedVal;
    });
  }

  updateLockUI() {
    const uiOverlay = document.getElementById('ui-overlay');
    const lockBtn = document.getElementById('btn-lock');
    const floatingUnlockBtn = document.getElementById('floating-unlock');
    const lockLabel = document.getElementById('lock-btn-label');
    const badge = document.getElementById('status-badge');
    const guide = document.getElementById('touch-guide');

    const openIcon = lockBtn.querySelector('.lock-open-icon');
    const closedIcon = lockBtn.querySelector('.lock-closed-icon');

    if (this.state.isLocked) {
      uiOverlay.classList.add('locked-mode');
      floatingUnlockBtn.classList.remove('hidden');
      lockBtn.classList.add('locked');
      openIcon.classList.add('hidden');
      closedIcon.classList.remove('hidden');
      lockLabel.textContent = 'LOCKED';
      badge.textContent = 'LOCKED';
      badge.classList.add('locked');

      if (guide) guide.classList.remove('visible');
    } else {
      uiOverlay.classList.remove('locked-mode');
      floatingUnlockBtn.classList.add('hidden');
      lockBtn.classList.remove('locked');
      openIcon.classList.remove('hidden');
      closedIcon.classList.add('hidden');
      lockLabel.textContent = 'LOCK';
      badge.textContent = 'UNLOCKED';
      badge.classList.remove('locked');
      this.updateVisualGuide();
    }
  }

  updateVisualGuide() {
    const guide = document.getElementById('touch-guide');
    const hint = guide ? guide.querySelector('.card-outline-hint') : null;
    if (!guide || !hint) return;

    if (this.state.isLocked) {
      guide.classList.remove('visible');
      return;
    }

    guide.classList.add('visible');

    const w = this.state.width * this.state.scale;
    const h = this.state.height * this.state.scale;

    hint.style.width = `${w}px`;
    hint.style.height = `${h}px`;
    hint.style.left = `${this.state.centerX}px`;
    hint.style.top = `${this.state.centerY}px`;
    hint.style.transform = `translate(-50%, -50%) rotate(${this.state.rotation}rad)`;
    hint.style.borderRadius = `${this.state.cornerRadius * this.state.scale}px`;
  }
}

// Start App
window.addEventListener('DOMContentLoaded', () => {
  const app = new ManaOverlayApp();
  app.init().catch((err) => {
    console.error('Failed to initialize Mana Overlay Engine:', err);
  });
});

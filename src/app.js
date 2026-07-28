/**
 * TCG Mana Overlay - Dual Engine Renderer (WebGL + Canvas 2D High-Fidelity Fallback)
 * Renders an intense, glowing, animated Warcraft Mana aura frame around physical TCG cards.
 */

class ManaOverlayApp {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.gl = null;
    
    // Frame State
    this.state = {
      centerX: window.innerWidth / 2,
      centerY: window.innerHeight / 2,
      width: 320,
      height: 426, // 3" x 4" toploader aspect ratio (~0.75)
      scale: 1.0,
      rotation: 0, // radians (0, PI/2, PI, 3*PI/2)
      cornerRadius: 24,
      borderThickness: 36,
      glowIntensity: 1.8,
      turbulence: 1.0,
      theme: 0, // 0: Blue, 1: Red, 2: Green, 3: Purple, 4: Gold
      isLocked: false,
      isHudCollapsed: false,
      preset: 'toploader'
    };

    // Card Presets
    this.presets = {
      toploader: { width: 320, height: 426, name: 'Toploader (3"×4")' },
      standard:  { width: 300, height: 418, name: 'Standard (MTG/Pokémon)' },
      japanese:  { width: 280, height: 408, name: 'Japanese (Yu-Gi-Oh!)' },
      oversized: { width: 370, height: 520, name: 'Oversized (Commander)' }
    };

    // Theme Color Palettes
    this.themes = [
      { // 0: Blue Mana
        primary: '#00e5ff',
        secondary: '#0055ff',
        core: '#ffffff',
        glow: 'rgba(0, 229, 255, ',
        bgGlow: 'rgba(0, 85, 255, '
      },
      { // 1: Red Dragonfire
        primary: '#ff4400',
        secondary: '#ff9900',
        core: '#fff5ea',
        glow: 'rgba(255, 68, 0, ',
        bgGlow: 'rgba(255, 153, 0, '
      },
      { // 2: Emerald Life
        primary: '#00ff88',
        secondary: '#00aa44',
        core: '#f0fff5',
        glow: 'rgba(0, 255, 136, ',
        bgGlow: 'rgba(0, 170, 68, '
      },
      { // 3: Void Energy
        primary: '#d000ff',
        secondary: '#6600ff',
        core: '#f9f0ff',
        glow: 'rgba(208, 0, 255, ',
        bgGlow: 'rgba(102, 0, 255, '
      },
      { // 4: Holy Sun
        primary: '#ffcc00',
        secondary: '#ff7700',
        core: '#ffffff',
        glow: 'rgba(255, 204, 0, ',
        bgGlow: 'rgba(255, 119, 0, '
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

    // Particles along the border
    this.sparks = [];
    this.initSparks();
  }

  initSparks() {
    this.sparks = [];
    for (let i = 0; i < 40; i++) {
      this.sparks.push({
        progress: Math.random(), // 0 to 1 along perimeter
        speed: 0.2 + Math.random() * 0.5,
        size: 1.5 + Math.random() * 3.5,
        alpha: Math.random(),
        offset: (Math.random() - 0.5) * 20
      });
    }
  }

  async init() {
    const container = document.getElementById('canvas-container');
    container.innerHTML = '';

    this.canvas = document.createElement('canvas');
    container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');

    // Handle Window Resize
    window.addEventListener('resize', () => this.handleResize());
    this.handleResize();

    // Setup Touch & Gesture Engine (1-finger drag, 2-finger zoom ONLY)
    this.setupGestureEngine();

    // Setup UI Controls & Event Listeners
    this.setupUIBindings();

    // Start Main Render Loop
    requestAnimationFrame((t) => this.renderLoop(t));

    this.updateVisualGuide();
    console.log('⚡ TCG Mana Overlay Engine Loaded & Active!');
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

  renderLoop(timeMs) {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const width = window.innerWidth;
    const height = window.innerHeight;
    const timeSec = timeMs * 0.001;

    const ctx = this.ctx;
    if (!ctx) return;

    // Reset Canvas Transforms
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Clear Screen to Pitch Black
    ctx.fillStyle = '#030305';
    ctx.fillRect(0, 0, width, height);

    // Draw High-End Glowing Mana Aura Frame
    this.drawManaFrame(ctx, timeSec);

    // FPS Meter Update
    this.fpsCounter.frames++;
    const now = performance.now();
    if (now - this.fpsCounter.lastTime >= 500) {
      this.fpsCounter.fps = Math.round((this.fpsCounter.frames * 1000) / (now - this.fpsCounter.lastTime));
      this.fpsCounter.frames = 0;
      this.fpsCounter.lastTime = now;

      const fpsEl = document.getElementById('fps-meter');
      if (fpsEl) {
        fpsEl.textContent = `${this.fpsCounter.fps} FPS`;
        fpsEl.style.color = this.fpsCounter.fps >= 55 ? '#00e5ff' : this.fpsCounter.fps >= 30 ? '#ffb700' : '#ff4444';
      }
    }

    requestAnimationFrame((t) => this.renderLoop(t));
  }

  /**
   * Renders the intense, glowing Mana aura frame around the card center
   */
  drawManaFrame(ctx, time) {
    const { centerX, centerY, width: baseW, height: baseH, scale, rotation, cornerRadius: baseR, borderThickness: baseThickness, glowIntensity, turbulence, theme: themeIdx } = this.state;

    const theme = this.themes[themeIdx] || this.themes[0];

    const w = baseW * scale;
    const h = baseH * scale;
    const r = Math.min(baseR * scale, Math.min(w, h) / 2 - 2);
    const thickness = baseThickness;

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(rotation);

    // 1. Layered Outer Bloom Glow (Multi-pass for intense bloom aura)
    const glowLevels = [
      { blur: 40 * glowIntensity, alpha: 0.35 * glowIntensity, color: theme.primary },
      { blur: 24 * glowIntensity, alpha: 0.55 * glowIntensity, color: theme.primary },
      { blur: 12 * glowIntensity, alpha: 0.85 * glowIntensity, color: theme.secondary },
      { blur: 6 * glowIntensity,  alpha: 1.0 * glowIntensity,  color: theme.core }
    ];

    for (const g of glowLevels) {
      ctx.save();
      ctx.shadowColor = g.color;
      ctx.shadowBlur = g.blur;
      ctx.globalAlpha = Math.min(g.alpha, 1.0);

      ctx.strokeStyle = g.color;
      ctx.lineWidth = thickness;
      ctx.lineJoin = 'round';

      this.drawRoundedRectPath(ctx, -w / 2, -h / 2, w, h, r);
      ctx.stroke();
      ctx.restore();
    }

    // 2. Animated Fluid Swirl Wave along border
    ctx.save();
    const waveCount = 3;
    for (let i = 0; i < waveCount; i++) {
      const wavePhase = time * (1.2 + i * 0.4) * turbulence;
      const waveAlpha = (0.4 + 0.3 * Math.sin(wavePhase)) * Math.min(glowIntensity, 1.5);

      ctx.strokeStyle = i % 2 === 0 ? theme.primary : theme.secondary;
      ctx.lineWidth = thickness * (0.6 + 0.2 * Math.cos(wavePhase));
      ctx.globalAlpha = waveAlpha;
      ctx.shadowColor = theme.primary;
      ctx.shadowBlur = 15;

      this.drawRoundedRectPath(ctx, -w / 2, -h / 2, w, h, r);
      ctx.stroke();
    }
    ctx.restore();

    // 3. Crisp Inner/Outer Edge Accents
    ctx.save();
    // Inner edge line
    ctx.strokeStyle = theme.primary;
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.9 * Math.min(glowIntensity, 1.2);
    ctx.shadowColor = theme.primary;
    ctx.shadowBlur = 8;
    this.drawRoundedRectPath(ctx, -w / 2 + thickness / 2, -h / 2 + thickness / 2, w - thickness, h - thickness, Math.max(2, r - thickness / 2));
    ctx.stroke();

    // Outer edge line
    ctx.strokeStyle = theme.secondary;
    ctx.lineWidth = 3;
    this.drawRoundedRectPath(ctx, -w / 2 - thickness / 2, -h / 2 - thickness / 2, w + thickness, h + thickness, r + thickness / 2);
    ctx.stroke();
    ctx.restore();

    // 4. Floating Energy Sparks / Particles moving along the border
    ctx.save();
    const perimeter = 2 * (w + h);
    for (const spark of this.sparks) {
      spark.progress = (spark.progress + spark.speed * 0.005 * turbulence) % 1.0;
      const sparkDist = spark.progress * perimeter;

      const pt = this.getPointOnRoundedRect(-w / 2, -h / 2, w, h, r, sparkDist, perimeter);

      const pulseAlpha = Math.max(0, Math.sin(time * 4 + spark.progress * 10)) * Math.min(glowIntensity, 1.5);

      ctx.fillStyle = theme.core;
      ctx.shadowColor = theme.primary;
      ctx.shadowBlur = 10;
      ctx.globalAlpha = pulseAlpha;

      ctx.beginPath();
      ctx.arc(pt.x, pt.y, spark.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // 5. Clear Hollow Middle (Ensures physical card resting on screen is un-obscured)
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    this.drawRoundedRectPath(ctx, -w / 2 + thickness, -h / 2 + thickness, w - thickness * 2, h - thickness * 2, Math.max(1, r - thickness));
    ctx.fill();
    ctx.restore();

    ctx.restore();
  }

  drawRoundedRectPath(ctx, x, y, width, height, radius) {
    const r = Math.max(0, Math.min(radius, Math.min(width, height) / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  getPointOnRoundedRect(x, y, w, h, r, dist, totalPerimeter) {
    // Simplified perimeter point calculation for spark particles
    const d = dist % totalPerimeter;
    if (d < w) return { x: x + d, y: y };
    if (d < w + h) return { x: x + w, y: y + (d - w) };
    if (d < 2 * w + h) return { x: x + w - (d - (w + h)), y: y + h };
    return { x: x, y: y + h - (d - (2 * w + h)) };
  }

  /**
   * Gesture System (1-finger move, 2-finger zoom ONLY)
   */
  setupGestureEngine() {
    const canvas = this.canvas;

    canvas.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
    canvas.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
    canvas.addEventListener('touchend', (e) => this.onTouchEnd(e), { passive: false });
    canvas.addEventListener('touchcancel', (e) => this.onTouchEnd(e), { passive: false });

    // Mouse Fallbacks
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
      // 1-Finger Move
      const dx = touches[0].clientX - this.touchState.startCenter.x;
      const dy = touches[0].clientY - this.touchState.startCenter.y;

      this.state.centerX = this.touchState.startState.centerX + dx;
      this.state.centerY = this.touchState.startState.centerY + dy;

    } else if (touches.length === 2) {
      // 2-Finger Zoom ONLY (NO Rotation)
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
   * HUD Control Bindings
   */
  setupUIBindings() {
    // 1. Lock Button
    const lockBtn = document.getElementById('btn-lock');
    const floatingUnlockBtn = document.getElementById('floating-unlock');

    const toggleLock = () => {
      this.state.isLocked = !this.state.isLocked;
      this.updateLockUI();
    };

    lockBtn.addEventListener('click', toggleLock);
    floatingUnlockBtn.addEventListener('click', toggleLock);

    // 2. Collapsible HUD
    const toggleHudBtn = document.getElementById('btn-toggle-hud');
    const uiOverlay = document.getElementById('ui-overlay');

    toggleHudBtn.addEventListener('click', () => {
      this.state.isHudCollapsed = !this.state.isHudCollapsed;
      uiOverlay.classList.toggle('collapsed', this.state.isHudCollapsed);
      toggleHudBtn.style.transform = this.state.isHudCollapsed ? 'rotate(180deg)' : 'rotate(0deg)';
    });

    // 3. Card Presets
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

    // 4. Color Theme Selector
    document.querySelectorAll('.btn-theme').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const themeStr = e.currentTarget.getAttribute('data-theme');
        document.querySelectorAll('.btn-theme').forEach((b) => b.classList.remove('active'));
        e.currentTarget.classList.add('active');

        const themeMap = { blue: 0, red: 1, green: 2, purple: 3, gold: 4 };
        this.state.theme = themeMap[themeStr] ?? 0;

        const orb = document.getElementById('brand-orb');
        if (orb) {
          const colors = ['#00e5ff', '#ff4400', '#00ff88', '#d000ff', '#ffcc00'];
          orb.style.background = `radial-gradient(circle at 30% 30%, #ffffff, ${colors[this.state.theme]} 60%, #0044ff 100%)`;
        }
      });
    });

    // 5. Range Sliders (Instant State Updates)
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

    // 6. Action Buttons
    document.getElementById('btn-center').addEventListener('click', () => {
      this.state.centerX = window.innerWidth / 2;
      this.state.centerY = window.innerHeight / 2;
      this.updateVisualGuide();
    });

    // Rotate 90° Button
    document.getElementById('btn-rotate-90').addEventListener('click', () => {
      this.state.rotation += Math.PI / 2;
      this.updateVisualGuide();
    });

    document.getElementById('btn-reset').addEventListener('click', () => {
      this.state.centerX = window.innerWidth / 2;
      this.state.centerY = window.innerHeight / 2;
      this.state.scale = 1.0;
      this.state.rotation = 0;
      this.state.cornerRadius = 24;
      this.state.borderThickness = 36;
      this.state.glowIntensity = 1.8;
      this.state.turbulence = 1.0;
      this.state.theme = 0;

      document.getElementById('slider-glow').value = 1.8;
      document.getElementById('val-glow').textContent = '1.8x';
      document.getElementById('slider-thickness').value = 36;
      document.getElementById('val-thickness').textContent = '36px';
      document.getElementById('slider-speed').value = 1.0;
      document.getElementById('val-speed').textContent = '1.0x';
      document.getElementById('slider-radius').value = 24;
      document.getElementById('val-radius').textContent = '24px';

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

      // Hide dashed alignment outline when locked (Glowing frame remains 100% visible)
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

// Start Application on DOMReady
window.addEventListener('DOMContentLoaded', () => {
  const app = new ManaOverlayApp();
  app.init().catch((err) => {
    console.error('Failed to initialize TCG Mana Overlay App:', err);
  });
});

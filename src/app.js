/**
 * High-End TCG Toploader Liquid Mana Overlay
 * Inspired by World of Warcraft & Manacards Ethereal Fluid Aesthetics
 */

class ManaOverlayApp {
  constructor() {
    this.canvas = null;
    this.ctx = null;

    // Frame State
    this.state = {
      centerX: window.innerWidth / 2,
      centerY: window.innerHeight / 2,
      width: 320,
      height: 446, // Toploader aspect ratio (~3" x 4.25")
      scale: 1.0,
      rotation: 0, // 90° increments
      cornerRadius: 18,
      borderThickness: 36,
      glowIntensity: 2.0,
      turbulence: 1.2,
      theme: 0, // 0: Blue Mana, 1: Red Fire, 2: Emerald Green, 3: Nether Void, 4: Holy Sun
      isLocked: false,
      isHudCollapsed: false,
      preset: 'toploader'
    };

    // Presets
    this.presets = {
      toploader: { width: 320, height: 446, name: 'Toploader (3"×4")' },
      standard:  { width: 300, height: 420, name: 'Standard (MTG/Pokémon)' },
      japanese:  { width: 280, height: 408, name: 'Japanese (Yu-Gi-Oh!)' },
      oversized: { width: 370, height: 520, name: 'Oversized (Commander)' }
    };

    // Color Palettes (Rich Warcraft & Manacards Ethereal Tones)
    this.themes = [
      { // 0: Blue Mana (Bild 2 Manacards)
        primary: '#00f2ff',
        secondary: '#0066ff',
        dark: '#001845',
        core: '#ffffff',
        tendril: 'rgba(0, 242, 255, ',
        particle: '#70e0ff'
      },
      { // 1: Red Dragonfire
        primary: '#ff4400',
        secondary: '#ff9900',
        dark: '#4a0000',
        core: '#fff8ee',
        tendril: 'rgba(255, 120, 0, ',
        particle: '#ffb700'
      },
      { // 2: Emerald Life
        primary: '#00ffaa',
        secondary: '#00aa44',
        dark: '#003311',
        core: '#f0fff8',
        tendril: 'rgba(0, 255, 170, ',
        particle: '#70ffcc'
      },
      { // 3: Void Energy
        primary: '#d000ff',
        secondary: '#6600ff',
        dark: '#200040',
        core: '#f9f0ff',
        tendril: 'rgba(208, 0, 255, ',
        particle: '#e080ff'
      },
      { // 4: Holy Sun
        primary: '#ffcc00',
        secondary: '#ff8800',
        dark: '#4a2800',
        core: '#ffffff',
        tendril: 'rgba(255, 204, 0, ',
        particle: '#ffe066'
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

    // Ethereal Mana Tendrils (Wisps wafting away like Bild 2)
    this.tendrils = [];
    this.initTendrils();

    // Floating Arcane Dust Particles
    this.particles = [];
    this.initParticles();
  }

  initTendrils() {
    this.tendrils = [];
    const count = 18; // 18 flowing smoke wisps around the perimeter
    for (let i = 0; i < count; i++) {
      this.tendrils.push({
        side: i % 4, // 0: Top, 1: Right, 2: Bottom, 3: Left
        posRatio: (i / count + Math.random() * 0.05) % 1.0, // position along side
        length: 60 + Math.random() * 90, // tendril length extending outward
        speed: 0.8 + Math.random() * 1.2,
        phase: Math.random() * Math.PI * 2,
        width: 12 + Math.random() * 24,
        curl: (Math.random() - 0.5) * 40
      });
    }
  }

  initParticles() {
    this.particles = [];
    for (let i = 0; i < 60; i++) {
      this.particles.push({
        x: 0,
        y: 0,
        vx: (Math.random() - 0.5) * 1.2,
        vy: (Math.random() - 0.5) * 1.2,
        life: Math.random(),
        maxLife: 1.5 + Math.random() * 2.5,
        size: 1.5 + Math.random() * 3.5,
        side: Math.floor(Math.random() * 4),
        sideOffset: Math.random()
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

    requestAnimationFrame((t) => this.renderLoop(t));

    this.updateVisualGuide();
    console.log('⚡ Toploader Liquid Mana Overlay Engine Initialized!');
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

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Dark Void Background
    ctx.fillStyle = '#030305';
    ctx.fillRect(0, 0, width, height);

    // Render Liquid Mana Overlay Frame & Ethereal Flow
    this.renderToploaderMana(ctx, timeSec);

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
   * Main Render Pipeline for Toploader Shape + Liquid Mana Wisps
   */
  renderToploaderMana(ctx, time) {
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
    // 1. ETHEREAL MANA TENDRILS (Smoke Wisps Flowing Outward - Bild 2)
    // -------------------------------------------------------------
    ctx.save();
    for (const tendril of this.tendrils) {
      this.drawEtherealTendril(ctx, tendril, w, h, r, thickness, time, turbulence, glowIntensity, theme);
    }
    ctx.restore();

    // -------------------------------------------------------------
    // 2. TOPLOADER PLASTIC FRAME SHAPE (Multi-Pass Bloom Glow)
    // -------------------------------------------------------------
    const glowPasses = [
      { blur: 48 * glowIntensity, alpha: 0.25 * glowIntensity, color: theme.secondary },
      { blur: 28 * glowIntensity, alpha: 0.45 * glowIntensity, color: theme.primary },
      { blur: 14 * glowIntensity, alpha: 0.75 * glowIntensity, color: theme.primary },
      { blur: 4  * glowIntensity, alpha: 1.0  * glowIntensity, color: theme.core }
    ];

    for (const pass of glowPasses) {
      ctx.save();
      ctx.shadowColor = pass.color;
      ctx.shadowBlur = pass.blur;
      ctx.globalAlpha = Math.min(pass.alpha, 1.0);

      ctx.strokeStyle = pass.color;
      ctx.lineWidth = thickness;
      ctx.lineJoin = 'round';

      // Draw Toploader Path (Rounded bottom corners, open lip top)
      this.drawToploaderPath(ctx, -w / 2, -h / 2, w, h, r);
      ctx.stroke();
      ctx.restore();
    }

    // -------------------------------------------------------------
    // 3. TOPLOADER DETAIL HIGHLIGHTS (Opening Lip & Inner Channel)
    // -------------------------------------------------------------
    ctx.save();
    // Inner Channel Guide Line
    ctx.strokeStyle = theme.primary;
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.9 * Math.min(glowIntensity, 1.3);
    ctx.shadowColor = theme.primary;
    ctx.shadowBlur = 10;
    this.drawToploaderPath(ctx, -w / 2 + thickness / 2, -h / 2 + thickness / 2, w - thickness, h - thickness, Math.max(4, r - thickness / 2));
    ctx.stroke();

    // Toploader Top Insertion Lip Highlight (The distinct opening line of a physical toploader)
    ctx.beginPath();
    ctx.moveTo(-w / 2 + 8, -h / 2 + 10);
    ctx.lineTo(w / 2 - 8, -h / 2 + 10);
    ctx.strokeStyle = theme.core;
    ctx.lineWidth = 4;
    ctx.globalAlpha = 0.95;
    ctx.shadowColor = theme.primary;
    ctx.shadowBlur = 12;
    ctx.stroke();
    ctx.restore();

    // -------------------------------------------------------------
    // 4. FLOATING ARCANE DUST PARTICLES (Drifting off edges)
    // -------------------------------------------------------------
    ctx.save();
    for (const p of this.particles) {
      p.life += 0.016 * turbulence;
      if (p.life > p.maxLife) {
        p.life = 0;
        p.side = Math.floor(Math.random() * 4);
        p.sideOffset = Math.random();
      }

      // Calculate anchor point on Toploader edge
      let originX = 0, originY = 0, dirX = 0, dirY = 0;
      if (p.side === 0) { // Top edge
        originX = -w / 2 + p.sideOffset * w;
        originY = -h / 2;
        dirY = -1; dirX = (Math.random() - 0.5) * 0.8;
      } else if (p.side === 1) { // Right edge
        originX = w / 2;
        originY = -h / 2 + p.sideOffset * h;
        dirX = 1; dirY = (Math.random() - 0.5) * 0.8;
      } else if (p.side === 2) { // Bottom edge
        originX = -w / 2 + p.sideOffset * w;
        originY = h / 2;
        dirY = 1; dirX = (Math.random() - 0.5) * 0.8;
      } else { // Left edge
        originX = -w / 2;
        originY = -h / 2 + p.sideOffset * h;
        dirX = -1; dirY = (Math.random() - 0.5) * 0.8;
      }

      const dist = p.life * 45;
      const px = originX + dirX * dist + Math.sin(time * 3 + p.sideOffset * 10) * 8;
      const py = originY + dirY * dist + Math.cos(time * 3 + p.sideOffset * 10) * 8;

      const pAlpha = (1.0 - p.life / p.maxLife) * Math.min(glowIntensity, 1.4);

      ctx.fillStyle = theme.core;
      ctx.shadowColor = theme.primary;
      ctx.shadowBlur = 12;
      ctx.globalAlpha = Math.max(0, pAlpha);

      ctx.beginPath();
      ctx.arc(px, py, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // -------------------------------------------------------------
    // 5. CLEAR HOLLOW CENTER (Cards rest cleanly without backlighting)
    // -------------------------------------------------------------
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    this.drawToploaderPath(ctx, -w / 2 + thickness, -h / 2 + thickness, w - thickness * 2, h - thickness * 2, Math.max(1, r - thickness));
    ctx.fill();
    ctx.restore();

    ctx.restore();
  }

  /**
   * Draws a smooth, undulating ethereal Mana tendril wafting outward from the border (Bild 2 style)
   */
  drawEtherealTendril(ctx, tendril, w, h, r, thickness, time, turbulence, glowIntensity, theme) {
    let startX = 0, startY = 0;
    let outAngle = 0;

    // Anchor position along the 4 Toploader edges
    if (tendril.side === 0) { // Top
      startX = -w / 2 + tendril.posRatio * w;
      startY = -h / 2;
      outAngle = -Math.PI / 2;
    } else if (tendril.side === 1) { // Right
      startX = w / 2;
      startY = -h / 2 + tendril.posRatio * h;
      outAngle = 0;
    } else if (tendril.side === 2) { // Bottom
      startX = -w / 2 + tendril.posRatio * w;
      startY = h / 2;
      outAngle = Math.PI / 2;
    } else { // Left
      startX = -w / 2;
      startY = -h / 2 + tendril.posRatio * h;
      outAngle = Math.PI;
    }

    const tTime = time * tendril.speed * turbulence + tendril.phase;
    const len = tendril.length * (0.8 + 0.4 * Math.sin(tTime));

    // Calculate undulating curve control points
    const cp1x = startX + Math.cos(outAngle) * (len * 0.4) + Math.sin(tTime) * tendril.curl;
    const cp1y = startY + Math.sin(outAngle) * (len * 0.4) + Math.cos(tTime) * tendril.curl;

    const cp2x = startX + Math.cos(outAngle) * (len * 0.8) + Math.cos(tTime * 1.5) * (tendril.curl * 1.4);
    const cp2y = startY + Math.sin(outAngle) * (len * 0.8) + Math.sin(tTime * 1.5) * (tendril.curl * 1.4);

    const endX = startX + Math.cos(outAngle) * len + Math.sin(tTime * 2) * tendril.curl;
    const endY = startY + Math.sin(outAngle) * len + Math.cos(tTime * 2) * tendril.curl;

    // Gradient fade outward
    const grad = ctx.createLinearGradient(startX, startY, endX, endY);
    grad.addColorStop(0, `${theme.tendril}${0.8 * Math.min(glowIntensity, 1.5)})`);
    grad.addColorStop(0.5, `${theme.tendril}${0.4 * Math.min(glowIntensity, 1.5)})`);
    grad.addColorStop(1, `${theme.tendril}0)`);

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, endX, endY);

    ctx.strokeStyle = grad;
    ctx.lineWidth = tendril.width * (0.8 + 0.3 * Math.sin(tTime * 2));
    ctx.lineCap = 'round';
    ctx.shadowColor = theme.primary;
    ctx.shadowBlur = 18;
    ctx.stroke();
  }

  /**
   * Exact Toploader Outer Path (Rounded bottom corners, clean top insertion lip)
   */
  drawToploaderPath(ctx, x, y, width, height, radius) {
    const bottomRadius = Math.max(4, Math.min(radius, width / 4));
    const topRadius = 6; // Slight top outer rounding

    ctx.beginPath();
    // Top Left corner
    ctx.moveTo(x + topRadius, y);
    // Top Edge (Insertion lip opening)
    ctx.lineTo(x + width - topRadius, y);
    // Top Right corner
    ctx.quadraticCurveTo(x + width, y, x + width, y + topRadius);
    // Right Edge
    ctx.lineTo(x + width, y + height - bottomRadius);
    // Bottom Right Rounded Corner
    ctx.quadraticCurveTo(x + width, y + height, x + width - bottomRadius, y + height);
    // Bottom Edge
    ctx.lineTo(x + bottomRadius, y + height);
    // Bottom Left Rounded Corner
    ctx.quadraticCurveTo(x, y + height, x, y + height - bottomRadius);
    // Left Edge
    ctx.lineTo(x, y + topRadius);
    // Top Left Corner
    ctx.quadraticCurveTo(x, y, x + topRadius, y);
    ctx.closePath();
  }

  /**
   * Touch Gesture Engine (1-finger drag, 2-finger pinch zoom ONLY)
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
          const colors = ['#00e5ff', '#ff4400', '#00ff88', '#d000ff', '#ffcc00'];
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
      this.state.glowIntensity = 2.0;
      this.state.turbulence = 1.2;
      this.state.theme = 0;

      document.getElementById('slider-glow').value = 2.0;
      document.getElementById('val-glow').textContent = '2.0x';
      document.getElementById('slider-thickness').value = 36;
      document.getElementById('val-thickness').textContent = '36px';
      document.getElementById('slider-speed').value = 1.2;
      document.getElementById('val-speed').textContent = '1.2x';
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

// Start Application
window.addEventListener('DOMContentLoaded', () => {
  const app = new ManaOverlayApp();
  app.init().catch((err) => {
    console.error('Failed to initialize Toploader Mana Overlay App:', err);
  });
});

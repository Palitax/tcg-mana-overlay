/**
 * High-End TCG Toploader Overlay - Viscous Liquid Mana Engine
 * Simulates thick, glowing, viscous liquid mana (no glitter stars)
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
      height: 446,
      scale: 1.0,
      rotation: 0,
      cornerRadius: 18,
      borderThickness: 38,
      glowIntensity: 2.2,
      turbulence: 1.0,
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

    // Viscous Liquid Theme Color Palettes
    this.themes = [
      { // 0: Viscous Blue Mana Potion Fluid
        primary: '#00e5ff',
        secondary: '#0055ff',
        dark: '#001845',
        deep: '#000a20',
        core: '#ffffff',
        liquidRibbon: 'rgba(0, 229, 255, ',
        liquidBlob: '#00c8ff'
      },
      { // 1: Viscous Molten Dragon Lava
        primary: '#ff4400',
        secondary: '#ff9900',
        dark: '#4a0000',
        deep: '#200000',
        core: '#fff8ee',
        liquidRibbon: 'rgba(255, 68, 0, ',
        liquidBlob: '#ff7700'
      },
      { // 2: Viscous Emerald Poison / Life Nectar
        primary: '#00ff88',
        secondary: '#00aa44',
        dark: '#003311',
        deep: '#001a08',
        core: '#f0fff8',
        liquidRibbon: 'rgba(0, 255, 136, ',
        liquidBlob: '#00dd66'
      },
      { // 3: Viscous Nether Void Fluid
        primary: '#d000ff',
        secondary: '#6600ff',
        dark: '#200040',
        deep: '#100020',
        core: '#f9f0ff',
        liquidRibbon: 'rgba(208, 0, 255, ',
        liquidBlob: '#b800ff'
      },
      { // 4: Viscous Solar Gold Liquid
        primary: '#ffcc00',
        secondary: '#ff8800',
        dark: '#4a2800',
        deep: '#201000',
        core: '#ffffff',
        liquidRibbon: 'rgba(255, 204, 0, ',
        liquidBlob: '#ffbb00'
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

    // Viscous Liquid Streams & Floating Liquid Blobs (NO STARS / NO GLITTER)
    this.liquidStreams = [];
    this.liquidBlobs = [];
    this.initViscousLiquidEngine();
  }

  initViscousLiquidEngine() {
    // 1. Heavy Liquid Streams (Undulating thick fluid ribbons around the frame)
    this.liquidStreams = [];
    for (let i = 0; i < 14; i++) {
      this.liquidStreams.push({
        side: i % 4,
        posRatio: (i / 14 + Math.random() * 0.08) % 1.0,
        length: 50 + Math.random() * 80,
        thickness: 18 + Math.random() * 28,
        speed: 0.6 + Math.random() * 0.8,
        phase: Math.random() * Math.PI * 2,
        viscosity: 25 + Math.random() * 35
      });
    }

    // 2. Viscous Liquid Blobs / Droplets oozing smoothly along edges
    this.liquidBlobs = [];
    for (let i = 0; i < 30; i++) {
      this.liquidBlobs.push({
        side: Math.floor(Math.random() * 4),
        posRatio: Math.random(),
        dist: Math.random() * 40,
        rx: 12 + Math.random() * 22,
        ry: 8 + Math.random() * 16,
        speed: 0.3 + Math.random() * 0.6,
        phase: Math.random() * Math.PI * 2,
        wobbleFreq: 1.5 + Math.random() * 2
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
    console.log('⚡ Viscous Liquid Mana Engine Initialized!');
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

    // Deep Dark Void Background
    ctx.fillStyle = '#030305';
    ctx.fillRect(0, 0, width, height);

    // Render Viscous Liquid Mana Toploader
    this.renderViscousManaToploader(ctx, timeSec);

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
   * Main Render Pipeline: Viscous Liquid Fluid Engine
   */
  renderViscousManaToploader(ctx, time) {
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
    // 1. HEAVY LIQUID STREAM RIBBONS (Thick fluid oozing outward)
    // -------------------------------------------------------------
    ctx.save();
    for (const stream of this.liquidStreams) {
      this.drawViscousFluidStream(ctx, stream, w, h, r, thickness, time, turbulence, glowIntensity, theme);
    }
    ctx.restore();

    // -------------------------------------------------------------
    // 2. VISCOUS LIQUID BLOBS & DROPLETS (Fluid surface tension oozing)
    // -------------------------------------------------------------
    ctx.save();
    for (const blob of this.liquidBlobs) {
      blob.posRatio = (blob.posRatio + blob.speed * 0.003 * turbulence) % 1.0;
      const pt = this.getEdgePos(blob.side, blob.posRatio, w, h);
      const outDir = this.getOutVector(blob.side);

      const wobble = Math.sin(time * blob.wobbleFreq + blob.phase) * 6;
      const bx = pt.x + outDir.x * (blob.dist + wobble);
      const by = pt.y + outDir.y * (blob.dist + wobble);

      const radiusX = blob.rx * (0.9 + 0.2 * Math.sin(time * 2 + blob.phase));
      const radiusY = blob.ry * (0.9 + 0.2 * Math.cos(time * 2 + blob.phase));

      const blobGrad = ctx.createRadialGradient(bx, by, 0, bx, by, Math.max(radiusX, radiusY));
      blobGrad.addColorStop(0, theme.core);
      blobGrad.addColorStop(0.4, theme.primary);
      blobGrad.addColorStop(0.85, theme.secondary);
      blobGrad.addColorStop(1, `${theme.secondary}0`);

      ctx.fillStyle = blobGrad;
      ctx.shadowColor = theme.primary;
      ctx.shadowBlur = 18 * glowIntensity;
      ctx.globalAlpha = 0.85 * Math.min(glowIntensity, 1.4);

      ctx.beginPath();
      ctx.ellipse(bx, by, radiusX, radiusY, time + blob.phase, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // -------------------------------------------------------------
    // 3. TOPLOADER BASE FRAME (Deep Fluid Sapphire Foundation)
    // -------------------------------------------------------------
    const glowPasses = [
      { blur: 50 * glowIntensity, alpha: 0.3 * glowIntensity, color: theme.secondary },
      { blur: 28 * glowIntensity, alpha: 0.55 * glowIntensity, color: theme.primary },
      { blur: 12 * glowIntensity, alpha: 0.85 * glowIntensity, color: theme.primary },
      { blur: 3  * glowIntensity, alpha: 1.0  * glowIntensity, color: theme.core }
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
    // 4. ANIMATED VISCOUS LIQUID SURFACE WAVE ALONG BORDER
    // -------------------------------------------------------------
    ctx.save();
    const waveCount = 3;
    for (let i = 0; i < waveCount; i++) {
      const wavePhase = time * (0.8 + i * 0.3) * turbulence;
      const waveAlpha = (0.5 + 0.3 * Math.sin(wavePhase)) * Math.min(glowIntensity, 1.5);

      ctx.strokeStyle = i % 2 === 0 ? theme.primary : theme.secondary;
      ctx.lineWidth = thickness * (0.7 + 0.25 * Math.cos(wavePhase));
      ctx.globalAlpha = waveAlpha;
      ctx.shadowColor = theme.primary;
      ctx.shadowBlur = 16;

      this.drawToploaderPath(ctx, -w / 2, -h / 2, w, h, r);
      ctx.stroke();
    }
    ctx.restore();

    // -------------------------------------------------------------
    // 5. TOPLOADER DETAIL HIGHLIGHTS (Insertion Lip & Inner Channel)
    // -------------------------------------------------------------
    ctx.save();
    // Inner channel line
    ctx.strokeStyle = theme.primary;
    ctx.lineWidth = 4;
    ctx.globalAlpha = 0.95 * Math.min(glowIntensity, 1.3);
    ctx.shadowColor = theme.primary;
    ctx.shadowBlur = 12;
    this.drawToploaderPath(ctx, -w / 2 + thickness / 2, -h / 2 + thickness / 2, w - thickness, h - thickness, Math.max(4, r - thickness / 2));
    ctx.stroke();

    // Top Insertion Lip Specular Highlight
    ctx.beginPath();
    ctx.moveTo(-w / 2 + 8, -h / 2 + 10);
    ctx.lineTo(w / 2 - 8, -h / 2 + 10);
    ctx.strokeStyle = theme.core;
    ctx.lineWidth = 4;
    ctx.globalAlpha = 1.0;
    ctx.shadowColor = theme.primary;
    ctx.shadowBlur = 16;
    ctx.stroke();
    ctx.restore();

    // -------------------------------------------------------------
    // 6. CLEAR HOLLOW CENTER (Cards rest un-obscured)
    // -------------------------------------------------------------
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    this.drawToploaderPath(ctx, -w / 2 + thickness, -h / 2 + thickness, w - thickness * 2, h - thickness * 2, Math.max(1, r - thickness));
    ctx.fill();
    ctx.restore();

    ctx.restore();
  }

  /**
   * Draws a thick, viscous liquid stream undulating away from the border
   */
  drawViscousFluidStream(ctx, stream, w, h, r, thickness, time, turbulence, glowIntensity, theme) {
    const pt = this.getEdgePos(stream.side, stream.posRatio, w, h);
    const outDir = this.getOutVector(stream.side);

    const startX = pt.x;
    const startY = pt.y;

    const sTime = time * stream.speed * turbulence + stream.phase;
    const len = stream.length * (0.85 + 0.3 * Math.sin(sTime));

    const cp1x = startX + outDir.x * (len * 0.4) + outDir.y * (Math.sin(sTime) * stream.viscosity);
    const cp1y = startY + outDir.y * (len * 0.4) - outDir.x * (Math.sin(sTime) * stream.viscosity);

    const cp2x = startX + outDir.x * (len * 0.8) + outDir.y * (Math.cos(sTime * 1.3) * stream.viscosity * 1.2);
    const cp2y = startY + outDir.y * (len * 0.8) - outDir.x * (Math.cos(sTime * 1.3) * stream.viscosity * 1.2);

    const endX = startX + outDir.x * len + outDir.y * (Math.sin(sTime * 1.8) * stream.viscosity);
    const endY = startY + outDir.y * len - outDir.x * (Math.sin(sTime * 1.8) * stream.viscosity);

    // Thick liquid gradient fade
    const grad = ctx.createLinearGradient(startX, startY, endX, endY);
    grad.addColorStop(0, `${theme.liquidRibbon}${0.9 * Math.min(glowIntensity, 1.5)})`);
    grad.addColorStop(0.5, `${theme.liquidRibbon}${0.5 * Math.min(glowIntensity, 1.5)})`);
    grad.addColorStop(1, `${theme.liquidRibbon}0)`);

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, endX, endY);

    ctx.strokeStyle = grad;
    ctx.lineWidth = stream.thickness * (0.8 + 0.35 * Math.sin(sTime * 1.5));
    ctx.lineCap = 'round';
    ctx.shadowColor = theme.primary;
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
      this.state.borderThickness = 38;
      this.state.glowIntensity = 2.2;
      this.state.turbulence = 1.0;
      this.state.theme = 0;

      document.getElementById('slider-glow').value = 2.2;
      document.getElementById('val-glow').textContent = '2.2x';
      document.getElementById('slider-thickness').value = 38;
      document.getElementById('val-thickness').textContent = '38px';
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

// Start Application
window.addEventListener('DOMContentLoaded', () => {
  const app = new ManaOverlayApp();
  app.init().catch((err) => {
    console.error('Failed to initialize Viscous Liquid Mana Engine:', err);
  });
});

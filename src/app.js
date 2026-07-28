import { vertexShaderSource, fragmentShaderSource } from './manaShader.js';

/**
 * TCG Mana Overlay - WebGL Render Engine & Touch Gesture System
 * Optimized for Apple iPad Safari standalone & Desktop WebGL
 */
class ManaOverlayApp {
  constructor() {
    this.canvas = null;
    this.gl = null;
    this.program = null;
    this.uniformLocations = {};
    this.positionBuffer = null;

    // Frame State
    this.state = {
      centerX: window.innerWidth / 2,
      centerY: window.innerHeight / 2,
      width: 320,
      height: 426, // 3" x 4" toploader aspect ratio (~0.75)
      scale: 1.0,
      rotation: 0, // radians (0, PI/2, PI, 3*PI/2)
      cornerRadius: 24,
      borderThickness: 32,
      glowIntensity: 1.4,
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

    // Touch Tracking
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
  }

  async init() {
    // 1. Setup Canvas & WebGL Context
    const container = document.getElementById('canvas-container');
    this.canvas = document.createElement('canvas');
    container.appendChild(this.canvas);

    this.gl = this.canvas.getContext('webgl', { antialias: true, alpha: true, powerPreference: 'high-performance' }) ||
              this.canvas.getContext('experimental-webgl');

    if (!this.gl) {
      console.error('WebGL is not supported on this browser/device.');
      return;
    }

    // 2. Compile WebGL Program & Shaders
    this.initWebGL();

    // 3. Setup Resize Handler
    window.addEventListener('resize', () => this.handleResize());
    this.handleResize();

    // 4. Setup Gesture Engine (No 2-finger rotation; zoom & move only!)
    this.setupGestureEngine();

    // 5. Wire HUD Controls
    this.setupUIBindings();

    // 6. Start Render Animation Loop
    requestAnimationFrame((t) => this.renderLoop(t));

    // Initial visual update
    this.updateVisualGuide();
    console.log('⚡ TCG Mana Overlay Engine Loaded Successfully!');
  }

  initWebGL() {
    const gl = this.gl;

    // Compile Vertex Shader
    const vertShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertShader, vertexShaderSource);
    gl.compileShader(vertShader);

    if (!gl.getShaderParameter(vertShader, gl.COMPILE_STATUS)) {
      console.error('Vertex Shader Compile Error:', gl.getShaderInfoLog(vertShader));
      return;
    }

    // Compile Fragment Shader
    const fragShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragShader, fragmentShaderSource);
    gl.compileShader(fragShader);

    if (!gl.getShaderParameter(fragShader, gl.COMPILE_STATUS)) {
      console.error('Fragment Shader Compile Error:', gl.getShaderInfoLog(fragShader));
      return;
    }

    // Create & Link Program
    this.program = gl.createProgram();
    gl.attachShader(this.program, vertShader);
    gl.attachShader(this.program, fragShader);
    gl.linkProgram(this.program);

    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
      console.error('Shader Link Error:', gl.getProgramInfoLog(this.program));
      return;
    }

    gl.useProgram(this.program);

    // Fullscreen Quad Geometry
    this.positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    const positions = new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
      -1,  1,
       1, -1,
       1,  1
    ]);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    const aPosition = gl.getAttribLocation(this.program, 'aPosition');
    gl.enableVertexAttribArray(aPosition);
    gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

    // Cache Uniform Locations
    this.uniformLocations = {
      uTime: gl.getUniformLocation(this.program, 'uTime'),
      uResolution: gl.getUniformLocation(this.program, 'uResolution'),
      uCenter: gl.getUniformLocation(this.program, 'uCenter'),
      uFrameSize: gl.getUniformLocation(this.program, 'uFrameSize'),
      uRotation: gl.getUniformLocation(this.program, 'uRotation'),
      uCornerRadius: gl.getUniformLocation(this.program, 'uCornerRadius'),
      uBorderThickness: gl.getUniformLocation(this.program, 'uBorderThickness'),
      uGlowIntensity: gl.getUniformLocation(this.program, 'uGlowIntensity'),
      uTurbulence: gl.getUniformLocation(this.program, 'uTurbulence'),
      uTheme: gl.getUniformLocation(this.program, 'uTheme')
    };

    // Enable Blending for Smooth Alpha Transparency
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  }

  handleResize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.canvas.width = Math.round(width * dpr);
    this.canvas.height = Math.round(height * dpr);
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;

    if (this.gl) {
      this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    }
    this.updateVisualGuide();
  }

  renderLoop(timeMs) {
    const gl = this.gl;
    if (!gl || !this.program) return;

    const timeSec = timeMs * 0.001;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const screenWidth = window.innerWidth * dpr;
    const screenHeight = window.innerHeight * dpr;

    gl.clearColor(0.01, 0.01, 0.02, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(this.program);

    // Pass Physical Pixel Uniforms to WebGL Shader
    gl.uniform1f(this.uniformLocations.uTime, timeSec);
    gl.uniform2f(this.uniformLocations.uResolution, screenWidth, screenHeight);
    gl.uniform2f(this.uniformLocations.uCenter, this.state.centerX * dpr, this.state.centerY * dpr);
    gl.uniform2f(
      this.uniformLocations.uFrameSize,
      this.state.width * this.state.scale * dpr,
      this.state.height * this.state.scale * dpr
    );
    gl.uniform1f(this.uniformLocations.uRotation, this.state.rotation);
    gl.uniform1f(this.uniformLocations.uCornerRadius, this.state.cornerRadius * this.state.scale * dpr);
    gl.uniform1f(this.uniformLocations.uBorderThickness, this.state.borderThickness * dpr);
    gl.uniform1f(this.uniformLocations.uGlowIntensity, this.state.glowIntensity);
    gl.uniform1f(this.uniformLocations.uTurbulence, this.state.turbulence);
    gl.uniform1i(this.uniformLocations.uTheme, this.state.theme);

    // Draw Fullscreen Quad
    gl.drawArrays(gl.TRIANGLES, 0, 6);

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
   * Touch Gesture Engine
   * Rule: 1-finger move, 2-finger zoom ONLY (NO 2-finger rotation).
   */
  setupGestureEngine() {
    const canvas = this.canvas;

    canvas.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
    canvas.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
    canvas.addEventListener('touchend', (e) => this.onTouchEnd(e), { passive: false });
    canvas.addEventListener('touchcancel', (e) => this.onTouchEnd(e), { passive: false });

    // Desktop Mouse Fallbacks
    canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    window.addEventListener('mousemove', (e) => this.onMouseMove(e));
    window.addEventListener('mouseup', () => this.onMouseUp());
    canvas.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });

    // Intercept default browser pinch/zoom gestures
    document.addEventListener('gesturestart', (e) => e.preventDefault(), { passive: false });
    document.addEventListener('gesturechange', (e) => e.preventDefault(), { passive: false });
    document.addEventListener('gestureend', (e) => e.preventDefault(), { passive: false });
  }

  onTouchStart(e) {
    e.preventDefault();
    if (this.state.isLocked) return;

    const touches = e.touches;
    if (touches.length === 1) {
      // 1-Finger Move Start
      this.touchState.isDragging = true;
      this.touchState.startCenter = { x: touches[0].clientX, y: touches[0].clientY };
      this.touchState.startState = { ...this.state };
    } else if (touches.length === 2) {
      // 2-Finger Zoom/Scale & Move Start (Rotation Disabled!)
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
      // 2-Finger Pinch Zoom ONLY (Rotation is NOT calculated here!)
      const t1 = touches[0];
      const t2 = touches[1];

      const currentDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);

      if (this.touchState.startDist > 0) {
        const scaleFactor = currentDist / this.touchState.startDist;
        this.state.scale = Math.min(Math.max(this.touchState.startState.scale * scaleFactor, 0.4), 3.0);
      }

      // Midpoint Translation
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

    // Scroll wheel adjusts scale
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

    // 3. Card Ratio Presets
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

    // 4. Color Theme Selector (Blue, Red, Green, Purple, Gold)
    document.querySelectorAll('.btn-theme').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const themeStr = e.currentTarget.getAttribute('data-theme');
        document.querySelectorAll('.btn-theme').forEach((b) => b.classList.remove('active'));
        e.currentTarget.classList.add('active');

        const themeMap = { blue: 0, red: 1, green: 2, purple: 3, gold: 4 };
        this.state.theme = themeMap[themeStr] ?? 0;

        // Update brand orb glow
        const orb = document.getElementById('brand-orb');
        if (orb) {
          const colors = ['#00e5ff', '#ff4400', '#00ff88', '#b000ff', '#ffcc00'];
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

    // Rotate 90° Button (Exact 90° rotation increments)
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
      this.state.borderThickness = 32;
      this.state.glowIntensity = 1.4;
      this.state.turbulence = 1.0;
      this.state.theme = 0;

      document.getElementById('slider-glow').value = 1.4;
      document.getElementById('val-glow').textContent = '1.4x';
      document.getElementById('slider-thickness').value = 32;
      document.getElementById('val-thickness').textContent = '32px';
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
      
      // HIDE the dashed alignment box when locked! (Glowing WebGL frame stays visible)
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
    console.error('Failed to initialize TCG Mana Overlay:', err);
  });
});

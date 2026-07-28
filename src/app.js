import { Application, Container, Graphics, Filter } from 'pixi.js';
import { vertexShader, fragmentShader } from './manaShader.js';

/**
 * TCG Mana Overlay - Main Application
 * Optimized for Apple iPad Safari standalone & Desktop WebGL
 */
class ManaOverlayApp {
  constructor() {
    this.app = null;
    this.filter = null;
    this.targetContainer = null;
    
    // Default Frame Transform State
    this.state = {
      centerX: window.innerWidth / 2,
      centerY: window.innerHeight / 2,
      width: 320,
      height: 426, // 3" x 4" toploader aspect ratio (~0.75)
      scale: 1.0,
      rotation: 0, // radians
      cornerRadius: 24,
      borderThickness: 32,
      glowIntensity: 1.4,
      turbulence: 1.0,
      theme: 0, // 0: Blue, 1: Red, 2: Green, 3: Purple, 4: Gold
      isLocked: false,
      isHudCollapsed: false,
      preset: 'toploader'
    };

    // Card Presets (Aspect ratios & base dimensions)
    this.presets = {
      toploader: { width: 320, height: 426, name: 'Toploader (3"×4")' },
      standard:  { width: 300, height: 418, name: 'Standard (MTG/Pokémon)' },
      japanese:  { width: 280, height: 408, name: 'Japanese (Yu-Gi-Oh!)' },
      oversized: { width: 370, height: 520, name: 'Oversized (Commander)' }
    };

    // Touch & Gesture Tracking
    this.touchState = {
      isDragging: false,
      activeTouches: new Map(),
      startCenter: { x: 0, y: 0 },
      startState: { ...this.state },
      startDist: 0,
      startAngle: 0
    };

    // FPS Counter variables
    this.fpsCounter = {
      frames: 0,
      lastTime: performance.now(),
      fps: 60
    };
  }

  async init() {
    // 1. Initialize PixiJS v8 Application
    const container = document.getElementById('canvas-container');
    
    // Explicitly set resolution (devicePixelRatio capped at 1.5 max for 60 FPS on Retina displays)
    const maxDpr = Math.min(window.devicePixelRatio || 1, 1.5);
    
    this.app = new Application();
    await this.app.init({
      resizeTo: window,
      resolution: maxDpr,
      autoDensity: true,
      antialias: true,
      backgroundColor: 0x030305,
      powerPreference: 'high-performance'
    });

    container.appendChild(this.app.canvas);

    // 2. Build Custom Shader & Fullscreen Render Filter
    this.createShaderFilter();

    // 3. Setup Resize & Device Orientation Listeners
    window.addEventListener('resize', () => this.handleResize());
    this.handleResize();

    // 4. Register Gesture Engine (Touch / Pointer Events)
    this.setupGestureEngine();

    // 5. Wire UI Overlay Controls
    this.setupUIBindings();

    // 6. Start Main Animation Loop
    this.app.ticker.add((ticker) => this.renderLoop(ticker));

    // Update initial UI state
    this.updateVisualGuide();
    console.log('⚡ TCG Mana Overlay Engine Initialized Successfully!');
  }

  createShaderFilter() {
    const width = this.app.screen.width;
    const height = this.app.screen.height;

    // Uniforms resource setup for PixiJS v8 Filter
    this.uniforms = {
      uTime: 0,
      uResolution: [width, height],
      uFrameSize: [this.state.width * this.state.scale, this.state.height * this.state.scale],
      uCenter: [this.state.centerX, this.state.centerY],
      uRotation: this.state.rotation,
      uCornerRadius: this.state.cornerRadius,
      uBorderThickness: this.state.borderThickness,
      uGlowIntensity: this.state.glowIntensity,
      uTurbulence: this.state.turbulence,
      uTheme: this.state.theme
    };

    // Create Filter using custom GLSL shaders
    this.filter = Filter.from({
      gl: {
        vertex: vertexShader,
        fragment: fragmentShader
      },
      resources: {
        manaUniforms: {
          uTime: { value: 0, type: 'f32' },
          uResolution: { value: [width, height], type: 'vec2<f32>' },
          uFrameSize: { value: [this.state.width, this.state.height], type: 'vec2<f32>' },
          uCenter: { value: [this.state.centerX, this.state.centerY], type: 'vec2<f32>' },
          uRotation: { value: 0, type: 'f32' },
          uCornerRadius: { value: 24, type: 'f32' },
          uBorderThickness: { value: 32, type: 'f32' },
          uGlowIntensity: { value: 1.4, type: 'f32' },
          uTurbulence: { value: 1.0, type: 'f32' },
          uTheme: { value: 0, type: 'i32' }
        }
      }
    });

    // Create full screen background sprite to apply filter onto
    this.targetContainer = new Graphics();
    this.targetContainer.rect(0, 0, width, height);
    this.targetContainer.fill({ color: 0x030305 });
    this.targetContainer.filters = [this.filter];

    this.app.stage.addChild(this.targetContainer);
  }

  renderLoop(ticker) {
    // 1. Update Time Uniform
    const timeSec = performance.now() * 0.001;
    
    // PixiJS v8 filter uniform updates
    const filterUniforms = this.filter.resources.manaUniforms.uniforms;
    filterUniforms.uTime = timeSec;
    filterUniforms.uResolution = [this.app.screen.width, this.app.screen.height];
    filterUniforms.uFrameSize = [
      this.state.width * this.state.scale,
      this.state.height * this.state.scale
    ];
    filterUniforms.uCenter = [this.state.centerX, this.state.centerY];
    filterUniforms.uRotation = this.state.rotation;
    filterUniforms.uCornerRadius = this.state.cornerRadius * this.state.scale;
    filterUniforms.uBorderThickness = this.state.borderThickness;
    filterUniforms.uGlowIntensity = this.state.glowIntensity;
    filterUniforms.uTurbulence = this.state.turbulence;
    filterUniforms.uTheme = this.state.theme;

    // 2. Measure & Update FPS Counter
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
  }

  handleResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    if (this.app && this.app.renderer) {
      this.app.renderer.resize(width, height);
    }

    if (this.targetContainer) {
      this.targetContainer.clear();
      this.targetContainer.rect(0, 0, width, height);
      this.targetContainer.fill({ color: 0x030305 });
    }
  }

  /**
   * Touch & Gesture Engine (1-finger drag, 2-finger pinch & rotate)
   */
  setupGestureEngine() {
    const canvas = this.app.canvas;

    // Prevent Safari default touch actions
    canvas.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
    canvas.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
    canvas.addEventListener('touchend', (e) => this.onTouchEnd(e), { passive: false });
    canvas.addEventListener('touchcancel', (e) => this.onTouchEnd(e), { passive: false });

    // Desktop Mouse Fallbacks
    canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    window.addEventListener('mousemove', (e) => this.onMouseMove(e));
    window.addEventListener('mouseup', (e) => this.onMouseUp(e));
    canvas.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });

    // Document level safety: disable default browser zoom & rubber-banding
    document.addEventListener('gesturestart', (e) => e.preventDefault(), { passive: false });
    document.addEventListener('gesturechange', (e) => e.preventDefault(), { passive: false });
    document.addEventListener('gestureend', (e) => e.preventDefault(), { passive: false });
  }

  onTouchStart(e) {
    e.preventDefault();
    if (this.state.isLocked) return;

    const touches = e.touches;
    if (touches.length === 1) {
      // 1-Finger Drag Start
      this.touchState.isDragging = true;
      this.touchState.startCenter = { x: touches[0].clientX, y: touches[0].clientY };
      this.touchState.startState = { ...this.state };
    } else if (touches.length === 2) {
      // 2-Finger Pinch & Rotate Start
      this.touchState.isDragging = true;
      const t1 = touches[0];
      const t2 = touches[1];
      
      this.touchState.startDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      this.touchState.startAngle = Math.atan2(t2.clientY - t1.clientY, t2.clientX - t1.clientX);
      
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
      // 1-Finger Drag Move
      const dx = touches[0].clientX - this.touchState.startCenter.x;
      const dy = touches[0].clientY - this.touchState.startCenter.y;
      
      this.state.centerX = this.touchState.startState.centerX + dx;
      this.state.centerY = this.touchState.startState.centerY + dy;

    } else if (touches.length === 2) {
      // 2-Finger Pinch Scale & Twist Rotate
      const t1 = touches[0];
      const t2 = touches[1];
      
      const currentDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const currentAngle = Math.atan2(t2.clientY - t1.clientY, t2.clientX - t1.clientX);
      
      // Calculate Scale Delta
      if (this.touchState.startDist > 0) {
        const scaleFactor = currentDist / this.touchState.startDist;
        this.state.scale = Math.min(Math.max(this.touchState.startState.scale * scaleFactor, 0.4), 3.0);
      }

      // Calculate Rotation Delta
      const angleDelta = currentAngle - this.touchState.startAngle;
      this.state.rotation = this.touchState.startState.rotation + angleDelta;

      // Translation offset from midpoint movement
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
      // Transition from 2-finger to 1-finger
      this.touchState.startCenter = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      this.touchState.startState = { ...this.state };
    }
  }

  // Mouse Handlers for Desktop Testing
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

    if (e.shiftKey) {
      // Shift + Scroll = Rotate
      const rotDelta = (e.deltaY > 0 ? 1 : -1) * (Math.PI / 36); // 5 degrees
      this.state.rotation += rotDelta;
    } else {
      // Scroll = Scale
      const zoomFactor = e.deltaY > 0 ? 0.95 : 1.05;
      this.state.scale = Math.min(Math.max(this.state.scale * zoomFactor, 0.4), 3.0);
    }
    this.updateVisualGuide();
  }

  /**
   * HUD UI Control Panel Bindings
   */
  setupUIBindings() {
    // 1. Lock Toggle Button
    const lockBtn = document.getElementById('btn-lock');
    const floatingUnlockBtn = document.getElementById('floating-unlock');
    
    const toggleLock = () => {
      this.state.isLocked = !this.state.isLocked;
      this.updateLockUI();
    };

    lockBtn.addEventListener('click', toggleLock);
    floatingUnlockBtn.addEventListener('click', toggleLock);

    // 2. Collapsible HUD Toggle Button
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
          btn.classList.add('active');
          
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
        const theme = e.currentTarget.getAttribute('data-theme');
        document.querySelectorAll('.btn-theme').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');

        const themeMap = { blue: 0, red: 1, green: 2, purple: 3, gold: 4 };
        this.state.theme = themeMap[theme] ?? 0;
        
        // Update glow accent colors in CSS
        const orb = document.getElementById('brand-orb');
        if (orb) {
          const colors = ['#00e5ff', '#ff4400', '#00ff88', '#b000ff', '#ffcc00'];
          orb.style.background = `radial-gradient(circle at 30% 30%, #ffffff, ${colors[this.state.theme]} 60%, #0044ff 100%)`;
        }
      });
    });

    // 5. Range Sliders
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
      
      // Reset sliders & buttons
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

// Instantiate and start app on DOMReady
window.addEventListener('DOMContentLoaded', () => {
  const app = new ManaOverlayApp();
  app.init().catch((err) => {
    console.error('Failed to initialize TCG Mana Overlay App:', err);
  });
});

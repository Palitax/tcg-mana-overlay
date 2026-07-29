/* --- iPad Pro 12.9" Seamless Video Looper Core Engine --- */

const DB_NAME = 'iPadVideoLooperDB';
const DB_STORE = 'videos';
const VIDEO_KEY = 'saved_video_blob';

class VideoLooperApp {
  constructor() {
    this.videoA = document.getElementById('videoA');
    this.videoB = document.getElementById('videoB');
    this.videoFileInput = document.getElementById('video-file-input');
    this.videoFileInputSecondary = document.getElementById('video-file-input-secondary');
    
    this.emptyState = document.getElementById('empty-state');
    this.uiControls = document.getElementById('ui-controls');
    this.tapOverlay = document.getElementById('tap-overlay');
    this.toastEl = document.getElementById('toast');
    this.statusText = document.getElementById('status-text');

    // Control buttons
    this.btnTogglePlay = document.getElementById('btn-toggle-play');
    this.btnToggleAudio = document.getElementById('btn-toggle-audio');
    this.btnToggleFit = document.getElementById('btn-toggle-fit');
    this.btnZoomIn = document.getElementById('btn-zoom-in');
    this.btnZoomOut = document.getElementById('btn-zoom-out');
    this.btnShiftUp = document.getElementById('btn-shift-up');
    this.btnShiftDown = document.getElementById('btn-shift-down');
    this.btnFullscreen = document.getElementById('btn-fullscreen');
    this.btnClearVideo = document.getElementById('btn-clear-video');
    this.fitLabel = document.getElementById('fit-label');
    this.zoomValue = document.getElementById('zoom-value');

    // Audio icons
    this.iconAudioOn = document.getElementById('icon-audio-on');
    this.iconAudioOff = document.getElementById('icon-audio-off');
    this.iconPlay = document.getElementById('icon-play');
    this.iconPause = document.getElementById('icon-pause');

    // Engine & Transform States
    this.videos = [this.videoA, this.videoB];
    this.activeIndex = 0;
    this.objectUrl = null;
    this.isPlaying = false;
    this.isMuted = true;
    this.fitMode = 'cover'; // 'cover', 'fill', 'contain'
    
    this.zoomScale = 1.08; // Default 108% to overbleed any bottom safe-area / letterbox gap
    this.offsetX = 0;
    this.offsetY = 0;

    this.isSwapping = false;
    this.rafId = null;
    this.autoHideTimer = null;
    this.uiVisible = true;

    // Gesture tracking variables
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.startOffsetX = 0;
    this.startOffsetY = 0;
    this.isDragging = false;
    this.hasMoved = false;
    this.pinchStartDist = 0;
    this.pinchStartScale = 1;

    this.init();
  }

  async init() {
    this.bindEvents();
    this.bindGestures();
    this.initIndexedDB();
    await this.tryRestoreSavedVideo();
  }

  /* --- Event Listeners --- */
  bindEvents() {
    const handleFile = (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) {
        this.loadVideoFile(file);
      }
    };

    this.videoFileInput.addEventListener('change', handleFile);
    this.videoFileInputSecondary.addEventListener('change', handleFile);

    // Control buttons
    this.btnTogglePlay.addEventListener('click', (e) => {
      e.stopPropagation();
      this.togglePlay();
    });

    this.btnToggleAudio.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleAudio();
    });

    this.btnToggleFit.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleFitMode();
    });

    this.btnZoomIn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.adjustZoom(0.05);
    });

    this.btnZoomOut.addEventListener('click', (e) => {
      e.stopPropagation();
      this.adjustZoom(-0.05);
    });

    this.btnShiftUp.addEventListener('click', (e) => {
      e.stopPropagation();
      this.shiftVideo(0, -30);
    });

    this.btnShiftDown.addEventListener('click', (e) => {
      e.stopPropagation();
      this.shiftVideo(0, 30);
    });

    if (this.btnFullscreen) {
      this.btnFullscreen.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleFullscreen();
      });
    }

    this.btnClearVideo.addEventListener('click', (e) => {
      e.stopPropagation();
      this.clearSavedVideo();
    });

    const resetTimer = () => {
      if (this.isPlaying && this.uiVisible) {
        this.scheduleAutoHide();
      }
    };

    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('touchstart', resetTimer, { passive: true });
  }

  /* --- Touch Drag & Pinch Gestures on iPad Screen --- */
  bindGestures() {
    const overlay = this.tapOverlay;

    overlay.addEventListener('touchstart', (e) => {
      if (!this.objectUrl) return;

      if (e.touches.length === 1) {
        // Single finger pan/drag
        this.isDragging = true;
        this.hasMoved = false;
        this.touchStartX = e.touches[0].clientX;
        this.touchStartY = e.touches[0].clientY;
        this.startOffsetX = this.offsetX;
        this.startOffsetY = this.offsetY;
      } else if (e.touches.length === 2) {
        // Pinch to zoom
        this.isDragging = false;
        this.pinchStartDist = this.getTouchDistance(e.touches);
        this.pinchStartScale = this.zoomScale;
      }
    }, { passive: true });

    overlay.addEventListener('touchmove', (e) => {
      if (!this.objectUrl) return;

      if (this.isDragging && e.touches.length === 1) {
        const dx = e.touches[0].clientX - this.touchStartX;
        const dy = e.touches[0].clientY - this.touchStartY;

        if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
          this.hasMoved = true;
        }

        this.offsetX = this.startOffsetX + dx;
        this.offsetY = this.startOffsetY + dy;
        this.applyTransform();
      } else if (e.touches.length === 2) {
        const currentDist = this.getTouchDistance(e.touches);
        if (this.pinchStartDist > 0) {
          const scaleRatio = currentDist / this.pinchStartDist;
          this.zoomScale = Math.max(0.8, Math.min(3.0, Math.round(this.pinchStartScale * scaleRatio * 100) / 100));
          this.applyTransform();
        }
      }
    }, { passive: true });

    overlay.addEventListener('touchend', (e) => {
      if (!this.objectUrl) return;

      if (!this.hasMoved && e.touches.length === 0) {
        // Pure tap without movement toggles UI
        this.toggleUI();
      }

      this.isDragging = false;
      this.pinchStartDist = 0;
    }, { passive: true });

    // Mouse Drag support for Desktop testing
    let isMouseDown = false;
    overlay.addEventListener('mousedown', (e) => {
      if (!this.objectUrl) return;
      isMouseDown = true;
      this.hasMoved = false;
      this.touchStartX = e.clientX;
      this.touchStartY = e.clientY;
      this.startOffsetX = this.offsetX;
      this.startOffsetY = this.offsetY;
    });

    window.addEventListener('mousemove', (e) => {
      if (isMouseDown && this.objectUrl) {
        const dx = e.clientX - this.touchStartX;
        const dy = e.clientY - this.touchStartY;

        if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
          this.hasMoved = true;
        }

        this.offsetX = this.startOffsetX + dx;
        this.offsetY = this.startOffsetY + dy;
        this.applyTransform();
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (isMouseDown) {
        isMouseDown = false;
        if (!this.hasMoved) {
          this.toggleUI();
        }
      }
    });
  }

  getTouchDistance(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /* --- IndexedDB Storage Helper --- */
  initIndexedDB() {
    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(DB_STORE)) {
          db.createObjectStore(DB_STORE);
        }
      };
      request.onsuccess = (e) => resolve(e.target.result);
      request.onerror = (e) => reject(e.target.error);
    });
  }

  async saveVideoBlob(blob) {
    try {
      const db = await this.dbPromise;
      const tx = db.transaction(DB_STORE, 'readwrite');
      tx.objectStore(DB_STORE).put(blob, VIDEO_KEY);
      return tx.complete;
    } catch (err) {
      console.warn('Could not save video to IndexedDB:', err);
    }
  }

  async tryRestoreSavedVideo() {
    try {
      const db = await this.dbPromise;
      const tx = db.transaction(DB_STORE, 'readonly');
      const req = tx.objectStore(DB_STORE).get(VIDEO_KEY);
      req.onsuccess = () => {
        const blob = req.result;
        if (blob) {
          this.showToast('Gespeichertes Video geladen');
          this.loadVideoBlob(blob, false);
        }
      };
    } catch (err) {
      console.warn('IndexedDB restore failed:', err);
    }
  }

  async clearSavedVideo() {
    try {
      const db = await this.dbPromise;
      const tx = db.transaction(DB_STORE, 'readwrite');
      tx.objectStore(DB_STORE).delete(VIDEO_KEY);
    } catch (err) {
      console.warn('Could not clear IndexedDB video:', err);
    }

    this.pauseEngine();
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = null;
    }

    this.videoA.removeAttribute('src');
    this.videoB.removeAttribute('src');
    this.videoA.load();
    this.videoB.load();

    this.emptyState.classList.remove('hidden');
    this.uiControls.classList.add('hidden');
    this.showToast('Video entfernt');
  }

  /* --- Video Loading & Preparation --- */
  async loadVideoFile(file) {
    if (!file.type.startsWith('video/')) {
      this.showToast('Bitte wähle eine gültige Videodatei');
      return;
    }

    await this.saveVideoBlob(file);
    this.loadVideoBlob(file, true);
  }

  loadVideoBlob(blob, autoPlay = true) {
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
    }

    this.objectUrl = URL.createObjectURL(blob);

    this.videoA.src = this.objectUrl;
    this.videoB.src = this.objectUrl;

    this.videoA.muted = this.isMuted;
    this.videoB.muted = this.isMuted;

    this.videoA.load();
    this.videoB.load();

    this.activeIndex = 0;
    this.videoA.classList.add('active');
    this.videoB.classList.remove('active');

    // Reset offsets and apply default zoom
    this.offsetX = 0;
    this.offsetY = 0;
    this.zoomScale = 1.08;
    this.applyTransform();

    this.emptyState.classList.add('hidden');
    this.uiControls.classList.remove('hidden');

    if (autoPlay) {
      this.playEngine();
    } else {
      this.updatePlayStateUI(false);
    }

    this.scheduleAutoHide();
  }

  /* --- Dual-Video Ping-Pong Looper Engine --- */
  playEngine() {
    this.isPlaying = true;
    const activeVideo = this.videos[this.activeIndex];

    activeVideo.muted = this.isMuted;
    activeVideo.play().then(() => {
      this.updatePlayStateUI(true);
      this.startLoopMonitor();
      this.scheduleAutoHide();
    }).catch(err => {
      console.warn('Autoplay blocked, user interaction required:', err);
      this.updatePlayStateUI(false);
    });
  }

  pauseEngine() {
    this.isPlaying = false;
    this.stopLoopMonitor();
    this.videoA.pause();
    this.videoB.pause();
    this.updatePlayStateUI(false);
  }

  togglePlay() {
    if (this.isPlaying) {
      this.pauseEngine();
    } else {
      this.playEngine();
    }
  }

  startLoopMonitor() {
    this.stopLoopMonitor();

    const monitor = () => {
      if (!this.isPlaying) return;

      const active = this.videos[this.activeIndex];
      const nextIndex = 1 - this.activeIndex;
      const next = this.videos[nextIndex];

      if (active && active.duration && !isNaN(active.duration)) {
        const duration = active.duration;
        const currentTime = active.currentTime;
        const remaining = duration - currentTime;

        const leadTime = Math.min(0.18, duration * 0.1);

        if (remaining <= leadTime && !this.isSwapping) {
          this.executeSeamlessSwap(active, next, nextIndex);
        }
      }

      this.rafId = requestAnimationFrame(monitor);
    };

    this.rafId = requestAnimationFrame(monitor);
  }

  stopLoopMonitor() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  executeSeamlessSwap(active, next, nextIndex) {
    this.isSwapping = true;

    next.muted = this.isMuted;
    next.currentTime = 0;

    const playPromise = next.play();

    if (playPromise !== undefined) {
      playPromise.then(() => {
        next.classList.add('active');
        active.classList.remove('active');

        setTimeout(() => {
          active.pause();
          active.currentTime = 0;
          this.activeIndex = nextIndex;
          this.isSwapping = false;
        }, 120);
      }).catch(err => {
        console.warn('Swap playback error, falling back:', err);
        active.currentTime = 0;
        this.isSwapping = false;
      });
    } else {
      next.classList.add('active');
      active.classList.remove('active');
      active.pause();
      active.currentTime = 0;
      this.activeIndex = nextIndex;
      this.isSwapping = false;
    }
  }

  /* --- Zoom & Position Transform Engine --- */
  shiftVideo(dx, dy) {
    this.offsetX += dx;
    this.offsetY += dy;
    this.applyTransform();
    this.showToast(`Position verschoben (Y: ${Math.round(this.offsetY)}px)`);
  }

  adjustZoom(delta) {
    this.zoomScale = Math.max(0.8, Math.min(3.0, Math.round((this.zoomScale + delta) * 100) / 100));
    this.applyTransform();
    this.showToast(`Zoom: ${Math.round(this.zoomScale * 100)}%`);
  }

  applyTransform() {
    this.zoomValue.textContent = `${Math.round(this.zoomScale * 100)}%`;

    this.videoA.style.setProperty('--video-zoom', this.zoomScale);
    this.videoB.style.setProperty('--video-zoom', this.zoomScale);

    this.videoA.style.setProperty('--video-offset-x', `${this.offsetX}px`);
    this.videoB.style.setProperty('--video-offset-x', `${this.offsetX}px`);

    this.videoA.style.setProperty('--video-offset-y', `${this.offsetY}px`);
    this.videoB.style.setProperty('--video-offset-y', `${this.offsetY}px`);
  }

  toggleFullscreen() {
    const elem = document.documentElement;
    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
      if (elem.webkitRequestFullscreen) {
        elem.webkitRequestFullscreen();
      } else if (elem.requestFullscreen) {
        elem.requestFullscreen().catch(() => {});
      }
      this.showToast('Echtes Vollbild aktiviert');
    } else {
      if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      this.showToast('Vollbild beendet');
    }
  }

  toggleFitMode() {
    if (this.fitMode === 'cover') {
      this.fitMode = 'ipad129';
      this.zoomScale = 1.33;
      this.offsetY = -20; // Automatically shift up by 20px to eliminate any bottom letterbox bar
      this.applyTransform();
      this.videoA.classList.remove('fit-fill', 'fit-contain');
      this.videoB.classList.remove('fit-fill', 'fit-contain');
      this.fitLabel.textContent = 'iPad Pro (133%)';
      this.showToast('Modus: iPad Pro 12,9" (133% Zoom + Shift)');
    } else if (this.fitMode === 'ipad129') {
      this.fitMode = 'fill';
      this.zoomScale = 1.0;
      this.offsetX = 0;
      this.offsetY = 0;
      this.applyTransform();
      this.videoA.classList.remove('fit-contain');
      this.videoB.classList.remove('fit-contain');
      this.videoA.classList.add('fit-fill');
      this.videoB.classList.add('fit-fill');
      this.fitLabel.textContent = 'Strecken (Fill)';
      this.showToast('Modus: Strecken auf 100% Display');
    } else if (this.fitMode === 'fill') {
      this.fitMode = 'contain';
      this.zoomScale = 1.0;
      this.offsetX = 0;
      this.offsetY = 0;
      this.applyTransform();
      this.videoA.classList.remove('fit-fill');
      this.videoB.classList.remove('fit-fill');
      this.videoA.classList.add('fit-contain');
      this.videoB.classList.add('fit-contain');
      this.fitLabel.textContent = 'Contain';
      this.showToast('Modus: Original mit Rändern (Contain)');
    } else {
      this.fitMode = 'cover';
      this.zoomScale = 1.08;
      this.offsetX = 0;
      this.offsetY = 0;
      this.applyTransform();
      this.videoA.classList.remove('fit-fill', 'fit-contain');
      this.videoB.classList.remove('fit-fill', 'fit-contain');
      this.fitLabel.textContent = 'Cover (108%)';
      this.showToast('Modus: Vollbild Cover');
    }
  }

  /* --- Audio Controls --- */
  toggleAudio() {
    this.isMuted = !this.isMuted;
    this.videoA.muted = this.isMuted;
    this.videoB.muted = this.isMuted;

    if (this.isMuted) {
      this.iconAudioOff.classList.remove('hidden');
      this.iconAudioOn.classList.add('hidden');
      this.btnToggleAudio.classList.add('btn-muted');
      this.showToast('Audio stumm geschaltet');
    } else {
      this.iconAudioOff.classList.add('hidden');
      this.iconAudioOn.classList.remove('hidden');
      this.btnToggleAudio.classList.remove('btn-muted');
      this.showToast('Audio aktiviert');
    }
  }

  /* --- UI Visibility & Auto-Hide --- */
  toggleUI() {
    this.uiVisible = !this.uiVisible;
    if (this.uiVisible) {
      this.uiControls.classList.remove('hidden');
      this.scheduleAutoHide();
    } else {
      this.uiControls.classList.add('hidden');
      clearTimeout(this.autoHideTimer);
    }
  }

  scheduleAutoHide() {
    clearTimeout(this.autoHideTimer);
    if (this.isPlaying) {
      this.autoHideTimer = setTimeout(() => {
        if (this.isPlaying) {
          this.uiVisible = false;
          this.uiControls.classList.add('hidden');
        }
      }, 3200);
    }
  }

  updatePlayStateUI(isPlaying) {
    if (isPlaying) {
      this.iconPlay.classList.add('hidden');
      this.iconPause.classList.remove('hidden');
      this.statusText.textContent = 'iPad Pro Loop';
    } else {
      this.iconPlay.classList.remove('hidden');
      this.iconPause.classList.add('hidden');
      this.statusText.textContent = 'Pausiert';
    }
  }

  showToast(msg) {
    this.toastEl.textContent = msg;
    this.toastEl.classList.remove('hidden');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.toastEl.classList.add('hidden');
    }, 2500);
  }
}

// Initialize Application on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new VideoLooperApp();
});

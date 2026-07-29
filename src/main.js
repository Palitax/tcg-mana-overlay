/* --- iPad Seamless Video Looper Core Engine --- */

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
    this.btnClearVideo = document.getElementById('btn-clear-video');
    this.btnFullscreen = document.getElementById('btn-fullscreen');
    this.fitLabel = document.getElementById('fit-label');

    // Audio icons
    this.iconAudioOn = document.getElementById('icon-audio-on');
    this.iconAudioOff = document.getElementById('icon-audio-off');
    this.iconPlay = document.getElementById('icon-play');
    this.iconPause = document.getElementById('icon-pause');

    // Engine States
    this.videos = [this.videoA, this.videoB];
    this.activeIndex = 0;
    this.objectUrl = null;
    this.isPlaying = false;
    this.isMuted = true;
    this.fitMode = 'cover'; // 'cover' or 'contain'
    this.isSwapping = false;
    this.rafId = null;
    this.autoHideTimer = null;
    this.uiVisible = true;

    this.init();
  }

  async init() {
    this.bindEvents();
    this.initIndexedDB();
    await this.tryRestoreSavedVideo();
  }

  /* --- Event Listeners & Gesture Controls --- */
  bindEvents() {
    // File inputs
    const handleFile = (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) {
        this.loadVideoFile(file);
      }
    };

    this.videoFileInput.addEventListener('change', handleFile);
    this.videoFileInputSecondary.addEventListener('change', handleFile);

    // Screen Tap overlay toggles UI
    this.tapOverlay.addEventListener('click', () => {
      if (this.objectUrl) {
        this.toggleUI();
      }
    });

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

    this.btnClearVideo.addEventListener('click', (e) => {
      e.stopPropagation();
      this.clearSavedVideo();
    });

    this.btnFullscreen.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleFullscreen();
    });

    // Auto-hide UI reset on interaction
    const resetTimer = () => {
      if (this.isPlaying && this.uiVisible) {
        this.scheduleAutoHide();
      }
    };

    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('touchstart', resetTimer);
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

    this.stopEngine();
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

    // Assign blob to both dual video elements
    this.videoA.src = this.objectUrl;
    this.videoB.src = this.objectUrl;

    this.videoA.muted = this.isMuted;
    this.videoB.muted = this.isMuted;

    this.videoA.load();
    this.videoB.load();

    this.activeIndex = 0;
    this.videoA.classList.add('active');
    this.videoB.classList.remove('active');

    this.emptyState.classList.add('hidden');
    this.uiControls.classList.remove('hidden');

    if (autoPlay) {
      this.playEngine();
    } else {
      this.updatePlayStateUI(false);
    }

    this.scheduleAutoHide();
  }

  /* --- Dual-Video Ping-Pong Looper Algorithm --- */
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

        // Lead time before trigger: 0.15s for seamless transition without stutter
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
        // Smoothly crossfade opacity and swap active class
        next.classList.add('active');
        active.classList.remove('active');

        // Short timeout before pausing old video so transition frame completes seamlessly
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

  /* --- Audio & Display Controls --- */
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

  toggleFitMode() {
    if (this.fitMode === 'cover') {
      this.fitMode = 'contain';
      this.videoA.classList.add('fit-contain');
      this.videoB.classList.add('fit-contain');
      this.fitLabel.textContent = 'Contain';
      this.showToast('Modus: Einpassen (Contain)');
    } else {
      this.fitMode = 'cover';
      this.videoA.classList.remove('fit-contain');
      this.videoB.classList.remove('fit-contain');
      this.fitLabel.textContent = 'Cover';
      this.showToast('Modus: Vollbild (Cover)');
    }
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        this.showToast('Vollbild auf diesem Gerät nicht unterstützt');
      });
    } else {
      document.exitFullscreen();
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
      this.statusText.textContent = 'Nahtloses Ping-Pong Looping';
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

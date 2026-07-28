# TCG Card Overlay Web App (iPad Optimized)

A high-end, interactive Web Application & PWA designed for Apple iPads (Safari full-screen / standalone) and desktop web browsers. The app renders a premium, hardware-accelerated glowing **"Blue Mana"** aura frame around physical Trading Card Game (TCG) cards placed on top of the tablet screen during live streams or showcase videos.

---

## 🌟 Key Features

1. **Procedural GLSL Mana Shader (World of Warcraft Inspired)**:
   - Hardware-accelerated WebGL rendering powered by **PixiJS v8**.
   - Signed Distance Function (SDF) rounded rectangle frame with a **hollow center** so physical cards rest cleanly on screen without background backlight blinding.
   - Organic 2D Simplex Noise domain warping for fluid turbulence, glowing aura bloom, and perimeter spark particles.
   - **5 Elemental Themes**: Blue Mana, Dragon Fire, Emerald Life, Void Energy, and Holy Sun.

2. **iPad Hardware & GPU Performance (Locked 60 FPS)**:
   - Device pixel ratio explicitly capped to `1.0–1.5` to maintain locked 60 FPS performance on iPad Retina displays.
   - Optimized shader logic without unrolled loops or heavy overhead.

3. **Fluid Touch & Gesture Controls**:
   - **1-Finger Drag**: Move the glowing frame across the screen to align under physical cards.
   - **2-Finger Pinch & Twist**: Scale frame size and rotate angle seamlessly.
   - **Mouse & Trackpad Support**: Desktop drag, mouse wheel scale, and Shift + wheel rotation.

4. **Streamer Quality-of-Life Tools**:
   - **Lock State**: Single-tap lock freezes position and hides touch guides so accidental touches during gameplay don't displace the overlay.
   - **Card Ratio Presets**: Toploader (3"×4"), Standard (MTG / Pokémon), Japanese (Yu-Gi-Oh!), and Oversized (Commander).
   - **HUD Settings Panel**: Adjustable glow intensity, border thickness, aura turbulence speed, and corner radius.

5. **Apple iPad PWA Integration**:
   - Full PWA support (`manifest.json`, `apple-mobile-web-app-capable`, `black-translucent` status bar).
   - Complete iOS touch resets (`touch-action: none`, `passive: false` event interception preventing Safari page bounce, pinch-zoom, and touch callouts).

---

## 📁 Deliverable Structure

```
├── index.html           # Main PWA HTML, canvas container, and glassmorphism HUD panel
├── styles.css           # Modern CSS reset, iPad touch resets, dark theme & glassmorphism
├── vite.config.js       # Vite bundler configuration
├── package.json         # Project dependencies (PixiJS v8, Vite)
├── public/
│   ├── manifest.json    # Progressive Web App manifest
│   └── icon.svg         # High-res SVG app icon & favicon
├── src/
│   ├── manaShader.js    # GLSL vertex & fragment shader logic
│   └── app.js           # PixiJS v8 initialization, gesture engine & UI bindings
└── README.md            # Setup guide & Vercel deployment instructions
```

---

## 🚀 Local Development Setup

### Prerequisites
- Node.js (v18 or higher recommended)
- npm or yarn

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Local Development Server
```bash
npm run dev
```
Open the printed local URL (e.g. `http://localhost:3000`) in your browser or access it from your iPad on the same local Wi-Fi network.

### 3. Build Production Bundle
```bash
npm run build
```

---

## ☁️ Step-by-Step Vercel Deployment Guide

Since this project uses a standard Vite setup, deploying to Vercel is zero-config and takes less than 2 minutes.

### Option A: Vercel Dashboard (Recommended with GitHub/GitLab/Bitbucket)

1. **Push your code to a Git repository**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit - TCG Mana Overlay App"
   # Create a repository on GitHub and run:
   git remote add origin https://github.com/YOUR_USERNAME/tcg-mana-overlay.git
   git branch -M main
   git push -u origin main
   ```

2. **Import into Vercel**:
   - Go to your [Vercel Dashboard](https://vercel.com/dashboard).
   - Click **"Add New..."** → **"Project"**.
   - Select your `tcg-mana-overlay` repository.

3. **Configure & Deploy**:
   - Vercel automatically detects **Vite**:
     - **Framework Preset**: Vite
     - **Build Command**: `npm run build`
     - **Output Directory**: `dist`
   - Click **"Deploy"**.
   - In ~30 seconds, your site will be live at a `.vercel.app` URL!

---

### Option B: Vercel CLI (Direct Terminal Deployment)

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm i -g vercel
   ```

2. **Deploy from project root**:
   ```bash
   vercel
   ```

3. **Follow the terminal prompts**:
   - Set up and deploy project? `y`
   - Which scope? (Select your account)
   - Link to existing project? `n`
   - What's your project's name? `tcg-mana-overlay`
   - In which directory is your code located? `./`
   - Auto-detected settings (Vite): Press `Enter` to confirm.

4. **Production Deployment**:
   ```bash
   vercel --prod
   ```

---

## 📱 How to Use on iPad (Safari PWA Mode)

1. Open your deployed Vercel URL on your iPad in Safari.
2. Tap the **Share** button in Safari's toolbar.
3. Select **"Add to Home Screen"**.
4. Launch the app from your Home Screen (runs full-screen with no browser address bar).
5. Position your physical TCG card (or toploader) over the screen.
6. Drag with 1 finger or pinch/rotate with 2 fingers to align the glowing Mana frame under your card.
7. Tap **"LOCK"** on the top HUD to freeze the position and start streaming!

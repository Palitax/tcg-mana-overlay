/**
 * High-Performance GLSL Shaders for TCG Mana Overlay
 * Supports WebGL 2 & WebGL 1 across mobile iPad Safari & Desktop
 */

export const vertexShaderSource = `
attribute vec2 aPosition;

void main(void) {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

export const fragmentShaderSource = `
precision highp float;

uniform float uTime;
uniform vec2 uResolution;       // Screen size in pixels (width, height)
uniform vec2 uCenter;           // Card frame center position in pixels
uniform vec2 uFrameSize;        // Card frame width & height in pixels
uniform float uRotation;        // Rotation angle in radians
uniform float uCornerRadius;    // Corner radius in pixels
uniform float uBorderThickness; // Border thickness in pixels
uniform float uGlowIntensity;   // Glow brightness multiplier (0.4 - 3.0)
uniform float uTurbulence;      // Fluid turbulence animation speed
uniform int uTheme;             // 0: Blue, 1: Red, 2: Green, 3: Purple, 4: Gold

// 2D Simplex / Perlin noise for fluid Mana turbulence
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                     -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1;
  i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
  + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yw * x12.xz + h.yw * x12.yw;
  return 130.0 * dot(m, g);
}

// Fractal Brownian Motion for swirling fluid smoke
float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 3; i++) {
    value += amplitude * snoise(p);
    p *= 2.04;
    amplitude *= 0.5;
  }
  return value;
}

// Signed Distance Function (SDF) of a rounded box
float sdRoundedBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + vec2(r);
  return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
}

void main(void) {
  // Convert WebGL bottom-left fragCoord to screen top-left coordinates
  vec2 screenPos = vec2(gl_FragCoord.x, uResolution.y - gl_FragCoord.y);
  
  // Position relative to card frame center
  vec2 pos = screenPos - uCenter;
  
  // Rotate around center
  float cosA = cos(-uRotation);
  float sinA = sin(-uRotation);
  mat2 rotMatrix = mat2(cosA, -sinA, sinA, cosA);
  pos = rotMatrix * pos;
  
  // Card dimensions
  vec2 halfSize = uFrameSize * 0.5;
  float r = clamp(uCornerRadius, 2.0, min(halfSize.x, halfSize.y) - 2.0);
  
  // Distance from outer frame edge
  float distOuter = sdRoundedBox(pos, halfSize, r);
  
  // Distance from inner frame boundary (hollow center)
  float innerThickness = uBorderThickness;
  vec2 innerHalfSize = max(vec2(1.0), halfSize - vec2(innerThickness));
  float innerRadius = max(1.0, r - innerThickness * 0.5);
  float distInner = sdRoundedBox(pos, innerHalfSize, innerRadius);
  
  // Outer Bloom Glow: exponential falloff outside the frame
  float outerGlow = exp(-0.04 * max(0.0, distOuter));
  
  // Inner Bloom Glow: exponential falloff fading inside the hollow area
  float innerGlow = exp(-0.06 * max(0.0, -distInner));
  
  // Solid border mask
  float borderMask = smoothstep(4.0, -2.0, distOuter) * smoothstep(-innerThickness - 4.0, -innerThickness + 2.0, distInner);
  
  // Total light intensity
  float totalGlow = outerGlow * 0.8 + innerGlow * 0.3 + borderMask * 1.8;
  
  // Domain Warping Fluid Turbulence
  vec2 st = pos * 0.012;
  float t = uTime * 1.1 * uTurbulence;
  
  float angle = atan(pos.y, pos.x);
  float n1 = fbm(st + vec2(t * 0.25, -t * 0.15));
  float n2 = fbm(st * 1.6 + vec2(n1 * 1.4, t * 0.4));
  float noise = fbm(st * 2.2 + vec2(n2 * 1.8, angle * 0.5));
  
  // Floating energy sparks along frame border
  float sparkNoise = snoise(st * 6.0 + vec2(0.0, t * 2.0));
  float spark = pow(max(0.0, sparkNoise), 7.0) * 3.5;
  
  // Elemental Color Themes
  vec3 cPrimary, cAccent, cCore;
  
  if (uTheme == 1) { // Red Dragonfire
    cPrimary = vec3(0.95, 0.12, 0.02);
    cAccent  = vec3(1.0, 0.55, 0.05);
    cCore    = vec3(1.0, 0.95, 0.75);
  } else if (uTheme == 2) { // Emerald Nature
    cPrimary = vec3(0.02, 0.85, 0.35);
    cAccent  = vec3(0.25, 1.0, 0.65);
    cCore    = vec3(0.85, 1.0, 0.92);
  } else if (uTheme == 3) { // Void Energy
    cPrimary = vec3(0.55, 0.05, 0.95);
    cAccent  = vec3(0.92, 0.25, 1.0);
    cCore    = vec3(0.96, 0.85, 1.0);
  } else if (uTheme == 4) { // Holy Sun
    cPrimary = vec3(1.0, 0.55, 0.02);
    cAccent  = vec3(1.0, 0.88, 0.25);
    cCore    = vec3(1.0, 0.98, 0.88);
  } else { // Blue Mana (Default WoW Arcane Mana)
    cPrimary = vec3(0.0, 0.28, 0.98);
    cAccent  = vec3(0.0, 0.92, 1.0);
    cCore    = vec3(0.85, 0.98, 1.0);
  }
  
  // Color Mixing
  vec3 finalRgb = mix(cPrimary, cAccent, clamp(noise * 0.65 + 0.35, 0.0, 1.0));
  
  // Bright Core Line along border center
  float borderCenter = abs(distOuter + distInner) * 0.5;
  float coreLine = smoothstep(10.0, 0.0, borderCenter);
  finalRgb = mix(finalRgb, cCore, coreLine * 0.65 + spark * 0.35);
  
  // Alpha computation
  float alpha = clamp((totalGlow * (0.6 + noise * 0.4) + spark * 0.25) * uGlowIntensity, 0.0, 1.0);
  
  // Hollow out middle so card is completely un-obscured
  if (distInner < -innerThickness * 0.75) {
    float innerFade = smoothstep(-innerThickness, -innerThickness * 0.75, distInner);
    alpha *= innerFade;
  }
  
  gl_FragColor = vec4(finalRgb * alpha, alpha);
}
`;

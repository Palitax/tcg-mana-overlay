/**
 * High-End Volumetric Ethereal Mana Smoke Shader (Video Quality)
 * Implements Domain-Warped Fractal Brownian Motion (FBM) & Simplex Noise in GLSL.
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
uniform vec2 uResolution;       // Screen dimensions in pixels
uniform vec2 uCenter;           // Frame center position in pixels
uniform vec2 uFrameSize;        // Toploader width & height in pixels
uniform float uRotation;        // Rotation angle in radians
uniform float uCornerRadius;    // Corner radius in pixels
uniform float uBorderThickness; // Border thickness in pixels
uniform float uGlowIntensity;   // Glow multiplier
uniform float uTurbulence;      // Turbulence speed
uniform int uTheme;             // Color theme index

// 2D Simplex Noise
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

// 4-Octave Fractal Brownian Motion (FBM) for fluid smoke texture
float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 4; i++) {
    value += amplitude * snoise(p);
    p *= 2.02;
    amplitude *= 0.5;
  }
  return value;
}

// Domain Warped Noise: q = fbm(p), r = fbm(p + 4*q + t), result = fbm(p + 4*r)
float domainWarpedNoise(vec2 p, float time, out vec2 q, out vec2 r) {
  vec2 tVec = vec2(time * 0.15, time * 0.12);
  
  q.x = fbm(p + vec2(0.0, 0.0));
  q.y = fbm(p + vec2(5.2, 1.3));
  
  r.x = fbm(p + 4.0 * q + vec2(1.7, 9.2) + tVec);
  r.y = fbm(p + 4.0 * q + vec2(8.3, 2.8) - tVec * 0.8);
  
  return fbm(p + 4.0 * r + tVec * 0.5);
}

// Signed Distance Function (SDF) of Toploader Rounded Box
float sdToploader(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + vec2(r);
  return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
}

void main(void) {
  // Convert gl_FragCoord to screen pixels (top-left origin)
  vec2 screenPos = vec2(gl_FragCoord.x, uResolution.y - gl_FragCoord.y);
  
  // Position relative to card center
  vec2 pos = screenPos - uCenter;
  
  // Rotate around center
  float cosA = cos(-uRotation);
  float sinA = sin(-uRotation);
  mat2 rot = mat2(cosA, -sinA, sinA, cosA);
  pos = rot * pos;
  
  // Toploader Dimensions
  vec2 halfSize = uFrameSize * 0.5;
  float r = clamp(uCornerRadius, 2.0, min(halfSize.x, halfSize.y) - 2.0);
  
  // Distance to outer boundary of Toploader
  float distOuter = sdToploader(pos, halfSize, r);
  
  // Distance to inner boundary (hollow card area)
  float innerThickness = uBorderThickness;
  vec2 innerHalfSize = max(vec2(1.0), halfSize - vec2(innerThickness));
  float innerRadius = max(1.0, r - innerThickness * 0.5);
  float distInner = sdToploader(pos, innerHalfSize, innerRadius);
  
  // Domain Warping Parameters
  float t = uTime * 0.8 * uTurbulence;
  vec2 st = pos * 0.008; // Domain noise scaling
  
  vec2 q, rWarp;
  float warpVal = domainWarpedNoise(st, t, q, rWarp);
  
  // Outer Wispy Mist Falloff (Distorted by domain warped noise)
  float distortedDistOuter = distOuter - warpVal * 32.0;
  float mistFalloff = exp(-0.022 * max(0.0, distortedDistOuter));
  
  // Border Core Mask
  float borderMask = smoothstep(6.0, -2.0, distOuter) * smoothstep(-innerThickness - 6.0, -innerThickness + 2.0, distInner);
  
  // Total Volumetric Energy Density
  float energyDensity = mistFalloff * 0.85 + borderMask * 1.6;
  energyDensity *= (0.6 + 0.4 * warpVal);
  
  // Glowing Sparkles floating outward
  float sparkNoise = snoise(st * 5.0 + vec2(0.0, -t * 1.5));
  float spark = pow(max(0.0, sparkNoise), 8.0) * 3.5;
  
  // Color Palette Definitions (Specified Requirements)
  vec3 cCore, cInner, cOuter, cDeep;
  
  if (uTheme == 1) { // Red Dragonfire
    cCore  = vec3(1.0, 0.95, 0.8);  // Bright Core
    cInner = vec3(1.0, 0.5, 0.0);   // Fire Orange
    cOuter = vec3(0.8, 0.0, 0.1);   // Crimson
    cDeep  = vec3(0.2, 0.0, 0.05);  // Dark Fire
  } else if (uTheme == 2) { // Emerald Life
    cCore  = vec3(0.9, 1.0, 0.95);  // Radiant White-Green
    cInner = vec3(0.0, 0.9, 0.5);   // Emerald Mint
    cOuter = vec3(0.0, 0.5, 0.2);   // Forest Green
    cDeep  = vec3(0.0, 0.15, 0.08); // Dark Jade
  } else if (uTheme == 3) { // Void Energy
    cCore  = vec3(0.98, 0.9, 1.0);  // Cosmic Core
    cInner = vec3(0.8, 0.1, 1.0);   // Magenta Arcane
    cOuter = vec3(0.4, 0.0, 0.8);   // Dark Violet
    cDeep  = vec3(0.12, 0.0, 0.25); // Deep Void
  } else if (uTheme == 4) { // Holy Sun
    cCore  = vec3(1.0, 1.0, 0.9);   // Celestial White
    cInner = vec3(1.0, 0.8, 0.1);   // Golden Sun
    cOuter = vec3(0.9, 0.4, 0.0);   // Amber Flare
    cDeep  = vec3(0.25, 0.08, 0.0); // Deep Gold
  } else { // 0: Blue Ethereal Mana (Target Specification)
    cCore  = vec3(0.682, 0.937, 1.0); // #AEEFFF Bright Cyan/White Core
    cInner = vec3(0.0, 0.635, 1.0);  // #00A2FF Vibrant Arcane Blue
    cOuter = vec3(0.419, 0.0, 1.0);  // #6B00FF Deep Magenta/Violet
    cDeep  = vec3(0.141, 0.0, 0.275); // #240046 Dark Violet Edge
  }
  
  // Multistage Fluid Gradient Interpolation based on warpVal & distOuter
  vec3 color = mix(cDeep, cOuter, smoothstep(120.0, 30.0, distOuter));
  color = mix(color, cInner, smoothstep(30.0, -10.0, distOuter) * (0.6 + 0.4 * length(q)));
  color = mix(color, cCore, smoothstep(5.0, -innerThickness * 0.5, distOuter) * (0.5 + 0.5 * length(rWarp)));
  
  // Add Specular Sparkles
  color += cCore * spark * 0.4;
  
  // Total Alpha computation
  float alpha = clamp(energyDensity * uGlowIntensity, 0.0, 1.0);
  
  // Hollow out card center so physical card rests un-obscured
  if (distInner < -innerThickness * 0.8) {
    float centerFade = smoothstep(-innerThickness, -innerThickness * 0.8, distInner);
    alpha *= centerFade;
  }
  
  // Output Color with pre-multiplied alpha
  gl_FragColor = vec4(color * alpha, alpha);
}
`;

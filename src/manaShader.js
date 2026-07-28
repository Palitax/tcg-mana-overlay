/**
 * Volumetric Ethereal Mana Smoke Shader Engine
 * 100% Safari / Mobile WebGL Compliant GLSL ES 100 Code
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
uniform vec2 uResolution;
uniform vec2 uCenter;
uniform vec2 uFrameSize;
uniform float uRotation;
uniform float uCornerRadius;
uniform float uBorderThickness;
uniform float uGlowIntensity;
uniform float uTurbulence;

uniform vec3 uColorCore;
uniform vec3 uColorInner;
uniform vec3 uColorOuter;
uniform vec3 uColorDeep;

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

// 4-Octave Fractal Brownian Motion (FBM)
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

// Domain Warped Noise
float domainWarpedNoise(vec2 p, float time, out vec2 q, out vec2 r) {
  vec2 tVec = vec2(time * 0.15, time * 0.12);
  
  q.x = fbm(p + vec2(0.0, 0.0));
  q.y = fbm(p + vec2(5.2, 1.3));
  
  r.x = fbm(p + 4.0 * q + vec2(1.7, 9.2) + tVec);
  r.y = fbm(p + 4.0 * q + vec2(8.3, 2.8) - tVec * 0.8);
  
  return fbm(p + 4.0 * r + tVec * 0.5);
}

// Signed Distance Function (SDF) of Toploader Box
float sdToploader(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + vec2(r);
  return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
}

void main(void) {
  vec2 screenPos = vec2(gl_FragCoord.x, uResolution.y - gl_FragCoord.y);
  vec2 pos = screenPos - uCenter;
  
  float cosA = cos(-uRotation);
  float sinA = sin(-uRotation);
  mat2 rot = mat2(cosA, -sinA, sinA, cosA);
  pos = rot * pos;
  
  vec2 halfSize = uFrameSize * 0.5;
  float r = clamp(uCornerRadius, 2.0, min(halfSize.x, halfSize.y) - 2.0);
  
  float distOuter = sdToploader(pos, halfSize, r);
  
  float innerThickness = uBorderThickness;
  vec2 innerHalfSize = max(vec2(1.0), halfSize - vec2(innerThickness));
  float innerRadius = max(1.0, r - innerThickness * 0.5);
  float distInner = sdToploader(pos, innerHalfSize, innerRadius);
  
  float t = uTime * 0.8 * uTurbulence;
  vec2 st = pos * 0.008;
  
  vec2 q, rWarp;
  float warpVal = domainWarpedNoise(st, t, q, rWarp);
  
  float distortedDistOuter = distOuter - warpVal * 36.0;
  float mistFalloff = exp(-0.018 * max(0.0, distortedDistOuter));
  
  float borderMask = smoothstep(6.0, -2.0, distOuter) * smoothstep(-innerThickness - 6.0, -innerThickness + 2.0, distInner);
  
  float energyDensity = mistFalloff * 0.95 + borderMask * 1.8;
  energyDensity *= (0.65 + 0.35 * warpVal);
  
  float sparkNoise = snoise(st * 5.0 + vec2(0.0, -t * 1.5));
  float spark = pow(max(0.0, sparkNoise), 8.0) * 3.5;
  
  vec3 color = mix(uColorDeep, uColorOuter, smoothstep(140.0, 20.0, distOuter));
  color = mix(color, uColorInner, smoothstep(20.0, -10.0, distOuter) * (0.6 + 0.4 * length(q)));
  color = mix(color, uColorCore, smoothstep(5.0, -innerThickness * 0.5, distOuter) * (0.5 + 0.5 * length(rWarp)));
  
  color += uColorCore * spark * 0.4;
  
  float alpha = clamp(energyDensity * uGlowIntensity, 0.0, 1.0);
  
  if (distInner < -innerThickness * 0.8) {
    float centerFade = smoothstep(-innerThickness, -innerThickness * 0.8, distInner);
    alpha *= centerFade;
  }
  
  gl_FragColor = vec4(color * alpha, alpha);
}
`;

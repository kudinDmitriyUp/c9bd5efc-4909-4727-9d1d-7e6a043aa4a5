import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { EnvModule } from "@/components/kit/env/EnvStage";
import { cameraRig } from "@/components/kit/env/cameraRig";

const EYE = 7;
const PITCH = 0.07;
const RANGE = 520;
const NOISE = 48;
const TAN_X = Math.tan(THREE.MathUtils.degToRad(20)) * 1.6;

const COMMON = `
uniform vec3 uSky, uHaze, uGlow, uCloud, uShade, uSun, uGround;
uniform float uTime, uGlowK, uHazeK, uDeck, uMirror, uLake, uLand, uMist, uSunK;
float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3. - 2. * f); return mix(mix(hash(i), hash(i + vec2(1., 0.)), u.x), mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), u.x), u.y); }
float fbm(vec2 p){ float s = 0., a = .5; for (int i = 0; i < OCT; i++) { s += a * noise(p); p = mat2(1.6, 1.2, -1.2, 1.6) * p + 3.1; a *= .5; } return s; }
float breathe(){ return 1. + .05 * sin(uTime * .23) + .025 * sin(uTime * .61 + 1.3); }
vec3 horizonCol(vec3 d){
  vec2 f = normalize(d.xz + vec2(0., -1e-4)), s = normalize(uSun.xz);
  float a = max(dot(f, s), 0.);
  float warm = (pow(a, 7.) * .95 + pow(a, 1.6) * .3) * smoothstep(.4, -.02, d.y);
  return mix(uHaze, uGlow, clamp(warm * uGlowK * breathe(), 0., 1.));
}
vec3 skyCol(vec3 d){
  vec3 c = mix(horizonCol(d), uSky, pow(smoothstep(-.02, .55, d.y), .7));
  float g = max(dot(d, uSun), 0.);
  float k2 = uSunK * uSunK;
  c = mix(c, uGlow * 1.04, clamp((pow(g, 14. / k2) * .32 + pow(g, 120. / k2) * .45) * uSunK * uGlowK * breathe(), 0., 1.));
  return c;
}
vec3 mistCol(vec3 air){ return mix(air, mix(uCloud, uGlow, .2 * uGlowK), .4); }
float mistK(float y, float dist){ return uMist * smoothstep(uDeck + 52., uDeck + 4., y) * (1. - exp(-dist * .0024)); }
float depthFog(float y, float dist){
  float f = 1. - exp(-dist * .0016 * uHazeK);
  float low = exp(-max(y - uDeck, 0.) / 38.) * (1. - exp(-dist * .0035)) * .5 * uHazeK;
  return clamp(f + low * (1. - f), 0., .93);
}
vec3 seaCol(vec3 o, vec3 d){
  float y0 = uDeck - 2.;
  if (d.y > -1e-4 || o.y < y0) return horizonCol(d);
  float t = (o.y - y0) / -d.y;
  vec2 p = o.xz + d.xz * t;
  if (uLand > .5) {
    float gn = noise(p * .02) * .6 + noise(p * .07) * .4;
    vec3 L = normalize(uSun + vec3(0., .12, 0.));
    vec3 g = uGround * (uSky * .45 + uGlow * 2.6 * uGlowK * smoothstep(-.05, .35, L.y) * .75) * (.72 + .5 * gn);
    float dist = t * length(d);
    vec3 air = mix(horizonCol(d), skyCol(normalize(d + vec3(0., .02, 0.))), .35);
    g = mix(g, air, depthFog(y0, dist));
    return mix(g, mistCol(air), clamp(mistK(y0, dist), 0., .95));
  }
  vec2 q = p * vec2(.011, .016) + vec2(uTime * .006, uTime * .002);
  vec2 sd = normalize(uSun.xz) * vec2(.03, .045);
  float n = fbm(q), n2 = fbm(q + sd);
  float fine = 1. - smoothstep(250., 1400., t);
  float lit = clamp(.55 + (n - n2) * 7. * fine, 0., 1.);
  float g = pow(max(dot(normalize(d.xz), normalize(uSun.xz)), 0.), 6.);
  vec3 c = mix(mix(uShade, uCloud, .55), uCloud, lit);
  c = mix(c, uGlow * 1.05, clamp((g * .45 + lit * g * .25) * uGlowK * breathe(), 0., 1.));
  float fog = 1. - exp(-t * .0028 * uHazeK);
  return mix(c, horizonCol(d), clamp(fog, 0., 1.) * .96);
}`;

const RAY_VERTEX = `
uniform vec2 uTan;
varying vec3 vRay;
varying vec2 vUv;
void main(){
  vUv = uv;
  vRay = vec3(position.x * uTan.x, position.y * uTan.y, -1.) * mat3(viewMatrix);
  gl_Position = vec4(position.xy, 1., 1.);
}`;

const SKY_FRAGMENT = `
${COMMON}
uniform float uPuffs;
varying vec3 vRay;
vec4 cirrus(vec3 d){
  if (d.y < .01) return vec4(0.);
  float t = 1. / d.y;
  vec2 p = d.xz * t * vec2(.35, 1.4) + vec2(uTime * .004, 0.);
  float n = fbm(p + fbm(p * .5 + 4.) * .8);
  float c = smoothstep(.56, .82, n) * smoothstep(.03, .14, d.y) * (1. - smoothstep(.45, .8, d.y));
  if (c < .003) return vec4(0.);
  float g = max(dot(d, uSun), 0.);
  vec3 col = mix(mix(uCloud, uSky, .35), uGlow, clamp(.35 + pow(g, 3.) * .6, 0., 1.) * uGlowK);
  col = mix(col, horizonCol(d), smoothstep(4., 14., t) * .7);
  return vec4(col, c * .55);
}
float puffN(vec3 d){
  vec2 p = d.xz / (d.y + .02) * vec2(1.7, 1.9) + vec2(uTime * .006, 0.);
  return fbm(p * 1.2 + fbm(p * .5 + 2.) * .7);
}
vec4 cumulus(vec3 d){
  if (uPuffs < .01 || d.y < .004) return vec4(0.);
  float n = puffN(d);
  float c = smoothstep(.66 - .12 * uPuffs, .78 - .1 * uPuffs, n) * smoothstep(.004, .03, d.y) * (1. - smoothstep(.3, .55, d.y));
  if (c < .003) return vec4(0.);
  float up = puffN(normalize(d + vec3(0., .015, 0.)));
  float lit = clamp(.55 + (n - up) * 5., 0., 1.);
  float g = max(dot(normalize(d.xz), normalize(uSun.xz)), 0.);
  vec3 col = mix(mix(uShade, uCloud, .5), mix(uCloud, uGlow, .25 * uGlowK), lit);
  col = mix(col, uCloud * 1.04, pow(g, 6.) * lit * .3 * uGlowK);
  col = mix(col, horizonCol(d), (1. - smoothstep(.004, .07, d.y)) * .6);
  return vec4(col, c * .96);
}
void main(){
  vec3 d = normalize(vRay);
  d.y *= uMirror;
  vec3 o = cameraPosition;
  vec3 col;
  if (d.y < 0.) col = uLake > .5 ? horizonCol(d) : seaCol(o, d);
  else {
    col = skyCol(d);
    vec4 k = cirrus(d);
    col = mix(col, k.rgb, k.a);
    vec4 cu = cumulus(d);
    col = mix(col, cu.rgb, cu.a);
  }
  float g = dot(d, uSun);
  float k2 = uSunK * uSunK;
  col += uGlow * smoothstep(1. - .00035 * k2, 1. - .0002 * k2, g) * 2.4 * uGlowK * step(0., d.y);
  col += uGlow * pow(max(g, 0.), 400. / k2) * .5 * uGlowK;
  gl_FragColor = vec4(col, 1.);
}`;

const CLOUD_FRAGMENT = `
${COMMON}
uniform sampler3D uNoise;
uniform sampler2D uDist;
uniform float uCover, uSigma;
varying vec3 vRay;
varying vec2 vUv;
const float YB = -28., YT = 1.;
float density(vec3 p, bool detail, out float h){
  h = (p.y - uDeck - YB) / (YT - YB);
  vec3 q = p + vec3(uTime * .55, 0., uTime * .18);
  float cov = texture(uNoise, vec3(q.xz * .0032 + vec2(.41, .23), .37)).r;
  float z = length(p.xz - cameraPosition.xz);
  cov = clamp((cov - .45) * .7 + .74 + uCover, 0., 1.) * smoothstep(${RANGE.toFixed(1)}, ${(RANGE * 0.55).toFixed(1)}, z);
  float heap = texture(uNoise, vec3(q.xz * .014, .61)).r;
  float top = .6 + .3 * cov + (heap - .5) * .42 + (texture(uNoise, vec3(q.xz * .045, .83)).r - .5) * .14;
  float prof = smoothstep(top, top - .2, h);
  float c = cov * prof;
  if (c < .01) return -1.;
  float shape = texture(uNoise, q * vec3(.0105, .02, .0115) + vec3(sin(uTime * .021) * .04, uTime * .003, cos(uTime * .017) * .03)).r;
  float dd = max(clamp((shape - (1. - c)) / c, 0., 1.), smoothstep(top - .12, top - .4, h) * 1.2);
  if (detail && dd > 0. && dd < .7) {
    float det = texture(uNoise, q * .04 + vec3(uTime * .005, uTime * .006, 0.)).g;
    det = mix(1. - det, det, smoothstep(.1, .5, h));
    dd = clamp((dd - det * .08) / (1. - det * .08), 0., 1.);
  }
  return dd;
}
float hg(float c, float g){ float g2 = g * g; return (1. - g2) / pow(1. + g2 - 2. * g * c, 1.5); }
void main(){
  vec3 o = cameraPosition, d = normalize(vRay);
  float yt = YT + uDeck, yb = YB + uDeck;
  float dy = abs(d.y) < 1e-4 ? -1e-4 : d.y;
  float ta = (yt - o.y) / dy, tb = (yb - o.y) / dy;
  float t0 = max(min(ta, tb), 0.);
  float inv = texture2D(uDist, vUv).r;
  float t1 = min(min(max(ta, tb), ${(RANGE * 1.05).toFixed(1)} / max(length(d.xz), .2)), inv > 0. ? 1. / inv : 1e5);
  if (uLake > .5) t1 = d.y < 0. ? min(t1, o.y / -d.y) : t1;
  if (t0 >= t1) { gl_FragColor = vec4(0.); return; }
  vec3 L = normalize(uSun + vec3(0., .28, 0.));
  float ct = dot(d, L);
  float phase = mix(hg(ct, .55), hg(ct, -.2), .35);
  vec3 sunC = uGlow * 1.2 * uGlowK * breathe();
  vec3 col = vec3(0.);
  float T = 1.;
  float ign = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(.06711056, .00583715))));
  float t = t0 + clamp(t0 * .02, .2, 3.5) * ign;
  for (int i = 0; i < STEPS; i++) {
    if (t > t1 || T < .015) break;
    float dt = clamp(t * .02, .2, 3.5);
    vec3 p = o + d * t;
    float h;
    float dd = density(p, true, h);
    if (dd > .002) {
      float od = 0., ls = 1., hh;
      vec3 lp = p;
      for (int j = 0; j < LSTEPS; j++) { lp += L * ls; od += max(density(lp, false, hh), 0.) * ls; ls *= 2.; }
      float Tl = max(exp(-od * uSigma * .5), .5 * exp(-od * uSigma * .07));
      float powder = 1. - exp(-dd * 5.);
      vec3 amb = mix(uShade, mix(uCloud, uSky, .12), smoothstep(.25, .95, h)) * (.86 + .14 * powder);
      vec3 light = sunC * Tl * phase * .42 * (.5 + .5 * powder) + amb * .78;
      light = mix(light, seaCol(o, d) * 1.01, clamp(1. - exp(-t * .0028 * uHazeK), 0., 1.) * .9);
      float tr = exp(-dd * uSigma * dt);
      col += T * (1. - tr) * light;
      T *= tr;
    }
    t += dd < 0. ? max(dt * 4., .8) : dt;
  }
  gl_FragColor = vec4(col, 1. - T);
}`;

const COMPOSITE_FRAGMENT = `
uniform sampler2D uClouds;
uniform vec2 uPx;
varying vec2 vUv;
void main(){
  vec2 o = uPx * 1.6;
  vec4 c = texture2D(uClouds, vUv) * .2;
  c += (texture2D(uClouds, vUv + vec2(o.x, 0.)) + texture2D(uClouds, vUv - vec2(o.x, 0.)) + texture2D(uClouds, vUv + vec2(0., o.y)) + texture2D(uClouds, vUv - vec2(0., o.y))) * .125;
  c += (texture2D(uClouds, vUv + o) + texture2D(uClouds, vUv - o) + texture2D(uClouds, vUv + vec2(o.x, -o.y)) + texture2D(uClouds, vUv - vec2(o.x, -o.y))) * .075;
  gl_FragColor = c;
}`;

const DIST_FRAGMENT = `
varying vec3 vW;
varying vec2 vUv;
void main(){ gl_FragColor = vec4(1. / length(vW - cameraPosition), 0., 0., 1.); }`;

const BICUBIC = `
vec4 bicubic(sampler2D t, vec2 uv){
  vec2 ts = vec2(textureSize(t, 0));
  vec2 p = uv * ts - .5, f = fract(p);
  p -= f;
  vec2 f2 = f * f, f3 = f2 * f;
  vec2 w0 = (1. - 3. * f + 3. * f2 - f3) / 6., w1 = (4. - 6. * f2 + 3. * f3) / 6., w2 = (1. + 3. * f + 3. * f2 - 3. * f3) / 6., w3 = f3 / 6.;
  vec2 s0 = w0 + w1, s1 = w2 + w3;
  vec2 c0 = (p - .5 + w1 / s0) / ts, c1 = (p + 1.5 + w3 / s1) / ts;
  return mix(mix(textureLod(t, c0, 0.), textureLod(t, vec2(c1.x, c0.y), 0.), s1.x), mix(textureLod(t, vec2(c0.x, c1.y), 0.), textureLod(t, c1, 0.), s1.x), s1.y);
}`;

const PEAK_VERTEX = `
uniform sampler2D uBake;
uniform float uMirror, uScale, uBase;
varying vec3 vW;
varying vec2 vUv;
${BICUBIC}
void main(){
  vUv = uv;
  vec3 p = position;
  p.y = bicubic(uBake, uv).r * uScale - uBase;
  vec4 w = modelMatrix * vec4(p, 1.);
  vW = w.xyz;
  w.y *= uMirror;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const HEIGHT_FRAGMENT = `
uniform vec2 uTip;
uniform float uSeed, uF, uSoft;
varying vec2 vUv;
float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3. - 2. * f); return mix(mix(hash(i), hash(i + vec2(1., 0.)), u.x), mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), u.x), u.y); }
vec3 noised(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3. - 2. * f), du = 6. * f * (1. - f);
  float a = hash(i), b = hash(i + vec2(1., 0.)), c = hash(i + vec2(0., 1.)), d = hash(i + vec2(1., 1.));
  return vec3(a + (b - a) * u.x + (c - a) * u.y + (a - b - c + d) * u.x * u.y, du * (vec2(b - a, c - a) + (a - b - c + d) * u.yx));
}
const mat2 M = mat2(1.6, 1.2, -1.2, 1.6);
float fbm3(vec2 p){ float s = 0., a = .5; for (int i = 0; i < 3; i++) { s += a * noise(p); p = M * p + 3.1; a *= .5; } return s / .875; }
float ridged(vec2 p){
  float s = 0., a = .5, prev = 1., norm = 0.;
  for (int i = 0; i < 7; i++) {
    float n = 1. - abs(noise(p) * 2. - 1.);
    n *= n;
    s += n * a * prev;
    norm += a;
    prev = min(1., n * 1.2);
    p = M * p * .97 + vec2(5.3, 2.9);
    a *= .5;
  }
  return s / norm;
}
float eroded(vec2 p){
  float s = 0., b = .5;
  vec2 d = vec2(0.);
  for (int i = 0; i < 8; i++) {
    vec3 n = noised(p);
    d += n.yz;
    s += b * n.x / (1. + dot(d, d));
    b *= .5;
    p = M * p + 1.7;
  }
  return s;
}
void main(){
  vec2 q = vec2(vUv.x * 2. - 1., 1. - vUv.y * 2.);
  vec2 s = vec2(uSeed * 7.31, uSeed * 3.17);
  vec2 w = q + (vec2(fbm3(q * 1.3 + s), fbm3(q * 1.3 - s + 5.)) - .5) * .5;
  float r = length((w - uTip) * vec2(1., 1.2));
  float cone = max(0., 1. - r / .9);
  float rid = ridged(w * 2.5 * uF + s);
  float ero = eroded(w * 5. * uF + s * 1.7);
  float edge = 1. - smoothstep(.72, 1., max(abs(q.x), abs(q.y)));
  float h = (pow(cone, 1.3) * .75 + cone * rid * .6 + rid * .16 + (cone * .7 + .3) * (ero - .45) * .2) * edge;
  float hs = (cone * .3 + fbm3(w * vec2(1.6, 1.) * uF + s) * .8 + (ero - .45) * .25) * edge;
  gl_FragColor = vec4(mix(h, hs, uSoft), 0., 0., 1.);
}`;

const BAKE_FRAGMENT = `
uniform sampler2D uH;
uniform vec2 uTex;
uniform vec3 uL;
uniform float uScale, uBase, uMax, uTexW, uTexD;
float H(ivec2 c){ c = clamp(c, ivec2(0), ivec2(uTex) - 1); return texelFetch(uH, c, 0).r / uMax * uScale - uBase; }
void main(){
  ivec2 c = ivec2(gl_FragCoord.xy);
  float h = H(c);
  float dx = (H(c + ivec2(1, 0)) - H(c - ivec2(1, 0))) / (2. * uTexW) * .4 + (H(c + ivec2(3, 0)) - H(c - ivec2(3, 0))) / (6. * uTexW) * .6;
  float dz = (H(c + ivec2(0, 1)) - H(c - ivec2(0, 1))) / (-2. * uTexD) * .4 + (H(c + ivec2(0, 3)) - H(c - ivec2(0, 3))) / (-6. * uTexD) * .6;
  vec3 n = normalize(vec3(-dx, 1., -dz));
  vec2 dir = normalize(uL.xz + vec2(1e-5));
  float slope = uL.y / max(length(uL.xz), 1e-3);
  vec2 st = vec2(dir.x / uTexW, -dir.y / uTexD) * 1.5;
  float top = uScale - uBase;
  float s = 1.;
  for (int i = 1; i < 220; i++) {
    float fi = float(i);
    vec2 p = vec2(c) + .5 + st * fi;
    if (p.x < 0. || p.y < 0. || p.x >= uTex.x || p.y >= uTex.y) break;
    float ry = h + .4 + slope * 1.5 * fi;
    if (ry > top) break;
    s = min(s, smoothstep(-.03, .03, (ry - H(ivec2(p))) / (1.5 * fi)));
    if (s <= 0.) break;
  }
  gl_FragColor = vec4((h + uBase) / uScale, n.x, n.z, s);
}`;

const PINE_VERTEX = `
uniform float uMirror;
attribute float aT;
varying vec3 vW, vN;
varying float vH, vT, vI;
void main(){
  vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.);
  vW = w.xyz;
  vN = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);
  vH = position.y;
  vT = aT;
  vI = fract(sin(dot(instanceMatrix[3].xz, vec2(12.9898, 78.233))) * 43758.5453);
  w.y *= uMirror;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const PINE_FRAGMENT = `
${COMMON}
uniform vec3 uPine, uSnow;
uniform float uSnowK;
varying vec3 vW, vN;
varying float vH, vT, vI;
void main(){
  if (uLake > .5 && vW.y < 0.) discard;
  vec3 o = cameraPosition * vec3(1., uMirror, 1.);
  vec3 dv = vW - o;
  float dist = length(dv);
  vec3 v = -dv / dist;
  vec3 n = normalize(vN);
  float ndl = max(dot(n, uSun) * .6 + .4, 0.);
  vec3 amb = mix(uShade, uSky, n.y * .5 + .5) * .5;
  float nd = 1. - smoothstep(40., 220., dist);
  float needle = mix(1., .8 + .4 * (noise(vW.xz * 3.1 + vW.y * 2.3) * .6 + noise(vW.xz * 7.3 - vW.y * 5.1) * .4), nd);
  float tier = .66 + .34 * smoothstep(0., .8, vT);
  vec3 col = uPine * (amb + uGlow * ndl * .55 * uGlowK) * (.85 + .15 * smoothstep(0., 5., vH)) * tier * needle * (.86 + .28 * vI);
  col = mix(col, uSnow * (amb * .9 + uGlow * ndl * .7 * uGlowK), smoothstep(.55, .85, n.y + hash(floor(vW.xz * 2.)) * .2) * uSnowK * .55);
  vec3 air = mix(horizonCol(-v), skyCol(normalize(-v + vec3(0., .02, 0.))), .35);
  col = mix(col, air, depthFog(vW.y, dist));
  col = mix(col, mistCol(air), clamp(mistK(vW.y, dist), 0., .95));
  col = mix(col, seaCol(o, -v), smoothstep(uDeck + 2., uDeck - 2., vW.y) * (1. - uLake));
  gl_FragColor = vec4(col, 1.);
}`;

const WATER_FRAGMENT = `
${COMMON}
uniform sampler2D uRefl;
uniform vec2 uRes;
uniform vec3 uWater;
varying vec3 vRay;
void main(){
  vec3 rd = normalize(vRay);
  if (uLake < .5 || rd.y > -1e-5) discard;
  vec3 o = cameraPosition;
  float t = o.y / -rd.y;
  vec2 p = o.xz + rd.xz * t;
  float fp = 1. - smoothstep(20., 500., t);
  vec2 q = p * vec2(.18, .5) + vec2(uTime * .04, uTime * .11);
  float n0 = noise(q) * .6 + noise(q * 2.7 + 3.) * .4;
  float nx = noise(q + vec2(.12, 0.)) * .6 + noise((q + vec2(.12, 0.)) * 2.7 + 3.) * .4;
  float nz = noise(q + vec2(0., .12)) * .6 + noise((q + vec2(0., .12)) * 2.7 + 3.) * .4;
  vec3 n = normalize(vec3((n0 - nx) * .1 * fp, 1., (n0 - nz) * .22 * fp));
  float cosi = max(dot(n, -rd), 0.);
  float F = .02 + .98 * pow(1. - cosi, 5.);
  vec2 suv = gl_FragCoord.xy / uRes + vec2(n.x, n.z) * .05 * fp;
  vec3 refl = texture2D(uRefl, suv).rgb;
  float lum = dot(skyCol(reflect(rd, n)), vec3(.3, .59, .11));
  vec3 body = uWater * (.75 + .3 * lum);
  vec3 col = mix(body, refl * .92, clamp(F * 1.2 + .62, 0., 1.));
  float s = max(dot(reflect(rd, n), uSun), 0.);
  col += uGlow * (pow(s, 60.) * .25 + pow(s, 500.) * .8) * uGlowK;
  float fog = 1. - exp(-t * .0011 * uHazeK);
  col = mix(col, horizonCol(rd), clamp(fog, 0., 1.) * .55 + (1. - smoothstep(0., .01, -rd.y)) * .4);
  gl_FragColor = vec4(col, 1.);
}`;

const PEAK_FRAGMENT = `
${COMMON}
uniform vec3 uRock, uSnow, uPine;
uniform float uSnowK, uGroom, uSnowLine, uGreen, uCanopy;
uniform sampler2D uBake;
uniform float uScale;
uniform vec2 uSpan;
varying vec3 vW;
varying vec2 vUv;
${BICUBIC}
const mat2 R = mat2(.8, .6, -.6, .8);
float micro(vec2 p){ return noise(p * .45) * .6 + noise(R * p * 1.3 + 3.) * .4; }
void main(){
  if (uLake > .5 && vW.y < 0.) discard;
  vec3 o = cameraPosition * vec3(1., uMirror, 1.);
  vec3 dv = vW - o;
  float dist = length(dv);
  vec3 v = -dv / dist;
  vec4 bk = bicubic(uBake, vUv);
  vec3 n = normalize(vec3(bk.g, sqrt(max(1. - bk.g * bk.g - bk.b * bk.b, .01)), bk.b));
  float vH = bk.r, vSh = bk.a;
  float fd = 1. - smoothstep(300., 900., dist);
  vec3 L = normalize(uSun + vec3(0., .12, 0.));
  vec2 tx = 4. / vec2(textureSize(uBake, 0));
  float ring = (texture2D(uBake, vUv + vec2(tx.x, 0.)).r + texture2D(uBake, vUv - vec2(tx.x, 0.)).r + texture2D(uBake, vUv + vec2(0., tx.y)).r + texture2D(uBake, vUv - vec2(0., tx.y)).r) * .25;
  float ao = 1. - smoothstep(0., .22, (ring - vH) * uScale / (uSpan.x * tx.x)) * .38;
  float fm = 1. - smoothstep(50., 280., dist);
  float m0 = micro(vW.xz);
  vec2 mg = vec2(micro(vW.xz + vec2(.3, 0.)) - m0, micro(vW.xz + vec2(0., .3)) - m0) / .3;
  n = normalize(n - vec3(mg.x, 0., mg.y) * .13 * fm);
  vec2 gp = R * vec2((vW.x + vW.z * .4) * .16, vW.y * .06);
  float gully = noise(gp) * .65 + noise(R * gp * 2.6 + 4.) * .35;
  float gx = noise(gp + R * vec2(.13, 0.)) * .65 + noise(R * (gp + R * vec2(.13, 0.)) * 2.6 + 4.) * .35;
  vec3 t1 = normalize(cross(vec3(0., 1., 0.), n) + vec3(1e-4, 0., 0.));
  float steep = 1. - smoothstep(.55, .85, n.y);
  float n0 = n.y;
  float lf = noise(vW.xz * .011 + 3.) * .6 + noise(R * vW.xz * .029) * .4;
  float gs = smoothstep(.3, .56, n0 + (lf - .5) * .3 - (gully - .5) * .35 * steep + vH * .15) * smoothstep(uSnowLine, uSnowLine + 16., vW.y + (lf - .5) * 30.);
  n = normalize(n + t1 * (gx - gully) * 1.6 * fd * steep * (1. - gs * uGroom * .6));
  vec2 sp = R * vW.xz;
  float sn = noise(sp * .13) * .5 + noise(R * sp * .41) * .3 + noise(sp * 1.1 + 7.) * .2;
  float slope = n.y + (sn - .5) * .2 + (gully - .5) * .3 * steep;
  float snow = smoothstep(.5 - uSnowK * .22, .6 - uSnowK * .22, slope + vH * .12) * smoothstep(.03, .12, vH + (sn - .5) * .08 + uSnowK * .1);
  snow = mix(snow, gs, uGroom);
  float strata = .82 + .3 * (noise(R * vec2(vW.x * .2 + vW.z * .1, vW.y * .5)) - .5) + .15 * (gully - .5);
  float green = smoothstep(.42, .7, n0 + (lf - .5) * .3 - (gully - .5) * .2 * steep) * smoothstep(95., 45., vW.y + (lf - .5) * 40.) * uGreen;
  float fc = 1. - smoothstep(120., 420., dist);
  float crown = mix(.5, noise(vW.xz * .5) * .6 + noise(R * vW.xz * 1.3) * .4, fc);
  float canopy = smoothstep(.42, .6, n0 + (lf - .5) * .2) * uCanopy;
  vec3 land = mix(uRock * strata, uGround * (.8 + .35 * lf + .15 * (sn - .5)), green);
  land = mix(land, uPine * (.6 + .8 * crown), canopy);
  vec3 alb = mix(land, uSnow, snow) * mix(1., .9 + .2 * m0, fm * (1. - snow * .6));
  float sh = vSh;
  float ndl = dot(n, L);
  float dif = smoothstep(-.05, .35, ndl) * sh * mix(1., ao, .45);
  vec3 sunC = uGlow * 2.6 * uGlowK * breathe();
  vec3 amb = mix(uShade, uSky, n.y * .5 + .5) * mix(.42, .7, smoothstep(0., .7, vH)) * ao;
  vec3 bounce = mix(uCloud, uGlow, .3) * (.5 - .5 * n.y) * exp(-max(vW.y - uDeck, 0.) / 45.) * .45 * (1. - max(uLake, uLand) * .6) * ao;
  vec3 col = alb * (amb + bounce + sunC * dif * .75);
  float back = pow(max(dot(-v, uSun), 0.), 2.);
  float rim = pow(1. - max(dot(n, v), 0.), 3.);
  col += uGlow * rim * back * (.25 + .4 * snow) * sh * uGlowK;
  vec3 air = mix(horizonCol(-v), skyCol(normalize(-v + vec3(0., .02, 0.))), .35);
  col = mix(col, air, depthFog(vW.y, dist));
  col = mix(col, mistCol(air), clamp(mistK(vW.y, dist), 0., .95));
  float wn = noise(vW.xz * .03 + vec2(uTime * .02, 0.)) * .6 + noise(vW.xz * .09 - vec2(0., uTime * .03)) * .4;
  float wash = mix(smoothstep(uDeck + 5., uDeck - 4., vW.y + (wn - .5) * 7.), smoothstep(uDeck, uDeck - 2.5, vW.y), uLand);
  col = mix(col, seaCol(o, -v), wash * (1. - uLake));
  gl_FragColor = vec4(col, 1.);
}`;

const BLUR_FRAGMENT = `
uniform sampler2D uSrc;
uniform vec2 uDir;
uniform float uThresh;
varying vec2 vUv;
vec3 tap(vec2 o){ vec3 c = texture2D(uSrc, vUv + o).rgb; return c * smoothstep(uThresh, uThresh + .3, dot(c, vec3(.3, .59, .11))); }
void main(){
  vec3 c = tap(vec2(0.)) * .227;
  c += (tap(uDir) + tap(-uDir)) * .195;
  c += (tap(uDir * 2.) + tap(-uDir * 2.)) * .122;
  c += (tap(uDir * 3.) + tap(-uDir * 3.)) * .054;
  c += (tap(uDir * 4.) + tap(-uDir * 4.)) * .016;
  gl_FragColor = vec4(c, 1.);
}`;

const RAYS_FRAGMENT = `
uniform sampler2D uSrc;
uniform vec2 uSunUv;
uniform float uAspect;
varying vec2 vUv;
void main(){
  float far = length((vUv - uSunUv) * vec2(uAspect, 1.));
  vec2 dlt = (vUv - uSunUv) / 40. * min(1., .35 / max(far, 1e-3));
  float j = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(.06711056, .00583715))));
  vec2 uv = vUv - dlt * j;
  float acc = 0., w = 1.;
  for (int i = 0; i < 40; i++) {
    vec3 c = texture2D(uSrc, uv).rgb;
    acc += smoothstep(.75, .97, dot(c, vec3(.3, .59, .11))) * w;
    w *= .96;
    uv -= dlt;
  }
  gl_FragColor = vec4(vec3(acc / 20. * exp(-far * 2.2)), 1.);
}`;

const FINAL_FRAGMENT = `
uniform sampler2D uMain, uBloom, uRays;
uniform vec3 uHaze, uGlow, uCloud;
uniform vec2 uSunNdc;
uniform float uBloomK, uFade, uAspect, uGlowK, uSunK;
varying vec2 vUv;
float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
void main(){
  vec3 c = texture2D(uMain, vUv).rgb;
  c += texture2D(uBloom, vUv).rgb * .3 * uBloomK;
  c += uGlow * texture2D(uRays, vUv).r * .22 * uGlowK * uBloomK * uSunK * uSunK;
  vec2 sd = (vUv * 2. - 1. - uSunNdc) * vec2(uAspect, 1.);
  c += uGlow * exp(-length(sd) * 2.2 / uSunK) * .07 * uGlowK;
  c = min(c, .82 + .18 * (1. - exp(-max(c - .82, 0.) / .18)));
  c = mix(c, c * c * (3. - 2. * c), .12);
  c *= 1. - .1 * pow(length((vUv - .5) * vec2(1.1, 1.)) * 1.35, 2.6);
  c = mix(c, mix(uCloud, uHaze, .3), uFade);
  gl_FragColor = vec4(c + (hash(gl_FragCoord.xy) - .5) / 200., 1.);
}`;

const SCREEN_VERTEX = `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`;

const rng = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const noiseTexture = () => {
  const rand = rng(9);
  const points = (c: number) => Float32Array.from({ length: c * c * c * 3 }, rand);
  const grid = (c: number) => Float32Array.from({ length: c * c * c }, rand);
  const wrap = (i: number, c: number) => ((i % c) + c) % c;
  const worley = (x: number, y: number, z: number, c: number, pts: Float32Array) => {
    const fx = x * c, fy = y * c, fz = z * c;
    const ix = Math.floor(fx), iy = Math.floor(fy), iz = Math.floor(fz);
    let m = 9;
    for (let dz = -1; dz <= 1; dz++)
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const cx = ix + dx, cy = iy + dy, cz = iz + dz;
          const j = ((wrap(cz, c) * c + wrap(cy, c)) * c + wrap(cx, c)) * 3;
          const ex = cx + pts[j] - fx, ey = cy + pts[j + 1] - fy, ez = cz + pts[j + 2] - fz;
          m = Math.min(m, ex * ex + ey * ey + ez * ez);
        }
    return Math.min(1, Math.sqrt(m));
  };
  const value = (x: number, y: number, z: number, c: number, g: Float32Array) => {
    const fx = x * c, fy = y * c, fz = z * c;
    const ix = Math.floor(fx), iy = Math.floor(fy), iz = Math.floor(fz);
    const s = (t: number) => t * t * (3 - 2 * t);
    const ux = s(fx - ix), uy = s(fy - iy), uz = s(fz - iz);
    const at = (a: number, b: number, d: number) => g[(wrap(iz + d, c) * c + wrap(iy + b, c)) * c + wrap(ix + a, c)];
    const l = (a: number, b: number, t: number) => a + (b - a) * t;
    return l(l(l(at(0, 0, 0), at(1, 0, 0), ux), l(at(0, 1, 0), at(1, 1, 0), ux), uy), l(l(at(0, 0, 1), at(1, 0, 1), ux), l(at(0, 1, 1), at(1, 1, 1), ux), uy), uz);
  };
  const W = [4, 8, 16, 32].map((c) => [c, points(c)] as const);
  const V = [4, 8, 16, 32].map((c) => [c, grid(c)] as const);
  const data = new Uint8Array(NOISE * NOISE * NOISE * 2);
  for (let z = 0, i = 0; z < NOISE; z++)
    for (let y = 0; y < NOISE; y++)
      for (let x = 0; x < NOISE; x++, i += 2) {
        const px = x / NOISE, py = y / NOISE, pz = z / NOISE;
        const w = W.map(([c, p]) => worley(px, py, pz, c, p));
        const perlin = V.reduce((s, [c, g], o) => s + value(px, py, pz, c, g) * 0.5 ** (o + 1), 0) / 0.9375;
        const wf = 1 - (w[0] * 0.625 + w[1] * 0.25 + w[2] * 0.125);
        const shape = THREE.MathUtils.clamp(wf + perlin * (1 - wf) - 0.35 + (perlin - 0.5) * 0.4, 0, 1) / 0.75;
        const detail = 1 - (w[1] * 0.625 + w[2] * 0.25 + w[3] * 0.125);
        data[i] = Math.round(THREE.MathUtils.clamp(shape, 0, 1) * 255);
        data[i + 1] = Math.round(THREE.MathUtils.clamp(detail, 0, 1) * 255);
      }
  const tex = new THREE.Data3DTexture(data, NOISE, NOISE, NOISE);
  tex.format = THREE.RGFormat;
  tex.type = THREE.UnsignedByteType;
  tex.minFilter = tex.magFilter = THREE.LinearFilter;
  tex.wrapS = tex.wrapT = tex.wrapR = THREE.RepeatWrapping;
  tex.unpackAlignment = 1;
  tex.needsUpdate = true;
  return tex;
};

const vhash = (x: number, y: number, s: number) => {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

const vnoise = (x: number, y: number, s: number) => {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = vhash(ix, iy, s), b = vhash(ix + 1, iy, s), c = vhash(ix, iy + 1, s), d = vhash(ix + 1, iy + 1, s);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
};

const fbm = (x: number, y: number, s: number, o = 5) => {
  let sum = 0, amp = 0.5;
  for (let i = 0; i < o; i++) {
    sum += amp * vnoise(x, y, s + i * 17);
    [x, y] = [x * 1.7 + y * 1.1 + 3.1, -x * 1.1 + y * 1.7 + 1.7];
    amp *= 0.5;
  }
  return sum;
};

type PeakDef = { sx: number; d: number; w: number; dp: number; h: number; base: number; seed: number; tip: [number, number]; res: [number, number]; pines: number; f?: number; soft?: number; sp?: number; grove?: number; top?: number; slope?: number };

const PEAKS: PeakDef[] = [
  { sx: 0.74, d: 380, w: 400, dp: 300, h: 140, base: 36, seed: 3, tip: [-0.08, 0.05], res: [400, 300], pines: 0.5 },
  { sx: -0.98, d: 520, w: 420, dp: 300, h: 118, base: 38, seed: 7, tip: [0.12, 0], res: [300, 220], pines: 0.6 },
  { sx: 0.3, d: 900, w: 760, dp: 420, h: 200, base: 70, seed: 5, tip: [0.15, 0], res: [220, 120], pines: 0.5, f: 1.4 },
  { sx: -0.35, d: 1500, w: 2400, dp: 600, h: 230, base: 70, seed: 11, tip: [-0.2, 0], res: [320, 90], pines: 0, f: 2.6 },
];

const FOOTHILLS: PeakDef[] = [
  { sx: -0.9, d: 210, w: 220, dp: 220, h: 62, base: 50, seed: 13, tip: [0.15, 0.1], res: [220, 220], pines: 0.4, f: 1.2, soft: 0.75, sp: 2.5, grove: 0.5, top: 0.8, slope: 0.6 },
  { sx: 0.95, d: 260, w: 240, dp: 240, h: 56, base: 50, seed: 17, tip: [-0.1, 0], res: [220, 220], pines: 0.4, f: 1.2, soft: 0.75, sp: 2.5, grove: 0.5, top: 0.8, slope: 0.6 },
  { sx: 0.05, d: 150, w: 380, dp: 200, h: 36, base: 52, seed: 19, tip: [0, 0.1], res: [300, 160], pines: 0.5, f: 1.3, soft: 0.85, sp: 2.2, grove: 0.45, top: 0.9, slope: 0.6 },
];

const HILLS: PeakDef[] = [
  { sx: 0.05, d: 180, w: 760, dp: 260, h: 40, base: 54, seed: 21, tip: [0.3, 0.2], res: [380, 130], pines: 0.9, f: 1.4, soft: 1, sp: 2.2, grove: 0, top: 0.98, slope: 0.5 },
  { sx: -0.1, d: 420, w: 1300, dp: 320, h: 42, base: 52, seed: 23, tip: [-0.3, 0], res: [420, 110], pines: 0.9, f: 1.6, soft: 1, sp: 3, grove: 0, top: 0.98, slope: 0.5 },
  { sx: 0.1, d: 720, w: 1900, dp: 360, h: 52, base: 50, seed: 27, tip: [0.2, 0], res: [380, 90], pines: 0, f: 1.8, soft: 1 },
  { sx: -0.05, d: 1050, w: 2600, dp: 420, h: 78, base: 50, seed: 29, tip: [-0.1, 0], res: [360, 80], pines: 0, f: 2, soft: 0.9 },
  { sx: -0.35, d: 1600, w: 2800, dp: 600, h: 200, base: 60, seed: 11, tip: [-0.2, 0], res: [320, 90], pines: 0, f: 2.6, soft: 0.45 },
];

const TERRAIN: Record<string, PeakDef[]> = { ski: [...PEAKS, ...FOOTHILLS], highlands: [...PEAKS, ...FOOTHILLS], forest: HILLS };

const massif = (def: PeakDef, xs: number, ws: number, small: boolean, renderer: THREE.WebGLRenderer, quad: THREE.BufferGeometry) => {
  const W = def.w * ws, D = def.dp;
  const [nx, nz] = !small && def.d - D / 2 < 160 ? def.res.map((r) => Math.round(r * 1.4)) : def.res;
  const cx = def.sx * TAN_X * def.d * xs, cz = -def.d;
  const g = new THREE.PlaneGeometry(W, D, nx, nz).rotateX(-Math.PI / 2);
  const span = (Math.max(def.d - D / 2, 15) + D) / Math.max(def.d - D / 2, 15);
  const gp = g.attributes.position, gu = g.attributes.uv;
  for (let i = 0; i < gu.count; i++) {
    const t = (span ** gu.getY(i) - 1) / (span - 1);
    gu.setY(i, t);
    gp.setZ(i, D / 2 - t * D);
  }
  const tw = small ? 512 : 1024;
  const th = Math.max(128, Math.round((tw * D) / W));
  const float = renderer.extensions.has("EXT_color_buffer_float");
  const heightRT = new THREE.WebGLRenderTarget(tw, th, { type: float ? THREE.FloatType : THREE.HalfFloatType, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: false });
  const bakeRT = new THREE.WebGLRenderTarget(tw, th, { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false });
  const ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const heightMat = new THREE.ShaderMaterial({ vertexShader: SCREEN_VERTEX, fragmentShader: HEIGHT_FRAGMENT, depthTest: false, depthWrite: false, uniforms: { uTip: { value: new THREE.Vector2(...def.tip) }, uSeed: { value: def.seed }, uF: { value: def.f ?? 1 }, uSoft: { value: def.soft ?? 0 } } });
  const quadMesh = new THREE.Mesh(quad, heightMat);
  quadMesh.frustumCulled = false;
  const prev = renderer.getRenderTarget();
  renderer.setRenderTarget(heightRT);
  renderer.render(quadMesh, ortho);
  const raw = float ? new Float32Array(tw * th * 4) : new Uint16Array(tw * th * 4);
  renderer.readRenderTargetPixels(heightRT, 0, 0, tw, th, raw);
  renderer.setRenderTarget(prev);
  const hv = new Float32Array(tw * th);
  let max = 1e-4;
  for (let i = 0; i < tw * th; i++) {
    hv[i] = float ? raw[i * 4] : THREE.DataUtils.fromHalfFloat(raw[i * 4]);
    max = Math.max(max, hv[i]);
  }
  const texW = W / tw, texD = D / th;
  const bakeMat = new THREE.ShaderMaterial({
    vertexShader: SCREEN_VERTEX,
    fragmentShader: BAKE_FRAGMENT,
    depthTest: false,
    depthWrite: false,
    uniforms: { uH: { value: heightRT.texture }, uTex: { value: new THREE.Vector2(tw, th) }, uL: { value: new THREE.Vector3() }, uScale: { value: def.h }, uBase: { value: def.base }, uMax: { value: max }, uTexW: { value: texW }, uTexD: { value: texD } },
  });
  const bake = (L: THREE.Vector3) => {
    bakeMat.uniforms.uL.value.copy(L);
    quadMesh.material = bakeMat;
    const p = renderer.getRenderTarget();
    renderer.setRenderTarget(bakeRT);
    renderer.render(quadMesh, ortho);
    renderer.setRenderTarget(p);
  };
  const trees: number[] = [];
  const s = def.seed;
  const stride = Math.max(1, Math.round(((def.sp ?? 1.5) * (small && def.sp ? 1.5 : 1)) / texW));
  const H = (x: number, y: number) => (hv[THREE.MathUtils.clamp(y, 0, th - 1) * tw + THREE.MathUtils.clamp(x, 0, tw - 1)] / max) * def.h - def.base;
  for (let y = 1; def.pines && y < th - 1; y += stride)
    for (let x = 1; x < tw - 1; x += stride) {
      const hn = hv[y * tw + x] / max;
      const wx = cx - W / 2 + (x + 0.5) * texW, wz = cz + D / 2 - (y + 0.5) * texD;
      if (def.sp && Math.abs(wx) > TAN_X * xs * 1.35 * -wz + 25) continue;
      const grove = fbm(wx * 0.03 + s, wz * 0.03 - s, s + 9, 3);
      if (hn < 0.05 || hn > (def.top ?? 0.34 + grove * 0.14) || grove < (def.grove ?? 0.42)) continue;
      const dx = (H(x + 1, y) - H(x - 1, y)) / (2 * texW), dz = (H(x, y + 1) - H(x, y - 1)) / (2 * texD);
      if (1 / Math.sqrt(1 + dx * dx + dz * dz) < (def.slope ?? 0.66)) continue;
      const k = y * tw + x;
      if (vhash(k, s, 77) > def.pines) continue;
      trees.push(wx + (vhash(k, s, 5) - 0.5) * stride * texW, H(x, y) - 0.6, wz + (vhash(k, s, 6) - 0.5) * stride * texD, 0.75 + vhash(k, s, 8) * 0.6);
    }
  const mesh = { uBake: { value: bakeRT.texture }, uScale: { value: def.h }, uBase: { value: def.base }, uSpan: { value: new THREE.Vector2(W, D) } };
  return { g, bake, trees, uniforms: mesh, pos: new THREE.Vector3(cx, 0, cz), disposables: [g, heightRT, bakeRT, heightMat, bakeMat] };
};

const pineGeometry = () => {
  const tier = (r: number, h: number, y: number, s: number) => {
    const g = new THREE.ConeGeometry(r, h, 14, 2, true);
    const p = g.attributes.position;
    const t = new Float32Array(p.count);
    for (let i = 0; i < p.count; i++) {
      t[i] = p.getY(i) / h + 0.5;
      const a = Math.round(((Math.atan2(p.getZ(i), p.getX(i)) + Math.PI) / (2 * Math.PI)) * 14) % 14;
      const k = 1 + (vhash(a, s, 3) - 0.5) * 0.4 * (1 - t[i]);
      p.setXYZ(i, p.getX(i) * k, p.getY(i) - (t[i] < 0.01 ? vhash(a, s, 4) * 0.22 * h : 0), p.getZ(i) * k);
    }
    g.setAttribute("aT", new THREE.BufferAttribute(t, 1));
    return g.translate(0, y, 0);
  };
  const trunk = new THREE.CylinderGeometry(0.12, 0.16, 1.4, 6, 1, true).translate(0, 0.7, 0);
  trunk.setAttribute("aT", new THREE.BufferAttribute(new Float32Array(trunk.attributes.position.count), 1));
  const parts = [tier(1.25, 2.6, 2.2, 1), tier(0.95, 2.4, 3.6, 2), tier(0.6, 2.2, 5, 3), trunk];
  for (const p of parts) p.deleteAttribute("uv");
  return mergeGeometries(parts)!;
};

const summit: EnvModule = {
  id: "summit",
  title: "Summit",
  palette: {
    uSky: { cssVar: "--summit-sky", label: "Sky", fallback: "#93a9cb" },
    uHaze: { cssVar: "--summit-haze", label: "Haze", fallback: "#f2dccf" },
    uGlow: { cssVar: "--summit-glow", label: "Sun", fallback: "#ffd5a6" },
    uCloud: { cssVar: "--summit-cloud", label: "Cloud", fallback: "#fcf3ec" },
    uShade: { cssVar: "--summit-shade", label: "Shadow", fallback: "#a7a6c2" },
    uRock: { cssVar: "--summit-rock", label: "Rock", fallback: "#5f5d6c" },
    uSnow: { cssVar: "--summit-snow", label: "Snow", fallback: "#eef0f6" },
    uPine: { cssVar: "--summit-pine", label: "Pines", fallback: "#1f2a2c" },
    uWater: { cssVar: "--summit-water", label: "Lake", fallback: "#2c4a5c" },
    uGround: { cssVar: "--summit-ground", label: "Valley", fallback: "#56703f" },
  },
  params: [
    { key: "sunHeight", label: "Sun height", min: -0.08, max: 0.35, step: 0.01, value: 0.06 },
    { key: "deck", label: "Cloud height", min: -40, max: 14, step: 0.5, value: 0 },
    { key: "density", label: "Cloud density", min: 0, max: 2, step: 0.05, value: 1 },
    { key: "haze", label: "Haze", min: 0.3, max: 2.5, step: 0.05, value: 1 },
    { key: "bloom", label: "Bloom", min: 0, max: 2, step: 0.05, value: 1 },
    { key: "sun", label: "Sun position", min: -1, max: 1, step: 0.01, value: -0.58 },
    { key: "glow", label: "Sun glow", min: 0, max: 1.5, step: 0.05, value: 1 },
    { key: "snow", label: "Snow cover", min: 0, max: 1, step: 0.05, value: 0 },
    { key: "pines", label: "Pines", min: 0, max: 1, step: 1, value: 0 },
    { key: "lake", label: "Lake", min: 0, max: 1, step: 1, value: 0 },
    { key: "land", label: "Valley floor", min: 0, max: 1, step: 1, value: 0 },
    { key: "groom", label: "Clean snow", min: 0, max: 1, step: 0.05, value: 0 },
    { key: "snowLine", label: "Snow line", min: -60, max: 200, step: 1, value: -60 },
    { key: "green", label: "Grass", min: 0, max: 1, step: 0.05, value: 0 },
    { key: "canopy", label: "Forest cover", min: 0, max: 1, step: 0.05, value: 0 },
    { key: "mist", label: "Valley mist", min: 0, max: 1.5, step: 0.05, value: 0 },
    { key: "puffs", label: "Cumulus", min: 0, max: 1, step: 0.05, value: 0 },
    { key: "sunSize", label: "Sun size", min: 0.2, max: 1, step: 0.05, value: 1 },
    { key: "rig", label: "Camera rig", min: 0, max: 1, step: 1, value: 0 },
  ],
  variants: {
    dawn: {},
    bluehour: {
      params: { sunHeight: -0.03, glow: 0.75, haze: 1.1, bloom: 0.8 },
      colors: { "--summit-sky": "#34466f", "--summit-haze": "#a3a9c8", "--summit-glow": "#f0a98a", "--summit-cloud": "#cfd3e6", "--summit-shade": "#5d6690", "--summit-rock": "#2c3045", "--summit-snow": "#bcc6de", "--summit-pine": "#141a26", "--summit-water": "#1c2840" },
    },
    alpine: {
      params: { sunHeight: 0.14, deck: -40, density: 0, haze: 0.9, sun: -0.5, glow: 0.8, snow: 0.2, pines: 1, lake: 1 },
      colors: { "--summit-sky": "#7fa3cc", "--summit-haze": "#e3e6e6", "--summit-glow": "#fff0d6", "--summit-cloud": "#f7f6f2", "--summit-shade": "#8e9bb4", "--summit-rock": "#585c63", "--summit-snow": "#f1f4f8", "--summit-pine": "#1d2a26", "--summit-water": "#244b55" },
    },
    ski: {
      params: { sunHeight: 0.24, deck: -40, density: 0, haze: 0.8, bloom: 0.6, sun: -0.6, glow: 0.7, snow: 1, pines: 1, land: 1, groom: 1, sunSize: 0.4 },
      colors: { "--summit-sky": "#4f86c6", "--summit-haze": "#dde8f2", "--summit-glow": "#fff6e6", "--summit-cloud": "#fbfdff", "--summit-shade": "#9fb1cc", "--summit-rock": "#4d5260", "--summit-snow": "#f7f9fc", "--summit-pine": "#16231f", "--summit-water": "#2c4a5c", "--summit-ground": "#eef3f9" },
    },
    forest: {
      params: { sunHeight: 0.08, deck: -40, density: 0, haze: 1.15, bloom: 1.2, sun: -0.25, glow: 1.1, pines: 1, land: 1, groom: 1, snowLine: 200, canopy: 1, mist: 0.85, sunSize: 0.85 },
      colors: { "--summit-sky": "#9fb9d0", "--summit-haze": "#e4e6dc", "--summit-glow": "#ffdcaa", "--summit-cloud": "#f3f2ea", "--summit-shade": "#8fa2a6", "--summit-rock": "#4f5550", "--summit-snow": "#e8ece9", "--summit-pine": "#15301f", "--summit-water": "#2c4a5c", "--summit-ground": "#213826" },
    },
    highlands: {
      params: { sunHeight: 0.32, deck: -40, density: 0, haze: 0.75, bloom: 0.8, sun: 0.45, glow: 0.85, pines: 1, land: 1, groom: 1, snowLine: 112, green: 1, mist: 0.25, puffs: 0.6, sunSize: 0.4 },
      colors: { "--summit-sky": "#5f95d0", "--summit-haze": "#dfe9ee", "--summit-glow": "#fff1d8", "--summit-cloud": "#ffffff", "--summit-shade": "#8a9bb8", "--summit-rock": "#6b6a66", "--summit-snow": "#f4f6f8", "--summit-pine": "#1f3326", "--summit-water": "#2c4a5c", "--summit-ground": "#4a6630" },
    },
  },
  fov: [40, 60],
  travelPerScreen: 0,
  creep: 0,
  hover: { liquid: 0, turn: 0 },
  resolution: 1,
  antialias: false,
  setup({ scene, camera, small, colors, pointer, renderer, variant }) {
    const xs = small ? 0.46 : 1;
    const ws = small ? 0.62 : 1;
    camera.near = 1;
    camera.far = 6000;
    camera.updateProjectionMatrix();
    const sun = new THREE.Vector3();
    const shared = { uTime: { value: 0 }, uSun: { value: sun }, uGlowK: { value: 1 }, uHazeK: { value: 1 }, uDeck: { value: 0 }, uMirror: { value: 1 }, uLake: { value: 0 }, uSnowK: { value: 0 }, uTan: { value: new THREE.Vector2(1, 1) }, uLand: { value: 0 }, uMist: { value: 0 }, uSunK: { value: 1 }, uGroom: { value: 0 }, uSnowLine: { value: 0 }, uGreen: { value: 0 }, uCanopy: { value: 0 }, uPuffs: { value: 0 } };
    const defines = { OCT: small ? 4 : 5, STEPS: small ? 80 : 110, LSTEPS: small ? 3 : 4 };
    const disposables: { dispose: () => void }[] = [];
    const keep = <T extends { dispose: () => void }>(d: T) => (disposables.push(d), d);
    const quadGeo = keep(new THREE.PlaneGeometry(2, 2));
    const screen = (material: THREE.ShaderMaterial, order: number) => {
      const mesh = new THREE.Mesh(quadGeo, material);
      mesh.frustumCulled = false;
      mesh.renderOrder = order;
      return mesh;
    };
    const flat = (fragmentShader: string, uniforms: Record<string, THREE.IUniform>, vertexShader = RAY_VERTEX, extra: THREE.ShaderMaterialParameters = {}) =>
      keep(new THREE.ShaderMaterial({ vertexShader, fragmentShader, defines, depthTest: false, depthWrite: false, uniforms, ...extra }));
    const rtOpts = { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false };

    const world = new THREE.Scene();
    world.add(screen(flat(SKY_FRAGMENT, { ...colors, ...shared }), 0));

    const distScene = new THREE.Scene();
    const trees: number[] = [];
    const peaks = (TERRAIN[variant.split("+")[0]] ?? PEAKS).map((def, i) => {
      const built = massif(def, xs, ws, small, renderer, quadGeo);
      built.disposables.forEach(keep);
      trees.push(...built.trees);
      const peakMat = keep(new THREE.ShaderMaterial({ vertexShader: PEAK_VERTEX, fragmentShader: PEAK_FRAGMENT, defines, side: THREE.DoubleSide, uniforms: { ...colors, ...shared, ...built.uniforms } }));
      const mesh = new THREE.Mesh(built.g, peakMat);
      mesh.position.copy(built.pos);
      mesh.frustumCulled = false;
      mesh.renderOrder = 1 + i;
      world.add(mesh);
      const distMat = keep(new THREE.ShaderMaterial({ vertexShader: PEAK_VERTEX, fragmentShader: DIST_FRAGMENT, depthTest: false, depthWrite: false, transparent: true, blending: THREE.CustomBlending, blendEquation: THREE.MaxEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, uniforms: { ...built.uniforms, uMirror: { value: 1 } } }));
      const ghost = new THREE.Mesh(built.g, distMat);
      ghost.position.copy(built.pos);
      ghost.frustumCulled = false;
      distScene.add(ghost);
      return built.bake;
    });
    const pineMat = keep(new THREE.ShaderMaterial({ vertexShader: PINE_VERTEX, fragmentShader: PINE_FRAGMENT, defines, side: THREE.DoubleSide, uniforms: { ...colors, ...shared } }));
    const count = trees.length / 4;
    const pines = new THREE.InstancedMesh(keep(pineGeometry()), pineMat, Math.max(1, count));
    const m4 = new THREE.Matrix4();
    const q4 = new THREE.Quaternion();
    for (let i = 0; i < count; i++) {
      const sc = trees[i * 4 + 3];
      m4.compose(new THREE.Vector3(trees[i * 4], trees[i * 4 + 1], trees[i * 4 + 2]), q4, new THREE.Vector3(sc, sc * (0.9 + (i % 7) * 0.05), sc));
      pines.setMatrixAt(i, m4);
    }
    pines.count = count;
    pines.frustumCulled = false;
    pines.renderOrder = 10;
    world.add(pines);
    const reflRT = keep(new THREE.WebGLRenderTarget(2, 2, { ...rtOpts, depthBuffer: true }));
    const waterRes = new THREE.Vector2(2, 2);
    const water = screen(flat(WATER_FRAGMENT, { ...colors, ...shared, uRefl: { value: reflRT.texture }, uRes: { value: waterRes } }), 0.5);
    world.add(water);

    const noise = keep(noiseTexture());
    const cloudRT = keep(new THREE.WebGLRenderTarget(2, 2, rtOpts));
    const distRT = keep(new THREE.WebGLRenderTarget(2, 2, { type: THREE.HalfFloatType, format: THREE.RedFormat, depthBuffer: false, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter }));
    const cloudMat = flat(CLOUD_FRAGMENT, { ...colors, ...shared, uNoise: { value: noise }, uDist: { value: distRT.texture }, uCover: { value: 0 }, uSigma: { value: 1.8 } }, RAY_VERTEX, { blending: THREE.NoBlending });
    const cloudScene = new THREE.Scene();
    cloudScene.add(screen(cloudMat, 0));
    const compositeMat = flat(COMPOSITE_FRAGMENT, { uClouds: { value: cloudRT.texture }, uTan: shared.uTan, uPx: { value: new THREE.Vector2(0.5, 0.5) } }, RAY_VERTEX, {
      transparent: true,
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
    });
    const composite = screen(compositeMat, 50);
    world.add(composite);

    const mainRT = keep(new THREE.WebGLRenderTarget(2, 2, { ...rtOpts, depthBuffer: true, samples: 4 }));
    const bloomA = keep(new THREE.WebGLRenderTarget(2, 2, rtOpts));
    const bloomB = keep(new THREE.WebGLRenderTarget(2, 2, rtOpts));
    const raysRT = keep(new THREE.WebGLRenderTarget(2, 2, rtOpts));
    const pass = (fragmentShader: string, uniforms: Record<string, THREE.IUniform>) => {
      const material = flat(fragmentShader, uniforms, SCREEN_VERTEX);
      const s = new THREE.Scene();
      s.add(screen(material, 0));
      return { s, u: material.uniforms };
    };
    const blurH = pass(BLUR_FRAGMENT, { uSrc: { value: mainRT.texture }, uDir: { value: new THREE.Vector2() }, uThresh: { value: 0.9 } });
    const blurV = pass(BLUR_FRAGMENT, { uSrc: { value: bloomA.texture }, uDir: { value: new THREE.Vector2() }, uThresh: { value: -1 } });
    const sunUv = new THREE.Vector2();
    const rays = pass(RAYS_FRAGMENT, { uSrc: { value: mainRT.texture }, uSunUv: { value: sunUv }, uAspect: { value: 1 } });
    const sunNdc = new THREE.Vector2();
    const finalMat = flat(
      FINAL_FRAGMENT,
      { uMain: { value: mainRT.texture }, uBloom: { value: bloomB.texture }, uRays: { value: raysRT.texture }, uHaze: colors.uHaze, uGlow: colors.uGlow, uCloud: colors.uCloud, uSunNdc: { value: sunNdc }, uBloomK: { value: 1 }, uFade: { value: 0 }, uAspect: { value: 1 }, uGlowK: shared.uGlowK, uSunK: shared.uSunK },
      SCREEN_VERTEX,
    );
    scene.add(screen(finalMat, 0));

    const size = new THREE.Vector2();
    const sunWorld = new THREE.Vector3();
    const clear = new THREE.Color();
    let castKey = "";
    const ease = (x: number) => {
      const c = THREE.MathUtils.clamp(x, 0, 1);
      return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
    };

    const rigEye = small ? EYE + 5 : EYE;
    const rig = cameraRig(camera, pointer, { base: new THREE.Vector3(0, rigEye, 40), focus: new THREE.Vector3(0, rigEye + 80 * Math.tan(PITCH), -40) });

    return {
      hoverMask: distRT.texture,
      update({ time, intro, scroll, params }) {
        const k = ease(intro / 2.6);
        const lift = 1 - Math.pow(1 - THREE.MathUtils.clamp(intro / 2.6, 0, 1), 2.2);
        const pp = pointer.uPointer.value;
        const fl = k;
        const lake = params.lake > 0.5;
        const land = params.land > 0.5;
        if (params.rig > 0.5) rig({ time, intro, scroll });
        else {
        camera.position.set(
          pp.x * 2.4 + Math.sin(time * 0.21) * 0.6 * fl,
          THREE.MathUtils.lerp(lake || land ? 2 : params.deck + 2.5, small ? EYE + 5 : EYE, lift) + pp.y * 0.9 + Math.sin(time * 0.33 + 1.2) * 0.25 * fl,
          THREE.MathUtils.lerp(-30, 40, k),
        );
        camera.rotation.set(
          THREE.MathUtils.lerp(0.01, PITCH, k) + pp.y * 0.01 + Math.sin(time * 0.17) * 0.003 * fl,
          -pp.x * 0.014 + (1 - k) * 0.05 + Math.sin(time * 0.13 + 0.4) * 0.006 * fl,
          (1 - k) * -0.02 + Math.sin(time * 0.27 + 0.6) * 0.002 * fl,
        );
        camera.updateMatrixWorld();
        }
        const tanY = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
        shared.uTan.value.set(tanY * camera.aspect, tanY);
        const az = Math.atan(params.sun * tanY * camera.aspect);
        const el = params.sunHeight;
        sun.set(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el));
        const key = `${az.toFixed(3)}:${el.toFixed(3)}`;
        if (key !== castKey) {
          castKey = key;
          const lit = sun.clone().setY(sun.y + 0.12).normalize();
          for (const bake of peaks) bake(lit);
        }
        shared.uTime.value = time;
        shared.uGlowK.value = params.glow;
        shared.uHazeK.value = params.haze;
        shared.uDeck.value = params.deck;
        shared.uSnowK.value = params.snow;
        shared.uLake.value = lake ? 1 : 0;
        shared.uLand.value = land ? 1 : 0;
        shared.uMist.value = params.mist;
        shared.uSunK.value = params.sunSize;
        shared.uGroom.value = params.groom;
        shared.uSnowLine.value = params.snowLine;
        shared.uGreen.value = params.green;
        shared.uCanopy.value = params.canopy;
        shared.uPuffs.value = params.puffs;
        pines.visible = params.pines > 0.5;
        water.visible = lake;
        const cu = cloudMat.uniforms;
        cu.uCover.value = (params.density - 1) * 0.22;
        cu.uSigma.value = 1.8 * params.density;

        renderer.getDrawingBufferSize(size);
        const w = Math.max(2, size.x), h = Math.max(2, size.y);
        if (mainRT.width !== w || mainRT.height !== h) {
          mainRT.setSize(w, h);
          const cw = Math.max(2, Math.round(w / 2)), ch = Math.max(2, Math.round(h / 2));
          cloudRT.setSize(cw, ch);
          distRT.setSize(cw, ch);
          compositeMat.uniforms.uPx.value.set(1 / cw, 1 / ch);
          const bw = Math.max(2, Math.round(w / 6)), bh = Math.max(2, Math.round(h / 6));
          bloomA.setSize(bw, bh);
          bloomB.setSize(bw, bh);
          blurH.u.uDir.value.set(1.5 / bw, 0);
          blurV.u.uDir.value.set(0, 1.5 / bh);
          raysRT.setSize(Math.max(2, Math.round(w / 4)), Math.max(2, Math.round(h / 4)));
          reflRT.setSize(cw, ch);
          waterRes.set(w, h);
        }
        const target = renderer.getRenderTarget();
        renderer.getClearColor(clear);
        const alpha = renderer.getClearAlpha();
        renderer.setRenderTarget(distRT);
        renderer.setClearColor(0x000000, 0);
        renderer.clear();
        renderer.render(distScene, camera);
        renderer.setClearColor(clear, alpha);
        if (lake) {
          shared.uMirror.value = -1;
          water.visible = composite.visible = false;
          renderer.setRenderTarget(reflRT);
          renderer.clear(true, true, false);
          renderer.render(world, camera);
          shared.uMirror.value = 1;
          water.visible = composite.visible = true;
        }
        renderer.setRenderTarget(cloudRT);
        renderer.render(cloudScene, camera);
        renderer.setRenderTarget(mainRT);
        renderer.clear(true, true, false);
        renderer.render(world, camera);
        renderer.setRenderTarget(bloomA);
        renderer.render(blurH.s, camera);
        renderer.setRenderTarget(bloomB);
        renderer.render(blurV.s, camera);
        sunWorld.copy(camera.position).addScaledVector(sun, 1000).project(camera);
        sunNdc.set(sunWorld.x, sunWorld.y);
        sunUv.set(sunWorld.x * 0.5 + 0.5, sunWorld.y * 0.5 + 0.5);
        rays.u.uAspect.value = camera.aspect;
        renderer.setRenderTarget(raysRT);
        renderer.render(rays.s, camera);
        renderer.setRenderTarget(target);

        const fu = finalMat.uniforms;
        fu.uAspect.value = camera.aspect;
        fu.uBloomK.value = params.bloom;
        fu.uFade.value = 1 - THREE.MathUtils.smoothstep(intro, 0.1, 1.3);
      },
      dispose() {
        for (const d of disposables) d.dispose();
      },
    };
  },
};

export default summit;

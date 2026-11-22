import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { EnvModule } from "@/components/kit/env/EnvStage";
import { SCENE_PARAMS, SCENE_VARIANTS, setupScene } from "@/components/kit/env/skylineScenes";
import { cameraRig } from "@/components/kit/env/cameraRig";

const TAN_Y = Math.tan(THREE.MathUtils.degToRad(19));
const TAN_X = TAN_Y * 1.84;
const NOISE = 48;

const COMMON = `
uniform vec3 uSky, uHaze, uGlow, uCloud, uShade, uGlass, uSun;
uniform float uTime, uGlowK, uHazeK;
float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float breathe(){ return 1. + .06 * sin(uTime * .23) + .03 * sin(uTime * .61 + 1.3); }
vec3 horizonCol(vec3 d){
  vec2 f = normalize(d.xz + vec2(0., -1e-4)), s = normalize(uSun.xz);
  float side = pow(max(dot(f, s), 0.), 9.) * smoothstep(.3, -.02, d.y);
  return mix(uHaze, uGlow, clamp((side * 1.15 + pow(max(dot(f, s), 0.), 2.) * .25 * smoothstep(.4, 0., d.y)) * uGlowK * breathe(), 0., 1.));
}
vec3 skyCol(vec3 d){
  d = normalize(d);
  vec3 c = mix(horizonCol(d), uSky, smoothstep(-.02, .3, d.y));
  float g = max(dot(d, uSun), 0.);
  c = mix(c, mix(uHaze, vec3(.86), .4), clamp(pow(g, 3.) * .55 * uGlowK, 0., 1.));
  c = mix(c, mix(uHaze, uGlow, .6) * 1.04, clamp((pow(g, 16.) * .55 + pow(g, 40.) * .5) * uGlowK * breathe(), 0., 1.));
  return c;
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

const BG_FRAGMENT = `
${COMMON}
varying vec3 vRay;
void main(){
  vec3 d = normalize(vRay);
  gl_FragColor = vec4(skyCol(d) + (hash(gl_FragCoord.xy) - .5) / 160., 1.);
}`;

const CLOUD_FRAGMENT = `
${COMMON}
uniform sampler3D uNoise;
uniform sampler2D uDist;
uniform vec2 uTan;
uniform float uDeck, uCover, uSigma;
varying vec3 vRay;
varying vec2 vUv;
const float YB = -40., YT = 2.;
float density(vec3 p, bool detail, out float h){
  h = (p.y + 14. - uDeck) / 16.;
  float an = p.x / max(-p.z, 4.) / max(uTan.x, ${TAN_X.toFixed(4)});
  float side = smoothstep(.62, 1.1, abs(an)) * (an < 0. ? 1. : .8);
  vec3 q = p + vec3(uTime * .45, 0., uTime * .12);
  float cov = texture(uNoise, vec3(q.xz * .006 + vec2(.41, .23), .37)).r;
  float z = -p.z;
  cov = clamp((cov - .45) * .5 + .7 + uCover + side * .25 + smoothstep(46., 22., z) * .2 * smoothstep(.55, .1, abs(an)) - smoothstep(60., 200., z) * .22, 0., 1.) * smoothstep(300., 150., z);
  float heap = texture(uNoise, vec3(q.xz * .028, .61)).r;
  float top = (.3 + .5 * cov + (heap - .5) * .55) * .8125 + side * .2;
  float prof = smoothstep(top, top - .22, h);
  float c = cov * prof;
  if (c < .01) return -1.;
  float shape = texture(uNoise, q * vec3(.015, .03, .017) + vec3(sin(uTime * .021) * .05, uTime * .0035, cos(uTime * .017) * .03)).r;
  float dd = max(clamp((shape - (1. - c)) / c, 0., 1.), smoothstep(top - .15, top - .45, h) * 1.2);
  if (detail && dd > 0. && dd < .7) {
    float det = texture(uNoise, q * .045 + vec3(uTime * .005, uTime * .006, 0.)).g;
    det = mix(1. - det, det, smoothstep(.1, .5, h));
    dd = clamp((dd - det * .08) / (1. - det * .08), 0., 1.);
  }
  return dd;
}
float hg(float c, float g){ float g2 = g * g; return (1. - g2) / pow(1. + g2 - 2. * g * c, 1.5); }
void main(){
  vec3 o = cameraPosition, d = normalize(vRay);
  float yt = YT + uDeck, yb = YB + uDeck;
  float dy = abs(d.y) < 1e-4 ? 1e-4 : d.y;
  float ta = (yt - o.y) / dy, tb = (yb - o.y) / dy;
  float t0 = max(min(ta, tb), 0.);
  float inv = texture2D(uDist, vUv).r;
  float t1 = min(min(max(ta, tb), 280.), inv > 0. ? 1. / inv : 1e4);
  if (t0 >= t1) { gl_FragColor = vec4(0.); return; }
  vec3 L = normalize(uSun + vec3(0., .55, 0.));
  float ct = dot(d, L);
  float phase = mix(hg(ct, .5), hg(ct, -.2), .35);
  vec3 sunC = uGlow * 1.05;
  vec3 ambTop = mix(uSky, vec3(1.), .78);
  vec3 col = vec3(0.);
  float T = 1.;
  float ign = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(.06711056, .00583715))));
  float t = t0 + clamp(t0 * .025, .15, 4.) * ign;
  for (int i = 0; i < STEPS; i++) {
    if (t > t1 || T < .015) break;
    float dt = clamp(t * .025, .15, 4.);
    vec3 p = o + d * t;
    float h;
    float dd = density(p, true, h);
    if (dd > .002) {
      float od = 0., ls = .45, hh;
      vec3 lp = p;
      for (int j = 0; j < LSTEPS; j++) { lp += L * ls; od += max(density(lp, false, hh), 0.) * ls; ls *= 2.; }
      float Tl = max(exp(-od * uSigma), .55 * exp(-od * uSigma * .15));
      float powder = 1. - exp(-dd * 6.);
      vec3 amb = mix(uShade, ambTop, smoothstep(.05, .8, h)) * (.86 + .14 * powder);
      vec3 light = sunC * Tl * phase * .45 * (.5 + .5 * powder) + amb * .8;
      light = mix(light, horizonCol(d) * 1.02, 1. - exp(-t * .0095 * uHazeK));
      float tr = exp(-dd * uSigma * dt);
      col += T * (1. - tr) * light;
      T *= tr;
    }
    t += dd < 0. ? max(dt * 4., .8) : dt;
  }
  gl_FragColor = vec4(col, 1. - T);
}`;

const EQ_VERTEX = `
varying vec3 vRay;
varying vec2 vUv;
void main(){
  vUv = uv;
  float ph = (uv.x - .5) * 6.2831853, th = (uv.y - .5) * 3.1415927;
  vRay = vec3(sin(ph) * cos(th), sin(th), -cos(ph) * cos(th));
  gl_Position = vec4(position.xy, 1., 1.);
}`;

const COMPOSITE_FRAGMENT = `
uniform sampler2D uClouds;
uniform vec2 uPx;
varying vec2 vUv;
void main(){
  vec2 o = uPx * 1.8;
  vec4 c = texture2D(uClouds, vUv) * .2;
  c += (texture2D(uClouds, vUv + vec2(o.x, 0.)) + texture2D(uClouds, vUv - vec2(o.x, 0.)) + texture2D(uClouds, vUv + vec2(0., o.y)) + texture2D(uClouds, vUv - vec2(0., o.y))) * .125;
  c += (texture2D(uClouds, vUv + o) + texture2D(uClouds, vUv - o) + texture2D(uClouds, vUv + vec2(o.x, -o.y)) + texture2D(uClouds, vUv - vec2(o.x, -o.y))) * .075;
  gl_FragColor = c;
}`;

const BLUR_FRAGMENT = `
uniform sampler2D uSrc;
uniform vec2 uDir;
uniform float uThresh;
varying vec2 vUv;
vec3 tap(vec2 o){ vec3 c = texture2D(uSrc, vUv + o).rgb; return c * smoothstep(uThresh, uThresh + .35, dot(c, vec3(.3, .59, .11))); }
void main(){
  vec3 c = tap(vec2(0.)) * .227;
  c += (tap(uDir) + tap(-uDir)) * .195;
  c += (tap(uDir * 2.) + tap(-uDir * 2.)) * .122;
  c += (tap(uDir * 3.) + tap(-uDir * 3.)) * .054;
  c += (tap(uDir * 4.) + tap(-uDir * 4.)) * .016;
  gl_FragColor = vec4(c, 1.);
}`;

const VEIL_FRAGMENT = `
${COMMON}
uniform sampler2D uBloom;
uniform float uBloomK;
varying vec3 vRay;
varying vec2 vUv;
void main(){
  vec3 d = normalize(vRay);
  float g = max(dot(d, uSun), 0.);
  float side = smoothstep(-.2, 1., vUv.x);
  vec3 veil = mix(mix(uHaze, uSky, .15), uGlow, clamp(pow(g, 3.) * uGlowK + side * .25, 0., 1.));
  float lift = (.06 + .1 * pow(g, 6.) * uGlowK + .03 * side) * uHazeK;
  vec3 b = texture2D(uBloom, vUv).rgb * .3 + uGlow * (pow(g, 24.) * .08 + pow(g, 6.) * .03) * uGlowK;
  gl_FragColor = vec4(b * uBloomK + veil * lift, clamp(lift, 0., .6));
}`;

const DIST_VERTEX = `
varying vec3 vWorld;
void main(){
  vec4 w = modelMatrix * vec4(position, 1.);
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const DIST_FRAGMENT = `
varying vec3 vWorld;
void main(){ gl_FragColor = vec4(1. / length(vWorld - cameraPosition), 0., 0., 1.); }`;

const TOWER_VERTEX = `
attribute float aKind, aBase;
varying vec3 vObj, vWorld, vN, vON;
varying vec2 vUv;
varying float vKind, vBase;
void main(){
  vObj = position;
  vUv = uv;
  vec4 w = modelMatrix * vec4(position, 1.);
  vWorld = w.xyz;
  vN = mat3(modelMatrix) * normal;
  vON = normal;
  vKind = aKind;
  vBase = aBase;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const TOWER_FRAGMENT = `
${COMMON}
uniform float uFloor, uVis, uCloudY, uEnvLod, uFog, uPier, uWash;
uniform vec3 uBands;
uniform sampler2D uEnv;
varying vec3 vObj, vWorld, vN, vON;
varying vec2 vUv;
varying float vKind, vBase;
float box(float x, float w, float s){ float fw = max(fwidth(x) * 1.5, s); vec2 a = vec2(x + w - fw * .5, x + w + fw * .5); vec2 i = floor(a) * 2. * w + min(fract(a), 2. * w); return (i.y - i.x) / fw; }
float lines(float x, float w){ return box(x, w, 1e-4); }
float fade(float x){ return 1. - smoothstep(.2, .6, fwidth(x)); }
float nfade(float x, float w){ return 1. - smoothstep(w * .5, w * 1.4, fwidth(x)); }
float sgn(float x){ return clamp((fract(x + .5) - .5) / max(fwidth(x), 1e-4) * .5, -1., 1.); }
vec3 envAt(vec3 r, float lod){
  r = normalize(r);
  return textureLod(uEnv, vec2(atan(r.x, -r.z) * .15915494 + .5, asin(clamp(r.y, -1., 1.)) * .31830989 + .5), lod).rgb;
}
vec3 shade(vec3 alb, vec3 F0, float rough, vec3 n, vec3 v, vec3 L, float ao){
  float NdV = max(dot(n, v), 1e-3), NdL = max(dot(n, L), 0.);
  vec3 h = normalize(L + v);
  float NdH = max(dot(n, h), 0.), a = rough * rough, a2 = a * a;
  float dn = NdH * NdH * (a2 - 1.) + 1.;
  float D = a2 / (3.14159 * dn * dn);
  float kk = (rough + 1.) * (rough + 1.) * .125;
  float G = NdV / (NdV * (1. - kk) + kk) * NdL / (NdL * (1. - kk) + kk);
  vec3 Fs = F0 + (1. - F0) * pow(1. - max(dot(h, v), 0.), 5.);
  vec3 Fe = F0 + (max(vec3(1. - rough), F0) - F0) * pow(1. - NdV, 5.);
  vec3 sunC = uGlow * 2.4 * uGlowK;
  vec3 irr = envAt(n, uEnvLod);
  vec3 refl = envAt(reflect(-v, n) + vec3(0., .1, 0.), rough * (uEnvLod - 1.5)) * mix(vec3(.9, .95, 1.03), vec3(1.07, 1.06, 1.04), smoothstep(uCloudY, uCloudY + 17., vWorld.y));
  vec3 spec = min(D * G / max(4. * NdV, 1e-3), 6.) * Fs * sunC;
  return alb * (irr * ao * .8 + sunC * NdL * .32) * (1. - Fe) + refl * Fe * mix(1., ao, .6) + spec;
}
void main(){
  vec3 n = normalize(vN);
  vec3 on = normalize(vON);
  vec3 v = normalize(cameraPosition - vWorld);
  vec3 L = normalize(vec3(uSun.x * 1.5, .5, uSun.z * -.1));
  vec3 up = vec3(0., 1., 0.);
  vec3 T = abs(n.y) < .95 ? normalize(cross(up, n)) : vec3(1., 0., 0.);
  float k = vKind;
  float u = abs(on.x) > .5 ? -sign(on.x) * vObj.z : sign(on.z + .001) * vObj.x;
  float y = vObj.y;
  float wall = 1. - smoothstep(.4, .7, abs(n.y));
  float ao = vBase > -39. ? mix(1., mix(.55, 1., smoothstep(0., .5, y - vBase)), wall) : 1.;
  float hgt = smoothstep(uCloudY, uCloudY + 15., vWorld.y);
  vec3 alb = vec3(.5);
  vec3 F0 = vec3(.04);
  float rough = .5;
  vec3 pn = n;
  if (k < .5) {
    float cu = u / .15, cy = y / uFloor;
    vec2 cell = floor(vec2(cu, cy));
    float fd = fade(cu) * fade(cy);
    vec3 hs = vec3(hash(cell), hash(cell + 3.1), hash(cell + 7.7));
    float fl = hash(vec2(17.3, cell.y));
    float tone = (fl > .88 ? .72 : fl < .1 ? 1.18 : 1.) * (.94 + .12 * hs.z) * (hash(cell + 11.3) > .965 ? .55 : 1.);
    float bow = hash(vec2(31.7, cell.y)) - .5;
    pn = normalize(n + (T * (hs.x - .5) * .08 + up * ((hs.y - .5) * .06 + bow * .26 + (fract(cy) - .5) * .22)) * fd * nfade(cu, .25) * nfade(cy, .25) + (up * sin(y * .9 + u * 2.3) * .06 + T * sin(y * .37 - u * 1.1) * .05));
    alb = uGlass * .38 * mix(.85, 1.15, hgt) * mix(1., tone, fd);
    F0 = mix(vec3(.24), uGlass * 1.35, .76) * mix(.9, 1.06, (fl * .7 + hs.z * .3) * fd) * mix(1., tone, fd * .6);
    rough = .03 + .05 * hs.y * fd;
    float mull = lines(cu, .025) * wall;
    pn = normalize(mix(pn, n + T * sgn(cu) * .35 * nfade(cu, .025), mull));
    alb = mix(alb, vec3(.4, .43, .5), mull * .25);
    F0 = mix(F0, vec3(.5, .53, .6), mull * .25);
    rough = mix(rough, .3, mull);
    float slab = lines(cy, .06) * wall;
    alb = mix(alb, uGlass * .3, slab);
    F0 = mix(F0, vec3(.08, .09, .12), slab);
    rough = mix(rough, .3, slab);
    float band = clamp(smoothstep(uBands.z, uBands.z * .55, abs(y - uBands.x)) + smoothstep(uBands.z, uBands.z * .55, abs(y - uBands.y)), 0., 1.) * wall;
    float louv = lines(y / .05, .2);
    alb = mix(alb, vec3(.02, .022, .028), band);
    F0 = mix(F0, vec3(.05) + .25 * louv, band);
    rough = mix(rough, .9, band);
    pn = normalize(mix(pn, n + up * louv * .6, band * nfade(y / .05, .2)));
  } else if (k < 1.5) {
    float cu = u / .075;
    float fin = lines(cu, .1) * wall;
    float rise = smoothstep(5.6, 9.8, y);
    float br = max(lines((u + y * .55) / .75, .05), lines((u - y * .55) / .75, .05)) * wall * fade(y / .75);
    alb = mix(uGlass * .5, vec3(.62, .66, .74), fin * .5);
    F0 = mix(mix(vec3(.4), uGlass * 1.9, .72) * mix(1., 1.12, rise), vec3(.66, .68, .72), fin);
    alb = mix(alb, vec3(.16, .19, .26), br * .7);
    F0 = mix(F0, F0 * .55, br * .7);
    rough = mix(.05 + .05 * rise, .28, fin);
    pn = normalize(n + T * sgn(cu) * .6 * fin * nfade(cu, .1));
  } else if (k < 2.5) {
    float cu = u / .2, cy = y / uFloor;
    float fu = abs(fract(cu) - .5);
    float pier = box(cu, .22, .04);
    float win = box(cy - .3, .3, .04);
    float top = smoothstep(.5, .8, n.y);
    vec3 stone = mix(vec3(.56, .53, .48), vec3(.8, .75, .65), smoothstep(-4.5, -2.5, y));
    vec3 glass = uGlass * .1;
    vec3 bronze = vec3(.2, .15, .11);
    alb = mix(mix(bronze, glass, win), stone, pier);
    F0 = mix(mix(vec3(.5, .38, .26), vec3(.1, .11, .13), win), vec3(.04), pier);
    rough = mix(mix(.35, .1, win), .45, pier);
    alb = mix(alb, stone * 1.05, top);
    F0 = mix(F0, vec3(.04), top);
    rough = mix(rough, .5, top);
    pn = normalize(n + T * sign(.5 - fract(cu)) * smoothstep(.25, .3, fu) * smoothstep(.35, .3, fu) * .7 * nfade(cu, .05));
    alb *= 1. - .12 * lines(y / (uFloor * 4.), .12) * wall;
  } else if (k < 3.5) {
    alb = vec3(.55, .56, .58);
    F0 = vec3(.88, .88, .9);
    rough = .22;
  } else if (k < 4.5) {
    float ua = atan(vObj.x, vObj.z) * 1.2;
    float l = max(lines((ua * 2. + y) / .6, .1), lines((ua * 2. - y) / .6, .1)) * wall;
    alb = mix(uGlass * .3, vec3(.5, .52, .55), l);
    F0 = mix(vec3(.12, .14, .18), vec3(.7, .72, .76), l);
    rough = mix(.08, .3, l);
  } else if (k < 6.5) {
    float cy = y / uFloor;
    float hs = hash(vec2(floor(u / .25), floor(cy)));
    alb = vec3(.36, .27, .2) * (1. - .2 * lines(cy, .1));
    F0 = mix(vec3(.26, .21, .16), vec3(.34, .28, .21), hs * fade(cy));
    rough = .14 + .1 * lines(u / .25, .12);
  } else if (k < 7.5) {
    float cu = u / .13, cy = y / uFloor;
    float win = (1. - box(cu, .22, .04)) * (1. - box(cy, .17, .06));
    alb = mix(vec3(.5, .52, .54), uGlass * .22, win);
    F0 = mix(vec3(.04), vec3(.12, .13, .15), win);
    rough = mix(.7, .08, win);
  } else if (k < 9.5) {
    float cu = u / .09, cy = y / uFloor;
    float fin = lines(cu, .14);
    float win = box(cy - .3, .3, .04) * .4;
    vec3 terra = vec3(.8, .77, .72);
    alb = mix(mix(terra, uGlass * .6, win * .3), vec3(.55, .47, .38), fin);
    F0 = mix(mix(vec3(.05), vec3(.18, .2, .26), win * .3), vec3(.66, .54, .4), fin);
    rough = mix(mix(.45, .1, win * .3), .28, fin);
    pn = normalize(n + T * sgn(cu) * .7 * fin * nfade(cu, .14));
    alb *= mix(.6, 1., wall);
    F0 = mix(vec3(.04), F0, wall);
  } else {
    alb = vec3(.24, .28, .36);
    F0 = vec3(.4, .44, .53);
    rough = .18;
  }
  if (uPier > 0. && wall > .5 && (k < .5 || (k > 1.5 && k < 8.5))) {
    float pu = u / uPier;
    float sd = (fract(pu + .5) - .5) * uPier;
    float shadow = smoothstep(-.16, -.03, sd) * clamp(.5 - sd / max(fwidth(sd), 1e-4), 0., 1.);
    ao *= mix(1., mix(.74, 1., smoothstep(.025, .1, abs(sd))) * (1. - .3 * shadow), nfade(pu, .15));
  }
  float rim = 0.;
  if (wall > .5 && k < 9.5 && abs(k - 4.) > .5) {
    float e = min(vUv.x, 1. - vUv.x) / max(fwidth(vUv.x), 1e-4);
    float bev = 1. - smoothstep(0., 1.5, e);
    vec3 bn = normalize(n + T * (vUv.x < .5 ? -1. : 1.));
    pn = normalize(mix(pn, bn, bev * .8));
    rough = mix(rough, .25, bev * .5);
    rim = bev * max(dot(bn, L), 0.);
  }
  vec3 col = shade(alb, F0, rough, pn, v, L, ao) + uGlow * uGlowK * rim * .3;
  float dist = length(vWorld - cameraPosition);
  vec3 air = mix(horizonCol(-v), mix(uHaze, uSky, .25), .25);
  col = mix(col, air, clamp(1. - exp(-max(dist - uFog * .8, 0.) * .012 * uHazeK), 0., .72));
  col = mix(col, mix(uCloud, horizonCol(-v), .35), smoothstep(uCloudY + uWash, uCloudY - 1., vWorld.y) * .8);
  gl_FragColor = vec4(min(col, vec3(1.)) + (hash(gl_FragCoord.xy) - .5) / 160., uVis);
}`;

const FLARE_VERTEX = `
varying vec2 vNdc;
void main(){ vNdc = position.xy; gl_Position = vec4(position.xy, 0., 1.); }`;

const FLARE_FRAGMENT = `
uniform vec4 uDisc[4];
uniform float uAspect, uFlare;
uniform vec3 uGlow;
varying vec2 vNdc;
void main(){
  vec3 col = vec3(0.);
  for (int i = 0; i < 4; i++) {
    vec4 c = uDisc[i];
    float r = length((vNdc - c.xy) * vec2(uAspect, 1.)) / c.z;
    float body = smoothstep(1., .8, r);
    float ring = smoothstep(.12, 0., abs(r - .93));
    vec3 tint = i == 0 ? mix(vec3(.75, .85, 1.), vec3(1., .9, .75), smoothstep(.85, 1., r)) : uGlow;
    col += tint * (body * .5 + ring * .5) * c.w;
  }
  gl_FragColor = vec4(col * uFlare, 1.);
}`;

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

const BOTTOM = -40;

const part = (g: THREE.BufferGeometry, kind: number) => {
  const count = g.getAttribute("position").count;
  g.computeBoundingBox();
  g.setAttribute("aBase", new THREE.Float32BufferAttribute(new Float32Array(count).fill(g.boundingBox!.min.y), 1));
  return g.setAttribute("aKind", new THREE.Float32BufferAttribute(new Float32Array(count).fill(kind), 1));
};

const box = (w: number, y0: number, y1: number, kind: number, x = 0, depth = w, z = 0) => part(new THREE.BoxGeometry(w, y1 - y0, depth).translate(x, (y0 + y1) / 2, z), kind);

const frustum = (r0: number, r1: number, y0: number, y1: number, kind: number, segs = 4, x = 0) =>
  part(new THREE.CylinderGeometry(r1, r0, y1 - y0, segs, 1).rotateY(segs === 4 ? Math.PI / 4 : 0).translate(x, (y0 + y1) / 2, 0), kind);

const layer = (g: THREE.BufferGeometry, l = 1) => ((g.userData.layer = l), g);

const notched = (w: number, depth: number, y0: number, y1: number, kind: number, x: number, n: number) => [
  box(n, y0, y1, kind, x - w / 2 + n / 2, depth - 2 * n),
  box(w - 2 * n, y0, y1, kind, x, depth),
  box(n, y0, y1, kind, x + w / 2 - n / 2, depth - 2 * n),
];

const ribs = (from: number, to: number, step: number, face: number, y0: number, y1: number, kind: number, s: number, side = false) => {
  const out: THREE.BufferGeometry[] = [];
  for (let p = Math.ceil((from + s) / step) * step; p <= to - s + 1e-6; p += step)
    out.push(layer(side ? box(s, y0, y1, kind, face + s / 2, s, p) : box(s, y0, y1, kind, p, s, face + s / 2)));
  return out;
};

const ribbed = (w: number, depth: number, y0: number, y1: number, kind: number, step: number, s: number) => [
  box(w, y0, y1, kind, 0, depth),
  ...ribs(-w / 2, w / 2, step, depth / 2, y0, y1, kind, s),
  ...ribs(-depth / 2, depth / 2, step, w / 2, y0, y1, kind, s, true),
];

const slant = (g: THREE.BufferGeometry, drop: number) => {
  const p = g.getAttribute("position");
  const top = g.boundingBox!.max.y;
  const mid = (g.boundingBox!.min.x + g.boundingBox!.max.x) / 2;
  for (let i = 0; i < p.count; i++) if (p.getY(i) > top - 1e-4 && p.getX(i) > mid) p.setY(i, top - drop);
  g.computeBoundingBox();
  return g;
};

type TowerDef = { d: number; x: number; floor: number; bands: [number, number, number]; delay: number; yaw?: number; pier?: number; wash?: number; parts: () => THREE.BufferGeometry[] };

const HC = 0;
const HW = 1.5;
const HD = 0.8;
const HN = 0.05;
const HR = HC + HW / 2;
const hero = (y0: number, y1: number, kind: number) => notched(HW, HD, y0, y1, kind, HC, HN);
const mech = (y0: number, y1: number) => box(HW - 0.06, y0, y1, 0, HC, HD - 0.06);

const TOWERS: TowerDef[] = [
  {
    d: 86,
    x: 0.8,
    floor: 0.3,
    bands: [99, 99, 0.1],
    delay: 0.5,
    parts: () => [box(1.9, BOTTOM, 6.0, 6, 0, 1.6), box(1.5, 6.0, 6.8, 6, 0, 1.3), box(1.6, 6.8, 6.9, 3, 0, 1.4)],
  },
  {
    d: 80,
    x: -0.78,
    floor: 0.3,
    bands: [99, 99, 0.1],
    delay: 0.45,
    yaw: 0.15,
    parts: () => [box(1.5, BOTTOM, 5.8, 7, -1.05, 0.9), box(1.5, BOTTOM, 4.4, 7, 1.05, 0.9), box(0.6, BOTTOM, 1.8, 7, 0, 0.5)],
  },
  {
    d: 58,
    x: 0.36,
    floor: 0.24,
    bands: [99, 99, 0.1],
    delay: 0.4,
    pier: 0.26,
    parts: () => [...ribbed(2.0, 1.6, BOTTOM, 0.6, 7, 0.26, 0.05), box(2.12, 0.6, 0.75, 3, 0, 1.72), box(2.12, 0.75, 1.3, 7, 0, 1.72), box(2.2, 1.3, 1.38, 3, 0, 1.8)],
  },
  {
    d: 52,
    x: -0.34,
    floor: 0.2,
    bands: [99, 99, 0.1],
    delay: 0.35,
    pier: 0.25,
    parts: () => [slant(box(1.6, BOTTOM, 4.8, 0, 0, 1.2), 1.4)],
  },
  {
    d: 40,
    x: 0,
    floor: 0.2,
    bands: [3.86, -1.24, 0.2],
    delay: 0,
    pier: 0.3,
    wash: 2.5,
    parts: () => [
      ...hero(BOTTOM, -1.38, 0),
      mech(-1.38, -1.1),
      ...hero(-1.1, 3.72, 0),
      mech(3.72, 4),
      ...hero(4, 9.2, 0),
      ...ribs(HC - HW / 2 + HN, HR - HN, 0.3, HD / 2, BOTTOM, 9.2, 10, 0.045),
      ...Array.from({ length: 10 }, (_, i) => layer(box(0.06, BOTTOM, 8.4 - i * 1.4, 9, HR + 0.03 + i * 0.06, 0.7 - i * 0.035))),
      layer(box(HW + 0.02, 9.2, 9.23, 3, HC, HD + 0.02), 2),
    ],
  },
  {
    d: 36,
    x: 0.62,
    floor: 0.24,
    bands: [99, 99, 0.1],
    delay: 0.3,
    pier: 0.4,
    parts: () => [
      ...ribbed(2.0, 1.7, BOTTOM, -2.6, 2, 0.4, 0.06),
      ...ribbed(1.55, 1.35, -2.6, -1.3, 2, 0.4, 0.05),
      ...ribbed(1.1, 0.95, -1.3, -0.3, 2, 0.4, 0.05),
      box(1.18, -0.3, -0.2, 2, 0, 1.03),
    ],
  },
  {
    d: 30,
    x: -0.62,
    floor: 0.3,
    bands: [99, 99, 0.1],
    delay: 0.25,
    parts: () => [frustum(0.9, 0.74, BOTTOM, -1.4, 4, 28), layer(frustum(0.76, 0.72, -1.4, -1.3, 3, 28))],
  },
];

const PULL = 1.29;
const YAW = -0.4;
const PITCH = -0.055;
const ORBIT_R = 40 * 1.29;
const SUN_BASE = new THREE.Vector2(1, 0.15);
const DISCS: [number, number, number, number, number][] = [
  [0, 0.04, 0.27, 0.045, 0],
  [0.47, 0.22, 0.11, 0.055, 0.5],
  [0.63, 0.29, 0.075, 0.06, 0.7],
  [-0.42, -0.17, 0.04, 0.05, -0.4],
];

const skyline: EnvModule = {
  id: "skyline",
  title: "Skyline",
  palette: {
    uSky: { cssVar: "--skyline-sky", label: "Sky", fallback: "#6789b0" },
    uHaze: { cssVar: "--skyline-haze", label: "Haze", fallback: "#c3ccd3" },
    uGlow: { cssVar: "--skyline-glow", label: "Sun glow", fallback: "#fbeedd" },
    uCloud: { cssVar: "--skyline-cloud", label: "Cloud", fallback: "#f5f4f2" },
    uShade: { cssVar: "--skyline-shade", label: "Cloud shadow", fallback: "#b4b6c4" },
    uGlass: { cssVar: "--skyline-glass", label: "Glass", fallback: "#3f5280" },
    uWater: { cssVar: "--skyline-water", label: "Water", fallback: "#2f4a5c" },
    uGrass: { cssVar: "--skyline-green", label: "Green", fallback: "#56683f" },
    uWin: { cssVar: "--skyline-window", label: "Window light", fallback: "#ffc27a" },
  },
  params: [
    { key: "deck", label: "Cloud height", min: -2, max: 2, step: 0.05, value: -0.4 },
    { key: "cover", label: "Cloud cover", min: -0.4, max: 0.4, step: 0.01, value: 0 },
    { key: "density", label: "Cloud density", min: 0.5, max: 12, step: 0.1, value: 1.8 },
    { key: "haze", label: "Haze", min: 0.3, max: 2, step: 0.05, value: 1 },
    { key: "glow", label: "Sun glow", min: 0, max: 1.5, step: 0.05, value: 1 },
    { key: "flare", label: "Lens flare", min: 0, max: 2, step: 0.05, value: 1 },
    { key: "bloom", label: "Bloom", min: 0, max: 2, step: 0.05, value: 1 },
    ...SCENE_PARAMS,
  ],
  variants: { clouds: {}, ...SCENE_VARIANTS },
  fov: [38, 58],
  travelPerScreen: 0,
  creep: 0,
  hover: { liquid: 0, turn: 0.4 },
  resolution: 1,
  antialias: true,
  setup(ctx) {
    const kind = (ctx.variant ?? "").split("+")[0];
    if (kind && kind !== "clouds") return setupScene(ctx);
    const { scene, camera, small, colors, pointer, renderer } = ctx;
    const sun = new THREE.Vector3(TAN_X * SUN_BASE.x, TAN_Y * SUN_BASE.y, -1).normalize();
    const shared = {
      uTime: { value: 0 },
      uTan: { value: new THREE.Vector2(1, 1) },
      uSun: { value: sun },
      uGlowK: { value: 1 },
      uHazeK: { value: 1 },
    };
    const disposables: { dispose: () => void }[] = [];
    const keep = <T extends { dispose: () => void }>(d: T) => (disposables.push(d), d);
    const quad = keep(new THREE.PlaneGeometry(2, 2));
    const screen = (material: THREE.ShaderMaterial, order: number) => {
      const mesh = new THREE.Mesh(quad, material);
      mesh.frustumCulled = false;
      mesh.renderOrder = order;
      return mesh;
    };

    scene.add(screen(keep(new THREE.ShaderMaterial({ vertexShader: RAY_VERTEX, fragmentShader: BG_FRAGMENT, depthTest: false, depthWrite: false, uniforms: { ...colors, ...shared } })), -1));

    const xs = small ? 0.42 : 1;
    const distScene = new THREE.Scene();
    const distMat = keep(
      new THREE.ShaderMaterial({
        vertexShader: DIST_VERTEX,
        fragmentShader: DIST_FRAGMENT,
        depthTest: false,
        depthWrite: false,
        transparent: true,
        blending: THREE.CustomBlending,
        blendEquation: THREE.MaxEquation,
        blendSrc: THREE.OneFactor,
        blendDst: THREE.OneFactor,
      }),
    );
    const envW = small ? 256 : 512;
    const envRT = keep(
      new THREE.WebGLRenderTarget(envW, envW / 2, {
        type: THREE.HalfFloatType,
        depthBuffer: false,
        generateMipmaps: true,
        minFilter: THREE.LinearMipmapLinearFilter,
        magFilter: THREE.LinearFilter,
        wrapS: THREE.RepeatWrapping,
      }),
    );
    const envShared = { uEnv: { value: envRT.texture }, uEnvLod: { value: Math.log2(envW) - 2 }, uFog: { value: 34 * PULL } };

    const up = new THREE.Vector3(0, 1, 0);
    const centre = new THREE.Vector3();
    const towers = TOWERS.map((t, i) => {
      const yaw = t.yaw ?? YAW;
      const px = t.x * TAN_X * t.d * PULL * xs;
      const eye = new THREE.Vector3(-px, 0, t.d * PULL).applyAxisAngle(up, -yaw);
      const order = t
        .parts()
        .map((g, j) => {
          g.boundingBox!.getCenter(centre);
          return { g, j, l: (g.userData.layer as number) ?? 0, r: Math.hypot(centre.x - eye.x, centre.z - eye.z) };
        })
        .sort((a, b) => a.l - b.l || b.r - a.r || a.j - b.j);
      const geometry = keep(mergeGeometries(order.map((o) => o.g), false)!);
      const material = keep(
        new THREE.ShaderMaterial({
          vertexShader: TOWER_VERTEX,
          fragmentShader: TOWER_FRAGMENT,
          transparent: true,
          depthTest: false,
          depthWrite: false,
          uniforms: { ...colors, ...shared, ...envShared, uFloor: { value: t.floor }, uBands: { value: new THREE.Vector3(...t.bands) }, uVis: { value: 1 }, uCloudY: { value: -7 }, uPier: { value: t.pier ?? 0 }, uWash: { value: t.wash ?? 6 } },
        }),
      );
      const mesh = new THREE.Mesh(geometry, material);
      mesh.frustumCulled = false;
      mesh.renderOrder = i;
      mesh.position.set(px, 0, -t.d * PULL);
      mesh.rotation.y = yaw;
      scene.add(mesh);
      const ghost = new THREE.Mesh(geometry, distMat);
      ghost.frustumCulled = false;
      ghost.position.copy(mesh.position);
      ghost.rotation.y = mesh.rotation.y;
      distScene.add(ghost);
      return { material };
    });

    const noise = keep(noiseTexture());
    const blank = keep(new THREE.DataTexture(new Uint8Array(4), 1, 1));
    blank.needsUpdate = true;
    const envGeo = keep(new THREE.PlaneGeometry(2, 2, 64, 32));
    const envScene = new THREE.Scene();
    const envCam = new THREE.PerspectiveCamera();
    const envBg = new THREE.Mesh(envGeo, keep(new THREE.ShaderMaterial({ vertexShader: EQ_VERTEX, fragmentShader: BG_FRAGMENT, depthTest: false, depthWrite: false, uniforms: { ...colors, ...shared } })));
    const envClouds = new THREE.Mesh(
      envGeo,
      keep(
        new THREE.ShaderMaterial({
          vertexShader: EQ_VERTEX,
          fragmentShader: CLOUD_FRAGMENT,
          defines: { STEPS: 120, LSTEPS: 4 },
          transparent: true,
          depthTest: false,
          depthWrite: false,
          blending: THREE.CustomBlending,
          blendSrc: THREE.OneFactor,
          blendDst: THREE.OneMinusSrcAlphaFactor,
          uniforms: { ...colors, ...shared, uNoise: { value: noise }, uDist: { value: blank }, uDeck: { value: 0 }, uCover: { value: 0 }, uSigma: { value: 1.6 } },
        }),
      ),
    );
    for (const [m, o] of [[envBg, 0], [envClouds, 1]] as const) {
      m.frustumCulled = false;
      m.renderOrder = o;
      envScene.add(m);
    }
    let envKey = "";
    const cloudRT = keep(new THREE.WebGLRenderTarget(2, 2, { type: THREE.HalfFloatType, depthBuffer: false }));
    const distRT = keep(new THREE.WebGLRenderTarget(2, 2, { type: THREE.HalfFloatType, format: THREE.RedFormat, depthBuffer: false, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter }));
    const cloudMat = keep(
      new THREE.ShaderMaterial({
        vertexShader: RAY_VERTEX,
        fragmentShader: CLOUD_FRAGMENT,
        defines: { STEPS: small ? 80 : 120, LSTEPS: small ? 3 : 4 },
        depthTest: false,
        depthWrite: false,
        blending: THREE.NoBlending,
        uniforms: { ...colors, ...shared, uNoise: { value: noise }, uDist: { value: distRT.texture }, uDeck: { value: 0 }, uCover: { value: 0 }, uSigma: { value: 1.6 } },
      }),
    );
    const cloudScene = new THREE.Scene();
    cloudScene.add(screen(cloudMat, 0));
    const compositeMat = keep(
      new THREE.ShaderMaterial({
        vertexShader: RAY_VERTEX,
        fragmentShader: COMPOSITE_FRAGMENT,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        blending: THREE.CustomBlending,
        blendSrc: THREE.OneFactor,
        blendDst: THREE.OneMinusSrcAlphaFactor,
        uniforms: { uClouds: { value: cloudRT.texture }, uTan: shared.uTan, uPx: { value: new THREE.Vector2(0.5, 0.5) } },
      }),
    );
    scene.add(screen(compositeMat, 500));

    const bloomOpts = { type: THREE.HalfFloatType, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter };
    const bloomA = keep(new THREE.WebGLRenderTarget(2, 2, bloomOpts));
    const bloomB = keep(new THREE.WebGLRenderTarget(2, 2, bloomOpts));
    const blur = (src: THREE.Texture, thresh: number) => {
      const material = keep(new THREE.ShaderMaterial({ vertexShader: RAY_VERTEX, fragmentShader: BLUR_FRAGMENT, depthTest: false, depthWrite: false, blending: THREE.NoBlending, uniforms: { uSrc: { value: src }, uDir: { value: new THREE.Vector2() }, uThresh: { value: thresh }, uTan: shared.uTan } }));
      const s = new THREE.Scene();
      s.add(screen(material, 0));
      return { s, dir: material.uniforms.uDir.value as THREE.Vector2 };
    };
    const blurH = blur(cloudRT.texture, 0.88);
    const blurV = blur(bloomA.texture, -1);
    const veilMat = keep(
      new THREE.ShaderMaterial({
        vertexShader: RAY_VERTEX,
        fragmentShader: VEIL_FRAGMENT,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        blending: THREE.CustomBlending,
        blendSrc: THREE.OneFactor,
        blendDst: THREE.OneMinusSrcAlphaFactor,
        uniforms: { ...colors, ...shared, uBloom: { value: bloomB.texture }, uBloomK: { value: 1 } },
      }),
    );
    scene.add(screen(veilMat, 998));

    const discs = DISCS.map(() => new THREE.Vector4());
    const flareMat = keep(
      new THREE.ShaderMaterial({
        vertexShader: FLARE_VERTEX,
        fragmentShader: FLARE_FRAGMENT,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthTest: false,
        depthWrite: false,
        uniforms: { uDisc: { value: discs }, uAspect: { value: 1 }, uFlare: { value: 1 }, uGlow: colors.uGlow },
      }),
    );
    scene.add(screen(flareMat, 999));

    const sunNdc = new THREE.Vector3();
    const size = new THREE.Vector2();
    const clear = new THREE.Color();
    const ease = (x: number) => 1 - Math.pow(1 - THREE.MathUtils.clamp(x, 0, 1), 3);

    const rig = cameraRig(camera, pointer, { base: new THREE.Vector3(), focus: new THREE.Vector3(0, 0, -ORBIT_R), pitch: PITCH });

    return {
      hoverMask: distRT.texture,
      update(frame) {
        const { time, params, intro } = frame;
        rig(frame);
        const tanY = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
        shared.uTan.value.set(tanY * camera.aspect, tanY);
        shared.uTime.value = time;
        shared.uGlowK.value = params.glow;
        shared.uHazeK.value = params.haze;

        for (const { material } of towers) material.uniforms.uCloudY.value = -7.5 + params.deck;

        const cu = cloudMat.uniforms;
        cu.uDeck.value = params.deck;
        cu.uCover.value = params.cover;
        cu.uSigma.value = params.density;
        renderer.getDrawingBufferSize(size);
        const cw = Math.max(2, Math.round(size.x * 0.5));
        const ch = Math.max(2, Math.round(size.y * 0.5));
        if (cloudRT.width !== cw || cloudRT.height !== ch) {
          cloudRT.setSize(cw, ch);
          distRT.setSize(cw, ch);
          compositeMat.uniforms.uPx.value.set(1 / cw, 1 / ch);
          const bw = Math.max(2, Math.round(size.x / 8));
          const bh = Math.max(2, Math.round(size.y / 8));
          bloomA.setSize(bw, bh);
          bloomB.setSize(bw, bh);
          blurH.dir.set(1.6 / bw, 0);
          blurV.dir.set(0, 1.6 / bh);
        }
        const prev = renderer.getRenderTarget();
        const key = [params.deck, params.cover, params.density, params.glow, params.haze, ...Object.values(colors).flatMap((c) => c.value.toArray())].join();
        if (key !== envKey) {
          envKey = key;
          const eu = envClouds.material.uniforms;
          eu.uDeck.value = params.deck;
          eu.uCover.value = params.cover;
          eu.uSigma.value = params.density;
          renderer.setRenderTarget(envRT);
          renderer.render(envScene, envCam);
        }
        renderer.getClearColor(clear);
        const alpha = renderer.getClearAlpha();
        renderer.setRenderTarget(distRT);
        renderer.setClearColor(0x000000, 0);
        renderer.clear();
        renderer.render(distScene, camera);
        renderer.setClearColor(clear, alpha);
        renderer.setRenderTarget(cloudRT);
        renderer.render(cloudScene, camera);
        renderer.setRenderTarget(bloomA);
        renderer.render(blurH.s, camera);
        renderer.setRenderTarget(bloomB);
        renderer.render(blurV.s, camera);
        renderer.setRenderTarget(prev);
        veilMat.uniforms.uBloomK.value = params.bloom;

        sunNdc.copy(camera.position).addScaledVector(sun, 100).project(camera);
        const behind = sunNdc.z > 1;
        DISCS.forEach(([x, y, r, s, k], i) => discs[i].set(x + (sunNdc.x - SUN_BASE.x) * k, y + (sunNdc.y - SUN_BASE.y) * k, r, behind ? 0 : s));
        flareMat.uniforms.uAspect.value = camera.aspect;
        flareMat.uniforms.uFlare.value = params.flare * (0.85 + 0.15 * Math.sin(time * 0.3)) * ease(intro / 2.5 - 0.3);
      },
      dispose() {
        for (const d of disposables) d.dispose();
      },
    };
  },
};

export default skyline;

export type { TowerDef };
export { TAN_X, TAN_Y, COMMON, RAY_VERTEX, EQ_VERTEX, BLUR_FRAGMENT, VEIL_FRAGMENT, DIST_VERTEX, DIST_FRAGMENT, TOWER_FRAGMENT, FLARE_VERTEX, FLARE_FRAGMENT, rng, part, box, TOWERS, PULL, YAW, PITCH, ORBIT_R, DISCS };

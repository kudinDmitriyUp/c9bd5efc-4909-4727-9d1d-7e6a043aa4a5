import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { EnvModule } from "@/components/kit/env/EnvStage";
import { cameraRig } from "@/components/kit/env/cameraRig";

const EYE = 1.7;
const PITCH = 0.05;
const ND = 10;

const COMMON = `
uniform vec3 uSky, uHaze, uGlow, uCloud, uShade, uSun, uSand;
uniform float uTime, uGlowK, uHazeK, uMirror, uMist, uBand;
float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3. - 2. * f); return mix(mix(hash(i), hash(i + vec2(1., 0.)), u.x), mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), u.x), u.y); }
float fbm(vec2 p){ float s = 0., a = .5; for (int i = 0; i < OCT; i++) { s += a * noise(p); p = mat2(1.6, 1.2, -1.2, 1.6) * p + 3.1; a *= .5; } return s; }
vec3 horizonCol(vec3 d){
  vec2 f = normalize(d.xz + vec2(0., -1e-4)), s = normalize(uSun.xz);
  float a = max(dot(f, s), 0.);
  float warm = (pow(a, 7.) * .95 + pow(a, 1.6) * .3) * smoothstep(.4, -.02, d.y);
  return mix(uHaze, uGlow, clamp(warm * uGlowK, 0., 1.));
}
vec3 skyCol(vec3 d){
  vec3 c = mix(horizonCol(d), uSky, pow(smoothstep(-.02, .55, d.y), .7));
  float g = max(dot(d, uSun), 0.);
  c = mix(c, uGlow * 1.04, clamp((pow(g, 14.) * .32 + pow(g, 120.) * .45) * uGlowK, 0., 1.));
  return c;
}
float aerial(float dist, float y0, float y1){
  float a = exp(-max(y0, 0.) / 70.), b = exp(-max(y1, 0.) / 70.);
  float dy = y1 - y0;
  float avg = abs(dy) < 1. ? a : (a - b) * 70. / dy;
  return 1. - exp(-dist * .0025 * uHazeK * avg);
}
float wisp(vec2 p){ return noise(p) * .6 + noise(p * 2.7 + 5.) * .4; }
float mistAt(float dist, float y, vec2 xz){
  return uMist * smoothstep(20., 500., dist) * exp(-max(y, 0.) / 14.) * (.5 + .5 * wisp(xz * .006 + vec2(uTime * .02, 0.)));
}
vec3 bandCol(vec3 d){ return mix(mix(mix(uShade, uHaze, .45), uCloud, .6), horizonCol(d), .3); }
float bandAt(vec3 o, vec3 d, float dist, float y1){
  float h = 150., w = 40., a = 0.;
  float tc = (h - o.y) / max(d.y, 1e-4);
  if (d.y > 0. && tc < min(dist, 3500.)) {
    vec2 q = o.xz + d.xz * tc;
    a = smoothstep(.45, .75, wisp(q * vec2(.003, .011) + vec2(uTime * .006, 0.))) * (1. - exp(-w / max(d.y, .03) * .015)) * smoothstep(3500., 1500., tc);
  }
  vec2 q1 = o.xz + d.xz * dist;
  a = max(a, exp(-pow((y1 - h) / w, 2.)) * smoothstep(.4, .7, wisp(q1 * vec2(.003, .011) + vec2(uTime * .006, 0.))));
  return a * uBand;
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
uniform vec3 uPlane, uPlaneDir;
uniform float uCover, uTrail, uPuff, uStars;
varying vec3 vRay;
float fbm4(vec2 p){ float s = 0., a = .5; for (int i = 0; i < 4; i++) { s += a * noise(p); p = mat2(1.6, 1.2, -1.2, 1.6) * p + 3.1; a *= .5; } return s; }
vec4 cumulus(vec3 d){
  if (d.y < -.002) return vec4(0.);
  float az = atan(d.x, -d.z);
  float g = pow(max(dot(d, uSun), 0.), 3.);
  vec3 acc = vec3(0.);
  float a = 0.;
  for (int i = 0; i < 4; i++) {
    float fi = float(i);
    float s = pow(.6, fi);
    float y = (d.y - (.01 + .11 * s)) / s;
    if (y < -.01 || y > .13) continue;
    float x = az * 4.5 / s + fi * 7.3 + uTime * .002 / s;
    float top = .09 * smoothstep(.5 - uPuff * .08, .78, fbm4(vec2(x, fi * 5.1)));
    if (top < .002) continue;
    float e = fbm4(vec2(x * 5., y * 55.) + fi * 3.);
    float e2 = noise(vec2(x * 16., y * 170.) + fi);
    float edge = top + (e - .5) * .05 * smoothstep(0., .03, top) + (e2 - .5) * .012;
    float dens = smoothstep(0., .005, edge - y) * smoothstep(-.003, .004, y + (e2 - .5) * .004);
    if (dens < .003) continue;
    float lit = clamp(pow(clamp(y / top, 0., 1.), .6) * .75 + (e - .5) * .9 + (e2 - .5) * .25 + .12, 0., 1.);
    vec3 c = mix(mix(uShade, uSky, .3), uCloud, lit);
    c = mix(c, uGlow * 1.05, g * .3 * uGlowK * lit);
    c = mix(c, horizonCol(d), .08 + fi * .2);
    float k = dens * (1. - a);
    acc += c * k;
    a += k;
  }
  return vec4(acc / max(a, 1e-4), a);
}
vec4 deck(vec3 d){
  if (d.y < .004) return vec4(0.);
  float t = 1. / d.y;
  vec2 p = d.xz * t * .9 + vec2(uTime * .008, uTime * .003);
  float n = fbm(p);
  float cov = .45 - uCover - .1 * smoothstep(2., 14., t);
  float c = smoothstep(cov, cov + .3, n);
  if (c < .003) return vec4(0.);
  float n2 = fbm(p + normalize(uSun.xz) * .09);
  float lit = clamp(.5 + (n - n2) * 5., 0., 1.);
  float g = max(dot(d, uSun), 0.);
  vec3 col = mix(mix(uShade, uHaze, .25), uCloud, lit);
  col = mix(col, uGlow * 1.1, clamp(pow(g, 5.) * (1.2 - c) * 1.1 + lit * pow(g, 2.) * .35, 0., 1.) * uGlowK);
  col = mix(col, horizonCol(d), smoothstep(5., 30., t) * .8);
  return vec4(col, c * smoothstep(.004, .03, d.y) * .92);
}
vec4 bank(vec3 d){
  float az = atan(d.x, -d.z);
  float top = .018 + .05 * pow(fbm(vec2(az * 2.6, 4.7)), 1.6) * 1.6;
  float y = d.y + (fbm(vec2(az * 11., d.y * 34.) + vec2(uTime * .004, 0.)) - .5) * .035;
  float b = smoothstep(top, top - .022, y) * smoothstep(-.005, .01, d.y);
  if (b < .003) return vec4(0.);
  float lit = smoothstep(top - .045, top, y);
  float g = max(dot(d, uSun), 0.);
  vec3 base = mix(horizonCol(d), mix(uShade, uHaze, .5), .35);
  vec3 col = mix(base, mix(uCloud, uGlow, .55) * 1.04, lit * (.45 + .55 * pow(g, 3.)) * uGlowK);
  return vec4(col, b * .85);
}
float trail(vec3 o, vec3 d){
  vec3 e = -uPlaneDir * 1100.;
  vec3 w = o - uPlane;
  float b = dot(d, e), c = dot(e, e), dd = dot(d, w), ee = dot(e, w);
  float s = clamp((ee - b * dd) / max(c - b * b, 1e-3), 0., 1.);
  vec3 q = uPlane + e * s;
  float tr = max(dot(q - o, d), 0.);
  float dist = length(o + d * tr - q);
  float wd = 1.6 + s * 22.;
  return exp(-dist * dist / (wd * wd)) * smoothstep(0., .02, s) * pow(1. - s, 1.6) * (.55 + .45 * noise(vec2(s * 40., uTime * .2)));
}
void main(){
  vec3 d = normalize(vRay);
  d.y *= uMirror;
  vec3 col = skyCol(d);
  float g = dot(d, uSun);
  col += uGlow * smoothstep(.99968, .99982, g) * 2.6 * uGlowK;
  if (uStars > 0.) {
    vec3 sd = d * 380.;
    vec3 cell = floor(sd);
    float h1 = hash(cell.xy + cell.z * 17.13), h2 = hash(cell.zy + cell.x * 3.71);
    vec3 at = cell + .5 + (vec3(h1, h2, fract(h1 * 31.7)) - .5) * .5;
    float st = step(.992, h1) * smoothstep(.45, .1, length(sd - at)) * (.25 + .75 * pow(h2, 3.));
    st *= .75 + .25 * sin(uTime * (1. + h2 * 3.) + h1 * 40.);
    col += vec3(1., .97, .93) * st * uStars * smoothstep(.03, .3, d.y) * (1. - smoothstep(.1, .45, dot(col, vec3(.3, .59, .11))));
  }
  vec4 k = deck(d);
  col = mix(col, k.rgb, k.a);
  float tr = trail(cameraPosition, d) * uTrail;
  col = mix(col, mix(uCloud, uGlow, .45 + .3 * pow(max(g, 0.), 4.)), tr * .55 * (1. - aerial(1500., cameraPosition.y, 500.) * .5));
  if (uPuff > 0.) {
    vec4 cu = cumulus(d);
    col = mix(col, cu.rgb, cu.a);
  }
  vec4 bk = bank(d);
  col = mix(col, bk.rgb, bk.a);
  if (uBand > 0.) col = mix(col, bandCol(d), bandAt(cameraPosition, d, 1e5, 1e4));
  if (uMist > 0.) col = mix(col, mix(horizonCol(d), uCloud, .3), uMist * smoothstep(.05, 0., d.y) * .7);
  col += uGlow * pow(max(g, 0.), 400.) * .5 * uGlowK;
  gl_FragColor = vec4(col, 1.);
}`;

const WATER_FRAGMENT = `
${COMMON}
uniform vec3 uWater, uDeep;
uniform sampler2D uRefl;
uniform vec2 uRes;
uniform vec4 uBoat;
uniform float uSwell, uChop, uGlints, uAspect, uClock, uHover, uLive, uShallow;
uniform vec3 uPointer;
uniform vec2 uPointerVel;
uniform vec4 uDrops[ND];
uniform float uDropA[ND];
varying vec3 vRay;
varying vec2 vUv;
#define LIFE 2.8
const vec4 W[7] = vec4[7](
  vec4(.14, 15., .2, 0.),
  vec4(-.38, 9.5, .12, 1.7),
  vec4(.6, 6.1, .065, 4.1),
  vec4(-.85, 3.9, .045, 2.3),
  vec4(.27, 2.5, .03, 5.6),
  vec4(-1.2, 1.6, .018, .9),
  vec4(1.05, 1.05, .012, 3.3)
);
vec3 field(vec2 p, float fp){
  vec3 r = vec3(0.);
  for (int i = 0; i < NW; i++) {
    vec4 w = W[i];
    vec2 d = vec2(sin(w.x), cos(w.x));
    float k = 6.2832 / w.y;
    float a = w.z * (i < 3 ? uSwell : uChop) * (1. - smoothstep(.1, .4, fp / w.y));
    float x = k * dot(d, p) - sqrt(9.8 * k) * .32 * uTime + w.w;
    float e = exp(sin(x) - 1.);
    r += vec3(a * e, a * e * cos(x) * k * d);
  }
  return r;
}
float glit(vec2 p, vec2 lv, vec3 n, vec3 rd){
  vec2 q = p * exp2(-lv);
  vec2 seed = mod(floor(q), 1024.) + lv * 17.17;
  float r1 = hash(seed), r2 = hash(seed + 31.7), r3 = hash(seed + 63.1);
  vec3 nf = normalize(n + vec3(r1 - .5, 0., r2 - .5) * .7);
  float sf = max(dot(reflect(rd, nf), uSun), 0.);
  float spot = smoothstep(.26, .02, length(fract(q) - .5 - (vec2(r1, r2) - .5) * .45));
  float tw = .5 + .5 * sin(uTime * (1.1 + r3 * 2.4) + r3 * 80.);
  return pow(sf, 70.) * spot * tw * tw * step(.3, r3);
}
void main(){
  vec3 rd = normalize(vRay);
  if (rd.y > -1e-5) discard;
  vec3 o = cameraPosition;
  float dn = -rd.y;
  float t0 = min(o.y / dn, 8000.);
  vec2 fw = fwidth(rd.xz * t0);
  float fp = min(length(fw), 50.);
  float fx = max(fw.x, 1e-4), fz = max(fw.y, 1e-4);
  float t = t0;
  float settle = 1. - smoothstep(14., 60., t0);
  for (int i = 0; i < 3; i++) t = (o.y - field(o.xz + rd.xz * t, fp).x * settle) / dn;
  vec2 p = o.xz + rd.xz * t;
  vec3 f = field(p, fp);
  vec3 n = normalize(vec3(-f.y, 1., -f.z));
  float ring = 0.;
  if (uLive > .5) {
    vec2 rip = vec2(0.);
    for (int i = 0; i < ND; i++) {
      vec4 d = uDrops[i];
      float age = uClock - d.w;
      if (age < 0. || age > LIFE) continue;
      vec2 v = p - d.xy;
      float r = length(v);
      float x = r - d.z * (.2 + age * .85);
      float wl = d.z * .5;
      float env = exp(-x * x / (d.z * d.z * .16)) * pow(1. - age / LIFE, 2.) * smoothstep(0., .25, age) * uDropA[i] / (1. + age);
      env *= 1. - smoothstep(.25, .7, fp / wl);
      float ph = x * 6.2832 / wl;
      rip += v / max(r, 1e-3) * cos(ph) * env;
      ring += max(sin(ph), 0.) * env;
    }
    n = normalize(n + vec3(-rip.x, 0., -rip.y) * .45);
  }
  vec2 bv = (p - uBoat.xy) * vec2(.55, 1.);
  float bd = length(bv);
  float lap = uBoat.w * exp(-bd * bd * 1.4);
  n = normalize(n + vec3(bv.x, 0., bv.y) / max(bd, .01) * sin(bd * 9. - uTime * 2.4) * lap * .12);

  float cosi = max(dot(n, -rd), 0.);
  float F = .025 + .975 * pow(1. - cosi, 5.);
  vec2 suv = gl_FragCoord.xy / uRes;
  float sc = 1. / (1. + t * .025);
  vec2 off = vec2(n.x * .6, n.z) * .045 * sc;
  float spread = .006 * sc + .003;
  vec3 refl = (texture2D(uRefl, suv + off).rgb * .4 + texture2D(uRefl, suv + off + vec2(0., spread)).rgb * .3 + texture2D(uRefl, suv + off - vec2(0., spread)).rgb * .3);
  float near = smoothstep(40., 4., t);
  vec3 body = mix(uDeep, uWater, smoothstep(-.06, .16, -n.z) * .55 + near * .45);
  float lum = dot(skyCol(reflect(rd, n)), vec3(.3, .59, .11));
  body *= .8 + .3 * lum;
  float sh = 0.;
  if (uShallow > 0.) {
    sh = uShallow * smoothstep(110., 7., t);
    float depth = .9 + t * .06;
    vec2 bp = p + n.xz * depth * 1.6 + rd.xz / dn * depth * .3;
    vec2 cq = bp * 1.5;
    float c1 = noise(cq + vec2(uTime * .3, 0.)), c2 = noise(cq * 1.6 + vec2(0., uTime * .25) + 3.);
    float c3 = noise(cq * 2.3 - vec2(uTime * .2, 0.) + 9.), c4 = noise(cq * 3.1 + vec2(uTime * .15) + 1.);
    float cau = (smoothstep(.07, 0., abs(c1 - c2)) * .6 + smoothstep(.06, 0., abs(c3 - c4)) * .4) * (1. - smoothstep(.12, .45, fp));
    vec3 bed = uSand * mix(vec3(1.), uWater * 1.4, .3) * (.8 + .2 * noise(bp * .12)) * (.85 + .45 * cau * clamp(uSun.y * 1.6, 0., 1.));
    body = mix(body, mix(bed, uWater * 1.05, 1. - exp(-depth * .6)), sh);
  }
  vec3 sea = mix(body, refl, clamp(F * 1.35 + .1 * (1. - sh), 0., 1.));
  float stroke = noise(p * vec2(.22, 1.4)) * .6 + noise(p * vec2(.5, 3.1) + 7.) * .4;

  vec3 R = reflect(rd, n);
  float s = max(dot(R, uSun), 0.);
  float sheen = pow(s, 28.) * .3 + pow(s, 260.) * .6;
  vec2 lv = clamp(log2(vec2(fx * 9., fz * 5.)), -7., 5.);
  vec2 l0 = floor(lv), lw = lv - l0;
  float glint = mix(mix(glit(p, l0, n, rd), glit(p, l0 + vec2(1., 0.), n, rd), lw.x), mix(glit(p, l0 + vec2(0., 1.), n, rd), glit(p, l0 + 1., n, rd), lw.x), lw.y);
  float dAz = atan(rd.x, -rd.z) - atan(uSun.x, -uSun.z);
  float dEl = dn - uSun.y;
  float path = exp(-dAz * dAz / (.006 + dn * .05)) * exp(-abs(dEl) * 4.) * smoothstep(0., .01, dn);
  float band = pow(s, 4.) * (.6 + .4 * stroke);

  float fog = aerial(t, o.y, 0.);
  fog = max(fog, 1. - smoothstep(0., .012, dn));
  sea = mix(sea, horizonCol(rd), fog * .92);
  if (uMist > 0.) sea = mix(sea, mix(horizonCol(rd), uCloud, .3), mistAt(t, 0., p) * .85);
  vec2 pd = (vUv * 2. - 1. - uPointer.xy) * vec2(uAspect, 1.);
  float touch = uHover * exp(-dot(pd, pd) * 9.) * (.45 + .55 * min(1., length(uPointerVel) * .8));
  float light = (sheen + glint * (2. + path * 6. + touch * 6.) + path * band * 1.1 + touch * stroke * .1 + ring * (.06 + pow(s, 6.) * .5)) * uGlints * (1. - fog * .5);
  sea = max(sea, mix(sea, uGlow * 1.25, clamp(light, 0., 1.)));
  sea += uGlow * (glint * path * 1.5 + lap * .03) * uGlints;
  gl_FragColor = vec4(sea, 1.);
}`;

const WORLD_VERTEX = `
uniform float uMirror;
attribute float aKind;
varying vec3 vW, vN;
varying float vKind;
void main(){
  vec4 w = modelMatrix * vec4(position, 1.);
  vW = w.xyz;
  vN = normalize(mat3(modelMatrix) * normal);
  vKind = aKind;
  w.y *= uMirror;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const WORLD_FRAGMENT = `
${COMMON}
uniform vec3 uLand, uRock;
varying vec3 vW, vN;
varying float vKind;
void main(){
  if (vW.y < (abs(vKind - 4.) < .5 ? -1e4 : -.02)) discard;
  vec3 cam = cameraPosition * vec3(1., uMirror, 1.);
  vec3 dv = vW - cam;
  float dist = length(dv);
  vec3 v = -dv / dist;
  vec3 n = normalize(vN);
  if (dot(n, v) < 0.) n = -n;
  float k = vKind;
  vec3 alb;
  float trans = 0., spec = 0.;
  if (k < .5) {
    vec2 q = vec2(vW.x + vW.z * .6, vW.y * 2.4) * .22;
    float h0 = noise(q * 3.) * .5 + noise(q * 9.) * .5;
    float hx = noise((q + vec2(.05, 0.)) * 3.) * .5 + noise((q + vec2(.05, 0.)) * 9.) * .5;
    float hy = noise((q + vec2(0., .05)) * 3.) * .5 + noise((q + vec2(0., .05)) * 9.) * .5;
    float fd = 1. - smoothstep(250., 900., dist);
    n = normalize(n + vec3((hx - h0) * 5., (hy - h0) * 2., 0.) * fd * .25);
    float slope = n.y;
    float veg = smoothstep(.42, .72, slope + (noise(vW.xz * .08) - .5) * .5) * smoothstep(1., 5., vW.y);
    float strata = .88 + .12 * noise(vec2(vW.y * .5, (vW.x - vW.z) * .05));
    alb = mix(uRock * strata, uLand * (.8 + .4 * noise(vW.xz * .3)), veg);
    float wet = smoothstep(1.4, .2, vW.y + (noise(vW.xz * .5) - .5) * .6);
    alb *= 1. - wet * .3;
    float foam = smoothstep(.35, .05, vW.y + (noise(vec2(vW.x + vW.z, uTime * .6)) - .5) * .25) * fd;
    alb = mix(alb, vec3(1.), foam * .55);
  } else if (k < 1.5) {
    alb = vec3(.93, .92, .9);
    spec = .5;
  } else if (k < 2.5) {
    alb = vec3(.1, .14, .22);
    spec = .4;
  } else if (k < 3.5) {
    alb = vec3(.96, .94, .9);
    trans = 1.;
  } else if (k < 4.5) {
    alb = vec3(.86, .87, .9);
    spec = .8;
  } else if (k < 5.5) {
    float veg = smoothstep(1.2, 2.1, vW.y + (noise(vW.xz * .15) - .5) * 1.4);
    alb = mix(uSand * (.93 + .07 * noise(vW.xz * .5)), uLand * (.7 + .35 * noise(vW.xz * .4)), veg);
    alb *= 1. - smoothstep(.6, .1, vW.y) * .25;
    alb = mix(alb, vec3(1.), smoothstep(.3, .05, vW.y + (noise(vec2(vW.x + vW.z, uTime * .6)) - .5) * .2) * .6);
  } else if (k < 6.5) {
    float c1 = noise(vW.xz * .16), c2 = noise(vW.xz * .55 + 3.);
    float fd = 1. - smoothstep(300., 1500., dist);
    n = normalize(n + vec3(c1 - .5, 0., c2 - .5) * .9 * fd);
    float shore = smoothstep(2.6, .9, vW.y + (c2 - .5) * 1.6);
    alb = mix(uLand * (.55 + .45 * c1) * (.8 + .3 * c2), uRock, shore);
    alb = mix(alb, vec3(1.), smoothstep(.3, .05, vW.y) * .3);
  } else if (k < 7.5) {
    alb = uLand * .8;
    trans = .12;
  } else {
    alb = mix(uRock, uSand, .3) * .6;
  }
  float up = smoothstep(-.08, .03, uSun.y);
  vec3 sunC = uGlow * 1.8 * uGlowK * up;
  float dif = max(dot(n, uSun) * .8 + .2, 0.);
  vec3 amb = mix(mix(uHaze, uShade, .55), uSky, n.y * .5 + .5) * .62;
  vec3 col = alb * (amb * mix(.85, 1., n.y) + sunC * dif * dif * .9);
  float back = pow(max(dot(-v, uSun), 0.), 3.);
  float rim = pow(1. - max(dot(n, v), 0.), 3.);
  col += uGlow * rim * back * (k < .5 ? .35 : .7) * uGlowK * up;
  col += uGlow * trans * pow(max(dot(-v, uSun), 0.), 2.) * .85 * uGlowK;
  col += uGlow * spec * pow(max(dot(reflect(-v, n), uSun), 0.), 40.) * 1.5;
  float fog = aerial(dist, cam.y, vW.y);
  vec3 air = horizonCol(-v);
  col = mix(col, air, fog);
  col = mix(col, air * 1.02, smoothstep(7., 0., vW.y) * smoothstep(100., 500., dist) * .45);
  if (uMist > 0.) col = mix(col, mix(air, uCloud, .3), mistAt(dist, vW.y, vW.xz));
  if (uBand > 0.) col = mix(col, bandCol(-v), bandAt(cam, -v, dist, vW.y));
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

const FINAL_FRAGMENT = `
uniform sampler2D uMain, uBloom;
uniform vec3 uHaze, uGlow;
uniform vec2 uSunNdc;
uniform float uBloomK, uFade, uAspect, uGlowK;
varying vec2 vUv;
float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
void main(){
  vec3 c = texture2D(uMain, vUv).rgb;
  c += texture2D(uBloom, vUv).rgb * .3 * uBloomK;
  vec2 sd = (vUv * 2. - 1. - uSunNdc) * vec2(uAspect, 1.);
  c += uGlow * exp(-length(sd) * 2.2) * .07 * uGlowK;
  c = min(c, .82 + .18 * (1. - exp(-max(c - .82, 0.) / .18)));
  c = mix(c, c * c * (3. - 2. * c), .12);
  c *= 1. - .1 * pow(length((vUv - .5) * vec2(1.1, 1.)) * 1.35, 2.6);
  c = mix(c, uHaze, uFade);
  gl_FragColor = vec4(c + (hash(gl_FragCoord.xy) - .5) / 200., 1.);
}`;

const SCREEN_VERTEX = `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`;

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
    [x, y] = [x * 1.6 + y * 1.2 + 3.1, -x * 1.2 + y * 1.6 + 1.7];
    amp *= 0.5;
  }
  return sum;
};

const kind = (g: THREE.BufferGeometry, k: number) => {
  const g2 = g.index ? g.toNonIndexed() : g;
  g2.deleteAttribute("uv");
  return g2.setAttribute("aKind", new THREE.Float32BufferAttribute(new Float32Array(g2.getAttribute("position").count).fill(k), 1));
};

type IslandDef = { x: number; z: number; w: number; d: number; h: number; peak: [number, number]; cliff: number; seed: number; res: [number, number] };

const ISLANDS: IslandDef[] = [
  { x: -150, z: -240, w: 210, d: 110, h: 40, peak: [-0.3, 0.1], cliff: 0.1, seed: 3, res: [220, 110] },
  { x: 46, z: -300, w: 30, d: 24, h: 4.5, peak: [0.1, 0], cliff: 0.2, seed: 11, res: [50, 40] },
  { x: 250, z: -560, w: 210, d: 120, h: 19, peak: [0.15, 0.1], cliff: 0.12, seed: 7, res: [120, 64] },
  { x: -170, z: -1050, w: 700, d: 260, h: 44, peak: [-0.25, 0], cliff: 0.12, seed: 5, res: [140, 56] },
  { x: 950, z: -1600, w: 1300, d: 400, h: 120, peak: [-0.2, 0], cliff: 0.12, seed: 9, res: [140, 56] },
];

const island = (def: IslandDef, xs: number, ws: number, k = 0) => {
  const [nx, nz] = def.res;
  const g = new THREE.PlaneGeometry(2, 2, nx, nz).rotateX(-Math.PI / 2);
  const pos = g.getAttribute("position");
  const s = def.seed;
  for (let i = 0; i < pos.count; i++) {
    const u = pos.getX(i), v = pos.getZ(i);
    const a = Math.atan2(v, u);
    const wob = (fbm(Math.cos(a) * 1.6 + s, Math.sin(a) * 1.6 - s, s, 4) - 0.5) * 0.6 + (vnoise(u * 9, v * 9, s + 5) - 0.5) * 0.06;
    const r = (Math.hypot(u, v * 1.05) / 0.7) * (1 + wob);
    const edge = Math.max(0, 1 - r);
    const cl = THREE.MathUtils.clamp(fbm(Math.cos(a) * 2 + s + 9, Math.sin(a) * 2, s + 3, 3) * 2.4 - 0.7, 0, 1);
    const cliff = THREE.MathUtils.smoothstep(edge, 0, def.cliff) * cl;
    const dome = Math.pow(edge, 0.85);
    const pk = Math.exp(-((u - def.peak[0]) ** 2 * 4 + (v - def.peak[1]) ** 2 * 3));
    const ridge = 1 - Math.abs(fbm(u * 2.6 + s, v * 2.6 - s, s + 1, 5) * 2 - 1);
    let y = def.h * (cliff * 0.3 + dome * 0.45 + pk * 0.6 * Math.min(1, edge * 4)) * (0.62 + 0.5 * ridge) + (fbm(u * 14, v * 14, s + 2, 3) - 0.5) * def.h * 0.08 * Math.min(1, edge * 6);
    if (r > 1) y = -2 - (r - 1) * def.h;
    pos.setXYZ(i, def.x * xs + (u * def.w * ws) / 2, y, def.z + (v * def.d) / 2);
  }
  g.computeVertexNormals();
  return kind(g, k);
};

const ISLETS: IslandDef[] = [
  { x: 64, z: -190, w: 64, d: 34, h: 2.6, peak: [0, 0], cliff: 0.04, seed: 41, res: [60, 36] },
  { x: -70, z: -430, w: 120, d: 46, h: 3.2, peak: [0.2, 0], cliff: 0.04, seed: 43, res: [70, 36] },
  { x: 205, z: -330, w: 56, d: 28, h: 2.4, peak: [-0.1, 0], cliff: 0.04, seed: 47, res: [50, 30] },
  { x: -330, z: -760, w: 160, d: 60, h: 3.6, peak: [0, 0], cliff: 0.04, seed: 53, res: [70, 30] },
];

const palm = (x: number, y: number, z: number, h: number, seed: number) => {
  const r = (i: number) => vhash(seed, i, 71);
  const dir = r(0) * Math.PI * 2;
  const lean = 0.08 + r(1) * 0.2;
  const top = new THREE.Vector3(Math.cos(dir) * lean * h, h, Math.sin(dir) * lean * h);
  const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(), new THREE.Vector3(top.x * 0.15, h * 0.55, top.z * 0.15), top);
  const trunk = kind(new THREE.TubeGeometry(curve, 8, h * 0.034, 5, false), 8);
  const verts: number[] = [];
  const up = new THREE.Vector3(0, 1, 0);
  const fronds = 9 + Math.floor(r(2) * 4);
  for (let f = 0; f < fronds; f++) {
    const az = (f / fronds) * Math.PI * 2 + r(10 + f) * 0.5;
    const len = h * 0.5 * (0.8 + r(30 + f) * 0.4);
    const rise = 0.35 + r(50 + f) * 0.35;
    const out = new THREE.Vector3(Math.cos(az), 0, Math.sin(az));
    const side = new THREE.Vector3(-Math.sin(az), 0, Math.cos(az));
    const row = (a: number) => {
      const p = top.clone().addScaledVector(out, len * a).addScaledVector(up, len * (rise * Math.sin(a * Math.PI * 0.8) - 0.75 * a * a));
      const w = len * 0.16 * Math.sin(Math.PI * Math.min(1, 0.12 + a * 1.05));
      return [p.clone().addScaledVector(side, w).addScaledVector(up, -w * 0.35), p.clone().addScaledVector(up, w * 0.12), p.clone().addScaledVector(side, -w).addScaledVector(up, -w * 0.35)];
    };
    const segs = 7;
    for (let s = 0; s < segs; s++) {
      const a = row(s / segs), b = row((s + 1) / segs);
      for (const [p, q, u, v] of [[a[0], a[1], b[1], b[0]], [a[1], a[2], b[2], b[1]]]) for (const c of [p, q, u, p, u, v]) verts.push(c.x, c.y, c.z);
    }
  }
  const leaves = new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
  leaves.computeVertexNormals();
  leaves.setAttribute("aKind", new THREE.Float32BufferAttribute(new Float32Array(verts.length / 3).fill(7), 1));
  return mergeGeometries([trunk, leaves])!.translate(x, y, z);
};

const isletGeometry = (xs: number, ws: number) => {
  const parts: THREE.BufferGeometry[] = [];
  ISLETS.forEach((def, n) => {
    const g = island(def, xs, ws, 5);
    parts.push(g);
    const pos = g.getAttribute("position");
    const spots: number[] = [];
    for (let i = 0; i < pos.count; i += 3) if (pos.getY(i) > 1.3 && vhash(i, n, 91) < 0.02) spots.push(i);
    const count = 3 + Math.floor(def.w / 22);
    for (let j = 0; j < Math.min(count, spots.length); j++) {
      const i = spots[Math.floor(vhash(j, n, 93) * spots.length)];
      parts.push(palm(pos.getX(i), pos.getY(i) - 0.4, pos.getZ(i), 8 + vhash(j, n, 95) * 5, n * 31 + j));
    }
  });
  return mergeGeometries(parts)!;
};

const heightField = (x0: number, x1: number, zNear: number, zFar: number, nx: number, nz: number, xs: number, k: number, h: (x: number, z: number) => number) => {
  const g = new THREE.PlaneGeometry(1, 1, nx, nz).rotateX(-Math.PI / 2);
  const pos = g.getAttribute("position");
  for (let i = 0; i < pos.count; i++) {
    const x = x0 + (pos.getX(i) + 0.5) * (x1 - x0);
    const z = zNear - (zNear - zFar) * Math.pow(0.5 - pos.getZ(i), 1.7);
    pos.setXYZ(i, x * xs, h(x, z), z);
  }
  g.computeVertexNormals();
  return kind(g, k);
};

const sstep = THREE.MathUtils.smoothstep;

const fjordY = (x: number, z: number) => {
  const c = Math.sin(z * 0.0009 + 1) * 80 + (fbm(z * 0.0012, 1, 21, 3) - 0.5) * 160;
  const side = x > c ? 1 : -1;
  const close = sstep(z, -4000, -2800);
  const hw = (250 + (fbm(z * 0.003, side * 7, 22, 3) - 0.5) * 300 + sstep(z, -500, -100) * 60) * close;
  const d = Math.abs(x - c) - hw;
  if (d < 0) return -3 + d * 0.05;
  const H = (200 + 420 * fbm(x * 0.004, z * 0.004, 24, 5)) * (1 + (1 - close) * 0.6);
  const rise = 1 - Math.exp(-d / 150);
  const gully = 1 - Math.abs(fbm(z * 0.012 + x * 0.002, d * 0.004, 26, 4) * 2 - 1);
  return H * rise * (0.75 + 0.35 * gully) + (fbm(x * 0.02, z * 0.02, 25, 4) - 0.5) * 30 * rise - 1.5;
};

const lakeY = (x: number, z: number) => {
  const zf = -820 - 520 * Math.exp(-(((x - 120) / 380) ** 2)) - (fbm(x * 0.0022, 2, 31, 3) - 0.5) * 300;
  const df = zf - z;
  const far = df > 0 ? (30 + 230 * fbm(x * 0.0025, z * 0.0025, 32, 4) ** 1.4) * (1 - Math.exp(-df / 260)) : df * 0.2;
  const xl = -230 - (fbm(z * 0.004, 3, 33, 3) - 0.5) * 200 + sstep(z, -300, -150) * 70;
  const dl = xl - x;
  const left = dl > 0 ? (25 + 70 * fbm(x * 0.006, z * 0.006, 34, 3)) * (1 - Math.exp(-dl / 110)) : dl * 0.2;
  const xr = 480 + (fbm(z * 0.003, 9, 35, 3) - 0.5) * 260;
  const dr = x - xr;
  const right = dr > 0 ? (25 + 70 * fbm(x * 0.005, z * 0.005, 36, 3)) * (1 - Math.exp(-dr / 120)) : dr * 0.2;
  const mount = (1 - sstep(z, -2600, -1800)) * 420 * (1 - Math.abs(fbm(x * 0.0012, z * 0.0012, 37, 5) * 2 - 1)) * (0.6 + 0.6 * fbm(x * 0.0005, 3, 38, 2));
  return Math.max(far, left, right, mount, -6) + (fbm(x * 0.03, z * 0.03, 39, 3) - 0.5) * 3;
};

const conifer = (() => {
  const tiers = [
    [0.3, 0.12, 0.62],
    [0.23, 0.38, 0.86],
    [0.15, 0.62, 1],
  ].map(([r, y0, y1]) => new THREE.ConeGeometry(r, y1 - y0, 6, 1, true).translate(0, (y0 + y1) / 2, 0));
  return mergeGeometries(tiers)!.toNonIndexed();
})();

const forestGeometry = (xs: number) => {
  const tp = conifer.getAttribute("position").array as Float32Array;
  const tn = conifer.getAttribute("normal").array as Float32Array;
  const pos: number[] = [];
  const nor: number[] = [];
  let z = -170;
  let row = 0;
  while (z > -1500) {
    const s = 7 + -z * 0.012;
    for (let x = -1300; x < 1300; x += s) {
      const jx = x + (vhash(row, x | 0, 61) - 0.5) * s, jz = z + (vhash(row, x | 0, 62) - 0.5) * s;
      const y = lakeY(jx, jz);
      if (y < 1.8 || vhash(row, x | 0, 63) < 0.12 || fbm(jx * 0.006, jz * 0.006, 67, 3) < 0.4) continue;
      if (Math.abs(lakeY(jx + 4, jz) - y) > 4 || Math.abs(lakeY(jx, jz - 4) - y) > 4) continue;
      const h = 13 + vhash(row, x | 0, 64) * 13, wm = 0.8 + vhash(row, x | 0, 65) * 0.45, rot = vhash(row, x | 0, 66) * 6.28;
      const cr = Math.cos(rot), sr = Math.sin(rot);
      for (let i = 0; i < tp.length; i += 3) {
        const px = tp[i] * h * wm, pz = tp[i + 2] * h * wm;
        pos.push(jx * xs + px * cr - pz * sr,y - 1.5 + tp[i + 1] * h, jz + px * sr + pz * cr);
        nor.push(tn[i] * cr - tn[i + 2] * sr, tn[i + 1], tn[i] * sr + tn[i + 2] * cr);
      }
    }
    z -= s;
    row++;
  }
  return new THREE.BufferGeometry()
    .setAttribute("position", new THREE.Float32BufferAttribute(pos, 3))
    .setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3))
    .setAttribute("aKind", new THREE.Float32BufferAttribute(new Float32Array(pos.length / 3).fill(7), 1));
};

const sail = (pts: [number, number][], bulge: number, segs = 8) => {
  const [a, b, c] = pts.map(([x, y]) => new THREE.Vector3(x, y, 0));
  const verts: number[] = [];
  const at = (i: number, j: number) => {
    const u = i / segs, w = j / segs;
    const p = a.clone().lerp(b, u).lerp(c.clone().lerp(b, u), w);
    p.z = Math.sin(Math.PI * w) * Math.sin(Math.PI * Math.min(1, u * 1.4)) * bulge * (1 - u);
    return p;
  };
  for (let i = 0; i < segs; i++)
    for (let j = 0; j < segs; j++) {
      const q = [at(i, j), at(i + 1, j), at(i + 1, j + 1), at(i, j + 1)];
      for (const k of [0, 1, 2, 0, 2, 3]) verts.push(q[k].x, q[k].y, q[k].z);
    }
  const g = new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
  g.computeVertexNormals();
  return g.setAttribute("aKind", new THREE.Float32BufferAttribute(new Float32Array(verts.length / 3).fill(3), 1));
};

const boatGeometry = () => {
  const hull = new THREE.SphereGeometry(1, 32, 16);
  const hp = hull.getAttribute("position");
  for (let i = 0; i < hp.count; i++) {
    const x = hp.getX(i), y = hp.getY(i), z = hp.getZ(i);
    const taper = 1 - Math.max(0, x) ** 2 * 0.75;
    hp.setXYZ(i, x * 2.1, y > 0 ? y * 0.12 : y * 0.55, z * 0.48 * taper);
  }
  hull.translate(0, 0.32, 0);
  hull.computeVertexNormals();
  const stripe = new THREE.SphereGeometry(1, 32, 8, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.12);
  const sp = stripe.getAttribute("position");
  for (let i = 0; i < sp.count; i++) {
    const x = sp.getX(i), y = sp.getY(i), z = sp.getZ(i);
    const taper = 1 - Math.max(0, x) ** 2 * 0.75;
    sp.setXYZ(i, x * 2.115, y * 0.56, z * 0.488 * taper);
  }
  stripe.translate(0, 0.32, 0);
  stripe.computeVertexNormals();
  const cabin = new THREE.BoxGeometry(0.8, 0.2, 0.42).translate(-0.35, 0.5, 0);
  const mast = new THREE.CylinderGeometry(0.022, 0.035, 3.3, 6).translate(0.25, 2.05, 0);
  const boom = new THREE.CylinderGeometry(0.02, 0.02, 1.65, 5).rotateZ(Math.PI / 2).translate(-0.55, 0.75, 0);
  return mergeGeometries([
    kind(hull, 1),
    kind(stripe, 2),
    kind(cabin, 1),
    kind(mast, 1),
    kind(boom, 1),
    sail([[0.2, 0.8], [0.2, 3.6], [-1.35, 0.8]], 0.18),
    sail([[0.3, 0.75], [0.28, 3.3], [1.95, 0.42]], 0.14),
  ])!;
};

const planeGeometry = () =>
  mergeGeometries([
    kind(new THREE.CylinderGeometry(1.9, 1.5, 40, 10).rotateZ(Math.PI / 2), 4),
    kind(new THREE.SphereGeometry(1.9, 10, 6).scale(2, 1, 1).translate(20, 0, 0), 4),
    kind(new THREE.BoxGeometry(5.5, 0.4, 36).translate(1, -0.6, 0), 4),
    kind(new THREE.BoxGeometry(4, 7, 0.4).translate(-18, 3.5, 0), 4),
    kind(new THREE.BoxGeometry(3, 0.3, 13).translate(-18, 0.5, 0), 4),
  ])!;

const voyage: EnvModule = {
  id: "voyage",
  title: "Voyage",
  palette: {
    uSky: { cssVar: "--voyage-sky", label: "Sky", fallback: "#83a7cf" },
    uHaze: { cssVar: "--voyage-haze", label: "Haze", fallback: "#f1ddcb" },
    uGlow: { cssVar: "--voyage-glow", label: "Sun", fallback: "#ffd9a8" },
    uCloud: { cssVar: "--voyage-cloud", label: "Cloud", fallback: "#fdf3ea" },
    uShade: { cssVar: "--voyage-shade", label: "Cloud shadow", fallback: "#a9a6bd" },
    uWater: { cssVar: "--voyage-water", label: "Water", fallback: "#3f9aa8" },
    uDeep: { cssVar: "--voyage-deep", label: "Deep", fallback: "#1d5578" },
    uLand: { cssVar: "--voyage-land", label: "Green", fallback: "#56664a" },
    uRock: { cssVar: "--voyage-rock", label: "Rock", fallback: "#c4a585" },
    uSand: { cssVar: "--voyage-sand", label: "Sand", fallback: "#f1e7d2" },
  },
  params: [
    { key: "swell", label: "Swell", min: 0, max: 2.5, step: 0.05, value: 0.7 },
    { key: "chop", label: "Ripples", min: 0, max: 2.5, step: 0.05, value: 0.9 },
    { key: "glints", label: "Glints", min: 0, max: 2, step: 0.05, value: 1 },
    { key: "cover", label: "Clouds", min: -0.3, max: 0.3, step: 0.01, value: 0 },
    { key: "haze", label: "Haze", min: 0.3, max: 2.5, step: 0.05, value: 1 },
    { key: "glow", label: "Sun glow", min: 0, max: 1.5, step: 0.05, value: 1 },
    { key: "sun", label: "Sun position", min: -1, max: 1, step: 0.01, value: 0.5 },
    { key: "sunHeight", label: "Sun height", min: -0.12, max: 1.2, step: 0.01, value: 0.06 },
    { key: "islands", label: "Islands", min: 0, max: 1, step: 1, value: 1 },
    { key: "islets", label: "Palm islets", min: 0, max: 1, step: 1, value: 0 },
    { key: "fjord", label: "Fjord cliffs", min: 0, max: 1, step: 1, value: 0 },
    { key: "lake", label: "Forest shores", min: 0, max: 1, step: 1, value: 0 },
    { key: "shallows", label: "Clear shallows", min: 0, max: 1, step: 0.05, value: 0 },
    { key: "puff", label: "Cumulus", min: 0, max: 1, step: 0.05, value: 0 },
    { key: "stars", label: "Stars", min: 0, max: 1.5, step: 0.05, value: 0 },
    { key: "mist", label: "Mist", min: 0, max: 1.5, step: 0.05, value: 0 },
    { key: "band", label: "Low cloud", min: 0, max: 1, step: 0.05, value: 0 },
    { key: "boat", label: "Boat", min: 0, max: 1, step: 1, value: 0 },
    { key: "plane", label: "Plane", min: 0, max: 1, step: 1, value: 0 },
    { key: "bloom", label: "Bloom", min: 0, max: 2, step: 0.05, value: 1 },
    { key: "float", label: "Camera float", min: 0, max: 2, step: 0.05, value: 0 },
    { key: "turn", label: "Scroll turn", min: 0, max: 2, step: 0.05, value: 0 },
    { key: "rig", label: "Camera rig", min: 0, max: 1, step: 1, value: 0 },
  ],
  fov: [40, 60],
  travelPerScreen: 0,
  creep: 0,
  hover: { liquid: 0, turn: 0 },
  resolution: 1,
  antialias: false,
  variants: {
    golden: {},
    tropical: {
      params: { sun: 0.2, sunHeight: 0.75, glow: 0.55, haze: 0.8, cover: -0.25, puff: 1, shallows: 1, islets: 1, swell: 0.5, chop: 0.8, bloom: 0.6 },
      colors: { "--voyage-sky": "#3d86d6", "--voyage-haze": "#d9eef5", "--voyage-glow": "#fff4dc", "--voyage-cloud": "#ffffff", "--voyage-shade": "#9fb3cc", "--voyage-water": "#2ccfc8", "--voyage-deep": "#0b7aa6", "--voyage-land": "#3f7a3a", "--voyage-rock": "#b9ab90", "--voyage-sand": "#f3ead6" },
    },
    bluehour: {
      params: { sun: 0.35, sunHeight: -0.05, glow: 0.8, haze: 1.1, cover: -0.1, stars: 1, swell: 0.3, chop: 0.35, glints: 0.6, bloom: 0.8 },
      colors: { "--voyage-sky": "#16213f", "--voyage-haze": "#6d6f95", "--voyage-glow": "#f2a593", "--voyage-cloud": "#8a86a8", "--voyage-shade": "#3b3d5c", "--voyage-water": "#3c4a6e", "--voyage-deep": "#121a33", "--voyage-land": "#1d2233", "--voyage-rock": "#2a2c40" },
    },
    fjord: {
      params: { sun: -0.3, sunHeight: 0.18, glow: 0.35, haze: 1, cover: 0.12, islands: 0, fjord: 1, band: 0.5, mist: 0.35, swell: 0.08, chop: 0.2, glints: 0.4, bloom: 0.5 },
      colors: { "--voyage-sky": "#93a5b5", "--voyage-haze": "#cfd6d8", "--voyage-glow": "#f1ece2", "--voyage-cloud": "#eef1f2", "--voyage-shade": "#8995a0", "--voyage-water": "#4e6d72", "--voyage-deep": "#1b3036", "--voyage-land": "#3d4c3e", "--voyage-rock": "#4c524e" },
    },
    lake: {
      params: { sun: 0.45, sunHeight: 0.09, glow: 0.8, haze: 0.9, cover: -0.05, islands: 0, lake: 1, mist: 0.5, swell: 0.04, chop: 0.25, glints: 0.7 },
      colors: { "--voyage-sky": "#9fb9d0", "--voyage-haze": "#efe2cd", "--voyage-glow": "#ffd7a0", "--voyage-cloud": "#fbf2e6", "--voyage-shade": "#a7a6b4", "--voyage-water": "#587a70", "--voyage-deep": "#1f3a3c", "--voyage-land": "#2f4430", "--voyage-rock": "#7a705e" },
    },
  },
  setup({ scene, camera, small, colors, pointer, renderer }) {
    const xs = small ? 0.45 : 1;
    camera.near = 0.5;
    camera.far = 8000;
    camera.updateProjectionMatrix();
    const sun = new THREE.Vector3();
    const mirror = { value: 1 };
    const shared = { uTime: { value: 0 }, uSun: { value: sun }, uMist: { value: 0 }, uBand: { value: 0 }, uGlowK: { value: 1 }, uHazeK: { value: 1 }, uMirror: mirror, uTan: { value: new THREE.Vector2(1, 1) } };
    const defines = { OCT: small ? 4 : 5, NW: small ? 5 : 7, ND };
    const disposables: { dispose: () => void }[] = [];
    const keep = <T extends { dispose: () => void }>(d: T) => (disposables.push(d), d);
    const quadGeo = keep(new THREE.PlaneGeometry(2, 2));
    const screen = (material: THREE.ShaderMaterial, order: number) => {
      const mesh = new THREE.Mesh(quadGeo, material);
      mesh.frustumCulled = false;
      mesh.renderOrder = order;
      return mesh;
    };
    const flat = (fragmentShader: string, uniforms: Record<string, THREE.IUniform>, vertexShader = RAY_VERTEX) => keep(new THREE.ShaderMaterial({ vertexShader, fragmentShader, defines, depthTest: false, depthWrite: false, uniforms }));

    const world = new THREE.Scene();
    const plane = new THREE.Vector3();
    const planeDir = new THREE.Vector3(1, 0.02, 0.12).normalize();
    const skyMat = flat(SKY_FRAGMENT, { ...colors, ...shared, uPlane: { value: plane }, uPlaneDir: { value: planeDir }, uCover: { value: 0 }, uTrail: { value: 1 }, uPuff: { value: 0 }, uStars: { value: 0 } });
    world.add(screen(skyMat, 0));

    const rtOpts = { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter };
    const mainRT = keep(new THREE.WebGLRenderTarget(2, 2, { ...rtOpts, depthBuffer: true, samples: 4 }));
    const reflRT = keep(new THREE.WebGLRenderTarget(2, 2, { ...rtOpts, depthBuffer: true }));
    const res = new THREE.Vector2(2, 2);
    const boatAt = new THREE.Vector4();
    const waterMat = flat(WATER_FRAGMENT, {
      ...colors,
      ...shared,
      ...pointer,
      uRefl: { value: reflRT.texture },
      uRes: { value: res },
      uBoat: { value: boatAt },
      uSwell: { value: 1 },
      uChop: { value: 1 },
      uGlints: { value: 1 },
      uAspect: { value: 1 },
      uDrops: { value: Array.from({ length: ND }, () => new THREE.Vector4(0, 0, 1, -99)) },
      uDropA: { value: new Array(ND).fill(0) },
      uClock: { value: 0 },
      uHover: { value: 0 },
      uLive: { value: 0 },
      uShallow: { value: 0 },
    });
    const water = screen(waterMat, 1);
    world.add(water);

    const solid = keep(new THREE.ShaderMaterial({ vertexShader: WORLD_VERTEX, fragmentShader: WORLD_FRAGMENT, defines, side: THREE.DoubleSide, uniforms: { ...colors, ...shared } }));
    const ws = small ? 0.7 : 1;
    const land = new THREE.Mesh(keep(mergeGeometries(ISLANDS.map((d) => island(d, xs, ws)))!), solid);
    land.frustumCulled = false;
    land.renderOrder = 2;
    world.add(land);
    const extra = (make: () => THREE.BufferGeometry) => {
      let m: THREE.Mesh | null = null;
      return (on: boolean) => {
        if (on && !m) {
          m = new THREE.Mesh(keep(make()), solid);
          m.frustumCulled = false;
          m.renderOrder = 2;
          world.add(m);
        }
        if (m) m.visible = on;
      };
    };
    const islets = extra(() => isletGeometry(xs, ws));
    const fjord = extra(() => heightField(-1300, 1300, -80, -4300, 240, 260, small ? 0.55 : 1, 0, fjordY));
    const lake = extra(() => mergeGeometries([heightField(-1800, 1800, -110, -3200, 200, 170, small ? 0.6 : 1, 6, lakeY), forestGeometry(small ? 0.6 : 1)])!);
    const boat = new THREE.Mesh(keep(boatGeometry()), solid);
    boat.frustumCulled = false;
    boat.renderOrder = 3;
    boat.scale.setScalar(0.95);
    world.add(boat);
    const jet = new THREE.Mesh(keep(planeGeometry()), solid);
    jet.frustumCulled = false;
    jet.renderOrder = 3;
    jet.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), planeDir);
    world.add(jet);

    const bloomA = keep(new THREE.WebGLRenderTarget(2, 2, rtOpts));
    const bloomB = keep(new THREE.WebGLRenderTarget(2, 2, rtOpts));
    const blur = (src: THREE.Texture, thresh: number) => {
      const material = flat(BLUR_FRAGMENT, { uSrc: { value: src }, uDir: { value: new THREE.Vector2() }, uThresh: { value: thresh } }, SCREEN_VERTEX);
      const s = new THREE.Scene();
      s.add(screen(material, 0));
      return { s, dir: material.uniforms.uDir.value as THREE.Vector2 };
    };
    const blurH = blur(mainRT.texture, 1);
    const blurV = blur(bloomA.texture, -1);
    const sunNdc = new THREE.Vector2();
    const finalMat = flat(FINAL_FRAGMENT, { uMain: { value: mainRT.texture }, uBloom: { value: bloomB.texture }, uHaze: colors.uHaze, uGlow: colors.uGlow, uSunNdc: { value: sunNdc }, uBloomK: { value: 1 }, uFade: { value: 0 }, uAspect: { value: 1 }, uGlowK: shared.uGlowK }, SCREEN_VERTEX);
    scene.add(screen(finalMat, 0));

    const u = waterMat.uniforms;
    const drops = u.uDrops.value as THREE.Vector4[];
    const dropA = u.uDropA.value as number[];
    const ray = new THREE.Vector3();
    const lastAt = new THREE.Vector2(9, 9);
    const cursor = new THREE.Vector2(9, 9);
    let slot = 0;
    let lastDrop = -99;
    let movedAt = -99;
    let away = true;
    let prev = performance.now();
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" && e.pointerType !== "pen") return;
      away = false;
      cursor.set((e.clientX / innerWidth) * 2 - 1, 1 - (e.clientY / innerHeight) * 2);
    };
    const onLeave = (e: Event) => {
      if (e.type === "blur" || !(e as PointerEvent).relatedTarget) away = true;
    };
    addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    addEventListener("blur", onLeave);

    const size = new THREE.Vector2();
    const sunWorld = new THREE.Vector3();
    const ease = (x: number) => {
      const c = THREE.MathUtils.clamp(x, 0, 1);
      return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
    };

    const rigAim = small ? PITCH + 0.05 : PITCH;
    const rig = cameraRig(camera, pointer, { base: new THREE.Vector3(0, EYE, 0), focus: new THREE.Vector3(0, EYE + 60 * Math.tan(rigAim), -60) });

    return {
      update({ time, intro, hero, scroll, params }) {
        const k = ease(intro / 2.6);
        const pp = pointer.uPointer.value;
        const pitch = small ? PITCH + 0.05 : PITCH;
        const fl = params.float * k;
        const leave = (1 - hero) * params.turn;
        if (params.rig > 0.5) rig({ time, intro, scroll });
        else {
        camera.position.set(
          pp.x * 0.9 + Math.sin(time * 0.21) * 0.35 * fl,
          THREE.MathUtils.lerp(0.55, EYE, k) + pp.y * 0.3 + Math.sin(time * 0.33 + 1.2) * 0.12 * fl + leave * 0.9,
          THREE.MathUtils.lerp(34, 0, k),
        );
        camera.rotation.set(
          THREE.MathUtils.lerp(-0.035, pitch, k) + pp.y * 0.012 + Math.sin(time * 0.17) * 0.004 * fl + leave * 0.05,
          -pp.x * 0.015 + (1 - k) * 0.06 + Math.sin(time * 0.13 + 0.4) * 0.01 * fl - leave * 0.3,
          (1 - k) * -0.025 + Math.sin(time * 0.27 + 0.6) * 0.004 * fl - leave * 0.03,
        );
        camera.updateMatrixWorld();
        }
        const tanY = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
        shared.uTan.value.set(tanY * camera.aspect, tanY);
        const az = Math.atan(params.sun * tanY * camera.aspect);
        const el = params.sunHeight;
        sun.set(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el));
        shared.uTime.value = time;
        shared.uGlowK.value = params.glow;
        shared.uHazeK.value = params.haze;
        skyMat.uniforms.uCover.value = params.cover;
        skyMat.uniforms.uTrail.value = params.plane;
        u.uSwell.value = params.swell;
        u.uChop.value = params.chop;
        u.uGlints.value = params.glints;
        u.uAspect.value = camera.aspect;
        u.uShallow.value = params.shallows;
        skyMat.uniforms.uPuff.value = params.puff;
        skyMat.uniforms.uStars.value = params.stars;
        shared.uMist.value = params.mist;
        shared.uBand.value = params.band;
        land.visible = params.islands > 0.5;
        islets(params.islets > 0.5);
        fjord(params.fjord > 0.5);
        lake(params.lake > 0.5);

        const span = 5200;
        const along = ((time * 48 + (small ? 2500 : 2000)) % span) - span / 2;
        plane.set(along * planeDir.x, 640 + along * planeDir.y, -2300 + along * planeDir.z);
        jet.position.copy(plane);
        jet.visible = params.plane > 0.5;

        const bx = 7.5 * xs +Math.sin(time * 0.05) * 0.6;
        const bz = -40;
        boat.visible = params.boat > 0.5;
        boat.position.set(bx, Math.sin(time * 1.1) * 0.05 - 0.04, bz);
        boat.rotation.set(Math.sin(time * 0.7 + 1) * 0.025, 0.35, Math.sin(time * 0.9) * 0.045);
        boatAt.set(bx, bz, 0, boat.visible ? 1 : 0);

        const now = performance.now() / 1000;
        const dt = Math.min(0.05, now - prev);
        prev = now;
        const speed = pointer.uPointerVel.value.length();
        if (!away && speed > 0.15) movedAt = now;
        const goal = !away && now - movedAt < 0.8 ? 1 : 0;
        u.uHover.value += (goal - u.uHover.value) * Math.min(1, dt * (goal ? 4 : 1.6));
        const gap = Math.hypot((pp.x - lastAt.x) * camera.aspect, pp.y - lastAt.y);
        const near = Math.hypot(pp.x - cursor.x, pp.y - cursor.y) < 0.25;
        if (!away && near && speed > 0.25 && gap > 0.07 && now - lastDrop > 0.07) {
          ray.set(pp.x, pp.y, 1).applyMatrix4(camera.projectionMatrixInverse).transformDirection(camera.matrixWorld);
          if (ray.y < -0.004) {
            const t = Math.min(camera.position.y / -ray.y, 80);
            drops[slot].set(camera.position.x + ray.x * t, camera.position.z + ray.z * t, THREE.MathUtils.clamp(t * 0.09, 0.2, 4), now);
            dropA[slot] = THREE.MathUtils.clamp(speed * 0.35, 0.35, 1);
            slot = (slot + 1) % ND;
            lastDrop = now;
            lastAt.set(pp.x, pp.y);
          }
        }
        u.uClock.value = now;
        u.uLive.value = now - lastDrop < 2.8 ? 1 : 0;

        renderer.getDrawingBufferSize(size);
        const w = Math.max(2, size.x), h = Math.max(2, size.y);
        if (mainRT.width !== w || mainRT.height !== h) {
          mainRT.setSize(w, h);
          reflRT.setSize(small ? w : Math.max(2, Math.round(w / 2)), small ? h : Math.max(2, Math.round(h / 2)));
          res.set(w, h);
          const bw = Math.max(2, Math.round(w / 6));
          const bh = Math.max(2, Math.round(h / 6));
          bloomA.setSize(bw, bh);
          bloomB.setSize(bw, bh);
          blurH.dir.set(1.5 / bw, 0);
          blurV.dir.set(0, 1.5 / bh);
        }
        const target = renderer.getRenderTarget();
        mirror.value = -1;
        water.visible = jet.visible = false;
        skyMat.uniforms.uTrail.value = 0;
        renderer.setRenderTarget(reflRT);
        renderer.clear(true, true, false);
        renderer.render(world, camera);
        mirror.value = 1;
        water.visible = true;
        jet.visible = params.plane > 0.5;
        skyMat.uniforms.uTrail.value = params.plane;
        renderer.setRenderTarget(mainRT);
        renderer.clear(true, true, false);
        renderer.render(world, camera);
        renderer.setRenderTarget(bloomA);
        renderer.render(blurH.s, camera);
        renderer.setRenderTarget(bloomB);
        renderer.render(blurV.s, camera);
        renderer.setRenderTarget(target);

        sunWorld.copy(camera.position).addScaledVector(sun, 1000).project(camera);
        sunNdc.set(sunWorld.x, sunWorld.y);
        const fu = finalMat.uniforms;
        fu.uAspect.value = camera.aspect;
        fu.uBloomK.value = params.bloom;
        fu.uFade.value = 1 - THREE.MathUtils.smoothstep(intro, 0.05, 0.9);
      },
      dispose() {
        removeEventListener("pointermove", onMove);
        document.documentElement.removeEventListener("pointerleave", onLeave);
        removeEventListener("blur", onLeave);
        for (const d of disposables) d.dispose();
      },
    };
  },
};

export default voyage;

import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { Reflector } from "three/examples/jsm/objects/Reflector.js";
import type { EnvModule } from "@/components/kit/env/EnvStage";
import { cameraRig } from "@/components/kit/env/cameraRig";
import { barkTexture, grower, hedger, leafTexture, rippleShader, sway } from "@/components/kit/env/trees";
import { LIGHT_PRESETS, lightParam, lightPreset, lightVariants } from "@/components/kit/env/lightPresets";

const NB = 40;
const E = 0.0015;
const KINDS = ["plaster", "stone", "wood", "paving", "frame", "glass", "rail"] as const;
type Kind = (typeof KINDS)[number];
const TILE: Record<Kind, number> = { plaster: 3, stone: 2.4, wood: 2.4, paving: 2.4, frame: 1, glass: 1, rail: 1 };

const sm = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const hashi = (x: number, y: number, s: number) => {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
const wrap = (i: number, p: number) => ((i % p) + p) % p;
const vnoise = (x: number, y: number, px: number, py: number, s: number) => {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const x0 = wrap(ix, px), x1 = wrap(ix + 1, px), y0 = wrap(iy, py), y1 = wrap(iy + 1, py);
  const a = hashi(x0, y0, s), b = hashi(x1, y0, s), c = hashi(x0, y1, s), d = hashi(x1, y1, s);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
};
const fbm = (u: number, v: number, px: number, py: number, s: number, o = 4) => {
  let t = 0;
  let a = 0.5;
  let n = 0;
  for (let i = 0; i < o; i++) {
    t += a * vnoise(u * px, v * py, px, py, s + i);
    n += a;
    a *= 0.5;
    px *= 2;
    py *= 2;
  }
  return t / n;
};

type Texel = { c: [number, number, number]; h: number; r: number };

const texture = (data: Uint8Array, size: number, srgb: boolean, repeat = true) => {
  const t = new THREE.DataTexture(data, size, size);
  t.wrapS = t.wrapT = repeat ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  return t;
};

const bake = (size: number, bump: number, fn: (u: number, v: number) => Texel) => {
  const n = size * size;
  const col = new Uint8Array(n * 4);
  const nor = new Uint8Array(n * 4);
  const rough = new Uint8Array(n * 4);
  const hs = new Float32Array(n);
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      const t = fn((i + 0.5) / size, (j + 0.5) / size);
      const k = j * size + i;
      for (let c = 0; c < 3; c++) col[k * 4 + c] = Math.round(Math.min(1, Math.max(0, t.c[c])) * 255);
      col[k * 4 + 3] = 255;
      rough[k * 4 + 1] = Math.round(Math.min(1, Math.max(0, t.r)) * 255);
      rough[k * 4 + 3] = 255;
      hs[k] = t.h;
    }
  }
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      const k = j * size + i;
      const dx = hs[j * size + ((i + 1) % size)] - hs[j * size + ((i - 1 + size) % size)];
      const dy = hs[((j + 1) % size) * size + i] - hs[((j - 1 + size) % size) * size + i];
      const nx = -dx * bump;
      const ny = -dy * bump;
      const l = Math.hypot(nx, ny, 1);
      nor[k * 4] = Math.round((nx / l * 0.5 + 0.5) * 255);
      nor[k * 4 + 1] = Math.round((ny / l * 0.5 + 0.5) * 255);
      nor[k * 4 + 2] = Math.round((1 / l * 0.5 + 0.5) * 255);
      nor[k * 4 + 3] = 255;
    }
  }
  return { map: texture(col, size, true), normalMap: texture(nor, size, false), roughnessMap: texture(rough, size, false) };
};

const stoneTexel = (u: number, v: number): Texel => {
  const gx = 7, gy = 11;
  const x = u * gx, y = v * gy;
  const cx = Math.floor(x), cy = Math.floor(y);
  let f1 = 9, f2 = 9, id = 0;
  for (let dj = -1; dj <= 1; dj++) {
    for (let di = -1; di <= 1; di++) {
      const ix = cx + di, iy = cy + dj;
      const wx = wrap(ix, gx), wy = wrap(iy, gy);
      const px = ix + 0.05 + 0.9 * hashi(wx, wy, 11);
      const py = iy + 0.05 + 0.9 * hashi(wx, wy, 12);
      const d = Math.hypot((x - px) * 0.34, (y - py) * 0.22) * (0.8 + 0.4 * hashi(wx, wy, 13));
      if (d < f1) {
        f2 = f1;
        f1 = d;
        id = wx * 31 + wy;
      } else if (d < f2) f2 = d;
    }
  }
  const grain = fbm(u, v, 24, 24, 3, 4);
  const fine = fbm(u, v, 96, 96, 4, 2);
  const edge = f2 - f1 + (grain - 0.5) * 0.03;
  const face = sm(0.006, 0.026, edge);
  const dome = Math.min(1, Math.sqrt(Math.max(edge, 0) / 0.1));
  const k = hashi(id, 7, 5), k2 = hashi(id, 3, 9);
  const tone = (0.66 + 0.46 * k2) * (0.84 + 0.3 * grain) * (0.92 + 0.16 * fine);
  const stone: [number, number, number] = [mix(1.04, 0.88, k) * tone, mix(0.98, 0.92, k) * tone, mix(0.9, 0.96, k) * tone];
  const m = 0.5 + 0.12 * grain;
  return {
    c: [mix(m, stone[0], face), mix(m * 0.97, stone[1], face), mix(m * 0.92, stone[2], face)],
    h: face * (0.5 + 0.35 * dome + 0.3 * (grain - 0.5) + 0.08 * fine) + (1 - face) * 0.08 * grain,
    r: mix(0.97, 0.78 + 0.18 * grain, face),
  };
};

const woodTexel = (u: number, v: number): Texel => {
  const rows = 16;
  const y = v * rows;
  const row = Math.floor(y);
  const f = y - row;
  const groove = sm(0, 0.07, f) * (1 - sm(0.93, 1, f));
  const k = hashi(row, 1, 21);
  const s = fbm(u, v, 3, 96, 22 + (row % 5) * 3, 4);
  const lines = 0.5 + 0.5 * Math.sin((f * 5 + s * 7 + k * 6) * 6.283);
  const tone = (0.78 + 0.3 * k) * (0.84 + 0.2 * lines) * (0.9 + 0.2 * s) * (0.3 + 0.7 * groove);
  return { c: [tone * 1.02, tone, tone * 0.96], h: groove * (0.9 + 0.08 * lines), r: 0.55 + 0.25 * lines };
};

const plasterTexel = (u: number, v: number): Texel => {
  const a = fbm(u, v, 48, 48, 31, 4);
  const b = fbm(u, v, 6, 6, 33, 4);
  const t = 0.95 + (b - 0.5) * 0.08 + (a - 0.5) * 0.04;
  return { c: [t * 1.005, t, t * 0.985], h: a * 0.7 + b * 0.3, r: 0.86 + 0.1 * a };
};

const pavingTexel = (u: number, v: number): Texel => {
  const x = u * 4, y = v * 4;
  const fx = x - Math.floor(x), fy = y - Math.floor(y);
  const joint = sm(0, 0.02, Math.min(fx, 1 - fx)) * sm(0, 0.02, Math.min(fy, 1 - fy));
  const k = hashi(Math.floor(x), Math.floor(y), 41);
  const speck = fbm(u, v, 64, 64, 42, 3);
  const t = (0.86 + 0.14 * k) * (0.9 + 0.18 * speck) * mix(0.5, 1, joint);
  return { c: [t, t * 0.99, t * 0.97], h: joint * (0.8 + 0.12 * speck), r: 0.72 + 0.2 * speck };
};

const travertineTexel = (u: number, v: number): Texel => {
  const rows = 6, cols = 3;
  const y = v * rows;
  const row = Math.floor(y);
  const x = u * cols + (row % 2) * 0.5;
  const col = wrap(Math.floor(x), cols);
  const fx = x - Math.floor(x), fy = y - row;
  const joint = sm(0, 0.01, Math.min(fx, 1 - fx) * 1.6) * sm(0, 0.01, Math.min(fy, 1 - fy) * 0.8);
  const k = hashi(col, wrap(row, rows), 71);
  const vein = fbm(u, v, 3, 40, 72, 4);
  const cloud = fbm(u, v, 12, 12, 73, 3);
  const pit = sm(0.74, 0.8, fbm(u, v, 160, 160, 74, 2));
  const tone = (0.92 + 0.08 * k) * (0.94 + 0.08 * vein) * (0.96 + 0.06 * cloud) * (1 - 0.1 * pit) * mix(0.86, 1, joint);
  return { c: [tone, tone * 0.99, tone * 0.96], h: joint * 0.5 + vein * 0.04 - pit * 0.08, r: 0.7 + 0.16 * cloud + 0.1 * pit };
};

const lawnTexel = (u: number, v: number): Texel => {
  const blade = fbm(u, v, 128, 128, 101, 2);
  const clump = fbm(u, v, 8, 8, 102, 4);
  const t = (0.78 + 0.3 * clump) * (0.85 + 0.3 * blade);
  return { c: [t * 0.96, t, t * 0.84], h: blade * 0.6 + clump * 0.2, r: 0.95 };
};

const project = (g: THREE.BufferGeometry, tile: number) => {
  const p = g.attributes.position;
  const n = g.attributes.normal;
  const uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    if (ay >= ax && ay >= az) uv.setXY(i, p.getX(i) / tile, p.getZ(i) / tile);
    else if (ax >= az) uv.setXY(i, p.getZ(i) / tile, p.getY(i) / tile);
    else uv.setXY(i, p.getX(i) / tile, p.getY(i) / tile);
  }
  return g;
};

const layout = (p: Record<string, number>) => {
  const parts = Object.fromEntries(KINDS.map((k) => [k, [] as THREE.BufferGeometry[]])) as Record<Kind, THREE.BufferGeometry[]>;
  const occ: number[] = [];
  const box = (kind: Kind, [x0, x1, y0, y1, z0, z1]: number[], r = 0.03, solid = true) => {
    const w = x1 - x0, h = y1 - y0, d = z1 - z0;
    const rr = Math.min(r, Math.min(w, h, d) * 0.45);
    const g = rr > 0.003 ? new RoundedBoxGeometry(w, h, d, 2, rr) : new THREE.BoxGeometry(w, h, d);
    parts[kind].push(g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2));
    if (solid && occ.length < NB * 7) occ.push((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, rr, w / 2, h / 2, d / 2);
  };
  const glazing = (a0: number, a1: number, b0: number, b1: number, z: number) => {
    const f = 0.06, fd = 0.1;
    const panes = Math.max(1, Math.round((a1 - a0) / 1.6));
    box("frame", [a0, a1, b0, b0 + f, z, z + fd], 0.008, false);
    box("frame", [a0, a1, b1 - f, b1, z, z + fd], 0.008, false);
    for (let i = 0; i <= panes; i++) {
      const x = Math.min(a1 - f, Math.max(a0, a0 + ((a1 - a0) * i) / panes - f / 2));
      box("frame", [x, x + f, b0 + f, b1 - f, z, z + fd], 0.008, false);
    }
    const seed = Math.round(b0 * 37 + z * 11 + a0 * 5);
    for (let i = 0; i < panes; i++) {
      const x0 = a0 + ((a1 - a0) * i) / panes, x1 = a0 + ((a1 - a0) * (i + 1)) / panes;
      const ry = (hashi(i, seed, 3) - 0.5) * 0.028, rx = (hashi(i, seed, 7) - 0.5) * 0.014;
      parts.glass.push(new THREE.PlaneGeometry(x1 - x0, b1 - b0).rotateY(ry).rotateX(rx).translate((x0 + x1) / 2, (b0 + b1) / 2, z + fd * 0.45));
    }
  };
  const volume = (kind: Kind, [x0, x1, y0, y1, z0, z1]: number[], o: { a0: number; a1: number; b0: number; b1: number; d: number; glaze?: boolean }) => {
    const { a0, a1, b0, b1, d } = o;
    box(kind, [x0, x1, b1, y1, z0, z1]);
    if (b0 > y0 + 0.01) box(kind, [x0, x1, y0, b0, z0, z1]);
    if (a0 > x0 + 0.01) box(kind, [x0 + E, a0, y0 + E, y1 - E, z0 + E, z1 - E]);
    if (x1 > a1 + 0.01) box(kind, [a1, x1 - E, y0 + E, y1 - E, z0 + E, z1 - E]);
    box(kind, [a0 - 0.05, a1 + 0.05, Math.max(b0 - 0.05, y0 + E), b1 + 0.05, z0 + E, z1 - d], 0.01);
    if (o.glaze !== false) glazing(a0, a1, b0, b1, z1 - d);
  };
  const rail = (x0: number, x1: number, z: number, y0: number, h: number) => {
    box("frame", [x0, x1, y0, y0 + 0.08, z - 0.05, z + 0.05], 0.01, false);
    const n = Math.max(1, Math.round((x1 - x0) / 1.25));
    const w = (x1 - x0) / n;
    for (let i = 0; i < n; i++) box("rail", [x0 + w * i + 0.012, x0 + w * (i + 1) - 0.012, y0 + 0.08, y0 + h, z - 0.01, z + 0.01], 0, false);
  };

  const F = 0.47, H1 = 3.6, H2 = 6.8;
  const two = p.floors > 1.5;
  const top = two ? H2 : H1;
  const g = THREE.MathUtils.clamp(p.glass, 0.2, 0.95);
  const o = p.overhang;
  const st: Kind = p.stone > 0.5 ? "stone" : "plaster";
  const clad = p.cladding > 0.5;

  box(st, [-9.6, 10.6, 0, F - 0.05, -9, 2.6]);
  box("paving", [-9.7, 10.7, F - 0.06, F, -9.1, 2.68], 0.012);
  for (let k = 1; k <= 3; k++) box("paving", [-2.3, 0.7, (F * (k - 1)) / 3, (F * k) / 3, 2.68, 2.68 + 0.38 * (4 - k)], 0.012);

  const ga0 = -5.4;
  const ga1 = ga0 + g * (3.3 - ga0);
  volume("plaster", [-6, 5.9, F, H1, -8, 0], { a0: ga0, a1: ga1, b0: F, b1: 3.1, d: 0.45 });
  if (clad) box("wood", [ga1 + 0.35, 3.85, F, 3.1, -0.02, 0.04], 0.01);

  if (two) {
    const ua0 = -8;
    volume("plaster", [-8.6, 5.9, H1, H2, -8.2, 1.4], { a0: ua0, a1: ua0 + g * (3.6 - ua0), b0: H1 + 0.25, b1: H2 - 0.4, d: 0.5 });
  }
  const front = two ? 1.4 : 0;
  box(st, [3.9, 5.15, 0, top + 0.06, -0.8, Math.min(front + 0.5, front + o - 0.1)], 0.035);
  box("plaster", [(two ? -8.6 : -6) - o * 0.5, 5.9 + o * 0.35, top, top + 0.38, (two ? -8.2 : -8) - 0.4, front + o], 0.03);

  const gh = H1 - 0.3;
  volume("plaster", [5.9, 10.4, F, gh, -7.6, 0.9], { a0: 6.35, a1: 9.95, b0: F, b1: 2.85, d: 0.22, glaze: false });
  box(clad ? "wood" : "frame", [6.35, 9.95, F + E, 2.85 - E, 0.7, 0.76], 0.006);
  box("plaster", [5.85, 10.5, gh, gh + 0.12, -7.7, 1], 0.02);

  if (p.balcony > 0.5) {
    rail(5.95, 10.45, 0.93, gh + 0.12, 1.05);
    rail(-9.5, -2.5, 2.52, F, 1);
  }
  box("paving", [5.6, 10.9, -0.03, 0.012, 2.68, 18], 0.004, false);
  box("paving", [-2.6, 1, -0.03, 0.01, 3.82, 12], 0.004, false);
  return { parts, occ };
};

const PARS = `
#define NB ${NB}
uniform vec4 uBoxC[NB];
uniform vec3 uBoxH[NB];
uniform int uBoxN;
uniform vec3 uLeafT1, uLeafT2;
uniform vec2 uLeafC, uLeafC2;
uniform float uTime, uLeaves, uMist, uFogK, uWin;
uniform vec3 uSunDir, uSunCol;
varying vec3 vVillaW, vVillaN;
float vhash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3. - 2. * f); return mix(mix(vhash(i), vhash(i + vec2(1., 0.)), u.x), mix(vhash(i + vec2(0., 1.)), vhash(i + vec2(1., 1.)), u.x), u.y); }
float vfbm(vec2 p){ float s = 0., a = .5; for (int i = 0; i < 4; i++) { s += a * vnoise(p); p = mat2(1.6, 1.2, -1.2, 1.6) * p + 3.1; a *= .5; } return s / .9375; }
float sdVilla(vec3 p){
  float d = p.y;
  for (int i = 0; i < NB; i++) {
    if (i >= uBoxN) break;
    vec4 c = uBoxC[i];
    vec3 q = abs(p - c.xyz) - uBoxH[i] + c.w;
    d = min(d, length(max(q, 0.)) + min(max(q.x, max(q.y, q.z)), 0.) - c.w);
  }
  return d;
}
float villaAO(vec3 p, vec3 n){
  if (length(p.xz - vec2(.5, -3.)) > 24.) return 1.;
  float o = 0.;
  for (int i = 1; i <= 4; i++) {
    float h = .1 * float(i * i);
    o += clamp((h - sdVilla(p + n * h)) / h, 0., 1.) * (1.2 - .2 * float(i));
  }
  return clamp(1. - o * .32, 0., 1.);
}
float leafMask(vec3 w){
  if (uLeaves <= 0. || length(w.xz - vec2(.5, -3.)) > 30.) return 1.;
  vec2 q = vec2(dot(w, uLeafT1), dot(w, uLeafT2));
  float wob = (vnoise(q * .3 + 3.) - .5) * .6;
  float env = max(smoothstep(1.05, .4, length((q - uLeafC) / vec2(7., 4.2)) + wob), smoothstep(1.05, .4, length((q - uLeafC2) / vec2(6., 3.6)) + wob) * .8);
  vec2 sway = vec2(sin(uTime * .7) + sin(uTime * 1.13 + 1.), cos(uTime * .9) + sin(uTime * .53)) * .05;
  float holes = vfbm(q * 1.05 + sway + vec2(uTime * .015, 0.));
  float leaf = smoothstep(.4, .6, holes + (vnoise(q * 4.2 + sway * 2.5) - .5) * .22);
  return 1. - uLeaves * env * leaf * .9;
}
`;

const AO_CHUNK = `
float ambientOcclusion = villaAO(vVillaW, normalize(vVillaN));
reflectedLight.indirectDiffuse *= ambientOcclusion;
#if defined( USE_ENVMAP ) && defined( STANDARD )
  float dotNVo = saturate( dot( geometryNormal, geometryViewDir ) );
  reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNVo, ambientOcclusion, material.roughness );
#endif
reflectedLight.directDiffuse *= mix(1., ambientOcclusion, .3);
`;

const FOG_CHUNK = `
#ifdef USE_FOG
vec3 hV = vVillaW - cameraPosition;
float hD = length(hV);
float hAz = max(dot(normalize(hV.xz + 1e-4), normalize(uSunDir.xz + 1e-4)), 0.);
vec3 hFog = mix(fogColor, uSunCol, .25 + .5 * pow(hAz, 3.));
float hNear = 1. - exp(-fogDensity * fogDensity * hD * hD);
float hFar = 1. - exp(-max(length(vVillaW.xz - vec2(.5, -3.)) - 16., 0.) * .012 * uFogK);
float hMist = uMist * smoothstep(24., 140., hD) * exp(-max(vVillaW.y, 0.) * .25);
float hK = 1. - (1. - hNear) * (1. - hFar * .95) * (1. - hMist * .75);
gl_FragColor.rgb = mix(gl_FragColor.rgb, hFog * (1. + .06 * hMist), clamp(hK, 0., 1.));
#endif`;

const WIN_CHUNK = `#include <emissivemap_fragment>
float wPane = vhash(vec2(floor(vVillaW.x * .62 + .5), floor(vVillaW.y / 3.2)) + 7.3);
float wGrad = .55 + .45 * smoothstep(.2, 2.6, fract(vVillaW.y / 3.2 - .15) * 3.2);
totalEmissiveRadiance *= max(uWin * (.12 + .88 * step(.4, wPane)) * wGrad * (.7 + .5 * vnoise(vVillaW.xy * .7)), .008 * (.4 + wPane));`;

const DIR_LINE = "directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ]";

const SKY_VERTEX = `
varying vec3 vDir;
void main(){
  vDir = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
}`;

const SKY_FRAGMENT = `
uniform vec3 uSky, uHaze, uGlow, uFoliage, uLawn, uSunDir, uCam;
uniform float uHazeK, uTime, uCoast;
varying vec3 vDir;
vec3 lin(vec3 c){ return pow(c, vec3(2.2)); }
float h1(float x){ return fract(sin(x * 127.1) * 43758.5453); }
float n1(float x){ float i = floor(x), f = fract(x); f = f * f * (3. - 2. * f); return mix(h1(i), h1(i + 1.), f); }
float fbm(float x){ float v = 0., w = .5; for (int i = 0; i < 5; i++) { v += w * n1(x); x = x * 2.07 + 17.3; w *= .5; } return v / .96875; }
float ridge(float x){ float r = 1. - abs(2. * n1(x * .8 + 3.1) - 1.); return fbm(x) * .72 + r * r * .28; }
vec3 hills(vec3 c, float y, float a, float f, float o, float b, float h, vec3 col, vec3 mist, vec3 rimC, float sa, float rimK){
  float r = b + h * ridge(a * f + o);
  float s = (b + h * ridge((a + .01) * f + o) - b - h * ridge((a - .01) * f + o)) / .02;
  float lit = clamp(-s * sign(sin(sa - a)) * 2.5, -1., 1.);
  float under = r - y;
  vec3 m = col * (1. + .22 * lit);
  m = mix(m, mist, smoothstep(.01, .1, under) * .55);
  m += rimC * rimK * exp(-max(under, 0.) / .006);
  return mix(c, m, smoothstep(-.0025, .0025, under));
}
float sn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(h1(dot(i, vec2(1., 57.))), h1(dot(i + vec2(1., 0.), vec2(1., 57.))), f.x), mix(h1(dot(i + vec2(0., 1.), vec2(1., 57.))), h1(dot(i + vec2(1., 1.), vec2(1., 57.))), f.x), f.y); }
float swell(vec2 p, float t){
  return sn(p * .045 + vec2(uTime * .03, uTime * .015)) * .8 + sn(p * .13 + vec2(-uTime * .05, uTime * .04)) * .35 / (1. + t * .004) + sn(p * .42 + vec2(uTime * .09, -uTime * .07)) * .12 / (1. + t * .02);
}
vec3 seaShade(vec3 d, vec3 hor, vec3 glow, vec3 sky, float az){
  float t = (uCam.y + 8.) / max(-d.y, 1e-4);
  vec2 p = uCam.xz + d.xz * t;
  float h0 = swell(p, t);
  vec2 gr = vec2(swell(p + vec2(1., 0.), t) - h0, swell(p + vec2(0., 1.), t) - h0);
  float k = 2.2 / (1. + t * .004);
  vec3 n = normalize(vec3(-gr.x * k, 1., -gr.y * k));
  vec3 r = reflect(d, n);
  r.y = abs(r.y);
  vec3 refl = mix(hor, sky, pow(smoothstep(-.02, .55, r.y), .6));
  float fres = .04 + .96 * pow(1. - clamp(dot(n, -d), 0., 1.), 5.);
  vec3 deep = mix(sky, lin(uFoliage) * 2., .25) * .38;
  vec3 c = mix(deep, refl, clamp(fres * .42, 0., 1.));
  float facet = dot(normalize(n.xz + 1e-4), normalize(uSunDir.xz + 1e-4)) * length(n.xz);
  c *= 1. + facet * 1.6 / (1. + t * .003);
  float g = max(dot(r, uSunDir), 0.);
  float sp = smoothstep(.55, .95, sn(p * .8 + vec2(uTime * .35, uTime * .2))) / (1. + t * .02);
  c += glow * (pow(g, 90.) * .5 + pow(g, 700.) * 2. + pow(g, 40.) * sp * 4.);
  return mix(c, hor * (1. + .05 * az), 1. - exp(-t * .0009 * uHazeK));
}
float landR(float a, float cen, float wid, float h, float o){
  float e = (a - cen) / wid;
  return max(h * exp(-e * e) * (.45 + .9 * ridge(a * 9. + o)) - .004, 0.);
}
vec3 land(vec3 c, float y, float a, float cen, float wid, float h, float o, vec3 col, vec3 mist, vec3 rimC, float sa){
  float r = landR(a, cen, wid, h, o);
  float s = (landR(a + .01, cen, wid, h, o) - landR(a - .01, cen, wid, h, o)) / .02;
  float lit = clamp(-s * sign(sin(sa - a)) * 1.5, -1., 1.);
  vec3 m = col * (1. + .2 * lit);
  m = mix(m, mist, (1. - smoothstep(0., max(r * .85, 1e-4), y)) * .75);
  m += rimC * exp(-max(r - y, 0.) / .004) * .6;
  return mix(c, m, smoothstep(0., .0015, r - y));
}
void main(){
  vec3 d = normalize(vDir);
  vec3 haze = lin(uHaze), glow = lin(uGlow);
  float az = max(dot(normalize(d.xz + 1e-4), normalize(uSunDir.xz + 1e-4)), 0.);
  vec3 hor = mix(haze, glow, .25 + .5 * pow(az, 3.));
  vec3 c = mix(hor, lin(uSky), pow(smoothstep(-.02, .55, d.y), .6));
  float g = max(dot(d, uSunDir), 0.);
  c += glow * (pow(g, 6.) * .35 + pow(g, 60.) * 1.2 + smoothstep(.9993, .9997, g) * 12.);
  float a = atan(d.x, d.z);
  vec2 cq = d.xz / (d.y + .06) * .35 + uTime * vec2(.012, .004);
  float cl = 0., ca = .5;
  for (int i = 0; i < 4; i++) { vec2 ip = floor(cq), fp = fract(cq); fp = fp * fp * (3. - 2. * fp); float hv = mix(mix(h1(dot(ip, vec2(1., 57.))), h1(dot(ip + vec2(1., 0.), vec2(1., 57.))), fp.x), mix(h1(dot(ip + vec2(0., 1.), vec2(1., 57.))), h1(dot(ip + vec2(1., 1.), vec2(1., 57.))), fp.x), fp.y); cl += ca * hv; cq = cq * 2.1 + vec2(1.7, 9.2); ca *= .5; }
  float cloud = smoothstep(.54, .86, cl / .9375) * smoothstep(.06, .24, d.y) * (1. - smoothstep(.5, .85, d.y));
  c = mix(c, mix(haze * 1.12, glow * 1.2, .3 + .5 * az) * (.86 + .22 * smoothstep(.62, .92, cl / .9375)), cloud * .62);
  vec3 hill = lin(uFoliage) * 1.8;
  vec3 blue = mix(hor, lin(uSky), .28);
  vec3 mist = mix(hor, glow, .12 + .25 * az);
  vec3 rimC = glow * pow(az, 4.);
  float sa = atan(uSunDir.x, uSunDir.z);
  if (uCoast > .5) {
    c = land(c, d.y, a, 1.95, .3, .05, 2., mix(hill, mix(hor, blue, .7), clamp(.78 * uHazeK, 0., .92)), mist, rimC, sa);
    c = land(c, d.y, a, 2.2, .045, .02, 5., mix(hill, mix(hor, blue, .5), clamp(.7 * uHazeK, 0., .9)), mist, rimC, sa);
    c = land(c, d.y, a, 1.6, .06, .013, 8., mix(hill, mix(hor, blue, .5), clamp(.82 * uHazeK, 0., .94)), mist, rimC, sa);
    if (d.y < 0.) c = mix(c, seaShade(d, hor, glow, lin(uSky), az), smoothstep(0., -.004, d.y));
  } else {
    c = hills(c, d.y, a, 1.3, 9., .05, .15, mix(hill, mix(blue, lin(uSky), .25), clamp(.8 * uHazeK, 0., .95)), mist, rimC, sa, 1.);
    c = hills(c, d.y, a, 2.1, 4., .03, .1, mix(hill, mix(hor, blue, .7), clamp(.62 * uHazeK, 0., .9)), mist, rimC, sa, .8);
    c = hills(c, d.y, a, 3.4, 1., .015, .065, mix(hill * 1.15, mix(hor, blue, .4), clamp(.42 * uHazeK, 0., .85)), mist, rimC, sa, .6);
    c = mix(c, mix(hor, mix(lin(uLawn) * .5, haze * .6, .4), .5), smoothstep(-.005, -.08, d.y));
  }
  gl_FragColor = vec4(c, 1.);
}`;

const SCREEN_VERTEX = `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`;

const BLUR_FRAGMENT = `
uniform sampler2D uSrc;
uniform vec2 uDir;
uniform float uThresh;
varying vec2 vUv;
vec3 tap(vec2 o){ vec3 c = texture2D(uSrc, vUv + o).rgb; return c * smoothstep(uThresh, uThresh + .4, dot(c, vec3(.3, .59, .11))); }
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
uniform vec3 uHaze, uGlow, uFoliage;
uniform float uBloomK, uFade, uAspect, uTime, uExposure, uFrame, uSat;
uniform vec3 uLift, uWarm, uCool;
varying vec2 vUv;
float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3. - 2. * f); return mix(mix(hash(i), hash(i + vec2(1., 0.)), u.x), mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), u.x), u.y); }
float fbm(vec2 p){ float s = 0., a = .5; for (int i = 0; i < 3; i++) { s += a * noise(p); p = mat2(1.6, 1.2, -1.2, 1.6) * p + 3.1; a *= .5; } return s / .875; }
vec3 aces(vec3 x){ return clamp((x * (2.51 * x + .03)) / (x * (2.43 * x + .59) + .14), 0., 1.); }
void main(){
  vec3 c = texture2D(uMain, vUv).rgb;
  c += texture2D(uBloom, vUv).rgb * .35 * uBloomK;
  vec2 p = vec2(vUv.x * uAspect, vUv.y);
  float t = uTime;
  vec2 sway = vec2(sin(t * .31) + sin(t * .53 + 1.), cos(t * .27)) * .025;
  float ex = (1. - vUv.x) * uAspect;
  float et = 1. - vUv.y;
  float edge = min(ex, ex * .55 + et * .7);
  float n = fbm(p * 1.8 + sway + 4.);
  float n2 = fbm(p * 4.5 + sway * 2. + 9.);
  float m = smoothstep(.36, .1, edge + (n - .5) * .5 + (n2 - .5) * .22) * uFrame;
  float gap = smoothstep(.56, .78, fbm(p * 9. + sway * 3. + 2.)) * (1. - smoothstep(.75, 1., m));
  vec3 leaf = pow(uFoliage, vec3(2.2)) * (.5 + .8 * n2);
  leaf += pow(uGlow, vec3(2.2)) * .35 * smoothstep(.5, .9, n2) * m * (1. - m) * 4.;
  c = mix(c, leaf, m * (1. - gap * .85) * .97);
  c = aces(c * uExposure);
  c = pow(c, vec3(1. / 2.2));
  float l = dot(c, vec3(.299, .587, .114));
  c += uWarm * smoothstep(.35, 1., l) + uCool * smoothstep(.6, 0., l);
  c = mix(vec3(l), c, uSat);
  c = mix(c, c * c * (3. - 2. * c), .1);
  c = uLift + c * (1. - uLift);
  c *= 1. - .2 * pow(length((vUv - .5) * vec2(1.1, 1.)) * 1.3, 2.4);
  c = mix(c, uHaze, uFade);
  c += (hash(gl_FragCoord.xy + fract(t * 7.3) * 113.) - .5) * .015;
  gl_FragColor = vec4(c, 1.);
}`;

const ease = (x: number) => {
  const c = THREE.MathUtils.clamp(x, 0, 1);
  return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
};

const villa: EnvModule = {
  id: "villa",
  title: "Villa",
  palette: {
    uSky: { cssVar: "--villa-sky", label: "Sky", fallback: LIGHT_PRESETS.golden.colors.sky },
    uHaze: { cssVar: "--villa-haze", label: "Haze", fallback: LIGHT_PRESETS.golden.colors.haze },
    uGlow: { cssVar: "--villa-sun", label: "Sun", fallback: LIGHT_PRESETS.golden.colors.sun },
    uPlaster: { cssVar: "--villa-plaster", label: "Plaster", fallback: "#f2f0eb" },
    uStone: { cssVar: "--villa-stone", label: "Stone", fallback: "#b29d82" },
    uWood: { cssVar: "--villa-wood", label: "Wood", fallback: "#8b5a39" },
    uFrame: { cssVar: "--villa-frame", label: "Frames", fallback: "#2b2c2e" },
    uGlass: { cssVar: "--villa-glass", label: "Glass", fallback: "#2a3236" },
    uLawn: { cssVar: "--villa-lawn", label: "Lawn", fallback: "#7aa24a" },
    uPaving: { cssVar: "--villa-paving", label: "Paving", fallback: "#dccbb0" },
    uFoliage: { cssVar: "--villa-foliage", label: "Foliage", fallback: "#22401f" },
  },
  params: [
    lightParam,
    { key: "sun", label: "Sun angle", min: -3.14, max: 3.14, step: 0.01, value: LIGHT_PRESETS.golden.sun },
    { key: "sunHeight", label: "Sun height", min: 0.04, max: 0.9, step: 0.01, value: LIGHT_PRESETS.golden.sunHeight },
    { key: "glass", label: "Glass ratio", min: 0.3, max: 0.95, step: 0.01, value: 0.72 },
    { key: "overhang", label: "Overhang", min: 0.6, max: 2.6, step: 0.05, value: 1.3 },
    { key: "floors", label: "Floors", min: 1, max: 2, step: 1, value: 2 },
    { key: "stone", label: "Stone wall", min: 0, max: 1, step: 1, value: 1 },
    { key: "cladding", label: "Wood cladding", min: 0, max: 1, step: 1, value: 1 },
    { key: "balcony", label: "Glass balconies", min: 0, max: 1, step: 1, value: 1 },
    { key: "leaves", label: "Leaf shadows", min: 0, max: 1, step: 0.05, value: 0.8 },
    { key: "frame", label: "Foliage frame", min: 0, max: 1, step: 0.05, value: 0 },
    { key: "coastal", label: "Coastal sea", min: 0, max: 1, step: 1, value: 0 },
    { key: "paved", label: "Long front drive", min: 0, max: 1, step: 1, value: 0 },
    { key: "flightLength", label: "Intro flight length", min: 1, max: 8, step: 0.1, value: 2.8 },
    { key: "flightOrbit", label: "Intro flight orbit", min: -1.5, max: 1.5, step: 0.01, value: 0 },
    { key: "flightRise", label: "Intro flight rise", min: 0, max: 1, step: 0.01, value: 0 },
    { key: "flightDolly", label: "Intro flight dolly", min: 0, max: 3, step: 0.05, value: 1 },
    { key: "haze", label: "Haze", min: 0, max: 3, step: 0.05, value: 1 },
    { key: "bloom", label: "Bloom", min: 0, max: 2, step: 0.05, value: 1 },
    { key: "exposure", label: "Exposure", min: 0.5, max: 2, step: 0.05, value: 1 },
    { key: "glide", label: "Camera glide", min: 0, max: 2, step: 0.05, value: 1 },
  ],
  fov: [38, 58],
  travelPerScreen: 0,
  creep: 0,
  hover: { liquid: 0, turn: 0 },
  resolution: 1,
  antialias: false,
  variants: {
    ...lightVariants({ sky: "--villa-sky", haze: "--villa-haze", sun: "--villa-sun" }),
    coastal: { params: { coastal: 1 } },
  },
  setup({ scene, camera, small, colors, pointer, renderer }) {
    camera.near = 0.2;
    camera.far = 900;
    camera.updateProjectionMatrix();
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.shadowMap.autoUpdate = false;

    const disposables: { dispose: () => void }[] = [];
    const keep = <T extends { dispose: () => void }>(d: T) => (disposables.push(d), d);
    const world = new THREE.Scene();
    const fog = new THREE.FogExp2(0xffffff, 0.004);
    world.fog = fog;
    const sunDir = new THREE.Vector3(0, 1, 0);
    const shared = {
      uTime: { value: 0 },
      uLeaves: { value: 0 },
      uLeafC: { value: new THREE.Vector2() },
      uLeafC2: { value: new THREE.Vector2() },
      uLeafT1: { value: new THREE.Vector3(1, 0, 0) },
      uLeafT2: { value: new THREE.Vector3(0, 1, 0) },
      uBoxC: { value: Array.from({ length: NB }, () => new THREE.Vector4()) },
      uBoxH: { value: Array.from({ length: NB }, () => new THREE.Vector3()) },
      uBoxN: { value: 0 },
      uSunDir: { value: sunDir },
      uSunCol: { value: new THREE.Color() },
      uMist: { value: 0 },
      uFogK: { value: 1 },
      uWin: { value: 0 },
    };

    const lightsChunk = THREE.ShaderChunk.lights_fragment_begin.replace(DIR_LINE, `directLight.color *= villaLeaf;\n\t\t${DIR_LINE}`);
    const patch = <M extends THREE.MeshStandardMaterial>(m: M) => {
      m.onBeforeCompile = (s) => {
        Object.assign(s.uniforms, shared);
        s.vertexShader = "varying vec3 vVillaW, vVillaN;\n" + s.vertexShader.replace("#include <project_vertex>", "#include <project_vertex>\nvec4 vW = vec4(transformed, 1.);\n#ifdef USE_INSTANCING\nvW = instanceMatrix * vW;\n#endif\nvVillaW = (modelMatrix * vW).xyz;\nvVillaN = normalize(mat3(modelMatrix) * objectNormal);");
        s.fragmentShader = PARS + s.fragmentShader.replace("#include <aomap_fragment>", AO_CHUNK).replace("#include <emissivemap_fragment>", WIN_CHUNK).replace("#include <lights_fragment_begin>", `float villaLeaf = leafMask(vVillaW);\n${lightsChunk}`).replace("#include <fog_fragment>", FOG_CHUNK);
      };
      m.customProgramCacheKey = () => "villa";
      return keep(m);
    };
    const maps = (t: ReturnType<typeof bake>) => {
      keep(t.map);
      keep(t.normalMap);
      keep(t.roughnessMap);
      return t;
    };
    const mats: Record<Kind, THREE.MeshStandardMaterial> = {
      plaster: patch(new THREE.MeshStandardMaterial({ ...maps(bake(256, 0.5, plasterTexel)), roughness: 1, normalScale: new THREE.Vector2(0.5, 0.5) })),
      stone: patch(new THREE.MeshStandardMaterial({ ...maps(bake(512, 3.2, stoneTexel)), roughness: 1, normalScale: new THREE.Vector2(1.3, 1.3) })),
      wood: patch(new THREE.MeshStandardMaterial({ ...maps(bake(512, 2.5, woodTexel)), roughness: 1 })),
      paving: patch(new THREE.MeshStandardMaterial({ ...maps(bake(512, 2, pavingTexel)), roughness: 1 })),
      frame: patch(new THREE.MeshStandardMaterial({ metalness: 0.55, roughness: 0.36 })),
      glass: patch(new THREE.MeshPhysicalMaterial({ roughness: 0.04, metalness: 0, ior: 1.5, specularIntensity: 1, specularColor: new THREE.Color(2.6, 2.6, 2.6), envMapIntensity: 1.6 })),
      rail: patch(new THREE.MeshPhysicalMaterial({ transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide, roughness: 0.04, ior: 1.5, envMapIntensity: 1.1 })),
    };
    const terraceMat = patch(new THREE.MeshStandardMaterial({ ...maps(bake(512, 1.6, travertineTexel)), roughness: 1, normalScale: new THREE.Vector2(0.5, 0.5) }));
    const terrace = new THREE.Mesh(keep(project(new THREE.PlaneGeometry(32, 26).rotateX(-Math.PI / 2).translate(-2, 0, 1), 4.8)), terraceMat);
    terrace.receiveShadow = true;
    const drive = new THREE.Mesh(keep(project(new THREE.PlaneGeometry(40, 26.6).rotateX(-Math.PI / 2).translate(-2, 0.008, 27.3), 4.8)), terraceMat);
    drive.receiveShadow = true;
    drive.visible = false;
    const lawnMat = patch(new THREE.MeshStandardMaterial({ ...maps(bake(256, 2, lawnTexel)), roughness: 1 }));
    const lawn = new THREE.Mesh(keep(project(new THREE.PlaneGeometry(1000, 800).rotateX(-Math.PI / 2).translate(0, -0.02, -260), 3)), lawnMat);
    lawn.receiveShadow = true;
    const kerb = new THREE.Mesh(
      keep(
        mergeGeometries(
          [
            [-18.3, 14.3, -12.3, -12],
            [-18.3, 14.3, 14, 14.3],
            [-18.3, -18, -12, 14],
            [14, 14.3, -12, 14],
          ].map(([x0, x1, z0, z1]) => project(new RoundedBoxGeometry(x1 - x0, 0.16, z1 - z0, 2, 0.04).translate((x0 + x1) / 2, 0.05, (z0 + z1) / 2), TILE.paving)),
        )!,
      ),
      terraceMat,
    );
    kerb.receiveShadow = kerb.castShadow = true;
    const hedges = hedger();
    for (const [x0, x1, z0, z1] of [
      [-50, 30, -32, -30.6],
      [-50, 30, 40.6, 42],
      [-50, -48.6, -30.6, 40.6],
      [34.6, 36, -30.6, 40.6],
    ])
      hedges.box(x0, x1, -0.1, 1.4, z0, z1);
    const hedge = new THREE.Group();
    const garden = { bark: [] as THREE.BufferGeometry[], olive: [] as THREE.BufferGeometry[], green: [] as THREE.BufferGeometry[] };
    let gs = 7;
    const grnd = () => (gs = (gs * 16807) % 2147483647) / 2147483647;
    const back = { bark: [] as THREE.BufferGeometry[], olive: [] as THREE.BufferGeometry[], green: [] as THREE.BufferGeometry[] };
    const edge = (x: number, z: number) => z < -14 || x > 24;
    let bag = garden;
    let leafSet: "olive" | "green" = "olive";
    const grow = grower((k, g) => (k === "bark" ? bag.bark : bag[leafSet]).push(g), grnd);
    for (const [x, z, h] of [[-23, -5, 5.6], [-24, 9, 5], [-31, 1, 6], [17, -4, 5.4], [19, 7, 5], [26, -16, 6.2], [-14, -19, 5.8], [3, 19, 4.6]]) {
      bag = edge(x, z) ? back : garden;
      grow.olive(x, z, h);
    }
    leafSet = "green";
    bag = back;
    for (let x = -13; x < 15; x += 5.4) grow.tree(x + (grnd() - 0.5), 0, -14 - grnd(), 9 + grnd() * 2.5, 70, 0.17);
    for (const [x, z] of [[-42, -22], [-38, 30], [28, -24], [30, 24], [-20, 34]]) {
      bag = edge(x, z) ? back : garden;
      grow.tree(x, 0, z, 10 + grnd() * 2.5, 70, 0.17);
    }
    bag = garden;
    for (let z = -11; z < 13; z += 1.9) {
      const r = 0.75 + grnd() * 0.35;
      grow.bush(-18.42 - r, 0, z, r);
    }
    for (let z = -10; z < 3; z += 1.6) {
      const r = 0.6 + grnd() * 0.3;
      grow.bush(13.88 - r, 0, z, r);
    }
    for (let x = -12; x < 14; x += 1.9) {
      const r = 0.8 + grnd() * 0.3;
      grow.bush(x, 0, -12.42 - r, r);
    }
    const oliveMat = sway(patch(new THREE.MeshStandardMaterial({ map: keep(leafTexture({ hue: 68, spread: 30, sat: 12, light: 14, seed: 9 })), alphaTest: 0.4, alphaToCoverage: true, roughness: 0.75, color: 0xd6dcc4 })), true);
    const greenMat = sway(patch(new THREE.MeshStandardMaterial({ map: keep(leafTexture({ hue: 84, spread: 30, sat: 34, light: 8, seed: 3 })), alphaTest: 0.4, alphaToCoverage: true, roughness: 0.8, color: 0xd2e0c0 })), true);
    const barkMat = patch(new THREE.MeshStandardMaterial({ map: keep(barkTexture(0x5a4c3e)), roughness: 0.9 }));
    for (const m of hedges.meshes(greenMat)) {
      keep(m.geometry);
      hedge.add(keep(m));
    }
    const seaward: THREE.Object3D[] = [];
    for (const [set, bucket] of [[garden, null], [back, seaward]] as const) {
      for (const [geos, mat] of [[set.bark, barkMat], [set.olive, oliveMat], [set.green, greenMat]] as const) {
        if (!geos.length) continue;
        const merged = mergeGeometries(geos);
        for (const g of geos) g.dispose();
        const m = new THREE.Mesh(keep(merged!), mat);
        m.castShadow = m.receiveShadow = true;
        world.add(m);
        bucket?.push(m);
      }
    }
    const protos = [
      { mat: oliveMat, kind: "tree" as const, n: 16 },
      { mat: oliveMat, kind: "tree" as const, n: 22 },
      { mat: greenMat, kind: "tree" as const, n: 28 },
    ].map(({ mat, n }, i) => {
      const part = { bark: [] as THREE.BufferGeometry[], leaves: [] as THREE.BufferGeometry[] };
      grower((k, geo) => part[k].push(geo), grnd).tree(0, 0, 0, 10, n, 0.3 + 0.04 * i);
      const out = { bark: mergeGeometries(part.bark)!, leaves: mergeGeometries(part.leaves)! };
      for (const geo of [...part.bark, ...part.leaves]) geo.dispose();
      return { ...out, mat, mats: [] as THREE.Matrix4[], tints: [] as THREE.Color[] };
    });
    const q = new THREE.Quaternion();
    const yAxis = new THREE.Vector3(0, 1, 0);
    for (const [r0, gap, h0, h1] of [[66, 5.5, 7, 11], [96, 7, 8, 13], [132, 9, 9, 15]]) {
      for (const lane of [0, 1]) {
        for (let a = -2.3; a < 0.75; a += gap / r0) {
          const ang = a + (grnd() - 0.5) * (gap / r0) * 0.8;
          const r = r0 + lane * 8 + (grnd() - 0.5) * 7;
          const x = 0.5 + Math.cos(ang) * r, z = -3 + Math.sin(ang) * r;
          if (x > -54 && x < 40 && z > -36 && z < 46) continue;
          if (grnd() < 0.12) continue;
          const cyp = grnd() < 0.22;
          const p = cyp ? protos[2] : protos[Math.floor(grnd() * 2)];
          const s = (h0 + (h1 - h0) * grnd()) / 10, wd = 0.9 + grnd() * 0.5;
          p.mats.push(new THREE.Matrix4().compose(new THREE.Vector3(x, -s * 1.8, z), q.setFromAxisAngle(yAxis, grnd() * Math.PI * 2), new THREE.Vector3(s * wd, s, s * wd)));
          p.tints.push(new THREE.Color().setRGB(0.85 + grnd() * 0.3, 0.88 + grnd() * 0.24, 0.8 + grnd() * 0.25));
        }
      }
    }
    for (const p of protos) {
      for (const [geo, mat] of [[p.bark, barkMat], [p.leaves, p.mat]] as const) {
        const im = new THREE.InstancedMesh(keep(geo), mat, p.mats.length);
        p.mats.forEach((m, i) => im.setMatrixAt(i, m));
        p.tints.forEach((c, i) => im.setColorAt(i, c));
        im.computeBoundingSphere();
        world.add(im);
        seaward.push(im);
      }
    }
    const coastLawn = new THREE.Mesh(
      keep(
        mergeGeometries(
          [
            [-19.5, 22, -12.8, 70],
            [-70, -19.5, -6, 70],
          ].map(([x0, x1, z0, z1]) => project(new THREE.PlaneGeometry(x1 - x0, z1 - z0).rotateX(-Math.PI / 2).translate((x0 + x1) / 2, -0.02, (z0 + z1) / 2), 3)),
        )!,
      ),
      lawnMat,
    );
    coastLawn.receiveShadow = true;
    const coastWall = new THREE.Mesh(
      keep(
        mergeGeometries(
          [
            [-19.5, 22.4, -13.2, -12.8],
            [22, 22.4, -12.8, 70],
            [-70.2, -19.5, -6.2, -5.8],
            [-19.7, -19.3, -13, -6],
          ].map(([x0, x1, z0, z1]) => project(new RoundedBoxGeometry(x1 - x0, 0.3, z1 - z0, 2, 0.05).translate((x0 + x1) / 2, 0.1, (z0 + z1) / 2), TILE.stone)),
        )!,
      ),
      mats.stone,
    );
    coastWall.receiveShadow = coastWall.castShadow = true;
    world.add(lawn, drive, kerb, coastLawn, coastWall);
    const rim = [
      [-15.4, -2.6, 3.8, 4.2],
      [-15.4, -2.6, 9.2, 9.6],
      [-15.4, -15, 4.2, 9.2],
      [-3, -2.6, 4.2, 9.2],
    ].map(([x0, x1, z0, z1]) => project(new THREE.BoxGeometry(x1 - x0, 0.09, z1 - z0).translate((x0 + x1) / 2, 0.015, (z0 + z1) / 2), TILE.paving));
    const pool = new THREE.Mesh(keep(mergeGeometries(rim)!), mats.paving);
    pool.receiveShadow = pool.castShadow = true;
    const water = new Reflector(keep(new THREE.PlaneGeometry(12, 5)), { color: 0xb8ccd0, textureWidth: small ? 512 : 1024, textureHeight: small ? 512 : 640, multisample: small ? 0 : 2, shader: rippleShader() });
    keep(water);
    const reflect = water.onBeforeRender;
    let odd = false;
    water.onBeforeRender = (...a: Parameters<typeof reflect>) => {
      odd = !odd;
      if (odd) reflect.apply(water, a);
    };
    const ripple = (water.material as THREE.ShaderMaterial).uniforms.uTime;
    water.rotation.x = -Math.PI / 2;
    water.position.set(-9, 0.03, 6.7);
    world.add(terrace, hedge, pool, water);

    const skyUniforms = { ...colors, uSunDir: { value: sunDir }, uHazeK: { value: 1 }, uTime: shared.uTime, uCoast: { value: 0 }, uCam: { value: camera.position } };
    const skyMat = keep(new THREE.ShaderMaterial({ vertexShader: SKY_VERTEX, fragmentShader: SKY_FRAGMENT, uniforms: skyUniforms, side: THREE.BackSide, depthWrite: false }));
    const sky = new THREE.Mesh(keep(new THREE.SphereGeometry(400, 48, 24)), skyMat);
    sky.renderOrder = -1;
    sky.frustumCulled = false;
    world.add(sky);
    const envScene = new THREE.Scene();
    envScene.add(new THREE.Mesh(keep(new THREE.SphereGeometry(100, 48, 24)), skyMat));
    const pmrem = keep(new THREE.PMREMGenerator(renderer));
    let envRT: THREE.WebGLRenderTarget | null = null;

    const sunLight = new THREE.DirectionalLight(0xffffff, 3.4);
    sunLight.castShadow = true;
    const sh = sunLight.shadow;
    sh.mapSize.set(small ? 1024 : 2048, small ? 1024 : 2048);
    Object.assign(sh.camera, { left: -40, right: 40, top: 32, bottom: -32, near: 20, far: 220 });
    sh.camera.updateProjectionMatrix();
    sh.bias = -0.0004;
    sh.normalBias = 0.025;
    sh.radius = 4;
    sunLight.target.position.set(-2, 2, -1);
    world.add(sunLight, sunLight.target);
    const hemi = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.5);
    const bounce = new THREE.DirectionalLight(0xffffff, 0);
    bounce.target = sunLight.target;
    world.add(hemi, bounce);

    let meshes: THREE.Mesh[] = [];
    const rebuild = (p: Record<string, number>) => {
      for (const m of meshes) {
        world.remove(m);
        m.geometry.dispose();
      }
      meshes = [];
      const { parts, occ } = layout(p);
      for (const kind of KINDS) {
        const geos = parts[kind];
        if (!geos.length) continue;
        if (kind !== "glass") for (const g of geos) project(g, TILE[kind]);
        const merged = mergeGeometries(geos);
        for (const g of geos) g.dispose();
        if (!merged) continue;
        const m = new THREE.Mesh(merged, mats[kind]);
        m.castShadow = kind !== "rail";
        m.receiveShadow = true;
        if (kind === "rail") m.renderOrder = 2;
        world.add(m);
        meshes.push(m);
      }
      const n = Math.min(NB, occ.length / 7);
      for (let i = 0; i < n; i++) {
        shared.uBoxC.value[i].set(occ[i * 7], occ[i * 7 + 1], occ[i * 7 + 2], occ[i * 7 + 3]);
        shared.uBoxH.value[i].set(occ[i * 7 + 4], occ[i * 7 + 5], occ[i * 7 + 6]);
      }
      shared.uBoxN.value = n;
    };

    const rtOpts = { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter };
    const mainRT = keep(new THREE.WebGLRenderTarget(2, 2, { ...rtOpts, depthBuffer: true, samples: 2 }));
    const bloomA = keep(new THREE.WebGLRenderTarget(2, 2, rtOpts));
    const bloomB = keep(new THREE.WebGLRenderTarget(2, 2, rtOpts));
    const quadGeo = keep(new THREE.PlaneGeometry(2, 2));
    const flat = (fragmentShader: string, uniforms: Record<string, THREE.IUniform>) => keep(new THREE.ShaderMaterial({ vertexShader: SCREEN_VERTEX, fragmentShader, uniforms, depthTest: false, depthWrite: false }));
    const screen = (material: THREE.ShaderMaterial) => {
      const mesh = new THREE.Mesh(quadGeo, material);
      mesh.frustumCulled = false;
      return mesh;
    };
    const blur = (src: THREE.Texture, thresh: number) => {
      const material = flat(BLUR_FRAGMENT, { uSrc: { value: src }, uDir: { value: new THREE.Vector2() }, uThresh: { value: thresh } });
      const s = new THREE.Scene();
      s.add(screen(material));
      return { s, dir: material.uniforms.uDir.value as THREE.Vector2 };
    };
    const blurH = blur(mainRT.texture, 0.9);
    const blurV = blur(bloomA.texture, -1);
    const finalMat = flat(FINAL_FRAGMENT, { uMain: { value: mainRT.texture }, uBloom: { value: bloomB.texture }, uHaze: colors.uHaze, uGlow: colors.uGlow, uFoliage: colors.uFoliage, uBloomK: { value: 1 }, uFade: { value: 0 }, uAspect: { value: 1 }, uTime: { value: 0 }, uExposure: { value: 1 }, uFrame: { value: 1 }, uSat: { value: 1 }, uLift: { value: new THREE.Vector3() }, uWarm: { value: new THREE.Vector3() }, uCool: { value: new THREE.Vector3() } });
    scene.add(screen(finalMat));

    const tint: [THREE.Material & { color: THREE.Color }, string][] = [
      [mats.plaster, "uPlaster"],
      [mats.stone, "uStone"],
      [mats.wood, "uWood"],
      [mats.paving, "uPaving"],
      [mats.frame, "uFrame"],
      [mats.glass, "uGlass"],
      [mats.rail, "uGlass"],
      [terraceMat, "uPaving"],
      [lawnMat, "uLawn"],
    ];
    const lin = (k: string, c: THREE.Color) => {
      const v = colors[k].value;
      return c.setRGB(v.x, v.y, v.z, THREE.SRGBColorSpace);
    };
    const up = new THREE.Vector3(0, 1, 0);
    const leafAt = new THREE.Vector3(-3.5, 2.2, 1.5);
    const leafAt2 = new THREE.Vector3(-7, 0, 11);
    const size = new THREE.Vector2();
    const rigFor = (y: number, pitch = 0) =>
      cameraRig(camera, pointer, {
        pitch,
        base: small ? new THREE.Vector3(-9, y + 0.1, 24) : new THREE.Vector3(-18, y, 17),
        focus: small ? new THREE.Vector3(1.5, 3.4, -2) : new THREE.Vector3(0.5, 3.4, -2.5),
        yaw: small ? 0 : 0.14,
      });
    const rig = rigFor(1.3);
    const coastRig = rigFor(2.8, -0.07);
    let structKey = "";
    let envKey = "";
    let shadowKey = "";

    return {
      update(frame) {
        const { time, intro, params } = frame;
        const sk = ["floors", "glass", "overhang", "stone", "cladding", "balcony"].map((k) => params[k]).join();
        if (sk !== structKey) {
          structKey = sk;
          rebuild(params);
          shadowKey = "";
        }
        const el = params.sunHeight;
        sunDir.set(-Math.sin(params.sun) * Math.cos(el), Math.sin(el), Math.cos(params.sun) * Math.cos(el));
        const lp = lightPreset(params.light);
        sunLight.position.copy(sunLight.target.position).addScaledVector(sunDir, 100);
        bounce.position.set(-sunDir.x, 0.35, -sunDir.z).multiplyScalar(50).add(sunLight.target.position);
        sh.radius = lp.softness;
        shared.uLeafT1.value.crossVectors(sunDir, up).normalize();
        shared.uLeafT2.value.crossVectors(shared.uLeafT1.value, sunDir);
        shared.uLeafC.value.set(leafAt.dot(shared.uLeafT1.value), leafAt.dot(shared.uLeafT2.value));
        shared.uLeafC2.value.set(leafAt2.dot(shared.uLeafT1.value), leafAt2.dot(shared.uLeafT2.value));
        shared.uLeaves.value = params.leaves;
        shared.uTime.value = time;
        skyUniforms.uHazeK.value = params.haze;
        const coast = params.coastal > 0.5;
        skyUniforms.uCoast.value = coast ? 1 : 0;
        lawn.visible = hedge.visible = !coast;
        drive.visible = params.paved > 0.5 && !coast;
        kerb.visible = !drive.visible;
        coastLawn.visible = coastWall.visible = coast;
        for (const o of seaward) o.visible = !coast;

        for (const [m, k] of tint) lin(k, m.color);
        lin("uGlow", sunLight.color);
        shared.uSunCol.value.copy(sunLight.color);
        sunLight.intensity = 7.4 * lp.sunK * THREE.MathUtils.smoothstep(el, -0.02, 0.12) * (1 + 0.03 * Math.sin(time * 0.4) + 0.015 * Math.sin(time * 1.1));
        world.environmentIntensity = lp.fill;
        lin("uSky", hemi.color);
        lin("uLawn", hemi.groundColor).lerp(sunLight.color, 0.2).multiplyScalar(0.8);
        hemi.intensity = lp.bounce;
        bounce.color.copy(hemi.groundColor).lerp(sunLight.color, 0.5);
        bounce.intensity = sunLight.intensity * 0.06 * lp.bounce;
        ripple.value = time;
        mats.glass.color.multiplyScalar(0.18);
        mats.glass.emissive.setRGB(1, 0.58, 0.26).multiplyScalar(1.5);
        shared.uWin.value = lp.windows;
        terraceMat.color.multiplyScalar(1.25);
        lawnMat.color.multiplyScalar(1.15);
        lin("uHaze", fog.color);
        const k = ease(intro / 2.8);
        fog.density = 0.0032 * params.haze * lp.fog + (1 - k) * 0.03;
        shared.uFogK.value = params.haze * lp.fog;
        shared.uMist.value = lp.mist;

        const ek = [params.coastal, params.sun, el, params.haze, ...["uSky", "uHaze", "uGlow", "uFoliage", "uLawn"].map((c) => colors[c].value.toArray().join())].join();
        const target = renderer.getRenderTarget();
        if (ek !== envKey) {
          envKey = ek;
          const next = pmrem.fromScene(envScene, 0, 0.5, 500);
          envRT?.dispose();
          envRT = next;
          world.environment = next.texture;
          mats.glass.envMap = mats.rail.envMap = next.texture;
        }
        const shk = `${structKey}|${params.sun}|${el}|${params.coastal}`;
        if (shk !== shadowKey) {
          shadowKey = shk;
          renderer.shadowMap.needsUpdate = true;
        }

        (coast ? coastRig : rig)(frame, params.glide);
        sky.position.copy(camera.position);

        renderer.getDrawingBufferSize(size);
        const w = Math.max(2, size.x), h = Math.max(2, size.y);
        if (mainRT.width !== w || mainRT.height !== h) {
          mainRT.setSize(w, h);
          const bw = Math.max(2, Math.round(w / 4));
          const bh = Math.max(2, Math.round(h / 4));
          bloomA.setSize(bw, bh);
          bloomB.setSize(bw, bh);
          blurH.dir.set(1.5 / bw, 0);
          blurV.dir.set(0, 1.5 / bh);
        }
        renderer.setRenderTarget(mainRT);
        renderer.clear(true, true, false);
        renderer.render(world, camera);
        renderer.setRenderTarget(bloomA);
        renderer.render(blurH.s, camera);
        renderer.setRenderTarget(bloomB);
        renderer.render(blurV.s, camera);
        renderer.setRenderTarget(target);

        const fu = finalMat.uniforms;
        fu.uAspect.value = camera.aspect;
        fu.uTime.value = time;
        fu.uBloomK.value = params.bloom;
        fu.uExposure.value = params.exposure * lp.exposure;
        fu.uSat.value = lp.sat;
        fu.uLift.value.fromArray(lp.lift);
        fu.uWarm.value.fromArray(lp.warm);
        fu.uCool.value.fromArray(lp.cool);
        fu.uFrame.value = params.frame;
        fu.uFade.value = 1 - THREE.MathUtils.smoothstep(intro, 0.05, 1.1);
      },
      dispose() {
        for (const m of meshes) m.geometry.dispose();
        envRT?.dispose();
        for (const d of disposables) d.dispose();
        renderer.shadowMap.enabled = false;
      },
    };
  },
};

export default villa;

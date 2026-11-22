import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { EnvModule } from "@/components/kit/env/EnvStage";
import { cameraRig } from "@/components/kit/env/cameraRig";
import { barkTexture, grower, hedger, leafTexture, sway } from "@/components/kit/env/trees";
import { LIGHT_PRESETS, lightParam, lightPreset, lightVariants } from "@/components/kit/env/lightPresets";

const NB = 40;
const KINDS = ["stone", "plaster", "brick", "trim", "frame", "glass", "rail", "interior", "lamp", "hedge", "bark", "leaves"] as const;
type Kind = (typeof KINDS)[number];
const TILE: Record<Kind, number> = { stone: 3.6, plaster: 3, brick: 2.4, trim: 3, frame: 1, glass: 1, rail: 1, interior: 3, lamp: 1, hedge: 3, bark: 1, leaves: 1 };
const RAW = new Set<Kind>(["glass", "rail", "bark", "leaves"]);
const W = 36;
const D = 22;
const BD = 1.9;
const GF = 4.4;
const FH = 3.2;
const E0 = 15.6;
const E1 = 20.4;

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

const texture = (data: Uint8Array, size: number, srgb: boolean) => {
  const t = new THREE.DataTexture(data, size, size);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
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

const limestoneTexel = (u: number, v: number): Texel => {
  const rows = 6, cols = 3;
  const y = v * rows;
  const row = Math.floor(y);
  const x = u * cols;
  const col = wrap(Math.floor(x), cols);
  const fx = x - Math.floor(x), fy = y - row;
  const joint = sm(0, 0.008, Math.min(fx, 1 - fx) * 1.6) * sm(0, 0.008, Math.min(fy, 1 - fy) * 0.8);
  const k = hashi(col, wrap(row, rows), 71);
  const vein = fbm(u, v, 3, 40, 72, 4);
  const cloud = fbm(u, v, 12, 12, 73, 3);
  const pit = sm(0.76, 0.82, fbm(u, v, 160, 160, 74, 2));
  const tone = (0.93 + 0.07 * k) * (0.95 + 0.07 * vein) * (0.96 + 0.06 * cloud) * (1 - 0.06 * pit) * mix(0.78, 1, joint);
  return { c: [tone, tone * 0.99, tone * 0.97], h: joint * 0.5 + vein * 0.03 - pit * 0.05, r: 0.62 + 0.16 * cloud + 0.1 * pit };
};

const plasterTexel = (u: number, v: number): Texel => {
  const a = fbm(u, v, 48, 48, 31, 4);
  const b = fbm(u, v, 6, 6, 33, 4);
  const t = 0.95 + (b - 0.5) * 0.08 + (a - 0.5) * 0.04;
  return { c: [t, t, t], h: a * 0.7 + b * 0.3, r: 0.8 + 0.1 * a };
};

const brickTexel = (u: number, v: number): Texel => {
  const rows = 30, cols = 10;
  const y = v * rows;
  const row = Math.floor(y);
  const x = u * cols + (row % 2) * 0.5;
  const col = wrap(Math.floor(x), cols);
  const fx = x - Math.floor(x), fy = y - row;
  const grain = fbm(u, v, 48, 48, 61, 3);
  const joint = sm(0.015, 0.045, Math.min(fx, 1 - fx)) * sm(0.05, 0.14, Math.min(fy, 1 - fy) + (grain - 0.5) * 0.04);
  const k = hashi(col, wrap(row, rows), 62), k2 = hashi(col, wrap(row, rows), 63);
  const tone = (0.5 + 0.22 * k) * (0.86 + 0.25 * grain);
  const brick: [number, number, number] = [tone * mix(1.02, 0.9, k2), tone * mix(0.86, 0.95, k2), tone * mix(0.8, 0.95, k2)];
  const m = 0.88 + 0.1 * grain;
  return { c: [mix(m, brick[0], joint), mix(m * 0.98, brick[1], joint), mix(m * 0.95, brick[2], joint)], h: joint * (0.7 + 0.2 * grain), r: mix(0.97, 0.82, joint) };
};

const graniteTexel = (u: number, v: number): Texel => {
  const rows = 8, cols = 4;
  const y = v * rows;
  const row = Math.floor(y);
  const x = u * cols + (row % 2) * 0.5;
  const col = wrap(Math.floor(x), cols);
  const fx = x - Math.floor(x), fy = y - row;
  const joint = sm(0, 0.012, Math.min(fx, 1 - fx)) * sm(0, 0.024, Math.min(fy, 1 - fy));
  const k = hashi(col, wrap(row, rows), 41);
  const speck = fbm(u, v, 128, 128, 42, 2);
  const dark = sm(0.66, 0.72, fbm(u, v, 200, 200, 43, 2));
  const cloud = fbm(u, v, 8, 8, 44, 3);
  const tone = (0.88 + 0.12 * k) * (0.92 + 0.14 * speck) * (1 - 0.3 * dark) * (0.95 + 0.08 * cloud) * mix(0.72, 1, joint);
  return { c: [tone, tone, tone * 1.01], h: joint * (0.8 + 0.1 * speck), r: 0.58 + 0.24 * speck + 0.1 * (1 - joint) };
};

const asphaltTexel = (u: number, v: number): Texel => {
  const agg = fbm(u, v, 180, 180, 91, 2);
  const wear = fbm(u, v, 3, 3, 92, 3);
  const stain = fbm(u, v, 10, 10, 93, 3);
  const tone = 0.36 * (0.84 + 0.32 * agg) * (0.9 + 0.2 * wear) * (1 - 0.12 * sm(0.55, 0.75, stain));
  return { c: [tone, tone, tone * 1.03], h: agg * 0.6, r: 0.84 + 0.1 * agg - 0.08 * wear };
};

const lawnTexel = (u: number, v: number): Texel => {
  const blade = fbm(u, v, 128, 128, 101, 2);
  const clump = fbm(u, v, 8, 8, 102, 4);
  const t = (0.78 + 0.3 * clump) * (0.85 + 0.3 * blade);
  return { c: [t * 0.96, t, t * 0.86], h: blade * 0.6 + clump * 0.2, r: 0.95 };
};

const hedgeTexel = (u: number, v: number): Texel => {
  const leaf = fbm(u, v, 40, 40, 81, 3);
  const clump = fbm(u, v, 6, 6, 82, 3);
  const gap = sm(0.62, 0.42, leaf);
  const t = (0.7 + 0.5 * clump) * mix(1.15, 0.35, gap);
  return { c: [t * 0.95, t, t * 0.85], h: leaf * 0.8 + clump * 0.4, r: 0.85 };
};

const cityWin = (u: number, v: number) => {
  const fx = (u * 3) % 1, fy = (v * 3) % 1;
  return sm(0.16, 0.19, fx) * sm(0.84, 0.81, fx) * sm(0.26, 0.29, fy) * sm(0.9, 0.87, fy);
};

const cityTexel = (u: number, v: number): Texel => {
  const win = cityWin(u, v);
  const n = fbm(u, v, 8, 8, 121, 3);
  const k = hashi(Math.floor(u * 3), Math.floor(v * 3), 122);
  const t = mix(0.9 + 0.1 * n, 0.14 + 0.12 * k, win);
  return { c: [t, t, t * 1.02], h: 1 - win, r: mix(0.9, 0.18, win) };
};

const cityMaskTexel = (u: number, v: number): Texel => {
  const w = cityWin(u, v);
  return { c: [w, w, w], h: 0, r: 0 };
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
  const face = (side: boolean, kind: Kind, a0: number, a1: number, y0: number, y1: number, at: number, d0: number, d1: number, r = 0) => {
    const lo = Math.min(a0, a1), hi = Math.max(a0, a1);
    box(kind, side ? [at - d1, at - d0, y0, y1, lo, hi] : [lo, hi, y0, y1, at + d0, at + d1], r, false);
  };
  const pane = (side: boolean, kind: Kind, a0: number, a1: number, y0: number, y1: number, at: number, seed: number) => {
    const g = new THREE.PlaneGeometry(Math.abs(a1 - a0), y1 - y0).rotateY((hashi(seed, 1, 3) - 0.5) * 0.03).rotateX((hashi(seed, 2, 7) - 0.5) * 0.016);
    parts[kind].push(side ? g.rotateY(-Math.PI / 2).translate(at, (y0 + y1) / 2, (a0 + a1) / 2) : g.translate((a0 + a1) / 2, (y0 + y1) / 2, at));
  };
  const band = (side: boolean, a0: number, a1: number, y0: number, y1: number, at: number, seed: number, kind: Kind = "glass") => {
    const n = Math.max(1, Math.round(Math.abs(a1 - a0) / 1.5));
    face(side, "frame", a0, a1, y0, y0 + 0.08, at, -0.02, 0.1, 0.006);
    face(side, "frame", a0, a1, y1 - 0.08, y1, at, -0.02, 0.1, 0.006);
    for (let i = 0; i <= n; i++) {
      const a = a0 + ((a1 - a0) * i) / n;
      face(side, "frame", a - 0.035, a + 0.035, y0, y1, at, -0.02, 0.08);
    }
    for (let i = 0; i < n; i++) pane(side, kind, a0 + ((a1 - a0) * i) / n, a0 + ((a1 - a0) * (i + 1)) / n, y0 + 0.08, y1 - 0.08, at + (side ? -0.03 : 0.03), seed * 31 + i);
  };
  const rail = (side: boolean, a0: number, a1: number, y: number) => {
    const lo = Math.min(a0, a1), hi = Math.max(a0, a1);
    face(side, "frame", lo, hi, y + 1.02, y + 1.09, 0, -0.06, 0.03, 0.01);
    const n = Math.max(1, Math.round((hi - lo) / 1.25));
    const w = (hi - lo) / n;
    for (let i = 0; i < n; i++) face(side, "rail", lo + w * i + 0.012, lo + w * (i + 1) - 0.012, y + 0.04, y + 1.0, 0, -0.03, -0.01);
  };

  let seed = 29;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const grow = grower((k, g) => parts[k].push(g), rnd);
  const floors = Math.round(THREE.MathUtils.clamp(p.floors, 6, 9));
  const top = GF + (floors - 1) * FH;
  const wall: Kind = p.facade < 0.5 ? "stone" : p.facade < 1.5 ? "plaster" : "brick";
  const green = p.greenery > 0.5;

  box(wall, [BD, W - 0.6, GF - 0.32, top, -D + 0.6, -BD], 0.02);
  box(wall, [BD, E0, 0, GF - 0.32, -D + 0.6, -BD], 0.02);
  box(wall, [E1, W - 0.6, 0, GF - 0.32, -D + 0.6, -BD], 0.02);
  box(wall, [E0, E1, 0, GF - 0.32, -D + 0.6, -BD - 4.2], 0.02);
  box(wall, [W - 0.6, W, 0, top, -D, 0], 0.03);
  box(wall, [0, W - 0.6, 0, top, -D, -D + 0.6], 0.03);
  box(wall, [-0.15, W + 0.15, top - 0.32, top + 0.4, -D - 0.15, 0.15], 0.03);
  for (const x of [9, 18, 27]) box(wall, [x - 0.45, x + 0.45, GF - 0.34, top, -BD, 0.04], 0.03);
  for (const z of [-7.3, -14.7]) box(wall, [-0.04, BD, GF - 0.34, top, z - 0.45, z + 0.45], 0.03);

  box("interior", [E0, E1, 0, GF - 0.32, -BD - 4.2, -BD - 4.05], 0.01, false);
  box("interior", [E0, E0 + 0.12, 0, GF - 0.32, -BD - 4.2, -BD], 0.01, false);
  box("interior", [E1 - 0.12, E1, 0, GF - 0.32, -BD - 4.2, -BD], 0.01, false);
  box("interior", [E0 + 0.12, E1 - 0.12, GF - 0.5, GF - 0.32, -BD - 4.2, -BD], 0.01, false);
  box("stone", [E0 + 1.2, E1 - 1.2, 0, 1.05, -BD - 3.3, -BD - 2.7], 0.03, false);
  for (let x = E0 + 0.8; x < E1 - 0.5; x += 1.6) box("lamp", [x - 0.12, x + 0.12, GF - 0.53, GF - 0.5, -BD - 2.2, -BD - 1.96], 0, false);
  band(false, E0 + 0.12, E1 - 0.12, 0, GF - 0.5, -BD - 0.02, 3, "rail");
  face(false, "frame", E0, E1, GF - 0.5, GF - 0.32, -BD - 0.02, 0, 0.12);

  box("trim", [E0 - 1.4, E1 + 1.4, 3.42, 3.66, -BD, 2.8], 0.04);
  for (let x = E0 - 0.6; x < E1 + 1; x += 1.6) for (const z of [-0.6, 1.4]) box("lamp", [x - 0.11, x + 0.11, 3.4, 3.42, z - 0.11, z + 0.11], 0, false);
  for (let x = 1.5; x < W - 1; x += 3) if (x < E0 - 1.6 || x > E1 + 1.6) box("lamp", [x - 0.11, x + 0.11, GF - 0.34, GF - 0.32, -1.06, -0.84], 0, false);

  band(false, BD + 0.4, E0 - 0.25, 0.5, GF - 0.6, -BD, 1);
  band(false, E1 + 0.25, W - 1, 0.5, GF - 0.6, -BD, 2);
  band(true, -BD - 0.4, -D + 1.2, 0.5, GF - 0.6, BD, 4);

  for (let k = 1; k < floors; k++) {
    const y = GF + (k - 1) * FH;
    box("trim", [0, W - 0.6, y - 0.32, y, -BD, 0], 0.02);
    box("trim", [0, BD, y - 0.32, y, -D + 0.6, -BD], 0.02);
    band(false, BD + 0.05, W - 0.65, y, y + FH - 0.32, -BD, k * 7 + 11);
    band(true, -BD - 0.05, -D + 0.65, y, y + FH - 0.32, BD, k * 7 + 13);
    for (const [a0, a1] of [[0.1, 8.55], [9.45, 17.55], [18.45, 26.55], [27.45, W - 0.7]]) rail(false, a0, a1, y);
    for (const [a0, a1] of [[-0.1, -6.85], [-7.75, -14.25], [-15.15, -D + 0.7]]) rail(true, a0, a1, y);
    if (!green) continue;
    for (let j = 0; j < 8; j++) {
      const h = hashi(j, k, 5);
      if (h > 0.45) continue;
      const xc = 2.25 + 4.5 * j + (hashi(j, k, 6) - 0.5) * 1.6;
      box("stone", [xc - 0.7, xc + 0.7, y, y + 0.5, -0.78, -0.26], 0.03, false);
      grow.bush(xc, y + 0.45, -0.52, 0.62, 0.24);
    }
    for (let j = 0; j < 5; j++) {
      const h = hashi(j, k, 8);
      if (h > 0.45) continue;
      const zc = -(2.2 + 4.4 * j) + (hashi(j, k, 9) - 0.5) * 1.2;
      box("stone", [0.26, 0.78, y, y + 0.5, zc - 0.7, zc + 0.7], 0.03, false);
      grow.bush(0.52, y + 0.45, zc, 0.24, 0.62);
    }
  }

  const ry = top + 0.4;
  rail(false, 0.1, W - 0.7, ry);
  rail(true, -0.1, -D + 0.7, ry);
  box(wall, [5, W - 4, ry, ry + 3, -D + 2, -BD - 1.6], 0.03);
  band(false, 6, W - 6, ry, ry + 2.7, -BD - 1.6, 97);
  box("trim", [4.7, W - 3.7, ry + 3, ry + 3.25, -D + 1.7, -BD - 1.1], 0.03);
  if (green) {
    for (const [x, z, h] of [[2.6, -3.2, 3.4], [W - 2.8, -3, 3]]) {
      box("stone", [x - 0.8, x + 0.8, ry, ry + 0.6, z - 0.8, z + 0.8], 0.04, false);
      grow.tree(x, ry + 0.55, z, h, 34, 0.22);
    }
  }

  for (const [x0, x1] of [[1, E0 - 1.6], [E1 + 1.6, W - 1]]) {
    box("stone", [x0, x1, 0, 0.62, 0.9, 2.3], 0.04);
    box("hedge", [x0 + 0.08, x1 - 0.08, 0.56, 0.64, 0.98, 2.22], 0, false);
    for (let x = x0 + 0.75; x < x1 - 0.5; x += 1.45) grow.bush(x, 0.56, 1.6, 0.62 + rnd() * 0.12, 0.6);
  }
  box("stone", [-2.6, -1.1, 0, 0.62, -D + 1, -BD - 0.4], 0.04);
  box("hedge", [-2.52, -1.18, 0.56, 0.64, -D + 1.08, -BD - 0.48], 0, false);
  for (let z = -BD - 1.1; z > -D + 1.5; z -= 1.45) grow.bush(-1.85, 0.56, z, 0.62, 0.62 + rnd() * 0.12);
  return { parts, occ };
};

const SKY_FN = `
uniform vec3 uSky, uHaze, uGlow, uSunDir, uInterior;
uniform float uHazeK, uTime, uDisc;
vec3 skLin(vec3 c){ return pow(c, vec3(2.2)); }
float skH(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float skN(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(skH(i), skH(i + vec2(1., 0.)), f.x), mix(skH(i + vec2(0., 1.)), skH(i + vec2(1., 1.)), f.x), f.y); }
float skF(vec2 p){ float s = 0., a = .5; for (int i = 0; i < 5; i++) { s += a * skN(p); p = mat2(1.6, 1.2, -1.2, 1.6) * p + 3.1; a *= .5; } return s / .96875; }
vec3 skyCol(vec3 d){
  vec3 haze = skLin(uHaze), glow = skLin(uGlow), sky = skLin(uSky);
  float e = max(d.y, 0.);
  float az = max(dot(normalize(d.xz + 1e-4), normalize(uSunDir.xz + 1e-4)), 0.);
  vec3 hor = mix(haze, glow, .1 + .25 * pow(az, 3.));
  vec3 c = mix(hor, sky, pow(smoothstep(-.02, .62, e), .55));
  float g = max(dot(d, uSunDir), 0.);
  c += glow * (pow(g, 8.) * .25 + pow(g, 160.) * 1.4 + smoothstep(.9995, .9998, g) * 18. * uDisc);
  vec2 wind = uTime * vec2(.011, .004);
  vec2 cq = d.xz / (e + .09) * 1.1 + wind;
  float cl = skF(cq);
  float lit = skF(cq + normalize(uSunDir.xz + 1e-4) * .06);
  float cov = smoothstep(.57, .82, cl) * smoothstep(.0, .14, e) * (1. - smoothstep(.75, 1., e));
  float shade = clamp((cl - lit) * 5. + .65, .25, 1.15);
  vec3 cloud = mix(mix(haze, sky, .35) * .85, mix(vec3(1.), glow, .4) * 1.18, shade);
  c = mix(c, cloud, cov * .7);
  c = mix(c, hor, exp(-e * 16.) * .55 * clamp(uHazeK, 0., 1.6));
  c = mix(c, mix(haze * .62, sky * .35, .25), smoothstep(-.005, -.06, d.y));
  return c;
}
`;

const PARS = `
#define NB ${NB}
uniform vec4 uBoxC[NB];
uniform vec3 uBoxH[NB];
uniform int uBoxN;
uniform vec3 uLeafT1, uLeafT2;
uniform vec2 uLeafC, uLeafC2;
uniform float uLeaves, uMist, uFogK, uWin;
uniform vec3 uSunCol;
varying vec3 vAptW, vAptN;
${SKY_FN}
float vhash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3. - 2. * f); return mix(mix(vhash(i), vhash(i + vec2(1., 0.)), u.x), mix(vhash(i + vec2(0., 1.)), vhash(i + vec2(1., 1.)), u.x), u.y); }
float vfbm(vec2 p){ float s = 0., a = .5; for (int i = 0; i < 4; i++) { s += a * vnoise(p); p = mat2(1.6, 1.2, -1.2, 1.6) * p + 3.1; a *= .5; } return s / .9375; }
float sdApt(vec3 p){
  float d = p.y;
  for (int i = 0; i < NB; i++) {
    if (i >= uBoxN) break;
    vec4 c = uBoxC[i];
    vec3 q = abs(p - c.xyz) - uBoxH[i] + c.w;
    d = min(d, length(max(q, 0.)) + min(max(q.x, max(q.y, q.z)), 0.) - c.w);
  }
  return d;
}
float aptAO(vec3 p, vec3 n){
  if (length(p.xz - vec2(16., -10.)) > 44.) return 1.;
  float o = 0.;
  for (int i = 1; i <= 3; i++) {
    float h = .1 * float(i * i);
    o += clamp((h - sdApt(p + n * h)) / h, 0., 1.) * (1.2 - .2 * float(i));
  }
  return clamp(1. - o * .38, 0., 1.);
}
float leafMask(vec3 w){
  if (uLeaves <= 0. || w.y > 9.) return 1.;
  vec2 q = vec2(dot(w, uLeafT1), dot(w, uLeafT2));
  float wob = (vnoise(q * .3 + 3.) - .5) * .6;
  float env = max(smoothstep(1.05, .4, length((q - uLeafC) / vec2(6., 4.)) + wob), smoothstep(1.05, .4, length((q - uLeafC2) / vec2(5., 3.6)) + wob) * .8);
  vec2 sway = vec2(sin(uTime * .7) + sin(uTime * 1.13 + 1.), cos(uTime * .9) + sin(uTime * .53)) * .05;
  float holes = vfbm(q * 1.05 + sway + vec2(uTime * .015, 0.));
  float leaf = smoothstep(.4, .6, holes + (vnoise(q * 4.2 + sway * 2.5) - .5) * .22);
  return 1. - uLeaves * env * leaf * .9;
}
`;

const AO_CHUNK = `
float ambientOcclusion = aptAO(vAptW, normalize(vAptN));
reflectedLight.indirectDiffuse *= ambientOcclusion;
#if defined( USE_ENVMAP ) && defined( STANDARD )
  float dotNVo = saturate( dot( geometryNormal, geometryViewDir ) );
  reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNVo, ambientOcclusion, material.roughness );
#endif
reflectedLight.directDiffuse *= mix(1., ambientOcclusion, .3);
`;

const PANE_CHUNK = `#include <roughnessmap_fragment>
#ifdef APT_GLASS
float gPane = vhash(vec2(floor((vAptW.x - vAptW.z) / 1.5), floor(vAptW.y / ${FH.toFixed(1)})) + 3.1);
roughnessFactor = clamp(roughnessFactor + (gPane - .5) * .06, .02, 1.);
diffuseColor.rgb *= .75 + .5 * gPane;
#endif`;

const WIN_CHUNK = `#include <emissivemap_fragment>
#ifdef APT_WIN
float wPane = vhash(vec2(floor((vAptW.x - vAptW.z) * .222), floor(vAptW.y / ${FH.toFixed(1)})) + 7.3);
float wGrad = .55 + .45 * smoothstep(.2, 2.6, fract(vAptW.y / ${FH.toFixed(1)} - .1) * ${FH.toFixed(1)});
totalEmissiveRadiance *= max(uWin * (.06 + .94 * step(.55, wPane)) * wGrad * (.7 + .5 * vnoise(vAptW.xy * .7)), .01 * (.4 + wPane));
#endif`;

const HAZE_CHUNK = `
#ifdef APT_HAZE
{
  vec3 hV = normalize(vAptW - cameraPosition);
  vec3 hCol = skyCol(normalize(vec3(hV.x, clamp(hV.y, .02, .06), hV.z))) * .92;
  #ifdef APT_FLAT
  float fLum = dot(outgoingLight, vec3(.3, .59, .11));
  outgoingLight = mix(outgoingLight, vec3(fLum), .55 * APT_FLAT);
  outgoingLight = mix(outgoingLight, vec3(mix(fLum, dot(hCol, vec3(.3, .59, .11)), .5)), .4 * APT_FLAT);
  hCol = mix(hCol, uSunCol * dot(hCol, vec3(.3, .59, .11)) * 1.6, .16 * pow(max(dot(normalize(hV.xz + 1e-4), normalize(uSunDir.xz + 1e-4)), 0.), 3.));
  #endif
  outgoingLight = mix(outgoingLight, hCol, 1. - exp(-length(vAptW - cameraPosition) * APT_HAZE));
}
#endif
#include <opaque_fragment>`;

const FOG_CHUNK = `
#ifdef USE_FOG
vec3 hV = vAptW - cameraPosition;
float hD = length(hV);
float hAz = max(dot(normalize(hV.xz + 1e-4), normalize(uSunDir.xz + 1e-4)), 0.);
vec3 hFog = mix(fogColor, uSunCol, .12 + .3 * pow(hAz, 3.));
float hNear = 1. - exp(-fogDensity * fogDensity * hD * hD);
float hFar = 1. - exp(-max(hD - 50., 0.) * .0035 * uFogK);
float hMist = uMist * smoothstep(80., 320., hD) * exp(-max(vAptW.y, 0.) * .06);
float hK = 1. - (1. - hNear) * (1. - hFar * .85) * (1. - hMist * .55);
gl_FragColor.rgb = mix(gl_FragColor.rgb, hFog * (1. + .05 * hMist), clamp(hK, 0., 1.));
#endif`;

const DIR_LINE = "directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ]";

const SKY_VERTEX = `
varying vec3 vDir;
void main(){
  vDir = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
}`;

const SKY_FRAGMENT = `
${SKY_FN}
varying vec3 vDir;
void main(){ gl_FragColor = vec4(skyCol(normalize(vDir)), 1.); }`;

const SCREEN_VERTEX = `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`;

const BLUR_FRAGMENT = `
uniform sampler2D uSrc;
uniform vec2 uDir;
uniform float uThresh;
varying vec2 vUv;
vec3 tap(vec2 o){ vec3 c = min(texture2D(uSrc, vUv + o).rgb, vec3(4.)); return c * smoothstep(uThresh, uThresh + .4, dot(c, vec3(.3, .59, .11))); }
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
uniform vec3 uHaze;
uniform float uBloomK, uFade, uTime, uExposure, uSat;
uniform vec3 uLift, uWarm, uCool;
varying vec2 vUv;
float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
vec3 aces(vec3 x){ return clamp((x * (2.51 * x + .03)) / (x * (2.43 * x + .59) + .14), 0., 1.); }
void main(){
  vec3 c = texture2D(uMain, vUv).rgb;
  c += texture2D(uBloom, vUv).rgb * .35 * uBloomK;
  c = aces(c * uExposure);
  c = pow(c, vec3(1. / 2.2));
  float l = dot(c, vec3(.299, .587, .114));
  c += uWarm * smoothstep(.35, 1., l) + uCool * smoothstep(.6, 0., l);
  c = mix(vec3(l), c, uSat);
  c = mix(c, c * c * (3. - 2. * c), .1);
  c = uLift + c * (1. - uLift);
  c *= 1. - .16 * pow(length((vUv - .5) * vec2(1.1, 1.)) * 1.3, 2.4);
  c = mix(c, uHaze, uFade);
  c += (hash(gl_FragCoord.xy + fract(uTime * 7.3) * 113.) - .5) * .015;
  gl_FragColor = vec4(c, 1.);
}`;

const ease = (x: number) => {
  const c = THREE.MathUtils.clamp(x, 0, 1);
  return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
};

const apartment: EnvModule = {
  id: "apartment",
  title: "Apartment",
  palette: {
    uSky: { cssVar: "--apartment-sky", label: "Sky", fallback: LIGHT_PRESETS.golden.colors.sky },
    uHaze: { cssVar: "--apartment-haze", label: "Haze", fallback: LIGHT_PRESETS.golden.colors.haze },
    uGlow: { cssVar: "--apartment-sun", label: "Sun", fallback: LIGHT_PRESETS.golden.colors.sun },
    uFacade: { cssVar: "--apartment-facade", label: "Facade", fallback: "#e6dccd" },
    uBrick: { cssVar: "--apartment-brick", label: "Brick", fallback: "#c08a70" },
    uTrim: { cssVar: "--apartment-trim", label: "Balcony slabs", fallback: "#eeeae3" },
    uFrame: { cssVar: "--apartment-frame", label: "Frames", fallback: "#2b2e32" },
    uGlass: { cssVar: "--apartment-glass", label: "Glass", fallback: "#26323a" },
    uInterior: { cssVar: "--apartment-interior", label: "Lobby light", fallback: "#f4c992" },
    uPaving: { cssVar: "--apartment-paving", label: "Paving", fallback: "#cdc6ba" },
    uLawn: { cssVar: "--apartment-lawn", label: "Lawn", fallback: "#76a048" },
    uFoliage: { cssVar: "--apartment-foliage", label: "Foliage", fallback: "#2f4b2c" },
    uCity: { cssVar: "--apartment-city", label: "City", fallback: "#d9cfc3" },
  },
  params: [
    lightParam,
    { key: "sun", label: "Sun angle", min: -3.14, max: 3.14, step: 0.01, value: LIGHT_PRESETS.golden.sun },
    { key: "sunHeight", label: "Sun height", min: 0.04, max: 1.2, step: 0.01, value: LIGHT_PRESETS.golden.sunHeight },
    { key: "floors", label: "Floors", min: 6, max: 9, step: 1, value: 7 },
    { key: "facade", label: "Facade (stone, plaster, brick)", min: 0, max: 2, step: 1, value: 0 },
    { key: "greenery", label: "Balcony greenery", min: 0, max: 1, step: 1, value: 1 },
    { key: "leaves", label: "Leaf shadows", min: 0, max: 1, step: 0.05, value: 0 },
    { key: "haze", label: "Haze", min: 0, max: 3, step: 0.05, value: 1 },
    { key: "bloom", label: "Bloom", min: 0, max: 2, step: 0.05, value: 1 },
    { key: "exposure", label: "Exposure", min: 0.5, max: 2, step: 0.05, value: 1 },
    { key: "glide", label: "Camera glide", min: 0, max: 2, step: 0.05, value: 1 },
  ],
  fov: [50, 62],
  travelPerScreen: 0,
  creep: 0,
  hover: { liquid: 0.25, turn: 0 },
  resolution: 1,
  antialias: false,
  variants: {
    ...lightVariants({ sky: "--apartment-sky", haze: "--apartment-haze", sun: "--apartment-sun" }),
    plaster: { params: { facade: 1 } },
    brick: { params: { facade: 2 } },
  },
  setup({ scene, camera, small, colors, pointer, renderer }) {
    camera.near = 0.2;
    camera.far = 1200;
    camera.updateProjectionMatrix();
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.shadowMap.autoUpdate = false;

    const disposables: { dispose: () => void }[] = [];
    const keep = <T extends { dispose: () => void }>(d: T) => (disposables.push(d), d);
    const world = new THREE.Scene();
    const fog = new THREE.FogExp2(0xffffff, 0.003);
    world.fog = fog;
    const sunDir = new THREE.Vector3(0, 1, 0);
    const skyUniforms = { uSky: colors.uSky, uHaze: colors.uHaze, uGlow: colors.uGlow, uInterior: colors.uInterior, uSunDir: { value: sunDir }, uHazeK: { value: 1 }, uTime: { value: 0 }, uDisc: { value: 1 } };
    const shared = {
      ...skyUniforms,
      uLeaves: { value: 0 },
      uLeafC: { value: new THREE.Vector2() },
      uLeafC2: { value: new THREE.Vector2() },
      uLeafT1: { value: new THREE.Vector3(1, 0, 0) },
      uLeafT2: { value: new THREE.Vector3(0, 1, 0) },
      uBoxC: { value: Array.from({ length: NB }, () => new THREE.Vector4()) },
      uBoxH: { value: Array.from({ length: NB }, () => new THREE.Vector3()) },
      uBoxN: { value: 0 },
      uSunCol: { value: new THREE.Color() },
      uMist: { value: 0 },
      uFogK: { value: 1 },
      uWin: { value: 0 },
    };

    const lightsChunk = THREE.ShaderChunk.lights_fragment_begin.replace(DIR_LINE, `directLight.color *= aptLeaf;\n\t\t${DIR_LINE}`);
    const patch = <M extends THREE.MeshStandardMaterial>(m: M, defs = "") => {
      m.onBeforeCompile = (s) => {
        Object.assign(s.uniforms, shared);
        s.vertexShader = "varying vec3 vAptW, vAptN;\n" + s.vertexShader.replace("#include <project_vertex>", "#include <project_vertex>\nvec4 aW = vec4(transformed, 1.);\n#ifdef USE_INSTANCING\naW = instanceMatrix * aW;\n#endif\nvAptW = (modelMatrix * aW).xyz;\nvAptN = normalize(mat3(modelMatrix) * objectNormal);");
        s.fragmentShader =
          defs +
          PARS +
          s.fragmentShader
            .replace("#include <aomap_fragment>", AO_CHUNK)
            .replace("#include <roughnessmap_fragment>", PANE_CHUNK)
            .replace("#include <emissivemap_fragment>", WIN_CHUNK)
            .replace("#include <lights_fragment_begin>", `float aptLeaf = leafMask(vAptW);\n${lightsChunk}`)
            .replace("#include <lights_fragment_end>", "#include <lights_fragment_end>\n#ifdef APT_SPEC\nreflectedLight.directSpecular = min(reflectedLight.directSpecular, vec3(APT_SPEC));\n#endif")
            .replace("#include <opaque_fragment>", HAZE_CHUNK)
            .replace("#include <fog_fragment>", FOG_CHUNK);
      };
      m.customProgramCacheKey = () => "apartment" + defs;
      return keep(m);
    };
    const maps = (t: ReturnType<typeof bake>) => {
      keep(t.map);
      keep(t.normalMap);
      keep(t.roughnessMap);
      return t;
    };
    const plaster = maps(bake(256, 0.5, plasterTexel));
    const leafMat = sway(patch(new THREE.MeshStandardMaterial({ map: keep(leafTexture({ hue: 80, spread: 32, sat: 32, light: 8 })), alphaTest: 0.4, alphaToCoverage: true, roughness: 0.78, color: 0xd4e0c2 }), "#define APT_HAZE .003\n"), true);
    const barkMat = patch(new THREE.MeshStandardMaterial({ map: keep(barkTexture(0x43372d)), roughness: 0.9 }), "#define APT_HAZE .003\n");
    const mats: Record<Kind, THREE.MeshStandardMaterial> = {
      stone: patch(new THREE.MeshStandardMaterial({ ...maps(bake(512, 1.6, limestoneTexel)), roughness: 1, normalScale: new THREE.Vector2(0.6, 0.6) })),
      plaster: patch(new THREE.MeshStandardMaterial({ ...plaster, roughness: 1, normalScale: new THREE.Vector2(0.5, 0.5) })),
      brick: patch(new THREE.MeshStandardMaterial({ ...maps(bake(512, 2.6, brickTexel)), roughness: 1 })),
      trim: patch(new THREE.MeshStandardMaterial({ ...plaster, roughness: 1, normalScale: new THREE.Vector2(0.3, 0.3) })),
      frame: patch(new THREE.MeshStandardMaterial({ metalness: 0.55, roughness: 0.36 })),
      glass: patch(new THREE.MeshPhysicalMaterial({ roughness: 0.04, metalness: 0, ior: 1.5, specularIntensity: 1, specularColor: new THREE.Color(2.6, 2.6, 2.6), envMapIntensity: 1.6 }), "#define APT_GLASS\n#define APT_WIN\n#define APT_SPEC .5\n"),
      rail: patch(new THREE.MeshPhysicalMaterial({ transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide, roughness: 0.04, ior: 1.5, envMapIntensity: 1.1 }), "#define APT_SPEC .5\n"),
      interior: patch(new THREE.MeshStandardMaterial({ ...plaster, emissiveMap: plaster.map, roughness: 1 })),
      lamp: patch(new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 1 })),
      hedge: patch(new THREE.MeshStandardMaterial({ ...maps(bake(256, 3, hedgeTexel)), roughness: 1 })),
      bark: barkMat,
      leaves: leafMat,
    };
    const pavingMat = patch(new THREE.MeshStandardMaterial({ ...maps(bake(512, 1.8, graniteTexel)), roughness: 1, normalScale: new THREE.Vector2(0.6, 0.6) }));
    const asphaltMat = patch(new THREE.MeshStandardMaterial({ ...maps(bake(512, 1.2, asphaltTexel)), roughness: 1, normalScale: new THREE.Vector2(0.5, 0.5) }));
    const lawnMat = patch(new THREE.MeshStandardMaterial({ ...maps(bake(256, 2, lawnTexel)), roughness: 1 }));
    const paintMat = patch(new THREE.MeshStandardMaterial({ color: 0xd8d5ce, roughness: 0.8, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
    const cityMaps = maps(bake(256, 1, cityTexel));
    const cityMask = bake(128, 0, cityMaskTexel);
    keep(cityMask.map);
    cityMask.normalMap.dispose();
    cityMask.roughnessMap.dispose();
    const cityMat = (haze: string, flat: string) => patch(new THREE.MeshStandardMaterial({ ...cityMaps, emissiveMap: cityMask.map, roughness: 1 }), `#define APT_WIN\n#define APT_HAZE ${haze}\n#define APT_FLAT ${flat}\n`);
    const cityMats = [cityMat(".012", ".9"), cityMat(".016", "1."), cityMat(".02", "1.")];

    const ground: [THREE.BufferGeometry, THREE.MeshStandardMaterial][] = [
      [project(new THREE.PlaneGeometry(1400, 1100).rotateX(-Math.PI / 2).translate(0, -0.08, -300), 3), lawnMat],
      [project(new THREE.PlaneGeometry(142, 62.75).rotateX(-Math.PI / 2).translate(0, 0, -19.225), 4.8), pavingMat],
      [project(new THREE.PlaneGeometry(600, 4.4).rotateX(-Math.PI / 2).translate(0, 0.012, 22.2), 4.8), pavingMat],
      [project(new THREE.PlaneGeometry(600, 7.5).rotateX(-Math.PI / 2).translate(0, 0.004, 16.15), 6), asphaltMat],
    ];
    for (const [g, m] of ground) {
      const mesh = new THREE.Mesh(keep(g), m);
      mesh.receiveShadow = true;
      world.add(mesh);
    }
    const dashes: THREE.BufferGeometry[] = [];
    for (let x = -300; x < 300; x += 9) dashes.push(new THREE.PlaneGeometry(3, 0.14).rotateX(-Math.PI / 2).translate(x, 0.02, 16.15));
    for (const z of [12.65, 19.65]) dashes.push(new THREE.PlaneGeometry(600, 0.12).rotateX(-Math.PI / 2).translate(0, 0.02, z));
    const paint = new THREE.Mesh(keep(mergeGeometries(dashes)!), paintMat);
    paint.receiveShadow = true;
    for (const g of dashes) g.dispose();
    const kerbs = [
      [-300, 300, 0, 0.15, 12.1, 12.4],
      [-300, 300, 0, 0.15, 19.9, 20.2],
    ].map(([x0, x1, y0, y1, z0, z1]) => project(new RoundedBoxGeometry(x1 - x0, y1 - y0, z1 - z0, 2, 0.04).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2), 3.6));
    const kerb = new THREE.Mesh(keep(mergeGeometries(kerbs)!), mats.stone);
    kerb.receiveShadow = kerb.castShadow = true;
    const lamps: THREE.BufferGeometry[] = [];
    for (const [x, z, s] of [[-12, 11.8, -1], [10, 11.8, -1], [32, 11.8, -1], [54, 11.8, -1], [-56, 20.6, 1], [0, 20.6, 1], [30, 20.6, 1]]) {
      lamps.push(new THREE.CylinderGeometry(0.05, 0.075, 6, 10).translate(x, 3, z));
      lamps.push(new THREE.BoxGeometry(0.07, 0.07, 1.4).translate(x, 5.95, z + s * 0.7));
      lamps.push(new THREE.BoxGeometry(0.28, 0.1, 0.6).translate(x, 5.88, z + s * 1.3));
    }
    const lamp = new THREE.Mesh(keep(mergeGeometries(lamps)!), mats.frame);
    lamp.castShadow = lamp.receiveShadow = true;
    for (const g of [...kerbs, ...lamps]) g.dispose();
    world.add(paint, kerb, lamp);

    const yard = { bark: [] as THREE.BufferGeometry[], leaves: [] as THREE.BufferGeometry[] };
    let gs = 13;
    const grnd = () => (gs = (gs * 16807) % 2147483647) / 2147483647;
    const grow = grower((k, g) => yard[k].push(g), grnd);
    const hedges = hedger();
    for (const [x, z, h] of [[34, 10.9, 8.6]]) grow.tree(x, 0, z, h, 70, 0.17);

    const court = { stone: [] as THREE.BufferGeometry[], hedge: [] as THREE.BufferGeometry[], lawn: [] as THREE.BufferGeometry[] };
    const cb = (k: keyof typeof court, x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, r = 0.04) =>
      court[k].push(project(new RoundedBoxGeometry(x1 - x0, y1 - y0, z1 - z0, 2, Math.min(r, (y1 - y0) * 0.45)).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2), k === "stone" ? 3.6 : 3));
    const wall = (x0: number, x1: number, z0: number, z1: number, h = 1.35) => {
      cb("stone", x0, x1, 0, 0.5, z0, z1);
      hedges.box(x0 + 0.08, x1 - 0.08, 0.45, h, z0 + 0.08, z1 - 0.08);
    };
    const planter = (x: number, z: number, w: number, h = 0) => {
      cb("stone", x - w / 2, x + w / 2, 0, 0.55, z - w / 2, z + w / 2);
      cb("hedge", x - w / 2 + 0.1, x + w / 2 - 0.1, 0.5, 0.57, z - w / 2 + 0.1, z + w / 2 - 0.1, 0.02);
      if (h) grow.tree(x, 0.55, z, h * 1.15, 80, 0.16);
      for (const [dx, dz] of h ? [[-1, 1], [1, -1]] : [[-1, -1], [1, -1], [-1, 1], [1, 1]]) grow.bush(x + dx * w * 0.22, 0.55, z + dz * w * 0.22, w * 0.2 + grnd() * 0.06);
    };
    const bed = (x0: number, x1: number, z0: number, z1: number, shrubs: number) => {
      cb("stone", x0, x1, 0, 0.14, z0, z1, 0.03);
      cb("lawn", x0 + 0.15, x1 - 0.15, 0.1, 0.16, z0 + 0.15, z1 - 0.15, 0.02);
      for (let i = 0; i < shrubs; i++) grow.bush(mix(x0 + 1.5, x1 - 1.5, (i + 0.5) / shrubs), 0.16, mix(z0, z1, 0.3 + grnd() * 0.4), 0.6 + grnd() * 0.25);
    };
    wall(-70, -36, 10.5, 11.7);
    wall(-30, E0 - 1.2, 10.5, 11.7);
    wall(E1 + 1.2, 70, 10.5, 11.7);
    wall(-4.4, -3.2, -26, 3.4);
    wall(-4.4, -3.2, 7.6, 10.5);
    wall(-70.6, -69.4, -49.4, 10.5, 1.8);
    wall(69.4, 70.6, -49.4, 10.5, 1.8);
    wall(-70.6, 70.6, -50.6, -49.4, 1.8);
    cb("stone", -69.4, E0, 0, 0.03, 4.2, 6.8, 0.01);
    cb("stone", E0, E1, 0, 0.03, -BD, 12.1, 0.01);
    for (const [x, h] of [[-62, 8], [-48, 0], [-40, 8.5], [-24, 8], [-14, 0]]) planter(x, 8.65, 2.2, h);
    bed(-56, -16, -2, 1.2, 5);
    for (const [x, z, w, h] of [[-7, -8, 3, 10.5], [-9, -24, 3, 11], [44, 4, 3, 9.5], [-52, -12, 2.6, 9.5], [-36, -12, 2.6, 0], [-22, -12, 2.6, 9], [-58, -36, 2.6, 0], [-42, -36, 2.6, 10], [-24, -36, 2.6, 0]]) planter(x, z, w, h);
    bed(-62, -30, -24, -20.8, 4);
    for (const k of ["stone", "hedge", "lawn"] as const) {
      const m = new THREE.Mesh(keep(mergeGeometries(court[k])!), k === "lawn" ? lawnMat : mats[k]);
      for (const g of court[k]) g.dispose();
      m.receiveShadow = true;
      m.castShadow = k !== "lawn";
      world.add(m);
    }
    for (const m of hedges.meshes(leafMat)) {
      keep(m.geometry);
      world.add(keep(m));
    }

    for (const [geos, mat] of [[yard.bark, barkMat], [yard.leaves, leafMat]] as const) {
      const merged = mergeGeometries(geos);
      for (const g of geos) g.dispose();
      const m = new THREE.Mesh(keep(merged!), mat);
      m.castShadow = m.receiveShadow = true;
      world.add(m);
    }

    const protos = [16, 22, 28].map((n, i) => {
      const part = { bark: [] as THREE.BufferGeometry[], leaves: [] as THREE.BufferGeometry[] };
      grower((k, g) => part[k].push(g), grnd).tree(0, 0, 0, 10, n, 0.3 + 0.03 * i);
      const out = { bark: mergeGeometries(part.bark)!, leaves: mergeGeometries(part.leaves)! };
      for (const g of [...part.bark, ...part.leaves]) g.dispose();
      return { ...out, mats: [] as THREE.Matrix4[], tints: [] as THREE.Color[] };
    });
    const q = new THREE.Quaternion();
    const yAxis = new THREE.Vector3(0, 1, 0);
    const plant = (x: number, z: number, h: number) => {
      const s = h / 10, wd = 0.8 + grnd() * 0.5;
      const p = protos[Math.floor(grnd() * protos.length)];
      p.mats.push(new THREE.Matrix4().compose(new THREE.Vector3(x, -s * 2, z), q.setFromAxisAngle(yAxis, grnd() * Math.PI * 2), new THREE.Vector3(s * wd, s, s * wd)));
      p.tints.push(new THREE.Color().setRGB(0.85 + grnd() * 0.3, 0.88 + grnd() * 0.24, 0.8 + grnd() * 0.25));
    };
    const blocks: THREE.BufferGeometry[][] = [[], [], []];
    for (let gx = -340; gx <= 400; gx += 30) {
      for (let gz = -440; gz <= 0; gz += 30) {
        const x = gx + (grnd() - 0.5) * 12, z = gz + (grnd() - 0.5) * 12;
        if (x > -80 && x < 80 && z > -62) continue;
        const cam = Math.hypot(x + 22, z - 22);
        const d = Math.hypot(x - 14, z + 10);
        if (d < 190 || grnd() < 0.5) {
          if (cam < 210) for (let i = 0; i < (cam < 120 ? 3 : 2); i++) plant(x + (grnd() - 0.5) * 18, z + (grnd() - 0.5) * 18, 9 + grnd() * 7);
          continue;
        }
        const w = 14 + grnd() * 10, dp = 12 + grnd() * 10;
        const h = (d < 260 ? 7 + grnd() * 8 : 10 + grnd() * 16) * (d > 300 && grnd() < 0.05 ? 2 : 1);
        blocks[d < 260 ? 0 : d < 340 ? 1 : 2].push(project(new THREE.BoxGeometry(w, h, dp).rotateY((grnd() - 0.5) * 0.3).translate(x, h / 2, z), 9.6));
        if (d < 200 && grnd() < 0.5) plant(x + (grnd() < 0.5 ? -1 : 1) * (w / 2 + 3), z + dp / 2 + 3, 8 + grnd() * 5);
      }
    }
    for (const x of [-64, -48, -30, -14, 2, 20, 38, 54, 70]) plant(x, -56 - grnd() * 5, 10 + grnd() * 5);
    for (const z of [-34, -14, 4]) plant(-76, z + grnd() * 6, 10 + grnd() * 4);
    blocks.forEach((geos, i) => {
      if (!geos.length) return;
      world.add(new THREE.Mesh(keep(mergeGeometries(geos)!), cityMats[i]));
      for (const g of geos) g.dispose();
    });
    for (const p of protos) {
      for (const [geo, mat] of [[p.bark, barkMat], [p.leaves, leafMat]] as const) {
        const im = new THREE.InstancedMesh(keep(geo), mat, Math.max(1, p.mats.length));
        p.mats.forEach((m, i) => im.setMatrixAt(i, m));
        p.tints.forEach((c, i) => im.setColorAt(i, c));
        im.count = p.mats.length;
        im.computeBoundingSphere();
        world.add(im);
      }
    }

    const skyMat = keep(new THREE.ShaderMaterial({ vertexShader: SKY_VERTEX, fragmentShader: SKY_FRAGMENT, uniforms: skyUniforms, side: THREE.BackSide, depthWrite: false }));
    const sky = new THREE.Mesh(keep(new THREE.SphereGeometry(600, 48, 24)), skyMat);
    sky.renderOrder = -1;
    sky.frustumCulled = false;
    world.add(sky);
    const envScene = new THREE.Scene();
    envScene.add(new THREE.Mesh(keep(new THREE.SphereGeometry(100, 48, 24)), keep(new THREE.ShaderMaterial({ vertexShader: SKY_VERTEX, fragmentShader: SKY_FRAGMENT, uniforms: { ...skyUniforms, uDisc: { value: 0 } }, side: THREE.BackSide, depthWrite: false }))));
    const pmrem = keep(new THREE.PMREMGenerator(renderer));
    let envRT: THREE.WebGLRenderTarget | null = null;

    const sunLight = new THREE.DirectionalLight(0xffffff, 3.4);
    sunLight.castShadow = true;
    const sh = sunLight.shadow;
    sh.mapSize.set(small ? 1024 : 2048, small ? 1024 : 2048);
    Object.assign(sh.camera, { left: -52, right: 52, top: 46, bottom: -36, near: 20, far: 320 });
    sh.camera.updateProjectionMatrix();
    sh.bias = -0.0004;
    sh.normalBias = 0.03;
    sh.radius = 4;
    sunLight.target.position.set(14, 6, -6);
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
        let geos = parts[kind];
        if (!geos.length) continue;
        if (!RAW.has(kind)) for (const g of geos) project(g, TILE[kind]);
        if (geos.some((g) => !g.index)) {
          const flat = geos.map((g) => (g.index ? g.toNonIndexed() : g));
          for (const g of geos) if (!flat.includes(g)) g.dispose();
          geos = flat;
        }
        const merged = mergeGeometries(geos);
        for (const g of geos) g.dispose();
        if (!merged) continue;
        const m = new THREE.Mesh(merged, mats[kind]);
        m.castShadow = kind !== "glass" && kind !== "rail" && kind !== "lamp";
        m.receiveShadow = kind !== "lamp";
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
    const finalMat = flat(FINAL_FRAGMENT, { uMain: { value: mainRT.texture }, uBloom: { value: bloomB.texture }, uHaze: colors.uHaze, uBloomK: { value: 1 }, uFade: { value: 0 }, uTime: { value: 0 }, uExposure: { value: 1 }, uSat: { value: 1 }, uLift: { value: new THREE.Vector3() }, uWarm: { value: new THREE.Vector3() }, uCool: { value: new THREE.Vector3() } });
    scene.add(screen(finalMat));

    const tint: [THREE.Material & { color: THREE.Color }, string][] = [
      [mats.stone, "uFacade"],
      [mats.plaster, "uFacade"],
      [mats.brick, "uBrick"],
      [mats.trim, "uTrim"],
      [mats.frame, "uFrame"],
      [mats.glass, "uGlass"],
      [mats.interior, "uInterior"],
      [mats.hedge, "uFoliage"],
      [pavingMat, "uPaving"],
      [lawnMat, "uLawn"],
      ...cityMats.map((m) => [m, "uCity"] as [THREE.MeshStandardMaterial, string]),
    ];
    const lin = (k: string, c: THREE.Color) => {
      const v = colors[k].value;
      return c.setRGB(v.x, v.y, v.z, THREE.SRGBColorSpace);
    };
    const up = new THREE.Vector3(0, 1, 0);
    const leafAt = new THREE.Vector3(-7, 6.5, -8);
    const leafAt2 = new THREE.Vector3(34, 5, 10.9);
    const size = new THREE.Vector2();
    const rig = cameraRig(camera, pointer, {
      base: small ? new THREE.Vector3(-10, 1.6, 38) : new THREE.Vector3(-22, 1.6, 22),
      focus: small ? new THREE.Vector3(12, 12, -6) : new THREE.Vector3(9, 11, -4),
      yaw: small ? 0 : 0.3,
    });
    let structKey = "";
    let envKey = "";
    let shadowKey = "";

    return {
      update(frame) {
        const { time, intro, params } = frame;
        const sk = ["floors", "facade", "greenery"].map((k) => params[k]).join();
        if (sk !== structKey) {
          structKey = sk;
          rebuild(params);
          shadowKey = "";
        }
        const el = params.sunHeight;
        sunDir.set(-Math.sin(params.sun) * Math.cos(el), Math.sin(el), Math.cos(params.sun) * Math.cos(el));
        const lp = lightPreset(params.light);
        sunLight.position.copy(sunLight.target.position).addScaledVector(sunDir, 160);
        bounce.position.set(-sunDir.x, 0.35, -sunDir.z).multiplyScalar(60).add(sunLight.target.position);
        sh.radius = lp.softness;
        shared.uLeafT1.value.crossVectors(sunDir, up).normalize();
        shared.uLeafT2.value.crossVectors(shared.uLeafT1.value, sunDir);
        shared.uLeafC.value.set(leafAt.dot(shared.uLeafT1.value), leafAt.dot(shared.uLeafT2.value));
        shared.uLeafC2.value.set(leafAt2.dot(shared.uLeafT1.value), leafAt2.dot(shared.uLeafT2.value));
        shared.uLeaves.value = params.leaves;
        shared.uTime.value = time;
        skyUniforms.uHazeK.value = params.haze;

        for (const [m, k] of tint) lin(k, m.color);
        pavingMat.color.multiplyScalar(0.86);
        lawnMat.color.multiplyScalar(1.1);
        mats.hedge.color.multiplyScalar(1.5);
        mats.glass.color.multiplyScalar(0.2);
        mats.glass.emissive.setRGB(1, 0.58, 0.26).multiplyScalar(1.5);
        for (const m of cityMats) m.emissive.setRGB(1, 0.62, 0.3).multiplyScalar(1.1);
        lin("uGlow", sunLight.color);
        shared.uSunCol.value.copy(sunLight.color);
        sunLight.intensity = 7.2 * lp.sunK * THREE.MathUtils.smoothstep(el, -0.02, 0.12) * (1 + 0.03 * Math.sin(time * 0.4) + 0.015 * Math.sin(time * 1.1));
        world.environmentIntensity = lp.fill;
        lin("uSky", hemi.color);
        lin("uPaving", hemi.groundColor).lerp(sunLight.color, 0.25).multiplyScalar(0.7);
        hemi.intensity = lp.bounce;
        bounce.color.copy(hemi.groundColor).lerp(sunLight.color, 0.5);
        bounce.intensity = sunLight.intensity * 0.06 * lp.bounce;
        lin("uInterior", mats.interior.emissive).multiplyScalar(0.55 + 0.9 * lp.windows);
        lin("uInterior", mats.lamp.emissive).multiplyScalar(5 + 4 * lp.windows);
        shared.uWin.value = lp.windows;
        lin("uHaze", fog.color);
        const k = ease(intro / 2.8);
        fog.density = 0.0022 * params.haze * lp.fog + (1 - k) * 0.03;
        shared.uFogK.value = params.haze * lp.fog;
        shared.uMist.value = lp.mist;

        const ek = [params.sun, el, params.haze, ...["uSky", "uHaze", "uGlow"].map((c) => colors[c].value.toArray().join())].join();
        const target = renderer.getRenderTarget();
        if (ek !== envKey) {
          envKey = ek;
          const next = pmrem.fromScene(envScene, 0, 0.5, 500);
          envRT?.dispose();
          envRT = next;
          world.environment = next.texture;
          mats.glass.envMap = next.texture;
          mats.rail.envMap = next.texture;
        }
        const shk = `${structKey}|${params.sun}|${el}`;
        if (shk !== shadowKey) {
          shadowKey = shk;
          renderer.shadowMap.needsUpdate = true;
        }

        rig(frame, params.glide);
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
        fu.uTime.value = time;
        fu.uBloomK.value = params.bloom;
        fu.uExposure.value = params.exposure * lp.exposure;
        fu.uSat.value = lp.sat;
        fu.uLift.value.fromArray(lp.lift);
        fu.uWarm.value.fromArray(lp.warm);
        fu.uCool.value.fromArray(lp.cool);
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

export default apartment;

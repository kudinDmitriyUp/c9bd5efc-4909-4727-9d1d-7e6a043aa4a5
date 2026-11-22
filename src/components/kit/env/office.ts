import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { Reflector } from "three/examples/jsm/objects/Reflector.js";
import type { EnvModule } from "@/components/kit/env/EnvStage";
import { cameraRig } from "@/components/kit/env/cameraRig";
import { barkTexture, grower, hedger, leafTexture, sway } from "@/components/kit/env/trees";
import { LIGHT_PRESETS, lightParam, lightPreset, lightVariants } from "@/components/kit/env/lightPresets";

const NB = 40;
const KINDS = ["stone", "frame", "metal", "glass", "lobby", "interior", "lamp", "hedge"] as const;
type Kind = (typeof KINDS)[number];
const TILE: Record<Kind, number> = { stone: 3.6, frame: 1, metal: 2, glass: 1, lobby: 1, interior: 3, lamp: 1, hedge: 3 };
const W = 26;
const D = 22;
const LB = 8.4;
const TB = 1.1;
const FH = 3.8;

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

const plasterTexel = (u: number, v: number): Texel => {
  const a = fbm(u, v, 48, 48, 31, 4);
  const b = fbm(u, v, 6, 6, 33, 4);
  const t = 0.95 + (b - 0.5) * 0.08 + (a - 0.5) * 0.04;
  return { c: [t, t, t], h: a * 0.7 + b * 0.3, r: 0.8 + 0.1 * a };
};

const hedgeTexel = (u: number, v: number): Texel => {
  const leaf = fbm(u, v, 40, 40, 81, 3);
  const clump = fbm(u, v, 6, 6, 82, 3);
  const gap = sm(0.62, 0.42, leaf);
  const t = (0.7 + 0.5 * clump) * mix(1.15, 0.35, gap);
  return { c: [t * 0.95, t, t * 0.85], h: leaf * 0.8 + clump * 0.4, r: 0.85 };
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

const PLANTERS = [[-4.6, -5.6], [-4.6, -14], [3.2, 8.4], [21.5, 8.4]];

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
  const pane = (kind: Kind, w: number, h: number, side: boolean, a: number, y: number, seed: number) => {
    const ry = (hashi(seed, 1, 3) - 0.5) * 0.03, rx = (hashi(seed, 2, 7) - 0.5) * 0.02;
    const g = new THREE.PlaneGeometry(w, h).rotateY(ry).rotateX(rx);
    parts[kind].push(side ? g.rotateY(-Math.PI / 2).translate(0, y, a) : g.translate(a, y, 0));
  };

  const floors = Math.round(THREE.MathUtils.clamp(p.floors, 6, 40));
  const g0 = LB + TB;
  const top = g0 + floors * FH;
  const sp = THREE.MathUtils.clamp(p.mullion, 1.1, 3.2);
  const cx = Math.max(4, Math.round(W / sp));
  const cz = Math.max(4, Math.round(D / sp));

  box("frame", [0.35, W, LB, top, -D, -0.35], 0.02);
  box("stone", [0, W + 0.2, LB, g0, -D - 0.2, 0], 0.03);
  box("frame", [-0.3, W + 0.2, top, top + 0.6, -D - 0.2, 0.3], 0.02, false);

  for (let i = 1; i < cx; i++) {
    const x = (W * i) / cx;
    box("frame", [x - 0.045, x + 0.045, g0, top, -0.05, 0.26], 0.01, false);
  }
  for (let j = 1; j < cz; j++) {
    const z = (-D * j) / cz;
    box("frame", [-0.26, 0.05, g0, top, z - 0.045, z + 0.045], 0.01, false);
  }
  box("frame", [-0.16, 0.16, g0, top, -0.16, 0.16], 0.01, false);
  for (let k = 0; k <= floors; k++) {
    const y = g0 + k * FH;
    box("frame", [0, W, y - 0.05, y + 0.05, -0.05, 0.12], 0.008, false);
    box("frame", [-0.12, 0.05, y - 0.05, y + 0.05, -D, 0], 0.008, false);
  }
  for (let k = 0; k < floors; k++) {
    const y = g0 + (k + 0.5) * FH;
    for (let i = 0; i < cx; i++) pane("glass", W / cx, FH, false, (W * (i + 0.5)) / cx, y, k * 131 + i);
    for (let j = 0; j < cz; j++) pane("glass", D / cz, FH, true, (-D * (j + 0.5)) / cz, y, k * 173 + j + 7919);
  }

  const bay = (W / cx) * 3;
  box("stone", [0, 1.5, 0, LB, -1.5, 0], 0.03);
  for (let x = bay; x < W - 0.8; x += bay) box("stone", [x - 0.55, x + 0.55, 0, LB, -1.1, 0], 0.03);
  for (let z = -bay; z > -D + 0.8; z -= bay) box("stone", [0, 1.1, 0, LB, z - 0.55, z + 0.55], 0.03);
  box("metal", [0, W, LB - 0.16, LB + 0.02, -D, 0], 0.01);

  const gx = 3.6, gz = -3.6;
  const fin = 2.4;
  for (let x = gx + fin; x < W; x += fin) box("frame", [x - 0.03, x + 0.03, 0, LB - 0.16, gz - 0.25, gz + 0.04], 0.006, false);
  for (let z = gz - fin; z > -D; z -= fin) box("frame", [gx - 0.04, gx + 0.25, 0, LB - 0.16, z - 0.03, z + 0.03], 0.006, false);
  box("frame", [gx, W, 0, 0.12, gz - 0.1, gz + 0.06], 0.006, false);
  box("frame", [gx - 0.06, gx + 0.1, 0, 0.12, -D, gz], 0.006, false);
  box("frame", [gx - 0.06, gx + 0.06, 0, LB - 0.16, gz - 0.06, gz + 0.06], 0.006, false);
  const lw = W - gx, ld = D + gz;
  const nx = Math.round(lw / fin), nz = Math.round(ld / fin);
  for (let i = 0; i < nx; i++) pane("lobby", lw / nx, LB - 0.28, false, gx + (lw * (i + 0.5)) / nx, (LB - 0.04) / 2, i + 50);
  for (let j = 0; j < nz; j++) pane("lobby", ld / nz, LB - 0.28, true, gz - (ld * (j + 0.5)) / nz, (LB - 0.04) / 2, j + 90);
  for (const g of parts.lobby) {
    g.computeBoundingBox();
    const b = g.boundingBox!;
    if (b.max.x - b.min.x > 0.5) g.translate(0, 0, gz - 0.06);
    else g.translate(gx + 0.06, 0, 0);
  }

  box("interior", [gx, W, 0, LB - 0.16, -D, -D + 0.4], 0.02);
  box("interior", [8.5, 20.5, 0, LB - 0.16, -D + 0.4, -12.5], 0.03);
  box("stone", [10.5, 17, 0, 1.1, -9.4, -8.4], 0.04);
  for (let x = 1.2; x < W; x += 2.4) for (let z = -1.2; z > -D + 0.6; z -= 2.4) box("lamp", [x - 0.14, x + 0.14, LB - 0.19, LB - 0.15, z - 0.14, z + 0.14], 0, false);

  if (p.canopy > 0.5) {
    const c0 = W * 0.3, c1 = W * 0.84;
    box("metal", [c0, c1, 6.1, 6.55, gz, 6], 0.03);
    box("frame", [c0 - 0.04, c1 + 0.04, 6.08, 6.6, 5.94, 6.06], 0.01, false);
    for (let x = c0 + 1; x < c1 - 0.5; x += 2) for (let z = -1.6; z < 5.6; z += 2.2) box("lamp", [x - 0.12, x + 0.12, 6.06, 6.1, z - 0.12, z + 0.12], 0, false);
  }

  for (const [x0, z0] of [[-21, 11.3], [-13.5, 11.3]]) box("stone", [x0, x0 + 4.2, 0, 0.46, z0, z0 + 0.6], 0.03);
  for (const [x0, z0] of PLANTERS) box("stone", [x0, x0 + 2.2, 0, 0.72, z0, z0 + 2.2], 0.04);
  if (p.pool > 0.5) {
    const rim: number[][] = [
      [-25, -3, 0, 0.18, 13.6, 14.1],
      [-25, -3, 0, 0.18, 17.9, 18.4],
      [-25, -24.5, 0, 0.18, 14.1, 17.9],
      [-3.5, -3, 0, 0.18, 14.1, 17.9],
    ];
    for (const r of rim) box("stone", r, 0.02, false);
  }
  return { parts, occ, top };
};

const asphaltTexel = (u: number, v: number): Texel => {
  const agg = fbm(u, v, 180, 180, 91, 2);
  const wear = fbm(u, v, 3, 3, 92, 3);
  const stain = fbm(u, v, 10, 10, 93, 3);
  const tone = 0.36 * (0.84 + 0.32 * agg) * (0.9 + 0.2 * wear) * (1 - 0.12 * sm(0.55, 0.75, stain));
  return { c: [tone, tone, tone * 1.03], h: agg * 0.6, r: 0.84 + 0.1 * agg - 0.08 * wear };
};

const STREET = ["stone", "paving", "asphalt", "paint", "metal", "glass", "hedge", "bark", "leaves"] as const;
type SKind = (typeof STREET)[number];

const street = (hedges: ReturnType<typeof hedger>) => {
  const parts = Object.fromEntries(STREET.map((k) => [k, [] as THREE.BufferGeometry[]])) as Record<SKind, THREE.BufferGeometry[]>;
  const M = new THREE.Matrix4().makeRotationY(-0.5635).setPosition(-24, 0, 26);
  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const add = (k: SKind, g: THREE.BufferGeometry, tile = 0) => {
    const n = (g.index ? g.toNonIndexed() : g).applyMatrix4(M);
    parts[k].push(tile ? project(n, tile) : n);
  };
  const box = (k: SKind, t0: number, t1: number, y0: number, y1: number, d0: number, d1: number, r = 0, tile = 3.6) => {
    const w = t1 - t0, h = y1 - y0, l = d1 - d0;
    const g = r > 0 ? new RoundedBoxGeometry(w, h, l, 2, Math.min(r, Math.min(w, h, l) * 0.45)) : new THREE.BoxGeometry(w, h, l);
    add(k, g.translate((t0 + t1) / 2, (y0 + y1) / 2, -(d0 + d1) / 2), tile);
  };
  const flat = (k: SKind, t0: number, t1: number, y: number, d0: number, d1: number, tile = 0) =>
    add(k, new THREE.PlaneGeometry(t1 - t0, d1 - d0).rotateX(-Math.PI / 2).translate((t0 + t1) / 2, y, -(d0 + d1) / 2), tile);
  const hedge = (t0: number, d0: number, t1: number, d1: number, y: number, h: number, depth: number) => {
    const a = new THREE.Vector3(t0, 0, -d0).applyMatrix4(M), b = new THREE.Vector3(t1, 0, -d1).applyMatrix4(M);
    hedges.hedge(a.x, a.z, b.x, b.z, y, h, depth);
  };
  const grow = grower(add, rnd);
  const tree = (t: number, y0: number, d: number, h: number) => grow.tree(t, y0, -d, h);
  const lamp = (t: number, d: number, side: number) => {
    add("metal", new THREE.CylinderGeometry(0.05, 0.075, 6.5, 12).translate(t, 2.8, -d));
    const e = t + side * 1.5;
    box("metal", Math.min(t, e), Math.max(t, e), 5.98, 6.06, d - 0.04, d + 0.04, 0.01);
    box("metal", e - 0.35, e + 0.35, 5.9, 6.02, d - 0.12, d + 0.12, 0.02);
  };
  const bollard = (t: number, d: number) => add("metal", new THREE.CylinderGeometry(0.09, 0.1, 0.85, 14).translate(t, -0.025, -d));
  const planter = (t: number, d: number, w: number, l: number, h: number) => {
    box("stone", t - w / 2, t + w / 2, 0, 0.55, d - l / 2, d + l / 2, 0.04);
    box("hedge", t - w / 2 + 0.08, t + w / 2 - 0.08, 0.5, 0.56, d - l / 2 + 0.08, d + l / 2 - 0.08, 0, 3);
    const r = Math.min(w, l) / 2 - 0.12, k = Math.max(1, Math.round((l - 0.24) / (r * 1.7)));
    for (let i = 0; i < k; i++) grow.bush(t, 0.5, -(d - l / 2 + 0.12 + r + (i * (l - 0.24 - 2 * r)) / Math.max(1, k - 1)), r);
    if (h) tree(t, 0.55, d, h);
  };

  const D0 = -60, D1 = 240;
  const band = (o: number, s: number, near: number[], far: number[], nearLamps: number[], farLamps: number[], cross: number) => {
    const T = (u0: number, u1: number) => [Math.min(o + s * u0, o + s * u1), Math.max(o + s * u0, o + s * u1)] as const;
    const bx = (k: SKind, u0: number, u1: number, y0: number, y1: number, d0: number, d1: number, r = 0, tile = 3.6) => box(k, ...T(u0, u1), y0, y1, d0, d1, r, tile);
    const fl = (k: SKind, u0: number, u1: number, y: number, d0: number, d1: number, tile = 0) => flat(k, ...T(u0, u1), y, d0, d1, tile);
    bx("stone", 0, 0.3, -0.7, 0.02, D0, D1, 0.02);
    bx("stone", 0.3, 0.7, -0.7, -0.15, D0, D1, 0.02);
    bx("stone", 0.7, 1.1, -0.7, -0.3, D0, D1, 0.02);
    bx("paving", 1.1, 4.8, -0.75, -0.45, D0, D1, 0, 2.4);
    bx("stone", 4.75, 5.05, -0.75, -0.43, D0, D1, 0.03);
    fl("asphalt", 5.05, 12.55, -0.6, D0, D1, 6);
    bx("stone", 12.55, 12.85, -0.75, -0.43, D0, D1, 0.03);
    bx("paving", 12.85, 16.3, -0.75, -0.45, D0, D1, 0, 2.4);
    bx("stone", 16.3, 16.9, -0.75, 0.6, D0, D1, 0.03);
    hedge(o + s * 16.6, D0, o + s * 16.6, D1, 0.6, 0.9, 0.9);
    fl("hedge", 16.9, 150, 0.4, D0, D1, 3);
    fl("paint", 5.2, 5.35, -0.59, D0, D1);
    fl("paint", 12.25, 12.4, -0.59, D0, D1);
    for (let d = D0; d < D1; d += 9) if (d + 3 < cross - 4.5 || d > cross + 4.5) fl("paint", 8.725, 8.875, -0.59, d, d + 3);
    for (let u = 5.4; u < 12; u += 1) fl("paint", u, u + 0.5, -0.588, cross - 2, cross + 2);
    fl("paint", 5.35, 8.75, -0.588, cross - 3.1, cross - 2.8);
    fl("paint", 8.85, 12.25, -0.588, cross + 2.8, cross + 3.1);
    for (const d of near) {
      bx("metal", 2.3, 3.6, -0.46, -0.43, d - 0.65, d + 0.65, 0.01);
      tree(o + s * 2.95, -0.45, d, 8 + rnd() * 1.4);
    }
    for (const d of far) {
      bx("metal", 13.95, 15.25, -0.46, -0.43, d - 0.65, d + 0.65, 0.01);
      tree(o + s * 14.6, -0.45, d, 7.6 + rnd() * 1.4);
    }
    for (const d of nearLamps) lamp(o + s * 4.45, d, s);
    for (const d of farLamps) lamp(o + s * 13.15, d, -s);
    for (const d of [-2.3, -0.9, 0.9, 2.3]) {
      bollard(o + s * 4.5, cross + d);
      bollard(o + s * 13.1, cross + d);
    }
  };
  flat("paving", -9.7, 39.7, 0, D0, 105, 4.8);
  band(-9.7, -1, [40, 58, 68, 79], [55, 73], [36, 63, 90], [46, 80], 48.5);
  band(39.7, 1, [28, 40, 52, 66, 80], [34, 58, 76], [34, 60, 86], [46, 72], 46);
  box("stone", -10, 40, 0, 1.1, 105, 105.6, 0.03);
  hedge(-10, 105.3, 40, 105.3, 1.1, 0.9, 0.8);
  flat("hedge", -9.7, 39.7, 0.4, 105.7, D1, 3);

  for (const [d0, d1] of [[59.1, 59.2], [63.4, 63.5]]) {
    box("metal", -25.75, -25.65, -0.45, 2.6, d0, d1);
    box("metal", -24.35, -24.25, -0.45, 2.6, d0, d1);
  }
  box("metal", -25.9, -24, 2.6, 2.72, 58.9, 63.7, 0.02);
  add("glass", new THREE.PlaneGeometry(4.3, 2.8).rotateY(Math.PI / 2).translate(-25.68, 1.15, -61.3));
  add("glass", new THREE.PlaneGeometry(1.4, 2.8).translate(-24.98, 1.15, -63.42));
  box("stone", -25.6, -25.1, -0.45, 0.0, 59.8, 62.8, 0.03);

  planter(-8.3, 34, 1.3, 4, 0);
  planter(-8.3, 46, 1.3, 3.4, 0);
  planter(-7.2, 62, 2.2, 2.2, 6);
  planter(-7.2, 80, 2.2, 2.2, 6.4);
  return parts;
};

const SKY_FN = `
uniform vec3 uSky, uHaze, uGlow, uSunDir, uInterior;
uniform float uHazeK, uTime;
vec3 skLin(vec3 c){ return pow(c, vec3(2.2)); }
float skH(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float skN(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(skH(i), skH(i + vec2(1., 0.)), f.x), mix(skH(i + vec2(0., 1.)), skH(i + vec2(1., 1.)), f.x), f.y); }
float skF(vec2 p){ float s = 0., a = .5; for (int i = 0; i < 5; i++) { s += a * skN(p); p = mat2(1.6, 1.2, -1.2, 1.6) * p + 3.1; a *= .5; } return s / .96875; }
vec3 skyCol(vec3 d){
  vec3 haze = skLin(uHaze), glow = skLin(uGlow), sky = skLin(uSky);
  float e = max(d.y, 0.);
  float az = max(dot(normalize(d.xz + 1e-4), normalize(uSunDir.xz + 1e-4)), 0.);
  vec3 hor = mix(haze, glow, .08 + .2 * pow(az, 3.));
  vec3 c = mix(hor, sky, pow(smoothstep(-.02, .62, e), .55));
  float g = max(dot(d, uSunDir), 0.);
  c += glow * (pow(g, 8.) * .22 + pow(g, 180.) * 1.6 + smoothstep(.9995, .9998, g) * 18.);
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
uniform float uLeaves, uR0, uReflK, uFloorY, uFloorH, uPaneW, uMist, uFogK, uWin;
uniform vec3 uSunCol;
varying vec3 vOfW, vOfN;
${SKY_FN}
float vhash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3. - 2. * f); return mix(mix(vhash(i), vhash(i + vec2(1., 0.)), u.x), mix(vhash(i + vec2(0., 1.)), vhash(i + vec2(1., 1.)), u.x), u.y); }
float vfbm(vec2 p){ float s = 0., a = .5; for (int i = 0; i < 4; i++) { s += a * vnoise(p); p = mat2(1.6, 1.2, -1.2, 1.6) * p + 3.1; a *= .5; } return s / .9375; }
float sdOffice(vec3 p){
  float st = dot(p.xz - vec2(-24., 26.), vec2(.8455, .534));
  float d = p.y + (((st < -10. && st > -26.6) || (st > 40. && st < 56.6)) ? .6 : 0.);
  for (int i = 0; i < NB; i++) {
    if (i >= uBoxN) break;
    vec4 c = uBoxC[i];
    vec3 q = abs(p - c.xyz) - uBoxH[i] + c.w;
    d = min(d, length(max(q, 0.)) + min(max(q.x, max(q.y, q.z)), 0.) - c.w);
  }
  return d;
}
float officeAO(vec3 p, vec3 n){
  if (p.y > 14. || length(p.xz - vec2(4., -4.)) > 42.) return 1.;
  float o = 0.;
  for (int i = 1; i <= 4; i++) {
    float h = .1 * float(i * i);
    o += clamp((h - sdOffice(p + n * h)) / h, 0., 1.) * (1.2 - .2 * float(i));
  }
  return clamp(1. - o * .32, 0., 1.);
}
float leafMask(vec3 w){
  if (uLeaves <= 0. || w.y > 3.) return 1.;
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
float ambientOcclusion = officeAO(vOfW, normalize(vOfN));
reflectedLight.indirectDiffuse *= ambientOcclusion;
#if defined( USE_ENVMAP ) && defined( STANDARD )
  float dotNVo = saturate( dot( geometryNormal, geometryViewDir ) );
  reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNVo, ambientOcclusion, material.roughness );
#endif
reflectedLight.directDiffuse *= mix(1., ambientOcclusion, .3);
`;

const GLASS_CHUNK = `
#ifdef OFFICE_GLASS
{
  vec3 gV = normalize(vOfW - cameraPosition);
  vec3 gN = normalize(vOfN);
  vec2 wq = vec2(vOfW.x - vOfW.z, vOfW.y);
  vec2 cell = floor(wq / vec2(uPaneW, uFloorH));
  float ph = vhash(cell + 17.);
  float ph2 = vhash(cell * 1.7 + 41.);
  #ifdef TOWER_FLAT
  ph = .5;
  #endif
  gN = normalize(gN + vec3(vnoise(wq * .45) - .5, (vnoise(wq * .45 + 7.) - .5) * .5, vnoise(wq * .45 + 3.) - .5) * .018);
  vec3 gR = reflect(gV, gN);
  float cosT = max(dot(-gV, gN), 0.);
  float fr = uR0 + (1. - uR0) * pow(1. - cosT, 5.);
  vec3 refl = skyCol(gR) * uReflK * (.82 + .32 * ph) * mix(vec3(1.), vec3(.94, .98, 1.04), ph2);
  #ifdef TOWER_FLAT
  float ff = .5;
  #else
  float ff = fract((vOfW.y - uFloorY) / uFloorH);
  #endif
  #ifdef OFFICE_LOBBY
  float a = mix(.95, 1., fr);
  refl *= mix(.3, 1., smoothstep(.05, .4, gR.y));
  vec3 body = outgoingLight * (.5 + .35 * ph2) + skLin(uInterior) * .012 * (.6 + .4 * ph);
  outgoingLight = (body * (1. - fr) * .95 + refl * fr) / a;
  diffuseColor.a = a;
  #else
  float vision = step(.24, ff) * step(ff, .9);
  vec3 body = outgoingLight * (1. + (1. - vision) * .6) * (.75 + .55 * ph2);
  body += mix(skLin(uHaze), skLin(uInterior), .4) * .022 * vision * smoothstep(.24, .9, ff) * (.5 + ph);
  body += skLin(uInterior) * (.035 + .3 * uWin) * smoothstep(.62, .86, ff) * vision * (.4 + .6 * step(.35, ph));
  body += skLin(uInterior) * uWin * .5 * vision * step(.42, ph2) * (.6 + .4 * ph);
  outgoingLight = body * (1. - fr) + refl * fr;
  #ifdef TOWER_HAZE
  outgoingLight = mix(outgoingLight, skyCol(normalize(vec3(gV.x, clamp(gV.y, .02, .06), gV.z))) * .92, 1. - exp(-length(vOfW - cameraPosition) * TOWER_HAZE));
  #endif
  #endif
}
#endif
#ifdef OFFICE_HAZE
{
  vec3 hV = normalize(vOfW - cameraPosition);
  outgoingLight = mix(outgoingLight, skyCol(normalize(vec3(hV.x, clamp(hV.y, .02, .06), hV.z))) * .92, 1. - exp(-length(vOfW - cameraPosition) * OFFICE_HAZE));
}
#endif
`;

const FOG_CHUNK = `
#ifdef USE_FOG
vec3 hV = vOfW - cameraPosition;
float hD = length(hV);
float hAz = max(dot(normalize(hV.xz + 1e-4), normalize(uSunDir.xz + 1e-4)), 0.);
vec3 hFog = mix(fogColor, uSunCol, .08 + .2 * pow(hAz, 3.));
float hNear = 1. - exp(-fogDensity * fogDensity * hD * hD);
float hFar = 1. - exp(-max(hD - 90., 0.) * .0022 * uFogK);
float hMist = uMist * smoothstep(120., 380., hD) * exp(-max(vOfW.y, 0.) * .08);
float hK = 1. - (1. - hNear) * (1. - hFar * .8) * (1. - hMist * .5);
gl_FragColor.rgb = mix(gl_FragColor.rgb, hFog * (1. + .05 * hMist), clamp(hK, 0., 1.));
#endif`;

const DIR_LINE ="directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ]";

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

const office: EnvModule = {
  id: "office",
  title: "Office",
  palette: {
    uSky: { cssVar: "--office-sky", label: "Sky", fallback: LIGHT_PRESETS.golden.colors.sky },
    uHaze: { cssVar: "--office-haze", label: "Haze", fallback: LIGHT_PRESETS.golden.colors.haze },
    uGlow: { cssVar: "--office-sun", label: "Sun", fallback: LIGHT_PRESETS.golden.colors.sun },
    uStone: { cssVar: "--office-stone", label: "Stone", fallback: "#ddd6ca" },
    uPaving: { cssVar: "--office-paving", label: "Paving", fallback: "#c4c0b9" },
    uFrame: { cssVar: "--office-frame", label: "Mullions", fallback: "#2a2e33" },
    uMetal: { cssVar: "--office-metal", label: "Canopy", fallback: "#c9cccf" },
    uGlass: { cssVar: "--office-glass", label: "Glass", fallback: "#1f2d38" },
    uInterior: { cssVar: "--office-interior", label: "Lobby light", fallback: "#f4c992" },
    uFoliage: { cssVar: "--office-foliage", label: "Planters", fallback: "#2f4b2c" },
  },
  params: [
    lightParam,
    { key: "sun", label: "Sun angle", min: -3.14, max: 3.14, step: 0.01, value: LIGHT_PRESETS.golden.sun },
    { key: "sunHeight", label: "Sun height", min: 0.04, max: 1.2, step: 0.01, value: LIGHT_PRESETS.golden.sunHeight },
    { key: "floors", label: "Floors", min: 8, max: 40, step: 1, value: 24 },
    { key: "mullion", label: "Mullion spacing", min: 1.1, max: 3.2, step: 0.05, value: 1.6 },
    { key: "tint", label: "Glass tint", min: 0, max: 1, step: 0.05, value: 0.5 },
    { key: "canopy", label: "Canopy", min: 0, max: 1, step: 1, value: 1 },
    { key: "pool", label: "Reflecting pool", min: 0, max: 1, step: 1, value: 1 },
    { key: "leaves", label: "Leaf shadows", min: 0, max: 1, step: 0.05, value: 0.4 },
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
    ...lightVariants({ sky: "--office-sky", haze: "--office-haze", sun: "--office-sun" }),
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
    const skyUniforms = { uSky: colors.uSky, uHaze: colors.uHaze, uGlow: colors.uGlow, uInterior: colors.uInterior, uSunDir: { value: sunDir }, uHazeK: { value: 1 }, uTime: { value: 0 } };
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
      uR0: { value: 0.15 },
      uReflK: { value: 1 },
      uFloorY: { value: LB + TB },
      uFloorH: { value: FH },
      uPaneW: { value: 1.6 },
      uSunCol: { value: new THREE.Color() },
      uMist: { value: 0 },
      uFogK: { value: 1 },
      uWin: { value: 0 },
    };

    const lightsChunk = THREE.ShaderChunk.lights_fragment_begin.replace(DIR_LINE, `directLight.color *= officeLeaf;\n\t\t${DIR_LINE}`);
    const patch = <M extends THREE.MeshStandardMaterial>(m: M, defs = "") => {
      m.onBeforeCompile = (s) => {
        Object.assign(s.uniforms, shared);
        s.vertexShader = "varying vec3 vOfW, vOfN;\n" + s.vertexShader.replace("#include <project_vertex>", "#include <project_vertex>\nvec4 oW = vec4(transformed, 1.);\n#ifdef USE_INSTANCING\noW = instanceMatrix * oW;\n#endif\nvOfW = (modelMatrix * oW).xyz;\nvOfN = normalize(mat3(modelMatrix) * objectNormal);");
        s.fragmentShader =
          defs +
          PARS +
          s.fragmentShader
            .replace("#include <aomap_fragment>", AO_CHUNK)
            .replace("#include <lights_fragment_begin>", `float officeLeaf = leafMask(vOfW);\n${lightsChunk}`)
            .replace("#include <opaque_fragment>", `${GLASS_CHUNK}\n#include <opaque_fragment>`)
            .replace("#include <fog_fragment>", FOG_CHUNK);
      };
      m.customProgramCacheKey = () => "office" + defs;
      return keep(m);
    };
    const maps = (t: ReturnType<typeof bake>) => {
      keep(t.map);
      keep(t.normalMap);
      keep(t.roughnessMap);
      return t;
    };
    const plaster = maps(bake(256, 0.5, plasterTexel));
    const mats: Record<Kind, THREE.MeshStandardMaterial> = {
      stone: patch(new THREE.MeshStandardMaterial({ ...maps(bake(512, 1.6, limestoneTexel)), roughness: 1, normalScale: new THREE.Vector2(0.6, 0.6) })),
      frame: patch(new THREE.MeshStandardMaterial({ metalness: 0.6, roughness: 0.38 })),
      metal: patch(new THREE.MeshStandardMaterial({ ...plaster, metalness: 0.35, roughness: 0.5, normalScale: new THREE.Vector2(0.2, 0.2) })),
      glass: patch(new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0, envMapIntensity: 0.3 }), "#define OFFICE_GLASS\n"),
      lobby: patch(new THREE.MeshStandardMaterial({ roughness: 0.3, transparent: true, depthWrite: false, envMapIntensity: 0 }), "#define OFFICE_GLASS\n#define OFFICE_LOBBY\n"),
      interior: patch(new THREE.MeshStandardMaterial({ ...plaster, emissiveMap: plaster.map, roughness: 1 })),
      lamp: patch(new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 1 })),
      hedge: patch(new THREE.MeshStandardMaterial({ ...maps(bake(256, 3, hedgeTexel)), roughness: 1 })),
    };
    const plazaMat = patch(new THREE.MeshStandardMaterial({ ...maps(bake(512, 1.8, graniteTexel)), roughness: 1, normalScale: new THREE.Vector2(0.6, 0.6) }));
    const leafMat = sway(patch(new THREE.MeshStandardMaterial({ map: keep(leafTexture()), alphaTest: 0.4, alphaToCoverage: true, roughness: 0.78, color: 0xc8d4b8 }), "#define OFFICE_HAZE .0035\n#define OFFICE_FOLIAGE\n"), true);
    const streetMats: Record<SKind, THREE.MeshStandardMaterial> = {
      stone: mats.stone,
      paving: plazaMat,
      asphalt: patch(new THREE.MeshStandardMaterial({ ...maps(bake(512, 1.2, asphaltTexel)), roughness: 1, normalScale: new THREE.Vector2(0.5, 0.5) })),
      paint: patch(new THREE.MeshStandardMaterial({ color: 0xd8d5ce, roughness: 0.8, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })),
      metal: mats.frame,
      glass: mats.lobby,
      hedge: mats.hedge,
      bark: patch(new THREE.MeshStandardMaterial({ map: keep(barkTexture(0x37302a)), roughness: 0.9 }), "#define OFFICE_HAZE .003\n"),
      leaves: leafMat,
    };
    const hedges = hedger();
    for (const [x0, z0] of PLANTERS) hedges.box(x0 + 0.1, x0 + 2.1, 0.66, 1.15, z0 + 0.1, z0 + 2.1);
    const streetParts = street(hedges);
    for (const m of hedges.meshes(leafMat)) {
      keep(m.geometry);
      world.add(keep(m));
    }
    for (const k of STREET) {
      const merged = mergeGeometries(streetParts[k]);
      for (const g of streetParts[k]) g.dispose();
      if (!merged) continue;
      const m = new THREE.Mesh(keep(merged), streetMats[k]);
      m.castShadow = k !== "paving" && k !== "asphalt" && k !== "paint" && k !== "glass";
      m.receiveShadow = true;
      if (k === "glass") m.renderOrder = 2;
      world.add(m);
    }
    const water = new Reflector(keep(new THREE.PlaneGeometry(21, 3.8)), { color: 0xaab4bb, textureWidth: small ? 512 : 1280, textureHeight: small ? 256 : 640, multisample: small ? 0 : 2 });
    keep(water);
    const reflect = water.onBeforeRender;
    let odd = false;
    water.onBeforeRender = (...a: Parameters<typeof reflect>) => {
      odd = !odd;
      if (odd) reflect.apply(water, a);
    };
    water.rotation.x = -Math.PI / 2;
    water.position.set(-14, 0.1, 16);
    world.add(water);

    const towerGlass = (defs: string) => patch(new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0, envMapIntensity: 0.3 }), "#define OFFICE_GLASS\n" + defs);
    const nearMat = towerGlass("#define TOWER_HAZE .0035\n");
    const midMat = towerGlass("#define TOWER_HAZE .0045\n#define TOWER_FLAT\n");
    const far = new THREE.Mesh(
      keep(
        mergeGeometries([
          new THREE.BoxGeometry(20, 90, 20).translate(13, 45, -352),
          new THREE.BoxGeometry(18, 125, 18).translate(-46, 62, -493),
        ])!,
      ),
      midMat,
    );
    world.add(far);

    const city = (rows: number[][]) =>
      keep(
        mergeGeometries(
          rows.flatMap(([d, l, w, dp, h, s = 0]) => {
            const x = -24 + 0.534 * d + 0.846 * l;
            const z = 26 - 0.846 * d + 0.534 * l;
            const out = [new THREE.BoxGeometry(w, h + 60, dp).translate(x, (h - 60) / 2, z)];
            if (s) out.push(new THREE.BoxGeometry(w * 0.6, h * s, dp * 0.6).translate(x, h + (h * s) / 2, z));
            return out;
          }),
        )!,
      );
    world.add(
      new THREE.Mesh(city([[88, 62, 16, 16, 46, 0.22], [125, 72, 18, 18, 78, 0.15], [110, -78, 16, 14, 13], [150, -52, 14, 14, 16, 0.3]]), nearMat),
      new THREE.Mesh(city([[170, 18, 22, 20, 70, 0.18], [230, -10, 24, 22, 74, 0.12], [215, -95, 20, 18, 24, 0.25], [250, -60, 18, 18, 32, 0.2], [260, 150, 22, 22, 70]]), midMat),
      new THREE.Mesh(city([[380, -120, 26, 26, 62, 0.2], [400, 30, 22, 22, 88], [360, -190, 24, 24, 48], [390, 120, 24, 24, 70]]), midMat),
    );

    const skyMat = keep(new THREE.ShaderMaterial({ vertexShader: SKY_VERTEX, fragmentShader: SKY_FRAGMENT, uniforms: skyUniforms, side: THREE.BackSide, depthWrite: false }));
    const sky = new THREE.Mesh(keep(new THREE.SphereGeometry(600, 48, 24)), skyMat);
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
    Object.assign(sh.camera, { left: -70, right: 70, top: 112, bottom: -60, near: 40, far: 560 });
    sh.camera.updateProjectionMatrix();
    sh.bias = -0.0005;
    sh.normalBias = 0.04;
    sh.radius = 4;
    sunLight.target.position.set(-4, 3, -6);
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
        if (kind !== "glass" && kind !== "lobby") for (const g of geos) project(g, TILE[kind]);
        const merged = mergeGeometries(geos);
        for (const g of geos) g.dispose();
        if (!merged) continue;
        const m = new THREE.Mesh(merged, mats[kind]);
        m.castShadow = kind !== "glass" && kind !== "lobby" && kind !== "lamp";
        m.receiveShadow = kind !== "lamp";
        if (kind === "lobby") m.renderOrder = 2;
        world.add(m);
        meshes.push(m);
      }
      const n = Math.min(NB, occ.length / 7);
      for (let i = 0; i < n; i++) {
        shared.uBoxC.value[i].set(occ[i * 7], occ[i * 7 + 1], occ[i * 7 + 2], occ[i * 7 + 3]);
        shared.uBoxH.value[i].set(occ[i * 7 + 4], occ[i * 7 + 5], occ[i * 7 + 6]);
      }
      shared.uBoxN.value = n;
      shared.uPaneW.value = W / Math.max(4, Math.round(W / THREE.MathUtils.clamp(p.mullion, 1.1, 3.2)));
      water.visible = p.pool > 0.5;
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
      [mats.stone, "uStone"],
      [mats.frame, "uFrame"],
      [mats.metal, "uMetal"],
      [mats.glass, "uGlass"],
      [mats.lobby, "uGlass"],
      [mats.interior, "uInterior"],
      [mats.hedge, "uFoliage"],
      [plazaMat, "uPaving"],
    ];
    const lin = (k: string, c: THREE.Color) => {
      const v = colors[k].value;
      return c.setRGB(v.x, v.y, v.z, THREE.SRGBColorSpace);
    };
    const up = new THREE.Vector3(0, 1, 0);
    const leafAt = new THREE.Vector3(-16, 0, 20);
    const leafAt2 = new THREE.Vector3(-30, 0, 8);
    const size = new THREE.Vector2();
    const rig = cameraRig(camera, pointer, {
      base: small ? new THREE.Vector3(-14, 1.3, 36) : new THREE.Vector3(-24, 1.3, 26),
      focus: small ? new THREE.Vector3(6, 13, -4) : new THREE.Vector3(3, 11.3, 3),
      yaw: small ? 0 : 0.3,
    });
    let structKey = "";
    let envKey = "";
    let shadowKey = "";

    return {
      update(frame) {
        const { time, intro, params } = frame;
        const sk = ["floors", "mullion", "canopy", "pool"].map((k) => params[k]).join();
        if (sk !== structKey) {
          structKey = sk;
          rebuild(params);
          shadowKey = "";
        }
        const el = params.sunHeight;
        sunDir.set(-Math.sin(params.sun) * Math.cos(el), Math.sin(el), Math.cos(params.sun) * Math.cos(el));
        const lp = lightPreset(params.light);
        sunLight.position.copy(sunLight.target.position).addScaledVector(sunDir, 300);
        bounce.position.set(-sunDir.x, 0.35, -sunDir.z).multiplyScalar(80).add(sunLight.target.position);
        sh.radius = lp.softness;
        shared.uLeafT1.value.crossVectors(sunDir, up).normalize();
        shared.uLeafT2.value.crossVectors(shared.uLeafT1.value, sunDir);
        shared.uLeafC.value.set(leafAt.dot(shared.uLeafT1.value), leafAt.dot(shared.uLeafT2.value));
        shared.uLeafC2.value.set(leafAt2.dot(shared.uLeafT1.value), leafAt2.dot(shared.uLeafT2.value));
        shared.uLeaves.value = params.leaves;
        shared.uTime.value = time;
        shared.uR0.value = mix(0.12, 0.32, params.tint);
        shared.uReflK.value = mix(1.1, 0.85, params.tint);
        plazaMat.color.multiplyScalar(0.84);
        skyUniforms.uHazeK.value = params.haze;

        for (const [m, k] of tint) lin(k, m.color);
        lin("uGlow", sunLight.color);
        shared.uSunCol.value.copy(sunLight.color);
        sunLight.intensity = 7 * lp.sunK * THREE.MathUtils.smoothstep(el, -0.02, 0.12) * (1 + 0.03 * Math.sin(time * 0.4) + 0.015 * Math.sin(time * 1.1));
        world.environmentIntensity = lp.fill * 0.9;
        lin("uSky", hemi.color);
        lin("uPaving", hemi.groundColor).lerp(sunLight.color, 0.25).multiplyScalar(0.7);
        hemi.intensity = lp.bounce;
        bounce.color.copy(hemi.groundColor).lerp(sunLight.color, 0.5);
        bounce.intensity = sunLight.intensity * 0.06 * lp.bounce;
        mats.glass.color.multiplyScalar(mix(0.42, 0.16, params.tint));
        nearMat.color.copy(mats.glass.color).multiplyScalar(0.7);
        midMat.color.copy(mats.glass.color).multiplyScalar(0.7);
        lin("uInterior", mats.interior.emissive).multiplyScalar(0.55 + 0.9 * lp.windows);
        lin("uInterior", mats.lamp.emissive).multiplyScalar(5 + 4 * lp.windows);
        shared.uWin.value = lp.windows;
        lin("uHaze", fog.color);
        const k = ease(intro / 2.8);
        fog.density = 0.0018 * params.haze * lp.fog + (1 - k) * 0.025;
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

export default office;

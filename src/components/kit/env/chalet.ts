import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries, mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { EnvModule } from "@/components/kit/env/EnvStage";
import { cameraRig } from "@/components/kit/env/cameraRig";
import { barkTexture, grower, leafTexture, sway } from "@/components/kit/env/trees";
import { LIGHT_PRESETS, lightParam, lightPreset, lightVariants } from "@/components/kit/env/lightPresets";

const NB = 40;
const LAKE_Y = -4;
const KINDS = ["clad", "stone", "roof", "frame", "deck", "paving", "glass", "rail"] as const;
type Kind = (typeof KINDS)[number];
const TILE: Record<Kind, number> = { clad: 2.4, stone: 2.4, roof: 2.4, frame: 1, deck: 2.4, paving: 1.6, glass: 1, rail: 1 };

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

const ground = (x: number, z: number) => {
  const dz = z + 3;
  const a = (x + dz) * 0.7071, b = (x - dz) * 0.7071;
  const d = Math.hypot(x, dz);
  const n = (vnoise(x * 0.025, z * 0.025, 4096, 4096, 3) - 0.5) * 5 + (vnoise(x * 0.08, z * 0.08, 4096, 4096, 4) - 0.5) * 1.4;
  const up = sm(-12, 30, a) * sm(5, 80, b) * 30 + Math.max(n, 0);
  const down = Math.min(n, 0) - sm(45, 150, b) * sm(20, -25, a) * 60 - Math.max(0, -b - 14) * 0.05 - sm(-8, -50, a) * (46 + n * 3);
  return sm(18, 30, d) * up + sm(26, 40, d) * down;
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

const boardTexel = (u: number, v: number): Texel => {
  const cols = 14;
  const x = u * cols;
  const col = Math.floor(x);
  const f = x - col;
  const k = hashi(wrap(col, cols), 5, 31);
  const k2 = hashi(wrap(col, cols), 6, 33) - 0.5;
  const grain = fbm(u, v, 96, 3, 32 + (col % 5) * 3, 3);
  const streak = fbm(u, v, 220, 2, 38 + (col % 3), 2);
  const knot = fbm(u, v, 24, 6, 37, 2);
  const fine = fbm(u, v, 64, 64, 34, 2);
  const groove = sm(0, 0.06, Math.min(f, 1 - f));
  const t = (0.74 + 0.36 * k) * (0.76 + 0.4 * grain) * (0.88 + 0.2 * streak) * (0.92 + 0.12 * knot) * (0.97 + 0.04 * fine) * mix(0.3, 1, groove);
  return { c: [t * (1 + 0.1 * k2), t * 0.96, t * (0.9 - 0.14 * k2)], h: groove * 0.8 + grain * 0.14 + streak * 0.06, r: 0.72 + 0.2 * fine };
};

const deckTexel = (u: number, v: number) => boardTexel(v, u);

const stoneTexel = (u: number, v: number): Texel => {
  const rows = 9;
  const y = v * rows;
  const row = Math.floor(y);
  const r = wrap(row, rows);
  const cols = 4 + Math.floor(hashi(r, 2, 71) * 3);
  const x = u * cols + hashi(r, 3, 72);
  const c = wrap(Math.floor(x), cols);
  const fx = x - Math.floor(x), fy = y - row;
  const grain = fbm(u, v, 40, 40, 73, 4);
  const lump = fbm(u, v, 12, 12, 74, 3);
  const edge = Math.min(fx * cols * 0.5, (1 - fx) * cols * 0.5, fy, 1 - fy) + (lump - 0.5) * 0.12;
  const joint = sm(0.02, 0.1, edge);
  const k = hashi(c, r, 75), k2 = hashi(c, r, 76);
  const tone = (0.62 + 0.36 * k) * (0.82 + 0.3 * grain);
  const m = 0.42 + 0.1 * grain;
  return { c: [mix(m, tone * mix(1.04, 0.94, k2), joint), mix(m * 0.98, tone * mix(0.97, 0.96, k2), joint), mix(m * 0.95, tone * mix(0.88, 0.98, k2), joint)], h: joint * (0.6 + 0.4 * lump) + grain * 0.15, r: mix(1, 0.86, joint) };
};

const roofTexel = (u: number, v: number): Texel => {
  const x = u * 10;
  const f = x - Math.floor(x);
  const seam = 1 - sm(0, 0.035, Math.abs(f - 0.5) - 0.465);
  const fine = fbm(u, v, 48, 48, 81, 3);
  const streak = fbm(u, v, 20, 2, 82, 3);
  const t = (0.86 + 0.1 * streak + 0.04 * fine) * (1 + 0.16 * seam);
  return { c: [t, t, t * 1.01], h: seam * 0.9 + fine * 0.03, r: 0.5 + 0.2 * streak };
};

const pavingTexel = (u: number, v: number): Texel => {
  const speck = fbm(u, v, 64, 64, 42, 3);
  const mottle = fbm(u, v, 6, 6, 43, 3);
  const t = (0.8 + 0.2 * mottle) * (0.9 + 0.16 * speck);
  return { c: [t, t * 0.98, t * 0.95], h: speck * 0.4 + mottle * 0.3, r: 0.8 + 0.15 * speck };
};

const rockTexel = (u: number, v: number): Texel => {
  const mottle = fbm(u, v, 5, 5, 51, 4);
  const crack = fbm(u, v, 18, 18, 52, 3);
  const speck = fbm(u, v, 96, 96, 53, 2);
  const lichen = sm(0.62, 0.7, fbm(u, v, 9, 9, 54, 3));
  const t = (0.7 + 0.3 * mottle) * (0.9 + 0.14 * speck) * mix(0.7, 1, sm(0.3, 0.45, crack));
  return { c: [t * mix(1, 0.9, lichen), t * mix(0.99, 0.92, lichen), t * mix(0.96, 0.6, lichen)], h: crack * 0.6 + speck * 0.15, r: 0.85 + 0.1 * speck };
};

const meadowTexel = (u: number, v: number): Texel => {
  const blade = fbm(u, v, 128, 128, 101, 2);
  const clump = fbm(u, v, 8, 8, 102, 4);
  const dry = sm(0.5, 0.8, fbm(u, v, 3, 3, 103, 3));
  const t = (0.74 + 0.34 * clump) * (0.82 + 0.34 * blade);
  return { c: [t * mix(0.94, 1.08, dry), t, t * mix(0.84, 0.7, dry)], h: blade * 0.6 + clump * 0.2, r: 0.95 };
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

const projectRoof = (g: THREE.BufferGeometry, tile: number) => {
  const p = g.attributes.position;
  const uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getZ(i) / tile, (p.getX(i) + p.getY(i)) / tile);
  return g;
};

type Face = { axis: "x" | "z"; at: number; dir: 1 | -1 };

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
  const slab = (kind: Kind, cx: number, cy: number, cz: number, w: number, t: number, l: number, ang: number) => {
    parts[kind].push(new RoundedBoxGeometry(w, t, l, 2, Math.min(0.03, t * 0.4)).rotateZ(ang).translate(cx, cy, cz));
  };
  const beam = (kind: Kind, x0: number, y0: number, x1: number, y1: number, z0: number, z1: number, t: number) => {
    const len = Math.hypot(x1 - x0, y1 - y0);
    parts[kind].push(new THREE.BoxGeometry(len, t, z1 - z0).rotateZ(Math.atan2(y1 - y0, x1 - x0)).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2));
  };
  const put = (kind: Kind, f: Face, a0: number, a1: number, b0: number, b1: number, d0: number, d1: number, r = 0.01) => {
    const lo = f.at + f.dir * d0, hi = f.at + f.dir * d1;
    const q0 = Math.min(lo, hi), q1 = Math.max(lo, hi);
    box(kind, f.axis === "z" ? [a0, a1, b0, b1, q0, q1] : [q0, q1, b0, b1, a0, a1], r, false);
  };
  const pane = (f: Face, a0: number, a1: number, b0: number, b1: number, seed: number) => {
    const g = new THREE.PlaneGeometry(a1 - a0, b1 - b0).rotateY((hashi(seed, 1, 3) - 0.5) * 0.03).rotateX((hashi(seed, 2, 7) - 0.5) * 0.016);
    if (f.axis === "x") g.rotateY(f.dir > 0 ? Math.PI / 2 : -Math.PI / 2);
    else if (f.dir < 0) g.rotateY(Math.PI);
    const d = f.at + f.dir * 0.02;
    parts.glass.push(f.axis === "z" ? g.translate((a0 + a1) / 2, (b0 + b1) / 2, d) : g.translate(d, (b0 + b1) / 2, (a0 + a1) / 2));
  };
  const glazing = (f: Face, a0: number, a1: number, b0: number, b1: number, n: number, seed: number) => {
    const w = (a1 - a0) / n;
    for (let i = 0; i < n; i++) pane(f, a0 + w * i, a0 + w * (i + 1), b0, b1, seed + i);
    for (let i = 0; i <= n; i++) put("frame", f, a0 + w * i - 0.06, a0 + w * i + 0.06, b0, b1, 0, 0.1, 0.005);
    put("frame", f, a0 - 0.06, a1 + 0.06, b0 - 0.08, b0, 0, 0.12, 0.005);
    put("frame", f, a0 - 0.06, a1 + 0.06, b1, b1 + 0.1, 0, 0.12, 0.005);
  };
  const rail = (along: "x" | "z", a0: number, a1: number, at: number, y0: number, h: number) => {
    const n = Math.max(1, Math.round((a1 - a0) / 1.3));
    const w = (a1 - a0) / n;
    const b = (q0: number, q1: number, b0: number, b1: number, t: number, kind: Kind) =>
      box(kind, along === "x" ? [q0, q1, b0, b1, at - t, at + t] : [at - t, at + t, b0, b1, q0, q1], kind === "rail" ? 0 : 0.01, false);
    b(a0, a1, y0, y0 + 0.07, 0.05, "frame");
    b(a0, a1, y0 + h, y0 + h + 0.05, 0.04, "frame");
    for (let i = 0; i < n; i++) b(a0 + w * i + 0.015, a0 + w * (i + 1) - 0.015, y0 + 0.07, y0 + h, 0.01, "rail");
  };

  const F = 1.1, FH = 3.1;
  const X0 = -5, X1 = 5, ZB = -9, ZF = 0;
  const top = F + FH;
  const pitch = THREE.MathUtils.clamp(p.roofPitch, 0.7, 1.4);
  const run = (X1 - X0) / 2, xm = (X0 + X1) / 2, rise = run * pitch, ang = Math.atan(pitch);
  const front: Face = { axis: "z", at: ZF, dir: 1 };
  const side: Face = { axis: "x", at: X0, dir: -1 };

  box("stone", [X0 - 0.06, X1 + 0.06, 0, F, ZB - 0.06, ZF + 0.06], 0.02);
  box("clad", [X0, X1, F, top, ZB, ZF], 0.01);
  const gableShape = new THREE.Shape();
  gableShape.moveTo(X0, top);
  gableShape.lineTo(X1, top);
  gableShape.lineTo(xm, top + rise);
  gableShape.closePath();
  parts.clad.push(new THREE.ExtrudeGeometry(gableShape, { depth: ZF - ZB, bevelEnabled: false }).translate(0, 0, ZB));

  const oE = 0.9, oF = 1.9, oB = 0.9, t = 0.3;
  const len = (run + oE) / Math.cos(ang);
  const lift = t / 2 / Math.cos(ang);
  const cy = top + (rise - oE * pitch) / 2 + lift;
  const rz0 = ZB - oB, rz1 = ZF + oF, rcz = (rz0 + rz1) / 2;
  slab("roof", xm - (run + oE) / 2, cy, rcz, len, t, rz1 - rz0, ang);
  slab("roof", xm + (run + oE) / 2, cy, rcz, len, t, rz1 - rz0, -ang);
  box("roof", [xm - 0.2, xm + 0.2, top + rise + 2 * lift - 0.12, top + rise + 2 * lift + 0.04, rz0, rz1], 0.05, false);
  for (const z of [rz1 - 0.05, rz0 + 0.05]) {
    slab("frame", xm - (run + oE) / 2, cy - 0.14, z, len, 0.42, 0.1, ang);
    slab("frame", xm + (run + oE) / 2, cy - 0.14, z, len, 0.42, 0.1, -ang);
  }
  const ey = top - oE * pitch;
  box("frame", [X0 - oE - 0.08, X0 - oE + 0.04, ey - 0.38, ey + 0.08, rz0, rz1], 0.01, false);
  box("frame", [X1 + oE - 0.04, X1 + oE + 0.08, ey - 0.38, ey + 0.08, rz0, rz1], 0.01, false);
  for (const z of [ZF + oF - 0.5, ZF + 0.6]) {
    beam("frame", X0 - oE * 0.7, top - oE * 0.7 * pitch - 0.2, xm, top + rise - 0.2, z - 0.09, z + 0.09, 0.22);
    beam("frame", X1 + oE * 0.7, top - oE * 0.7 * pitch - 0.2, xm, top + rise - 0.2, z - 0.09, z + 0.09, 0.22);
  }

  const gb = top + 0.22;
  const apex = top + rise - 0.6 / Math.cos(ang);
  const hw = (apex - gb) / pitch;
  const tri = new THREE.Shape();
  tri.moveTo(xm - hw, gb);
  tri.lineTo(xm + hw, gb);
  tri.lineTo(xm, apex);
  tri.closePath();
  parts.glass.push(new THREE.ShapeGeometry(tri).translate(0, 0, ZF + 0.02));
  box("frame", [X0 + 0.1, X1 - 0.1, top - 0.06, gb, ZF, ZF + 0.14], 0.01, false);
  beam("frame", xm - hw - 0.06, gb, xm, apex + 0.08, ZF, ZF + 0.1, 0.13);
  beam("frame", xm + hw + 0.06, gb, xm, apex + 0.08, ZF, ZF + 0.1, 0.13);
  for (const fx of [-2 / 3, -1 / 3, 0, 1 / 3, 2 / 3]) {
    const x = xm + fx * hw;
    const yt = apex - Math.abs(x - xm) * pitch;
    if (yt - gb > 0.3) box("frame", [x - 0.05, x + 0.05, gb, yt, ZF, ZF + 0.08], 0, false);
  }
  const ty = gb + (apex - gb) * 0.42;
  const tw = (apex - ty) / pitch;
  box("frame", [xm - tw, xm + tw, ty - 0.04, ty + 0.04, ZF, ZF + 0.07], 0, false);

  glazing(front, X0 + 0.7, X1 - 0.7, F + 0.08, top - 0.16, 4, 11);
  put("frame", side, ZB, ZF, F - 0.04, F + 0.1, 0, 0.07, 0.005);
  put("frame", side, ZF - 0.16, ZF + 0.02, F, top, 0, 0.08, 0.005);
  put("frame", side, ZB - 0.02, ZB + 0.16, F, top, 0, 0.08, 0.005);
  for (const [a0, a1, seed] of [[-2.6, -1, 21], [-8.1, -6.5, 23]]) {
    glazing(side, a0, a1, F + 0.62, top - 0.42, 2, seed);
    put("frame", side, a0 - 0.16, a1 + 0.16, F + 0.44, F + 0.54, 0, 0.2, 0.01);
  }
  glazing(side, -5.05, -3.95, F + 0.04, top - 0.42, 1, 25);
  put("frame", side, -5.05, -3.95, F + 1.95, F + 2.03, 0, 0.09, 0.005);
  for (let k = 1; k <= 4; k++) box("stone", [X0 - 0.06 - 0.34 * (5 - k), X0 - 0.06, 0, (F * k) / 4, -5.25, -3.75], 0.02, k === 1);

  const chX0 = 2.1, chX1 = 2.9;
  const chTop = top + rise * (1 - (chX0 - xm) / run) + 1.1;
  box("stone", [chX0, chX1, top, chTop, -6, -5.2], 0.02, false);
  box("frame", [chX0 - 0.1, chX1 + 0.1, chTop, chTop + 0.1, -6.1, -5.1], 0.01, false);

  if (p.deck > 0.5) {
    const dx0 = X0 - 1.2, dx1 = X1 + 0.4, dz = ZF + 3.6;
    box("stone", [dx0, dx1, 0, F - 0.2, ZF, dz - 0.12], 0.02);
    box("deck", [dx0 - 0.05, dx1 + 0.05, F - 0.2, F, ZF - 0.02, dz], 0.01);
    rail("x", dx0 + 0.05, -4.05, dz - 0.08, F, 1.05);
    rail("x", -2.45, dx1 - 0.05, dz - 0.08, F, 1.05);
    rail("z", ZF + 0.15, dz - 0.15, dx0 + 0.08, F, 1.05);
    for (let k = 1; k <= 4; k++) box("stone", [-3.95, -2.55, 0, (F * k) / 4, dz, dz + 0.34 * (5 - k)], 0.02, k === 1);
  }

  if (p.annex > 0.5) {
    const ax1 = X1 + 5.6, az0 = ZB + 1.2, az1 = ZF - 1.4, ah = 2.8;
    box("stone", [X1, ax1, 0, ah, az0, az1], 0.02);
    box("roof", [X1 + 0.95, ax1 + 0.35, ah, ah + 0.24, az0 - 0.35, az1 + 0.4], 0.03, false);
    box("frame", [X1 + 0.95, ax1 + 0.35, ah - 0.14, ah, az1 + 0.36, az1 + 0.44], 0.01, false);
    box("clad", [X1 + 1.3, ax1 - 0.7, 0.02, 2.35, az1, az1 + 0.06], 0.01, false);
    box("frame", [X1 + 1.2, ax1 - 0.6, 2.35, 2.47, az1, az1 + 0.1], 0.01, false);
  }

  let s = 41;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 15; i++) {
    const k = i / 14;
    const x = -3.25 - k * 8.5 - Math.sin(k * 3) * 1.6, z = 5.5 + k * 12;
    const w = 0.8 + rnd() * 0.35, d = 0.55 + rnd() * 0.25;
    parts.paving.push(new RoundedBoxGeometry(w, 0.14, d, 2, 0.05).rotateY((rnd() - 0.5) * 0.8).translate(x + (rnd() - 0.5) * 0.3, ground(x, z) + 0.02, z));
  }
  for (let j = 0; j < 7; j++) {
    let x = -12.3 + (j % 2) * 0.45;
    while (x < -6.5) {
      const w = Math.min(0.75 + rnd() * 0.55, -6.3 - x);
      parts.paving.push(new RoundedBoxGeometry(w - 0.05, 0.12, 0.8, 2, 0.035).translate(x + w / 2, 0.03 + rnd() * 0.02, -1.2 + j * 0.86 + 0.4));
      x += w;
    }
  }
  box("stone", [-12.85, -12.3, -0.3, 0.36, -1.5, 5.3], 0.04);
  box("stone", [-12.85, -8.6, -0.3, 0.36, 4.85, 5.3], 0.04);
  return { parts, occ, eave: [xm, top + rise, pitch, run + oE], eaveZ: [rz0, rz1] };
};

const conifer = (grow: ReturnType<typeof grower>, rnd: () => number, x: number, y0: number, z: number, h: number, tiers = 22, per = 4, far = false) => {
  const V = THREE.Vector3;
  grow.limb(new V(x, y0 - 0.3, z), new V(x, y0 + h * 0.9, z), h * 0.017, h * 0.003);
  const fill = 0.55 + 0.45 * rnd();
  const R0 = h * (0.15 + 0.05 * rnd());
  const T = Math.max(far ? 6 : 8,Math.round(tiers * (far ? 0.8 : 0.5) * (0.75 + 0.25 * fill)));
  for (let i = 0; i < T; i++) {
    const t = 0.1 + (i / T) * 0.84 + ((rnd() - 0.5) * 0.5) / T;
    const k = 1 - (t - 0.1) / 0.9;
    const wd = R0 * Math.pow(k, 1.45) + h * 0.008;
    const m = Math.max(3, Math.round((wd / h) * (far ? 20 : 24) * fill));
    const y = y0 + h * t;
    const crown: [THREE.Vector3, number, number] = [new V(x, y - wd * 0.2, z), wd * 1.05, wd * 0.5];
    const a0 = rnd() * Math.PI * 2;
    for (let j = 0; j < m; j++) {
      const a = a0 + (j / m) * Math.PI * 2 + (rnd() - 0.5) * 0.7;
      const ca = Math.cos(a), sa = Math.sin(a);
      const reach = wd * (0.5 + 0.6 * rnd());
      const base = new V(x, y, z);
      const mid = new V(x + ca * reach * 0.55, y - reach * 0.12, z + sa * reach * 0.55);
      const tip = new V(x + ca * reach, y - reach * (0.5 + 0.25 * rnd()), z + sa * reach);
      if (!far) {
        grow.limb(base, mid, h * 0.004, h * 0.0022);
        grow.limb(mid, tip, h * 0.0022, h * 0.0009);
      }
      grow.branch(base.clone().lerp(mid, 0.25), mid, tip, reach * (0.85 + 0.25 * rnd()) * (0.6 + 0.4 * Math.min(per / 3, 1)), crown);
      grow.branch(base, base.clone().lerp(mid, 0.6), mid.clone().lerp(tip, 0.3), reach * 0.6, crown);
    }
  }
  if (far) return;
  const tc: [THREE.Vector3, number, number] = [new V(x, y0 + h * 0.9, z), h * 0.03, h * 0.08];
  grow.foliage(new V(x, y0 + h * 0.9, z), h * 0.01, h * 0.05, 4, h * 0.04, tc, 1.4, undefined, grow.cells.SPRUCE);
};

const PARS = `
#define NB ${NB}
uniform vec4 uBoxC[NB];
uniform vec3 uBoxH[NB];
uniform int uBoxN;
uniform float uTime, uMist, uFogK, uWin, uSnowK, uLake;
uniform vec3 uSunDir, uSunCol, uSnowCol;
uniform vec4 uEave;
uniform vec2 uEaveZ;
varying vec3 vChW, vChN;
float vhash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3. - 2. * f); return mix(mix(vhash(i), vhash(i + vec2(1., 0.)), u.x), mix(vhash(i + vec2(0., 1.)), vhash(i + vec2(1., 1.)), u.x), u.y); }
float vfbm(vec2 p){ float s = 0., a = .5; for (int i = 0; i < 4; i++) { s += a * vnoise(p); p = mat2(1.6, 1.2, -1.2, 1.6) * p + 3.1; a *= .5; } return s / .9375; }
float sdChalet(vec3 p){
  float d = p.y;
  for (int i = 0; i < NB; i++) {
    if (i >= uBoxN) break;
    vec4 c = uBoxC[i];
    vec3 q = abs(p - c.xyz) - uBoxH[i] + c.w;
    d = min(d, length(max(q, 0.)) + min(max(q.x, max(q.y, q.z)), 0.) - c.w);
  }
  return d;
}
float chaletAO(vec3 p, vec3 n){
  if (length(p.xz - vec2(1.5, -3.)) > 24.) return 1.;
  float o = 0.;
  for (int i = 1; i <= 4; i++) {
    float h = .1 * float(i * i);
    o += clamp((h - sdChalet(p + n * h)) / h, 0., 1.) * (1.2 - .2 * float(i));
  }
  return clamp(1. - o * .32, 0., 1.);
}
`;

const AO_CHUNK = `
float ambientOcclusion = chaletAO(vChW, normalize(vChN));
float eDx = abs(vChW.x - uEave.x);
float eUnder = uEave.y - eDx * uEave.z - vChW.y;
if (eDx < uEave.w && vChW.z > uEaveZ.x && vChW.z < uEaveZ.y && eUnder > -.04) ambientOcclusion *= mix(.4, 1., smoothstep(0., 1.8, eUnder));
reflectedLight.indirectDiffuse *= ambientOcclusion;
#if defined( USE_ENVMAP ) && defined( STANDARD )
  float dotNVo = saturate( dot( geometryNormal, geometryViewDir ) );
  reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNVo, ambientOcclusion, material.roughness );
#endif
reflectedLight.directDiffuse *= mix(1., ambientOcclusion, .3);
`;

const SNOW_CHUNK = `#include <color_fragment>
if (uLake > .5 && vChW.y < ${LAKE_Y.toFixed(1)}) discard;
#ifdef CH_GROUND
float gTurf = vfbm(vChW.xz * .045);
diffuseColor.rgb *= mix(vec3(1.1, 1.02, .78), vec3(.82, .94, .98), gTurf) * (.85 + .3 * vnoise(vChW.xz * .21 + 4.));
float gRock = max(smoothstep(.2, .42, 1. - normalize(vChN).y), smoothstep(.66, .82, vnoise(vChW.xz * .12 + 7.)) * .85);
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.21, .2, .185) * (.7 + .6 * vnoise(vChW.xz * 1.7)), gRock);
#endif
float chSnow = uSnowK * smoothstep(.36, .62, normalize(vChN).y + (vfbm(vChW.xz * .45) - .5) * .42);
diffuseColor.rgb = mix(diffuseColor.rgb, uSnowCol * (.92 + .1 * vnoise(vChW.xz * 3.)), chSnow);
#ifdef CH_GROUND
diffuseColor.rgb *= mix(1., .88 + .18 * vnoise(vChW.xz * .3 + 2.), chSnow);
diffuseColor.rgb = mix(diffuseColor.rgb, uSnowCol * vec3(.78, .88, .98), uLake * smoothstep(${(LAKE_Y + 0.7).toFixed(2)}, ${(LAKE_Y + 0.15).toFixed(2)}, vChW.y) * .75);
#endif`;

const SNOW_SURFACE = `#include <metalnessmap_fragment>
metalnessFactor *= 1. - chSnow;
roughnessFactor = mix(roughnessFactor, .75, chSnow);`;

const SNOW_NORMAL = `#include <normal_fragment_maps>
normal = normalize(mix(normal, nonPerturbedNormal, chSnow * .85));`;

const FOG_CHUNK = `
#ifdef USE_FOG
vec3 hV = vChW - cameraPosition;
float hD = length(hV);
float hAz = max(dot(normalize(hV.xz + 1e-4), normalize(uSunDir.xz + 1e-4)), 0.);
vec3 hFog = mix(fogColor, uSunCol, .25 + .5 * pow(hAz, 3.));
float hNear = 1. - exp(-fogDensity * fogDensity * hD * hD);
float hFar = 1. - exp(-max(length(vChW.xz - vec2(1.5, -3.)) - 20., 0.) * .006 * uFogK);
float hMist = uMist * smoothstep(20., 130., hD) * exp(-max(vChW.y + 20., 0.) * .03);
float hK = 1. - (1. - hNear) * (1. - hFar * .95) * (1. - hMist * .75);
#ifdef CH_LEAF
hFog = mix(fogColor * vec3(.7, .85, .98), uSunCol, .06 + .1 * pow(hAz, 3.));
hK = min(hK, .78);
#endif
gl_FragColor.rgb = mix(gl_FragColor.rgb, hFog * (1. + .06 * hMist), clamp(hK, 0., 1.));
#endif`;

const WIN_CHUNK = `#include <emissivemap_fragment>
float wPane = vhash(vec2(floor(vChW.x * .48 + .5) + floor(vChW.z * .5), floor((vChW.y - 1.1) / 3.1)) + 7.3);
float wGrad = .6 + .4 * smoothstep(9., 2., vChW.y);
totalEmissiveRadiance *= max(uWin * (.2 + .8 * step(.25, wPane)) * wGrad * (.75 + .45 * vnoise(vChW.xy * .6 + vChW.zy * .6)), .045 * (.4 + wPane) * wGrad);`;

const SKY_VERTEX = `
varying vec3 vDir;
void main(){
  vDir = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
}`;

const SKY_FRAGMENT = `
uniform vec3 uSky, uHaze, uGlow, uFoliage, uMeadow, uSnow, uSunDir, uCam;
uniform float uHazeK, uTime, uSnowK, uLake;
varying vec3 vDir;
vec3 lin(vec3 c){ return pow(c, vec3(2.2)); }
float h1(float x){ return fract(sin(x * 127.1) * 43758.5453); }
float n1(float x){ float i = floor(x), f = fract(x); f = f * f * (3. - 2. * f); return mix(h1(i), h1(i + 1.), f); }
float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(h2(i), h2(i + vec2(1., 0.)), f.x), mix(h2(i + vec2(0., 1.)), h2(i + vec2(1., 1.)), f.x), f.y); }
float fbm(float x){ float v = 0., w = .5; for (int i = 0; i < 5; i++) { v += w * n1(x); x = x * 2.07 + 17.3; w *= .5; } return v / .96875; }
float ridge(float x){ float r = 1. - abs(2. * n1(x * .8 + 3.1) - 1.); return pow(fbm(x) * .6 + r * r * .4, 1.4); }
vec3 range(vec3 c, float y, float a, float f, float o, float b, float h, vec3 col, vec3 mist, vec3 snowC, float snowLo, vec3 rimC, float sa, float soft){
  float r = b + h * ridge(a * f + o);
  float under = r - y;
  if (under < -soft) return c;
  float s = (ridge((a + .01) * f + o) - ridge((a - .01) * f + o)) / .02;
  float lit = clamp(-s * sign(sin(sa - a)) * 1.5, -1., 1.);
  float rv = ridge(a * f + o);
  float cap = h * (.1 + .12 * uSnowK) * smoothstep(snowLo, snowLo + .25, rv) + 1e-4;
  float nn = n2(vec2(a * f * 14. + o, y * 30.)) * .7 + n2(vec2(a * f * 50., y * 110.)) * .3;
  float sn = (1. - smoothstep(cap * .3, cap, under * (.7 + .6 * nn))) * smoothstep(snowLo, snowLo + .25, rv);
  vec3 m = mix(col * (1. + .1 * lit), snowC * (.9 + .16 * lit), sn);
  m = mix(m, mist, smoothstep(h * .12, h * .85, under) * .5);
  m += rimC * exp(-max(under, 0.) / .003) * max(lit + .4, 0.);
  return mix(c, m, smoothstep(-soft, soft, under));
}
vec3 skyCol(vec3 d){
  vec3 haze = lin(uHaze), glow = lin(uGlow), sky = lin(uSky);
  float az = max(dot(normalize(d.xz + 1e-4), normalize(uSunDir.xz + 1e-4)), 0.);
  vec3 hor = mix(haze, glow, .2 + .45 * pow(az, 3.));
  vec3 c = mix(hor, sky, pow(smoothstep(-.02, .55, d.y), .6));
  float g = max(dot(d, uSunDir), 0.);
  c += glow * (pow(g, 6.) * .35 + pow(g, 60.) * 1.2 + smoothstep(.9993, .9997, g) * 12.);
  vec2 cq = d.xz / (d.y + .06) * .35 + uTime * vec2(.012, .004);
  float cl = 0., ca = .5;
  for (int i = 0; i < 4; i++) { vec2 ip = floor(cq), fp = fract(cq); fp = fp * fp * (3. - 2. * fp); float hv = mix(mix(h1(dot(ip, vec2(1., 57.))), h1(dot(ip + vec2(1., 0.), vec2(1., 57.))), fp.x), mix(h1(dot(ip + vec2(0., 1.), vec2(1., 57.))), h1(dot(ip + vec2(1., 1.), vec2(1., 57.))), fp.x), fp.y); cl += ca * hv; cq = cq * 2.1 + vec2(1.7, 9.2); ca *= .5; }
  float cloud = smoothstep(.54, .86, cl / .9375) * smoothstep(.12, .3, d.y) * (1. - smoothstep(.5, .85, d.y));
  c = mix(c, mix(haze * 1.12, glow * 1.2, .3 + .5 * az) * (.86 + .22 * smoothstep(.62, .92, cl / .9375)), cloud * .55);
  float a = atan(d.x, -d.z);
  float sa = atan(uSunDir.x, -uSunDir.z);
  vec3 rimC = glow * pow(az, 4.) * .5;
  vec3 snow = lin(uSnow) * .82;
  float hk = clamp(uHazeK, 0., 2.);
  vec3 far = sky * .42 + haze * .1 + lin(uFoliage) * .2;
  if (uLake > .5) {
    vec3 veil = mix(hor, glow, .15 * az);
    c = range(c, d.y, a, 1.25, 4., 0., .1, mix(far, veil, clamp(.45 * hk, 0., .8)), veil, mix(snow * (.8 + .2 * az), veil, .3 * hk), .26 - .1 * uSnowK, rimC, sa, .0025);
    vec3 midL = sky * .3 + haze * .06 + lin(uFoliage) * .35;
    c = range(c, d.y, a, 2.3, 9., 0., .06, mix(midL, veil, clamp(.38 * hk, 0., .8)), veil, mix(snow * .86, veil, .22 * hk), .34 - .12 * uSnowK, rimC, sa, .002);
    vec3 shoreL = lin(uFoliage) * 1.05 + sky * .07;
    c = range(c, d.y, a, 4.6, 15., 0., .022, mix(shoreL, veil, clamp(.24 * hk, 0., .7)), mix(hor, veil, .5), mix(snow * .9, veil, .14 * hk), .62 - .2 * uSnowK, rimC, sa, .0015);
    return c;
  }
  c = range(c, d.y, a, 1.6, 2., 0., .36, mix(far, hor, .16 * hk), mix(hor, far, .35), mix(snow * (.72 + .2 * az), hor, .2 * hk), .32 - .12 * uSnowK, rimC, sa, .004);
  vec3 midC = sky * .3 + lin(uFoliage) * .5;
  c = range(c, d.y, a, 2.6, 7., -.005, .2, mix(midC, hor, .24 * hk), mix(hor, haze, .3), mix(snow * .85, hor, .2 * hk), .45 - .2 * uSnowK, rimC, sa, .003);
  vec3 nearC = lin(uFoliage) * 1.15 + sky * .06;
  c = range(c, d.y, a, 4.5, 13., -.02, .1, mix(nearC, hor, .26 * hk), mix(hor, haze, .4), mix(snow * .9, hor, .16 * hk), 1.2 - .9 * uSnowK, rimC, sa, .0025);
  c = mix(c, mix(hor, lin(uMeadow) * .5, .2), smoothstep(-.04, -.25, d.y));
  return c;
}
float ripple(vec2 p){ return n2(p * .05 + uTime * vec2(.018, .011)) * .7 + n2(p * .11 + uTime * vec2(-.026, .02)) * .3; }
vec3 lake(vec3 d){
  float t = (uCam.y - ${LAKE_Y.toFixed(1)}) / max(-d.y, 1e-4);
  vec2 p = uCam.xz + d.xz * t;
  float h0 = ripple(p);
  vec2 gr = vec2(ripple(p + vec2(.8, 0.)) - h0, ripple(p + vec2(0., .8)) - h0);
  float k = .3 / (1. + t * .008);
  vec3 n = normalize(vec3(-gr.x * k, 1., -gr.y * k));
  vec3 r = reflect(d, n);
  r.y = max(r.y, .0004);
  float fres = .02 + .98 * pow(1. - clamp(dot(n, -d), 0., 1.), 5.);
  vec3 sky = lin(uSky), haze = lin(uHaze);
  vec3 deep = (sky * .45 + lin(uFoliage) * .55) * .2;
  vec3 c = mix(deep, skyCol(r) * .72, clamp(fres * .9, 0., 1.));
  float az = max(dot(normalize(d.xz + 1e-4), normalize(uSunDir.xz + 1e-4)), 0.);
  vec3 hor = mix(haze, lin(uGlow), .2 + .45 * pow(az, 3.));
  return mix(c, hor * .92, (1. - exp(-t * .0005 * uHazeK)) * .45);
}
void main(){
  vec3 d = normalize(vDir);
  vec3 c = skyCol(d);
  if (uLake > .5 && d.y < 0.) c = mix(c, lake(d), smoothstep(0., -.0015, d.y));
  gl_FragColor = vec4(c, 1.);
}`;

const FLAKE_VERTEX = `
uniform float uTime, uScale;
attribute float aS;
varying float vA;
void main(){
  vec3 p = position;
  p.y = fract(p.y - uTime * (.022 + .02 * aS));
  p.x = fract(p.x + uTime * .005 + sin(uTime * .7 + aS * 40.) * .004);
  p.z = fract(p.z + cos(uTime * .5 + aS * 31.) * .003);
  vec3 w = vec3(-25., -1., -15.) + p * vec3(40., 23., 40.);
  vec4 mv = modelViewMatrix * vec4(w, 1.);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uScale * (.55 + .8 * aS) / max(-mv.z, .1);
  vA = smoothstep(0., .06, p.y) * smoothstep(1., .9, p.y) * smoothstep(1.5, 4., -mv.z);
}`;

const FLAKE_FRAGMENT = `
uniform vec3 uCol;
uniform float uFall;
varying float vA;
void main(){
  float a = smoothstep(.5, .1, length(gl_PointCoord - .5)) * vA * uFall;
  if (a < .01) discard;
  gl_FragColor = vec4(uCol, a * .85);
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
  c *= 1. - .2 * pow(length((vUv - .5) * vec2(1.1, 1.)) * 1.3, 2.4);
  c = mix(c, uHaze, uFade);
  c += (hash(gl_FragCoord.xy + fract(uTime * 7.3) * 113.) - .5) * .015;
  gl_FragColor = vec4(c, 1.);
}`;

const ease = (x: number) => {
  const c = THREE.MathUtils.clamp(x, 0, 1);
  return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
};

const golden = LIGHT_PRESETS.golden;

const chalet: EnvModule = {
  id: "chalet",
  title: "Chalet",
  palette: {
    uSky: { cssVar: "--chalet-sky", label: "Sky", fallback: golden.colors.sky },
    uHaze: { cssVar: "--chalet-haze", label: "Haze", fallback: golden.colors.haze },
    uGlow: { cssVar: "--chalet-sun", label: "Sun", fallback: golden.colors.sun },
    uClad: { cssVar: "--chalet-cladding", label: "Cladding", fallback: "#9c6f45" },
    uRoof: { cssVar: "--chalet-roof", label: "Roof", fallback: "#3a3c40" },
    uStone: { cssVar: "--chalet-stone", label: "Stone", fallback: "#a29c90" },
    uFrame: { cssVar: "--chalet-frame", label: "Frames", fallback: "#26221e" },
    uDeck: { cssVar: "--chalet-deck", label: "Deck", fallback: "#9c7b58" },
    uGlass: { cssVar: "--chalet-glass", label: "Glass", fallback: "#2a3236" },
    uPaving: { cssVar: "--chalet-path", label: "Path", fallback: "#b9b2a6" },
    uMeadow: { cssVar: "--chalet-meadow", label: "Meadow", fallback: "#6f8c48" },
    uFoliage: { cssVar: "--chalet-foliage", label: "Conifers", fallback: "#1d3324" },
    uSnow: { cssVar: "--chalet-snow", label: "Snow", fallback: "#e9eef5" },
  },
  params: [
    lightParam,
    { key: "sun", label: "Sun angle", min: -3.14, max: 3.14, step: 0.01, value: golden.sun },
    { key: "sunHeight", label: "Sun height", min: 0.04, max: 0.9, step: 0.01, value: golden.sunHeight },
    { key: "roofPitch", label: "Roof pitch", min: 0.7, max: 1.4, step: 0.05, value: 1 },
    { key: "deck", label: "Glass deck", min: 0, max: 1, step: 1, value: 1 },
    { key: "annex", label: "Stone annex", min: 0, max: 1, step: 1, value: 1 },
    { key: "snow", label: "Snow", min: 0, max: 1, step: 0.05, value: 0 },
    { key: "snowfall", label: "Falling snow", min: 0, max: 1, step: 0.05, value: 0 },
    { key: "lake", label: "Alpine lake", min: 0, max: 1, step: 1, value: 0 },
    { key: "haze", label: "Haze", min: 0, max: 3, step: 0.05, value: 1 },
    { key: "bloom", label: "Bloom", min: 0, max: 2, step: 0.05, value: 1 },
    { key: "exposure", label: "Exposure", min: 0.5, max: 2, step: 0.05, value: 1 },
    { key: "glide", label: "Camera glide", min: 0, max: 2, step: 0.05, value: 1 },
  ],
  fov: [38, 58],
  travelPerScreen: 0,
  creep: 0,
  hover: { liquid: 0.25, turn: 0 },
  resolution: 1,
  antialias: false,
  variants: {
    ...lightVariants({ sky: "--chalet-sky", haze: "--chalet-haze", sun: "--chalet-sun" }),
    summer: {
      params: { light: 0, sun: golden.sun, sunHeight: golden.sunHeight, snow: 0, snowfall: 0 },
      colors: { "--chalet-sky": golden.colors.sky, "--chalet-haze": golden.colors.haze, "--chalet-sun": golden.colors.sun, "--chalet-meadow": "#6f8c48" },
    },
    winter: {
      params: { light: 1, sun: 2.1, sunHeight: 0.2, snow: 1, snowfall: 0.6, lake: 1, exposure: 0.85, bloom: 0.8 },
      colors: { "--chalet-sky": "#6e8db9", "--chalet-haze": "#dde3ec", "--chalet-sun": "#ffe4cc", "--chalet-meadow": "#d6dde6", "--chalet-foliage": "#1a2c25" },
    },
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
      uBoxC: { value: Array.from({ length: NB }, () => new THREE.Vector4()) },
      uBoxH: { value: Array.from({ length: NB }, () => new THREE.Vector3()) },
      uBoxN: { value: 0 },
      uSunDir: { value: sunDir },
      uSunCol: { value: new THREE.Color() },
      uSnowCol: { value: new THREE.Color() },
      uSnowK: { value: 0 },
      uLake: { value: 0 },
      uMist: { value: 0 },
      uFogK: { value: 1 },
      uWin: { value: 0 },
      uEave: { value: new THREE.Vector4() },
      uEaveZ: { value: new THREE.Vector2() },
    };

    const patch = <M extends THREE.MeshStandardMaterial>(m: M) => {
      m.onBeforeCompile = (s) => {
        Object.assign(s.uniforms, shared);
        s.vertexShader = "varying vec3 vChW, vChN;\n" + s.vertexShader.replace("#include <project_vertex>", "#include <project_vertex>\nvec4 hW = vec4(transformed, 1.);\n#ifdef USE_INSTANCING\nhW = instanceMatrix * hW;\n#endif\nvChW = (modelMatrix * hW).xyz;\nvChN = normalize(mat3(modelMatrix) * objectNormal);");
        s.fragmentShader = PARS + s.fragmentShader.replace("#include <color_fragment>", SNOW_CHUNK).replace("#include <metalnessmap_fragment>", SNOW_SURFACE).replace("#include <normal_fragment_maps>", SNOW_NORMAL).replace("#include <aomap_fragment>", AO_CHUNK).replace("#include <emissivemap_fragment>", WIN_CHUNK).replace("#include <fog_fragment>", FOG_CHUNK);
      };
      m.customProgramCacheKey = () => "chalet";
      return keep(m);
    };
    const maps = (t: ReturnType<typeof bake>) => {
      keep(t.map);
      keep(t.normalMap);
      keep(t.roughnessMap);
      return t;
    };
    const mats: Record<Kind, THREE.MeshStandardMaterial> = {
      clad: patch(new THREE.MeshStandardMaterial({ ...maps(bake(512, 2.6, boardTexel)), roughness: 1, normalScale: new THREE.Vector2(1.1, 1.1) })),
      stone: patch(new THREE.MeshStandardMaterial({ ...maps(bake(512, 3, stoneTexel)), roughness: 1, normalScale: new THREE.Vector2(1.3, 1.3) })),
      roof: patch(new THREE.MeshStandardMaterial({ ...maps(bake(256, 2, roofTexel)), roughness: 1, metalness: 0.35 })),
      frame: patch(new THREE.MeshStandardMaterial({ roughness: 0.5 })),
      deck: patch(new THREE.MeshStandardMaterial({ ...maps(bake(512, 2.4, deckTexel)), roughness: 1 })),
      paving: patch(new THREE.MeshStandardMaterial({ ...maps(bake(256, 2, pavingTexel)), roughness: 1 })),
      glass: patch(new THREE.MeshPhysicalMaterial({ roughness: 0.04, metalness: 0, ior: 1.5, specularIntensity: 1, specularColor: new THREE.Color(2.6, 2.6, 2.6), envMapIntensity: 1.7 })),
      rail: patch(new THREE.MeshPhysicalMaterial({ transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide, roughness: 0.04, ior: 1.5, envMapIntensity: 1.1 })),
    };

    const grnd = (() => {
      let gs = 17;
      return () => (gs = (gs * 16807) % 2147483647) / 2147483647;
    })();

    const terrainGeo = new THREE.PlaneGeometry(2, 2, 200, 200).rotateX(-Math.PI / 2);
    const tp = terrainGeo.attributes.position;
    const stretch = (u: number) => 450 * (0.25 * u + 0.75 * u * Math.abs(u));
    for (let i = 0; i < tp.count; i++) {
      const x = -6 + stretch(tp.getX(i)), z = 4 + stretch(tp.getZ(i));
      tp.setXYZ(i, x, ground(x, z), z);
    }
    terrainGeo.computeVertexNormals();
    const meadowMat = patch(new THREE.MeshStandardMaterial({ ...maps(bake(256, 2, meadowTexel)), roughness: 1 }));
    meadowMat.defines = { ...meadowMat.defines, CH_GROUND: "" };
    const terrain = new THREE.Mesh(keep(project(terrainGeo, 3)), meadowMat);
    terrain.receiveShadow = true;
    world.add(terrain);

    const rockMat = patch(new THREE.MeshStandardMaterial({ ...maps(bake(256, 2.4, rockTexel)), roughness: 1 }));
    const rocks: THREE.BufferGeometry[] = [];
    const pathPts = Array.from({ length: 15 }, (_, i) => {
      const k = i / 14;
      return [-3.25 - k * 8.5 - Math.sin(k * 3) * 1.6, 5.5 + k * 12];
    });
    const free = (x: number, z: number, m = 0) =>
      !(x > -7.4 - m && x < 11.6 + m && z > -10.8 - m && z < 4.6 + m) &&
      !(x > -13.1 - m && x < -5.8 + m && z > -1.8 - m && z < 5.6 + m) &&
      pathPts.every(([px, pz]) => Math.hypot(x - px, z - pz) > 1.1 + m);
    const scatter = (n: number, m: number, leftBias: number) => {
      const out: [number, number][] = [];
      for (let tries = 0; out.length < n && tries < n * 30; tries++) {
        const a = -42 + grnd() * 58, b = -26 + grnd() * 52;
        if (a > 0 && grnd() < leftBias) continue;
        const x = (a + b) * 0.7071, z = (a - b) * 0.7071 - 3;
        if (free(x, z, m)) out.push([x, z]);
      }
      return out;
    };
    const rockSpots: [number, number, number][] = [[-8.6, 8.6, 0.7], [-7.6, 10.6, 0.45], [8.4, 6.2, 1.4], [11, 2.4, 0.9], [-11, -6, 1.2], [6.6, 9.6, 0.7], [14, -2, 1.3]];
    for (const [x, z] of scatter(56, 0.6, 0.55)) rockSpots.push([x, z, 0.12 + Math.pow(grnd(), 3) * (Math.hypot(x + 21.5, z - 21.5) < 20 ? 0.45 : 1.7)]);
    for (const [x, z, s] of rockSpots) {
      const ico = new THREE.IcosahedronGeometry(1, s > 0.5 ? 4 : 3);
      ico.deleteAttribute("normal");
      ico.deleteAttribute("uv");
      const g = mergeVertices(ico);
      ico.dispose();
      const rp = g.attributes.position;
      g.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(rp.count * 2), 2));
      const seed = Math.round(x * 7 + z * 13);
      for (let i = 0; i < rp.count; i++) {
        const vx = rp.getX(i), vy = rp.getY(i), vz = rp.getZ(i);
        const k = 0.78 + 0.36 * vnoise(vx * 1.6 + 9, vz * 1.6 + vy * 1.3 + 9, 4096, 4096, seed) + 0.1 * vnoise(vx * 4 + 3, vy * 4 + vz * 2 + 3, 4096, 4096, seed + 1);
        rp.setXYZ(i, vx * k, Math.max(vy * k, -0.2), vz * k);
      }
      g.computeVertexNormals();
      g.scale(s * (1 + grnd() * 0.4), s * 0.62, s).rotateY(grnd() * Math.PI).translate(x, ground(x, z) - s * 0.16, z);
      rocks.push(project(g, 2));
    }
    const rock = new THREE.Mesh(keep(mergeGeometries(rocks)!), rockMat);
    for (const g of rocks) g.dispose();
    rock.castShadow = rock.receiveShadow = true;
    world.add(rock);

    const yard = { bark: [] as THREE.BufferGeometry[], leaves: [] as THREE.BufferGeometry[] };
    const grow = grower((k, g) => yard[k].push(g), grnd);
    for (const [x, z, h] of [[7.5, -15, 15], [12.5, -10.5, 12], [-1.5, -17.5, 16], [16.5, -3.5, 11], [3.5, -22, 13], [20, -12, 14], [19.5, 4, 10.5], [24, -1, 13], [-6.5, -16, 12]]) conifer(grow, grnd, x, ground(x, z), z, h);
    for (const [x, z, r] of [[-1.6, 4.3, 0.5], [2.6, 4.2, 0.6], [4.4, 4.4, 0.45], [10.8, 0.4, 0.55]]) grow.bush(x, ground(x, z), z, r);
    const firs: [number, number][] = [];
    for (const [x, z] of scatter(40, 0.6, 1)) if (x + z < -10) {
      firs.push([x, z]);
      conifer(grow, grnd, x, ground(x, z), z, 0.8 + Math.pow(grnd(), 2) * 2.2, 8, 2);
    }
    for (const [x, z, h] of [[-14, 1, 4.2], [-16.5, -3, 5.6], [-12.5, 8.5, 3.1], [-19, 4, 3.6], [-15, 12, 2.4]]) conifer(grow, grnd, x, ground(x, z), z, h, 14, 3);
    const leafMat = sway(patch(new THREE.MeshStandardMaterial({ map: keep(leafTexture({ hue: 136, spread: 30, sat: 26, light: 6, seed: 11 })), alphaTest: 0.4, alphaToCoverage: true, roughness: 0.8, color: 0xc8dccf })));
    leafMat.defines = { ...leafMat.defines, CH_LEAF: "" };
    const tufts = [
      { tex: { hue: 82, spread: 34, sat: 30, light: 12, seed: 61 }, n: 2, size: 0.3, lift: 0.06, count: 460 },
      { tex: { hue: 46, spread: 12, sat: 78, light: 38, seed: 62 }, n: 1, size: 0.13, lift: 0.16, count: 150 },
      { tex: { hue: 262, spread: 28, sat: 42, light: 36, seed: 63 }, n: 1, size: 0.13, lift: 0.16, count: 120 },
      { tex: { hue: 40, spread: 6, sat: 14, light: 62, seed: 64 }, n: 1, size: 0.11, lift: 0.15, count: 110 },
    ].map(({ tex, n, size, lift, count }) => {
      const geos: THREE.BufferGeometry[] = [];
      const tg = grower((_, g) => geos.push(g), grnd);
      for (const [x, z] of scatter(count, 0.15, 0.5)) tg.foliage(new THREE.Vector3(x, ground(x, z) + lift, z), size * 0.9, size * 0.35, n, size, undefined, 0.6);
      const mat = sway(patch(new THREE.MeshStandardMaterial({ map: keep(leafTexture({ ...tex, photo: false })), alphaTest: 0.4, alphaToCoverage: true, roughness: 0.85 })));
      const mesh = new THREE.Mesh(keep(mergeGeometries(geos)!), mat);
      for (const g of geos) g.dispose();
      mesh.receiveShadow = true;
      world.add(mesh);
      return mesh;
    });
    const barkMat = patch(new THREE.MeshStandardMaterial({ map: keep(barkTexture(0x3b2f27)), roughness: 0.9 }));
    for (const [geos, mat] of [[yard.bark, barkMat], [yard.leaves, leafMat]] as const) {
      const merged = mergeGeometries(geos);
      for (const g of geos) g.dispose();
      const m = new THREE.Mesh(keep(merged!), mat);
      m.castShadow = m.receiveShadow = true;
      world.add(m);
    }

    const protos = [13, 14, 15].map((tiers) => {
      const part = { bark: [] as THREE.BufferGeometry[], leaves: [] as THREE.BufferGeometry[] };
      conifer(grower((k, g) => part[k].push(g), grnd), grnd, 0, 0, 0, 10, tiers, 2, true);
      const out = { bark: mergeGeometries(part.bark)!, leaves: mergeGeometries(part.leaves)! };
      for (const g of [...part.bark, ...part.leaves]) g.dispose();
      return { ...out, mats: [] as THREE.Matrix4[], tints: [] as THREE.Color[] };
    });
    const q = new THREE.Quaternion();
    const yAxis = new THREE.Vector3(0, 1, 0);
    for (let i = 0; i < 900; i++) {
      const a = -80 + grnd() * 170, b = -12 + grnd() * 150;
      if (b < 20 && a < 18) continue;
      if (a < -6 && b < 58) continue;
      const x = (a + b) * 0.7071, z = (a - b) * 0.7071 - 3;
      if (vnoise(x * 0.035, z * 0.035, 4096, 4096, 9) < 0.42) continue;
      const s = (11 + grnd() * 9) / 10, wd = 0.85 + grnd() * 0.35;
      const p = protos[Math.floor(grnd() * protos.length)];
      p.mats.push(new THREE.Matrix4().compose(new THREE.Vector3(x, ground(x, z) - s * 0.3, z), q.setFromAxisAngle(yAxis, grnd() * Math.PI * 2), new THREE.Vector3(s * wd, s, s * wd)));
      p.tints.push(new THREE.Color().setRGB(0.5 + grnd() * 0.22, 0.6 + grnd() * 0.2, 0.62 + grnd() * 0.2));
    }
    for (const p of protos) {
      for (const [geo, mat] of [[p.bark, barkMat], [p.leaves, leafMat]] as const) {
        const im = new THREE.InstancedMesh(keep(geo), mat, p.mats.length);
        p.mats.forEach((m, i) => im.setMatrixAt(i, m));
        p.tints.forEach((c, i) => im.setColorAt(i, c));
        im.computeBoundingSphere();
        im.castShadow = true;
        world.add(im);
      }
    }

    const rimYaw = Math.atan2(23.5, 24);
    const rimPts: THREE.Vector2[] = [];
    for (let deg = 8; deg <= 62; deg += 2) {
      const ang = rimYaw - (deg * Math.PI) / 180, dx = Math.sin(ang), dz = -Math.cos(ang);
      let D = 10;
      while (D < 200 && ground(-21.5 + dx * D, 21.5 + dz * D) > -0.5) D += 0.25;
      rimPts.push(new THREE.Vector2(-21.5 + dx * (D - 1.2), 21.5 + dz * (D - 1.2)));
    }
    const wallGeos = rimPts.slice(1).flatMap((p, i) => {
      const q = rimPts[i], m = p.clone().add(q).multiplyScalar(0.5);
      if (firs.some(([x, z]) => Math.hypot(x - m.x, z - m.y) < 1.6)) return [];
      const g = new RoundedBoxGeometry(p.distanceTo(q) + 0.3, 0.5, 0.55, 2, 0.08).rotateY(-Math.atan2(p.y - q.y, p.x - q.x));
      return [project(g.translate(m.x, Math.min(ground(p.x, p.y), ground(q.x, q.y)) + 0.1, m.y), TILE.stone)];
    });
    const rimWall = new THREE.Mesh(keep(mergeGeometries(wallGeos)!), mats.stone);
    for (const g of wallGeos) g.dispose();
    rimWall.castShadow = rimWall.receiveShadow = true;
    world.add(rimWall);

    const flakeN = small ? 1200 : 2600;
    const flakePos = new Float32Array(flakeN * 3);
    const flakeSeed = new Float32Array(flakeN);
    for (let i = 0; i < flakeN; i++) {
      flakePos.set([grnd(), grnd(), grnd()], i * 3);
      flakeSeed[i] = grnd();
    }
    const flakeGeo = keep(new THREE.BufferGeometry());
    flakeGeo.setAttribute("position", new THREE.BufferAttribute(flakePos, 3));
    flakeGeo.setAttribute("aS", new THREE.BufferAttribute(flakeSeed, 1));
    const flakeMat = keep(new THREE.ShaderMaterial({ vertexShader: FLAKE_VERTEX, fragmentShader: FLAKE_FRAGMENT, uniforms: { uTime: shared.uTime, uScale: { value: 1 }, uFall: { value: 0 }, uCol: { value: new THREE.Color() } }, transparent: true, depthWrite: false }));
    const flakes = new THREE.Points(flakeGeo, flakeMat);
    flakes.frustumCulled = false;
    flakes.renderOrder = 3;
    world.add(flakes);

    const skyUniforms = { ...colors, uSunDir: { value: sunDir }, uHazeK: { value: 1 }, uTime: shared.uTime, uSnowK: shared.uSnowK, uLake: shared.uLake, uCam: { value: camera.position } };
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
    Object.assign(sh.camera, { left: -38, right: 38, top: 30, bottom: -30, near: 20, far: 200 });
    sh.camera.updateProjectionMatrix();
    sh.bias = -0.0004;
    sh.normalBias = 0.025;
    sh.radius = 4;
    sunLight.target.position.set(1.5, 3, -3);
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
      const { parts, occ, eave, eaveZ } = layout(p);
      shared.uEave.value.fromArray(eave);
      shared.uEaveZ.value.fromArray(eaveZ);
      for (const kind of KINDS) {
        let geos = parts[kind];
        if (!geos.length) continue;
        if (kind === "roof") for (const g of geos) projectRoof(g, TILE[kind]);
        else if (kind !== "glass") for (const g of geos) project(g, TILE[kind]);
        if (geos.some((g) => !g.index)) {
          const flat = geos.map((g) => (g.index ? g.toNonIndexed() : g));
          for (const g of geos) if (!flat.includes(g)) g.dispose();
          geos = flat;
        }
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
    const finalMat = flat(FINAL_FRAGMENT, { uMain: { value: mainRT.texture }, uBloom: { value: bloomB.texture }, uHaze: colors.uHaze, uBloomK: { value: 1 }, uFade: { value: 0 }, uTime: { value: 0 }, uExposure: { value: 1 }, uSat: { value: 1 }, uLift: { value: new THREE.Vector3() }, uWarm: { value: new THREE.Vector3() }, uCool: { value: new THREE.Vector3() } });
    scene.add(screen(finalMat));

    const tint: [THREE.Material & { color: THREE.Color }, string][] = [
      [mats.clad, "uClad"],
      [mats.stone, "uStone"],
      [mats.roof, "uRoof"],
      [mats.frame, "uFrame"],
      [mats.deck, "uDeck"],
      [mats.paving, "uPaving"],
      [mats.glass, "uGlass"],
      [mats.rail, "uGlass"],
      [meadowMat, "uMeadow"],
      [rockMat, "uStone"],
    ];
    const lin = (k: string, c: THREE.Color) => {
      const v = colors[k].value;
      return c.setRGB(v.x, v.y, v.z, THREE.SRGBColorSpace);
    };
    const size = new THREE.Vector2();
    const rig = cameraRig(camera, pointer, {
      base: small ? new THREE.Vector3(-11, 1.9, 34) : new THREE.Vector3(-21.5, 1.9, 21.5),
      focus: small ? new THREE.Vector3(2.5, 4.4, -2) : new THREE.Vector3(2, 4.4, -2.5),
      yaw: small ? 0 : 0.14,
    });
    let structKey = "";
    let envKey = "";
    let shadowKey = "";

    return {
      update(frame) {
        const { time, intro, params } = frame;
        const sk = ["roofPitch", "deck", "annex"].map((k) => params[k]).join();
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
        shared.uTime.value = time;
        shared.uSnowK.value = params.snow;
        shared.uLake.value = params.lake > 0.5 ? 1 : 0;
        rimWall.visible = params.lake > 0.5;
        lin("uSnow", shared.uSnowCol.value).multiplyScalar(0.8);
        skyUniforms.uHazeK.value = params.haze;

        for (const [m, k] of tint) lin(k, m.color);
        lin("uGlow", sunLight.color);
        shared.uSunCol.value.copy(sunLight.color);
        sunLight.intensity = 7.4 * lp.sunK * THREE.MathUtils.smoothstep(el, -0.02, 0.12) * (1 + 0.03 * Math.sin(time * 0.4) + 0.015 * Math.sin(time * 1.1));
        world.environmentIntensity = lp.fill;
        lin("uSky", hemi.color);
        lin("uMeadow", hemi.groundColor).lerp(sunLight.color, 0.2).multiplyScalar(0.8);
        hemi.intensity = lp.bounce;
        bounce.color.copy(hemi.groundColor).lerp(sunLight.color, 0.5);
        bounce.intensity = sunLight.intensity * 0.12 * lp.bounce;
        mats.glass.color.multiplyScalar(0.18);
        mats.glass.emissive.setRGB(1, 0.58, 0.26).multiplyScalar(2.6);
        shared.uWin.value = lp.windows;
        meadowMat.color.multiplyScalar(1.1);
        lin("uHaze", fog.color);
        const k = ease(intro / 2.8);
        fog.density = 0.0032 * params.haze * lp.fog + (1 - k) * 0.03;
        shared.uFogK.value = params.haze * lp.fog;
        shared.uMist.value = lp.mist;

        flakes.visible = params.snowfall > 0.01;
        for (const t of tufts) t.visible = params.snow < 0.3;
        flakeMat.uniforms.uFall.value = params.snowfall;
        lin("uSnow", flakeMat.uniforms.uCol.value).lerp(fog.color, 0.3);

        const ek = [params.sun, el, params.haze, params.snow, params.lake,...["uSky", "uHaze", "uGlow", "uFoliage", "uMeadow", "uSnow"].map((c) => colors[c].value.toArray().join())].join();
        const target = renderer.getRenderTarget();
        if (ek !== envKey) {
          envKey = ek;
          const next = pmrem.fromScene(envScene, 0, 0.5, 500);
          envRT?.dispose();
          envRT = next;
          world.environment = next.texture;
          mats.glass.envMap = mats.rail.envMap = next.texture;
        }
        const shk = `${structKey}|${params.sun}|${el}|${params.lake}`;
        if (shk !== shadowKey) {
          shadowKey = shk;
          renderer.shadowMap.needsUpdate = true;
        }

        rig(frame, params.glide);
        sky.position.copy(camera.position);

        renderer.getDrawingBufferSize(size);
        const w = Math.max(2, size.x), h = Math.max(2, size.y);
        flakeMat.uniforms.uScale.value = (0.045 * h) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
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

export default chalet;

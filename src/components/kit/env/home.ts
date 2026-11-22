import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { EnvModule } from "@/components/kit/env/EnvStage";
import { cameraRig } from "@/components/kit/env/cameraRig";
import { barkTexture, grower, hedger, leafTexture, sway } from "@/components/kit/env/trees";
import { LIGHT_PRESETS, lightParam, lightPreset, lightVariants } from "@/components/kit/env/lightPresets";

const NB = 40;
const KINDS = ["siding", "brick", "roof", "trim", "door", "panel", "concrete", "paving", "glass"] as const;
type Kind = (typeof KINDS)[number];
const TILE: Record<Kind, number> = { siding: 2.4, brick: 2.4, roof: 2.4, trim: 1, door: 1, panel: 2.4, concrete: 2.4, paving: 2.4, glass: 1 };

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

const sidingTexel = (u: number, v: number): Texel => {
  const rows = 12;
  const y = v * rows;
  const row = Math.floor(y);
  const f = y - row;
  const k = hashi(row, 3, 11);
  const grain = fbm(u, v, 4, 96, 12 + (row % 4) * 3, 3);
  const fine = fbm(u, v, 64, 64, 14, 2);
  const shade = mix(1, 0.6, sm(0.8, 1, f)) * mix(0.92, 1, sm(0, 0.05, f));
  const t = (0.95 + 0.04 * k) * (0.97 + 0.05 * grain) * (0.97 + 0.04 * fine) * shade;
  return { c: [t, t, t * 0.99], h: (1 - f) * 0.9 + grain * 0.03, r: 0.7 + 0.15 * fine };
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

const shingleTexel = (u: number, v: number): Texel => {
  const rows = 10, cols = 8;
  const y = v * rows;
  const row = Math.floor(y);
  const f = y - row;
  const x = u * cols + (row % 2) * 0.5 + (hashi(wrap(row, rows), 1, 50) - 0.5) * 0.2;
  const col = wrap(Math.floor(x), cols);
  const fx = x - Math.floor(x);
  const gap = sm(0.006, 0.03, Math.min(fx, 1 - fx));
  const k = hashi(col, wrap(row, rows), 51);
  const grain = fbm(u, v, 96, 96, 52, 3);
  const patch = fbm(u, v, 4, 4, 53, 3);
  const shade = mix(0.5, 1, sm(0, 0.28, f)) * mix(0.55, 1, gap);
  const t = (0.72 + 0.4 * k) * (0.8 + 0.35 * grain) * (0.9 + 0.2 * patch) * shade;
  return { c: [t, t * 0.99, t * 0.97], h: (f * 0.7 + grain * 0.2) * mix(0.4, 1, gap), r: 0.82 + 0.15 * grain };
};

const panelTexel = (u: number, v: number): Texel => {
  const x = u * 4, y = v * 4;
  const fx = x - Math.floor(x), fy = y - Math.floor(y);
  const ex = Math.min(fx, 1 - fx), ey = Math.min(fy, 1 - fy);
  const groove = sm(0, 0.025, ey);
  const raise = sm(0.07, 0.13, ex) * sm(0.1, 0.18, ey);
  const fine = fbm(u, v, 32, 32, 91, 2);
  const t = (0.9 + 0.05 * raise + 0.02 * fine) * mix(0.55, 1, groove);
  return { c: [t, t, t], h: raise * 0.6 + groove * 0.4, r: 0.55 };
};

const concreteTexel = (u: number, v: number): Texel => {
  const x = u * 2, y = v * 2;
  const fx = x - Math.floor(x), fy = y - Math.floor(y);
  const joint = sm(0, 0.006, Math.min(fx, 1 - fx)) * sm(0, 0.006, Math.min(fy, 1 - fy));
  const mottle = fbm(u, v, 6, 6, 21, 4);
  const speck = fbm(u, v, 128, 128, 22, 2);
  const k = hashi(Math.floor(x), Math.floor(y), 23);
  const t = (0.86 + 0.08 * k) * (0.88 + 0.18 * mottle) * (0.95 + 0.08 * speck) * mix(0.6, 1, joint);
  return { c: [t, t * 0.99, t * 0.97], h: joint * 0.6 + speck * 0.1, r: 0.8 + 0.15 * speck };
};

const pavingTexel = (u: number, v: number): Texel => {
  const rows = 8;
  const y = v * rows;
  const row = Math.floor(y);
  const x = u * 4 + (row % 2) * 0.5;
  const fx = x - Math.floor(x), fy = y - row;
  const joint = sm(0, 0.03, Math.min(fx, 1 - fx)) * sm(0, 0.05, Math.min(fy, 1 - fy));
  const k = hashi(wrap(Math.floor(x), 4), wrap(row, rows), 41);
  const speck = fbm(u, v, 64, 64, 42, 3);
  const t = (0.84 + 0.16 * k) * (0.9 + 0.18 * speck) * mix(0.55, 1, joint);
  return { c: [t, t * 0.98, t * 0.95], h: joint * (0.8 + 0.12 * speck), r: 0.75 + 0.2 * speck };
};

const lawnTexel = (u: number, v: number): Texel => {
  const blade = fbm(u, v, 128, 128, 101, 2);
  const clump = fbm(u, v, 8, 8, 102, 4);
  const t = (0.78 + 0.3 * clump) * (0.85 + 0.3 * blade);
  return { c: [t * 0.96, t, t * 0.86], h: blade * 0.6 + clump * 0.2, r: 0.95 };
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
    parts[kind].push(new RoundedBoxGeometry(w, t, l, 2, Math.min(0.03, t * 0.4)).rotateX(ang).translate(cx, cy, cz));
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
    const d = f.at + f.dir * 0.014;
    parts.glass.push(f.axis === "z" ? g.translate((a0 + a1) / 2, (b0 + b1) / 2, d) : g.translate(d, (b0 + b1) / 2, (a0 + a1) / 2));
  };
  const shutters = p.shutters > 0.5;
  const win = (f: Face, ac: number, y0: number, w: number, h: number) => {
    const a0 = ac - w / 2, a1 = ac + w / 2, c = 0.11, m = 0.032;
    put("trim", f, a0 - c, a1 + c, y0 + h, y0 + h + c + 0.04, 0, 0.08);
    put("trim", f, a0 - c - 0.05, a1 + c + 0.05, y0 - 0.07, y0, 0, 0.1);
    put("trim", f, a0 - c, a0, y0, y0 + h, 0, 0.065);
    put("trim", f, a1, a1 + c, y0, y0 + h, 0, 0.065);
    pane(f, a0, a1, y0, y0 + h / 2, Math.round(ac * 13 + y0 * 7));
    pane(f, a0, a1, y0 + h / 2, y0 + h, Math.round(ac * 17 + y0 * 5 + 3));
    put("trim", f, a0, a1, y0 + h / 2 - 0.035, y0 + h / 2 + 0.035, 0, 0.05, 0.005);
    put("trim", f, a0, a1, y0 + h - 0.05, y0 + h, 0, 0.04, 0.005);
    put("trim", f, a0, a1, y0, y0 + 0.07, 0, 0.04, 0.005);
    put("trim", f, a0, a0 + 0.045, y0, y0 + h, 0, 0.04, 0.005);
    put("trim", f, a1 - 0.045, a1, y0, y0 + h, 0, 0.04, 0.005);
    put("trim", f, ac - m / 2, ac + m / 2, y0, y0 + h, 0, 0.03, 0);
    put("trim", f, a0, a1, y0 + h / 4 - m / 2, y0 + h / 4 + m / 2, 0, 0.03, 0);
    put("trim", f, a0, a1, y0 + (3 * h) / 4 - m / 2, y0 + (3 * h) / 4 + m / 2, 0, 0.03, 0);
    if (shutters) {
      put("door", f, a0 - c - 0.46, a0 - c - 0.04, y0 - 0.02, y0 + h + 0.06, 0, 0.045, 0.012);
      put("door", f, a1 + c + 0.04, a1 + c + 0.46, y0 - 0.02, y0 + h + 0.06, 0, 0.045, 0.012);
    }
  };
  const gable = (wall: Kind, x0: number, x1: number, zb: number, zf: number, top: number, pitch: number, over: number) => {
    const run = (zf - zb) / 2, zr = zb + run, rise = run * pitch, ang = Math.atan(pitch), t = 0.16;
    const shape = new THREE.Shape();
    shape.moveTo(zb, top);
    shape.lineTo(zf, top);
    shape.lineTo(zr, top + rise);
    shape.closePath();
    parts[wall].push(new THREE.ExtrudeGeometry(shape, { depth: x1 - x0, bevelEnabled: false }).rotateY(-Math.PI / 2).translate(x1, 0, 0));
    const len = (run + over) / Math.cos(ang);
    const lift = t / 2 / Math.cos(ang);
    const cy = top + (rise - over * pitch) / 2 + lift;
    const w = x1 - x0 + 2 * over;
    slab("roof", (x0 + x1) / 2, cy, zr + (run + over) / 2, w, t, len, ang);
    slab("roof", (x0 + x1) / 2, cy, zr - (run + over) / 2, w, t, len, -ang);
    for (const x of [x0 - over, x1 + over]) {
      slab("trim", x, cy - 0.06, zr + (run + over) / 2, 0.07, 0.3, len, ang);
      slab("trim", x, cy - 0.06, zr - (run + over) / 2, 0.07, 0.3, len, -ang);
    }
    const ey = top - over * pitch;
    box("trim", [x0 - over, x1 + over, ey - 0.24, ey + 0.04, zf + over - 0.06, zf + over + 0.02], 0.02, false);
    box("trim", [x0 - over, x1 + over, ey - 0.24, ey + 0.04, zb - over - 0.02, zb - over + 0.06], 0.02, false);
    box("roof", [x0 - over, x1 + over, top + rise + lift - 0.04, top + rise + lift + 0.1, zr - 0.16, zr + 0.16], 0.05, false);
    return top + rise;
  };

  const F = 0.55, FH = 2.9;
  const two = p.floors > 1.5;
  const top = F + (two ? 2 : 1) * FH;
  const pitch = THREE.MathUtils.clamp(p.roofPitch, 0.3, 1.2);
  const wall: Kind = p.brick > 0.5 ? "brick" : "siding";
  const X0 = -7, X1 = 4.4, ZB = -7, ZF = 0;
  const front: Face = { axis: "z", at: ZF, dir: 1 };
  const side: Face = { axis: "x", at: X0, dir: -1 };

  box("concrete", [X0 - 0.05, X1, 0, F, ZB, ZF + 0.05], 0.02);
  box(wall, [X0, X1 - 0.01, F, top, ZB + 0.01, ZF], 0.02);
  box("trim", [X0 - 0.07, X0 + 0.12, F, top, ZF - 0.12, ZF + 0.07], 0.01, false);
  box("trim", [X0, X1, top - 0.26, top, ZF, ZF + 0.035], 0.005, false);
  box("trim", [X0 - 0.035, X0, top - 0.26, top, ZB, ZF], 0.005, false);
  const ridge = gable(wall, X0, X1, ZB, ZF, top, pitch, 0.5);

  box("brick", [X0 - 0.85, X0 + 0.02, 0, top - 0.4, -4.3, -2.7], 0.02);
  box("brick", [X0 - 0.75, X0 - 0.02, top - 0.4, ridge + 1, -4.1, -2.9], 0.02);
  box("concrete", [X0 - 0.84, X0 + 0.07, ridge + 1, ridge + 1.12, -4.2, -2.8], 0.02, false);

  const porch = p.porch > 0.5;
  const ground = [-5.4, -2.2, 1.4, 3.2];
  for (const x of ground) if (Math.abs(x + 0.6) > 1) win(front, x, F + 0.75, 0.95, 1.55);
  box("door", [-1.1, -0.1, F, F + 2.1, ZF - 0.02, ZF + 0.05], 0.01, false);
  for (const [b0, b1] of [[F + 0.2, F + 0.95], [F + 1.15, F + 1.9]]) {
    box("door", [-1.0, -0.65, b0, b1, ZF + 0.05, ZF + 0.075], 0.01, false);
    box("door", [-0.55, -0.2, b0, b1, ZF + 0.05, ZF + 0.075], 0.01, false);
  }
  put("trim", front, -1.24, -1.1, F, F + 2.1, 0, 0.07);
  put("trim", front, -0.1, 0.04, F, F + 2.1, 0, 0.07);
  put("trim", front, -1.28, 0.08, F + 2.1, F + 2.28, 0, 0.09);
  box("trim", [-0.28, -0.2, F + 1.0, F + 1.08, ZF + 0.05, ZF + 0.12], 0.01, false);
  if (two) for (const x of [-5.4, -2.2, 1, 3.2]) win(front, x, F + FH + 0.55, 0.95, 1.5);
  win(side, -6, F + 0.75, 0.9, 1.5);
  win(side, -1.2, F + 0.75, 0.9, 1.5);
  if (two) {
    win(side, -6, F + FH + 0.55, 0.9, 1.4);
    win(side, -1.2, F + FH + 0.55, 0.9, 1.4);
  }

  if (porch) {
    const pz = 2.6;
    box("concrete", [-3.4, 2.0, 0, F, ZF, pz], 0.03);
    for (let k = 1; k <= 3; k++) box("concrete", [-1.7, 0.5, (F * (k - 1)) / 3, (F * k) / 3, pz, pz + 0.36 * (4 - k)], 0.02);
    const pr = Math.min(F + FH + 0.55 - 0.15, top - 0.1);
    const drop = 0.4, depth = pz + 0.3;
    const beam = pr - drop - 0.32;
    for (const cx of [-3.15, -1.95, 0.75, 1.75]) {
      box("trim", [cx - 0.16, cx + 0.16, F, F + 0.22, pz - 0.42, pz - 0.1], 0.02, false);
      box("trim", [cx - 0.1, cx + 0.1, F + 0.22, beam - 0.12, pz - 0.36, pz - 0.16], 0.015, false);
      box("trim", [cx - 0.15, cx + 0.15, beam - 0.12, beam, pz - 0.41, pz - 0.11], 0.015, false);
    }
    box("trim", [-3.45, 2.05, beam, beam + 0.3, pz - 0.44, pz - 0.06], 0.02, false);
    const ang = Math.atan(drop / depth);
    slab("roof", -0.7, pr - drop / 2 + 0.08, depth / 2, 5.9, 0.14, Math.hypot(depth, drop), ang);
    box("trim", [-3.65, 2.25, pr - drop - 0.14, pr - drop + 0.06, depth - 0.04, depth + 0.02], 0.02, false);
  } else for (let k = 1; k <= 3; k++) box("concrete", [-1.5, 0.3, (F * (k - 1)) / 3, (F * k) / 3, ZF, ZF + 0.36 * (4 - k)], 0.02);

  if (p.garage > 0.5) {
    const g0 = X1, g1 = 10, gz = 0.6, gb = -6, gh = 2.95, dz = 0.42;
    box("concrete", [g0, g1, 0, 0.12, gb, gz], 0.01);
    box(wall, [g0, g1, 0.12, gh, gb, gz - dz], 0.02);
    box(wall, [g0, 4.8, 0.12, gh, gz - dz, gz], 0.02);
    box(wall, [9.6, g1, 0.12, gh, gz - dz, gz], 0.02);
    box(wall, [4.8, 9.6, 2.4, gh, gz - dz, gz], 0.02);
    box("panel", [4.8, 9.6, 0, 2.4, gz - 0.3, gz - 0.22], 0.006, false);
    box("trim", [4.66, 4.8, 0, 2.4, gz, gz + 0.05], 0.01, false);
    box("trim", [9.6, 9.74, 0, 2.4, gz, gz + 0.05], 0.01, false);
    box("trim", [4.66, 9.74, 2.4, 2.56, gz, gz + 0.06], 0.01, false);
    box("trim", [g1 - 0.12, g1 + 0.06, 0.12, gh, gz - 0.12, gz + 0.06], 0.01, false);
    box("trim", [g0, g1, gh - 0.22, gh, gz, gz + 0.035], 0.005, false);
    const run = (gz - gb) / 2;
    const gp = Math.max(0.08, Math.min(pitch, (top - 0.5 * pitch - 0.3 - gh) / (run + 0.4)));
    gable(wall, g0, g1, gb, gz, gh, gp, 0.4);
    box("concrete", [4.6, 9.8, -0.03, 0.02, gz, 22], 0.004, false);
  }

  const wy = 0.012;
  box("concrete", [-1.6, 0.4, -0.03, wy, porch ? 3.68 : 1.1, 10.5], 0.004, false);
  box("concrete", [-160, 160, -0.03, 0.016, 10.5, 12.3], 0.004, false);
  box("concrete", [-160, 160, 0, 0.15, 12.3, 12.5], 0.03, false);
  box("concrete", [-160, 160, 0, 0.15, 20.5, 20.7], 0.03, false);
  box("concrete", [-160, 160, -0.03, 0.016, 20.7, 23], 0.004, false);
  if (p.fence > 0.5) {
    for (const [a, b] of [[-40, -1.75], [0.55, 4.5]]) {
      box("trim", [a, b, 0.22, 0.3, 9.62, 9.68], 0, false);
      box("trim", [a, b, 0.72, 0.8, 9.62, 9.68], 0, false);
      for (let x = a + 0.04; x < b - 0.08; x += 0.17) box("trim", [x, x + 0.085, 0.04, 0.98, 9.68, 9.71], 0, false);
      box("trim", [a - 0.06, a + 0.06, 0, 1.08, 9.58, 9.72], 0.01, false);
      box("trim", [b - 0.06, b + 0.06, 0, 1.08, 9.58, 9.72], 0.01, false);
    }
  }
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
varying vec3 vHomeW, vHomeN;
float vhash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3. - 2. * f); return mix(mix(vhash(i), vhash(i + vec2(1., 0.)), u.x), mix(vhash(i + vec2(0., 1.)), vhash(i + vec2(1., 1.)), u.x), u.y); }
float vfbm(vec2 p){ float s = 0., a = .5; for (int i = 0; i < 4; i++) { s += a * vnoise(p); p = mat2(1.6, 1.2, -1.2, 1.6) * p + 3.1; a *= .5; } return s / .9375; }
float sdHome(vec3 p){
  float d = p.y;
  for (int i = 0; i < NB; i++) {
    if (i >= uBoxN) break;
    vec4 c = uBoxC[i];
    vec3 q = abs(p - c.xyz) - uBoxH[i] + c.w;
    d = min(d, length(max(q, 0.)) + min(max(q.x, max(q.y, q.z)), 0.) - c.w);
  }
  return d;
}
float homeAO(vec3 p, vec3 n){
  if (length(p.xz - vec2(1.5, -3.)) > 24.) return 1.;
  float o = 0.;
  for (int i = 1; i <= 4; i++) {
    float h = .1 * float(i * i);
    o += clamp((h - sdHome(p + n * h)) / h, 0., 1.) * (1.2 - .2 * float(i));
  }
  return clamp(1. - o * .32, 0., 1.);
}
float leafMask(vec3 w){
  if (uLeaves <= 0. || length(w.xz - vec2(1.5, -3.)) > 30.) return 1.;
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
float ambientOcclusion = homeAO(vHomeW, normalize(vHomeN));
reflectedLight.indirectDiffuse *= ambientOcclusion;
#if defined( USE_ENVMAP ) && defined( STANDARD )
  float dotNVo = saturate( dot( geometryNormal, geometryViewDir ) );
  reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNVo, ambientOcclusion, material.roughness );
#endif
reflectedLight.directDiffuse *= mix(1., ambientOcclusion, .3);
`;

const FOG_CHUNK = `
#ifdef USE_FOG
vec3 hV = vHomeW - cameraPosition;
float hD = length(hV);
float hAz = max(dot(normalize(hV.xz + 1e-4), normalize(uSunDir.xz + 1e-4)), 0.);
vec3 hFog = mix(fogColor, uSunCol, .25 + .5 * pow(hAz, 3.));
float hNear = 1. - exp(-fogDensity * fogDensity * hD * hD);
float hFar = 1. - exp(-max(length(vHomeW.xz - vec2(1.5, -3.)) - 12., 0.) * .012 * uFogK);
float hMist = uMist * smoothstep(20., 130., hD) * exp(-max(vHomeW.y, 0.) * .28);
float hK = 1. - (1. - hNear) * (1. - hFar * .95) * (1. - hMist * .75);
gl_FragColor.rgb = mix(gl_FragColor.rgb, hFog * (1. + .06 * hMist), clamp(hK, 0., 1.));
#endif`;

const WIN_CHUNK = `#include <emissivemap_fragment>
totalEmissiveRadiance *= uWin * (.08 + step(.45, vhash(vec2(floor((vHomeW.x + vHomeW.z) * .55), floor(vHomeW.y / 2.9)) + 7.3)));`;

const DIR_LINE ="directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ]";

const SKY_VERTEX = `
varying vec3 vDir;
void main(){
  vDir = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
}`;

const SKY_FRAGMENT = `
uniform vec3 uSky, uHaze, uGlow, uFoliage, uLawn, uSunDir;
uniform float uHazeK, uTime;
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
  float cloud = smoothstep(.54, .86, cl / .9375) * smoothstep(.08, .26, d.y) * (1. - smoothstep(.5, .85, d.y));
  c = mix(c, mix(haze * 1.12, glow * 1.2, .3 + .5 * az) * (.86 + .22 * smoothstep(.62, .92, cl / .9375)), cloud * .62);
  vec3 hill = lin(uFoliage) * 1.8;
  vec3 blue = mix(hor, lin(uSky), .28);
  vec3 mist = mix(hor, glow, .12 + .25 * az);
  vec3 rimC = glow * pow(az, 4.);
  float sa = atan(uSunDir.x, uSunDir.z);
  c = hills(c, d.y, a, 1.7, 9., .08, .07, mix(hill, blue, clamp(.9 * uHazeK, 0., .97)), mist, rimC, sa, .6);
  c = mix(c, mix(hor, mix(lin(uLawn) * .5, haze * .6, .4), .5), smoothstep(-.005, -.08, d.y));
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

const home: EnvModule = {
  id: "home",
  title: "Home",
  palette: {
    uSky: { cssVar: "--home-sky", label: "Sky", fallback: LIGHT_PRESETS.golden.colors.sky },
    uHaze: { cssVar: "--home-haze", label: "Haze", fallback: LIGHT_PRESETS.golden.colors.haze },
    uGlow: { cssVar: "--home-sun", label: "Sun", fallback: LIGHT_PRESETS.golden.colors.sun },
    uSiding: { cssVar: "--home-siding", label: "Siding", fallback: "#c9cfcf" },
    uBrick: { cssVar: "--home-brick", label: "Brick", fallback: "#c98f76" },
    uRoof: { cssVar: "--home-roof", label: "Roof", fallback: "#55565a" },
    uTrim: { cssVar: "--home-trim", label: "Trim", fallback: "#f3f1ec" },
    uDoor: { cssVar: "--home-door", label: "Door and shutters", fallback: "#2d3b48" },
    uGlass: { cssVar: "--home-glass", label: "Glass", fallback: "#2a3236" },
    uLawn: { cssVar: "--home-lawn", label: "Lawn", fallback: "#75a046" },
    uPaving: { cssVar: "--home-paving", label: "Paving", fallback: "#d8d1c4" },
    uFoliage: { cssVar: "--home-foliage", label: "Foliage", fallback: "#22401f" },
  },
  params: [
    lightParam,
    { key: "sun", label: "Sun angle", min: -3.14, max: 3.14, step: 0.01, value: LIGHT_PRESETS.golden.sun },
    { key: "sunHeight", label: "Sun height", min: 0.04, max: 0.9, step: 0.01, value: LIGHT_PRESETS.golden.sunHeight },
    { key: "floors", label: "Floors", min: 1, max: 2, step: 1, value: 2 },
    { key: "roofPitch", label: "Roof pitch", min: 0.3, max: 1.2, step: 0.05, value: 0.7 },
    { key: "brick", label: "Brick walls", min: 0, max: 1, step: 1, value: 0 },
    { key: "porch", label: "Front porch", min: 0, max: 1, step: 1, value: 1 },
    { key: "garage", label: "Garage", min: 0, max: 1, step: 1, value: 1 },
    { key: "fence", label: "Picket fence", min: 0, max: 1, step: 1, value: 1 },
    { key: "shutters", label: "Shutters", min: 0, max: 1, step: 1, value: 1 },
    { key: "leaves", label: "Leaf shadows", min: 0, max: 1, step: 0.05, value: 0.8 },
    { key: "frame", label: "Foliage frame", min: 0, max: 1, step: 0.05, value: 0 },
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
    ...lightVariants({ sky: "--home-sky", haze: "--home-haze", sun: "--home-sun" }),
    brick:{ params: { brick: 1, shutters: 0 } },
    bungalow: { params: { floors: 1, roofPitch: 0.55 } },
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

    const lightsChunk = THREE.ShaderChunk.lights_fragment_begin.replace(DIR_LINE, `directLight.color *= homeLeaf;\n\t\t${DIR_LINE}`);
    const patch = <M extends THREE.MeshStandardMaterial>(m: M) => {
      m.onBeforeCompile = (s) => {
        Object.assign(s.uniforms, shared);
        s.vertexShader = "varying vec3 vHomeW, vHomeN;\n" + s.vertexShader.replace("#include <project_vertex>", "#include <project_vertex>\nvec4 hW = vec4(transformed, 1.);\n#ifdef USE_INSTANCING\nhW = instanceMatrix * hW;\n#endif\nvHomeW = (modelMatrix * hW).xyz;\nvHomeN = normalize(mat3(modelMatrix) * objectNormal);");
        s.fragmentShader = PARS + s.fragmentShader.replace("#include <aomap_fragment>", AO_CHUNK).replace("#include <emissivemap_fragment>", WIN_CHUNK).replace("#include <lights_fragment_begin>", `float homeLeaf = leafMask(vHomeW);\n${lightsChunk}`).replace("#include <fog_fragment>", FOG_CHUNK);
      };
      m.customProgramCacheKey = () => "home";
      return keep(m);
    };
    const maps = (t: ReturnType<typeof bake>) => {
      keep(t.map);
      keep(t.normalMap);
      keep(t.roughnessMap);
      return t;
    };
    const paving = maps(bake(512, 2, pavingTexel));
    const concrete = maps(bake(512, 1.4, concreteTexel));
    const mats: Record<Kind, THREE.MeshStandardMaterial> = {
      siding: patch(new THREE.MeshStandardMaterial({ ...maps(bake(512, 2.4, sidingTexel)), roughness: 1, normalScale: new THREE.Vector2(1.1, 1.1) })),
      brick: patch(new THREE.MeshStandardMaterial({ ...maps(bake(512, 2.6, brickTexel)), roughness: 1 })),
      roof: patch(new THREE.MeshStandardMaterial({ ...maps(bake(512, 2.8, shingleTexel)), roughness: 1, normalScale: new THREE.Vector2(1.2, 1.2) })),
      trim: patch(new THREE.MeshStandardMaterial({ roughness: 0.55 })),
      door: patch(new THREE.MeshStandardMaterial({ roughness: 0.42 })),
      panel: patch(new THREE.MeshStandardMaterial({ ...maps(bake(256, 1.6, panelTexel)), roughness: 1 })),
      concrete: patch(new THREE.MeshStandardMaterial({ ...concrete, roughness: 1 })),
      paving: patch(new THREE.MeshStandardMaterial({ ...paving, roughness: 1 })),
      glass: patch(new THREE.MeshPhysicalMaterial({ roughness: 0.04, metalness: 0, ior: 1.5, specularIntensity: 1, specularColor: new THREE.Color(2.6, 2.6, 2.6), envMapIntensity: 1.7 })),
    };
    const lawnMat = patch(new THREE.MeshStandardMaterial({ ...maps(bake(256, 2, lawnTexel)), roughness: 1 }));
    const lawn = new THREE.Mesh(keep(project(new THREE.PlaneGeometry(1000, 800).rotateX(-Math.PI / 2).translate(0, -0.02, -260), 3)), lawnMat);
    lawn.receiveShadow = true;
    const roadMat = patch(new THREE.MeshStandardMaterial({ ...concrete, roughness: 1, color: 0x6a6b6e }));
    const paintMat = patch(new THREE.MeshStandardMaterial({ color: 0xe2ded4, roughness: 0.8, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
    const road = new THREE.Mesh(keep(project(new THREE.PlaneGeometry(320, 8).rotateX(-Math.PI / 2).translate(0, 0.004, 16.5), 6)), roadMat);
    road.receiveShadow = true;
    const dashes: THREE.BufferGeometry[] = [];
    for (let x = -160; x < 160; x += 9) dashes.push(new THREE.PlaneGeometry(3, 0.14).rotateX(-Math.PI / 2).translate(x, 0.006, 16.5));
    const paint = new THREE.Mesh(keep(mergeGeometries(dashes)!), paintMat);
    paint.receiveShadow = true;
    const metalMat = patch(new THREE.MeshStandardMaterial({ color: 0x2c3034, metalness: 0.5, roughness: 0.45 }));
    const lamps: THREE.BufferGeometry[] = [];
    for (const [x, z, s] of [[-44, 12, 1], [6, 12, 1], [30, 12, 1], [54, 12, 1], [78, 12, 1], [-6, 21, -1], [18, 21, -1], [42, 21, -1], [66, 21, -1]]) {
      lamps.push(new THREE.CylinderGeometry(0.05, 0.075, 6, 10).translate(x, 3, z));
      lamps.push(new THREE.BoxGeometry(0.07, 0.07, 1.4).translate(x, 5.95, z + s * 0.7));
      lamps.push(new THREE.BoxGeometry(0.28, 0.1, 0.6).translate(x, 5.88, z + s * 1.3));
    }
    const lamp = new THREE.Mesh(keep(mergeGeometries(lamps)!), metalMat);
    lamp.castShadow = lamp.receiveShadow = true;
    const yard = { bark: [] as THREE.BufferGeometry[], leaves: [] as THREE.BufferGeometry[] };
    let gs = 13;
    const grnd = () => (gs = (gs * 16807) % 2147483647) / 2147483647;
    const grow = grower((k, g) => yard[k].push(g), grnd);
    for (const [x, z, h] of [[-15, -10, 10], [13, -11, 11], [-6, -13.5, 12], [-27, -5, 9], [22, -6, 9.5], [-38, 2, 10], [-44, -10, 11]]) grow.tree(x, 0, z, h, 70, 0.17);
    for (const x of [-34, 12, 24, 36, 48, 62, 76]) grow.tree(x + grnd() - 0.5, 0, 11.4, 7.6 + grnd() * 1.6, 60, 0.17);
    for (const x of [-30, 30, 54, 78]) grow.tree(x, 0, 22.2, 7.4 + grnd() * 1.6, 60, 0.17);
    for (const [a, b, step] of [[-40, -1.75, 1.7], [0.55, 4.5, 1.5]]) {
      for (let x = a + 1; x < b; x += step) {
        const r = 0.6 + grnd() * 0.3;
        grow.bush(THREE.MathUtils.clamp(x, a + r + 0.12, b - r - 0.12), 0, 9.44 - r, r);
      }
    }
    for (const x of [-6.4, -5.2, -4.1, 2.75, 3.75]) grow.bush(x, 0.4, 0.625, 0.46);
    const leafMat = sway(patch(new THREE.MeshStandardMaterial({ map: keep(leafTexture({ hue: 80, spread: 32, sat: 32, light: 8 })), alphaTest: 0.4, alphaToCoverage: true, roughness: 0.78, color: 0xd4e0c2 })), true);
    const barkMat = patch(new THREE.MeshStandardMaterial({ map: keep(barkTexture(0x43372d)), roughness: 0.9 }));
    for (const [geos, mat] of [[yard.bark, barkMat], [yard.leaves, leafMat]] as const) {
      const merged = mergeGeometries(geos);
      for (const g of geos) g.dispose();
      const m = new THREE.Mesh(keep(merged!), mat);
      m.castShadow = m.receiveShadow = true;
      world.add(m);
    }
    const hedges = hedger();
    for (const [x0, x1, z0, z1, h] of [
      [-53, 30, -16, -14.2, 1.8],
      [-53, -51.2, -14.2, 9.4, 1.8],
      [28.2, 30, -14.2, 9.4, 1.8],
      [-6.9, -3.6, 0.15, 1.1, 0.9],
      [2.2, 4.3, 0.15, 1.1, 0.9],
    ])
      hedges.box(x0, x1, -0.05, h - 0.05, z0, z1);
    for (const m of hedges.meshes(leafMat)) {
      keep(m.geometry);
      world.add(keep(m));
    }
    world.add(lawn, road, paint, lamp);

    const protos = [16, 22, 28].map((n, i) => {
      const part = { bark: [] as THREE.BufferGeometry[], leaves: [] as THREE.BufferGeometry[] };
      grower((k, g) => part[k].push(g), grnd).tree(0, 0, 0, 10, n, 0.3 + 0.03 * i);
      const out = { bark: mergeGeometries(part.bark)!, leaves: mergeGeometries(part.leaves)! };
      for (const g of [...part.bark, ...part.leaves]) g.dispose();
      return { ...out, mats: [] as THREE.Matrix4[], tints: [] as THREE.Color[] };
    });
    const q = new THREE.Quaternion();
    const yAxis = new THREE.Vector3(0, 1, 0);
    for (const [r0, gap, h0, h1] of [[50, 5, 10, 16], [78, 6.5, 12, 19], [118, 8, 14, 23]]) {
      for (const lane of [0, 1]) {
        for (let a = -2.2; a < 0.66; a += gap / r0) {
          const ang = a + (grnd() - 0.5) * (gap / r0) * 0.8;
          const r = r0 + lane * 7 + (grnd() - 0.5) * 6;
          const x = 1.5 + Math.cos(ang) * r, z = -3 + Math.sin(ang) * r;
          if (z > 4 || (x > -58 && x < 34 && z > -20)) continue;
          if (grnd() < 0.12) continue;
          const s = (h0 + (h1 - h0) * grnd()) / 10, wd = 0.8 + grnd() * 0.5;
          const p = protos[Math.floor(grnd() * protos.length)];
          p.mats.push(new THREE.Matrix4().compose(new THREE.Vector3(x, -s * 2.2, z), q.setFromAxisAngle(yAxis, grnd() * Math.PI * 2), new THREE.Vector3(s * wd, s, s * wd)));
          p.tints.push(new THREE.Color().setRGB(0.85 + grnd() * 0.3, 0.88 + grnd() * 0.24, 0.8 + grnd() * 0.25));
        }
      }
    }
    for (const p of protos) {
      for (const [geo, mat] of [[p.bark, barkMat], [p.leaves, leafMat]] as const) {
        const im = new THREE.InstancedMesh(keep(geo), mat, p.mats.length);
        p.mats.forEach((m, i) => im.setMatrixAt(i, m));
        p.tints.forEach((c, i) => im.setColorAt(i, c));
        im.computeBoundingSphere();
        world.add(im);
      }
    }

    const nWalls: THREE.BufferGeometry[] = [];
    const nRoofs: THREE.BufferGeometry[] = [];
    for (const [ang, r] of [[-1.95, 64], [-1.62, 70], [-1.3, 62], [-0.98, 68], [-0.62, 63], [-0.3, 71], [0.05, 66]]) {
      const w = 8 + grnd() * 4, d = 7 + grnd() * 2, h = 5.4 + grnd() * 1.4, rise = d * (0.32 + grnd() * 0.12);
      const yaw = Math.round(grnd()) * (Math.PI / 2) + (grnd() - 0.5) * 0.3;
      const x = 1.5 + Math.cos(ang) * r, z = -3 + Math.sin(ang) * r;
      const shape = new THREE.Shape();
      shape.moveTo(-d / 2 - 0.5, 0);
      shape.lineTo(d / 2 + 0.5, 0);
      shape.lineTo(0, rise);
      shape.closePath();
      nWalls.push(project(new THREE.BoxGeometry(w, h, d).translate(0, h / 2, 0).rotateY(yaw).translate(x, 0, z), TILE.siding));
      nRoofs.push(project(new THREE.ExtrudeGeometry(shape, { depth: w + 0.8, bevelEnabled: false }).rotateY(-Math.PI / 2).translate(w / 2 + 0.4, h, 0).rotateY(yaw).translate(x, 0, z), TILE.roof));
    }
    for (const [geos, mat] of [[nWalls, mats.siding], [nRoofs, mats.roof]] as const) {
      world.add(new THREE.Mesh(keep(mergeGeometries(geos)!), mat));
      for (const g of geos) g.dispose();
    }

    const skyUniforms = { ...colors, uSunDir: { value: sunDir }, uHazeK: { value: 1 }, uTime: shared.uTime };
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
    sunLight.target.position.set(1.5, 2.5, -2);
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
        if (kind !== "glass") for (const g of geos) project(g, TILE[kind]);
        if (geos.some((g) => !g.index)) {
          const flat = geos.map((g) => (g.index ? g.toNonIndexed() : g));
          for (const g of geos) if (!flat.includes(g)) g.dispose();
          geos = flat;
        }
        const merged = mergeGeometries(geos);
        for (const g of geos) g.dispose();
        if (!merged) continue;
        const m = new THREE.Mesh(merged, mats[kind]);
        m.castShadow = m.receiveShadow = true;
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
      [mats.siding, "uSiding"],
      [mats.brick, "uBrick"],
      [mats.roof, "uRoof"],
      [mats.trim, "uTrim"],
      [mats.door, "uDoor"],
      [mats.panel, "uTrim"],
      [mats.concrete, "uPaving"],
      [mats.paving, "uPaving"],
      [mats.glass, "uGlass"],
      [lawnMat, "uLawn"],
    ];
    const lin = (k: string, c: THREE.Color) => {
      const v = colors[k].value;
      return c.setRGB(v.x, v.y, v.z, THREE.SRGBColorSpace);
    };
    const up = new THREE.Vector3(0, 1, 0);
    const leafAt = new THREE.Vector3(-4.5, 3, 0.5);
    const leafAt2 = new THREE.Vector3(-6, 0, 7);
    const size = new THREE.Vector2();
    const rig = cameraRig(camera, pointer, {
      base: small ? new THREE.Vector3(-11, 1.9, 34) : new THREE.Vector3(-21.5, 1.9, 21.5),
      focus: small ? new THREE.Vector3(2.5, 3.6, -2) : new THREE.Vector3(2, 3.6, -2.5),
      yaw: small ? 0 : 0.14,
    });
    let structKey = "";
    let envKey = "";
    let shadowKey = "";

    return {
      update(frame) {
        const { time, intro, params } = frame;
        const sk = ["floors", "roofPitch", "brick", "porch", "garage", "fence", "shutters"].map((k) => params[k]).join();
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
        mats.glass.color.multiplyScalar(0.18);
        mats.glass.emissive.setRGB(1, 0.58, 0.26).multiplyScalar(2.4);
        shared.uWin.value = lp.windows;
        lawnMat.color.multiplyScalar(1.15);
        lin("uHaze", fog.color);
        const k = ease(intro / 2.8);
        fog.density = 0.0032 * params.haze * lp.fog + (1 - k) * 0.03;
        shared.uFogK.value = params.haze * lp.fog;
        shared.uMist.value = lp.mist;

        const ek = [params.sun, el, params.haze, ...["uSky", "uHaze", "uGlow", "uFoliage", "uLawn"].map((c) => colors[c].value.toArray().join())].join();
        const target = renderer.getRenderTarget();
        if (ek !== envKey) {
          envKey = ek;
          const next = pmrem.fromScene(envScene, 0, 0.5, 500);
          envRT?.dispose();
          envRT = next;
          world.environment = next.texture;
          mats.glass.envMap = next.texture;
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

export default home;

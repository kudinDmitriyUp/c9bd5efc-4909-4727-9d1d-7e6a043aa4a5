import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { cloud, rnd, type Add } from "./sample";
import { box, cyl, cylX, cylZ, extrude, between, globe, lathe } from "./parts";
import { ALETHIA_HERO_SMALL, ALETHIA_ROLES, type AlethiaRole } from "./alethiaHero";
import { architecture as architectureSet } from "./architecture";
import { logistics as logisticsSet } from "./logistics";
import { auto as autoSet } from "./auto";
import { PARTICLE_SETS } from "./index";
import type { ShapeBuilder, ShapeMotion } from "./types";

type Waves = [number, number, number, number];

const WAVES: Record<string, Waves> = {
  tech: [1.3, 2.2, 0.9, 3.1],
  finance: [0.9, 1.5, 1.2, 2.4],
  energy: [1.6, 1.1, 0.7, 2.8],
  health: [1.1, 1.9, 1.4, 2.2],
  logistics: [0.8, 2.6, 0.6, 3.4],
  architecture: [1.4, 1.4, 1.0, 2.6],
  auto: [0.7, 1.2, 1.6, 3.6],
  aviation: [0.9, 1.3, 0.8, 2.9],
  electrical: [1.5, 1.2, 0.9, 3.3],
  roofing: [1.1, 1.6, 1.3, 2.5],
  construction: [1.3, 1.5, 0.9, 2.8],
  landscaping: [1.2, 2.1, 1.2, 2.2],
};

type Pt = [number, number];

type Pen = {
  path: (pts: Pt[], g?: number) => void;
  line: (pts: Pt[], g?: number) => void;
  rect: (x: number, y: number, w: number, h: number, g?: number) => void;
  ring: (x: number, y: number, r: number, g?: number) => void;
  curve: (f: (x: number) => number, x0: number, x1: number, g?: number) => void;
};

type Scene = { topo: (x: number, y: number, w: number) => number; draw: (pen: Pen, rand: () => number) => void; clear?: (x: number, y: number) => boolean; share?: number };

const FW = 1.8;
const FH = 1.5;

const seeded = (s: number) => () => (s = (s * 16807) % 2147483647) / 2147483647;

const terrain = ([a, b, c, d]: Waves, { topo, draw, clear, share = 0.34 }: Scene): ShapeBuilder => (count) => {
  const wave = (x: number, y: number) => Math.sin(x * a + Math.sin(y * b) * 1.1) * 0.55 + Math.sin(y * c * 2 - x * 0.7) * 0.32 + Math.sin(x * d + y * d) * 0.1;
  const segs: number[] = [];
  const cum: number[] = [];
  let total = 0;
  const line = (pts: Pt[], g = 0) => {
    for (let i = 1; i < pts.length; i++) {
      const [x1, y1] = pts[i - 1];
      const [x2, y2] = pts[i];
      const len = Math.hypot(x2 - x1, y2 - y1);
      if (!len) continue;
      segs.push(x1, y1, x2, y2, g);
      total += len;
      cum.push(total);
    }
  };
  const pen: Pen = {
    path: (pts, g) => {
      let run: Pt[] = [];
      for (const p of pts) {
        if (Math.abs(p[0]) <= FW && Math.abs(p[1]) <= FH) run.push(p);
        else {
          if (run.length > 1) line(run, g);
          run = [];
        }
      }
      if (run.length > 1) line(run, g);
    },
    line,
    rect: (x, y, w, h, g) => line([[x - w / 2, y - h / 2], [x + w / 2, y - h / 2], [x + w / 2, y + h / 2], [x - w / 2, y + h / 2], [x - w / 2, y - h / 2]], g),
    ring: (x, y, r, g) => line(Array.from({ length: 41 }, (_, i): Pt => [x + Math.cos((i / 40) * Math.PI * 2) * r, y + Math.sin((i / 40) * Math.PI * 2) * r]), g),
    curve: (f, x0, x1, g) => line(Array.from({ length: 241 }, (_, i): Pt => [x0 + ((x1 - x0) * i) / 240, f(x0 + ((x1 - x0) * i) / 240)]), g),
  };
  draw(pen, seeded(7));
  const inside = (x: number, y: number) => Math.abs(x) <= FW && Math.abs(y) <= FH;
  const positions = new Float32Array(count * 3);
  const groups = new Float32Array(count);
  const put = (i: number, x: number, y: number, g = 0) => {
    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = wave(x, y) * 0.3 + (g ? 0.02 : 0);
    groups[i] = g;
  };
  for (let i = 0; i < count; i++) {
    const r = rnd();
    if (i < 2) put(i, i ? FW : -FW, i ? FH : -FH);
    else if (r < share && total) {
      for (let n = 0; n < 8; n++) {
        const t = rnd() * total;
        let lo = 0;
        let hi = cum.length - 1;
        while (lo < hi) {
          const m = (lo + hi) >> 1;
          if (cum[m] < t) lo = m + 1;
          else hi = m;
        }
        const s = lo * 5;
        const u = rnd();
        const x = segs[s] + (segs[s + 2] - segs[s]) * u + (rnd() - 0.5) * 0.008;
        const y = segs[s + 1] + (segs[s + 3] - segs[s + 1]) * u + (rnd() - 0.5) * 0.008;
        if (inside(x, y) || n === 7) {
          put(i, Math.max(-FW, Math.min(FW, x)), Math.max(-FH, Math.min(FH, y)), segs[s + 4]);
          break;
        }
      }
    } else if (r < share + 0.24) {
      for (let n = 0; n < 12; n++) {
        const x = Math.round(((rnd() * 2 - 1) * FW) / 0.055) * 0.055;
        const y = Math.round(((rnd() * 2 - 1) * FH) / 0.055) * 0.055;
        if (!clear?.(x, y) || n === 11) {
          put(i, x, y);
          break;
        }
      }
    } else {
      for (let n = 0; n < 48; n++) {
        const x = (rnd() * 2 - 1) * FW;
        const y = (rnd() * 2 - 1) * FH;
        if (clear?.(x, y) && n < 47) continue;
        const f = (((topo(x, y, wave(x, y)) + 20) * 5) % 1 + 1) % 1;
        if (f < 0.07 || n === 47) {
          put(i, x, y);
          break;
        }
      }
    }
  }
  return { positions, groups, motion: "static" };
};

const pulse = (i: number) => 1 + ((i * 0.618) % 1);

const TILT = 0.42;

const tech: Scene = {
  topo: (_x, _y, w) => w * 0.6,
  clear: (x, y) => Math.hypot(x, y + 1.32) < 0.84,
  draw: (pen, rand) => {
    const C: Pt = [0, -1.32];
    const R = 0.82;
    const project = (la: number, lo: number): Pt | null => {
      const x = Math.cos(la) * Math.cos(lo);
      const y = Math.sin(la);
      const z = Math.cos(la) * Math.sin(lo);
      const yy = y * Math.cos(TILT) - z * Math.sin(TILT);
      const zz = y * Math.sin(TILT) + z * Math.cos(TILT);
      return zz > 0 ? [C[0] + x * R, C[1] + yy * R] : null;
    };
    const trace = (at: (t: number) => Pt | null, g: number) => {
      let run: Pt[] = [];
      for (let i = 0; i <= 160; i++) {
        const p = at(i / 160);
        if (p) run.push(p);
        else {
          if (run.length > 1) pen.line(run, g);
          run = [];
        }
      }
      if (run.length > 1) pen.line(run, g);
    };
    pen.ring(C[0], C[1], R);
    for (let k = -5; k <= 5; k++) trace((t) => project((k * Math.PI) / 12, t * Math.PI * 2), 0);
    for (let k = 0; k < 12; k++) trace((t) => project((t - 0.5) * Math.PI, (k * Math.PI) / 6 + 0.2), 0);
    const nodes: Pt[] = [];
    while (nodes.length < 30) {
      const p: Pt = [(rand() * 2 - 1) * 1.7, (rand() * 2 - 1) * 1.4];
      if (Math.hypot(p[0], p[1] + 1.32) > 0.98 && nodes.every((q) => Math.hypot(q[0] - p[0], q[1] - p[1]) > 0.32)) nodes.push(p);
    }
    nodes.forEach((p, i) => {
      pen.ring(p[0], p[1], 0.022, pulse(i));
      const near = nodes.filter((q) => q !== p).sort((u, v) => Math.hypot(u[0] - p[0], u[1] - p[1]) - Math.hypot(v[0] - p[0], v[1] - p[1]));
      for (const q of near.slice(0, 2)) pen.line([p, q]);
    });
    for (const [la, lo, i] of [[0.5, 1.1, 3], [0.9, 1.9, 8], [0.3, 2.4, 14], [0.7, 0.6, 21]]) {
      const s = project(la, lo);
      const e = nodes[i];
      if (!s) continue;
      const m: Pt = [(s[0] + e[0]) / 2, Math.max(s[1], e[1]) + 0.25];
      pen.line(Array.from({ length: 33 }, (_, j): Pt => {
        const t = j / 32;
        return [(1 - t) ** 2 * s[0] + 2 * (1 - t) * t * m[0] + t * t * e[0], (1 - t) ** 2 * s[1] + 2 * (1 - t) * t * m[1] + t * t * e[1]];
      }), pulse(i + 40));
    }
  },
};

const span = (f: (x: number) => number, x0 = -1.8, x1 = 1.8, n = 240): Pt[] => Array.from({ length: n + 1 }, (_, i): Pt => [x0 + ((x1 - x0) * i) / n, f(x0 + ((x1 - x0) * i) / n)]);

const orbit = (cx: number, cy: number, r: (a: number) => number, a0 = 0, a1 = Math.PI * 2, n = 160): Pt[] => Array.from({ length: n + 1 }, (_, i): Pt => {
  const a = a0 + ((a1 - a0) * i) / n;
  return [cx + Math.cos(a) * r(a), cy + Math.sin(a) * r(a)];
});

const riseSlope = (x: number) => 0.1 + (x + 1.8) * 0.034;
const riseAt = (k: number) => (x: number) => -1.0 + riseSlope(x) * k * 0.62 + (x + 1.8) * 0.1 + 0.05 * Math.sin(x * 2.4 + k * 0.5);

const finance: Scene = {
  topo: (x, y, w) => (y - riseAt(0)(x) - 0.04 * (x + 1.8) * Math.max(0, y + 0.6)) * 1.4 + w * 0.1,
  share: 0.32,
  draw: (pen) => {
    for (let k = 0; k < 7; k++) pen.path(span(riseAt(k)), k === 2 || k === 5 ? 1.4 + k * 0.1 : 0);
    pen.path(span(() => -1.0));
    for (let x = -1.65; x < 1.8; x += 0.3) {
      pen.path([[x, -1.0], [x, -0.94]]);
      for (let y = -0.9; y < riseAt(0)(x) - 0.04; y += 0.06) pen.path([[x, y], [x, y + 0.025]]);
    }
    [-1.2, -0.45, 0.35, 1.05, 1.6].forEach((x, i) => {
      const k = [1, 3, 4, 2, 6][i];
      pen.ring(x, riseAt(k)(x), 0.024, pulse(i + 2));
      pen.ring(x, riseAt(k)(x), 0.055);
    });
  },
};

const hill = (k: number) => (x: number) => -0.62 - k * 0.24 + 0.09 * Math.sin(x * 2.1 + 0.4 + k) + 0.05 * Math.sin(x * 3.7 + 1.3 - k * 0.7);

const energy: Scene = {
  topo: (x, y, w) => y * 1.5 - 0.3 * Math.sin(x * 2.1 + 0.4) - 0.18 * Math.sin(x * 3.7 + 1.3) + w * 0.08,
  share: 0.3,
  draw: (pen) => {
    for (let k = 0; k < 3; k++) pen.curve(hill(k), -1.8, 1.8);
    const turbines: [number, number, number][] = [[-1.5, 0, 0.46], [-0.95, 1, 0.34], [-0.35, 1, 0.3], [0.3, 1, 0.32], [0.95, 1, 0.34], [1.5, 0, 0.46]];
    turbines.forEach(([x, layer, h], i) => {
      const base = hill(layer)(x);
      const top = base + h;
      pen.line([[x - 0.012, base], [x - 0.004, top]]);
      pen.line([[x + 0.012, base], [x + 0.004, top]]);
      pen.rect(x + 0.012, top, 0.05, 0.022);
      pen.ring(x, top, 0.014, pulse(i));
      const L = h * 0.52;
      for (let b = 0; b < 3; b++) {
        const a = 0.5 + i * 0.9 + (b * Math.PI * 2) / 3;
        const tip: Pt = [x + Math.cos(a) * L, top + Math.sin(a) * L];
        const side: Pt = [x + Math.cos(a + 0.22) * L * 0.25, top + Math.sin(a + 0.22) * L * 0.25];
        pen.line([[x, top], tip, side, [x, top]], pulse(i));
      }
    });
  },
};

const nodes = (rand: () => number, n: number, gap: number, keep: (x: number, y: number) => boolean) => {
  const out: Pt[] = [];
  for (let t = 0; out.length < n && t < 4000; t++) {
    const p: Pt = [(rand() * 2 - 1) * 1.7, (rand() * 2 - 1) * 1.02];
    if (keep(p[0], p[1]) && out.every((q) => Math.hypot(q[0] - p[0], q[1] - p[1]) > gap)) out.push(p);
  }
  return out;
};

const RIPPLES: Pt[] = [[-1.35, -1.02], [1.3, -0.92], [0.05, -1.45]];
const ripple = (x: number, y: number) => Math.min(...RIPPLES.map(([cx, cy]) => Math.hypot(x - cx, y - cy)));

const health: Scene = {
  topo: (x, y, w) => ripple(x, y) * 1.3 + w * 0.08,
  share: 0.32,
  draw: (pen, rand) => {
    RIPPLES.forEach(([cx, cy], c) => {
      for (let j = 0; j < 6; j++) pen.path(orbit(cx, cy, (a) => 0.12 + j * 0.15 + 0.012 * Math.sin(a * 6 + j)), j === 2 ? pulse(c + 1) : 0);
    });
    nodes(rand, 22, 0.34, (x, y) => ripple(x, y) > 0.95 && !(Math.abs(x) < 0.95 && y > -0.55)).forEach(([x, y], i) => {
      pen.ring(x, y, 0.05 + rand() * 0.025);
      pen.ring(x, y, 0.016, pulse(i + 5));
    });
  },
};

const HUB: Pt = [0.3, -0.8];
const spread = (x: number) => 0.22 + 2.1 * ((x - HUB[0]) / 2.2) ** 2;

const logistics: Scene = {
  topo: (x, y, w) => ((y - HUB[1]) / spread(x)) * 1.6 + w * 0.06,
  share: 0.32,
  draw: (pen) => {
    for (let k = -4; k <= 4; k++) {
      const f = (x: number) => HUB[1] + k * 0.11 * spread(x);
      for (let x = -1.8; x < 1.8; x += 0.075) pen.path(span(f, x, Math.min(x + 0.045, 1.8), 8), k === 0 ? 1.5 : 0);
    }
    pen.ring(HUB[0], HUB[1], 0.03, pulse(1));
    pen.ring(HUB[0], HUB[1], 0.08);
    pen.ring(HUB[0], HUB[1], 0.15);
    [[-1.45, -3], [-0.9, 2], [-1.6, 4], [1.25, -2], [1.6, 3], [-0.4, -1]].forEach(([x, k], i) => {
      pen.ring(x, HUB[1] + k * 0.11 * spread(x), 0.022, pulse(i + 3));
      pen.ring(x, HUB[1] + k * 0.11 * spread(x), 0.05);
    });
  },
};

const VP: Pt = [0, 0.2];
const FLOORS = [-0.36, -0.5, -0.7, -0.98, -1.36];

const architecture: Scene = {
  topo: (_x, _y, w) => w * 0.4,
  share: 0.36,
  draw: (pen) => {
    for (let i = -6; i <= 6; i++) {
      const ex = i * 0.62;
      const t = (VP[1] - FLOORS[0]) / (VP[1] + FH);
      pen.path(span((x) => VP[1] + ((x - VP[0]) / (ex - VP[0] || 1e-6)) * (-FH - VP[1]), VP[0] + (ex - VP[0]) * t, ex, 60));
      if (!i) pen.path([[0, FLOORS[0]], [0, -FH]]);
    }
    FLOORS.forEach((y, j) => pen.path(span(() => y), j === 3 ? 1.6 : 0));
    for (const s of [-1, 1]) {
      for (const x of [1.42, 1.62]) pen.path([[s * x, FLOORS[0]], [s * x, 1.0]]);
      for (let y = FLOORS[0] + 0.2; y < 1.0; y += 0.2) pen.path([[s * 1.38, y], [s * 1.66, y]]);
      pen.path([[s * 1.2, 0.95], [s * 1.2, -0.2]]);
      for (let y = -0.2; y <= 0.951; y += 0.115) pen.path([[s * 1.17, y], [s * 1.23, y]]);
    }
    [[-0.84, -0.65], [0.84, -0.82], [-1.26, -1.04], [0.42, -0.52], [1.68, -1.34]].forEach(([x, y], i) => {
      pen.path([[x - 0.05, y], [x + 0.05, y]], pulse(i + 1));
      pen.path([[x, y - 0.05], [x, y + 0.05]], pulse(i + 1));
      pen.ring(x, y, 0.035);
    });
  },
};

const lane = (k: number) => (x: number) => -1.02 + k * 0.12 + 0.08 * Math.sin(x * 1.2 + 0.6) + 0.025 * (x + 1.8) * (k / 6);

const auto: Scene = {
  topo: (x, y, w) => (y - lane(0)(x)) * 1.3 + w * 0.1,
  share: 0.3,
  draw: (pen, rand) => {
    for (let k = 0; k < 6; k++) {
      let x = -1.8 - rand() * 0.6;
      let n = 0;
      while (x < 1.8) {
        const len = 0.18 + rand() * (0.9 - k * 0.09);
        pen.path(span(lane(k), x, Math.min(x + len, 1.8), 40), n % 3 === 1 ? pulse(k + n) : 0);
        x += len + 0.12 + rand() * 0.35;
        n++;
      }
    }
    for (const s of [-1, 1])
      for (let k = 0; k < 4; k++) {
        const y = 0.62 + k * 0.1;
        const x0 = s * (1.15 + rand() * 0.2);
        pen.path([[x0, y], [s * 1.8, y + 0.02]], k === 2 ? pulse(s + 3) : 0);
      }
  },
};

const LIMB: Pt = [0, -4.25];
const LR = 3.3;

const aviation: Scene = {
  topo: (x, y, w) => Math.hypot(x - LIMB[0], y - LIMB[1]) * 1.5 + w * 0.08,
  share: 0.32,
  draw: (pen) => {
    for (const [d, dash] of [[0, false], [-0.07, false], [-0.2, true]] as [number, boolean][]) {
      const a = orbit(LIMB[0], LIMB[1], () => LR + d, Math.PI * 0.2, Math.PI * 0.8, 240);
      if (!dash) pen.path(a);
      else for (let i = 0; i < a.length - 3; i += 6) pen.path(a.slice(i, i + 3));
    }
    const cities = [-1.65, -1.05, -0.35, 0.45, 1.1, 1.62].map((x): Pt => [x, LIMB[1] + Math.sqrt(LR * LR - x * x)]);
    cities.forEach(([x, y], i) => {
      pen.ring(x, y, 0.022, pulse(i));
      pen.ring(x, y, 0.05);
    });
    [[0, 3], [1, 4], [2, 5], [0, 5], [1, 2], [3, 5], [0, 2]].forEach(([a, b], i) => {
      const [s, e] = [cities[a], cities[b]];
      const lift = Math.abs(e[0] - s[0]) * 0.32;
      const m: Pt = [(s[0] + e[0]) / 2, (s[1] + e[1]) / 2 + lift * 2];
      const arc = Array.from({ length: 81 }, (_, j): Pt => {
        const t = j / 80;
        return [(1 - t) ** 2 * s[0] + 2 * (1 - t) * t * m[0] + t * t * e[0], (1 - t) ** 2 * s[1] + 2 * (1 - t) * t * m[1] + t * t * e[1]];
      });
      for (let j = 0; j < arc.length - 2; j += 4) pen.path(arc.slice(j, j + 3), i % 2 ? 0 : pulse(i + 7));
    });
  },
};

const TOWERS: [number, number][] = [[-1.45, 1], [-0.45, 0.74], [0.3, 0.55], [0.86, 0.41], [1.28, 0.3], [1.6, 0.22]];

const electrical: Scene = {
  topo: (x, y, w) => (y + 1.0 + 0.05 * Math.sin(x * 1.6)) * 1.3 + w * 0.08,
  share: 0.3,
  draw: (pen) => {
    const tips: Pt[][] = TOWERS.map(([x, s]) => {
      const b = -1.15 + (1 - s) * 0.42;
      const H = 1.5 * s;
      const w = (t: number) => (t < 0.62 ? 0.17 - 0.12 * (t / 0.62) : 0.05 - 0.03 * ((t - 0.62) / 0.38)) * s;
      for (const d of [-1, 1]) pen.path(Array.from({ length: 21 }, (_, i): Pt => [x + d * w(i / 20), b + (H * i) / 20]));
      const lv = [0, 0.18, 0.34, 0.5, 0.62, 0.8, 1];
      for (let i = 0; i < lv.length - 1; i++) {
        pen.path([[x - w(lv[i]), b + H * lv[i]], [x + w(lv[i + 1]), b + H * lv[i + 1]]]);
        pen.path([[x + w(lv[i]), b + H * lv[i]], [x - w(lv[i + 1]), b + H * lv[i + 1]]]);
      }
      const out: Pt[] = [[x, b + H]];
      for (const [t, L] of [[0.62, 0.34], [0.8, 0.27]]) {
        pen.path([[x - L * s, b + H * t], [x + L * s, b + H * t]]);
        for (const d of [-1, 1]) {
          pen.path([[x + d * L * s, b + H * t], [x + d * w(t + 0.1), b + H * (t + 0.1)]]);
          pen.path([[x + d * L * s, b + H * t], [x + d * L * s, b + H * t - 0.08 * s]]);
          out.push([x + d * L * s, b + H * t - 0.08 * s]);
        }
      }
      return out;
    });
    for (let i = 0; i < tips.length - 1; i++)
      tips[i].forEach(([x1, y1], j) => {
        const [x2, y2] = tips[i + 1][j];
        const d = 0.08 * TOWERS[i][1];
        pen.path(Array.from({ length: 41 }, (_, k): Pt => [x1 + ((x2 - x1) * k) / 40, y1 + ((y2 - y1) * k) / 40 - d * Math.sin((Math.PI * k) / 40)]), j === 2 ? pulse(i + 2) : 0);
      });
    tips[0].forEach(([x, y], j) => pen.path(Array.from({ length: 21 }, (_, k): Pt => [x - (0.5 * k) / 20, y - 0.05 * Math.sin((Math.PI * k) / 20) - (0.06 * k) / 20]), j === 3 ? pulse(9) : 0));
    pen.path(span((x) => -1.15 + (x + 1.8) * 0.08));
  },
};

const GABLES: [number, number][] = [[-1.5, -0.5], [-0.8, -0.72], [-0.05, -0.62], [0.72, -0.74], [1.45, -0.52]];
const roofline = (x: number) => Math.max(-1.25, ...GABLES.map(([cx, py]) => py - 0.58 * Math.abs(x - cx)));

const roofing: Scene = {
  topo: (x, y, w) => (y - roofline(x)) * 1.35 + w * 0.06,
  share: 0.32,
  draw: (pen) => {
    for (let j = 0; j < 5; j++) pen.path(span((x) => roofline(x) - j * 0.075, -1.8, 1.8, 480), j === 0 ? 1.4 : 0);
    for (let x = -1.76; x < 1.8; x += 0.08) pen.path([[x, roofline(x) - 0.3], [x, roofline(x) - 0.34]]);
    GABLES.forEach(([cx, py], i) => {
      pen.ring(cx, py + 0.05, 0.022, pulse(i + 1));
      pen.path([[cx, py], [cx, py - 0.3]]);
    });
  },
};

const BAYS = [0.95, 0.8, 0.62, 0.42, 0.3, 0.26, 0.3, 0.4, 0.58, 0.78, 0.92, 1.0];

const construction: Scene = {
  topo: (_x, y, w) => y * 0.7 + w * 0.35,
  share: 0.34,
  draw: (pen, rand) => {
    const base = -1.06;
    const step = 3.6 / (BAYS.length - 1);
    const xs = BAYS.map((_, i) => -1.8 + i * step);
    xs.forEach((x, i) => pen.path([[x, base], [x, base + BAYS[i] * 2.0]]));
    for (let i = 0; i < xs.length - 1; i++) {
      const top = Math.min(BAYS[i], BAYS[i + 1]) * 2.0;
      for (let y = 0.24; y <= top + 0.001; y += 0.24) {
        if (y > 0.5 && rand() < 0.3) continue;
        pen.path([[xs[i], base + y], [xs[i + 1], base + y]], y > top - 0.25 && i % 3 === 1 ? pulse(i) : 0);
      }
      if (i % 2 === 0) pen.path([[xs[i], base], [xs[i + 1], base + 0.24]]);
      else pen.path([[xs[i], base + 0.24], [xs[i + 1], base]]);
    }
    xs.forEach((x, i) => pen.ring(x, base + Math.floor((BAYS[i] * 2.0) / 0.24) * 0.24, 0.022, i % 2 ? pulse(i + 9) : 0));
  },
};

const landscaping: Scene = {
  topo: (_x, y, w) => y * 0.8 + w * 0.4,
  share: 0.32,
  draw: (pen, rand) => {
    const grow = (x: number, y: number, ang: number, len: number, depth: number, k: number) => {
      const bend = (rand() - 0.5) * 0.9;
      const pts: Pt[] = [[x, y]];
      for (let i = 1; i <= 20; i++) {
        const a = ang + (bend * i) / 20;
        const [px, py] = pts[i - 1];
        pts.push([px + (Math.cos(a) * len) / 20, py + (Math.sin(a) * len) / 20]);
      }
      pen.path(pts, depth === 0 && k % 3 === 0 ? pulse(k) : 0);
      const [ex, ey] = pts[20];
      if (depth === 0) {
        const la = ang + bend;
        pen.line(Array.from({ length: 17 }, (_, i): Pt => {
          const u = i <= 8 ? i / 8 : (16 - i) / 8;
          const w = (i <= 8 ? 1 : -1) * 0.022 * Math.sin(Math.PI * u);
          return [ex + Math.cos(la) * u * 0.08 - Math.sin(la) * w, ey + Math.sin(la) * u * 0.08 + Math.cos(la) * w];
        }), k % 2 ? pulse(k + 3) : 0);
        return;
      }
      const a = ang + bend;
      grow(ex, ey, a + 0.35 + rand() * 0.3, len * 0.72, depth - 1, k * 2 + 1);
      grow(ex, ey, a - 0.35 - rand() * 0.3, len * 0.72, depth - 1, k * 2 + 2);
    };
    [[-1.65, 0.46, 4], [-1.15, 0.36, 4], [-0.55, 0.26, 3], [0.1, 0.22, 3], [0.65, 0.28, 3], [1.15, 0.38, 4], [1.65, 0.46, 4]].forEach(([x, len, d], i) => grow(x, -1.1, Math.PI / 2 + (rand() - 0.5) * 0.3, len, d, i));
    pen.path(span((x) => -1.0 + 0.03 * Math.sin(x * 3.1)));
  },
};

const SCENES: Record<string, Scene> = { tech, finance, energy, health, logistics, architecture, auto, aviation, electrical, roofing, construction, landscaping };

const FIELDS: Record<string, ShapeBuilder> = Object.fromEntries(Object.entries(WAVES).map(([id, w]) => [id, terrain(w, SCENES[id])]));

export const glideField = (variant: string): ShapeBuilder => FIELDS[variant] ?? FIELDS.tech;

const solid = (build: (add: Add) => void, edge = 0.45, motion: ShapeMotion = "static"): ShapeBuilder => (count) => ({ ...cloud(build, count, edge), motion });

const flat = (pts: [number, number][]) => {
  const s = new THREE.Shape();
  s.moveTo(pts[0][0], pts[0][1]);
  for (const [x, y] of pts.slice(1)) s.lineTo(x, y);
  return s;
};

const rounded = (w: number, h: number, r: number) => {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
};

const arc = (r: number, tube: number, from: number, len: number, x: number, y: number, z: number) => new THREE.TorusGeometry(r, tube, 8, 32, len).rotateZ(from).translate(x, y, z);

const server = solid((add) => {
  for (let u = 0; u < 4; u++) {
    const y = (u - 1.5) * 0.42;
    add(box(2.3, 0.34, 1, 0, y, 0));
    for (let b = 0; b < 5; b++) add(box(0.26, 0.14, 0.04, -0.85 + b * 0.32, y, 0.52));
    add(cylZ(0.04, 0.04, 0.82, y + 0.06, 0.52, 10));
    add(cylZ(0.04, 0.04, 0.96, y + 0.06, 0.52, 10));
    add(box(0.3, 0.04, 0.04, 0.89, y - 0.07, 0.52));
  }
  add(box(0.08, 1.8, 1.06, -1.2, 0, 0));
  add(box(0.08, 1.8, 1.06, 1.2, 0, 0));
}, 0.72);

const cloudOutline = () => {
  const circles: [number, number, number][] = [[-0.72, -0.12, 0.48], [-0.1, 0.22, 0.66], [0.7, 0.02, 0.52], [0.1, -0.2, 0.5]];
  const floor = -0.6;
  const pts: [number, number][] = [];
  for (let i = 0; i < 160; i++) {
    const a = (i / 160) * Math.PI * 2;
    const dx = Math.cos(a);
    const dy = Math.sin(a);
    let t = 0;
    for (const [cx, cy, r] of circles) {
      const b = dx * cx + dy * (cy + 0.1);
      const disc = b * b - (cx * cx + (cy + 0.1) * (cy + 0.1)) + r * r;
      if (disc >= 0) t = Math.max(t, b + Math.sqrt(disc));
    }
    if (dy < 0) t = Math.min(t, (floor + 0.1) / dy);
    pts.push([dx * t, dy * t - 0.1]);
  }
  return flat(pts);
};

const cloudShape = solid((add) => {
  add(extrude(cloudOutline(), 0.45, 0.06));
});

const card = solid((add) => {
  add(extrude(rounded(2.4, 1.5, 0.14), 0.06, 0.01));
  add(box(0.38, 0.3, 0.04, -0.75, 0.2, 0.06));
  add(box(0.38, 0.02, 0.05, -0.75, 0.2, 0.08));
  for (let g = 0; g < 4; g++) add(box(0.36, 0.08, 0.03, -0.75 + g * 0.5, -0.25, 0.06));
  add(box(0.7, 0.06, 0.03, -0.6, -0.5, 0.06));
  add(cylZ(0.18, 0.04, 0.62, 0.42, 0.06, 24));
  add(cylZ(0.18, 0.04, 0.84, 0.42, 0.06, 24));
});

const battery = solid((add) => {
  const shell = rounded(2.2, 1.15, 0.16);
  shell.holes.push(rounded(1.94, 0.89, 0.08));
  add(extrude(shell, 0.36, 0.03));
  add(new RoundedBoxGeometry(0.2, 0.46, 0.3, 2, 0.05).translate(1.2, 0, 0));
  for (let i = 0; i < 3; i++) add(new RoundedBoxGeometry(0.3, 0.6, 0.6, 2, 0.03).translate(-0.68 + i * 0.46, 0, 0), 20);
}, 0.55);

const syringe = solid((add) => {
  const put = (g: THREE.BufferGeometry, t?: number) => add(g.rotateZ(-0.85), t);
  put(cyl(0.22, 0.22, 1.6, 0, 0, 0, 32));
  for (let k = 0; k < 8; k++) put(new THREE.TorusGeometry(0.226, k % 2 ? 0.01 : 0.018, 4, 40).rotateX(Math.PI / 2).translate(0, -0.6 + k * 0.17, 0), 40);
  put(new RoundedBoxGeometry(0.8, 0.06, 0.32, 2, 0.02).translate(0, 0.82, 0));
  put(box(0.09, 0.72, 0.09, 0, 1.2, 0));
  put(cyl(0.22, 0.22, 0.05, 0, 1.58, 0, 32));
  put(cyl(0.2, 0.2, 0.1, 0, 0.4, 0, 32), 40);
  put(cyl(0.07, 0.21, 0.2, 0, -0.9, 0, 24));
  put(cyl(0.016, 0.016, 0.85, 0, -1.42, 0, 8), 60);
}, 0.5);

const plane = solid((add) => {
  add(cylX(0.2, 2.4, 0, 0, 0, 32));
  add(new THREE.SphereGeometry(0.2, 24, 12).scale(1.7, 1, 1).translate(1.2, 0, 0));
  add(new THREE.ConeGeometry(0.2, 0.7, 24).rotateZ(Math.PI / 2).translate(-1.55, 0.04, 0));
  for (const s of [-1, 1]) {
    add(extrude(flat([[0.4, 0], [-0.2, 0], [-0.7, s * 1.55], [-0.5, s * 1.55]]), 0.05).rotateX(Math.PI / 2).translate(0, -0.06, 0));
    add(extrude(flat([[-1.45, 0], [-1.75, 0], [-1.95, s * 0.6], [-1.82, s * 0.6]]), 0.03).rotateX(Math.PI / 2).translate(0, 0.08, 0));
    add(cylX(0.09, 0.42, 0.05, -0.17, s * 0.62, 24));
  }
  add(extrude(flat([[-1.35, 0.15], [-1.8, 0.15], [-1.95, 0.78], [-1.75, 0.78]]), 0.04));
  for (let i = 0; i < 12; i++) add(box(0.05, 0.05, 0.02, 0.9 - i * 0.16, 0.06, 0.2), 60);
}, 0.5);

const blueprint = solid((add) => {
  add(box(2.6, 0.02, 1.8, 0.1, 0, 0));
  add(cylZ(0.17, 1.8, -1.35, 0.15, 0, 32));
  const wall = (x1: number, z1: number, x2: number, z2: number) => add(box(Math.abs(x2 - x1) || 0.035, 0.12, Math.abs(z2 - z1) || 0.035, (x1 + x2) / 2, 0.07, (z1 + z2) / 2), 40);
  wall(-0.9, -0.65, 1.2, -0.65);
  wall(-0.9, 0.65, 1.2, 0.65);
  wall(-0.9, -0.65, -0.9, 0.65);
  wall(1.2, -0.65, 1.2, 0.65);
  wall(0.2, -0.65, 0.2, -0.05);
  wall(-0.9, 0.1, -0.2, 0.1);
  wall(0.6, 0.1, 0.6, 0.65);
  wall(0.6, 0.1, 1.2, 0.1);
  for (const [x, z, a] of [[0.2, -0.05, 0], [-0.2, 0.1, Math.PI / 2], [0.6, 0.1, Math.PI]] as [number, number, number][])
    add(new THREE.TorusGeometry(0.28, 0.012, 4, 24, Math.PI / 2).rotateX(Math.PI / 2).rotateY(a).translate(x, 0.03, z), 60);
  add(box(2.1, 0.01, 0.012, 0.15, 0.02, 0.82), 60);
  for (const x of [-0.9, 0.2, 1.2]) add(box(0.012, 0.01, 0.1, x, 0.02, 0.82), 60);
}, 0.5);

const villa = solid((add) => {
  add(box(2.4, 0.05, 1.5, 0, -0.62, 0));
  add(box(1.5, 0.6, 1.1, -0.35, -0.3, 0));
  add(box(1.8, 0.5, 1.15, 0.3, 0.27, 0));
  add(box(1.95, 0.05, 1.25, 0.3, 0.545, 0));
  for (let i = 0; i < 6; i++) add(box(0.02, 0.56, 0.02, -1.05 + i * 0.27, -0.3, 0.56), 60);
  for (const y of [0.1, 0.44]) add(box(1.6, 0.02, 0.02, 0.35, y, 0.585), 60);
  for (let i = 0; i < 6; i++) add(box(0.02, 0.34, 0.02, -0.45 + i * 0.32, 0.27, 0.585), 60);
  add(box(0.06, 0.55, 0.06, 1.1, -0.32, 0.48));
  add(box(0.75, 0.03, 0.45, 0.85, -0.58, 0.45));
}, 0.5);

const bulb = solid((add) => {
  add(lathe([[0.3, -0.5], [0.33, -0.36], [0.42, -0.18], [0.58, 0.02], [0.72, 0.26], [0.77, 0.48], [0.72, 0.72], [0.56, 0.92], [0.32, 1.04], [0, 1.08]], 48));
  add(cyl(0.31, 0.29, 0.42, 0, -0.72, 0, 32));
  for (const y of [-0.58, -0.7, -0.82]) add(new THREE.TorusGeometry(0.315, 0.035, 6, 40).rotateX(Math.PI / 2).translate(0, y, 0), 40);
  add(cyl(0.2, 0.08, 0.16, 0, -1.01, 0, 24));
  const V = (x: number, y: number) => new THREE.Vector3(x, y, 0);
  for (const x of [-0.14, 0.14]) add(between(V(x, -0.5), V(x, 0.22), 0.018, 6), 60);
  const coil: [number, number][] = [[-0.14, 0.22], [-0.08, 0.34], [-0.03, 0.22], [0.03, 0.34], [0.08, 0.22], [0.14, 0.22]];
  for (let i = 0; i < coil.length - 1; i++) add(between(V(...coil[i]), V(...coil[i + 1]), 0.02, 6), 60);
}, 0.5);

const pills = solid((add) => {
  const pill = (x: number, y: number, z: number, rot: number) => {
    add(new THREE.CapsuleGeometry(0.3, 1.1, 8, 24).rotateZ(rot).translate(x, y, z));
    add(new THREE.TorusGeometry(0.305, 0.025, 8, 32).rotateX(Math.PI / 2).rotateZ(rot).translate(x, y, z));
  };
  pill(-0.35, 0.05, 0, 1.0);
  pill(0.45, -0.1, 0.35, -0.55);
});

const firstAid = solid((add) => {
  add(extrude(rounded(2.2, 1.15, 0.12), 0.8, 0.03));
  add(arc(0.32, 0.06, 0, Math.PI, 0, 0.58, 0));
  add(box(0.62, 0.2, 0.14, 0, -0.06, 0.45), 30);
  add(box(0.2, 0.62, 0.14, 0, -0.06, 0.45), 30);
  add(box(2.2, 0.04, 0.84, 0, 0.32, 0));
});

const ship = solid((add) => {
  add(extrude(flat([[-1.5, -0.5], [1.1, -0.5], [1.75, 0.22], [1.3, 0.12], [-1.65, 0.12]]), 0.7, 0.02));
  add(box(3.0, 0.02, 0.72, 0, -0.3, 0), 60);
  const tiers = [2, 3, 3, 2, 3, 2];
  tiers.forEach((n, i) => {
    const x = -0.75 + i * 0.36;
    for (let t = 0; t < n; t++) add(new RoundedBoxGeometry(0.32, 0.2, 0.6, 1, 0.015).translate(x, 0.23 + t * 0.22, 0), 30);
  });
  add(box(0.34, 1.0, 0.6, -1.3, 0.62, 0));
  add(box(0.56, 0.06, 0.74, -1.24, 1.13, 0));
  for (let k = 0; k < 4; k++) add(box(0.35, 0.04, 0.02, -1.3, 0.36 + k * 0.18, 0.31), 60);
  add(box(0.14, 0.34, 0.16, -1.42, 1.33, 0));
}, 0.5);

const parcel = solid((add) => {
  const W = 1.8;
  const H = 1.25;
  const D = 1.35;
  add(new RoundedBoxGeometry(W, H, D, 2, 0.04));
  add(box(W + 0.01, 0.015, 0.02, 0, H / 2, 0), 60);
  add(box(0.3, 0.02, D + 0.02, 0, H / 2 + 0.005, 0), 30);
  for (const s of [-1, 1]) add(box(0.3, 0.42, 0.02, 0, H / 2 - 0.21, s * (D / 2 + 0.01)), 30);
  const fz = D / 2 + 0.015;
  add(box(0.62, 0.42, 0.02, -0.46, -0.2, fz), 30);
  for (let k = 0; k < 3; k++) add(box(0.44 - k * 0.1, 0.03, 0.02, -0.51 + k * 0.05, -0.08 - k * 0.09, fz + 0.01), 60);
  for (let b = 0; b < 9; b++) add(box(b % 3 ? 0.02 : 0.04, 0.22, 0.02, 0.28 + b * 0.05, -0.3, fz), 60);
  for (const x of [0.36, 0.62]) {
    add(box(0.03, 0.18, 0.02, x, 0.18, fz), 60);
    add(extrude(flat([[x - 0.07, 0.27], [x + 0.07, 0.27], [x, 0.36]]), 0.02).translate(0, 0, fz), 60);
  }
}, 0.55);

const bank = solid((add) => {
  add(box(2.4, 0.12, 1.3, 0, -0.94, 0));
  add(box(2.2, 0.1, 1.2, 0, -0.83, 0));
  add(box(2.0, 0.08, 1.1, 0, -0.74, 0));
  for (let i = 0; i < 5; i++) {
    const x = -0.8 + i * 0.4;
    add(cyl(0.1, 0.11, 1.1, x, -0.15, 0.3, 24), 30);
    add(box(0.26, 0.06, 0.26, x, 0.43, 0.3));
    add(box(0.26, 0.06, 0.26, x, -0.67, 0.3));
  }
  add(box(1.9, 0.9, 0.5, 0, -0.25, -0.2));
  add(box(2.1, 0.16, 1.05, 0, 0.54, 0));
  add(box(2.2, 0.05, 1.1, 0, 0.64, 0), 60);
  add(extrude(flat([[-1.1, 0], [1.1, 0], [0, 0.55]]), 1.05, 0.02).translate(0, 0.66, 0));
}, 0.5);

const boltBadge = solid((add) => {
  add(new THREE.TorusGeometry(0.92, 0.06, 10, 72));
  add(extrude(flat([[0.12, 0.72], [-0.38, -0.06], [-0.02, -0.06], [-0.14, -0.72], [0.38, 0.1], [0.02, 0.1]]), 0.28, 0.03));
});

const sun = solid((add) => {
  add(new THREE.SphereGeometry(0.5, 32, 16));
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    add(new THREE.BoxGeometry(0.06, i % 2 ? 0.22 : 0.32, 0.06).translate(0, 0.72 + (i % 2 ? 0 : 0.05), 0).rotateZ(a));
  }
});

const safe = solid((add) => {
  add(extrude(rounded(1.7, 1.9, 0.12), 1.1, 0.03));
  add(extrude(rounded(1.4, 1.6, 0.08), 0.06, 0.01).translate(0, 0, 0.56));
  add(cylZ(0.34, 0.08, 0, 0.1, 0.6, 40));
  add(new THREE.TorusGeometry(0.42, 0.03, 8, 48).translate(0, 0.1, 0.62));
  for (let i = 0; i < 3; i++) add(new THREE.BoxGeometry(0.05, 0.46, 0.05).rotateZ((i * Math.PI) / 3).translate(0, 0.1, 0.68));
  add(box(0.08, 0.36, 0.1, 0.55, -0.45, 0.62));
  add(box(0.2, 0.12, 1.1, -0.6, -1.0, 0));
  add(box(0.2, 0.12, 1.1, 0.6, -1.0, 0));
}, 0.6);

const evCharger = solid((add) => {
  add(new RoundedBoxGeometry(0.9, 2.1, 0.5, 2, 0.08).translate(-0.3, 0, 0));
  add(box(1.2, 0.08, 0.7, -0.3, -1.08, 0));
  add(extrude(rounded(0.6, 0.5, 0.05), 0.04, 0.01).translate(-0.3, 0.48, 0.25), 30);
  add(extrude(flat([[-0.24, 0.04], [-0.4, -0.22], [-0.3, -0.22], [-0.36, -0.42], [-0.18, -0.14], [-0.28, -0.14]]), 0.04).translate(0, 0, 0.26), 40);
  add(box(0.22, 0.34, 0.16, 0.24, -0.1, 0.1));
  add(new THREE.TorusGeometry(0.5, 0.05, 8, 40, Math.PI * 1.1).rotateZ(-Math.PI * 0.55).translate(0.42, -0.62, 0.1), 30);
  add(cyl(0.11, 0.11, 0.32, 0.92, -0.4, 0.1, 20));
  add(cyl(0.05, 0.05, 0.12, 0.92, -0.2, 0.1, 12));
}, 0.55);

const steeringWheel = solid((add) => {
  const put = (g: THREE.BufferGeometry, t?: number) => add(g.rotateX(-0.45), t);
  put(new THREE.TorusGeometry(1.0, 0.11, 16, 72));
  put(cylZ(0.3, 0.2, 0, -0.05, 0, 32));
  put(new THREE.TorusGeometry(0.3, 0.04, 8, 40).translate(0, -0.05, 0.1), 40);
  for (const s of [-1, 1]) put(new THREE.BoxGeometry(0.75, 0.16, 0.08).rotateZ(s * 0.18).translate(s * 0.62, -0.12, 0));
  put(box(0.16, 0.7, 0.08, 0, -0.62, 0));
}, 0.5);

const keyFob = solid((add) => {
  const body = new THREE.Shape();
  body.moveTo(-0.45, -0.95);
  body.lineTo(0.45, -0.95);
  body.quadraticCurveTo(0.6, -0.95, 0.6, -0.75);
  body.lineTo(0.55, 0.55);
  body.quadraticCurveTo(0.5, 0.9, 0, 0.9);
  body.quadraticCurveTo(-0.5, 0.9, -0.55, 0.55);
  body.lineTo(-0.6, -0.75);
  body.quadraticCurveTo(-0.6, -0.95, -0.45, -0.95);
  const put = (g: THREE.BufferGeometry, t?: number) => add(g.rotateZ(-0.35).rotateY(0.3), t);
  put(extrude(body, 0.3, 0.05));
  for (let i = 0; i < 3; i++) put(cylZ(0.15, 0.06, 0, 0.42 - i * 0.42, 0.2, 28), 40);
  put(box(0.4, 0.02, 0.04, 0, -0.68, 0.2), 60);
  put(new THREE.TorusGeometry(0.36, 0.05, 8, 40).translate(0, 1.18, 0.15));
  put(new THREE.TorusGeometry(0.1, 0.035, 6, 24).translate(0, 0.86, 0.15), 40);
}, 0.5);

const earthGlobe = globe(10, true);

const lent = (id: string, role: AlethiaRole) => ALETHIA_ROLES[id]?.[role] ?? earthGlobe;

const floor = (s: ShapeBuilder): ShapeBuilder => async (count) => {
  const res = await s(count);
  const p = res.positions;
  const c = Math.cos(-1.45);
  const n = Math.sin(-1.45);
  for (let i = 0; i < p.length; i += 3) {
    const y = p[i + 1] - 0.1;
    const z = p[i + 2];
    p[i + 1] = y * c - z * n;
    p[i + 2] = y * n + z * c;
  }
  return res;
};

const spins = (s: ShapeBuilder): ShapeBuilder => async (count) => ({ ...(await s(count)), motion: "spin" });

const own = (variant: string) => PARTICLE_SETS[variant];

const CELLS: Record<string, ShapeBuilder[]> = {
  electrical: [own("electrical").hero, bulb, floor(own("electrical").overview), evCharger],
  roofing: [own("roofing").hero, lent("energy", "overview"), floor(own("roofing").overview), own("roofing").close],
  construction: [own("construction").scan, floor(own("construction").overview), own("construction").close, lent("architecture", "scan")],
  landscaping: [lent("landscaping", "scan"), floor(own("landscaping").overview), lent("earth", "overview"), own("landscaping").close],
  tech: [server, lent("tech", "overview"), cloudShape, lent("tech", "visit")],
  finance: [card, lent("finance", "overview"), ALETHIA_HERO_SMALL.finance ?? safe, safe],
  energy: [lent("energy", "scan"), lent("energy", "overview"), battery, bulb],
  health: [pills, lent("health", "visit"), lent("health", "scan"), syringe],
  logistics: [ALETHIA_HERO_SMALL.logistics ?? parcel, ship, plane, lent("logistics", "scan")],
  architecture: [lent("architecture", "visit"), lent("architecture", "overview"), lent("architecture", "scan"), architectureSet.close],
  auto: [autoSet.hero, autoSet.scan, evCharger, keyFob],
};

const ABOUT: Record<string, ShapeBuilder> = { tech: earthGlobe, finance: bank, energy: boltBadge, health: lent("health", "overview"), logistics: logisticsSet.close, architecture: blueprint, auto: steeringWheel, electrical: battery, roofing: cloudShape, construction: blueprint, landscaping: lent("landscaping", "visit") };

const CLOSE: Record<string, ShapeBuilder> = { tech: boltBadge, finance: lent("finance", "scan"), energy: sun, health: firstAid, logistics: parcel, architecture: villa, auto: autoSet.close, electrical: own("electrical").close, roofing: sun, construction: lent("architecture", "visit"), landscaping: lent("earth", "scan") };

export const glideCellShapes: ((variant: string) => ShapeBuilder)[] = [0, 1, 2, 3].map((i) => (variant: string) => spins(CELLS[variant]?.[i] ?? (own(variant) ? [own(variant).hero, own(variant).overview, own(variant).scan, own(variant).close][i] : CELLS.tech[i])));

export const glideAboutShape = (variant: string): ShapeBuilder => spins(ABOUT[variant] ?? own(variant)?.overview ?? ABOUT.tech);

export const glideCloseShape = (variant: string): ShapeBuilder => spins(CLOSE[variant] ?? own(variant)?.close ?? CLOSE.tech);

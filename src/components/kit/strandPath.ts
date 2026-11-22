export type Ctrl = { x: number; y: number; w: number; g: number; b?: number };

export type Sampled = { data: Float32Array; count: number; ds: number; length: number; at: number[]; maxY: Float32Array };

const smooth01 = (u: number) => u * u * (3 - 2 * u);

const box = (src: Float32Array, r: number) => {
  const out = new Float32Array(src.length);
  const n = src.length;
  let sum = 0;
  let lo = 0;
  let hi = -1;
  for (let i = 0; i < n; i += 1) {
    const a = Math.max(0, i - r);
    const b = Math.min(n - 1, i + r);
    while (hi < b) sum += src[++hi];
    while (lo < a) sum -= src[lo++];
    out[i] = sum / (b - a + 1);
  }
  return out;
};

const erode = (src: Float32Array, r: number) => {
  const out = new Float32Array(src.length);
  for (let i = 0; i < src.length; i += 1) {
    let m = Infinity;
    for (let j = Math.max(0, i - r); j <= Math.min(src.length - 1, i + r); j += 1) m = Math.min(m, src[j]);
    out[i] = m;
  }
  return out;
};

export const samplePath = (ctrl: Ctrl[], step: number, maxSamples = 2048): Sampled => {
  const n = ctrl.length;
  const dx: number[] = [];
  const dy: number[] = [];
  const dw: number[] = [];
  const dg: number[] = [];
  const db: number[] = [];
  const startIdx: number[] = [];
  const pt = (i: number) => {
    if (i < 0) return { x: 2 * ctrl[0].x - ctrl[1].x, y: 2 * ctrl[0].y - ctrl[1].y };
    if (i > n - 1) return { x: 2 * ctrl[n - 1].x - ctrl[n - 2].x, y: 2 * ctrl[n - 1].y - ctrl[n - 2].y };
    return ctrl[i];
  };
  for (let i = 0; i < n - 1; i += 1) {
    const p0 = pt(i - 1);
    const p1 = pt(i);
    const p2 = pt(i + 1);
    const p3 = pt(i + 2);
    const k = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.max(Math.sqrt(Math.hypot(b.x - a.x, b.y - a.y)), 1e-3);
    const t1 = k(p0, p1);
    const t2 = t1 + k(p1, p2);
    const t3 = t2 + k(p2, p3);
    const sub = Math.max(8, Math.ceil(Math.hypot(p2.x - p1.x, p2.y - p1.y) / 2));
    startIdx.push(dx.length);
    for (let s = 0; s < sub || (i === n - 2 && s === sub); s += 1) {
      const u = s / sub;
      const t = t1 + (t2 - t1) * u;
      const lerp = (a: number, b: number, ta: number, tb: number) => ((tb - t) * a + (t - ta) * b) / (tb - ta);
      const ax1 = lerp(p0.x, p1.x, 0, t1);
      const ay1 = lerp(p0.y, p1.y, 0, t1);
      const ax2 = lerp(p1.x, p2.x, t1, t2);
      const ay2 = lerp(p1.y, p2.y, t1, t2);
      const ax3 = lerp(p2.x, p3.x, t2, t3);
      const ay3 = lerp(p2.y, p3.y, t2, t3);
      const bx1 = lerp(ax1, ax2, 0, t2);
      const by1 = lerp(ay1, ay2, 0, t2);
      const bx2 = lerp(ax2, ax3, t1, t3);
      const by2 = lerp(ay2, ay3, t1, t3);
      dx.push(lerp(bx1, bx2, t1, t2));
      dy.push(lerp(by1, by2, t1, t2));
      const e = smooth01(u);
      dw.push(ctrl[i].w + (ctrl[i + 1].w - ctrl[i].w) * e);
      dg.push(ctrl[i].g + (ctrl[i + 1].g - ctrl[i].g) * e);
      db.push((ctrl[i].b ?? 0) + ((ctrl[i + 1].b ?? 0) - (ctrl[i].b ?? 0)) * e);
    }
  }
  startIdx.push(dx.length - 1);
  const cum = new Float64Array(dx.length);
  for (let i = 1; i < dx.length; i += 1) cum[i] = cum[i - 1] + Math.hypot(dx[i] - dx[i - 1], dy[i] - dy[i - 1]);
  const length = cum[dx.length - 1];
  const ds = Math.max(step, length / (maxSamples - 1));
  const count = Math.max(2, Math.floor(length / ds) + 1);
  const X = new Float32Array(count);
  const Y = new Float32Array(count);
  const Wd = new Float32Array(count);
  const G = new Float32Array(count);
  const B = new Float32Array(count);
  let j = 0;
  for (let i = 0; i < count; i += 1) {
    const s = Math.min(length, i * ds);
    while (j < dx.length - 2 && cum[j + 1] < s) j += 1;
    const f = (s - cum[j]) / Math.max(cum[j + 1] - cum[j], 1e-6);
    X[i] = dx[j] + (dx[j + 1] - dx[j]) * f;
    Y[i] = dy[j] + (dy[j + 1] - dy[j]) * f;
    Wd[i] = dw[j] + (dw[j + 1] - dw[j]) * f;
    G[i] = dg[j] + (dg[j + 1] - dg[j]) * f;
    B[i] = db[j] + (db[j + 1] - db[j]) * f;
  }
  const at = startIdx.map((d) => cum[d]);
  const r = Math.max(1, Math.round(24 / ds));
  const theta = new Float32Array(count);
  for (let i = 0; i < count; i += 1) {
    const a = Math.max(0, i - 2);
    const b = Math.min(count - 1, i + 2);
    const ang = Math.atan2(Y[b] - Y[a], X[b] - X[a]);
    theta[i] = i === 0 ? ang : theta[i - 1] + Math.atan2(Math.sin(ang - theta[i - 1]), Math.cos(ang - theta[i - 1]));
  }
  const th = box(theta, r);
  const kap = new Float32Array(count);
  for (let i = 0; i < count; i += 1) {
    const a = Math.max(0, i - 1);
    const b = Math.min(count - 1, i + 1);
    kap[i] = (th[b] - th[a]) / Math.max((b - a) * ds, 1e-6);
  }
  const ks = box(kap, r);
  const big = 1e5;
  const limP = new Float32Array(count);
  const limN = new Float32Array(count);
  for (let i = 0; i < count; i += 1) {
    limP[i] = ks[i] > 1e-6 ? Math.min(big, 0.8 / ks[i]) : big;
    limN[i] = ks[i] < -1e-6 ? Math.min(big, 0.8 / -ks[i]) : big;
  }
  const r2 = Math.max(1, Math.round(90 / ds));
  const lp = box(erode(limP, r2), r2);
  const ln = box(erode(limN, r2), r2);
  const data = new Float32Array(count * 12);
  const maxY = new Float32Array(count);
  for (let i = 0; i < count; i += 1) {
    data.set([X[i], Y[i], -Math.sin(th[i]), Math.cos(th[i])], i * 4);
    data.set([Wd[i], G[i], Math.max(2, lp[i]), Math.max(2, ln[i])], (count + i) * 4);
    data.set([B[i], 0, 0, 0], (count * 2 + i) * 4);
    maxY[i] = Math.max(i ? maxY[i - 1] : -Infinity, Y[i]);
  }
  return { data, count, ds, length, at, maxY };
};

export const arcAtY = (path: Sampled, y: number) => {
  let lo = 0;
  let hi = path.count - 1;
  if (path.maxY[hi] <= y) return path.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (path.maxY[mid] < y) lo = mid + 1;
    else hi = mid;
  }
  return lo * path.ds;
};

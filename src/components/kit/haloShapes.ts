import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

export type HaloBuilt = {
  object: THREE.Group;
  tick: (t: number) => void;
};

export type HaloShapeDef = {
  id: string;
  label: string;
  alt: string;
  industries: string[];
  build: (glass: THREE.Material, core: THREE.Material) => HaloBuilt;
};

export const HALO_RADIUS = 1.45;

const TAU = Math.PI * 2;
const clamp = (x: number) => Math.min(1, Math.max(0, x));
const smooth = (x: number) => x * x * (3 - 2 * x);
const inOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const pulse = (t: number, period: number, start: number, dur: number) => Math.sin(Math.PI * smooth(clamp(((((t % period) + period) % period) - start) / dur)));

const normalise = (inner: THREE.Group, size = 1) => {
  inner.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(inner);
  inner.position.sub(box.getCenter(new THREE.Vector3()));
  inner.updateMatrixWorld(true);
  let r = 0;
  const v = new THREE.Vector3();
  inner.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const pos = mesh.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) r = Math.max(r, v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld).length());
  });
  const outer = new THREE.Group();
  outer.add(inner);
  outer.scale.setScalar((HALO_RADIUS * size) / (r || 1));
  return outer;
};

const loop = (profile: (u: number, v: number) => [number, number], segU: number, segV: number, shift = 0) => {
  const pos: number[] = [];
  for (let i = 0; i < segU; i++) {
    const a = (i / segU) * TAU;
    const n = new THREE.Vector3(Math.cos(a), Math.sin(a), 0);
    for (let j = 0; j < segV; j++) {
      const [x, z] = profile(i / segU, j / segV);
      pos.push(n.x * (1 + x), n.y * (1 + x), z);
    }
  }
  const index: number[] = [];
  for (let i = 0; i < segU; i++) {
    const i2 = (i + 1) % segU;
    const s = i2 === 0 ? shift : 0;
    for (let j = 0; j < segV; j++) {
      const j2 = (j + 1) % segV;
      const a = i * segV + j;
      const b = i * segV + j2;
      const c = i2 * segV + ((j + s) % segV);
      const d = i2 * segV + ((j2 + s) % segV);
      index.push(a, c, b, b, c, d);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(index);
  geo.computeVertexNormals();
  const p0 = new THREE.Vector3().fromBufferAttribute(geo.attributes.position, 0);
  const n0 = new THREE.Vector3().fromBufferAttribute(geo.attributes.normal, 0);
  const out = p0.clone().sub(new THREE.Vector3(1, 0, 0));
  if (out.dot(n0) < 0) {
    for (let k = 0; k < index.length; k += 3) [index[k + 1], index[k + 2]] = [index[k + 2], index[k + 1]];
    geo.setIndex(index);
    geo.computeVertexNormals();
  }
  return geo;
};

const twist = (glass: THREE.Material): HaloBuilt => {
  const g = new THREE.Group();
  const geo = loop((u, v) => {
    const a = v * TAU;
    const th = u * TAU;
    const ex = Math.cos(a) * 0.36;
    const ey = Math.sin(a) * 0.15;
    return [ex * Math.cos(th) - ey * Math.sin(th), ex * Math.sin(th) + ey * Math.cos(th)];
  }, 360, 64);
  const ring = new THREE.Mesh(geo, glass);
  g.add(ring);
  g.rotation.set(-0.42, 0.28, 0);
  const object = normalise(g);
  return {
    object,
    tick: (t) => {
      ring.rotation.z = t * 0.28;
      g.rotation.x = -0.42 + Math.sin(t * 0.4) * 0.06;
    },
  };
};

const split = (glass: THREE.Material, core: THREE.Material): HaloBuilt => {
  const g = new THREE.Group();
  const shell = new THREE.SphereGeometry(1, 96, 48, 0, TAU, 0, Math.PI / 2);
  const cap = new THREE.CircleGeometry(1, 96);
  cap.rotateX(Math.PI / 2);
  const half = () => {
    const h = new THREE.Group();
    h.add(new THREE.Mesh(shell, glass), new THREE.Mesh(cap, glass));
    return h;
  };
  const top = half();
  const bottom = half();
  bottom.rotation.x = Math.PI;
  const pearl = new THREE.Mesh(new THREE.SphereGeometry(0.34, 64, 32), core);
  const tilt = new THREE.Group();
  tilt.add(top, bottom, pearl);
  tilt.rotation.set(0.12, 0, -0.38);
  g.add(tilt);
  const object = normalise(g, 0.82);
  return {
    object,
    tick: (t) => {
      const open = 0.42 + pulse(t, 6, 0.5, 3.4) * 0.12;
      top.position.y = open;
      bottom.position.y = -open;
      top.rotation.y = t * 0.2;
      bottom.rotation.y = -t * 0.2;
      pearl.position.y = Math.sin(t * 0.9) * 0.03;
    },
  };
};

const ribbon = (glass: THREE.Material): HaloBuilt => {
  const g = new THREE.Group();
  const segV = 64;
  const geo = loop((u, v) => {
    const a = v * TAU;
    const w = 0.34;
    const d = 0.05;
    const c = Math.cos(a);
    const s = Math.sin(a);
    const x = Math.sign(c) * Math.pow(Math.abs(c), 0.25) * w;
    const y = Math.sign(s) * Math.pow(Math.abs(s), 0.6) * d;
    const th = u * Math.PI;
    return [x * Math.cos(th) - y * Math.sin(th), x * Math.sin(th) + y * Math.cos(th)];
  }, 360, segV, segV / 2);
  const band = new THREE.Mesh(geo, glass);
  g.add(band);
  g.rotation.set(-0.55, 0.35, 0);
  const object = normalise(g);
  return {
    object,
    tick: (t) => {
      band.rotation.z = t * 0.24;
      g.rotation.y = 0.35 + Math.sin(t * 0.35) * 0.12;
    },
  };
};

const AXES = ["x", "y", "z"] as const;

const cube = (glass: THREE.Material): HaloBuilt => {
  const g = new THREE.Group();
  const body = new THREE.Group();
  const geo = new RoundedBoxGeometry(0.94, 0.94, 0.94, 5, 0.11);
  const cubies: THREE.Mesh[] = [];
  for (let x = -1; x <= 1; x++)
    for (let y = -1; y <= 1; y++)
      for (let z = -1; z <= 1; z++) {
        const mesh = new THREE.Mesh(geo, glass);
        mesh.position.set(x, y, z);
        body.add(mesh);
        cubies.push(mesh);
      }
  const pivot = new THREE.Group();
  body.add(pivot);
  g.add(body);
  g.rotation.set(0.5, -0.66, 0);
  const object = normalise(g, 1.12);
  const period = 2.8;
  const dur = 1.2;
  let move = -1;
  const axisOf = (n: number) => AXES[n % 3];
  const dirOf = (n: number) => (n % 2 ? 1 : -1);
  const settle = () => {
    for (const c of [...pivot.children]) {
      body.attach(c);
      c.position.round();
    }
    pivot.rotation.set(0, 0, 0);
  };
  const begin = (n: number) => {
    const axis = axisOf(n);
    const layer = (Math.floor(n / 3) % 3) - 1;
    for (const c of cubies) if (Math.round(c.position[axis]) === layer) pivot.attach(c);
  };
  return {
    object,
    tick: (t) => {
      const n = Math.max(0, Math.floor(t / period));
      if (n !== move) {
        if (move >= 0) pivot.rotation[axisOf(move)] = (dirOf(move) * Math.PI) / 2;
        settle();
        begin(n);
        move = n;
      }
      pivot.rotation[axisOf(n)] = (dirOf(n) * Math.PI * inOut(clamp((t - n * period) / dur))) / 2;
      body.rotation.y = Math.sin(t * 0.25) * 0.18;
    },
  };
};

export const HALO_SHAPES: Record<string, HaloShapeDef> = {
  twist: {
    id: "twist",
    label: "Twist",
    alt: "A twisted glass ring floating above still water, turning slowly",
    industries: ["apps", "memberships", "clubs", "premium services", "communities", "partnerships", "dating", "social apps", "consulting", "recruitment", "any business"],
    build: twist,
  },
  cube: {
    id: "cube",
    label: "Cube",
    alt: "A glass puzzle cube floating above still water, its layers turning one at a time",
    industries: ["saas", "software", "ai", "platforms", "productivity", "web3", "fintech", "banking", "data", "insurance", "research", "real estate", "architecture", "interior design"],
    build: cube,
  },
  split: {
    id: "split",
    label: "Split",
    alt: "A glass sphere that parts in two around a pearl, floating above still water",
    industries: ["wellness", "skincare", "beauty", "health clinics", "biotech", "jewellery", "luxury retail", "perfume", "watches"],
    build: split,
  },
  ribbon: {
    id: "ribbon",
    label: "Ribbon",
    alt: "A glass ribbon loop with one twist floating above still water",
    industries: ["fashion", "music", "entertainment", "events", "creative agencies", "hospitality", "hotels", "travel"],
    build: ribbon,
  },
};

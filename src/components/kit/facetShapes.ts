import * as THREE from "three";

export type FacetBuilt = {
  object: THREE.Group;
  parts: THREE.Group[];
  tick: (t: number, burst: number) => void;
};

const fly = (child: THREE.Object3D) => {
  const g = new THREE.Group();
  g.add(child);
  return g;
};

export type FacetShapeDef = {
  id: string;
  label: string;
  alt: string;
  industries: string[];
  model?: string;
  build?: (glass: THREE.Material, core: THREE.Material) => FacetBuilt;
};

export const FACET_SIZE = 3.6;

const clamp = (x: number) => Math.min(1, Math.max(0, x));
const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const window01 = (t: number, period: number, start: number, dur: number) => ease(clamp((((t % period) + period) % period - start) / dur));
const bump = (p: number) => Math.sin(Math.PI * p);

const normalise = (inner: THREE.Group) => {
  const box = new THREE.Box3().setFromObject(inner);
  inner.position.sub(box.getCenter(new THREE.Vector3()));
  let r = 0;
  const v = new THREE.Vector3();
  inner.updateMatrixWorld(true);
  inner.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const pos = mesh.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) r = Math.max(r, v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld).length());
  });
  const outer = new THREE.Group();
  outer.add(inner);
  outer.scale.setScalar(FACET_SIZE / 2 / (r || 1));
  return outer;
};

const lathe = (points: [number, number][], segments: number) => {
  const geo = new THREE.LatheGeometry(
    points.map(([x, y]) => new THREE.Vector2(x, y)),
    segments,
  ).toNonIndexed();
  geo.computeVertexNormals();
  return geo;
};

const pill = (glass: THREE.Material, core: THREE.Material): FacetBuilt => {
  const g = new THREE.Group();
  const profile: [number, number][] = [[0.001, 0], [0.6, 0], [0.6, 0.62]];
  for (let k = 1; k <= 20; k++) {
    const a = (k / 20) * (Math.PI / 2);
    profile.push([Math.max(0.001, 0.6 * Math.cos(a)), 0.62 + 0.6 * Math.sin(a)]);
  }
  const geo = lathe(profile, 72);
  const top = new THREE.Mesh(geo, glass);
  const bottom = new THREE.Mesh(geo, glass);
  bottom.rotation.z = Math.PI;
  const beads = new THREE.Group();
  const seeds: [number, number, number, number][] = [
    [0, 0.3, 0, 0.17],
    [0.16, -0.18, 0.08, 0.13],
    [-0.14, -0.02, -0.12, 0.11],
  ];
  for (const [x, y, z, r] of seeds) {
    const bead = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 2), core);
    bead.position.set(x, y, z);
    beads.add(bead);
  }
  const parts = [fly(top), fly(bottom)];
  g.add(...parts, beads);
  g.rotation.z = 0.75;
  const object = normalise(g);
  return {
    object,
    parts,
    tick: (t, b) => {
      const s = Math.max(bump(window01(t, 4.4, 0, 2.2)), b);
      top.position.y = s * 0.3;
      bottom.position.y = -s * 0.3;
      top.rotation.x = s * 0.16;
      bottom.rotation.x = -s * 0.16;
      beads.rotation.y = t * 0.7;
      beads.scale.setScalar(0.85 + s * 0.35);
    },
  };
};

const ring = (glass: THREE.Material, core: THREE.Material): FacetBuilt => {
  const g = new THREE.Group();
  const N = 8;
  const ri = 0.66;
  const ro = 1;
  const h = Math.PI / N - 0.025;
  const pts: THREE.Vector2[] = [];
  for (let k = 0; k <= 10; k++) {
    const a = -h + (2 * h * k) / 10;
    pts.push(new THREE.Vector2(ro * Math.cos(a), ro * Math.sin(a)));
  }
  for (let k = 10; k >= 0; k--) {
    const a = -h + (2 * h * k) / 10;
    pts.push(new THREE.Vector2(ri * Math.cos(a), ri * Math.sin(a)));
  }
  const geo = new THREE.ExtrudeGeometry(new THREE.Shape(pts), { depth: 0.3, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.04, bevelSegments: 3, curveSegments: 16 });
  geo.computeBoundingBox();
  const c = new THREE.Vector3();
  geo.boundingBox?.getCenter(c);
  geo.translate(-c.x, 0, -c.z);
  const parts: THREE.Group[] = [];
  const segs = Array.from({ length: N }, (_, i) => {
    const pivot = new THREE.Group();
    pivot.rotation.z = ((i + 0.5) * 2 * Math.PI) / N;
    const seg = new THREE.Group();
    seg.position.x = c.x;
    seg.add(new THREE.Mesh(geo, glass));
    pivot.add(seg);
    const part = fly(pivot);
    parts.push(part);
    g.add(part);
    return seg;
  });
  const heart = new THREE.Mesh(new THREE.TorusGeometry(c.x, 0.055, 16, 96), core);
  g.add(heart);
  g.rotation.set(-0.95, 0, 0.25);
  const object = normalise(g);
  return {
    object,
    parts,
    tick: (t, b) => {
      segs.forEach((seg, i) => {
        const n = Math.floor(t / 6);
        const p = window01(t, 6, i * 0.2, 1);
        seg.rotation.x = (n + p) * Math.PI + b * (Math.PI / 2) * (i % 2 ? 1 : -1);
        seg.position.x = c.x + bump(p) * 0.12 + b * 0.34;
        seg.position.z = bump(p) * 0.1;
      });
      heart.scale.setScalar(1 + b * 0.05);
    },
  };
};

export const FACET_SHAPES: Record<string, FacetShapeDef> = {
  cube: {
    id: "cube",
    label: "Cube",
    alt: "A glass puzzle cube. Hover or tap to pull it apart.",
    model: "https://storage.googleapis.com/webild/default/models/cube-glass/model.303a71eab394.glb",
    industries: ["design studios", "creative agencies", "product design", "homeware", "consulting", "galleries", "museums", "events", "architecture", "real estate", "construction", "interior design", "furniture", "legal", "professional services", "recruitment", "hospitality", "hotels", "any business"],
  },
  pill: {
    id: "pill",
    label: "Pill",
    alt: "A glass capsule that splits in two to show a glowing core, then closes. Hover or tap to open it.",
    industries: ["skincare", "supplements", "biotech", "wellness", "perfume", "beauty"],
    build: pill,
  },
  ring: {
    id: "ring",
    label: "Ring",
    alt: "A ring of eight bevelled glass blocks that flip one after another around a glowing core. Hover or tap to open it.",
    industries: ["jewellery", "luxury retail", "fashion", "watches", "saas", "software", "platforms", "integrations", "ai", "partnerships", "fintech", "data", "research", "energy", "web3"],
    build: ring,
  },
};

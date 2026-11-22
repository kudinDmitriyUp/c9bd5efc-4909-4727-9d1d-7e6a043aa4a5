import * as THREE from "three";
import { Reflector } from "three/examples/jsm/objects/Reflector.js";

type Shader = { name: string; uniforms: Record<string, THREE.IUniform>; vertexShader: string; fragmentShader: string };
const R = (Reflector as unknown as { ReflectorShader: Shader }).ReflectorShader;

export const rippleShader = () => ({
  ...R,
  uniforms: { ...R.uniforms, uTime: { value: 0 } },
  vertexShader: R.vertexShader.replace("varying vec4 vUv;", "varying vec4 vUv;\nvarying vec2 vRip;").replace("vUv = textureMatrix", "vRip = position.xy;\nvUv = textureMatrix"),
  fragmentShader: R.fragmentShader
    .replace("varying vec4 vUv;", "varying vec4 vUv;\nvarying vec2 vRip;\nuniform float uTime;")
    .replace(
      "vec4 base = texture2DProj( tDiffuse, vUv );",
      "vec4 rUv = vUv;\nrUv.xy += vec2(sin(vRip.x * 2.3 + uTime * 1.1) + sin(vRip.y * 3.1 - uTime * .9 + vRip.x), cos(vRip.y * 2.7 + uTime * 1.3) + sin(vRip.x * 1.7 + vRip.y * 1.9 + uTime * .7)) * .0012 * rUv.w;\nvec4 base = texture2DProj( tDiffuse, rUv );",
    ),
});

type Leaf = { hue?: number; spread?: number; sat?: number; light?: number; seed?: number; photo?: boolean };

const photos = new Map<string, Promise<HTMLImageElement>>();
const imageLoader = new THREE.ImageLoader();

const photo = (t: THREE.Texture, url: string) => {
  let p = photos.get(url);
  if (!p) {
    p = imageLoader.loadAsync(url);
    photos.set(url, p);
    p.catch(() => photos.delete(url));
  }
  p.then((img) => {
    t.image = img;
    t.needsUpdate = true;
  }).catch(() => {});
  return t;
};

export const barkTexture = (color: THREE.ColorRepresentation) => {
  const cv = document.createElement("canvas");
  cv.width = cv.height = 1;
  const g = cv.getContext("2d")!;
  g.fillStyle = "#" + new THREE.Color(color).getHexString();
  g.fillRect(0, 0, 1, 1);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return photo(t, "https://storage.googleapis.com/webild/default/kit/foliage/bark.webp");
};

export const leafTexture = ({ hue = 78, spread = 34, sat = 28, light = 7, seed: s0 = 5, photo: real = true }: Leaf = {}) => {
  const s = 512;
  const cv = document.createElement("canvas");
  cv.width = cv.height = s;
  const g = cv.getContext("2d")!;
  let seed = s0;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const body = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s * 0.42);
  const bh = (hue + spread * 0.3).toFixed(0);
  body.addColorStop(0, `hsla(${bh}, ${sat}%, ${light + 3}%, 1)`);
  body.addColorStop(0.55, `hsla(${bh}, ${sat + 6}%, ${light + 8}%, 0.9)`);
  body.addColorStop(1, `hsla(${bh}, ${sat + 6}%, ${light + 10}%, 0)`);
  g.fillStyle = body;
  g.fillRect(0, 0, s, s);
  const blobs = Array.from({ length: 9 }, (_, i) => {
    const a = i * 0.7 + rnd(), r = i ? s * (0.08 + 0.16 * rnd()) : 0;
    return [s / 2 + Math.cos(a) * r, s / 2 + Math.sin(a) * r, s * (0.1 + 0.06 * rnd())];
  });
  const leaves = Array.from({ length: 3200 }, () => {
    const [bx, by, br] = blobs[Math.floor(rnd() * blobs.length)];
    const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * br;
    const x = bx + Math.cos(a) * r, y = by + Math.sin(a) * r;
    const rim = Math.min(1, Math.hypot(x - s / 2, y - s / 2) / (s * 0.38));
    const lit = THREE.MathUtils.clamp(0.22 + 0.5 * rim + 0.18 * (0.5 - y / s) + (rnd() - 0.5) * 0.3, 0, 1);
    const l = (6 + 6 * rnd()) * (1 - 0.3 * rim);
    return { x, y, lit, a: Math.atan2(y - s / 2, x - s / 2) + Math.PI / 2 + (rnd() - 0.5) * 1.6, l, k: 0.5 + 0.2 * rim, h: hue + spread * rnd() };
  }).sort((p, q) => p.lit - q.lit);
  for (const f of leaves) {
    g.fillStyle = `hsl(${f.h.toFixed(0)}, ${(sat + 18 * f.lit).toFixed(0)}%, ${(light + 22 * f.lit).toFixed(0)}%)`;
    g.beginPath();
    g.ellipse(f.x, f.y, f.l, f.l * f.k, f.a, 0, Math.PI * 2);
    g.fill();
  }
  const tiled = document.createElement("canvas");
  tiled.width = tiled.height = s * 2;
  const tg = tiled.getContext("2d")!;
  for (let i = 0; i < 4; i++) tg.drawImage(cv, (i % 2) * s, Math.floor(i / 2) * s);
  const t = new THREE.CanvasTexture(tiled);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return real ? photo(t, "https://storage.googleapis.com/webild/default/kit/foliage/leaves.webp") : t;
};

const BROAD = [0, 1];
const SHRUB = [2, 1];
const SPRUCE = [3];

const atlasUv = (g: THREE.BufferGeometry, cell: number) => {
  const uv = g.attributes.uv;
  const u0 = (cell % 2) * 0.5, v0 = (1 - Math.floor(cell / 2)) * 0.5;
  for (let j = 0; j < uv.count; j++) uv.setXY(j, u0 + uv.getX(j) * 0.5, v0 + uv.getY(j) * 0.5);
};

const SWAY =
  "#include <begin_vertex>\nvLeaf = aLeaf;\nfloat swK = max(transformed.y - .5, 0.) * .01;\ntransformed.xz += (vec2(sin(uTime * 1.3 + transformed.x * .4 + transformed.z * .3), cos(uTime * 1.1 + transformed.z * .4)) + vec2(sin(uTime * 3.1 + transformed.y * 2. + transformed.x), cos(uTime * 2.7 + transformed.z * 1.7)) * .35) * swK;";

const LEAF_TINT = "#include <color_fragment>\ndiffuseColor.rgb *= vec3(1. + vLeaf.y * .1, 1. + vLeaf.y * .03, 1. - vLeaf.y * .14);";

const LEAF_EDGE =
  "#ifdef USE_MAP\nvec2 lfT = vMapUv * 1024.;\ndiffuseColor.a *= 1. + .3 * max(.5 * log2(max(dot(dFdx(lfT), dFdx(lfT)), dot(dFdy(lfT), dFdy(lfT)))), 0.);\n#endif\nvec3 lfF = normalize(cross(dFdx(vViewPosition), dFdy(vViewPosition)));\ndiffuseColor.a *= smoothstep(.06, .32, abs(dot(lfF, normalize(vViewPosition))));\n#include <alphatest_fragment>";

const LEAF_LIGHT = `#include <lights_fragment_end>
#if NUM_DIR_LIGHTS > 0
{
  vec3 lfN = normalize(normal);
  float lfNL = dot(lfN, directLight.direction);
  float lfOpen = 1. - vLeaf.x;
  vec3 lfD = directLight.color * BRDF_Lambert(material.diffuseColor);
  reflectedLight.directDiffuse += lfD * (max((lfNL + .7) / 1.7, 0.) - max(lfNL, 0.)) * .55 * lfOpen;
  float lfBack = pow(max(dot(-geometryViewDir, directLight.direction), 0.), 3.);
  float lfEdge = 1. - abs(dot(lfN, geometryViewDir));
  reflectedLight.directDiffuse += lfD * vec3(1.15, 1., .45) * lfBack * (.3 + 1.1 * lfEdge) * lfOpen * lfOpen * 1.4;
}
#endif
reflectedLight.indirectDiffuse *= mix(1., .32, vLeaf.x);
reflectedLight.directDiffuse *= mix(1., .5, vLeaf.x);`;

const BROAD_TINT = "#include <color_fragment>\ndiffuseColor.rgb *= vec3(1. + vLeaf.y * .17, 1. + vLeaf.y * .06, 1. - vLeaf.y * .26) * (1.06 - abs(vLeaf.y) * .08);";

const BROAD_LIGHT = `#include <lights_fragment_end>
#if NUM_DIR_LIGHTS > 0
{
  vec3 lfN = normalize(normal);
  float lfNL = dot(lfN, directLight.direction);
  float lfOpen = 1. - vLeaf.x;
  vec3 lfD = directLight.color * BRDF_Lambert(material.diffuseColor);
  reflectedLight.directDiffuse += lfD * (max((lfNL + .8) / 1.8, 0.) - max(lfNL, 0.)) * .6 * lfOpen;
  float lfBack = pow(max(dot(-geometryViewDir, directLight.direction), 0.), 3.);
  float lfEdge = 1. - abs(dot(lfN, geometryViewDir));
  reflectedLight.directDiffuse += lfD * vec3(1.15, 1., .45) * lfBack * (.3 + 1.1 * lfEdge) * lfOpen * lfOpen * 1.4;
  reflectedLight.directDiffuse += lfD * vec3(1.1, 1.02, .78) * pow(lfEdge, 2.5) * smoothstep(-.25, .45, lfNL) * lfOpen * .7;
  reflectedLight.indirectDiffuse *= mix(vec3(1.), vec3(.8, .93, 1.16), smoothstep(.15, -.65, lfNL));
}
#endif
reflectedLight.indirectDiffuse *= mix(1.08, .52, vLeaf.x);
reflectedLight.directDiffuse *= mix(1., .6, vLeaf.x);`;

const LEAF_HAZE = "#include <fog_fragment>\n#ifdef USE_FOG\ngl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, (1. - exp(-vFogDepth * .006)) * .3);\n#endif";

export const sway = <M extends THREE.Material>(m: M, broad = false) => {
  const prev = m.onBeforeCompile;
  const key = m.customProgramCacheKey.bind(m);
  m.onBeforeCompile = (s, r) => {
    prev.call(m, s, r);
    s.vertexShader = "uniform float uTime;\nattribute vec2 aLeaf;\nvarying vec2 vLeaf;\n" + s.vertexShader.replace("#include <begin_vertex>", SWAY);
    s.fragmentShader =
      "varying vec2 vLeaf;\n" +
      s.fragmentShader
        .replace("#include <color_fragment>", broad ? BROAD_TINT : LEAF_TINT)
        .replace("#include <alphatest_fragment>", LEAF_EDGE)
        .replace("#include <lights_fragment_end>", broad ? BROAD_LIGHT : LEAF_LIGHT)
        .replace("#include <fog_fragment>", LEAF_HAZE);
  };
  m.customProgramCacheKey = () => key() + (broad ? "|sway-broad" : "|sway");
  return m;
};

export type Grow = (k: "bark" | "leaves", g: THREE.BufferGeometry) => void;

type Crown = [THREE.Vector3, number, number];

export const grower = (add: Grow, rnd: () => number) => {
  const V = THREE.Vector3;
  const v = new V();
  const w = new V();
  const q = new THREE.Quaternion();
  const UP = new V(0, 1, 0);
  const limb = (a: THREE.Vector3, b: THREE.Vector3, r0: number, r1: number) => {
    add("bark", new THREE.SphereGeometry(r0, 7, 5).translate(a.x, a.y, a.z));
    const dir = b.clone().sub(a);
    const len = dir.length();
    const g = new THREE.CylinderGeometry(r1, r0, len, 7, 1, true).translate(0, len / 2, 0).applyQuaternion(q.setFromUnitVectors(UP, dir.normalize()));
    const uv = g.attributes.uv;
    const rep = Math.max(1, Math.round(r0 * 12));
    for (let j = 0; j < uv.count; j++) uv.setXY(j, uv.getX(j) * rep, (uv.getY(j) * len * rep) / (Math.PI * (r0 + r1)));
    add("bark", g.translate(a.x, a.y, a.z));
  };
  let pick = 0;
  const shade = (g: THREE.BufferGeometry, c: THREE.Vector3, rx: number, ry: number, [cc, crx, cry]: Crown, tint: number) => {
    const pos = g.attributes.position, nor = g.attributes.normal;
    const leaf = new Float32Array(pos.count * 2);
    for (let j = 0; j < pos.count; j++) {
      v.set((pos.getX(j) - cc.x) / crx, (pos.getY(j) - cc.y) / cry, (pos.getZ(j) - cc.z) / crx);
      const d = v.length();
      const occ = THREE.MathUtils.clamp((1 - d) * 1.25 + Math.max(-v.y, 0) * 0.35, 0, 1);
      v.y += 0.15;
      v.normalize().multiplyScalar(0.6);
      w.set((pos.getX(j) - c.x) / rx, (pos.getY(j) - c.y) / ry, (pos.getZ(j) - c.z) / rx).normalize().multiplyScalar(0.4);
      v.add(w).normalize();
      nor.setXYZ(j, v.x, v.y, v.z);
      leaf[j * 2] = occ;
      leaf[j * 2 + 1] = tint;
    }
    g.setAttribute("aLeaf", new THREE.BufferAttribute(leaf, 2));
    add("leaves", g);
  };
  const tintOf = (hue?: number) => {
    const roll = rnd() * 2 - 1;
    return hue === undefined ? roll : THREE.MathUtils.clamp(hue * 0.65 + roll * 0.45, -1, 1);
  };
  const foliage = (c: THREE.Vector3, rx: number, ry: number, n: number, size: number, crown: Crown = [c, rx, ry], squash = 1, hue?: number, cells = BROAD) => {
    const tint = tintOf(hue);
    const ex = Math.max(rx - size * 0.5, rx * 0.3), ey = Math.max(ry - size * 0.5, ry * 0.3);
    for (let i = 0; i < n; i++) {
      const a = rnd() * Math.PI * 2, e = Math.acos(rnd() * 2 - 1), r = Math.cbrt(0.1 + 0.9 * rnd());
      const p = new V(Math.sin(e) * Math.cos(a) * ex * r, Math.cos(e) * ey * r, Math.sin(e) * Math.sin(a) * ex * r).add(c);
      const sz = size * (0.8 + 0.3 * rnd()), yaw = rnd() * Math.PI;
      for (const [tilt, k] of [[(rnd() - 0.5) * 0.5, 0], [(rnd() - 0.5) * 0.5, Math.PI / 2], [Math.PI / 2 + (rnd() - 0.5) * 0.6, 0]]) {
        const cell = cells[pick++ % cells.length];
        for (const f of [0, Math.PI]) {
          const g = new THREE.PlaneGeometry(sz, sz).rotateY(f).rotateX(tilt).rotateY(yaw + k).scale(1, squash, 1).translate(p.x, p.y, p.z);
          atlasUv(g, cell);
          shade(g, c, rx, ry, crown, tint);
        }
      }
    }
  };
  const side = new V();
  const curve = new V();
  const branch = (base: THREE.Vector3, mid: THREE.Vector3, tip: THREE.Vector3, width: number, crown: Crown, hue?: number) => {
    const tint = tintOf(hue);
    const c = mid.clone();
    const rx = Math.max(base.distanceTo(tip) * 0.6, 1e-3);
    for (const roll of [0, 0.7 + rnd() * 0.3, -0.7 - rnd() * 0.3]) {
      const g = new THREE.PlaneGeometry(1, 1, 1, 4);
      const pos = g.attributes.position;
      for (let j = 0; j < pos.count; j++) {
        const t = pos.getY(j) + 0.5, s = pos.getX(j);
        curve.copy(base).multiplyScalar((1 - t) * (1 - t)).addScaledVector(mid, 2 * t * (1 - t)).addScaledVector(tip, t * t);
        w.copy(mid).sub(base).multiplyScalar(2 * (1 - t)).addScaledVector(tip.clone().sub(mid), 2 * t).normalize();
        side.crossVectors(w, UP).normalize();
        if (side.lengthSq() < 1e-6) side.set(1, 0, 0);
        v.crossVectors(side, w).normalize();
        side.multiplyScalar(Math.cos(roll)).addScaledVector(v, Math.sin(roll));
        pos.setXYZ(j, curve.x + side.x * s * width, curve.y + side.y * s * width, curve.z + side.z * s * width);
      }
      atlasUv(g, SPRUCE[0]);
      const back = g.clone();
      const idx = back.index!;
      for (let j = 0; j < idx.count; j += 3) {
        const a = idx.getX(j);
        idx.setX(j, idx.getX(j + 1));
        idx.setX(j + 1, a);
      }
      shade(g, c, rx, rx * 0.5, crown, tint);
      shade(back, c, rx, rx * 0.5, crown, tint);
    }
  };
  const shell = (C: THREE.Vector3, rx: number, ry: number, a: number, el: number, k: number) =>
    new V(C.x + Math.cos(a) * Math.cos(el) * rx * k, C.y + Math.sin(el) * ry * k, C.z + Math.sin(a) * Math.cos(el) * rx * k);
  const canopy = (forks: THREE.Vector3[], C: THREE.Vector3, rx: number, ry: number, n: number, size: number, r0: number) => {
    const crown: Crown = [C, rx, ry];
    const hue = rnd() * 2 - 1;
    const limbs = 4 + Math.floor(rnd() * 3);
    const tips: { at: THREE.Vector3; from: THREE.Vector3; el: number; lobe: number }[] = [];
    const a0 = rnd() * Math.PI * 2;
    for (let i = 0; i < limbs; i++) {
      const a = a0 + (i / limbs) * Math.PI * 2 + (rnd() - 0.5) * 0.8;
      const f = forks[i % forks.length];
      const lobe = 0.72 + 0.48 * rnd();
      const end = shell(C, rx, ry, a, -0.4 + rnd() * 0.8, (0.38 + 0.16 * rnd()) * lobe);
      limb(f, end, r0, r0 * 0.55);
      const twigs = 2 + Math.floor(rnd() * 2);
      for (let j = 0; j < twigs; j++) {
        const el = THREE.MathUtils.clamp(-0.8 + rnd() * 2, -0.75, 1.2);
        const tip = shell(C, rx, ry, a + (j - (twigs - 1) / 2) * 0.7 + (rnd() - 0.5) * 0.5, el, (0.6 + 0.26 * rnd()) * lobe);
        limb(end, tip, r0 * 0.55, r0 * 0.15);
        tips.push({ at: tip, from: end, el, lobe });
      }
    }
    const top = new V(C.x + (rnd() - 0.5) * rx * 0.3, C.y + ry * (0.5 + 0.2 * rnd()), C.z + (rnd() - 0.5) * rx * 0.3);
    limb(forks[0], top, r0 * 0.9, r0 * 0.2);
    tips.push({ at: top, from: forks[0], el: Math.PI / 2, lobe: 1 });
    const per = Math.max(4, Math.round((n * 1.3) / tips.length));
    for (const t of tips) {
      const rc = rx * (0.32 + 0.14 * rnd()) * t.lobe;
      foliage(t.at, rc, rc * 0.74, per, size, crown, 1, hue);
      if (t.el > -0.45) {
        const mid = t.from.clone().lerp(t.at, 0.5 + 0.15 * rnd());
        foliage(mid, rc * 0.7, rc * 0.55, Math.max(3, Math.round(per * 0.5)), size * 0.85, crown, 1, hue);
      }
    }
  };
  const tree = (x: number, y0: number, z: number, h: number, n = 34, s = 0.22) => {
    const jx = (rnd() - 0.5) * h * 0.08, jz = (rnd() - 0.5) * h * 0.08;
    const C = new V(x + jx, y0 + h * 0.6, z + jz);
    const fork = new V(x + jx * 0.45, y0 + h * (0.3 + 0.07 * rnd()), z + jz * 0.45);
    const bend = new V(x + jx * 0.1 + (rnd() - 0.5) * h * 0.025, (y0 + fork.y) / 2, z + jz * 0.1 + (rnd() - 0.5) * h * 0.025);
    limb(new V(x, y0 - 0.05, z), bend, h * 0.026, h * 0.02);
    limb(bend, fork, h * 0.02, h * 0.015);
    canopy([fork], C, h * (0.3 + 0.07 * rnd()), h * 0.31, n, h * s, h * 0.012);
  };
  const olive = (x: number, z: number, h: number) => {
    const forks = [0, 1].map((i) => {
      const a = i * Math.PI + rnd() * 1.2;
      const top = new V(x + Math.cos(a) * h * 0.13, h * (0.3 + 0.08 * rnd()), z + Math.sin(a) * h * 0.13);
      limb(new V(x, 0, z), top, h * 0.04, h * 0.022);
      return top;
    });
    canopy(forks, new V(x, h * 0.64, z), h * 0.4, h * 0.24, 80, h * 0.2, h * 0.018);
  };
  const cypress = (x: number, z: number, h: number) => {
    limb(new V(x, 0, z), new V(x, h * 0.9, z), h * 0.022, h * 0.004);
    const crown: Crown = [new V(x, h * 0.5, z), h * 0.13, h * 0.46];
    for (let t = 0.12; t < 0.97; t += 0.075) {
      const wd = h * 0.13 * Math.pow(t < 0.32 ? 0.75 + (t / 0.32) * 0.25 : 1 - (t - 0.32) / 0.7, 0.75);
      const a0 = rnd() * Math.PI * 2;
      for (let i = 0; i < 3; i++) {
        const a = a0 + (i * Math.PI * 2) / 3;
        const c = new V(x + Math.cos(a) * wd * 0.4, h * t + (rnd() - 0.5) * h * 0.03, z + Math.sin(a) * wd * 0.4);
        foliage(c, wd * 0.7, h * 0.07, 3, h * 0.08, crown);
      }
    }
  };
  const shrub = (x: number, y: number, z: number, r: number) => {
    const ry = r * 0.62;
    const C = new V(x, y + ry, z);
    const crown: Crown = [C, r, ry];
    const size = r * 0.6, rc = r * 0.5, per = Math.max(3, Math.round(r * 6));
    const k = 5 + Math.round(r * 3);
    const a0 = rnd() * Math.PI * 2;
    for (let i = 0; i < k; i++) {
      const a = a0 + (i / k) * Math.PI * 2 + (rnd() - 0.5) * 0.6, el = -0.1 + rnd() * 1.1;
      const c = new V(x + Math.cos(a) * Math.cos(el) * (r - rc), C.y + Math.sin(el) * (ry - rc * 0.78) * 0.9, z + Math.sin(a) * Math.cos(el) * (r - rc));
      limb(new V(x + (c.x - x) * 0.2, y, z + (c.z - z) * 0.2), c, r * 0.04, r * 0.015);
      foliage(c, rc, rc * 0.78, per, size, crown, 1, undefined, SHRUB);
    }
    foliage(new V(x, C.y + ry * 0.2, z), rc, rc * 0.78, per, size, crown, 1, undefined, SHRUB);
  };
  const bush = (x: number, y: number, z: number, r: number, d = r) => {
    const hue = rnd() * 2 - 1;
    const big = Math.max(r, d), small = Math.min(r, d);
    const ry = big * (0.5 + 0.14 * rnd());
    const C = new V(x, y + ry * 0.7, z);
    const crown: Crown = [C, big, ry];
    const k = 5 + Math.round(big * 4);
    const a0 = rnd() * Math.PI * 2;
    for (let i = 0; i < k; i++) {
      const a = a0 + (i / k) * Math.PI * 2 + (rnd() - 0.5) * 0.7, el = -0.15 + rnd() * 1.1;
      const rc = small * (0.42 + 0.22 * rnd());
      const c = new V(x + Math.cos(a) * Math.cos(el) * Math.max(r - rc * 0.8, 0), y + rc * 0.62 + Math.max(Math.sin(el), 0) * (ry * 1.25 - rc), z + Math.sin(a) * Math.cos(el) * Math.max(d - rc * 0.8, 0));
      if (i < 3) limb(new V(x + (c.x - x) * 0.15, y, z + (c.z - z) * 0.15), c, small * 0.04, small * 0.015);
      foliage(c, rc, rc * 0.8, Math.max(4, Math.round(rc * 11)), rc * 1.05, crown, 1, hue, SHRUB);
    }
    const rt = small * 0.55;
    foliage(new V(x + (rnd() - 0.5) * (r - rt) * 0.5, y + ry * 1.25 - rt * 0.7, z + (rnd() - 0.5) * (d - rt) * 0.5), rt, rt * 0.8, Math.max(4, Math.round(rt * 11)), rt * 1.05, crown, 1, hue, SHRUB);
  };
  return { limb, foliage, branch, tree, olive, cypress, shrub, bush, cells: { BROAD, SHRUB, SPRUCE } };
};

const hedgeChunk = (a: number, rnd: () => number) => {
  const V = THREE.Vector3;
  const cs = Math.min(0.42, a * 0.8), rho = Math.min(0.22, a * 0.4), n = Math.round(18 * (1 + 2 * a));
  const zc = 0.5 - rho, yc = a - rho;
  const pos: number[] = [], nor: number[] = [], uv: number[] = [], leaf: number[] = [];
  const p = new V(), c = new V(), o = new V(), w = new V(), q = new THREE.Quaternion(), Z = new V(0, 0, 1);
  for (let i = 0; i < n; i++) {
    const s = rnd() * (1 + 2 * a);
    if (s < 1) p.set(0, a, s - 0.5);
    else p.set(0, (s - 1) % a, s < 1 + a ? -0.5 : 0.5);
    p.x = (rnd() - 0.5) * 0.86;
    c.set(p.x, Math.min(p.y, yc), THREE.MathUtils.clamp(p.z, -zc, zc));
    o.subVectors(p, c);
    if (o.lengthSq() < 1e-6) o.set(0, 1, 0);
    o.normalize();
    const inset = cs * 0.25 + rnd() * rnd() * 0.22;
    p.copy(c).addScaledVector(o, rho - inset);
    w.set(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).add(o).normalize();
    q.setFromUnitVectors(Z, w);
    const spin = rnd() * Math.PI * 2, tint = (rnd() * 2 - 1) * 0.4, cell = SHRUB[0];
    for (const f of [0, Math.PI]) {
      const g = new THREE.PlaneGeometry(cs, cs).rotateZ(spin).rotateY(f).applyQuaternion(q).translate(p.x, p.y, p.z).toNonIndexed();
      atlasUv(g, cell);
      const gp = g.attributes.position, gu = g.attributes.uv;
      for (let j = 0; j < gp.count; j++) {
        const x = gp.getX(j), y = gp.getY(j), z = gp.getZ(j);
        w.set(x - p.x, y - p.y, z - p.z).multiplyScalar(0.5 / cs).add(o);
        w.y += 0.18;
        w.normalize();
        pos.push(x, y, z);
        nor.push(w.x, w.y, w.z);
        uv.push(gu.getX(j), gu.getY(j));
        leaf.push(THREE.MathUtils.clamp(inset * 2.2 + Math.max(0, 0.4 - y) * 1.8, 0, 1), tint);
      }
      g.dispose();
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute("aLeaf", new THREE.Float32BufferAttribute(leaf, 2));
  return g;
};

export const hedger = (seed = 29) => {
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const runs = new Map<number, { m: THREE.Matrix4[]; c: THREE.Color[] }>();
  const X = new THREE.Vector3(), Y = new THREE.Vector3(), Z = new THREE.Vector3();
  const hedge = (x0: number, z0: number, x1: number, z1: number, y: number, height: number, depth: number) => {
    const len = Math.max(Math.hypot(x1 - x0, z1 - z0), 1e-3);
    const ux = (x1 - x0) / len, uz = (z1 - z0) / len;
    const rows = Math.max(1, Math.round(depth / 1.2)), rd = depth / rows;
    const a = THREE.MathUtils.clamp(Math.round((height / rd) * 4) / 4, 0.25, 2);
    const n = Math.max(1, Math.round(len / (rd * 0.7))), step = len / n;
    let run = runs.get(a);
    if (!run) runs.set(a, (run = { m: [], c: [] }));
    for (let r = 0; r < rows; r++) {
      const off = ((r + 0.5) / rows - 0.5) * depth;
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) * step + (rnd() - 0.5) * step * 0.15, f = rnd() < 0.5 ? 1 : -1;
        X.set(ux * f, 0, uz * f).multiplyScalar(step * 1.3);
        Y.set(0, (height * (0.97 + 0.05 * rnd())) / a, 0);
        Z.set(-uz * f, 0, ux * f).multiplyScalar(rd * (rows > 1 ? 1.15 : 1) * (0.96 + 0.08 * rnd()));
        run.m.push(new THREE.Matrix4().makeBasis(X, Y, Z).setPosition(x0 + ux * t - uz * off, y, z0 + uz * t + ux * off));
        const k = 0.86 + 0.16 * rnd();
        run.c.push(new THREE.Color(k * (0.96 + 0.08 * rnd()), k, k * (0.92 + 0.1 * rnd())));
      }
    }
  };
  const box = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number) =>
    x1 - x0 >= z1 - z0 ? hedge(x0, (z0 + z1) / 2, x1, (z0 + z1) / 2, y0, y1 - y0, z1 - z0) : hedge((x0 + x1) / 2, z0, (x0 + x1) / 2, z1, y0, y1 - y0, x1 - x0);
  const meshes = (mat: THREE.Material) =>
    [...runs].map(([a, run]) => {
      const im = new THREE.InstancedMesh(hedgeChunk(a, rnd), mat, run.m.length);
      run.m.forEach((m, i) => im.setMatrixAt(i, m));
      run.c.forEach((c, i) => im.setColorAt(i, c));
      im.computeBoundingSphere();
      im.castShadow = im.receiveShadow = true;
      return im;
    });
  return { hedge, box, meshes };
};

import * as THREE from "three";
import { gsap } from "gsap";
import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader.js";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import { DRACO_DECODERS } from "./DriverPortraitScene";
import { canFlavour } from "./canFlavour";
import { localMediaSrc } from "./mediaSrc";

export type CanFlavourSpec = { name: string; labelSrc: string; fruitSrcs: string[]; rim?: number };

export type CanStageTextures = { noise: string; dropletMatcap: string; glassAlpha: string; stream: string; voronoi: string; normalEdge: string };

export type CanStageOptions = {
  front: HTMLCanvasElement;
  back: HTMLCanvasElement;
  flavours: CanFlavourSpec[];
  streamFruitSrcs: string[][];
  canSrc: string;
  paperSrc: string;
  envSrc: string;
  pourCanSrc: string;
  pourLabelSrc: string;
  pourVideoSrc: string;
  textures: CanStageTextures;
  backgroundVar: string;
  onReady: () => void;
  onFail: () => void;
  onReveal: (start: () => void) => () => void;
};

type V3 = THREE.Vector3;
type Bounce = { stiffness: number; damping: number; radius: number; strength: number; rotation: number; rotationDamping: number; scale: number };

const BASIS = "https://cdn.jsdelivr.net/npm/three@0.186.1/examples/jsm/libs/basis/";
const BEAN = 0.0650179;
const FRUIT_SCALE: Record<string, number> = { blueberry: 0.95, raspberry: 1, blackberry: 1, kiwi: 1.5, "kiwi-half": 1.5, guava: 1.5, lemon: 1.5, lime: 1.45, "lime-half": 1.45 };
const OFFSETS = [
  { s: -0.75, c: 0, e: 0.75 },
  { s: 2.5, c: 3.25, e: 4 },
  { s: 6.25, c: 7, e: 7.75 },
];
const RIMS = [0xff8a8a, 0xffb5c9, 0xdff37f];
const LEVELS = [1, 0.8, 0.65];
const MOBILE = 768;
const STACK = 880;

const offsetFor = (i: number) => OFFSETS[i] ?? { s: i * 3.5 - 0.75, c: i * 3.5, e: i * 3.5 + 0.75 };
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const span = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
const lerp = THREE.MathUtils.lerp;
const damp = (from: number, to: number, lambda: number, dt: number) => lerp(from, to, 1 - Math.exp(-lambda * dt));
const fov = (deg: number, ratio: number, aspect: number) => {
  let k = Math.tan(THREE.MathUtils.degToRad(deg) / 2);
  if (aspect < ratio) k *= ratio / aspect;
  return THREE.MathUtils.radToDeg(2 * Math.atan(k));
};
const fruitName = (src: string) => src.split("/").pop()?.replace(/\.glb.*$/i, "") ?? "";

const envChannel = (c: "r" | "g") => THREE.ShaderChunk.envmap_physical_pars_fragment.replace(/textureCubeUV\(([^;]*)\);/g, `vec4( vec3( textureCubeUV($1).${c} ), 1.0 );`);

const GLSL_HASH = `float grain(vec2 p) { vec3 q = fract(vec3(p.xyx) * .1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }`;
const GLSL_OVERLAY = `float ovl(float b, float s) { return b < .5 ? 2. * b * s : 1. - 2. * (1. - b) * (1. - s); }
vec3 overlay(vec3 b, vec3 s, float o) { return mix(b, vec3(ovl(b.r, s.r), ovl(b.g, s.g), ovl(b.b, s.b)), o); }`;
const GLSL_WIPE = `float wipe(vec2 uv, sampler2D noise, float p, float aspect) {
  vec2 c = vec2(.5, .66);
  vec2 k = vec2(aspect, 1.);
  float far = max(max(length((c - vec2(0.)) * k), length((c - vec2(1., 0.)) * k)), max(length((c - vec2(0., 1.)) * k), length((c - vec2(1.)) * k)));
  float r = p * (far + .125);
  float n = (texture2D(noise, uv * 2.).r * 2. - 1.) * .075 * (1. - smoothstep(.5, 1., p));
  return 1. - smoothstep(r - .125, r, length((uv - c) * k) + n);
}`;

const PLANE_VERT = `uniform vec2 uRect; uniform float uViewH; varying vec2 vUv; varying float vPy;
void main() {
  vUv = uv;
  vPy = uRect.x + (1. - uv.y) * uRect.y;
  vec2 p = position.xy * 2.;
  float s = uRect.y / uViewH;
  p.y = p.y * s + 1. - s - uRect.x / uViewH * 2.;
  gl_Position = vec4(p, 0., 1.);
}`;

const HERO_FRAG = `uniform sampler2D tScene; uniform sampler2D tSceneDepth; uniform sampler2D tDrop; uniform sampler2D tDropDepth; uniform sampler2D tMatcap; uniform sampler2D tNoise;
uniform float uBgProgress; uniform float uDefaultT; uniform float uT; uniform float uAspect;
uniform vec3 uBg0; uniform vec3 uBgDefault; uniform vec3 uBgCur; uniform vec3 uBgNext;
varying vec2 vUv;
#include <tonemapping_pars_fragment>
${GLSL_OVERLAY}
${GLSL_WIPE}
${GLSL_HASH}
void main() {
  vec4 drop = texture2D(tDrop, vUv) * step(texture2D(tDropDepth, vUv).r, texture2D(tSceneDepth, vUv).r);
  vec2 ruv = vUv + (drop.rg * 2. - 1.) * .01056 * drop.a;
  float cap = texture2D(tMatcap, drop.rg).r;
  vec3 bg1 = mix(uBgDefault, mix(uBgCur, uBgNext, wipe(vUv, tNoise, uT, uAspect)), wipe(vUv, tNoise, uDefaultT, uAspect));
  vec3 bg = mix(bg1, uBg0, smoothstep(vUv.y + .05, vUv.y - .05, uBgProgress));
  vec4 base = texture2D(tScene, vUv);
  vec4 bent = texture2D(tScene, ruv);
  bent.rgb = mix(bg, bent.rgb, bent.a);
  vec4 col = vec4(bent.rgb, base.a);
  col.rgb = mix(col.rgb, vec3(1.), smoothstep(.8, 1., cap) * .165);
  col.rgb = mix(col.rgb, vec3(0.), smoothstep(.2, 0., cap) * .231);
  col.rgb *= col.a;
  gl_FragColor = col;
  gl_FragColor.rgb = ACESFilmicToneMapping(gl_FragColor.rgb);
  #include <colorspace_fragment>
  gl_FragColor.rgb = overlay(gl_FragColor.rgb, vec3(grain(gl_FragCoord.xy * 2.)), .125);
}`;

const PAPER_FRAG = `uniform sampler2D t1; uniform sampler2D t2; uniform sampler2D t3; uniform float uReveal; uniform vec3 uBg; varying vec2 vUv;
void main() {
  vec4 a = texture2D(t1, vUv);
  vec4 b = texture2D(t2, vUv);
  vec4 c = texture2D(t3, vUv);
  vec4 col = b + c * (1. - b.a);
  col = a + col * (1. - a.a);
  col *= uReveal;
  gl_FragColor = vec4(uBg * (1. - col.a) + col.rgb, 1.);
}`;

const WATER_FRAG = `uniform sampler2D tScene; varying vec2 vUv;
${GLSL_OVERLAY}
${GLSL_HASH}
void main() {
  gl_FragColor = texture2D(tScene, vUv);
  gl_FragColor.rgb = overlay(gl_FragColor.rgb, vec3(grain(gl_FragCoord.xy * 2.)), .125);
}`;

const STREAM_VERT = `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`;

const STREAM_FRAG = `uniform float uAspect; uniform float uTime; uniform float uDist; uniform float uRecover; uniform vec2 uMouse;
uniform sampler2D tVideo; uniform sampler2D tAlpha; uniform sampler2D tStream; uniform sampler2D tVoronoi; uniform sampler2D tEdge;
varying vec2 vUv;
vec2 turn(vec2 p, float a) { float s = sin(a); float c = cos(a); return mat2(c, s, -s, c) * p; }
void main() {
  vec4 video = vec4(texture2D(tVideo, vUv).rgb, texture2D(tAlpha, vUv).r);
  vec2 edge = texture2D(tEdge, vUv).rg * 2. - 1.;
  vec2 band = vec2(min(smoothstep(.05, .3, vUv.y), smoothstep(.575, .45, vUv.y)), smoothstep(.1, .6, vUv.y));
  float pull = smoothstep(uMouse.y, 1., vUv.y) * -uDist * 5. * band.y * .01;
  float near = smoothstep(uMouse.y - .05 + uRecover, uMouse.y + .05 + uRecover, vUv.y);
  vec2 s = vUv;
  s.y += sin(uTime * 3. + sin(uTime * 3.) * 2.) * band.x * .04;
  s.x += sin(uTime * 4. + sin(uTime * 2.) * 2.) * band.y * .025;
  s.x += sign(pull) * pow(abs(pull), .4);
  vec2 axis = turn(s, -.2);
  axis.x += pull;
  float away = axis.x - .625 + pull;
  float cells = texture2D(tVoronoi, vec2(axis.x * uAspect, axis.y * .5 - uTime * .66) * 3.5).r;
  s.x -= away * .25 * pow(sin((s.y - uTime * .5) * 10.), 2.) * band.x;
  s += edge * .05;
  vec4 stream = texture2D(tStream, s);
  stream.a *= smoothstep(cells, min(cells + .25, 1.), max(1. - near, .4));
  stream.a *= smoothstep(.6, .575, vUv.y);
  stream.rgb *= stream.a;
  gl_FragColor = stream + video * (1. - stream.a);
}`;

const KAWASE_VERT = `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`;
const KAWASE_DOWN = `uniform sampler2D tMap; uniform vec2 uHalf; varying vec2 vUv;
void main() {
  vec2 h = uHalf;
  vec4 sum = texture2D(tMap, vUv) * 4.;
  sum += texture2D(tMap, vUv - h) + texture2D(tMap, vUv + h);
  sum += texture2D(tMap, vUv + vec2(h.x, -h.y)) + texture2D(tMap, vUv - vec2(h.x, -h.y));
  gl_FragColor = sum / 8.;
}`;
const KAWASE_UP = `uniform sampler2D tMap; uniform vec2 uHalf; varying vec2 vUv;
void main() {
  vec2 h = uHalf;
  vec4 sum = texture2D(tMap, vUv + vec2(-h.x * 2., 0.));
  sum += texture2D(tMap, vUv + vec2(-h.x, h.y)) * 2.;
  sum += texture2D(tMap, vUv + vec2(0., h.y * 2.));
  sum += texture2D(tMap, vUv + vec2(h.x, h.y)) * 2.;
  sum += texture2D(tMap, vUv + vec2(h.x * 2., 0.));
  sum += texture2D(tMap, vUv + vec2(h.x, -h.y)) * 2.;
  sum += texture2D(tMap, vUv + vec2(0., -h.y * 2.));
  sum += texture2D(tMap, vUv + vec2(-h.x, -h.y)) * 2.;
  gl_FragColor = sum / 12.;
}`;

class Kawase {
  scene = new THREE.Scene();
  camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  down = new THREE.ShaderMaterial({ uniforms: { tMap: { value: null }, uHalf: { value: new THREE.Vector2() } }, vertexShader: KAWASE_VERT, fragmentShader: KAWASE_DOWN, depthTest: false, depthWrite: false });
  up = new THREE.ShaderMaterial({ uniforms: { tMap: { value: null }, uHalf: { value: new THREE.Vector2() } }, vertexShader: KAWASE_VERT, fragmentShader: KAWASE_UP, depthTest: false, depthWrite: false });
  quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.down);
  targets: THREE.WebGLRenderTarget[] = [];
  constructor() {
    this.quad.frustumCulled = false;
    this.scene.add(this.quad);
  }
  render(renderer: THREE.WebGLRenderer, src: THREE.WebGLRenderTarget, levels: number, offset: number) {
    let w = src.width;
    let h = src.height;
    for (let i = 0; i < levels; i++) {
      const tw = Math.max(1, Math.floor(src.width / 2 ** (i + 1)));
      const th = Math.max(1, Math.floor(src.height / 2 ** (i + 1)));
      if (!this.targets[i]) this.targets[i] = new THREE.WebGLRenderTarget(tw, th, { depthBuffer: false });
      else if (this.targets[i].width !== tw || this.targets[i].height !== th) this.targets[i].setSize(tw, th);
    }
    let tex = src.texture;
    this.quad.material = this.down;
    for (let i = 0; i < levels; i++) {
      this.down.uniforms.tMap.value = tex;
      this.down.uniforms.uHalf.value.set((0.5 / w) * offset, (0.5 / h) * offset);
      renderer.setRenderTarget(this.targets[i]);
      renderer.render(this.scene, this.camera);
      tex = this.targets[i].texture;
      w *= 0.5;
      h *= 0.5;
    }
    this.quad.material = this.up;
    for (let i = levels - 1; i > 0; i--) {
      this.up.uniforms.tMap.value = tex;
      this.up.uniforms.uHalf.value.set((0.5 / w) * offset, (0.5 / h) * offset);
      renderer.setRenderTarget(this.targets[i - 1]);
      renderer.render(this.scene, this.camera);
      tex = this.targets[i - 1].texture;
      w *= 2;
      h *= 2;
    }
    return this.targets[0].texture;
  }
  dispose() {
    this.targets.forEach((t) => t.dispose());
    this.quad.geometry.dispose();
    this.down.dispose();
    this.up.dispose();
  }
}

class Springs {
  base: V3[] = [];
  quats: THREE.Quaternion[] = [];
  scales: V3[] = [];
  off: V3[] = [];
  vel: V3[] = [];
  spin: V3[] = [];
  force = new THREE.Vector3();
  prev: V3 | null = null;
  inv = new THREE.Matrix4();
  local = new THREE.Vector3();
  ray = new THREE.Ray();
  delta = new THREE.Vector3();
  impulse = new THREE.Vector3();
  axis = new THREE.Vector3();
  step = new THREE.Quaternion();
  m = new THREE.Matrix4();
  p = new THREE.Vector3();
  s = new THREE.Vector3();
  object: THREE.Object3D;
  cfg: Bounce;
  mesh: THREE.InstancedMesh | null;
  constructor(object: THREE.Object3D, cfg: Bounce, count: number, mesh: THREE.InstancedMesh | null) {
    this.object = object;
    this.cfg = cfg;
    this.mesh = mesh;
    for (let i = 0; i < count; i++) {
      const p = new THREE.Vector3();
      const q = new THREE.Quaternion();
      const s = new THREE.Vector3(1, 1, 1);
      if (mesh) {
        mesh.getMatrixAt(i, this.m);
        this.m.decompose(p, q, s);
      }
      this.base.push(p);
      this.quats.push(q);
      this.scales.push(s);
      this.off.push(new THREE.Vector3());
      this.vel.push(new THREE.Vector3());
      this.spin.push(new THREE.Vector3());
    }
    if (mesh) mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  }
  setForce(f: V3) {
    if (f.lengthSq() === 0) {
      this.force.set(0, 0, 0);
      return;
    }
    const len = f.length();
    this.inv.copy(this.object.matrixWorld).invert();
    this.force.copy(f).transformDirection(this.inv).multiplyScalar(len);
  }
  update(point: V3 | null, ray: THREE.Ray | null, dt: number) {
    const { stiffness, damping, radius, strength, rotation, rotationDamping, scale } = this.cfg;
    if (point) {
      this.inv.copy(this.object.matrixWorld).invert();
      this.local.copy(point).applyMatrix4(this.inv);
      if (ray) this.ray.copy(ray).applyMatrix4(this.inv);
      if (this.prev) {
        this.delta.subVectors(this.local, this.prev);
        if (this.delta.length() > radius) this.delta.setLength(radius);
      } else {
        this.delta.set(0, 0, 0);
        this.prev = new THREE.Vector3();
      }
      this.prev.copy(this.local);
    } else {
      this.delta.set(0, 0, 0);
      this.prev = null;
    }
    const keep = Math.exp(-damping * dt);
    const keepSpin = Math.exp(-rotationDamping * dt);
    for (let i = 0; i < this.base.length; i++) {
      const off = this.off[i];
      const vel = this.vel[i];
      this.impulse.set(0, 0, 0);
      if (point) {
        const d = ray ? this.ray.distanceToPoint(this.base[i]) : this.base[i].distanceTo(this.local);
        const k = 1 - Math.min(d / radius, 1);
        if (k > 0) {
          const w = k * k * (3 - 2 * k) * strength;
          vel.addScaledVector(this.delta, w);
          this.impulse.addScaledVector(this.delta, w);
        }
      }
      vel.addScaledVector(this.force, dt);
      vel.addScaledVector(off, -stiffness * dt);
      vel.multiplyScalar(keep);
      off.addScaledVector(vel, dt);
      if (!this.mesh) continue;
      const spin = this.spin[i];
      if (rotation !== 0) spin.addScaledVector(this.axis.set(-this.impulse.y, this.impulse.x, 0), rotation);
      spin.multiplyScalar(keepSpin);
      const mag = spin.length();
      if (mag > 1e-6) {
        this.step.setFromAxisAngle(this.axis.copy(spin).divideScalar(mag), mag * dt);
        this.quats[i].premultiply(this.step).normalize();
      }
      this.p.addVectors(this.base[i], off);
      this.s.copy(this.scales[i]).multiplyScalar(scale);
      this.m.compose(this.p, this.quats[i], this.s);
      this.mesh.setMatrixAt(i, this.m);
    }
    if (this.mesh) this.mesh.instanceMatrix.needsUpdate = true;
  }
}

class Wiggle {
  pivot = new THREE.Object3D();
  rest: V3;
  prev = new THREE.Vector3();
  goal = new THREE.Vector3();
  first = true;
  up = new THREE.Vector3(0, 1, 0);
  bone: THREE.Object3D;
  constructor(bone: THREE.Object3D) {
    this.bone = bone;
    const parent = bone.parent!;
    this.pivot.position.copy(bone.position);
    this.pivot.quaternion.copy(bone.quaternion);
    this.pivot.scale.copy(bone.scale);
    parent.add(this.pivot);
    this.pivot.add(bone);
    this.rest = bone.position.clone();
    bone.position.set(0, 0, 0);
    bone.quaternion.identity();
  }
  update(k: number) {
    this.pivot.updateMatrixWorld(true);
    this.pivot.localToWorld(this.goal.copy(this.rest));
    if (this.first) {
      this.first = false;
      this.prev.copy(this.goal);
    }
    this.prev.lerp(this.goal, k);
    const local = this.pivot.worldToLocal(this.goal.copy(this.prev));
    this.bone.quaternion.setFromUnitVectors(this.up, local.normalize());
    this.bone.updateMatrix();
  }
}

const patchCan = (mat: THREE.MeshStandardMaterial, u: Record<string, THREE.IUniform>) => {
  mat.defines = { ...mat.defines, USE_UV: "" };
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec4 vNdc;").replace("#include <fog_vertex>", "#include <fog_vertex>\nvNdc = gl_Position;");
    sh.fragmentShader = sh.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
uniform float uBgProgress; uniform float uTime; uniform float uDefaultT; uniform float uT; uniform float uAspect;
uniform vec3 uBg0; uniform vec3 uBgCur; uniform vec3 uBgNext;
uniform sampler2D tNoise; uniform sampler2D tCur; uniform sampler2D tNext;
varying vec4 vNdc;
${GLSL_WIPE}`,
      )
      .replace("#include <envmap_physical_pars_fragment>", envChannel("r"))
      .replace(
        "#include <map_fragment>",
        `vec2 sUv = vNdc.xy / vNdc.w * .5 + .5;
float tDef = wipe(sUv, tNoise, uDefaultT, uAspect);
float tNow = wipe(sUv, tNoise, uT, uAspect);
vec4 label = mix(texture2D(map, vUv), mix(texture2D(tCur, vUv), texture2D(tNext, vUv), tNow), tDef);
label.rgb = pow(label.rgb, vec3(1. / 1.5));
diffuseColor *= label;`,
      )
      .replace(
        "#include <roughnessmap_fragment>",
        `#include <roughnessmap_fragment>
float wobble = texture2D(tNoise, vUv * 2.).b;
float drip = texture2D(tNoise, vec2(vUv.x * 3. + wobble * .05, vUv.y * .33 - uTime * .02)).b;
roughnessFactor -= step(drip, .33) * .1;`,
      )
      .replace(
        "#include <dithering_fragment>",
        `#include <dithering_fragment>
float rim = pow(1. - dot(normal, vec3(0., 0., 1.)), 5.);
vec3 bgA = mix(uBgCur, uBgNext, tNow);
gl_FragColor.rgb += mix(bgA, uBg0, smoothstep(sUv.y + .05, sUv.y - .05, uBgProgress)) * rim;`,
      );
  };
  mat.customProgramCacheKey = () => "weeby-can";
  mat.needsUpdate = true;
};

const patchChannel = (mat: THREE.Material, c: "r" | "g", key: string) => {
  mat.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace("#include <envmap_physical_pars_fragment>", envChannel(c));
  };
  mat.customProgramCacheKey = () => key;
};

const patchPaper = (mat: THREE.MeshStandardMaterial, u: { uTextVisibility: THREE.IUniform }) => {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTextVisibility = u.uTextVisibility;
    sh.vertexShader = sh.vertexShader
      .replace("#include <uv_pars_vertex>", "#include <uv_pars_vertex>\nattribute float aAtlas;")
      .replace("#include <uv_vertex>", "#include <uv_vertex>\n#ifdef USE_MAP\nvMapUv = (vMapUv + vec2(mod(aAtlas, 3.), 1. - floor(aAtlas / 3.))) / vec2(3., 2.);\n#endif");
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <clipping_planes_pars_fragment>", "#include <clipping_planes_pars_fragment>\n#include <tonemapping_pars_fragment>\nuniform float uTextVisibility;")
      .replace("#include <envmap_physical_pars_fragment>", envChannel("r"))
      .replace("#include <map_fragment>", "#include <map_fragment>\ndiffuseColor.rgb = mix(vec3(1.), diffuseColor.rgb, uTextVisibility);")
      .replace("#include <tonemapping_fragment>", "gl_FragColor.rgb = ACESFilmicToneMapping(gl_FragColor.rgb) * vec3(.925, .95, 1.);");
  };
  mat.customProgramCacheKey = () => "weeby-paper";
  mat.needsUpdate = true;
};

const patchPour = (mat: THREE.MeshStandardMaterial, noise: THREE.Texture) => {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.tNoise = { value: noise };
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec4 vNdc;").replace("#include <fog_vertex>", "#include <fog_vertex>\nvNdc = gl_Position;");
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform sampler2D tNoise; varying vec4 vNdc;\n#include <tonemapping_pars_fragment>")
      .replace("#include <envmap_physical_pars_fragment>", envChannel("r"))
      .replace(
        "#include <dithering_fragment>",
        `#include <dithering_fragment>
vec2 sUv = vNdc.xy / vNdc.w * .5 + .5;
float speck = pow(texture2D(tNoise, sUv * 75.).b, 2.);
gl_FragColor.rgb += vec3(1.) * pow(1. - dot(normal, vec3(0., 0., 1.)), 10.);
gl_FragColor.rgb *= gl_FragColor.a;
if (!gl_FrontFacing) gl_FragColor.rgb = vec3(0.);
gl_FragColor.rgb = pow(ACESFilmicToneMapping(gl_FragColor.rgb), vec3(1. / 2.2));
gl_FragColor.rgb *= mix(1., .25, speck);`,
      );
  };
  mat.customProgramCacheKey = () => "weeby-pour";
  mat.needsUpdate = true;
};

const planeMesh = (frag: string, uniforms: Record<string, THREE.IUniform>, transparent: boolean) => {
  const clipped = `uniform vec4 uClip; varying float vPy;\n${frag.replace("void main() {", "void main() {\n  if (!((vPy >= uClip.x && vPy <= uClip.y) || (vPy >= uClip.z && vPy <= uClip.w))) discard;")}`;
  const mat = new THREE.ShaderMaterial({ uniforms: { uRect: { value: new THREE.Vector2() }, uViewH: { value: 1 }, uClip: { value: new THREE.Vector4(-1e5, 1e5, 0, 0) }, ...uniforms }, vertexShader: PLANE_VERT, fragmentShader: clipped, transparent, depthTest: false, depthWrite: false });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
  mesh.frustumCulled = false;
  mesh.matrixAutoUpdate = false;
  return mesh;
};

const firstMesh = (root: THREE.Object3D) => {
  let found: THREE.Mesh | null = null;
  root.traverse((o) => {
    if (!found && (o as THREE.Mesh).isMesh) found = o as THREE.Mesh;
  });
  return found as THREE.Mesh | null;
};

export function mountCanStage(o: CanStageOptions) {
  let alive = true;
  let raf = 0;
  const cleanups: (() => void)[] = [];
  const tweens: (gsap.core.Tween | gsap.core.Timeline)[] = [];
  const keep = <T extends gsap.core.Tween | gsap.core.Timeline>(t: T) => (tweens.push(t), t);
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const touch = matchMedia("(hover: none)").matches;

  const offscreen = typeof OffscreenCanvas !== "undefined";
  const glCanvas: HTMLCanvasElement | OffscreenCanvas = offscreen ? new OffscreenCanvas(1, 1) : document.createElement("canvas");
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: glCanvas, alpha: true, antialias: false, depth: false, stencil: false, powerPreference: "high-performance" });
  } catch {
    o.onFail();
    return () => {};
  }
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const gl = renderer.getContext();
  const info = gl.getExtension("WEBGL_debug_renderer_info");
  const soft = /swiftshader|llvmpipe|software|basic render/i.test(String(info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)));
  const aniso = renderer.capabilities.getMaxAnisotropy();

  type Output = { canvas: HTMLCanvasElement; bitmap: ImageBitmapRenderingContext | null; flat: CanvasRenderingContext2D | null; on: boolean };
  const output = (canvas: HTMLCanvasElement): Output => {
    const bitmap = offscreen && "transferToImageBitmap" in OffscreenCanvas.prototype ? canvas.getContext("bitmaprenderer") : null;
    return { canvas, bitmap, flat: bitmap ? null : canvas.getContext("2d"), on: false };
  };
  const front = output(o.front);
  const back = output(o.back);
  const present = (out: Output) => {
    if (out.bitmap) out.bitmap.transferFromImageBitmap((glCanvas as OffscreenCanvas).transferToImageBitmap());
    else if (out.flat) {
      out.flat.globalCompositeOperation = "copy";
      out.flat.drawImage(glCanvas as CanvasImageSource, 0, 0, out.canvas.width, out.canvas.height);
    }
    out.on = true;
  };
  const clearOut = (out: Output) => {
    if (!out.on) return;
    if (out.bitmap) out.bitmap.transferFromImageBitmap(null);
    else out.flat?.clearRect(0, 0, out.canvas.width, out.canvas.height);
    out.on = false;
  };

  const onLost = (e: Event) => {
    e.preventDefault();
    cancelAnimationFrame(raf);
    raf = 0;
    alive = false;
    clearOut(front);
    clearOut(back);
    o.onFail();
  };
  glCanvas.addEventListener("webglcontextlost", onLost as EventListener);
  cleanups.push(() => glCanvas.removeEventListener("webglcontextlost", onLost as EventListener));

  const adapt = { level: 0, ceil: 0, acc: 0, n: 0, min: 99, refresh: 99, windows: 0, good: 0, upAt: -99 };
  const size = { w: 0, h: 0, dpr: 1, mobile: false, stack: false };
  const dprFor = () => {
    if (soft) return 0.75;
    const base = Math.min(devicePixelRatio, innerWidth < STACK ? 2 : 1.5);
    return innerWidth * innerHeight < 700000 ? base : Math.max(1, base * LEVELS[adapt.level]);
  };

  const draco = new DRACOLoader().setDecoderPath(DRACO_DECODERS);
  const ktx2 = new KTX2Loader().setTranscoderPath(BASIS).detectSupport(renderer);
  const gltfLoader = new GLTFLoader().setDRACOLoader(draco).setKTX2Loader(ktx2);
  cleanups.push(() => {
    draco.dispose();
    ktx2.dispose();
  });
  const loadGltf = (src: string) => gltfLoader.loadAsync(localMediaSrc(src));
  const loadTex = async (src: string, flip = false, color = false) => {
    let tex: THREE.Texture;
    if (typeof createImageBitmap !== "undefined") {
      const img = await new THREE.ImageBitmapLoader().setCrossOrigin("anonymous").setOptions({ imageOrientation: flip ? "flipY" : "none", premultiplyAlpha: "none" }).loadAsync(localMediaSrc(src));
      tex = new THREE.Texture(img as ImageBitmap);
      tex.flipY = false;
    } else {
      tex = await new THREE.TextureLoader().setCrossOrigin("anonymous").loadAsync(localMediaSrc(src));
      tex.flipY = flip;
    }
    if (color) tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  };
  const owned: { dispose: () => void }[] = [];
  const own = <T extends { dispose: () => void }>(x: T) => (owned.push(x), x);

  const bg = { paper: new THREE.Color(), fog: new THREE.Color() };
  const readTone = () => {
    const v = getComputedStyle(o.front).getPropertyValue(o.backgroundVar).trim();
    if (!v) return;
    try {
      bg.fog.setStyle(v);
      bg.paper.copy(bg.fog).convertLinearToSRGB();
    } catch {
      return;
    }
    if (paper) {
      (paper.plane.material as THREE.ShaderMaterial).uniforms.uBg.value.copy(bg.paper);
      (paper.scene.fog as THREE.Fog).color.copy(bg.fog);
    }
  };
  const toneObs = new MutationObserver(readTone);
  toneObs.observe(document.documentElement, { attributes: true, attributeFilter: ["style", "class", "data-theme", "data-palette"] });
  cleanups.push(() => toneObs.disconnect());

  const poses: { hero: HTMLElement | null; slider: HTMLElement | null; content: HTMLElement | null; thumbs: HTMLElement | null; water: HTMLElement | null } = { hero: null, slider: null, content: null, thumbs: null, water: null };
  const scan = () => {
    const q = (name: string) => document.querySelector<HTMLElement>(`[data-can-pose="${name}"]`);
    poses.hero = q("hero");
    poses.slider = q("slider");
    poses.content = q("slider-content");
    poses.water = q("water");
    poses.thumbs = q("slider-thumbs");
    if (hero) hero.fit = null;
    start();
  };
  let scanTimer = 0;
  const rescan = () => {
    window.clearTimeout(scanTimer);
    scanTimer = window.setTimeout(scan, 150);
  };
  const mutation = new MutationObserver(rescan);
  mutation.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["data-can-pose"] });
  cleanups.push(() => {
    mutation.disconnect();
    window.clearTimeout(scanTimer);
  });

  const mouse = { x: 0, y: 0, ex: 0, ey: 0, cx: -1, cy: -1, moved: false };
  const scroll = { last: scrollY, current: 0, target: 0, springV: 0, springX: 0 };
  const flavours = o.flavours.length ? o.flavours : [];
  canFlavour.setCount(flavours.length);

  let noise: THREE.Texture | null = null;

  type Hero = {
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    baseFov: number;
    mixer: THREE.AnimationMixer;
    parents: Record<string, THREE.Object3D>;
    bgMesh: THREE.Mesh | null;
    proxy: THREE.Mesh;
    sets: THREE.Object3D[];
    fruit: { mesh: THREE.InstancedMesh; springs: Springs; pos: THREE.BufferAttribute; morph: THREE.BufferAttribute | null; flavour: number | null }[];
    labels: THREE.Texture[];
    u: Record<string, THREE.IUniform>;
    plane: THREE.Mesh;
    rtScene: THREE.WebGLRenderTarget;
    rtDrop: THREE.WebGLRenderTarget;
    bounce: Bounce;
    reveal: { y: number; z: number };
    tr: { rot: number; offset: number; morph: number };
    current: number;
    busy: gsap.core.Timeline | null;
    can: THREE.Mesh;
    fit: { c: number; h: number } | null;
    slot: { c: number; h: number } | null;
    drag: { id: number | null; claimed: boolean; abandoned: boolean; sx: number; sy: number; lx: number; lt: number; v: number; dist: number; rot: number; target: number; damping: number; spinning: boolean };
    hover: boolean;
  };
  type Paper = {
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    group: THREE.Group;
    sheets: { mesh: THREE.Object3D; wiggles: Wiggle[]; random: number; base: V3; target: V3; cur: V3; baseQ: THREE.Quaternion; targetQ: THREE.Quaternion; curQ: THREE.Quaternion }[];
    springs: Springs;
    bounce: Bounce;
    rts: THREE.WebGLRenderTarget[];
    blur: Kawase[];
    plane: THREE.Mesh;
    intro: { progress: number };
  };
  type Water = {
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    can: THREE.Mesh;
    stream: THREE.Mesh;
    su: Record<string, THREE.IUniform>;
    video: HTMLVideoElement;
    rt: THREE.WebGLRenderTarget;
    plane: THREE.Mesh;
    em: { x: number; y: number };
    hovering: boolean;
    recover: gsap.core.Tween | null;
  };
  let hero: Hero | null = null;
  let paper: Paper | null = null;
  let water: Water | null = null;
  let revealed = false;
  let waterLoading = false;

  const presentScene = new THREE.Scene();
  const presentCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const slotFor = (planeTop: number) => {
    if (!poses.content || !poses.slider) return null;
    const s = poses.slider.getBoundingClientRect();
    const top = Math.max(poses.content.getBoundingClientRect().bottom, s.top, 0) + 16;
    const bottom = Math.min(poses.thumbs ? poses.thumbs.getBoundingClientRect().top : s.bottom, s.bottom, size.h) - 16;
    return { c: (top + bottom) / 2 - planeTop, h: Math.max(40, bottom - top) };
  };

  const corner = new THREE.Vector3();
  const measureFit = (h: Hero) => {
    const slot = h.slot;
    h.slot = null;
    applyHero(1, 0);
    h.slot = slot;
    h.scene.updateMatrixWorld(true);
    h.camera.updateMatrixWorld();
    const box = h.can.geometry.boundingBox!;
    let lo = Infinity;
    let hi = -Infinity;
    for (let i = 0; i < 8; i++) {
      corner.set(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z).applyMatrix4(h.can.matrixWorld).project(h.camera);
      const y = (1 - corner.y) * 0.5 * size.h;
      lo = Math.min(lo, y);
      hi = Math.max(hi, y);
    }
    return { c: (lo + hi) / 2, h: hi - lo };
  };

  const resize = (force = false) => {
    const w = innerWidth;
    const h = size.mobile && w === size.w ? size.h : innerHeight;
    const dpr = dprFor();
    if (!force && w === size.w && h === size.h && dpr === size.dpr) return;
    const wasMobile = size.mobile;
    Object.assign(size, { w, h, dpr, mobile: w < MOBILE, stack: w < STACK });
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    for (const out of [front, back]) {
      out.canvas.width = Math.round(w * dpr);
      out.canvas.height = Math.round(h * dpr);
      out.on = false;
    }
    if (hero) {
      const pw = Math.round(w * dpr);
      const ph = Math.round(h * dpr);
      hero.rtScene.setSize(pw, ph);
      hero.rtDrop.setSize(Math.round(pw * 0.5), Math.round(ph * 0.5));
      hero.camera.fov = fov(hero.baseFov, size.stack ? 0.5777777777777777 : 1.6, w / h);
      hero.camera.aspect = w / h;
      hero.camera.updateProjectionMatrix();
      hero.u.uAspect.value = w / h;
      hero.sets.forEach((s) => (s.visible = !size.mobile));
      hero.fit = null;
    }
    if (paper) {
      paper.rts[0].setSize(Math.round(w * 0.5), Math.round(h * 0.5));
      paper.rts[1].setSize(Math.round(w * 0.8), Math.round(h * 0.8));
      paper.rts[2].setSize(Math.round(w * 0.6), Math.round(h * 0.6));
      paper.camera.fov = fov(32, 0.5777777777777777, w / h);
      paper.camera.aspect = w / h;
      paper.camera.updateProjectionMatrix();
    }
    if (water) sizeWater();
    if (wasMobile !== size.mobile) start();
  };
  const sizeWater = () => {
    if (!water || !poses.water) return;
    const r = poses.water.getBoundingClientRect();
    const vh = Math.min(r.height, size.h);
    water.rt.setSize(Math.round(size.w * size.dpr), Math.round(vh * size.dpr));
    water.camera.aspect = size.w / Math.max(1, vh);
    water.camera.updateProjectionMatrix();
  };

  const measure = (ms: number) => {
    adapt.acc += ms;
    adapt.n++;
    adapt.min = Math.min(adapt.min, ms);
    if (adapt.acc < 1000) return;
    const avg = adapt.acc / adapt.n;
    adapt.refresh = Math.max(4, Math.min(adapt.refresh, adapt.min));
    adapt.acc = adapt.n = 0;
    adapt.min = 99;
    adapt.windows++;
    if (adapt.windows < 3) return;
    if (avg > Math.min(18, adapt.refresh * 1.35) && adapt.level < LEVELS.length - 1) {
      if (adapt.windows - adapt.upAt <= 2) adapt.ceil = adapt.level + 1;
      adapt.level++;
      adapt.good = 0;
      resize();
    } else if (avg < Math.min(17.5, adapt.refresh * 1.1) && adapt.level > adapt.ceil) {
      if (++adapt.good >= 5) {
        adapt.level--;
        adapt.good = 0;
        adapt.upAt = adapt.windows;
        resize();
      }
    } else adapt.good = 0;
  };

  const buildFruit = (g: GLTF, name: string, env: THREE.Texture) => {
    const mesh = firstMesh(g.scene);
    if (!mesh) return null;
    g.scene.updateMatrixWorld(true);
    const geo = mesh.geometry.clone();
    geo.applyMatrix4(mesh.matrixWorld);
    geo.computeBoundingBox();
    const box = geo.boundingBox!;
    const c = box.getCenter(new THREE.Vector3());
    const d = box.getSize(new THREE.Vector3());
    const k = (BEAN * 1.15 * (FRUIT_SCALE[name] ?? 1.2)) / Math.max(d.x, d.y, d.z);
    geo.translate(-c.x, -c.y, -c.z);
    geo.scale(k, k, k);
    const src = mesh.material as THREE.MeshStandardMaterial;
    const lit = !!src.isMeshStandardMaterial;
    const mat = new THREE.MeshStandardMaterial({
      map: src.map ?? null,
      normalMap: lit ? src.normalMap : null,
      roughnessMap: lit ? src.roughnessMap : null,
      metalnessMap: lit ? src.metalnessMap : null,
      roughness: lit ? src.roughness : 0.55,
      metalness: lit ? src.metalness : 0,
      side: src.side,
      envMap: env,
      envMapIntensity: 1.5,
    });
    if (src.color) mat.color.copy(src.color);
    mat.normalScale.set(0.5, 0.5);
    mat.envMapRotation.set(0, 0.7, 0);
    patchChannel(mat, "g", "weeby-fruit");
    return { geo: own(geo), mat: own(mat) };
  };

  const setMorph = (h: Hero, v: number) => {
    const tmp = new THREE.Vector3();
    h.fruit.forEach((f) => {
      if (!f.morph) return;
      f.springs.base.forEach((b, i) => b.fromBufferAttribute(f.pos, i).addScaledVector(tmp.fromBufferAttribute(f.morph!, i), v));
    });
  };

  const showFlavour = (h: Hero, i: number) => h.fruit.forEach((f) => f.flavour !== null && (f.mesh.visible = f.flavour === i));

  const setupHero = async (env: THREE.Texture) => {
    const fruitSrcs = [...new Set([...flavours.flatMap((f) => f.fruitSrcs), ...o.streamFruitSrcs.flat()])];
    const [can, labels, fruitList, matcap] = await Promise.all([
      loadGltf(o.canSrc),
      Promise.all(flavours.map((f) => loadTex(f.labelSrc, false, true))),
      Promise.all(fruitSrcs.map((src) => loadGltf(src).then((g) => [src, g] as const))),
      loadTex(o.textures.dropletMatcap, true),
    ]);
    labels.forEach((t) => {
      t.anisotropy = aniso;
      own(t);
    });
    own(matcap);
    const fruitModels = new Map<string, ReturnType<typeof buildFruit>>();
    fruitList.forEach(([src, g]) => fruitModels.set(src, buildFruit(g, fruitName(src), env)));

    const scene = new THREE.Scene();
    const camera = can.cameras[0] as THREE.PerspectiveCamera;
    const model = can.scene;
    const mixer = new THREE.AnimationMixer(model);
    can.animations.forEach((clip) => mixer.clipAction(clip).play());
    const picked: { can: THREE.Mesh | null; bg: THREE.Mesh | null } = { can: null, bg: null };
    const found: Record<string, THREE.Object3D> = {};
    model.traverse((n) => {
      const mesh = n as THREE.Mesh;
      if (mesh.isMesh) {
        if (n.name.includes("background")) {
          picked.bg = mesh;
          n.visible = false;
        } else if (n.name.includes("Can") && !picked.can) picked.can = mesh;
        return;
      }
      for (const key of ["CofffeBeans_BG", "CofffeBeans_FG", "Flowers", "Chocolate"]) if (n.name.includes(key) && !found[key]) found[key] = n;
    });
    if (!picked.can) throw new Error("can mesh missing");
    const canNode = picked.can;
    const bgMesh = picked.bg;
    canNode.removeFromParent();
    scene.add(model);

    const u: Record<string, THREE.IUniform> = {
      uBgProgress: { value: 0 },
      uTime: { value: 0 },
      uT: { value: 0 },
      uDefaultT: { value: 0 },
      uAspect: { value: 1 },
      uBg0: { value: new THREE.Color(0xffffff) },
      uBgDefault: { value: new THREE.Color(flavours[0]?.rim ?? RIMS[0]) },
      uBgCur: { value: new THREE.Color(flavours[0]?.rim ?? RIMS[0]) },
      uBgNext: { value: new THREE.Color(flavours[1]?.rim ?? RIMS[1]) },
      tNoise: { value: noise },
      tCur: { value: labels[0] },
      tNext: { value: labels[1] ?? labels[0] },
    };
    const canMat = (canNode.material as THREE.MeshStandardMaterial).clone();
    canMat.map = labels[0];
    canMat.envMap = env;
    canMat.envMapIntensity = 1;
    canMat.aoMapIntensity = 2.5;
    patchCan(canMat, u);
    canNode.material = own(canMat);
    canNode.children.forEach((c) => {
      const drop = c as THREE.Mesh;
      if (!drop.isMesh) return;
      drop.material = own(new THREE.MeshNormalMaterial());
      drop.layers.set(1);
    });
    const restPos = canNode.position.clone();
    canNode.position.set(0, 0, 0);
    const parents: Record<string, THREE.Object3D> = {};
    let tail: THREE.Object3D = scene;
    for (const name of ["reveal", "scrollPos", "mouse", "scrollRot", "drag", "transition", "base"]) {
      const g = new THREE.Group();
      tail.add(g);
      parents[name] = g;
      tail = g;
    }
    tail.add(canNode);
    const proxy = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.31, 12, 1), new THREE.MeshBasicMaterial());
    own(proxy.geometry);
    own(proxy.material as THREE.Material);
    proxy.visible = false;
    proxy.scale.setScalar(0.5);
    canNode.geometry.computeBoundingBox();
    canNode.geometry.boundingBox!.getCenter(proxy.position);
    tail.add(proxy);
    parents.reveal.position.copy(restPos);
    parents.reveal.position.y -= 0.1;
    parents.reveal.rotation.set(Math.PI * 0.066, Math.PI * -0.125, Math.PI * 0.25);

    const bounce: Bounce = { stiffness: 40, damping: 12, radius: 0.075, strength: 3, rotation: 40, rotationDamping: 4, scale: 0 };
    const fruit: Hero["fruit"] = [];
    const build = (set: THREE.Object3D | undefined, srcs: string[], flavour: number | null) => {
      const helix = set?.children[0];
      const cloner = helix?.children[0] as THREE.Mesh | undefined;
      if (!helix || !cloner) return;
      cloner.visible = false;
      const pos = cloner.geometry.getAttribute("position") as THREE.BufferAttribute;
      const upAttr = cloner.geometry.getAttribute("_orient_up") as THREE.BufferAttribute | undefined;
      const morphAttr = (cloner.geometry.morphAttributes.position?.[0] as THREE.BufferAttribute | undefined) ?? null;
      const types = srcs.filter((s) => fruitModels.get(s));
      const Y = new THREE.Vector3(0, 1, 0);
      types.forEach((src, ti) => {
        const idx: number[] = [];
        for (let i = 0; i < pos.count; i++) if (i % types.length === ti) idx.push(i);
        if (!idx.length) return;
        const f = fruitModels.get(src)!;
        const inst = new THREE.InstancedMesh(f.geo, f.mat, idx.length);
        inst.position.copy(cloner.position);
        inst.quaternion.copy(cloner.quaternion);
        inst.scale.copy(cloner.scale);
        const m = new THREE.Matrix4();
        const p = new THREE.Vector3();
        const q = new THREE.Quaternion();
        const twist = new THREE.Quaternion();
        const n = new THREE.Vector3();
        const s = new THREE.Vector3(0.3, 0.3, 0.3);
        const sub = (attr: THREE.BufferAttribute | null) => {
          if (!attr) return null;
          const arr = new Float32Array(idx.length * 3);
          idx.forEach((pi, j) => {
            arr[j * 3] = attr.getX(pi);
            arr[j * 3 + 1] = attr.getY(pi);
            arr[j * 3 + 2] = attr.getZ(pi);
          });
          return new THREE.BufferAttribute(arr, 3);
        };
        idx.forEach((pi, j) => {
          p.fromBufferAttribute(pos, pi);
          if (upAttr) n.fromBufferAttribute(upAttr, pi).normalize().negate();
          else n.copy(Y);
          q.setFromUnitVectors(Y, n).multiply(twist.setFromAxisAngle(Y, pi * 2.39996));
          m.compose(p, q, s);
          inst.setMatrixAt(j, m);
        });
        inst.instanceMatrix.needsUpdate = true;
        inst.frustumCulled = false;
        if (flavour !== null) inst.visible = flavour === 0;
        helix.add(inst);
        fruit.push({ mesh: inst, springs: new Springs(inst, bounce, idx.length, inst), pos: sub(pos)!, morph: sub(morphAttr), flavour });
      });
    };
    flavours.forEach((f, i) => {
      build(found.CofffeBeans_BG, f.fruitSrcs, i);
      build(found.CofffeBeans_FG, f.fruitSrcs, i);
    });
    build(found.Flowers, o.streamFruitSrcs[0] ?? [], null);
    build(found.Chocolate, o.streamFruitSrcs[1] ?? [], null);

    const rtScene = own(new THREE.WebGLRenderTarget(1, 1, { samples: touch ? 0 : 2, depthTexture: new THREE.DepthTexture(1, 1) }));
    const rtDrop = own(new THREE.WebGLRenderTarget(1, 1, { depthTexture: new THREE.DepthTexture(1, 1) }));
    const plane = planeMesh(
      HERO_FRAG,
      {
        tScene: { value: rtScene.texture },
        tSceneDepth: { value: rtScene.depthTexture },
        tDrop: { value: rtDrop.texture },
        tDropDepth: { value: rtDrop.depthTexture },
        tMatcap: { value: matcap },
        tNoise: u.tNoise,
        uBgProgress: u.uBgProgress,
        uDefaultT: u.uDefaultT,
        uT: u.uT,
        uAspect: u.uAspect,
        uBg0: u.uBg0,
        uBgDefault: u.uBgDefault,
        uBgCur: u.uBgCur,
        uBgNext: u.uBgNext,
      },
      true,
    );
    plane.renderOrder = 99;
    plane.visible = false;
    presentScene.add(plane);
    own(plane.geometry);
    own(plane.material as THREE.Material);

    const sets = Object.values(found);
    hero = {
      scene,
      camera,
      baseFov: camera.fov,
      mixer,
      parents,
      bgMesh,
      proxy,
      sets,
      fruit,
      labels,
      u,
      plane,
      rtScene,
      rtDrop,
      bounce,
      reveal: { y: parents.reveal.position.y, z: Math.PI * 0.25 },
      tr: { rot: 0, offset: offsetFor(0).c, morph: 1 },
      current: 0,
      busy: null,
      can: canNode,
      fit: null,
      slot: null,
      drag: { id: null, claimed: false, abandoned: false, sx: 0, sy: 0, lx: 0, lt: 0, v: 0, dist: 0, rot: 0, target: 0, damping: 0, spinning: false },
      hover: false,
    };
    const startIndex = Math.min(canFlavour.get().index, Math.max(0, flavours.length - 1));
    if (startIndex !== 0) jumpTo(hero, startIndex);
    cleanups.push(() => mixer.stopAllAction());
  };

  const jumpTo = (h: Hero, i: number) => {
    h.current = i;
    h.u.tCur.value = h.labels[i];
    h.u.tNext.value = h.labels[(i + 1) % h.labels.length];
    (h.u.uBgCur.value as THREE.Color).set(flavours[i]?.rim ?? RIMS[i % RIMS.length]);
    h.tr.offset = offsetFor(i).c;
    showFlavour(h, i);
  };

  const runTransition = (h: Hero, next: number, dir: number, fromDrag: boolean) => {
    if (h.busy) h.busy.progress(1);
    if (next === h.current || !h.labels[next]) return;
    const cur = h.current;
    if (reduce) {
      jumpTo(h, next);
      return;
    }
    const a = offsetFor(cur);
    const b = offsetFor(next);
    (h.u.uBgNext.value as THREE.Color).set(flavours[next]?.rim ?? RIMS[next % RIMS.length]);
    h.u.tNext.value = h.labels[next];
    const tl = gsap.timeline({
      onComplete: () => {
        (h.u.uBgCur.value as THREE.Color).copy(h.u.uBgNext.value as THREE.Color);
        h.u.tCur.value = h.u.tNext.value;
        h.u.uT.value = 0;
        h.tr.rot = 0;
        h.current = next;
        h.busy = null;
      },
    });
    if (!fromDrag) tl.fromTo(h.tr, { rot: 0 }, { rot: Math.PI * 2 * dir, duration: 2, ease: "expo.inOut" }, 0);
    tl.fromTo(h.u.uT, { value: 0 }, { value: 1, duration: 1.5, ease: fromDrag ? "power1.out" : "none" }, 0.5);
    tl.fromTo(h.tr, { offset: a.c }, { offset: dir === 1 ? a.e : a.s, duration: 1, ease: "expo.in" }, 0);
    tl.fromTo(h.tr, { offset: dir === 1 ? b.s : b.e }, { offset: b.c, duration: 1, ease: "expo.out", immediateRender: false }, 1);
    tl.to(h.tr, { morph: 0, duration: 1, ease: "expo.in" }, 0);
    tl.to(h.tr, { morph: 1, duration: 1, ease: "expo.out" }, 1);
    tl.call(() => showFlavour(h, next), undefined, 1);
    h.busy = keep(tl);
  };

  const offFlavour = canFlavour.subscribe(() => {
    const s = canFlavour.get();
    if (hero && s.index !== hero.current) runTransition(hero, s.index, s.direction, s.by === "drag");
  });
  cleanups.push(offFlavour);

  const setupPaper = async (env: THREE.Texture) => {
    const g = await loadGltf(o.paperSrc);
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(bg.fog.clone(), 1, 11);
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    camera.position.z = 5;
    const group = new THREE.Group();
    group.position.y = -0.5;
    scene.add(group);
    const pu = { uTextVisibility: { value: 1 } };
    g.scene.traverse((n) => {
      const mesh = n as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.envMap = env;
      mat.envMapIntensity = 3;
      if (mat.map) mat.map.anisotropy = aniso;
      patchPaper(mat, pu);
      own(mat);
    });
    const count = 12;
    const spread = new THREE.Vector3(4, 2.5, 5);
    const cell = Math.cbrt((spread.x * spread.y * spread.z) / count);
    const grid = { x: Math.max(1, Math.round(spread.x / cell)), y: Math.max(1, Math.round(spread.y / cell)), z: Math.max(1, Math.round(spread.z / cell)) };
    while (grid.x * grid.y * grid.z < count) {
      const axis = (["x", "y", "z"] as const).reduce((m, k) => (spread[m] / grid[m] >= spread[k] / grid[k] ? m : k));
      grid[axis]++;
    }
    const cells: [number, number, number][] = [];
    for (let x = 0; x < grid.x; x++) for (let y = 0; y < grid.y; y++) for (let z = 0; z < grid.z; z++) cells.push([x, y, z]);
    for (let i = cells.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cells[i], cells[j]] = [cells[j], cells[i]];
    }
    const jit = () => (Math.random() - 0.5) * 0.25;
    const randomQ = () => new THREE.Quaternion().setFromEuler(new THREE.Euler(0.25 + Math.random() * 0.5, (Math.random() * 2 - 1) * 0.75, (Math.random() * 2 - 1) * 0.5));
    const sheets: Paper["sheets"] = cells.slice(0, count).map(([x, y, z]) => {
      const base = new THREE.Vector3(((x + 0.5 + jit()) / grid.x - 0.5) * spread.x, ((y + 0.5 + jit()) / grid.y - 0.5) * spread.y, ((z + 0.5 + jit()) / grid.z - 0.5) * spread.z);
      const layer = 2 - Math.min(2, Math.floor((z / grid.z) * 3));
      const mesh = cloneSkinned(g.scene);
      const q = randomQ();
      mesh.position.copy(base);
      mesh.quaternion.copy(q);
      mesh.scale.setScalar(2.5);
      group.add(mesh);
      const atlas = Math.floor(Math.random() * 6);
      mesh.traverse((n) => {
        const m = n as THREE.Mesh;
        if (!m.isMesh) return;
        m.geometry = own(m.geometry.clone());
        m.geometry.setAttribute("aAtlas", new THREE.BufferAttribute(new Float32Array(m.geometry.attributes.position.count).fill(atlas), 1));
        m.layers.set(layer);
        m.frustumCulled = false;
      });
      mesh.updateMatrixWorld(true);
      const tips: THREE.Object3D[] = [];
      mesh.traverse((n) => {
        if ((n.parent as THREE.Bone | null)?.isBone) tips.push(n);
      });
      const dir = base.lengthSq() === 0 ? new THREE.Vector3(0, 1, 0) : base.clone().normalize();
      return { mesh, wiggles: tips.map((t) => new Wiggle(t)), random: Math.random() * Math.PI * 2, base, target: base.clone().addScaledVector(dir, 2), cur: base.clone(), baseQ: q, targetQ: randomQ(), curQ: q.clone() };
    });
    const bounce: Bounce = { stiffness: 5, damping: 1.5, radius: 1, strength: 2, rotation: 0, rotationDamping: 0, scale: 1 };
    const springs = new Springs(group, bounce, sheets.length, null);
    springs.base = sheets.map((s) => s.cur);
    const rts = [own(new THREE.WebGLRenderTarget(1, 1)), own(new THREE.WebGLRenderTarget(1, 1)), own(new THREE.WebGLRenderTarget(1, 1))];
    const blur = [own(new Kawase()), own(new Kawase())];
    const plane = planeMesh(PAPER_FRAG, { t1: { value: rts[0].texture }, t2: { value: null }, t3: { value: null }, uReveal: { value: reduce ? 1 : 0 }, uBg: { value: bg.paper.clone() } }, false);
    plane.layers.set(1);
    plane.visible = false;
    presentScene.add(plane);
    own(plane.geometry);
    own(plane.material as THREE.Material);
    paper = { scene, camera, group, sheets, springs, bounce, rts, blur, plane, intro: { progress: reduce ? 0 : 1.5 } };
  };

  const setupWater = async () => {
    if (waterLoading || water || !alive) return;
    waterLoading = true;
    try {
      const [g, label, alpha, stream, voronoi, edge] = await Promise.all([
        loadGltf(o.pourCanSrc),
        loadTex(o.pourLabelSrc, false, true),
        loadTex(o.textures.glassAlpha),
        loadTex(o.textures.stream, false, true),
        loadTex(o.textures.voronoi),
        loadTex(o.textures.normalEdge),
      ]);
      if (!alive || !envTex || !noise) return;
      [label, alpha, stream, voronoi, edge].forEach(own);
      label.anisotropy = aniso;
      stream.anisotropy = aniso;
      voronoi.wrapS = voronoi.wrapT = THREE.RepeatWrapping;
      voronoi.generateMipmaps = false;
      alpha.generateMipmaps = false;
      edge.generateMipmaps = false;
      voronoi.needsUpdate = true;
      const video = document.createElement("video");
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.crossOrigin = "anonymous";
      video.preload = "auto";
      video.src = localMediaSrc(o.pourVideoSrc);
      const vtex = own(new THREE.VideoTexture(video));
      vtex.flipY = false;
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(15, 1, 0.1, 100);
      camera.position.z = 5;
      const su: Record<string, THREE.IUniform> = { uMouse: { value: new THREE.Vector2() }, uDist: { value: 0 }, uRecover: { value: 1 }, uTime: { value: 0 }, uAspect: { value: 1 }, tVideo: { value: vtex }, tAlpha: { value: alpha }, tStream: { value: stream }, tVoronoi: { value: voronoi }, tEdge: { value: edge } };
      const parts: { can: THREE.Mesh | null; plane: THREE.Mesh | null } = { can: null, plane: null };
      g.scene.traverse((n) => {
        const mesh = n as THREE.Mesh;
        if (!mesh.isMesh) return;
        if (n.name.includes("Can")) {
          const mat = (mesh.material as THREE.MeshStandardMaterial).clone();
          mat.map = label;
          mat.envMap = envTex;
          mat.envMapIntensity = 1;
          mat.envMapRotation.set(-2.84, 0.75, -0.55);
          mat.aoMapIntensity = 3;
          mat.side = THREE.DoubleSide;
          mat.roughnessMap = null;
          mat.roughness = 0.3;
          patchPour(mat, noise!);
          mesh.material = own(mat);
          parts.can = mesh;
        } else if (n.name.includes("Video")) {
          mesh.geometry.computeBoundingBox();
          const d = mesh.geometry.boundingBox!.getSize(new THREE.Vector3()).multiply(mesh.scale);
          su.uAspect.value = d.x / d.y;
          mesh.material = own(new THREE.ShaderMaterial({ uniforms: su, vertexShader: STREAM_VERT, fragmentShader: STREAM_FRAG, transparent: true, depthWrite: false }));
          parts.plane = mesh;
        }
      });
      const { can, plane } = parts;
      if (!can || !plane) return;
      g.scene.position.set(-0.27, -0.76, 0.58);
      scene.add(g.scene);
      const rt = own(new THREE.WebGLRenderTarget(1, 1, { samples: touch ? 0 : 2 }));
      const out = planeMesh(WATER_FRAG, { tScene: { value: rt.texture } }, true);
      out.visible = false;
      presentScene.add(out);
      own(out.geometry);
      own(out.material as THREE.Material);
      out.visible = true;
      await Promise.all([renderer.compileAsync(scene, camera), renderer.compileAsync(out, presentCam, presentScene)]);
      out.visible = false;
      if (!alive) return;
      water = { scene, camera, can, stream: plane, su, video, rt, plane: out, em: { x: 0, y: 0 }, hovering: false, recover: null };
      cleanups.push(() => {
        video.pause();
        video.removeAttribute("src");
        video.load();
      });
      sizeWater();
      renderer.setRenderTarget(rt);
      renderer.render(scene, camera);
      renderer.setRenderTarget(null);
      start();
    } catch (error) {
      console.error("CanFlavourStage: pour scene failed", error);
    } finally {
      waterLoading = false;
    }
  };

  let envTex: THREE.Texture | null = null;

  const load = async () => {
    const pmrem = new THREE.PMREMGenerator(renderer);
    const [hdr, noiseTex] = await Promise.all([ktx2.loadAsync(localMediaSrc(o.envSrc)), loadTex(o.textures.noise, true)]);
    noiseTex.wrapS = noiseTex.wrapT = THREE.RepeatWrapping;
    noiseTex.needsUpdate = true;
    noise = own(noiseTex);
    envTex = own(pmrem.fromEquirectangular(hdr).texture);
    pmrem.dispose();
    hdr.dispose();
    if (!alive) return;
    readTone();
    await Promise.all([setupHero(envTex), setupPaper(envTex)]);
    if (!alive || !hero || !paper) return;
    readTone();
    scan();
    resize(true);
    applyHero(0, 0);
    applyPaper(0);
    await Promise.all([renderer.compileAsync(hero.scene, hero.camera), renderer.compileAsync(paper.scene, paper.camera), renderer.compileAsync(presentScene, presentCam)]);
    if (!alive) return;
    renderHero();
    renderPaper();
    renderer.setRenderTarget(null);
    o.onReady();
    cleanups.push(o.onReveal(reveal));
  };

  const reveal = () => {
    if (revealed || !alive) return;
    revealed = true;
    scroll.last = scrollY;
    if (hero && !reduce) {
      const h = hero;
      const tl = gsap.timeline({ delay: 0.3, defaults: { duration: 1.75 } });
      tl.to(h.reveal, { y: 0.0975, ease: "back.out(0.5)" }, 0);
      tl.fromTo(h.reveal, { z: Math.PI * 0.25 }, { z: 0, ease: "power2.out" }, 0);
      keep(tl);
    } else if (hero) {
      hero.reveal.y = 0.0975;
      hero.reveal.z = 0;
    }
    if (paper && !reduce) {
      const p = paper;
      const tl = gsap.timeline({ delay: 0.3 });
      tl.to((p.plane.material as THREE.ShaderMaterial).uniforms.uReveal, { value: 1, duration: 0.5, ease: "power2.out" }, 0);
      tl.fromTo(p.intro, { progress: 1.5 }, { progress: 0, duration: 2, ease: "back.out" }, 0);
      keep(tl);
    }
    window.setTimeout(setupWater, 600);
    start();
  };

  const backIn = gsap.parseEase("back.in(1.2)");

  const applyHero = (t: number, dtSec: number) => {
    const h = hero!;
    const m = size.stack;
    const a = clamp01(t);
    const p = h.parents;
    p.reveal.position.y = h.reveal.y;
    p.reveal.rotation.z = h.reveal.z;
    p.scrollPos.position.set(lerp(0, m ? 0 : -0.095, a), lerp(0, m ? 0.095 : 0.105, a), 0);
    if (m && h.slot && !h.fit) h.fit = measureFit(h);
    const fitted = m && h.slot && h.fit ? { k: Math.min(1, h.slot.h / h.fit.h), off: h.slot.c - h.fit.c } : null;
    p.scrollPos.scale.setScalar(lerp(1, m ? 0.6 * (fitted?.k ?? 1) : 0.9, a));
    const yEnd = m ? Math.PI * 2 : Math.PI * 1.95;
    p.scrollRot.rotation.set(lerp(0, m ? 0 : -0.181, a), t <= 1 ? lerp(0, yEnd, a) : lerp(yEnd, Math.PI * 3, clamp01(t - 1)), lerp(0, m ? 0.15 : 0.233, a));
    p.transition.rotation.y = h.tr.rot;
    h.bounce.scale = span(t, 0.33, 0.66);
    h.u.uBgProgress.value = a;
    h.u.uDefaultT.value = a;
    setMorph(h, span(t, 0.33, 0.99) * 0.66 * h.tr.morph);
    h.mixer.setTime(2.65 * t + h.tr.offset);
    p.base.rotation.y = mouse.ex * 0.1 + scroll.springV * 0.02;
    p.mouse.rotation.x = mouse.ey * 0.1;
    p.mouse.position.y = -scroll.springV * 0.0005;
    const d = h.drag;
    if (d.rot !== d.target) {
      d.rot = damp(d.rot, d.target, d.damping * 100, dtSec);
      if (Math.abs(d.target - d.rot) < 0.01) {
        d.rot = d.spinning ? 0 : d.target;
        d.target = d.rot;
        d.spinning = false;
      }
    }
    p.drag.rotation.y = d.rot;
    const off = m ? (fitted?.off ?? 0) * a : size.h * 0.05 * a;
    h.camera.setViewOffset(size.w, size.h, m ? 0 : -size.w * 0.012 * a, -off, size.w, size.h);
  };

  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const hit = { on: false, point: new THREE.Vector3() };
  const force = new THREE.Vector3();
  const forceDir = new THREE.Vector3(0.33, 0.66, 0);
  const paperPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

  const updateHeroPointer = () => {
    const h = hero!;
    hit.on = false;
    if (touch || !mouse.moved || !h.bgMesh) return;
    ndc.set(mouse.x, mouse.y);
    ray.setFromCamera(ndc, h.camera);
    const hits = ray.intersectObject(h.bgMesh, false);
    if (hits.length) {
      hit.on = true;
      hit.point.copy(hits[0].point);
    }
    const armed = isArmed();
    const over = armed && ray.intersectObject(h.proxy, false).length > 0;
    setHover(over);
  };

  const heroT = () => (poses.hero ? Math.min(2, Math.max(0, -poses.hero.getBoundingClientRect().top / size.h)) : 0);
  const isArmed = () => !!hero && heroOn && !hero.busy && !hero.drag.spinning && heroT() >= 1;

  const setHover = (v: boolean) => {
    if (!hero || hero.hover === v) return;
    hero.hover = v;
    if (hero.drag.id === null) document.documentElement.style.cursor = v ? "grab" : "";
  };

  const applyPaper = (scrollP: number) => {
    const p = paper!;
    const sv = backIn(scrollP) * 2;
    const progress = scrollP > 0 ? Math.max(p.intro.progress, sv) : p.intro.progress;
    const k = span(scrollP, 0, 0.25);
    p.bounce.stiffness = lerp(5, 10, k);
    p.bounce.damping = lerp(1.5, 12, k);
    p.sheets.forEach((s) => {
      s.cur.lerpVectors(s.base, s.target, progress);
      s.curQ.slerpQuaternions(s.baseQ, s.targetQ, progress);
    });
    p.camera.setViewOffset(size.w, size.h, 0, scrollP * size.h * 0.5, size.w, size.h);
  };

  const renderHero = () => {
    const h = hero!;
    h.camera.layers.set(0);
    renderer.setRenderTarget(h.rtScene);
    renderer.render(h.scene, h.camera);
    h.camera.layers.set(1);
    renderer.setRenderTarget(h.rtDrop);
    renderer.render(h.scene, h.camera);
    h.camera.layers.set(0);
  };

  const renderPaper = () => {
    const p = paper!;
    const u = (p.plane.material as THREE.ShaderMaterial).uniforms;
    p.camera.layers.set(0);
    renderer.setRenderTarget(p.rts[0]);
    renderer.render(p.scene, p.camera);
    p.camera.layers.set(1);
    renderer.setRenderTarget(p.rts[1]);
    renderer.render(p.scene, p.camera);
    u.t2.value = p.blur[0].render(renderer, p.rts[1], 1, 0.6);
    p.camera.layers.set(2);
    renderer.setRenderTarget(p.rts[2]);
    renderer.render(p.scene, p.camera);
    u.t3.value = p.blur[1].render(renderer, p.rts[2], 2, 0.6);
    p.camera.layers.set(0);
  };

  const setRect = (plane: THREE.Mesh, top: number, height: number, clip: THREE.Vector4) => {
    const u = (plane.material as THREE.ShaderMaterial).uniforms;
    u.uRect.value.set(top, height);
    u.uViewH.value = size.h;
    u.uClip.value.copy(clip);
  };
  const heroClip = new THREE.Vector4();
  const waterClip = new THREE.Vector4();

  let heroOn = false;
  let last = performance.now();
  let time = 0;
  let rendered = false;

  const frame = (now: number) => {
    raf = 0;
    if (!alive) return;
    const ms = now - last;
    const dt = Math.min(ms / 1000, 1 / 30);
    last = now;
    resize();
    if (!reduce) time += dt;
    const vh = size.h;

    const dy = scrollY - scroll.last;
    scroll.last = scrollY;
    scroll.target = dt > 0 ? dy / (dt * 60) : 0;
    scroll.current = damp(scroll.current, scroll.target, 5, dt);
    scroll.springV += -10 * (scroll.springX - scroll.current) * dt;
    scroll.springV = damp(scroll.springV, 0, 8, dt);
    scroll.springX += scroll.springV * dt;
    if (!touch) {
      mouse.ex = damp(mouse.ex, mouse.x, 5, dt);
      mouse.ey = damp(mouse.ey, mouse.y, 5, dt);
    }

    let heroTop = vh;
    let heroVisible = false;
    if (poses.hero && (hero || paper)) {
      const hr = poses.hero.getBoundingClientRect();
      const end = (poses.slider ?? poses.hero).getBoundingClientRect();
      heroTop = hr.top > 0 ? hr.top : Math.min(0, end.bottom - vh);
      const track = (poses.hero.closest("section") ?? poses.hero).getBoundingClientRect();
      heroClip.set(track.top, track.bottom, end.top, end.bottom);
      const shown = (track.bottom > 0 && track.top < vh) || (end.bottom > 0 && end.top < vh);
      heroVisible = shown && heroTop < vh && heroTop > -vh;
      if (hero) hero.slot = size.stack ? slotFor(heroTop) : null;
    }
    heroOn = heroVisible && !!hero;
    const paperOn = heroVisible && !!paper;

    let waterOn = false;
    let waterTop = 0;
    let waterH = 0;
    let waterRect: DOMRect | null = null;
    if (water && poses.water && !size.mobile) {
      waterRect = poses.water.getBoundingClientRect();
      waterH = Math.min(waterRect.height, vh);
      waterTop = waterRect.height < vh ? waterRect.top : waterRect.top > 0 ? waterRect.top : Math.min(0, waterRect.bottom - vh);
      waterOn = waterTop < vh && waterTop + waterH > 0 && waterRect.bottom > 0 && waterRect.top < vh;
      waterClip.set(waterRect.top, waterRect.bottom, 0, 0);
    }

    if (hero) {
      if (heroOn) {
        const h = hero;
        const t = heroT();
        h.u.uTime.value = time;
        updateHeroPointer();
        force.copy(forceDir).multiplyScalar(scroll.current * 0.25);
        h.scene.updateMatrixWorld();
        h.fruit.forEach((f) => {
          if (!f.mesh.visible || size.mobile) return;
          if (!reduce) f.springs.setForce(force);
          f.springs.update(hit.on ? hit.point : null, hit.on ? ray.ray : null, reduce ? 0 : dt);
        });
        applyHero(t, dt);
        renderHero();
      } else setHover(false);
      hero.plane.visible = heroOn;
      setRect(hero.plane, heroTop, vh, heroClip);
    }

    if (paper) {
      if (paperOn) {
        const p = paper;
        const scrollP = poses.hero ? clamp01(-poses.hero.getBoundingClientRect().top / vh) : 0;
        applyPaper(scrollP);
        p.group.updateMatrixWorld(true);
        let pPoint: V3 | null = null;
        if (!touch && mouse.moved) {
          ndc.set(mouse.x, mouse.y);
          ray.setFromCamera(ndc, p.camera);
          if (ray.ray.intersectPlane(paperPlane, hit.point)) pPoint = hit.point;
        } else p.springs.prev = null;
        p.springs.update(pPoint, pPoint ? ray.ray : null, reduce ? 0 : dt);
        const wiggle = reduce ? 1 : 1 - Math.pow(1 - 0.03 * 0.85, 120 * dt);
        p.sheets.forEach((s, i) => {
          s.mesh.position.copy(s.cur).add(p.springs.off[i]);
          if (!reduce) s.mesh.position.y += Math.sin(time + s.random) * 0.2;
          s.mesh.quaternion.copy(s.curQ);
        });
        p.group.updateMatrixWorld(true);
        p.sheets.forEach((s) => s.wiggles.forEach((w) => w.update(wiggle)));
        renderPaper();
      }
      paper.plane.visible = paperOn;
      setRect(paper.plane, heroTop, vh, heroClip);
    }

    if (water) {
      const w = water;
      w.plane.visible = waterOn;
      if (waterOn && waterRect) {
        if (w.video.paused && !reduce) w.video.play().catch(() => {});
        if (w.rt.height !== Math.round(waterH * size.dpr)) sizeWater();
        const nx = clamp01((mouse.cx - waterRect.left) / waterRect.width) * 2 - 1;
        const ny = -(clamp01((mouse.cy - waterRect.top) / waterRect.height) * 2 - 1);
        w.em.x = damp(w.em.x, nx, 5, dt);
        w.em.y = damp(w.em.y, ny, 5, dt);
        const camOff = Math.min(Math.max(-waterRect.top, 0), Math.max(waterRect.height - vh, 0));
        w.camera.setViewOffset(size.w, waterH, 0, camOff, size.w, waterH);
        if (!touch && mouse.moved) {
          ndc.set(nx, ny);
          ray.setFromCamera(ndc, w.camera);
          const hits = ray.intersectObject(w.stream, false);
          if (hits.length && hits[0].uv) (w.su.uMouse.value as THREE.Vector2).copy(hits[0].uv);
        }
        let dx = (w.su.uMouse.value as THREE.Vector2).x - 0.625;
        const near = Math.abs(dx) <= 0.1;
        if (!near) dx = 0;
        if (near !== w.hovering) {
          w.hovering = near;
          w.recover?.kill();
          w.recover = keep(gsap.to(w.su.uRecover, { value: near ? 0 : 1, duration: near ? 0.1 : 0.6, ease: "none" }));
          w.video.playbackRate = near ? 1.5 : 1;
        }
        w.su.uTime.value = time;
        w.su.uDist.value = damp(w.su.uDist.value as number, dx, 7.5, dt);
        w.can.rotation.y = w.em.x * 0.05;
        w.can.rotation.x = w.em.y * 0.025;
        renderer.setRenderTarget(w.rt);
        renderer.render(w.scene, w.camera);
      } else if (!w.video.paused) w.video.pause();
      setRect(w.plane, waterTop, waterH, waterClip);
    }

    const anyFront = heroOn || waterOn;
    presentCam.layers.set(0);
    if (anyFront) {
      renderer.setRenderTarget(null);
      renderer.render(presentScene, presentCam);
      present(front);
    } else clearOut(front);
    if (paperOn) {
      presentCam.layers.set(1);
      renderer.setRenderTarget(null);
      renderer.render(presentScene, presentCam);
      present(back);
      presentCam.layers.set(0);
    } else clearOut(back);

    if (anyFront || paperOn) {
      if (rendered) measure(ms);
      rendered = true;
      if (!reduce || dy !== 0 || hero?.busy) {
        raf = requestAnimationFrame(frame);
        return;
      }
    }
    rendered = false;
  };

  const start = () => {
    if (!alive || raf || !revealed || document.hidden) return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  };

  const onScroll = () => start();
  const onResize = () => {
    resize();
    rescan();
    start();
  };
  const onVisible = () => {
    if (document.hidden) {
      cancelAnimationFrame(raf);
      raf = 0;
      water?.video.pause();
    } else start();
  };
  const onMove = (e: PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    mouse.x = (e.clientX / innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / innerHeight) * 2 + 1;
    mouse.cx = e.clientX;
    mouse.cy = e.clientY;
    mouse.moved = true;
    if (hero?.drag.id === e.pointerId) dragMove(e);
    start();
  };
  const onTouchMove = (e: PointerEvent) => {
    if (e.pointerType !== "mouse" && hero?.drag.id === e.pointerId) dragMove(e);
  };

  const dragMove = (e: PointerEvent) => {
    const d = hero!.drag;
    if (d.abandoned) return;
    const dx = e.clientX - d.sx;
    const dy = e.clientY - d.sy;
    if (!d.claimed) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 10) return;
      if (Math.abs(dy) > Math.abs(dx)) {
        d.abandoned = true;
        return;
      }
      d.claimed = true;
      d.spinning = false;
      document.body.style.userSelect = "none";
      document.documentElement.style.cursor = "grabbing";
    }
    const now = performance.now();
    const el = now - d.lt;
    if (el > 0) d.v = d.v * 0.6 + ((e.clientX - d.lx) / el) * 0.4;
    d.lx = e.clientX;
    d.lt = now;
    d.dist = dx;
    d.target = Math.PI * 0.15555555555555556 * Math.tanh(dx / 300);
    d.damping = 0.6;
    start();
  };
  const releaseDrag = () => {
    if (!hero) return;
    const d = hero.drag;
    if (d.claimed) document.body.style.userSelect = "";
    d.id = null;
    d.claimed = false;
    d.abandoned = false;
    document.documentElement.style.cursor = hero.hover ? "grab" : "";
  };
  const onDown = (e: PointerEvent) => {
    if (!hero || !e.isPrimary || hero.drag.id !== null) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (!isArmed()) return;
    Object.assign(hero.drag, { id: e.pointerId, claimed: false, abandoned: false, sx: e.clientX, sy: e.clientY, lx: e.clientX, lt: performance.now(), v: 0, dist: 0 });
  };
  const onUp = (e: PointerEvent) => {
    if (!hero || e.pointerId !== hero.drag.id) return;
    const d = hero.drag;
    const claimed = d.claimed;
    const dist = d.dist;
    const v = d.v;
    releaseDrag();
    d.dist = 0;
    d.v = 0;
    if (Math.abs(dist) > 5) {
      const stop = (ev: Event) => {
        ev.stopPropagation();
        ev.preventDefault();
      };
      document.addEventListener("click", stop, { capture: true, once: true });
      window.setTimeout(() => document.removeEventListener("click", stop, { capture: true }), 300);
    }
    if (!claimed) return;
    const commit = Math.abs(dist) > 120 || (Math.abs(v) > 0.5 && Math.abs(dist) > 30);
    if (!commit || flavours.length < 2) {
      d.target = 0;
      d.damping = 0.15;
      d.spinning = false;
      start();
      return;
    }
    const dir = dist > 0 ? 1 : -1;
    canFlavour.set(hero.current + dir, dir, "drag");
    d.target = dir * Math.PI * 2;
    d.damping = 0.05;
    d.spinning = true;
    start();
  };
  const onCancel = (e: PointerEvent) => {
    if (!hero || e.pointerId !== hero.drag.id) return;
    releaseDrag();
    hero.drag.target = 0;
    hero.drag.damping = 0.15;
    hero.drag.spinning = false;
  };

  document.addEventListener("scroll", onScroll, { passive: true, capture: true });
  const sizeObs = new ResizeObserver(onResize);
  sizeObs.observe(document.documentElement);
  cleanups.push(() => sizeObs.disconnect());
  addEventListener("resize", onResize);
  document.addEventListener("visibilitychange", onVisible);
  document.addEventListener("pointermove", onMove, { passive: true });
  document.addEventListener("pointermove", onTouchMove, { passive: true });
  document.addEventListener("pointerdown", onDown);
  document.addEventListener("pointerup", onUp);
  document.addEventListener("pointercancel", onCancel);
  cleanups.push(() => {
    document.removeEventListener("scroll", onScroll, { capture: true });
    removeEventListener("resize", onResize);
    document.removeEventListener("visibilitychange", onVisible);
    document.removeEventListener("pointermove", onMove);
    document.removeEventListener("pointermove", onTouchMove);
    document.removeEventListener("pointerdown", onDown);
    document.removeEventListener("pointerup", onUp);
    document.removeEventListener("pointercancel", onCancel);
    if (hero?.hover || hero?.drag.claimed) {
      document.documentElement.style.cursor = "";
      document.body.style.userSelect = "";
    }
  });

  resize();
  load().catch((error) => {
    console.error("CanFlavourStage: could not load the scene", error);
    if (alive) o.onFail();
  });

  return () => {
    alive = false;
    cancelAnimationFrame(raf);
    tweens.forEach((t) => t.kill());
    cleanups.forEach((fn) => fn());
    clearOut(front);
    clearOut(back);
    for (const s of [hero?.scene, paper?.scene, water?.scene]) {
      s?.traverse((n) => {
        const mesh = n as THREE.Mesh;
        if (!mesh.isMesh) return;
        mesh.geometry?.dispose();
        (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach((m) => {
          if (!m) return;
          Object.values(m).forEach((v) => (v as THREE.Texture | null)?.isTexture && (v as THREE.Texture).dispose());
          m.dispose();
        });
      });
    }
    owned.forEach((x) => x.dispose());
    renderer.dispose();
  };
}

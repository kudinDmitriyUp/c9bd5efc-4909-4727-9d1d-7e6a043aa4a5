"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { gsap } from "gsap";
import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { Reflector } from "three/examples/jsm/objects/Reflector.js";
import { carDuo, useCarDuo, type CarPaint } from "./carDuo";
import { introSignal } from "./introSignal";
import { localMediaSrc } from "./mediaSrc";
import { localModelSrc } from "./localModelSrc";
import { useWebildHold } from "./webildReady";

type Vec = [number, number, number];

export type CarSpec = {
  name: string;
  code: string;
  src: string;
  length: number;
  turn?: number;
  paintMaterial: string;
  wheels: string;
  tail?: string;
  paint: CarPaint;
  accent?: string;
  topSpeed: number;
  downforce: number;
  engine: Vec;
  cockpit: Vec;
};

type CarDuoStageProps = { cars?: CarSpec[]; label?: string; switchAfterIntro?: boolean };

type Pose = { pos: Vec; tgt: Vec; fov: number; floor?: number; aero?: number; sweep?: number; wind?: number; step?: number; part?: number; spin?: number; air?: number };
type PoseKey = Exclude<keyof Pose, "pos" | "tgt">;
type Anchor = { y: number; p: Pose; label: string };
type Uniform<T> = { value: T };
type Carbon = { carbon: Uniform<number>; inv: Uniform<THREE.Matrix4>; sweepAmt: Uniform<number>; sweepX: Uniform<number>; bandMax: Uniform<number> };
type Car = {
  spec: CarSpec;
  holder: THREE.Group;
  wheels: THREE.Group[];
  paint: THREE.MeshPhysicalMaterial;
  u: Carbon;
  overlay: THREE.Mesh[];
  tail: { mats: THREE.MeshStandardMaterial[]; glow: THREE.Sprite | null };
  tailOn: number;
  spin: number;
  lastX: number;
};

const POSES: Record<string, Pose> = {
  hero: { pos: [6.6, 1.2, 5.4], tgt: [0, 0.45, 0], fov: 30, floor: 1 },
  heroOut: { pos: [7.4, 1.8, 3.4], tgt: [-0.4, 0.3, 0], fov: 30, floor: 0.5 },
  intro: { pos: [0.6, 0.95, 7.6], tgt: [-1.5, 0.55, 0], fov: 30 },
  stats: { pos: [7.2, 0.55, 1.4], tgt: [0, 0.55, 0], fov: 28 },
  aero1: { pos: [3.4, 4.6, 6.2], tgt: [-1.1, 0.3, 0], fov: 32, aero: 1, sweep: 0.6, wind: 0.5 },
  aero2: { pos: [1.2, 6.6, 4.4], tgt: [-1.1, 0.2, 0], fov: 32, aero: 1, sweep: -0.2, wind: 0.8, step: 1 },
  aero3: { pos: [-4.8, 3.4, 4.6], tgt: [-0.6, 0.4, 0], fov: 32, aero: 1, sweep: -1, wind: 1, step: 2 },
  part0: { pos: [3.4, 0.55, 2.9], tgt: [1.3, 0.38, 0.8], fov: 26, part: 0 },
  part1: { pos: [-5.4, 2.0, 2.4], tgt: [-1.3, 0.75, 0], fov: 28, part: 1 },
  part2: { pos: [1.9, 2.7, 1.9], tgt: [0.1, 0.9, 0.1], fov: 34, part: 2 },
  colourA: { pos: [5.6, 1.98, 6.86], tgt: [-0.65, 0.45, 0.82], fov: 30, spin: 0 },
  colourB: { pos: [5.6, 1.98, 6.86], tgt: [-0.65, 0.45, 0.82], fov: 30, spin: 1 },
  versus: { pos: [0, 1.6, 9.5], tgt: [0, 0.8, 0], fov: 28 },
  closing: { pos: [-5.0, 0.65, 4.4], tgt: [-0.4, 0.7, 0], fov: 30 },
};

const DEFAULT_CARS: CarSpec[] = [
  {
    name: "911 Turbo S",
    code: "911",
    src: "https://storage.googleapis.com/webild/default/templates/sports-car-brand/911.glb",
    length: 4.535,
    paintMaterial: "body_main",
    wheels: "wheel_rim|tire_main|discs_Discs",
    tail: "^red_light_main$",
    paint: { color: "rgb(166, 171, 175)", metalness: 0.8, roughness: 0.28 },
    topSpeed: 330,
    downforce: 170,
    engine: [-1.7, 0.8, 0],
    cockpit: [0.1, 1.0, 0.2],
  },
  {
    name: "918 Spyder",
    code: "918",
    src: "https://storage.googleapis.com/webild/default/templates/sports-car-brand/918.glb",
    length: 4.643,
    turn: Math.PI / 2,
    paintMaterial: "Body_Paint_-_GT_Silver_Metalic",
    wheels: "DEF-?Wheel(?!Brake)",
    paint: { color: "rgb(179, 184, 188)", metalness: 0.9, roughness: 0.22 },
    accent: "rgb(147, 192, 31)",
    topSpeed: 345,
    downforce: 240,
    engine: [-0.7, 0.9, 0],
    cockpit: [0.3, 0.95, 0.2],
  },
];

const WHEEL_R = 0.35;
const LEVELS = [1, 0.8, 0.65];
const HM = { w: 256, h: 96, x: 3.6, z: 1.4 };
const TAIL_DARK = new THREE.Color(0x2a0306);
const TAIL_LIT = new THREE.Color(0xff1a24);
const LINE_MIX = [0.209, 0.2227, 0.2466];
const LIGHTS_HEAD_START = 1.2;

const radial = (rgb: string, stops: [number, number][]) => {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  const r = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  stops.forEach(([at, a]) => r.addColorStop(at, `rgba(${rgb},${a})`));
  g.fillStyle = r;
  g.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
};

const MIRROR_VERT = `uniform mat4 textureMatrix; varying vec4 vR; varying vec2 vUv;
void main() { vUv = uv; vR = textureMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

const MIRROR_FRAG = `uniform sampler2D tDiffuse; uniform float uOpacity; varying vec4 vR; varying vec2 vUv;
void main() {
  vec4 r = texture2DProj(tDiffuse, vR);
  float fade = 1.0 - smoothstep(.06, .42, length((vUv - .5) * vec2(1.0, 1.55)));
  gl_FragColor = vec4(r.rgb, r.a * fade * .3 * uOpacity);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

const LINE_VERT = `attribute float aU; attribute float aSeed; varying float vU; varying float vSeed;
void main() { vU = aU; vSeed = aSeed; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

const LINE_FRAG = `uniform float uFlow; uniform float uLevel; uniform vec3 uColor; varying float vU; varying float vSeed;
void main() {
  float p = fract(vU * 5.0 + uFlow + vSeed);
  float pulse = smoothstep(.0, .05, p) * (1.0 - smoothstep(.05, .3, p));
  float edge = smoothstep(0.0, .1, vU) * (1.0 - smoothstep(.85, 1.0, vU));
  float a = (.2 + pulse * .9) * uLevel * edge * .8;
  gl_FragColor = vec4(mix(uColor, vec3(.02), pulse), a);
}`;

const HEIGHT_VERT = `varying float vY; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vY = w.y; gl_Position = projectionMatrix * viewMatrix * w; }`;
const HEIGHT_FRAG = `varying float vY; void main() { gl_FragColor = vec4(clamp(vY / 2.0, 0.0, 1.0), 0.0, 0.0, 1.0); }`;

const PRESSURE_VERT = `varying vec3 vN; varying vec3 vW;
void main() { vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;

const PRESSURE_FRAG = `uniform float uAmount; uniform float uSweep; uniform float uBandMax; uniform vec3 uRed; varying vec3 vN; varying vec3 vW;
vec3 ramp(float t) {
  vec3 c = mix(vec3(.12, .13, .15), vec3(.8, .81, .83), smoothstep(.28, .56, t));
  return mix(c, uRed, smoothstep(.6, .92, t));
}
void main() {
  vec3 n = normalize(vN); if (!gl_FrontFacing) n = -n;
  float p = clamp(.5 + n.x * .55 - max(n.y, 0.) * .32 * smoothstep(.15, 1.2, vW.y), 0., 1.);
  float shown = smoothstep(uSweep - .05, uSweep + .05, vW.x) * (1. - smoothstep(uBandMax - .05, uBandMax + .05, vW.x));
  float edge = (1. - smoothstep(0., .08, abs(vW.x - uSweep))) * step(.01, uAmount);
  float a = uAmount * shown * .9 * smoothstep(.55, .86, p);
  gl_FragColor = vec4(mix(ramp(p), uRed, edge * .55), max(a, edge * .7 * uAmount));
}`;

const CARBON_COMMON = `#include <common>
uniform float uCarbon, uSweepAmt, uSweepX, uBandMax; varying vec3 vCPos; varying vec3 vCNrm; varying float vCWorldX;
vec2 cfWeave(vec2 q) {
  vec2 p = q * 34.0, c = floor(p), f = fract(p);
  bool across = mod(c.x + c.y, 4.0) < 2.0;
  float t = across ? f.y : f.x, along = across ? f.x : f.y;
  float shade = (0.5 + 0.5 * sin(t * 3.14159)) * (0.9 + 0.1 * sin(along * 70.0));
  float aa = clamp(1.0 - length(fwidth(p)) * 1.1, 0.0, 1.0);
  return vec2(mix(0.55, shade, aa), mix(0.32, across ? 0.2 : 0.42, aa));
}`;

const CARBON_COLOR = `#include <color_fragment>
float cfAmt = max(uCarbon, uSweepAmt * smoothstep(uSweepX - .06, uSweepX + .06, vCWorldX) * (1. - smoothstep(uBandMax - .06, uBandMax + .06, vCWorldX)));
vec2 cfV = vec2(0.0);
if (cfAmt > 0.001) {
  vec3 cfN = abs(normalize(vCNrm)); cfN /= (cfN.x + cfN.y + cfN.z);
  cfV = cfWeave(vCPos.yz) * cfN.x + cfWeave(vCPos.xz) * cfN.y + cfWeave(vCPos.xy) * cfN.z;
  diffuseColor.rgb = mix(diffuseColor.rgb, mix(vec3(0.003, 0.0034, 0.004), vec3(0.042, 0.044, 0.048), cfV.x * cfV.x), cfAmt);
}`;

const addCarbon = (mat: THREE.MeshPhysicalMaterial): Carbon => {
  const u: Carbon = { carbon: { value: 0 }, inv: { value: new THREE.Matrix4() }, sweepAmt: { value: 0 }, sweepX: { value: 3 }, bandMax: { value: 99 } };
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uCarbon = u.carbon;
    sh.uniforms.uCarInv = u.inv;
    sh.uniforms.uSweepAmt = u.sweepAmt;
    sh.uniforms.uSweepX = u.sweepX;
    sh.uniforms.uBandMax = u.bandMax;
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nuniform mat4 uCarInv; varying vec3 vCPos; varying vec3 vCNrm; varying float vCWorldX;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nmat4 cfM = uCarInv * modelMatrix; vCPos = (cfM * vec4(position, 1.0)).xyz; vCNrm = normalize(mat3(cfM) * normal); vCWorldX = (modelMatrix * vec4(position, 1.0)).x;");
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", CARBON_COMMON)
      .replace("#include <color_fragment>", CARBON_COLOR)
      .replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, cfV.y, cfAmt);")
      .replace("#include <metalnessmap_fragment>", "#include <metalnessmap_fragment>\nmetalnessFactor = mix(metalnessFactor, 0.12, cfAmt);");
  };
  return u;
};

const toFloat = (attr: THREE.BufferAttribute) => {
  if (attr.array instanceof Float32Array) return attr;
  const a = new Float32Array(attr.count * attr.itemSize);
  for (let i = 0; i < attr.count; i++) for (let k = 0; k < attr.itemSize; k++) a[i * attr.itemSize + k] = attr.getComponent(i, k);
  return new THREE.BufferAttribute(a, attr.itemSize);
};

const rigWheels = (holder: THREE.Group, car: THREE.Object3D, test: RegExp) => {
  holder.updateMatrixWorld(true);
  const inv = holder.matrixWorld.clone().invert();
  const parts: THREE.Mesh[] = [];
  car.traverse((o) => {
    if (!(o as THREE.Mesh).isMesh) return;
    let hit = false;
    let cal = false;
    for (let p: THREE.Object3D | null = o; p && p !== car; p = p.parent) {
      if (test.test(p.name)) hit = true;
      if (/caliper/i.test(p.name)) cal = true;
    }
    if (hit && !cal) parts.push(o as THREE.Mesh);
  });
  const box = new THREE.Box3();
  parts.forEach((m) => box.expandByObject(m));
  const c = box.getCenter(new THREE.Vector3()).applyMatrix4(inv);
  const corners: THREE.Mesh[][] = [[], [], [], []];
  for (const m of parts) {
    const g = new THREE.BufferGeometry();
    for (const a of ["position", "normal", "uv"]) {
      const attr = m.geometry.getAttribute(a) as THREE.BufferAttribute | undefined;
      if (attr) g.setAttribute(a, toFloat(attr));
    }
    g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld));
    const P = g.attributes.position;
    const idx = m.geometry.index ? Array.from(m.geometry.index.array) : Array.from({ length: P.count }, (_, i) => i);
    const quad: number[][] = [[], [], [], []];
    for (let t = 0; t < idx.length; t += 3) {
      const cx = (P.getX(idx[t]) + P.getX(idx[t + 1]) + P.getX(idx[t + 2])) / 3;
      const cz = (P.getZ(idx[t]) + P.getZ(idx[t + 1]) + P.getZ(idx[t + 2])) / 3;
      quad[(cx > c.x ? 0 : 2) + (cz > c.z ? 0 : 1)].push(idx[t], idx[t + 1], idx[t + 2]);
    }
    quad.forEach((q, k) => {
      if (!q.length) return;
      const gq = g.clone();
      gq.setIndex(q);
      corners[k].push(new THREE.Mesh(gq, m.material));
    });
    m.removeFromParent();
  }
  const v = new THREE.Vector3();
  return corners
    .filter((list) => list.length)
    .map((list) => {
      const b = new THREE.Box3();
      list.forEach((mesh) => {
        const P = mesh.geometry.attributes.position as THREE.BufferAttribute;
        const ix = mesh.geometry.index!.array;
        for (let k = 0; k < ix.length; k++) b.expandByPoint(v.fromBufferAttribute(P, ix[k]));
      });
      const centre = b.getCenter(new THREE.Vector3());
      const pivot = new THREE.Group();
      pivot.position.copy(centre);
      holder.add(pivot);
      list.forEach((mesh) => {
        mesh.geometry.translate(-centre.x, -centre.y, -centre.z);
        mesh.castShadow = true;
        pivot.add(mesh);
      });
      return pivot;
    });
};

const smooth = (t: number) => t * t * (3 - 2 * t);
const mixv = (a: Vec, b: Vec, t: number): Vec => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

export default function CarDuoStage({ cars = DEFAULT_CARS, label = "Choose a car", switchAfterIntro = false }: CarDuoStageProps) {
  const { car, lit, swapping } = useCarDuo();
  const [thumbs, setThumbs] = useState<string[]>([]);
  const [introDone, setIntroDone] = useState(false);
  const switchShown = switchAfterIntro ? introDone : lit;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wordRef = useRef<HTMLDivElement>(null);
  const veilRef = useRef<HTMLDivElement>(null);
  const spotRef = useRef<HTMLDivElement>(null);
  const specs = useRef(cars);
  const release = useWebildHold();

  useEffect(() => {
    specs.current = cars;
  });

  useEffect(() => {
    const canvas = canvasRef.current!;
    const word = wordRef.current!;
    const veil = veilRef.current!;
    const spot = spotRef.current!;
    const spotLabel = spot.querySelector("p")!;
    const main = (canvas.closest("main") ?? document.body) as HTMLElement;
    const list = specs.current;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fine = matchMedia("(hover: hover) and (pointer: fine)");
    const d = reduce ? 0 : 1;
    let alive = true;
    let lightsOn = false;
    const tweens: (gsap.core.Tween | gsap.core.Timeline)[] = [];
    const later = (t: gsap.core.Tween | gsap.core.Timeline) => (tweens.push(t), t);
    const fail = () => {
      carDuo.set({ lit: true, failed: true });
      setIntroDone(true);
      veil.style.opacity = "0";
      introSignal.markReady();
      release();
    };

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
    } catch {
      fail();
      return;
    }
    const gl = renderer.getContext();
    const onLost = () => {
      if (!alive) return;
      cancelAnimationFrame(raf);
      raf = 0;
      canvas.style.visibility = "hidden";
      fail();
    };
    canvas.addEventListener("webglcontextlost", onLost);
    const info = gl.getExtension("WEBGL_debug_renderer_info");
    const soft = /swiftshader|llvmpipe|software|basic render/i.test(String(info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)));
    const adapt = { level: 0, ceil: 0, acc: 0, n: 0, min: 99, refresh: 99, windows: 0, good: 0, upAt: -99 };
    const ratio = () => (soft ? 0.5 : Math.max(0.75, Math.min(devicePixelRatio, innerWidth > 1600 ? 1.5 : 2) * LEVELS[adapt.level]));
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(ratio());
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.22;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.shadowMap.autoUpdate = false;

    const scene = new THREE.Scene();
    const room = new RoomEnvironment();
    room.position.y = 0;
    room.traverse((o) => {
      if ((o as THREE.PointLight).isPointLight) (o as THREE.PointLight).intensity = 5;
    });
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(room, 0.04).texture;
    pmrem.dispose();
    room.dispose();
    scene.environment = envTex;
    const env = { v: 0 };
    const camera = new THREE.PerspectiveCamera(30, 1, 0.2, 60);
    const key = new THREE.SpotLight(0xffffff, 0, 16, 0.6, 0.95, 1.2);
    key.position.set(4, 6, 2);
    key.target.position.set(0, 0.4, 0);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.bias = -0.0004;
    key.shadow.radius = 6;
    key.shadow.camera.near = 2;
    key.shadow.camera.far = 14;
    const rim = new THREE.DirectionalLight(0xffffff, 0);
    rim.position.set(-5, 2.5, -3);
    const fill = new THREE.PointLight(0xf1f4f8, 0, 8, 1.6);
    fill.position.set(-2.5, 0.4, 2.6);
    const blade = new THREE.SpotLight(0xffffff, 0, 14, 0.18, 0.9, 1);
    blade.position.set(6, 3.2, 3);
    blade.target.position.set(6, 0, 0);
    scene.add(key, key.target, rim, fill, blade, blade.target);

    const contact = radial("0,0,0", [[0, 0.8], [0.45, 0.42], [0.75, 0.12], [1, 0]]);
    const glowTex = radial("255,255,255", [[0, 1], [0.3, 0.4], [0.7, 0.08], [1, 0]]);
    const poolTex = radial("255,255,255", [[0, 0.9], [0.5, 0.35], [1, 0]]);

    const studio = new THREE.Group();
    scene.add(studio);
    const mirrorU = { color: { value: null }, tDiffuse: { value: null }, textureMatrix: { value: null }, uOpacity: { value: 0 } };
    const mirror = new Reflector(new THREE.PlaneGeometry(14, 9), { clipBias: 0.003, textureWidth: 1024, textureHeight: 1024, color: 0xffffff, shader: { uniforms: mirrorU, vertexShader: MIRROR_VERT, fragmentShader: MIRROR_FRAG } });
    const mirrorMat = mirror.material as THREE.ShaderMaterial;
    mirrorMat.transparent = true;
    mirrorMat.depthWrite = false;
    mirror.rotation.x = -Math.PI / 2;
    mirror.position.y = 0.001;
    const shadowMat = new THREE.ShadowMaterial({ opacity: 0, depthWrite: false });
    const shadowFloor = new THREE.Mesh(new THREE.PlaneGeometry(14, 9), shadowMat);
    shadowFloor.rotation.x = -Math.PI / 2;
    shadowFloor.position.y = 0.002;
    shadowFloor.receiveShadow = true;
    const poolMat = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, opacity: 0, map: poolTex });
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(10, 6), poolMat);
    pool.rotation.x = -Math.PI / 2;
    pool.position.y = 0.0005;
    studio.add(mirror, shadowFloor, pool);

    const red = new THREE.Color(0.784, 0.063, 0.18);
    const lineColor = new THREE.Color(0x3a3d42);
    const fgColor = new THREE.Color();
    const bgColor = new THREE.Color();
    const readTone = () => {
      const css = getComputedStyle(document.documentElement);
      const read = (name: string, into: THREE.Color) => {
        const v = css.getPropertyValue(name).trim();
        if (!v) return false;
        try {
          into.setStyle(v, THREE.LinearSRGBColorSpace);
          return true;
        } catch {
          return false;
        }
      };
      read("--pressure", red);
      if (read("--foreground", fgColor) && read("--background", bgColor)) {
        lineColor.setRGB(fgColor.r + (bgColor.r - fgColor.r) * LINE_MIX[0], fgColor.g + (bgColor.g - fgColor.g) * LINE_MIX[1], fgColor.b + (bgColor.b - fgColor.b) * LINE_MIX[2], THREE.LinearSRGBColorSpace).convertSRGBToLinear();
      }
      busy(0.1);
    };
    const toneObs = new MutationObserver(readTone);
    toneObs.observe(document.documentElement, { attributes: true, attributeFilter: ["style", "class", "data-theme", "data-palette"] });
    const lineMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { uFlow: { value: 0 }, uLevel: { value: 0 }, uColor: { value: lineColor } }, vertexShader: LINE_VERT, fragmentShader: LINE_FRAG });
    const pressureMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
      uniforms: { uAmount: { value: 0 }, uSweep: { value: 3 }, uBandMax: { value: 99 }, uRed: { value: red } },
      vertexShader: PRESSURE_VERT,
      fragmentShader: PRESSURE_FRAG,
    });
    const heightMat = new THREE.ShaderMaterial({ vertexShader: HEIGHT_VERT, fragmentShader: HEIGHT_FRAG });

    let heights: Uint8Array | null = null;
    let lines: THREE.LineSegments | null = null;
    const heightAt = (x: number, z: number) => {
      if (!heights || Math.abs(x) > HM.x || Math.abs(z) > HM.z) return 0;
      const i = Math.floor(((x + HM.x) / (2 * HM.x)) * (HM.w - 1));
      const j = Math.floor(((HM.z - z) / (2 * HM.z)) * (HM.h - 1));
      return (heights[(j * HM.w + i) * 4] / 255) * 2;
    };
    const buildHeightMap = (holder: THREE.Group) => {
      const rt = new THREE.WebGLRenderTarget(HM.w, HM.h);
      const cam = new THREE.OrthographicCamera(-HM.x, HM.x, HM.z, -HM.z, 0.1, 20);
      cam.position.set(0, 10, 0);
      cam.up.set(0, 0, -1);
      cam.lookAt(0, 0, 0);
      const temp = new THREE.Scene();
      temp.background = new THREE.Color(0x000000);
      temp.overrideMaterial = heightMat;
      const parent = holder.parent!;
      const px = holder.position.x;
      const shown = holder.visible;
      holder.position.x = 0;
      holder.visible = true;
      temp.add(holder);
      holder.updateMatrixWorld(true);
      renderer.setRenderTarget(rt);
      renderer.render(temp, cam);
      heights = new Uint8Array(HM.w * HM.h * 4);
      renderer.readRenderTargetPixels(rt, 0, 0, HM.w, HM.h, heights);
      renderer.setRenderTarget(null);
      rt.dispose();
      parent.add(holder);
      holder.position.x = px;
      holder.visible = shown;
    };
    const lineCache = new Map<THREE.Group, THREE.BufferGeometry>();
    const showLines = (holder: THREE.Group) => {
      let g = lineCache.get(holder);
      if (!g) {
        buildHeightMap(holder);
        g = buildLines();
        lineCache.set(holder, g);
      }
      if (lines) lines.geometry = g;
      else {
        lines = new THREE.LineSegments(g, lineMat);
        lines.visible = false;
        scene.add(lines);
      }
    };
    const buildLines = () => {
      const X0 = 7;
      const X1 = -7.5;
      const STEPS = 110;
      const pos: number[] = [];
      const u: number[] = [];
      const seed: number[] = [];
      for (let zi = 0; zi < 15; zi++)
        for (let yi = 0; yi < 6; yi++) {
          const z = -1.5 + zi * (3 / 14);
          const y0 = 0.12 + yi * 0.22 + (zi % 2) * 0.08;
          const s = Math.random();
          const ys: number[] = [];
          for (let k = 0; k <= STEPS; k++) {
            const x = X0 + ((X1 - X0) * k) / STEPS;
            let h = 0;
            for (let dd = -0.9; dd <= 1.5; dd += 0.1) h = Math.max(h, heightAt(x + dd, z) * (dd < 0 ? 1 + dd * 0.5 : 1 - dd * 0.28));
            ys.push(Math.max(y0, h + 0.06 + (h > 0 ? y0 * 0.25 : 0)));
          }
          for (let pass = 0; pass < 3; pass++) for (let k = 1; k < STEPS; k++) ys[k] = (ys[k - 1] + ys[k] * 2 + ys[k + 1]) / 4;
          for (let k = 0; k < STEPS; k++) {
            const xa = X0 + ((X1 - X0) * k) / STEPS;
            const xb = X0 + ((X1 - X0) * (k + 1)) / STEPS;
            pos.push(xa, ys[k], z, xb, ys[k + 1], z);
            u.push(k / STEPS, (k + 1) / STEPS);
            seed.push(s, s);
          }
        }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute("aU", new THREE.Float32BufferAttribute(u, 1));
      g.setAttribute("aSeed", new THREE.Float32BufferAttribute(seed, 1));
      return g;
    };

    const prepare = (spec: CarSpec, gltf: GLTF): Car => {
      const holder = new THREE.Group();
      scene.add(holder);
      const model = gltf.scene;
      model.rotation.y = spec.turn ?? 0;
      holder.add(model);
      model.updateMatrixWorld(true);
      let box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      model.scale.setScalar(spec.length / Math.max(size.x, size.z));
      model.updateMatrixWorld(true);
      box = new THREE.Box3().setFromObject(model);
      const ctr = box.getCenter(new THREE.Vector3());
      model.position.set(-ctr.x, -box.min.y, -ctr.z);
      const paint = new THREE.MeshPhysicalMaterial({ color: new THREE.Color().setStyle(spec.paint.color), metalness: spec.paint.metalness, roughness: spec.paint.roughness, clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: 0 });
      const u = addCarbon(paint);
      u.carbon.value = spec.paint.carbon ? 1 : 0;
      u.bandMax.value = spec.length / 2 + 0.12;
      const tailTest = spec.tail ? new RegExp(spec.tail) : null;
      const tail: Car["tail"] = { mats: [], glow: null };
      holder.updateMatrixWorld(true);
      const inv = holder.matrixWorld.clone().invert();
      const tailBox = new THREE.Box3();
      model.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh) return;
        mesh.castShadow = true;
        const mat = mesh.material as THREE.MeshStandardMaterial;
        if (mat?.name === spec.paintMaterial) mesh.material = paint;
        else if (tailTest && tailTest.test(mat?.name ?? "") && mat.emissive) {
          const lamp = mat.clone();
          lamp.color.copy(TAIL_DARK);
          lamp.map = null;
          lamp.emissive.copy(TAIL_LIT);
          lamp.emissiveMap = null;
          lamp.emissiveIntensity = 0;
          lamp.toneMapped = false;
          mesh.material = lamp;
          tail.mats.push(lamp);
          tailBox.union(new THREE.Box3().setFromObject(mesh).applyMatrix4(inv));
        }
      });
      if (tail.mats.length) {
        const c = tailBox.getCenter(new THREE.Vector3());
        tail.glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xff2a32, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
        tail.glow.position.set(c.x - 0.05, c.y, c.z);
        tail.glow.scale.set((tailBox.max.z - tailBox.min.z) * 1.05, 0.3, 1);
        holder.add(tail.glow);
      }
      const wheels = rigWheels(holder, model, new RegExp(spec.wheels, "i"));
      holder.updateMatrixWorld(true);
      const skins: THREE.Mesh[] = [];
      holder.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (mesh.isMesh && mesh.material && !(mesh.material as THREE.Material).transparent) skins.push(mesh);
      });
      const overlay = skins.map((m) => {
        const twin = new THREE.Mesh(m.geometry, pressureMat);
        twin.renderOrder = 5;
        twin.visible = false;
        m.add(twin);
        return twin;
      });
      const shadow = new THREE.Mesh(new THREE.PlaneGeometry(spec.length * 1.25, 2.6), new THREE.MeshBasicMaterial({ map: contact, transparent: true, depthWrite: false }));
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.y = 0.005;
      const ambient = new THREE.Mesh(new THREE.PlaneGeometry(spec.length * 1.9, 4.4), new THREE.MeshBasicMaterial({ map: contact, transparent: true, opacity: 0.32, depthWrite: false }));
      ambient.rotation.x = -Math.PI / 2;
      ambient.position.y = 0.003;
      holder.add(shadow, ambient);
      return { spec, holder, wheels, paint, u, overlay, tail, tailOn: 0, spin: 0, lastX: 0 };
    };

    const loaded: Car[] = [];
    let sel = 0;
    let busyUntil = 0;
    const busy = (s: number) => {
      busyUntil = Math.max(busyUntil, performance.now() + s * 1000);
    };
    readTone();
    const setAccent = (i: number) => {
      const accent = list[i]?.accent;
      if (accent) main.style.setProperty("--accent", accent);
      else main.style.removeProperty("--accent");
    };

    const pick = (i: number) => {
      if (i === sel || carDuo.get().swapping || loaded.length < 2 || !loaded[i]) return;
      carDuo.set({ swapping: true });
      const out = loaded[sel];
      const inn = loaded[i];
      busy(2.6 * d + 0.4);
      const copy = () => {
        carDuo.set({ car: i });
        setAccent(i);
        main.removeAttribute("data-car-fade");
      };
      if (reduce) copy();
      else {
        main.setAttribute("data-car-fade", "");
        later(gsap.delayedCall(0.35, copy));
      }
      later(gsap.to(out.holder.position, { x: 14, duration: 1.1 * d, ease: "power2.in", onComplete: () => {
        out.holder.visible = false;
        out.holder.position.x = 0;
        out.lastX = 0;
      } }));
      later(gsap.delayedCall(0.75 * d, () => {
        sel = i;
        inn.holder.visible = true;
        inn.holder.position.x = -16;
        inn.lastX = -16;
        showLines(inn.holder);
        later(gsap.to(inn.holder.position, { x: 0, duration: 1.6 * d, ease: "power3.out", onComplete: () => carDuo.set({ swapping: false }) }));
      }));
    };
    const paint = (p: CarPaint) => {
      const l = loaded[sel];
      if (!l) return;
      const c = new THREE.Color().setStyle(p.color);
      busy(1);
      later(gsap.to(l.paint.color, { r: c.r, g: c.g, b: c.b, duration: 0.7 * d }));
      later(gsap.to(l.paint, { metalness: p.metalness, roughness: p.roughness, duration: 0.7 * d }));
      later(gsap.to(l.u.carbon, { value: p.carbon ? 1 : 0, duration: 0.9 * d }));
    };
    carDuo.connect({ pick, paint });
    carDuo.set({ car: 0, swapping: false, lit: false, failed: false, progress: 0, swatch: [] });
    setAccent(0);

    let anchors: Anchor[] = [];
    let readouts: HTMLElement[] = [];
    let steps: HTMLElement[] = [];
    let cards: HTMLElement[] = [];
    const shown = { away: -1, speed: "", df: "", step: -2, part: -2, spot: false, spotText: "", shadow: "" };
    const scan = () => {
      Object.assign(shown, { speed: "", df: "", step: -2, part: -2, spotText: "" });
      anchors = [...main.querySelectorAll<HTMLElement>("[data-car-pose]")]
        .filter((a) => POSES[a.dataset.carPose ?? ""])
        .map((a) => ({ y: a.getBoundingClientRect().top + scrollY, p: POSES[a.dataset.carPose!], label: a.dataset.carLabel ?? "" }))
        .sort((a, b) => a.y - b.y);
      readouts = [...main.querySelectorAll<HTMLElement>("[data-car-readout]")];
      steps = [...main.querySelectorAll<HTMLElement>("[data-car-step]")];
      cards = [...main.querySelectorAll<HTMLElement>("[data-car-part]")];
    };
    let rescanTimer = 0;
    const rescan = () => {
      window.clearTimeout(rescanTimer);
      rescanTimer = window.setTimeout(scan, 150);
    };
    const sizeObs = new ResizeObserver(rescan);
    sizeObs.observe(document.body);
    const mutation = new MutationObserver((records) => {
      if (records.some((r) => r.type === "attributes" || [...r.addedNodes, ...r.removedNodes].some((n) => n.nodeType === 1))) rescan();
    });
    mutation.observe(main, { subtree: true, childList: true, attributes: true, attributeFilter: ["data-car-pose", "data-car-label"] });
    scan();

    const poseAt = (y: number) => {
      const hero = { y: 0, p: POSES.hero, label: "" };
      if (!anchors.length) return { a: hero, b: hero, k: 0 };
      if (y <= anchors[0].y) return { a: anchors[0], b: anchors[0], k: 0 };
      for (let i = 0; i < anchors.length - 1; i++) if (y <= anchors[i + 1].y) return { a: anchors[i], b: anchors[i + 1], k: smooth((y - anchors[i].y) / Math.max(1, anchors[i + 1].y - anchors[i].y)) };
      const l = anchors[anchors.length - 1];
      return { a: l, b: l, k: 0 };
    };

    let vw = 0;
    let vh = 0;
    let applied = 0;
    const resize = () => {
      const r = ratio();
      const small = innerWidth < 880;
      const w = innerWidth;
      const h = small && w === vw ? vh : innerHeight;
      if (w === vw && h === vh && r === applied) return;
      vw = w;
      vh = h;
      applied = r;
      renderer.setPixelRatio(r);
      renderer.setSize(vw, vh, false);
      const m = soft ? 512 : [1024, 768, 512][adapt.level];
      mirror.getRenderTarget().setSize(m, m);
      camera.aspect = vw / vh;
      camera.updateProjectionMatrix();
    };
    resize();
    addEventListener("resize", resize);

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
      const slow = Math.min(18, adapt.refresh * 1.35);
      if (avg > slow && adapt.level < LEVELS.length - 1) {
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

    const makeThumbs = () => {
      let r: THREE.WebGLRenderer;
      try {
        r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
      } catch {
        return [];
      }
      r.setPixelRatio(2);
      r.setSize(152, 76, false);
      r.toneMapping = THREE.ACESFilmicToneMapping;
      const s = new THREE.Scene();
      const thumbRoom = new RoomEnvironment();
      thumbRoom.position.y = 0;
      thumbRoom.traverse((o) => {
        if ((o as THREE.PointLight).isPointLight) (o as THREE.PointLight).intensity = 5;
      });
      const thumbPmrem = new THREE.PMREMGenerator(r);
      const thumbEnv = thumbPmrem.fromScene(thumbRoom, 0.04).texture;
      thumbPmrem.dispose();
      thumbRoom.dispose();
      s.environment = thumbEnv;
      const sun = new THREE.DirectionalLight(0xffffff, 2);
      sun.position.set(3, 5, 4);
      s.add(sun);
      const cam = new THREE.PerspectiveCamera(20, 2, 0.1, 60);
      cam.position.set(3.4, 0.95, 9.2);
      cam.lookAt(0, 0.6, 0);
      const out = loaded.map((l) => {
        const keep = { v: l.holder.visible, x: l.holder.position.x, r: l.holder.rotation.y, e: l.paint.envMapIntensity };
        l.holder.visible = true;
        l.holder.position.x = 0;
        l.holder.rotation.y = 0;
        l.paint.envMapIntensity = 1.2;
        s.add(l.holder);
        r.render(s, cam);
        const url = r.domElement.toDataURL("image/png");
        scene.add(l.holder);
        l.holder.visible = keep.v;
        l.holder.position.x = keep.x;
        l.holder.rotation.y = keep.r;
        l.paint.envMapIntensity = keep.e;
        return url;
      });
      thumbEnv.dispose();
      r.dispose();
      r.forceContextLoss();
      return out;
    };

    let lit = false;
    const lights = () => {
      if (lightsOn || !alive) return;
      lightsOn = true;
      busy(4.6 * d + 0.5);
      const tl = gsap.timeline({ onComplete: () => alive && setIntroDone(true) });
      later(tl);
      tl.to(veil, { opacity: 0, duration: 2.2 * d, ease: "power2.inOut" }, 1.3 * d);
      tl.call(() => {
        lit = true;
        carDuo.set({ lit: true });
        release();
      }, [], 1.7 * d);
      tl.to(blade, { intensity: 220, duration: 0.6 * d }, 0.4);
      tl.fromTo(blade.target.position, { x: 4 }, { x: -4, duration: 2.2 * d, ease: "power2.inOut" }, 0.4);
      tl.fromTo(blade.position, { x: 5 }, { x: -3, duration: 2.2 * d, ease: "power2.inOut" }, 0.4);
      tl.to(blade, { intensity: 0, duration: 0.8 * d }, 2.4 * d);
      tl.to(key, { intensity: 38, duration: 1.8 * d, ease: "power2.out" }, 1.6 * d);
      tl.to(rim, { intensity: 2.2, duration: 1.8 * d }, 1.4 * d);
      tl.to(fill, { intensity: 6, duration: 2 * d }, 1.8 * d);
      tl.fromTo(env, { v: 0 }, { v: 1, duration: 2.4 * d }, 1.2 * d);
      tl.fromTo(renderer, { toneMappingExposure: 0.22 }, { toneMappingExposure: 1, duration: 2.6 * d, ease: "power2.inOut" }, 1.0 * d);
      tl.time(LIGHTS_HEAD_START * d);
    };

    let offReveal = () => {};
    const gltfLoader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    const prog = list.map(() => 0);
    Promise.all(
      list.map(
        (spec, i) =>
          new Promise<GLTF>((ok, no) =>
            gltfLoader.load(
              localModelSrc(localMediaSrc(spec.src)),
              ok,
              (e) => {
                if (!e.total) return;
                prog[i] = e.loaded / e.total;
                const next = Math.floor((prog.reduce((a, b) => a + b, 0) / prog.length) * 40) / 40;
                if (next !== carDuo.get().progress) carDuo.set({ progress: next });
              },
              no,
            ),
          ),
      ),
    )
      .then(async (gltfs) => {
        if (!alive) return;
        gltfs.forEach((g, i) => loaded.push(prepare(list[i], g)));
        pressureMat.uniforms.uBandMax.value = Math.max(...list.map((c) => c.length)) / 2 + 0.12;
        carDuo.set({ progress: 1 });
        loaded.slice(1).forEach((l) => {
          buildHeightMap(l.holder);
          lineCache.set(l.holder, buildLines());
        });
        showLines(loaded[0].holder);
        camera.position.set(...POSES.hero.pos);
        camera.lookAt(0, 0.55, 0);
        studio.visible = true;
        lines!.visible = true;
        loaded.forEach((l) => {
          l.holder.visible = true;
          l.overlay.forEach((o) => (o.visible = true));
          if (l.tail.glow) l.tail.glow.material.opacity = 0.01;
        });
        await renderer.compileAsync(scene, camera);
        if (!alive || gl.isContextLost()) return;
        setThumbs(makeThumbs());
        renderer.shadowMap.needsUpdate = true;
        renderer.render(scene, camera);
        studio.visible = false;
        lines!.visible = false;
        loaded.forEach((l, i) => {
          l.holder.visible = i === 0;
          l.overlay.forEach((o) => (o.visible = false));
          if (l.tail.glow) l.tail.glow.material.opacity = 0;
        });
        scan();
        introSignal.markReady();
        if (introSignal.isClaimed()) offReveal = introSignal.onReveal(lights);
        else lights();
      })
      .catch((error) => {
        console.error("CarDuoStage: could not load the cars", error);
        if (alive) fail();
      });

    let tmx = 0;
    let tmy = 0;
    const onPointer = (e: PointerEvent) => {
      if (!fine.matches || e.pointerType !== "mouse") return;
      tmx = (e.clientX / innerWidth) * 2 - 1;
      tmy = (e.clientY / innerHeight) * 2 - 1;
    };
    addEventListener("pointermove", onPointer, { passive: true });

    const cam = new THREE.Vector3();
    const tgt = new THREE.Vector3();
    const curT = new THREE.Vector3(0, 0.55, 0);
    const camLocal = new THREE.Vector3();
    const proj = new THREE.Vector3();
    camera.position.set(...POSES.hero.pos);
    const st = { fov: 30, aero: 0, air: 0, floor: 0, sweep: 3, wind: 0, spin: 0, mx: 0, my: 0, flow: 0 };
    let raf = 0;
    let last = performance.now();
    let rendered = false;
    let rested = false;

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const ms = now - last;
      const dt = Math.min(ms / 1000, 0.05);
      last = now;
      const f = (r: number) => 1 - Math.pow(1 - r, dt * 60);
      resize();
      let change = 0;
      const ease = (from: number, to: number, r: number) => {
        const next = from + (to - from) * f(r);
        change += Math.abs(next - from);
        return next;
      };
      st.mx = ease(st.mx, tmx, 0.04);
      st.my = ease(st.my, tmy, 0.04);
      const { a, b, k } = poseAt(scrollY + innerHeight * 0.5);
      const A = a.p;
      const B = b.p;
      const target = (name: PoseKey, fallback: number) => (A[name] ?? fallback) + ((B[name] ?? fallback) - (A[name] ?? fallback)) * k;
      const narrow = vw / vh < 1 ? 1 + (1 - vw / vh) * 1.1 : 1;
      cam.set(...mixv(A.pos, B.pos, k)).multiplyScalar(narrow);
      tgt.set(...mixv(A.tgt, B.tgt, k));
      cam.x += st.mx * 0.35;
      cam.y -= st.my * 0.15;
      change += camera.position.distanceTo(cam) * f(0.08) + curT.distanceTo(tgt) * f(0.08);
      camera.position.lerp(cam, f(0.08));
      curT.lerp(tgt, f(0.08));
      camera.lookAt(curT);
      const fov = ease(st.fov, target("fov", 30), 0.08);
      if (fov !== st.fov) {
        st.fov = fov;
        camera.fov = fov;
        camera.updateProjectionMatrix();
      }
      const on = lit ? 1 : 0;
      st.aero = ease(st.aero, target("aero", 0), 0.07);
      st.air = ease(st.air, target("air", 0) * on, 0.035);
      st.sweep = ease(st.sweep, target("sweep", 3), 0.07);
      st.wind = ease(st.wind, target("wind", 0), 0.07);
      st.floor = ease(st.floor, target("floor", 0) * on, 0.042);
      pressureMat.uniforms.uAmount.value = st.aero;
      pressureMat.uniforms.uSweep.value = st.sweep;
      st.flow += (0.05 + st.wind * 1.8) * dt;
      lineMat.uniforms.uFlow.value = st.flow;
      lineMat.uniforms.uLevel.value = Math.max(st.aero, st.air) * (0.35 + st.wind * 0.65);
      const flowing = st.aero > 0.01 || st.air > 0.01;
      if (lines) lines.visible = flowing;
      mirrorMat.uniforms.uOpacity.value = st.floor;
      shadowMat.opacity = 0.28 * st.floor;
      poolMat.opacity = 0.55 * st.floor;
      studio.visible = st.floor > 0.01;

      const away = Math.round(Math.min(scrollY / (innerHeight * 0.9), 1) * 1000) / 1000;
      if (away !== shown.away) {
        shown.away = away;
        word.style.opacity = String(1 - away);
        word.style.transform = `translate3d(0, ${-away * 12}vh, 0)`;
      }

      const l = loaded[sel];
      if (l) {
        st.spin = ease(st.spin, target("spin", 0) * Math.PI * 2 * 0.9, 0.08);
        l.holder.rotation.y = st.spin;
        if (l.tail.mats.length && l.tail.glow) {
          l.holder.updateMatrixWorld();
          camLocal.copy(camera.position);
          l.holder.worldToLocal(camLocal);
          const behind = Math.min(1, Math.max(0, (-camLocal.x - 0.8) / 2.4)) * on;
          const next = l.tailOn + (behind - l.tailOn) * Math.min(1, dt * 12);
          change += Math.abs(next - l.tailOn);
          l.tailOn = next;
          for (const m of l.tail.mats) m.emissiveIntensity = l.tailOn * 3.2;
          l.tail.glow.material.opacity = l.tailOn * 0.22;
        }
        for (const o of l.overlay) o.visible = st.aero > 0.01;
        l.spin -= st.wind * st.aero * 40 * dt;
      }
      let shadowKey = "";
      for (const L of loaded) {
        L.paint.envMapIntensity = 1.2 * env.v;
        if (!L.holder.visible) continue;
        const travel = L.holder.position.x;
        L.spin -= (travel - L.lastX) / WHEEL_R;
        L.lastX = travel;
        for (const p of L.wheels) p.rotation.z = L.spin;
        if (L !== l) L.holder.rotation.y = 0;
        L.holder.updateMatrixWorld();
        L.u.inv.value.copy(L.holder.matrixWorld).invert();
        L.u.sweepAmt.value = st.aero;
        L.u.sweepX.value = st.sweep;
        shadowKey += `${travel.toFixed(3)}:${L.holder.rotation.y.toFixed(3)}:${L.spin.toFixed(2)};`;
      }
      if (studio.visible && shadowKey !== shown.shadow) {
        shown.shadow = shadowKey;
        renderer.shadowMap.needsUpdate = true;
      }
      if (!studio.visible) shown.shadow = "";

      const spec = list[sel];
      if (spec) {
        const speed = String(Math.round(st.wind * st.aero * spec.topSpeed));
        const df = String(Math.round(spec.downforce * Math.pow(Number(speed) / spec.topSpeed, 2)));
        if (speed !== shown.speed || df !== shown.df) {
          shown.speed = speed;
          shown.df = df;
          readouts.forEach((el) => (el.textContent = el.dataset.carReadout === "downforce" ? df : speed));
        }
      }
      const stepNow = st.aero > 0.5 ? Math.round(target("step", 0)) : -1;
      if (stepNow !== shown.step) {
        shown.step = stepNow;
        steps.forEach((el) => el.toggleAttribute("data-on", Number(el.dataset.carStep) === stepNow));
      }
      const part = k < 0.5 ? (A.part ?? -1) : (B.part ?? -1);
      if (part !== shown.part) {
        shown.part = part;
        cards.forEach((el) => el.toggleAttribute("data-on", Number(el.dataset.carPart) === part));
      }
      let spotOn = false;
      if (part >= 0 && l && spec) {
        const front = l.wheels.reduce((m, p) => (p.position.x > m.position.x || (p.position.x === m.position.x && p.position.z > m.position.z) ? p : m), l.wheels[0]);
        const pts: Vec[] = [front ? (front.position.toArray() as Vec) : [1.3, 0.35, 0.8], spec.engine, spec.cockpit];
        const point = pts[Math.min(part, pts.length - 1)];
        proj.set(...point).applyMatrix4(l.holder.matrixWorld).project(camera);
        spot.style.transform = `translate3d(${((proj.x * 0.5 + 0.5) * innerWidth).toFixed(1)}px, ${((-proj.y * 0.5 + 0.5) * innerHeight).toFixed(1)}px, 0)`;
        const text = (k < 0.5 ? a.label : b.label) || "";
        if (text !== shown.spotText) {
          shown.spotText = text;
          spotLabel.textContent = text;
        }
        spotOn = Math.abs(k - (k < 0.5 ? 0 : 1)) < 0.3 && !!text;
      }
      if (spotOn !== shown.spot) {
        shown.spot = spotOn;
        spot.toggleAttribute("data-on", spotOn);
      }

      if (!loaded.length) return;
      const idle = change < 1e-4 && !flowing && performance.now() > busyUntil && !carDuo.get().swapping;
      if (idle && rested) {
        rendered = false;
        return;
      }
      if (rendered) measure(ms);
      renderer.render(scene, camera);
      rendered = true;
      rested = idle;
    };

    const start = () => {
      if (raf || document.hidden || gl.isContextLost()) return;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };
    const onVisible = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
        raf = 0;
      } else start();
    };
    document.addEventListener("visibilitychange", onVisible);
    start();

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      window.clearTimeout(rescanTimer);
      document.removeEventListener("visibilitychange", onVisible);
      removeEventListener("resize", resize);
      removeEventListener("pointermove", onPointer);
      sizeObs.disconnect();
      mutation.disconnect();
      toneObs.disconnect();
      offReveal();
      tweens.forEach((t) => t.kill());
      carDuo.connect(null);
      main.removeAttribute("data-car-fade");
      main.style.removeProperty("--accent");
      scene.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh && !(o as THREE.LineSegments).isLineSegments) return;
        mesh.geometry?.dispose();
        (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach((m) => m?.dispose());
      });
      canvas.removeEventListener("webglcontextlost", onLost);
      lineCache.forEach((g) => g.dispose());
      mirror.dispose();
      [contact, glowTex, poolTex, envTex].forEach((t) => t.dispose());
      [lineMat, pressureMat, heightMat].forEach((m) => m.dispose());
      renderer.dispose();
      release();
    };
  }, [release]);

  return (
    <>
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute inset-0 bg-background [background-image:var(--stage-backdrop)]" />
        <div ref={wordRef} className="absolute inset-0 grid place-items-center pb-[44vh] will-change-transform lg:pb-[14vh]">
          <p data-car-copy className="whitespace-nowrap text-[length:clamp(10.625rem,36vw,38.75rem)] font-light leading-none tracking-[-0.05em] text-foreground [font-family:var(--font-heading)] [font-stretch:125%] [font-weight:var(--heading-weight)]">{cars[car]?.code}</p>
        </div>
        <div ref={veilRef} className="absolute inset-0 bg-deep" />
        <canvas ref={canvasRef} className="absolute inset-0 block size-full" />
      </div>
      <div ref={spotRef} aria-hidden="true" className="pointer-events-none fixed left-0 top-0 z-[2] opacity-0 transition-opacity duration-500 data-[on]:opacity-100">
        <div className="absolute -left-[10px] -top-[10px] size-[20px] rounded-full border border-white bg-black/35 backdrop-blur-[4px]">
          <div className="absolute inset-[6px] rounded-full bg-white" />
          <div className="absolute -inset-[10px] rounded-full border border-white/80 motion-safe:animate-[car-ping_2.2s_infinite]" />
        </div>
        <p className="absolute left-[22px] top-[-14px] whitespace-nowrap rounded-[var(--radius-button)] border border-border bg-card/62 px-[0.75rem] py-[0.375rem] text-[length:0.6875rem] font-medium leading-[normal] text-foreground backdrop-blur-[12px]" />
      </div>
      <div
        role="group"
        aria-label={label}
        className={`fixed bottom-[0.875rem] left-1/2 z-[45] flex -translate-x-1/2 gap-[4px] rounded-full border border-border bg-card/62 p-[5px] shadow-[0_10px_30px_rgb(0_0_0/0.08)] backdrop-blur-[16px] transition-opacity duration-[1200ms] lg:bottom-[1.375rem] ${switchShown ? "opacity-100" : "pointer-events-none opacity-0"}`}
      >
        {cars.map((spec, i) => (
          <button
            key={spec.code + i}
            type="button"
            aria-pressed={car === i}
            disabled={swapping}
            onClick={() => carDuo.pick(i)}
            className="flex cursor-pointer items-center gap-[8px] rounded-full py-[4px] pl-[4px] pr-[14px] text-[length:var(--text-label)] font-medium text-muted-foreground transition-colors duration-300 hover:text-foreground disabled:cursor-wait aria-pressed:bg-primary aria-pressed:text-primary-foreground lg:gap-[12px] lg:py-[5px] lg:pl-[5px] lg:pr-[20px] lg:text-[length:var(--text-small)]"
          >
            {thumbs[i] ? (
              <img src={thumbs[i]} alt="" loading="lazy" decoding="async" className="h-[28px] w-[54px] shrink-0 rounded-full bg-white/92 object-contain lg:h-[38px] lg:w-[76px]" />
            ) : (
              <div className="h-[28px] w-[54px] shrink-0 rounded-full bg-white/92 lg:h-[38px] lg:w-[76px]" />
            )}
            <p className="leading-[normal]">{spec.name}</p>
          </button>
        ))}
      </div>
    </>
  );
}

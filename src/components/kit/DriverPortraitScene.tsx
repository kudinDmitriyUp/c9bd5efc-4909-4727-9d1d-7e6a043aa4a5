"use client";

import { useEffect, useRef } from "react";
import type { MotionValue } from "motion/react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { HDRLoader } from "three/examples/jsm/loaders/HDRLoader.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { twMerge } from "tailwind-merge";
import { CONTOUR_FIELD_GLSL } from "@/components/kit/ContourField";
import { readCssColor, watchPalette } from "@/components/kit/cssColor";
import { frameBudget } from "@/components/kit/frameBudget";
import { introSignal } from "@/components/kit/introSignal";
import { localMediaSrc } from "@/components/kit/mediaSrc";
import { holdWebildReady } from "@/components/kit/webildReady";

export const DRACO_DECODERS = "https://www.gstatic.com/draco/versioned/decoders/1.5.5/";

export type DriverPortraitMaps = { diffuse: string; depth: string; alpha: string; normal: string };

type DriverPortraitSceneProps = {
  maps: DriverPortraitMaps;
  helmetSrc?: string;
  noiseSrc: string;
  environmentSrc: string;
  zoom?: MotionValue<number>;
  onFailed?: () => void;
  className?: string;
};

type Tier = { name: string; mobile: boolean; coarse: boolean; maxDpr: number; frameInterval: number; pointer: boolean; antialias: boolean; samples: number; outline: boolean; reveal: boolean; freeze: boolean };
type Vec = { x: number; y: number };
type Uniforms = Record<string, THREE.IUniform>;

const HEAD_HEIGHT = 5.4;
const HEAD_EXTEND = 0.14;
const DEG = Math.PI / 180;
const CAMERA_FOV = 35;
const CAMERA_Y = 0.1;
const BACKDROP_Z = -3;
const OUTLINE_WAVES = 8;
const REFERENCE_ASPECT = 1.778;
const STATIC_POSE: Vec = { x: 0.3, y: 0.1 };
const SWEEP_PATH: Vec[] = [
  { x: -0.85, y: -0.62 },
  { x: 0.78, y: -0.2 },
  { x: -0.7, y: 0.2 },
  { x: 0.82, y: 0.6 },
];
const WORN_OFFSET = new THREE.Vector3(0, -0.56, 0.35);

const PARAMS = {
  cameraZ: 6.5,
  subjectScale: 1.15,
  subjectY: 0.42,
  subjectParallax: 0.02,
  riseDistance: 200,
  riseDuration: 2,
  headScale: 0.8,
  headY: 0.58,
  headParallax: 0.005,
  headRelight: 0.32,
  helmetScale: 0.62,
  helmetY: 0.45,
  helmetFollow: 0.01,
  helmetAmpX: 2.5,
  helmetAmpY: 2.1,
  trailRadius: 0.46,
  trailIdleScale: 0.28,
  trailTaper: 1.9,
  trailTaperIdle: 1.6,
  trailTaperFast: 1.25,
  trailLength: 0.64,
  revealThreshold: 0.08,
  revealEdge: 0.005,
  revealWarp: 1.29,
  revealWarpScale: 2.9,
  revealSpeed: 1.25,
  pointerLerp: 0.17,
  pacePeak: 0.029,
  paceAttack: 0.09,
  paceRelease: 0.205,
  paceThreshold: 0.06,
  paceRamp: 0.15,
  outlinePeriod: 3.1,
  outlineStagger: 1.2,
  outlineOpacity: 0.09,
  outlineWidth: 0.15,
  outlineLightness: 0.64,
  sweepWarp: 0.86,
  sweepLength: 0.67,
  sweepRadius: 0.33,
  bgLineOpacity: 0.85,
  bgRevealOpacity: 1,
  introDuration: 4,
  burnStart: 0.14,
  autoSweepAmount: 0,
  autoSweepPeriod: 5,
  autoSweepStroke: 0.45,
};
type Params = typeof PARAMS;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (a: number, b: number, v: number) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};

const sceneTier = (): Tier => {
  const coarse = matchMedia("(hover: none) and (pointer: coarse)").matches;
  const width = innerWidth;
  const name = width < 768 || (coarse && width < 1024) ? "mobile" : coarse || width < 1280 ? "tablet" : "desktop";
  const mobile = name === "mobile";
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const nav = navigator as Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number };
  const saver = Boolean(nav.connection?.saveData) || (nav.deviceMemory ?? 8) <= 2;
  return {
    name,
    mobile,
    coarse,
    maxDpr: mobile ? 2 : name === "tablet" ? 1.5 : 1.5,
    frameInterval: name === "desktop" ? 0 : 1000 / 60 - 2,
    pointer: !coarse && !reduced,
    antialias: name === "desktop",
    samples: mobile ? 28 : name === "tablet" ? 44 : 72,
    outline: true,
    reveal: !mobile,
    freeze: reduced || (mobile && saver),
  };
};

const fitBox = (width: number, height: number) => {
  if (width >= 880) return null;
  if (width >= 640) return { top: height * 0.3, height: height * 0.7 };
  return { top: height * 0.36, height: height * 0.64 };
};

const GRADE_GLSL = `
uniform float uGrey;
uniform float uDim;
uniform vec3 uLift;
uniform float uLiftMix;
vec3 sceneGrade(vec3 c) {
  c = mix(c, vec3(dot(c, vec3(0.2126, 0.7152, 0.0722))), uGrey);
  c = mix(c, max(c, uLift), uLiftMix);
  return c * uDim;
}
`;

const trailFunction = (name: string, trail: string, min: string, max: string, pace: string, warp: string, length: string, radius: string, samples: number) => `
float ${name}(vec2 ndc) {
  float gate = smoothstep(uGateStart, uGateStart + uGateWidth, ${pace});
  if (gate <= 0.0) return 0.0;
  vec2 bounded = vec2(ndc.x * uAspect, ndc.y);
  if (any(lessThan(bounded, ${min})) || any(greaterThan(bounded, ${max}))) return 0.0;
  vec2 point = bounded;
  if (${warp} > 0.001) {
    vec2 noiseUv = ndc * 0.5 + 0.5;
    float nx = texture2D(uNoiseTex, noiseUv * uWarpScale + vec2(uTime * 0.07, uTime * 0.05)).r;
    float ny = texture2D(uNoiseTex, noiseUv * uWarpScale * 1.4 - vec2(uTime * 0.06, uTime * 0.09)).r;
    point += (vec2(nx, ny) - 0.5) * ${warp} * 0.22;
  }
  float radius = ${radius} * mix(uIdleScale, 1.0, ${pace});
  float taper = uTaper * mix(uTaperIdle, uTaperFast, ${pace});
  float span = max(${length} * float(${samples} - 1), 1.0);
  float ceiling = uThreshold + uEdge;
  float trail = 0.0;
  for (int i = 0; i < ${samples} - 1; i++) {
    if (float(i) >= span) break;
    float weight = pow(1.0 - float(i) / span, taper);
    if (weight <= trail) break;
    vec2 a = vec2(${trail}[i].x * uAspect, ${trail}[i].y);
    vec2 b = vec2(${trail}[i + 1].x * uAspect, ${trail}[i + 1].y);
    float r = radius * weight;
    trail = max(trail, weight * smoothstep(r, r * 0.35, revealSegment(point, a, b)));
    if (trail >= ceiling) break;
  }
  return smoothstep(uThreshold - uEdge, uThreshold + uEdge, trail) * gate;
}
`;

const revealGlsl = (samples: number) => `
uniform vec2 uTrail[${samples}];
uniform vec2 uTrailMin;
uniform vec2 uTrailMax;
uniform float uPace;
uniform vec2 uSweep[${samples}];
uniform vec2 uSweepMin;
uniform vec2 uSweepMax;
uniform float uSweepPace;
uniform float uSweepWarp;
uniform float uSweepLength;
uniform float uSweepRadius;
uniform float uAspect;
uniform float uRadius;
uniform float uIdleScale;
uniform float uTaper;
uniform float uTaperIdle;
uniform float uTaperFast;
uniform float uLength;
uniform float uGateStart;
uniform float uGateWidth;
uniform float uWarpScale;
uniform float uTime;
uniform float uEdge;
uniform float uThreshold;
uniform float uWarp;
uniform float uRevealMix;
uniform sampler2D uNoiseTex;
float revealSegment(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);
  return length(pa - ba * h);
}
${trailFunction("revealCursorTrail", "uTrail", "uTrailMin", "uTrailMax", "uPace", "uWarp", "uLength", "uRadius", samples)}
${trailFunction("revealSweepTrail", "uSweep", "uSweepMin", "uSweepMax", "uSweepPace", "uSweepWarp", "uSweepLength", "uSweepRadius", samples)}
float revealTrail(vec2 ndc) {
  float cursor = revealCursorTrail(ndc);
  if (cursor >= 1.0) return 1.0;
  return max(cursor, revealSweepTrail(ndc));
}
`;

const OUTLINE_VERT = `
varying float vHeight;
uniform float uMinY;
uniform float uRangeY;
void main() {
  vHeight = (position.y - uMinY) / max(uRangeY, 0.0001);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const OUTLINE_FRAG = `
varying float vHeight;
uniform float uTime;
uniform float uPeriod;
uniform float uStagger;
uniform float uOpacity;
uniform float uWidth;
uniform float uLightness;
uniform float uRevealMix;
uniform vec3 uColor;
${GRADE_GLSL}
void main() {
  float width = max(uWidth, 0.0001);
  float period = max(uPeriod, 0.0001);
  float stagger = max(uStagger, 0.0001);
  float start = 1.0 + width * 3.0;
  float travel = 1.0 + width * 6.0;
  float wave = 0.0;
  for (int i = 0; i < ${OUTLINE_WAVES}; i++) {
    float age = mod(uTime, stagger) + float(i) * stagger;
    if (age > period) break;
    float centre = start - (age / period) * travel;
    float d = (vHeight - centre) / width;
    wave = max(wave, exp(-d * d));
  }
  vec3 stroke = mix(uColor, vec3(1.0), uLightness);
  gl_FragColor = vec4(sceneGrade(stroke), wave * uOpacity * uRevealMix);
}`;

const BACKDROP_VERT = `
varying vec4 vClip;
void main() {
  vec4 clip = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  vClip = clip;
  gl_Position = clip;
}`;

const backdropFrag = (samples: number) => `
varying vec4 vClip;
uniform vec3 uBackground;
uniform vec3 uLineColor;
uniform vec3 uRevealColor;
uniform vec3 uRevealColorAlt;
uniform float uLineOpacity;
uniform float uRevealOpacity;
${revealGlsl(samples)}
${CONTOUR_FIELD_GLSL}
${GRADE_GLSL}
void main() {
  vec2 ndc = vClip.xy / vClip.w;
  float level;
  float line = contourLines(ndc, uAspect, uTime * 0.28, 3.8, 2.5, 0.18, 1.15, level);
  vec3 color = mix(uBackground, uLineColor, line * uLineOpacity * uRevealMix);
  vec3 shade = mix(uRevealColor, uRevealColorAlt, mod(floor(level + 0.5), 2.0));
  if (uRevealOpacity > 0.001) color = mix(color, shade, revealTrail(ndc) * uRevealMix * uRevealOpacity);
  gl_FragColor = vec4(color, 1.0);
  #include <colorspace_fragment>
  gl_FragColor.rgb = sceneGrade(gl_FragColor.rgb);
}`;

const HEAD_VERT = `
uniform float uExtend;
varying vec2 vUv;
void main() {
  vUv = vec2(uv.x, 1.0 - (1.0 - uv.y) * (1.0 + uExtend));
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const HEAD_FRAG = `
uniform sampler2D uDiffuse;
uniform sampler2D uDepth;
uniform sampler2D uAlpha;
uniform sampler2D uNormal;
uniform vec2 uParallax;
uniform float uReveal;
uniform float uDepthScale;
uniform float uRelight;
varying vec2 vUv;
${GRADE_GLSL}
void main() {
  float depth = texture2D(uDepth, vUv).r;
  vec2 uv = vUv + uParallax * (depth - 0.5) * uDepthScale;
  vec4 color = texture2D(uDiffuse, uv);
  float alpha = texture2D(uAlpha, uv).r;
  vec3 normal = normalize(texture2D(uNormal, uv).rgb * 2.0 - 1.0);
  vec3 lightDir = normalize(vec3(uParallax * 1.6, 1.0));
  float lambert = max(dot(normal, lightDir), 0.0) - 0.72;
  gl_FragColor = vec4(clamp(color.rgb * (1.0 + lambert * uRelight), 0.0, 1.0), alpha * uReveal);
  #include <colorspace_fragment>
  gl_FragColor.rgb = sceneGrade(gl_FragColor.rgb);
}`;

export default function DriverPortraitScene({ maps, helmetSrc, noiseSrc, environmentSrc, zoom, onFailed, className }: DriverPortraitSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const zoomRef = useRef(zoom);
  const failRef = useRef(onFailed);

  useEffect(() => {
    zoomRef.current = zoom;
    failRef.current = onFailed;
  });

  useEffect(() => {
    const canvas = canvasRef.current!;
    const box = canvas.parentElement!;
    const gate = canvas.closest("section") ?? box;
    let disposed = false;
    const release = holdWebildReady();
    const fail = () => {
      if (disposed) return;
      release();
      introSignal.markReady();
      failRef.current?.();
    };
    let renderer: THREE.WebGLRenderer;
    let tier = sceneTier();
    try {
      renderer = new THREE.WebGLRenderer({ canvas, alpha: false, antialias: tier.antialias, stencil: false, powerPreference: tier.mobile ? "default" : "high-performance" });
    } catch {
      fail();
      return;
    }
    const budget = frameBudget();
    canvas.addEventListener("webglcontextlost", fail);
    const watchdog = window.setTimeout(() => {
      if (!st.ready) fail();
    }, 20000);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(CAMERA_FOV, 1, 0.1, 50);
    camera.position.set(0, CAMERA_Y, PARAMS.cameraZ);
    const subject = new THREE.Group();
    const helmetGroup = new THREE.Group();
    const pivot = new THREE.Group();
    helmetGroup.add(pivot);
    subject.add(helmetGroup);
    scene.add(subject);

    const p: Params = { ...PARAMS };
    const samples = tier.samples;
    const trail = Array.from({ length: samples }, () => new THREE.Vector2(STATIC_POSE.x, -STATIC_POSE.y));
    const sweepTrail = Array.from({ length: samples }, () => new THREE.Vector2(SWEEP_PATH[0].x, -SWEEP_PATH[0].y));
    const swing = (v: number, amp: number) => amp * DEG * v;
    const st = {
      pointer: { ...STATIC_POSE },
      smoothed: { ...STATIC_POSE },
      last: { ...STATIC_POSE },
      seen: false,
      tilt: swing(STATIC_POSE.y, PARAMS.helmetAmpX),
      yaw: swing(STATIC_POSE.x, PARAMS.helmetAmpY),
      pace: 0,
      sweep: { ...SWEEP_PATH[0] },
      sweepSmoothed: { ...SWEEP_PATH[0] },
      sweepLast: { ...SWEEP_PATH[0] },
      sweepPace: 0,
      sweepCycle: 0,
      readyAt: -1,
      intro: 0,
      riseAt: -1,
      rising: false,
      ready: false,
      settled: false,
      start: -1,
      width: 1,
      height: 1,
      aspect: 1,
      zoom: -1,
    };
    const park = () => {
      st.pointer = { ...STATIC_POSE };
      st.smoothed = { ...STATIC_POSE };
      st.last = { ...STATIC_POSE };
      st.tilt = swing(STATIC_POSE.y, p.helmetAmpX);
      st.yaw = swing(STATIC_POSE.x, p.helmetAmpY);
      st.seen = false;
    };
    if (!tier.pointer) park();

    const grade: Uniforms = { uGrey: { value: 0 }, uDim: { value: 1 }, uLift: { value: new THREE.Vector3() }, uLiftMix: { value: 0 } };
    const V2 = (x: number, y: number) => new THREE.Vector2(x, y);
    const reveal: Uniforms = {
      uTrail: { value: trail },
      uTrailMin: { value: V2(-1e3, -1e3) },
      uTrailMax: { value: V2(1e3, 1e3) },
      uSweep: { value: sweepTrail },
      uSweepMin: { value: V2(-1e3, -1e3) },
      uSweepMax: { value: V2(1e3, 1e3) },
      uSweepPace: { value: 0 },
      uSweepWarp: { value: p.sweepWarp },
      uSweepLength: { value: p.sweepLength },
      uSweepRadius: { value: p.sweepRadius },
      uAspect: { value: 1 },
      uRadius: { value: p.trailRadius },
      uIdleScale: { value: p.trailIdleScale },
      uTaper: { value: p.trailTaper },
      uTaperIdle: { value: p.trailTaperIdle },
      uTaperFast: { value: p.trailTaperFast },
      uLength: { value: p.trailLength },
      uPace: { value: 0 },
      uGateStart: { value: p.paceThreshold },
      uGateWidth: { value: p.paceRamp },
      uWarpScale: { value: p.revealWarpScale },
      uTime: { value: 0 },
      uThreshold: { value: p.revealThreshold },
      uEdge: { value: p.revealEdge },
      uWarp: { value: p.revealWarp },
      uRevealMix: { value: 0 },
      uNoiseTex: { value: null },
    };
    const colors = {
      background: new THREE.Color(),
      line: new THREE.Color(),
      outline: new THREE.Color(),
      reveal: new THREE.Color(),
      revealAlt: new THREE.Color(),
    };
    const readColors = () => {
      const set = (c: THREE.Color, name: string) => c.setRGB(...readCssColor(box, name), THREE.SRGBColorSpace);
      set(colors.background, "--background");
      set(colors.line, "--contour");
      set(colors.outline, "--scene-outline");
      set(colors.reveal, "--scene-reveal");
      set(colors.revealAlt, "--scene-reveal-alt");
      (grade.uLift.value as THREE.Vector3).set(...readCssColor(box, "--scene-lift"));
      renderer.setClearColor(colors.background);
      st.settled = false;
    };
    readColors();

    let head: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial> | null = null;
    let backdrop: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial> | null = null;
    let outline: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial> | null = null;
    let revealMix = 0;
    const owned: { dispose: () => void }[] = [];

    const narrowFit = () => (st.width >= 880 || st.aspect < 1.2 ? 1 : Math.max(0.9, Math.min(1, st.aspect / REFERENCE_ASPECT)));
    const applyFit = () => {
      Object.assign(p, PARAMS);
      const fit = fitBox(st.width, st.height);
      if (fit && st.height > 0) {
        const ratio = fit.height / st.height;
        const world = 2 * PARAMS.cameraZ * Math.tan((CAMERA_FOV * Math.PI) / 360);
        p.subjectScale = PARAMS.subjectScale * ratio;
        p.subjectY = CAMERA_Y + (PARAMS.subjectY - CAMERA_Y) * ratio + ((st.height / 2 - (fit.top + fit.height / 2)) * world) / st.height;
      }
      if (st.width < 880) p.bgRevealOpacity = 0;
      if (matchMedia("(hover: none)").matches) p.autoSweepAmount = 0.76;
      if (st.width < 640) Object.assign(p, { sweepRadius: 0.95, sweepWarp: 0.18, autoSweepAmount: 0.55 });
      if (!tier.reveal) p.autoSweepAmount = 0;
      st.settled = false;
    };
    const resize = () => {
      const w = Math.max(1, box.clientWidth);
      const h = Math.max(1, box.clientHeight);
      st.width = w;
      st.height = h;
      st.aspect = w / h;
      renderer.setPixelRatio(Math.min(devicePixelRatio, tier.maxDpr) * budget.scale());
      renderer.setSize(w, h, false);
      camera.aspect = st.aspect;
      camera.updateProjectionMatrix();
      reveal.uAspect.value = st.aspect;
      applyFit();
    };

    const trailBounds = (list: THREE.Vector2[], length: number, warp: number, radius: number, min: THREE.Vector2, max: THREE.Vector2) => {
      const active = Math.min(list.length, Math.ceil(length * (samples - 1)) + 1);
      const margin = radius + warp * 0.22 + 0.05;
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      for (let i = 0; i < active; i++) {
        const x = list[i].x * st.aspect;
        const y = list[i].y;
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
      min.set(minX - margin, minY - margin);
      max.set(maxX + margin, maxY + margin);
    };
    const resetSweep = () => {
      const x = SWEEP_PATH[0].x * p.autoSweepAmount;
      const y = SWEEP_PATH[0].y * p.autoSweepAmount;
      st.sweep = { x, y };
      st.sweepSmoothed = { x, y };
      st.sweepLast = { x, y };
      st.sweepPace = 0;
      sweepTrail.forEach((s) => s.set(x, -y));
    };
    const riseOffset = (t: number) => {
      if (tier.freeze || p.riseDistance === 0) return 0;
      let remaining = 1;
      if (st.rising) {
        if (st.riseAt < 0) st.riseAt = t;
        const u = Math.min(1, (t - st.riseAt) / p.riseDuration);
        remaining = (1 - u) * (1 - u);
      }
      if (remaining <= 0) return 0;
      return remaining * p.riseDistance * ((2 * p.cameraZ * Math.tan((CAMERA_FOV * Math.PI) / 360)) / st.height);
    };

    const applyZoom = () => {
      const z = zoomRef.current?.get() ?? 0;
      if (z === st.zoom) return;
      st.zoom = z;
      const k = smooth(0, 0.42, z);
      grade.uGrey.value = smooth(0.08, 0.42, z);
      grade.uDim.value = 1 - 0.18 * k;
      grade.uLiftMix.value = k * 0.85;
      st.settled = false;
    };

    const update = (time: number) => {
      if (st.start < 0) st.start = time;
      const t = (time - st.start) / 1000;
      if (tier.freeze && revealMix > 0.995 && st.intro >= 1) st.settled = true;

      const auto = p.autoSweepAmount > 0 && !tier.freeze && st.intro >= 1;
      if (auto) {
        const cycle = t % p.autoSweepPeriod;
        if (cycle < st.sweepCycle) resetSweep();
        st.sweepCycle = cycle;
        const stroke = Math.max(p.autoSweepStroke, 0.05);
        const leg = Math.floor(cycle / stroke);
        if (leg < SWEEP_PATH.length - 1) {
          const local = Math.min(1, (cycle - leg * stroke) / stroke);
          const eased = 1 - (1 - local) * (1 - local);
          const from = SWEEP_PATH[leg];
          const to = SWEEP_PATH[leg + 1];
          st.sweep.x = (from.x + (to.x - from.x) * eased) * p.autoSweepAmount;
          st.sweep.y = (from.y + (to.y - from.y) * eased) * p.autoSweepAmount;
        }
      }
      st.sweepSmoothed.x += (st.sweep.x - st.sweepSmoothed.x) * p.pointerLerp;
      st.sweepSmoothed.y += (st.sweep.y - st.sweepSmoothed.y) * p.pointerLerp;
      const sweepStep = Math.hypot(st.sweepSmoothed.x - st.sweepLast.x, st.sweepSmoothed.y - st.sweepLast.y);
      const sweepTarget = auto ? Math.min(1, sweepStep / p.pacePeak) : 0;
      st.sweepPace += (sweepTarget - st.sweepPace) * (sweepTarget > st.sweepPace ? p.paceAttack : p.paceRelease);
      st.sweepLast = { ...st.sweepSmoothed };
      const oldestSweep = sweepTrail.pop()!;
      oldestSweep.set(st.sweepSmoothed.x, -st.sweepSmoothed.y);
      sweepTrail.unshift(oldestSweep);

      st.smoothed.x += (st.pointer.x - st.smoothed.x) * p.pointerLerp;
      st.smoothed.y += (st.pointer.y - st.smoothed.y) * p.pointerLerp;
      if (st.ready) {
        if (st.readyAt < 0) st.readyAt = t;
        st.intro = tier.freeze ? 1 : Math.min(1, (t - st.readyAt) / p.introDuration);
      }
      camera.position.z = p.cameraZ;
      subject.scale.setScalar(p.subjectScale * narrowFit());
      subject.position.x = st.smoothed.x * p.subjectParallax;
      subject.position.y = p.subjectY - st.smoothed.y * p.subjectParallax - riseOffset(t);

      if (head) {
        const u = head.material.uniforms;
        (u.uParallax.value as THREE.Vector2).set(st.smoothed.x, -st.smoothed.y);
        u.uReveal.value = revealMix;
        u.uDepthScale.value = p.headParallax;
        u.uRelight.value = p.headRelight;
        head.scale.setScalar(p.headScale);
        head.position.y = -0.55 + p.headY - (HEAD_HEIGHT * HEAD_EXTEND * p.headScale) / 2;
      }
      st.tilt += (swing(st.smoothed.y, p.helmetAmpX) - st.tilt) * p.pointerLerp;
      st.yaw += (swing(st.smoothed.x, p.helmetAmpY) - st.yaw) * p.pointerLerp;
      pivot.rotation.set(st.tilt, st.yaw, 0);
      helmetGroup.position.set(st.smoothed.x * p.helmetFollow, p.helmetY - st.smoothed.y * p.helmetFollow * 0.8, 0);
      helmetGroup.scale.setScalar(p.helmetScale);

      const step = Math.hypot(st.smoothed.x - st.last.x, st.smoothed.y - st.last.y);
      if (tier.pointer) {
        const target = Math.min(1, step / p.pacePeak);
        st.pace += (target - st.pace) * (target > st.pace ? p.paceAttack : p.paceRelease);
      } else if (!auto && st.intro >= 1 && tier.reveal) st.pace = 1;
      st.last = { ...st.smoothed };
      const oldest = trail.pop()!;
      oldest.set(st.smoothed.x, -st.smoothed.y);
      trail.unshift(oldest);

      reveal.uRadius.value = p.trailRadius;
      reveal.uPace.value = st.pace;
      reveal.uTime.value = t * p.revealSpeed;
      reveal.uRevealMix.value = revealMix;
      reveal.uSweepPace.value = st.sweepPace;
      reveal.uSweepWarp.value = p.sweepWarp;
      reveal.uSweepRadius.value = p.sweepRadius;
      trailBounds(trail, p.trailLength, p.revealWarp, p.trailRadius, reveal.uTrailMin.value, reveal.uTrailMax.value);
      trailBounds(sweepTrail, p.sweepLength, p.sweepWarp, p.sweepRadius, reveal.uSweepMin.value, reveal.uSweepMax.value);

      if (backdrop) {
        const distance = camera.position.z - BACKDROP_Z;
        const height = 2 * distance * Math.tan((camera.fov * Math.PI) / 360) * 1.06;
        backdrop.scale.set(height * st.aspect, height, 1);
        backdrop.material.uniforms.uRevealOpacity.value = p.bgRevealOpacity;
      }
      if (outline) {
        const u = outline.material.uniforms;
        u.uTime.value = t;
        const span = Math.max(1 - p.burnStart, 1e-4);
        const x = clamp01((st.intro - p.burnStart) / span);
        u.uRevealMix.value = revealMix * x * x * (3 - 2 * x);
      }
      renderer.render(scene, camera);
    };

    const textureLoader = new THREE.TextureLoader();
    const texture = (url: string, srgb = false) =>
      textureLoader.loadAsync(localMediaSrc(url)).then((tex) => {
        if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        tex.generateMipmaps = true;
        owned.push(tex);
        return tex;
      });
    const draco = new DRACOLoader().setDecoderPath(DRACO_DECODERS);
    const gltfLoader = new GLTFLoader().setDRACOLoader(draco);

    const buildHead = (diffuse: THREE.Texture, depth: THREE.Texture, alpha: THREE.Texture, normal: THREE.Texture) => {
      const material = new THREE.ShaderMaterial({
        vertexShader: HEAD_VERT,
        fragmentShader: HEAD_FRAG,
        transparent: true,
        uniforms: {
          ...grade,
          uDiffuse: { value: diffuse },
          uDepth: { value: depth },
          uAlpha: { value: alpha },
          uNormal: { value: normal },
          uParallax: { value: new THREE.Vector2() },
          uReveal: { value: 0 },
          uDepthScale: { value: PARAMS.headParallax },
          uRelight: { value: PARAMS.headRelight },
          uExtend: { value: HEAD_EXTEND },
        },
      });
      head = new THREE.Mesh(new THREE.PlaneGeometry(HEAD_HEIGHT, HEAD_HEIGHT * (1 + HEAD_EXTEND)), material);
      head.position.set(0, -0.55, 0);
      subject.add(head);
      owned.push(material, head.geometry);
    };

    const buildHelmet = (root: THREE.Object3D) => {
      root.traverse((object) => {
        const mesh = object as THREE.Mesh;
        if (!mesh.isMesh) return;
        const material = mesh.material as THREE.MeshStandardMaterial;
        material.side = THREE.FrontSide;
        material.transparent = true;
        material.depthWrite = false;
        material.envMapIntensity = 1.3;
        material.onBeforeCompile = (shader) => {
          Object.assign(shader.uniforms, reveal, grade);
          shader.vertexShader = shader.vertexShader.replace("#include <common>", "#include <common>\nvarying vec4 vRevealClip;").replace("#include <project_vertex>", "#include <project_vertex>\nvRevealClip = gl_Position;");
          shader.fragmentShader = shader.fragmentShader
            .replace("#include <common>", `#include <common>\nvarying vec4 vRevealClip;\n${revealGlsl(samples)}\n${GRADE_GLSL}`)
            .replace("#include <alphamap_fragment>", "#include <alphamap_fragment>\ndiffuseColor.a *= revealTrail(vRevealClip.xy / vRevealClip.w) * uRevealMix;")
            .replace("#include <dithering_fragment>", "#include <dithering_fragment>\ngl_FragColor.rgb = sceneGrade(gl_FragColor.rgb);");
        };
        mesh.renderOrder = 1;
        material.color.setScalar(1);
        owned.push(material, mesh.geometry);
      });
      const bounds = new THREE.Box3().setFromObject(root);
      root.scale.setScalar((HEAD_HEIGHT * 0.56) / bounds.getSize(new THREE.Vector3()).y);
      bounds.setFromObject(root);
      root.position.sub(bounds.getCenter(new THREE.Vector3()));
      pivot.position.copy(WORN_OFFSET);
      pivot.add(root);
      helmetGroup.updateMatrixWorld(true);

      const local = pivot.matrixWorld.clone().invert();
      const geometries: THREE.BufferGeometry[] = [];
      root.traverse((object) => {
        const mesh = object as THREE.Mesh;
        if (!mesh.isMesh || !mesh.visible) return;
        const geometry = mesh.geometry.clone();
        geometry.applyMatrix4(new THREE.Matrix4().multiplyMatrices(local, mesh.matrixWorld));
        Object.keys(geometry.attributes).forEach((name) => name !== "position" && geometry.deleteAttribute(name));
        geometries.push(geometry);
      });
      const merged = geometries.length ? mergeGeometries(geometries, false) : null;
      geometries.forEach((g) => g.dispose());
      if (!merged) return;
      merged.computeBoundingBox();
      const b = merged.boundingBox!;
      const material = new THREE.ShaderMaterial({
        vertexShader: OUTLINE_VERT,
        fragmentShader: OUTLINE_FRAG,
        wireframe: true,
        transparent: true,
        depthWrite: false,
        uniforms: {
          ...grade,
          uTime: { value: 0 },
          uPeriod: { value: PARAMS.outlinePeriod },
          uStagger: { value: PARAMS.outlineStagger },
          uOpacity: { value: PARAMS.outlineOpacity },
          uWidth: { value: PARAMS.outlineWidth },
          uLightness: { value: PARAMS.outlineLightness },
          uRevealMix: { value: 0 },
          uColor: { value: colors.outline },
          uMinY: { value: b.min.y },
          uRangeY: { value: b.max.y - b.min.y },
        },
      });
      outline = new THREE.Mesh(merged, material);
      outline.renderOrder = 3;
      outline.visible = tier.outline;
      pivot.add(outline);
      owned.push(material, merged);
    };

    const buildBackdrop = () => {
      const material = new THREE.ShaderMaterial({
        vertexShader: BACKDROP_VERT,
        fragmentShader: backdropFrag(samples),
        depthWrite: false,
        uniforms: {
          ...reveal,
          ...grade,
          uBackground: { value: colors.background },
          uLineColor: { value: colors.line },
          uRevealColor: { value: colors.reveal },
          uRevealColorAlt: { value: colors.revealAlt },
          uLineOpacity: { value: PARAMS.bgLineOpacity },
          uRevealOpacity: { value: PARAMS.bgRevealOpacity },
        },
      });
      backdrop = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
      backdrop.position.z = BACKDROP_Z;
      backdrop.renderOrder = -1;
      scene.add(backdrop);
      owned.push(material, backdrop.geometry);
    };

    const load = async () => {
      try {
        const [env, diffuse, depth, alpha, normal, noise, helmet] = await Promise.all([
          new HDRLoader().loadAsync(localMediaSrc(environmentSrc)),
          texture(maps.diffuse, true),
          texture(maps.depth),
          texture(maps.alpha),
          texture(maps.normal),
          texture(noiseSrc),
          helmetSrc ? gltfLoader.loadAsync(localMediaSrc(helmetSrc)) : Promise.resolve(null),
        ]);
        if (disposed) return;
        const pmrem = new THREE.PMREMGenerator(renderer);
        const envMap = pmrem.fromEquirectangular(env).texture;
        scene.environment = envMap;
        env.dispose();
        pmrem.dispose();
        owned.push(envMap);
        noise.wrapS = noise.wrapT = THREE.RepeatWrapping;
        reveal.uNoiseTex.value = noise;
        buildHead(diffuse, depth, alpha, normal);
        if (helmet) buildHelmet(helmet.scene);
        buildBackdrop();
        revealMix = 1;
        owned.forEach((o) => o instanceof THREE.Texture && renderer.initTexture(o));
        await renderer.compileAsync(scene, camera);
        if (disposed) return;
        update(performance.now());
        st.ready = true;
        if (!introSignal.isClaimed()) st.rising = true;
        release();
        introSignal.markReady();
        start();
      } catch {
        fail();
      }
    };

    const onPointer = (e: PointerEvent) => {
      const x = (e.clientX / innerWidth) * 2 - 1;
      const y = (e.clientY / innerHeight) * 2 - 1;
      st.pointer = { x, y };
      if (!st.seen) {
        st.seen = true;
        st.smoothed = { x, y };
        st.last = { x, y };
        st.tilt = swing(y, p.helmetAmpX);
        st.yaw = swing(x, p.helmetAmpY);
      }
    };
    let bound = false;
    const bindPointer = (on: boolean) => {
      if (on && !bound) addEventListener("pointermove", onPointer, { passive: true });
      if (!on && bound) removeEventListener("pointermove", onPointer);
      bound = on;
    };
    bindPointer(tier.pointer);
    const retune = () => {
      const fresh = sceneTier();
      const wasPointer = tier.pointer;
      tier = { ...fresh, antialias: tier.antialias, samples: tier.samples };
      if (outline) outline.visible = tier.outline;
      if (!tier.pointer) park();
      else if (!wasPointer) st.seen = false;
      if (!tier.freeze) st.settled = false;
      bindPointer(tier.pointer);
      resize();
    };

    let gateTop = 0;
    const measureGate = () => {
      gateTop = gate.getBoundingClientRect().top + scrollY;
    };
    let lastWidth = box.clientWidth;
    resize();
    measureGate();
    const sizer = new ResizeObserver(() => {
      const w = box.clientWidth;
      measureGate();
      if (w !== lastWidth) {
        lastWidth = w;
        retune();
      } else if (!tier.coarse) resize();
      start();
    });
    sizer.observe(box);
    const coarseQuery = matchMedia("(hover: none) and (pointer: coarse)");
    coarseQuery.addEventListener("change", retune);

    let raf = 0;
    let shown = true;
    let grace = 10;
    let lastFrame = -1;
    let lastDrawn = -1;
    const live = () => {
      if (shown) return true;
      if (grace > 0) {
        grace -= 1;
        return true;
      }
      return false;
    };
    const tick = (now: number) => {
      raf = 0;
      if (disposed || document.hidden) return;
      const alive = live();
      if (!alive) return;
      raf = requestAnimationFrame(tick);
      if (scrollY - gateTop > innerHeight * 1.15 && Math.min(0.42, zoomRef.current?.get() ?? 0) === Math.min(0.42, st.zoom)) {
        lastDrawn = -1;
        return;
      }
      if (now - lastFrame <= tier.frameInterval) return;
      lastFrame = now;
      applyZoom();
      if (!st.ready || st.settled) return;
      if (lastDrawn > 0 && budget.measure(now - lastDrawn)) resize();
      lastDrawn = now;
      update(now);
    };
    const start = () => {
      if (!raf && !disposed && !document.hidden && st.ready) raf = requestAnimationFrame(tick);
    };
    const onScreen = new IntersectionObserver(([e]) => {
      shown = e.isIntersecting;
      if (shown) {
        grace = 10;
        start();
      }
    });
    onScreen.observe(box);
    const onVisible = () => {
      lastDrawn = -1;
      start();
    };
    document.addEventListener("visibilitychange", onVisible);
    const stopRise = introSignal.onReveal(() => {
      st.rising = true;
      start();
    });
    const unwatch = watchPalette(box, readColors);
    const onScroll = () => start();
    addEventListener("scroll", onScroll, { passive: true });
    void load();

    return () => {
      disposed = true;
      release();
      window.clearTimeout(watchdog);
      canvas.removeEventListener("webglcontextlost", fail);
      cancelAnimationFrame(raf);
      stopRise();
      unwatch();
      sizer.disconnect();
      onScreen.disconnect();
      coarseQuery.removeEventListener("change", retune);
      document.removeEventListener("visibilitychange", onVisible);
      removeEventListener("scroll", onScroll);
      bindPointer(false);
      owned.forEach((o) => o.dispose());
      draco.dispose();
      renderer.dispose();
    };
  }, [maps.diffuse, maps.depth, maps.alpha, maps.normal, helmetSrc, noiseSrc, environmentSrc]);

  return <canvas ref={canvasRef} aria-hidden="true" className={twMerge("absolute inset-0 block size-full", className)} />;
}

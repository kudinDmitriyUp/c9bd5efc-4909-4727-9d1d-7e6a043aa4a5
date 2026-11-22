"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { twMerge } from "tailwind-merge";
import { envColors, envDefaults } from "@/components/kit/env/envDefaults";

export type Rgb = [number, number, number];

export type EnvParam = { key: string; label: string; min: number; max: number; step: number; value: number };

export type EnvFrame = { travel: number; creep: number; time: number; hero: number; scroll: number; intro: number; params: Record<string, number> };

export type EnvPointer = { uPointer: { value: THREE.Vector3 }; uPointerVel: { value: THREE.Vector2 } };

export type EnvContext = { scene: THREE.Scene; camera: THREE.PerspectiveCamera; small: boolean; colors: Record<string, { value: THREE.Vector3 }>; pointer: EnvPointer; renderer: THREE.WebGLRenderer; variant: string };

export type EnvModule = {
  id: string;
  title: string;
  palette: Record<string, { cssVar: string; label: string; fallback: string }>;
  params: EnvParam[];
  fov: [number, number];
  travelPerScreen: number;
  creep: number;
  hover?: { liquid: number; turn: number };
  resolution?: number;
  antialias?: boolean;
  variants?: Record<string, { params?: Record<string, number>; colors?: Record<string, string> }>;
  setup: (ctx: EnvContext) => { update: (frame: EnvFrame) => void; dispose: () => void; hoverMask?: THREE.Texture };
};

type EnvStageProps = { env: EnvModule; variant?: string; params?: Record<string, number>; resolution?: number; travel?: number; idle?: number; intro?: boolean; hover?: { liquid: number; turn: number; damp?: number; mask?: boolean }; adaptive?: boolean; className?: string };

const LEVELS = [1, 0.82, 0.65];

const rgb = (probe: CanvasRenderingContext2D | null, value: string, fallback: Rgb): Rgb => {
  if (!probe || !value) return fallback;
  probe.clearRect(0, 0, 1, 1);
  probe.fillStyle = "black";
  probe.fillStyle = value;
  probe.fillRect(0, 0, 1, 1);
  const d = probe.getImageData(0, 0, 1, 1).data;
  return [d[0] / 255, d[1] / 255, d[2] / 255];
};

const QUAD_VERT = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0., 1.);
}`;

const WAVE_FRAG = `
uniform sampler2D uState;
uniform vec2 uPx, uA, uB;
uniform float uForce, uAspect, uRadius, uDamp;
varying vec2 vUv;
void main() {
  vec2 s = texture2D(uState, vUv).rg;
  float l = texture2D(uState, vUv - vec2(uPx.x, 0.)).r;
  float r = texture2D(uState, vUv + vec2(uPx.x, 0.)).r;
  float d = texture2D(uState, vUv - vec2(0., uPx.y)).r;
  float u = texture2D(uState, vUv + vec2(0., uPx.y)).r;
  float h = 2. * s.r - s.g + .4 * (l + r + d + u - 4. * s.r);
  h *= uDamp;
  vec2 k = vec2(uAspect, 1.);
  vec2 p = (vUv - uA) * k;
  vec2 ab = (uB - uA) * k;
  float q = length(p - ab * clamp(dot(p, ab) / max(dot(ab, ab), 1e-7), 0., 1.)) / uRadius;
  h -= uForce * exp(-q * q * 2.);
  gl_FragColor = vec4(h, s.r, 0., 1.);
}`;

const LIQUID_FRAG = `
uniform sampler2D uScene, uWave, uMask;
uniform vec2 uPx;
uniform float uAmt, uUseMask;
varying vec2 vUv;
void main() {
  float keep = 1. - uUseMask * step(1e-6, texture2D(uMask, vUv).r);
  float l = texture2D(uWave, vUv - vec2(uPx.x, 0.)).r;
  float r = texture2D(uWave, vUv + vec2(uPx.x, 0.)).r;
  float d = texture2D(uWave, vUv - vec2(0., uPx.y)).r;
  float u = texture2D(uWave, vUv + vec2(0., uPx.y)).r;
  vec2 g = vec2(r - l, u - d);
  g *= keep;
  vec2 off = g * uAmt;
  vec3 c = vec3(texture2D(uScene, vUv + off * 1.2).r, texture2D(uScene, vUv + off).g, texture2D(uScene, vUv + off * .8).b);
  float shine = clamp(dot(g, vec2(-.6, .8)) * 50., -1., 1.);
  c += max(shine, 0.) * .07 * (1. - c * .5) - max(-shine, 0.) * .03 * c;
  gl_FragColor = vec4(c, 1.);
}`;

export default function EnvStage({ env, variant, params, resolution = 0.6, travel = 1, idle = 1, intro, hover: hoverProp, adaptive = false, className }: EnvStageProps) {
  const hoverRef = useRef(hoverProp);
  const adaptiveRef = useRef(adaptive);
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const live = useRef({ params: { ...envDefaults(env, variant), ...params }, resolution, travel, idle, intro });
  const kick = useRef<() => void>(() => {});

  useEffect(() => {
    live.current = { params: { ...envDefaults(env, variant), ...params }, resolution, travel, idle, intro };
    kick.current();
  });

  useEffect(() => {
    const wrap = wrapRef.current!;
    const canvas = canvasRef.current!;
    const host = wrap.parentElement ?? document.documentElement;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const small = matchMedia("(max-width: 879px)").matches;
    const fine = matchMedia("(pointer: fine)").matches;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: env.antialias ?? false, alpha: false, depth: false, stencil: false, powerPreference: "high-performance" });
    } catch {
      return;
    }
    renderer.setPixelRatio(1);
    renderer.autoClear = false;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(small ? env.fov[1] : env.fov[0], 1, 0.1, 200);
    const colors = Object.fromEntries(Object.keys(env.palette).map((k) => [k, { value: new THREE.Vector3() }]));
    const probe = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
    const preset = envColors(env, variant);
    const readColors = () => {
      const css = getComputedStyle(host);
      for (const [k, c] of Object.entries(env.palette)) colors[k].value.fromArray(rgb(probe, css.getPropertyValue(c.cssVar).trim() || preset[c.cssVar], rgb(probe, c.fallback, [1, 1, 1])));
    };
    readColors();
    const pointer: EnvPointer = { uPointer: { value: new THREE.Vector3() }, uPointerVel: { value: new THREE.Vector2() } };
    const world = env.setup({ scene, camera, small, colors, pointer, renderer, variant: variant ?? "" });

    const follow = fine && !reduced;
    const hover = { liquid: 0.25, turn: 1, ...env.hover, ...hoverRef.current };
    const liquid = follow && hover.liquid > 0 && (renderer.extensions.has("EXT_color_buffer_float") || renderer.extensions.has("EXT_color_buffer_half_float"));
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
    quad.frustumCulled = false;
    const ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const sceneRT = new THREE.WebGLRenderTarget(1, 1, { depthBuffer: false });
    const waveOpts = { type: THREE.HalfFloatType, format: THREE.RGFormat, depthBuffer: false };
    let waveA = new THREE.WebGLRenderTarget(1, 1, waveOpts);
    let waveB = new THREE.WebGLRenderTarget(1, 1, waveOpts);
    const px = new THREE.Vector2(1, 1);
    const waveU = { uState: { value: waveA.texture }, uPx: { value: px }, uA: { value: new THREE.Vector2() }, uB: { value: new THREE.Vector2() }, uForce: { value: 0 }, uAspect: { value: 1 }, uRadius: { value: 0.025 }, uDamp: { value: hover.damp ?? 0.994 } };
    const waveMat = new THREE.ShaderMaterial({ vertexShader: QUAD_VERT, fragmentShader: WAVE_FRAG, uniforms: waveU, depthTest: false, depthWrite: false });
    const liquidU = { uScene: { value: sceneRT.texture }, uWave: { value: waveA.texture }, uPx: { value: px }, uAmt: { value: 1.2 }, uMask: { value: world.hoverMask ?? null }, uUseMask: { value: hover.mask && world.hoverMask ? 1 : 0 } };
    const liquidMat = new THREE.ShaderMaterial({ vertexShader: QUAD_VERT, fragmentShader: LIQUID_FRAG, uniforms: liquidU, depthTest: false, depthWrite: false });
    const trail = { x: 0, y: 0, has: false, acc: 0 };

    const adapt = { on: adaptiveRef.current, level: 0, ceil: 0, acc: 0, n: 0, min: 99, refresh: 99, windows: 0, good: 0, upAt: -99 };
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
      } else if (avg < Math.min(17.5, adapt.refresh * 1.1) && adapt.level > adapt.ceil) {
        if (++adapt.good >= 5) {
          adapt.level--;
          adapt.good = 0;
          adapt.upAt = adapt.windows;
        }
      } else adapt.good = 0;
    };
    let w = 0;
    let h = 0;
    let vw = 0;
    let vh = innerHeight;
    const box = { w: wrap.clientWidth || innerWidth, h: wrap.clientHeight || innerHeight };
    const sizer = new ResizeObserver(([e]) => {
      box.w = e.contentRect.width || innerWidth;
      box.h = e.contentRect.height || innerHeight;
    });
    sizer.observe(wrap);
    const resize = () => {
      if (box.w !== vw || !small) {
        vw = box.w;
        vh = box.h;
      }
      const base = small ? Math.min(live.current.resolution, 0.45) : live.current.resolution;
      const cap = Math.min(base, Math.max(base * LEVELS[adapt.level], small ? 0.3 : 0.5));
      const scaleBy = Math.min(devicePixelRatio, 1.5) * cap;
      const nw = Math.max(2, Math.round(vw * scaleBy));
      const nh = Math.max(2, Math.round(vh * scaleBy));
      if (nw === w && nh === h) return;
      w = nw;
      h = nh;
      renderer.setSize(w, h, false);
      camera.aspect = vw / vh;
      camera.updateProjectionMatrix();
      if (!liquid) return;
      sceneRT.setSize(w, h);
      const sw = Math.min(480, Math.round(vw / 4));
      const sh = Math.max(2, Math.round((sw * vh) / vw));
      px.set(1 / sw, 1 / sh);
      waveU.uAspect.value = vw / vh;
      for (const t of [waveA, waveB]) {
        t.setSize(sw, sh);
        renderer.setRenderTarget(t);
        renderer.clear();
      }
      renderer.setRenderTarget(null);
    };

    const target = { x: 0, y: 0, on: 0, at: -1e9 };
    const pos = pointer.uPointer.value;
    const vel = pointer.uPointerVel.value;
    const onPointer = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" && e.pointerType !== "pen") return;
      target.x = (e.clientX / innerWidth) * 2 - 1;
      target.y = 1 - (e.clientY / innerHeight) * 2;
      target.on = 1;
      target.at = performance.now();
    };
    const onLeave = (e: Event) => {
      if (e.type === "blur" || !(e as PointerEvent).relatedTarget) target.x = target.y = target.on = 0;
    };
    if (follow) {
      addEventListener("pointermove", onPointer, { passive: true });
      document.documentElement.addEventListener("pointerleave", onLeave);
      addEventListener("blur", onLeave);
    }

    let raf = 0;
    let time = 0;
    let creep = 0;
    let intro = 0;
    let shown = true;
    let last = performance.now();
    const draw = (now: number) => {
      raf = 0;
      const p = live.current;
      const dt = Math.min(0.05, (now - last) / 1000);
      if (adapt.on) measure(now - last);
      last = now;
      if (!reduced) {
        time += dt * p.idle;
        creep += dt * env.creep * p.idle;
      }
      intro = reduced || p.intro === undefined ? 99 : p.intro ? intro + dt : 0;
      resize();
      const screens = reduced ? 0 : scrollY / Math.max(1, vh);
      if (follow) {
        vel.x += (36 * (target.x - pos.x) - 12 * vel.x) * dt;
        vel.y += (36 * (target.y - pos.y) - 12 * vel.y) * dt;
        pos.x += vel.x * dt;
        pos.y += vel.y * dt;
        pos.z = 0;
      }
      camera.rotation.set(pos.y * 0.07 * hover.turn, -pos.x * 0.1 * hover.turn, 0);
      camera.updateMatrixWorld();
      world.update({ travel: screens * env.travelPerScreen * p.travel, creep, time, hero: 1 - THREE.MathUtils.smoothstep(screens, 0.1, 1.1), scroll: screens, intro, params: p.params });
      camera.updateMatrixWorld();
      if (!liquid || now - target.at > 2500) {
        trail.has = false;
        renderer.clear();
        renderer.render(scene, camera);
      } else {
        const cx = target.x * 0.5 + 0.5;
        const cy = target.y * 0.5 + 0.5;
        if (!target.on) trail.has = false;
        else if (!trail.has) Object.assign(trail, { x: cx, y: cy, has: true });
        trail.acc = Math.min(trail.acc + dt, 0.05);
        const n = Math.floor(trail.acc * 120);
        trail.acc -= n / 120;
        quad.material = waveMat;
        for (let i = 0; i < n; i++) {
          const ax = trail.x + ((cx - trail.x) * i) / n;
          const ay = trail.y + ((cy - trail.y) * i) / n;
          const bx = trail.x + ((cx - trail.x) * (i + 1)) / n;
          const by = trail.y + ((cy - trail.y) * (i + 1)) / n;
          waveU.uA.value.set(ax, ay);
          waveU.uB.value.set(bx, by);
          waveU.uForce.value = trail.has ? Math.min(Math.hypot((bx - ax) * waveU.uAspect.value, by - ay) * 0.8, 0.008) * hover.liquid : 0;
          waveU.uState.value = waveA.texture;
          renderer.setRenderTarget(waveB);
          renderer.render(quad, ortho);
          [waveA, waveB] = [waveB, waveA];
        }
        if (n && trail.has) Object.assign(trail, { x: cx, y: cy });
        renderer.setRenderTarget(sceneRT);
        renderer.clear();
        renderer.render(scene, camera);
        renderer.setRenderTarget(null);
        liquidU.uWave.value = waveA.texture;
        quad.material = liquidMat;
        renderer.render(quad, ortho);
      }
      if (!reduced && !document.hidden && shown) raf = requestAnimationFrame(draw);
    };
    const inView = () => {
      const r = wrap.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
    };
    const start = () => {
      if (!shown && inView()) shown = true;
      if (!raf && !document.hidden && shown) {
        last = performance.now();
        raf = requestAnimationFrame(draw);
      }
    };
    kick.current = start;
    const onVisible = () => (document.hidden ? (cancelAnimationFrame(raf), (raf = 0)) : start());
    const watch = new MutationObserver(() => {
      readColors();
      start();
    });
    watch.observe(host, { attributes: true, attributeFilter: ["style", "class"] });
    const onScreen = new IntersectionObserver(([e]) => {
      shown = e.isIntersecting || inView();
      if (shown) start();
      else {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    });
    onScreen.observe(wrap);
    document.addEventListener("visibilitychange", onVisible);
    addEventListener("resize", start);
    start();

    return () => {
      cancelAnimationFrame(raf);
      kick.current = () => {};
      watch.disconnect();
      onScreen.disconnect();
      sizer.disconnect();
      document.removeEventListener("visibilitychange", onVisible);
      removeEventListener("resize", start);
      removeEventListener("pointermove", onPointer);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      removeEventListener("blur", onLeave);
      world.dispose();
      for (const d of [sceneRT, waveA, waveB, waveMat, liquidMat, quad.geometry]) d.dispose();
      renderer.dispose();
    };
  }, [env, variant]);

  return (
    <div ref={wrapRef} aria-hidden="true" className={twMerge("pointer-events-none fixed inset-0 z-0 overflow-hidden", className)}>
      <canvas ref={canvasRef} className="absolute inset-0 block size-full" />
    </div>
  );
}

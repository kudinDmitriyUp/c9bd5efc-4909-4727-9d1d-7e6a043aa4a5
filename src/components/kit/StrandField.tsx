"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { introSignal } from "@/components/kit/introSignal";
import { useWebildHold } from "@/components/kit/webildReady";
import { arcAtY, samplePath, type Ctrl, type Sampled } from "@/components/kit/strandPath";

const PATH = `
uniform sampler2D uPath;
uniform vec2 uRes;
uniform float uCount;
uniform float uDs;
uniform float uLen;
uniform float uScroll;
uniform float uTime;
uniform float uWob;
uniform vec4 uBox;
float dimAt(vec2 p) {
  float f = 48.0;
  float inside = smoothstep(uBox.x - f, uBox.x + f, p.x) * (1.0 - smoothstep(uBox.z - f, uBox.z + f, p.x)) * smoothstep(uBox.y - f, uBox.y + f, p.y) * (1.0 - smoothstep(uBox.w - f, uBox.w + f, p.y));
  return 1.0 - 0.8 * inside;
}
vec2 at(float s, out vec2 n, out float w, out float g, out vec2 lim, out float bias) {
  float f = clamp(s / uDs, 0.0, uCount - 1.001);
  int i = int(floor(f));
  float k = f - float(i);
  vec4 a = mix(texelFetch(uPath, ivec2(i, 0), 0), texelFetch(uPath, ivec2(i + 1, 0), 0), k);
  vec4 b = mix(texelFetch(uPath, ivec2(i, 1), 0), texelFetch(uPath, ivec2(i + 1, 1), 0), k);
  n = normalize(a.zw + vec2(1e-6));
  w = b.x;
  g = b.y;
  lim = b.zw;
  bias = mix(texelFetch(uPath, ivec2(i, 2), 0).x, texelFetch(uPath, ivec2(i + 1, 2), 0).x, k);
  return vec2(a.x, a.y - uScroll);
}
float bend(float o, vec2 lim) {
  float l = max(o > 0.0 ? lim.x : lim.y, 1.0);
  return sign(o) * l * tanh(min(abs(o) / l, 8.0));
}
vec4 clip(vec2 p) {
  return vec4(p.x / uRes.x * 2.0 - 1.0, 1.0 - p.y / uRes.y * 2.0, 0.0, 1.0);
}
float wobble(float s, float seed) {
  float l = s / 1500.0;
  return (sin(l * 8.0 + seed * 40.0 + uTime * (0.35 + seed * 0.3)) + 0.4 * sin(l * 21.0 + seed * 17.0 - uTime * 0.6)) * uWob;
}
`;

const LINE_VS = `${PATH}
attribute vec4 aD;
uniform float uThick;
uniform float uApex;
uniform float uPinch;
varying float vSide;
varying float vS;
varying float vSeed;
varying float vU;
varying float vThick;
varying float vG;
void main() {
  float s = aD.x * uLen;
  vec2 n;
  float w;
  float g;
  vec2 lim;
  float bias;
  vec2 c = at(s, n, w, g, lim, bias);
  float across = w * (aD.y + bias + wobble(s, aD.w));
  float thick = max(uThick * mix(1.0, 0.15 + 0.85 * smoothstep(0.0, 200.0, abs(s - uApex)), uPinch), 1e-3);
  vThick = thick;
  vSide = aD.z * thick;
  vS = s;
  vSeed = aD.w;
  vU = aD.y;
  vec2 q = c + n * bend(across + vSide, lim);
  vG = g * dimAt(q);
  gl_Position = clip(q);
}
`;

const POINT_VS = `${PATH}
attribute vec4 aD;
uniform float uDpr;
varying float vS;
varying float vSeed;
varying float vBig;
varying float vG;
void main() {
  float s = fract(aD.x + uTime * 7.5 * (0.4 + aD.z) / max(uLen, 1.0)) * uLen;
  vec2 n;
  float w;
  float g;
  vec2 lim;
  float bias;
  vec2 c = at(s, n, w, g, lim, bias);
  float drift = sin(uTime * 0.4 + aD.z * 60.0) * 0.2;
  vS = s;
  vSeed = aD.z;
  vBig = step(5.0, aD.w);
  vec2 q = c + n * bend(w * (aD.y + bias + drift) + 6.0 * sign(aD.y), lim);
  vG = g * dimAt(q);
  gl_PointSize = aD.w * uDpr;
  gl_Position = clip(q);
}
`;

const SHARED_FS = `
uniform vec3 uA;
uniform vec3 uB;
uniform float uGain;
uniform float uApex;
uniform float uLen;
uniform float uHead;
uniform float uSoft;
uniform float uTip;
uniform float uStag;
uniform float uTime;
float h(float x) { return fract(sin(x * 91.7 + 3.1) * 43758.5453); }
float drawn(float s) {
  return 1.0 - smoothstep(uHead - uSoft, uHead, s);
}
float tip(float s) {
  float q = (s - uHead + uSoft * 0.45) / (uSoft * 0.5);
  return uTip * exp(-q * q);
}
float ends(float s) {
  return smoothstep(0.0, 120.0, s) * (1.0 - smoothstep(uLen - 200.0, uLen, s));
}
uniform float uLight;
vec4 glow(vec3 col, float i) {
  vec3 c = max(col * i, vec3(0.0));
  float a = max(max(c.r, c.g), c.b);
  return vec4(c, uLight > 0.5 ? max(a, 0.85 * clamp(i, 0.0, 1.0)) : a);
}
`;

const LINE_FS = `${SHARED_FS}
varying float vSide;
varying float vThick;
varying float vS;
varying float vSeed;
varying float vU;
varying float vG;
uniform float uSharp;
void main() {
  float d = abs(vSide);
  float k = uSharp > 0.5 ? exp(-d * d * 1.6) + 0.06 * exp(-d * 0.9) : exp(-d * d / (vThick * vThick * 0.16));
  float q = (vS - uApex) / 60.0;
  float apex = exp(-q * q);
  float line = 0.22 + 0.78 * pow(h(vSeed), 1.6);
  float edgeFade = 1.0 - 0.45 * abs(vU);
  float t = tip(vS);
  float boost = 1.0 + apex * (uSharp > 0.5 ? 3.0 : 1.2) + t * (uSharp > 0.5 ? 2.2 : 1.0);
  vec3 col = mix(uA, uB, step(0.78, h(vSeed + 7.0)) * 0.9);
  col = mix(col, vec3(1.0, 1.0, 0.92), (apex * 0.35 + t * 0.3) * uSharp);
  float i = k * line * edgeFade * boost * uGain * vG * drawn(vS + h(vSeed + 3.0) * uStag) * ends(vS);
  gl_FragColor = glow(col, i);
}
`;

const POINT_FS = `${SHARED_FS}
varying float vS;
varying float vSeed;
varying float vBig;
varying float vG;
void main() {
  float r = length(gl_PointCoord - 0.5) * 2.0;
  float disc = vBig > 0.5 ? (1.0 - smoothstep(0.55, 1.0, r)) * 0.22 : 1.0 - smoothstep(0.0, 1.0, r);
  float tw = 0.55 + 0.45 * sin(uTime * (1.0 + h(vSeed) * 2.0) + vSeed * 30.0);
  vec3 col = mix(uA, uB, step(0.7, h(vSeed + 2.0)));
  float i = disc * tw * uGain * vG * drawn(vS) * ends(vS) * (0.35 + 0.65 * h(vSeed + 5.0)) * (1.0 + tip(vS));
  gl_FragColor = glow(col, i);
}
`;

const rgb = (value: string, fallback: string): [number, number, number] => {
  const ctx = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  if (!ctx) return [0.78, 0.95, 0.36];
  ctx.fillStyle = fallback;
  ctx.fillStyle = value || fallback;
  ctx.fillRect(0, 0, 1, 1);
  const d = ctx.getImageData(0, 0, 1, 1).data;
  return [d[0] / 255, d[1] / 255, d[2] / 255];
};

const lineGeometry = (lines: number, segs: number, soft: boolean) => {
  const verts = lines * (segs + 1) * 2;
  const data = new Float32Array(verts * 4);
  const index = verts > 65535 ? new Uint32Array(lines * segs * 6) : new Uint16Array(lines * segs * 6);
  let v = 0;
  let k = 0;
  for (let l = 0; l < lines; l += 1) {
    const base = l * (segs + 1) * 2;
    const even = (l / Math.max(1, lines - 1)) * 2 - 1;
    const u = soft ? even : Math.sign(even) * Math.pow(Math.abs(even), 0.85) + (Math.random() - 0.5) * 0.05;
    const seed = Math.random();
    for (let s = 0; s <= segs; s += 1) {
      const t = s / segs;
      for (const side of [-1, 1]) {
        data.set([t, u, side, seed], v);
        v += 4;
      }
      if (s < segs) {
        const a = base + s * 2;
        index.set([a, a + 1, a + 2, a + 1, a + 3, a + 2], k);
        k += 6;
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("aD", new THREE.BufferAttribute(data, 4));
  geo.setIndex(new THREE.BufferAttribute(index, 1));
  return geo;
};

const pointGeometry = (count: number) => {
  const data = new Float32Array(count * 4);
  for (let i = 0; i < count; i += 1) {
    const big = Math.random() < 0.12;
    data.set([Math.random(), (Math.random() * 2 - 1) * 1.25, Math.random(), big ? 6 + Math.random() * 12 : 1.2 + Math.random() * 2.2], i * 4);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("aD", new THREE.BufferAttribute(data, 4));
  geo.setDrawRange(0, count);
  return geo;
};

const material = (vertexShader: string, fragmentShader: string) =>
  new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uPath: { value: null },
      uRes: { value: new THREE.Vector2(1, 1) },
      uCount: { value: 2 },
      uDs: { value: 1 },
      uLen: { value: 1 },
      uScroll: { value: 0 },
      uTime: { value: 0 },
      uWob: { value: 0 },
      uThick: { value: 1 },
      uApex: { value: 0 },
      uPinch: { value: 0 },
      uDpr: { value: 1 },
      uA: { value: new THREE.Vector3() },
      uB: { value: new THREE.Vector3() },
      uGain: { value: 0 },
      uHead: { value: 0 },
      uSoft: { value: 1 },
      uTip: { value: 0 },
      uStag: { value: 0 },
      uSharp: { value: 0 },
      uLight: { value: 0 },
      uBox: { value: new THREE.Vector4(0, 0, 0, 0) },
    },
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.CustomBlending,
    blendEquation: THREE.AddEquation,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneFactor,
  });

type Built = { sampled: Sampled; apex: number; heroEnd: number; box: { left: number; top: number; right: number; bottom: number } };


const buildPath = (vh: number): Built => {
  const W = window.innerWidth;
  const scale = Math.max(W, 640) / 1280;
  const sy = window.scrollY;
  const all = Array.from(document.querySelectorAll<HTMLElement>("[data-section]"));
  const top = (el: HTMLElement) => el.getBoundingClientRect().top + sy;
  const heroEl = all.find((el) => el.dataset.section === "hero") ?? all[0];
  const footer = all.find((el) => el.dataset.section === "footer");
  const heroTop = heroEl ? top(heroEl) : 0;
  const heroBottom = heroEl ? heroTop + heroEl.getBoundingClientRect().height : vh;
  const end = footer ? top(footer) + vh * 0.15 : document.documentElement.scrollHeight;
  let textRoot: HTMLElement | null = heroEl?.querySelector<HTMLElement>("h1") ?? null;
  while (textRoot && heroEl && textRoot.parentElement && textRoot.parentElement !== heroEl && !textRoot.querySelector("a, button")) textRoot = textRoot.parentElement;
  const rects = textRoot ? Array.from(textRoot.querySelectorAll<HTMLElement>("h1, h2, p, a, button")).concat(textRoot).filter((el) => el.tagName !== "DIV" && el.tagName !== "SECTION").map((el) => el.getBoundingClientRect()).filter((r) => r.width > 4 && r.height > 4) : [];
  const box = rects.length
    ? { left: Math.min(...rects.map((r) => r.left)), right: Math.max(...rects.map((r) => r.right)), top: Math.min(...rects.map((r) => r.top)) + sy, bottom: Math.max(...rects.map((r) => r.bottom)) + sy }
    : { left: W * 0.25, right: W * 0.75, top: heroTop + vh * 0.2, bottom: heroTop + vh * 0.55 };
  const sideGap = W - box.right;
  const sideX = sideGap > 160 * scale ? box.right + sideGap * 0.55 : W * 0.97;
  const sideW = Math.min(150 * scale, Math.max(24, sideGap * 0.3));
  const ctrl: Ctrl[] = [];
  const push = (x: number, y: number, w: number, g: number) => ctrl.push({ x, y, w, g });
  push(W * 0.9, heroTop - vh * 0.35, 48 * scale, 1);
  push(sideX, (box.top + box.bottom) / 2, sideW, 0.8);
  push(W * 0.5, box.bottom + vh * 0.12, 150 * scale, 0.6);
  const heroIdx = ctrl.length;
  push(W * 0.14, Math.min(heroBottom, box.bottom + vh * 0.3), 48 * scale, 1);
  const y0 = ctrl[heroIdx].y;
  const tops = all.filter((el) => el !== heroEl && el !== footer).map(top).filter((y) => y > y0 + vh * 0.6 && y < end - vh * 0.4);
  const stops: number[] = [];
  let prev = y0;
  for (const y of [...tops, end]) {
    if (y - prev < vh * 0.95) {
      if (y === end && stops.length) stops[stops.length - 1] = end;
      continue;
    }
    const parts = Math.max(1, Math.floor((y - prev) / (vh * 1.1)));
    for (let p = 1; p <= parts; p += 1) stops.push(prev + ((y - prev) * p) / parts);
    prev = y;
  }
  if (!stops.length) stops.push(end);
  let last = y0;
  stops.forEach((y, i) => {
    const right = i % 2 === 0;
    push(W * (0.5 + (right ? 0.04 : -0.04)), (last + y) / 2, 150 * scale, 0.5);
    push(W * (right ? 0.84 : 0.16), y, 48 * scale, 1);
    last = y;
  });
  push(ctrl[ctrl.length - 1].x > W / 2 ? W * 0.7 : W * 0.3, end + vh * 0.5, 120 * scale, 1);
  const sampled = samplePath(ctrl, 6);
  return { sampled, apex: -1e6, heroEnd: sampled.at[heroIdx], box };
};

export default function StrandField({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);
  const ready = useWebildHold(canvasRef, !failed);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || failed) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const small = !window.matchMedia("(min-width: 880px)").matches;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: "high-performance" });
    } catch (error) {
      console.warn("StrandField: WebGL unavailable", error);
      setFailed(true);
      return;
    }
    let dead = false;
    const fail = (why: string) => {
      if (dead) return;
      dead = true;
      console.warn(`StrandField: ${why}`);
      setFailed(true);
    };
    renderer.debug.checkShaderErrors = true;
    renderer.debug.onShaderError = (gl, program, vs, fs) => {
      console.error("StrandField shader error", gl.getProgramInfoLog(program), gl.getShaderInfoLog(vs), gl.getShaderInfoLog(fs));
      fail("shader failed to compile");
    };
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.5 : 1.75));
    const onLost = (e: Event) => {
      e.preventDefault();
      fail("WebGL context lost");
    };
    canvas.addEventListener("webglcontextlost", onLost);

    const scene = new THREE.Scene();
    const camera = new THREE.Camera();
    const sharpGeo = lineGeometry(small ? 52 : 110, small ? 1000 : 1800, false);
    const softGeo = lineGeometry(small ? 10 : 16, 900, true);
    const pointCount = small ? 160 : 420;
    const pointGeo = pointGeometry(pointCount);

    const softMat = material(LINE_VS, LINE_FS);
    const sharpMat = material(LINE_VS, LINE_FS);
    const dotsMat = material(POINT_VS, POINT_FS);
    const materials = [softMat, sharpMat, dotsMat];
    const objects = [new THREE.Mesh(softGeo, softMat), new THREE.Mesh(sharpGeo, sharpMat), new THREE.Points(pointGeo, dotsMat)];
    objects.forEach((obj, i) => {
      obj.frustumCulled = false;
      obj.renderOrder = i;
      scene.add(obj);
    });

    const colors = { a: [0, 0, 0] as number[], b: [0, 0, 0] as number[], light: 0 };
    const readColors = () => {
      const style = getComputedStyle(document.documentElement);
      const lime = style.getPropertyValue("--primary").trim() || style.getPropertyValue("--accent").trim();
      const tint = style.getPropertyValue("--strand-tint").trim();
      const [r, g, b] = rgb(style.getPropertyValue("--background").trim(), "rgb(12 13 12)");
      colors.a = rgb(lime, "rgb(200 242 92)");
      colors.b = rgb(tint || lime, "rgb(63 196 224)");
      colors.light = 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.5 ? 1 : 0;
    };
    readColors();
    const observer = new MutationObserver(() => {
      readColors();
      if (reduce) draw(performance.now());
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["style", "class", "data-theme"] });

    let vh = window.innerHeight;
    let built = buildPath(vh);
    let texture: THREE.DataTexture | null = null;
    const upload = () => {
      const { data, count } = built.sampled;
      if (!texture || texture.image.width !== count) {
        texture?.dispose();
        texture = new THREE.DataTexture(data, count, 3,THREE.RGBAFormat, THREE.FloatType);
        texture.minFilter = THREE.NearestFilter;
        texture.magFilter = THREE.NearestFilter;
        texture.generateMipmaps = false;
      } else {
        (texture.image.data as Float32Array).set(data);
      }
      texture.needsUpdate = true;
      for (const mat of materials) mat.uniforms.uPath.value = texture;
    };
    upload();
    const measure = () => {
      vh = window.innerHeight;
      built = buildPath(vh);
      upload();
    };

    const resize = () => {
      const size = renderer.getSize(new THREE.Vector2());
      if (size.x !== window.innerWidth || size.y !== window.innerHeight) renderer.setSize(window.innerWidth, window.innerHeight, false);
    };

    const headFor = (sy: number) => {
      const max = Math.max(1, document.documentElement.scrollHeight - vh);
      return sy + vh * (0.6 + 0.6 * THREE.MathUtils.smoothstep(sy, max - vh * 1.2, max));
    };

    let smooth = window.scrollY;
    let last = performance.now();
    const start = last;
    let revealAt = reduce ? start - 1e5 : -1;
    const stopSignal = introSignal.onReveal(() => {
      if (revealAt < 0) revealAt = performance.now();
    });
    const draw = (now: number) => {
      if (revealAt < 0 && (now - start > 2500 || !introSignal.isClaimed())) revealAt = now;
      if (dead) return;
      resize();
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const sy = window.scrollY;
      smooth += (sy - smooth) * (reduce ? 1 : Math.min(1, dt * 7));
      if (Math.abs(sy - smooth) < 0.5) smooth = sy;
      const time = reduce ? 0 : (now - start) / 1000;
      const W = window.innerWidth;
      const H = window.innerHeight;
      const scale = Math.max(W, 640) / 1280;
      const { sampled, apex, heroEnd } = built;
      const soft = vh * 0.25;
      const elapsed = revealAt < 0 ? 0 : now - revealAt;
      const p = Math.min(1, elapsed / 1400);
      const ease = 1 - Math.pow(1 - p, 3);
      const scrolled = arcAtY(sampled, headFor(smooth));
      const target = Math.max(heroEnd, scrolled);
      const head = reduce ? 1e9 : elapsed <= 0 ? -1e9 : -soft + (target + soft) * ease;
      const tipOn = reduce ? 0 : p < 1 ? 1.4 : THREE.MathUtils.clamp((scrolled - heroEnd) / (vh * 0.3), 0, 1);
      const spark = reduce ? 1 : THREE.MathUtils.clamp((elapsed - 700) / 900, 0, 1);
      for (const mat of materials) {
        const u = mat.uniforms;
        u.uRes.value.set(W, H);
        u.uBox.value.set(built.box.left, built.box.top - sy, built.box.right, built.box.bottom - sy);
        u.uCount.value = sampled.count;
        u.uDs.value = sampled.ds;
        u.uLen.value = sampled.length;
        u.uScroll.value = sy;
        u.uTime.value = time;
        u.uApex.value = apex;
        u.uHead.value = head;
        u.uSoft.value = soft;
        u.uTip.value = tipOn;
        u.uStag.value = vh * 0.35 * (1 - ease);
        u.uA.value.fromArray(colors.a);
        u.uB.value.fromArray(colors.b);
        u.uLight.value = colors.light;
      }
      softMat.uniforms.uGain.value = 0.13;
      softMat.uniforms.uWob.value = 0.14;
      softMat.uniforms.uThick.value = 80 * scale;
      softMat.uniforms.uPinch.value = 0;
      softMat.uniforms.uSharp.value = 0;
      sharpMat.uniforms.uGain.value = 0.6;
      sharpMat.uniforms.uWob.value = 0.14;
      sharpMat.uniforms.uThick.value = 2.6;
      sharpMat.uniforms.uSharp.value = 1;
      dotsMat.uniforms.uGain.value = 1.1 * spark;
      dotsMat.uniforms.uDpr.value = renderer.getPixelRatio();
      renderer.render(scene, camera);
      ready();
    };

    let raf = 0;
    const loop = (now: number) => {
      draw(now);
      raf = dead ? 0 : requestAnimationFrame(loop);
    };
    const run = () => {
      cancelAnimationFrame(raf);
      raf = 0;
      if (reduce) {
        draw(performance.now());
        return;
      }
      last = performance.now();
      if (!document.hidden) raf = requestAnimationFrame(loop);
    };
    const onScroll = () => {
      if (reduce) draw(performance.now());
    };
    const onResize = () => {
      measure();
      if (reduce) draw(performance.now());
    };

    run();
    const resizer = new ResizeObserver(onResize);
    resizer.observe(document.body);
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("visibilitychange", run);
    return () => {
      dead = true;
      stopSignal();
      cancelAnimationFrame(raf);
      observer.disconnect();
      resizer.disconnect();
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", run);
      canvas.removeEventListener("webglcontextlost", onLost);
      sharpGeo.dispose();
      softGeo.dispose();
      pointGeo.dispose();
      materials.forEach((m) => m.dispose());
      texture?.dispose();
      renderer.dispose();
    };
  }, [failed, ready]);

  return (
    <div aria-hidden="true" className={`pointer-events-none fixed inset-0 -z-10 ${className}`}>
      {failed ? (
        <div data-strand-fallback="" className="absolute inset-0 bg-[radial-gradient(ellipse_32%_42%_at_50%_75%,color-mix(in_srgb,var(--primary,var(--accent))_28%,transparent),transparent_70%)]" />
      ) : (
        <canvas ref={canvasRef} className="block h-full w-full" />
      )}
    </div>
  );
}

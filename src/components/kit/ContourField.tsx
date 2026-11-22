"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { twMerge } from "tailwind-merge";
import { readCssColor, watchPalette } from "@/components/kit/cssColor";

export const CONTOUR_FIELD_GLSL = `
float contourField(vec2 p, float t) {
  float f = sin(p.x * 1.00 + t * 0.60) * 0.50;
  f += sin(p.y * 0.85 - t * 0.45) * 0.45;
  f += sin((p.x + p.y) * 0.65 + t * 0.35) * 0.35;
  f += sin((p.x - p.y) * 0.95 - t * 0.55) * 0.25;
  return f * 0.5 + 0.5;
}
float contourLines(vec2 ndc, float aspect, float time, float scale, float count, float wave, float thickness, out float level) {
  vec2 p = vec2(ndc.x * aspect, ndc.y) * scale;
  vec2 q = p;
  q.x += sin(p.y * 0.8 + time * 0.7) * wave;
  q.y += cos(p.x * 0.7 - time * 0.6) * wave;
  level = contourField(q, time) * count;
  float w = max(fwidth(level) * thickness, 1e-5);
  return 1.0 - smoothstep(0.0, w, abs(fract(level) - 0.5));
}
`;

const VERT = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

const FRAG = `
uniform vec3 uBackground;
uniform vec3 uLine;
uniform float uTime;
uniform float uAspect;
varying vec2 vUv;
${CONTOUR_FIELD_GLSL}
void main() {
  float level;
  float line = contourLines(vUv * 2.0 - 1.0, uAspect, uTime * 0.28, 3.8, 2.5, 0.18, 1.15, level);
  gl_FragColor = vec4(mix(uBackground, uLine, line * 0.85), 1.0);
  #include <colorspace_fragment>
}`;

type ContourFieldProps = { className?: string; background?: string; line?: string };

export default function ContourField({ className, background = "--background", line = "--contour" }: ContourFieldProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current!;
    const canvas = canvasRef.current!;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, depth: false, stencil: false, powerPreference: "low-power" });
    } catch {
      return;
    }
    renderer.setPixelRatio(1);
    const uniforms = { uBackground: { value: new THREE.Color() }, uLine: { value: new THREE.Color() }, uTime: { value: 0 }, uAspect: { value: 1 } };
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms, depthTest: false, depthWrite: false }));
    quad.frustumCulled = false;
    const scene = new THREE.Scene();
    scene.add(quad);
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const readColors = () => {
      uniforms.uBackground.value.setRGB(...readCssColor(wrap, background), THREE.SRGBColorSpace);
      uniforms.uLine.value.setRGB(...readCssColor(wrap, line), THREE.SRGBColorSpace);
    };
    readColors();

    let w = 0;
    let h = 0;
    const size = () => {
      const nw = Math.max(2, wrap.clientWidth);
      const nh = Math.max(2, wrap.clientHeight);
      if (nw === w && nh === h) return;
      w = nw;
      h = nh;
      renderer.setSize(w, h, false);
      uniforms.uAspect.value = w / h;
    };

    let raf = 0;
    let shown = false;
    let last = 0;
    const started = performance.now();
    const draw = (now: number) => {
      raf = 0;
      if (now - last >= 24 || !last) {
        last = now;
        size();
        uniforms.uTime.value = reduced ? 0 : (now - started) / 1000;
        renderer.render(scene, camera);
      }
      if (!reduced && shown && !document.hidden) raf = requestAnimationFrame(draw);
    };
    const start = () => {
      if (!raf && shown && !document.hidden) raf = requestAnimationFrame(draw);
    };
    const onScreen = new IntersectionObserver(([e]) => {
      shown = e.isIntersecting;
      if (shown) start();
    });
    onScreen.observe(wrap);
    const onVisible = () => start();
    document.addEventListener("visibilitychange", onVisible);
    const sizer = new ResizeObserver(() => {
      last = 0;
      start();
    });
    sizer.observe(wrap);
    const unwatch = watchPalette(wrap, () => {
      readColors();
      last = 0;
      start();
    });

    return () => {
      cancelAnimationFrame(raf);
      onScreen.disconnect();
      sizer.disconnect();
      unwatch();
      document.removeEventListener("visibilitychange", onVisible);
      quad.geometry.dispose();
      (quad.material as THREE.Material).dispose();
      renderer.dispose();
    };
  }, [background, line]);

  return (
    <div ref={wrapRef} aria-hidden="true" className={twMerge("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      <canvas ref={canvasRef} className="absolute inset-0 block size-full" />
    </div>
  );
}

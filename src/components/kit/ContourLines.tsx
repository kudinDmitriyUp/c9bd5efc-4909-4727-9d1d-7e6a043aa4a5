"use client";

import { useEffect, useRef } from "react";
import { twMerge } from "tailwind-merge";
import { readCssColor, watchPalette } from "@/components/kit/cssColor";

const SCALE = 3.8;
const COUNT = 2.5;
const WAVE = 0.18;
const SPEED = 0.28;
const OPACITY = 0.85;
const CELLS = 96;

const field = (x: number, y: number, t: number) => {
  let f = Math.sin(x + t * 0.6) * 0.5;
  f += Math.sin(y * 0.85 - t * 0.45) * 0.45;
  f += Math.sin((x + y) * 0.65 + t * 0.35) * 0.35;
  f += Math.sin((x - y) * 0.95 - t * 0.55) * 0.25;
  return f * 0.5 + 0.5;
};

type ContourLinesProps = { className?: string; line?: string };

export default function ContourLines({ className, line = "--contour" }: ContourLinesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let colour = "";
    const readColour = () => {
      colour = `rgb(${readCssColor(canvas, line).map((v) => Math.round(v * 255)).join(" ")})`;
    };
    readColour();
    const started = performance.now();
    let values = new Float32Array(0);
    let colX = new Float32Array(0);
    let colWave = new Float32Array(0);
    let lastLeft = NaN;
    let lastTop = NaN;

    const draw = (now: number) => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (!width || !height) return;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      ctx.clearRect(0, 0, width, height);
      const t = reduced ? 0 : ((now - started) / 1000) * SPEED;
      const cols = width >= height ? CELLS : Math.max(8, Math.round((CELLS * width) / height));
      const rows = Math.max(8, Math.round((cols * height) / width));
      const stepX = width / cols;
      const stepY = height / rows;
      const rect = canvas.getBoundingClientRect();
      lastLeft = rect.left;
      lastTop = rect.top;
      const view = window.innerHeight;
      const half = view / 2;
      const midX = window.innerWidth / 2;
      const j0 = Math.max(0, Math.floor(-rect.top / stepY) - 1);
      const j1 = Math.min(rows, Math.ceil((view - rect.top) / stepY) + 1);
      if (j1 <= j0) return;
      const stride = cols + 1;
      if (values.length !== stride * (rows + 1)) values = new Float32Array(stride * (rows + 1));
      if (colX.length !== stride) {
        colX = new Float32Array(stride);
        colWave = new Float32Array(stride);
      }
      for (let i = 0; i <= cols; i++) {
        const nx = ((rect.left + i * stepX - midX) / half) * SCALE;
        colX[i] = nx;
        colWave[i] = Math.cos(nx * 0.7 - t * 0.6) * WAVE;
      }
      for (let j = j0; j <= j1; j++) {
        const ny = ((rect.top + j * stepY - half) / half) * SCALE;
        const rowWave = Math.sin(ny * 0.8 + t * 0.7) * WAVE;
        const base = j * stride;
        for (let i = 0; i <= cols; i++) values[base + i] = field(colX[i] + rowWave, ny + colWave[i], t) * COUNT;
      }
      ctx.strokeStyle = colour;
      ctx.lineWidth = 1;
      ctx.globalAlpha = OPACITY;
      ctx.beginPath();
      for (let level = 0.5; level < COUNT; level++) {
        for (let j = j0; j < j1; j++) {
          const y0 = j * stepY;
          for (let i = 0; i < cols; i++) {
            const a = values[j * stride + i];
            const b = values[j * stride + i + 1];
            const c = values[(j + 1) * stride + i + 1];
            const d = values[(j + 1) * stride + i];
            const idx = (a > level ? 8 : 0) | (b > level ? 4 : 0) | (c > level ? 2 : 0) | (d > level ? 1 : 0);
            if (idx === 0 || idx === 15) continue;
            const x0 = i * stepX;
            const topX = x0 + stepX * ((level - a) / (b - a));
            const rightY = y0 + stepY * ((level - b) / (c - b));
            const bottomX = x0 + stepX * ((level - d) / (c - d));
            const leftY = y0 + stepY * ((level - a) / (d - a));
            const right = x0 + stepX;
            const bottom = y0 + stepY;
            if (idx === 1 || idx === 14) {
              ctx.moveTo(x0, leftY);
              ctx.lineTo(bottomX, bottom);
            } else if (idx === 2 || idx === 13) {
              ctx.moveTo(bottomX, bottom);
              ctx.lineTo(right, rightY);
            } else if (idx === 3 || idx === 12) {
              ctx.moveTo(x0, leftY);
              ctx.lineTo(right, rightY);
            } else if (idx === 4 || idx === 11) {
              ctx.moveTo(topX, y0);
              ctx.lineTo(right, rightY);
            } else if (idx === 6 || idx === 9) {
              ctx.moveTo(topX, y0);
              ctx.lineTo(bottomX, bottom);
            } else if (idx === 7 || idx === 8) {
              ctx.moveTo(x0, leftY);
              ctx.lineTo(topX, y0);
            } else if (idx === 5) {
              ctx.moveTo(x0, leftY);
              ctx.lineTo(topX, y0);
              ctx.moveTo(bottomX, bottom);
              ctx.lineTo(right, rightY);
            } else {
              ctx.moveTo(x0, leftY);
              ctx.lineTo(bottomX, bottom);
              ctx.moveTo(topX, y0);
              ctx.lineTo(right, rightY);
            }
          }
        }
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
    };

    let raf = 0;
    let last = 0;
    let shown = false;
    let lastY = -1;
    const tick = (now: number) => {
      raf = 0;
      let due = now - last > 24;
      if (!due && window.scrollY !== lastY) {
        lastY = window.scrollY;
        const rect = canvas.getBoundingClientRect();
        due = rect.top !== lastTop || rect.left !== lastLeft;
      }
      if (due) {
        last = now;
        lastY = window.scrollY;
        draw(now);
      }
      if (!reduced && shown && !document.hidden) raf = requestAnimationFrame(tick);
    };
    const start = () => {
      if (!raf && shown && !document.hidden) raf = requestAnimationFrame(tick);
    };
    const onScreen = new IntersectionObserver(([e]) => {
      shown = e.isIntersecting;
      start();
    });
    onScreen.observe(canvas);
    const sizer = new ResizeObserver(() => draw(performance.now()));
    sizer.observe(canvas);
    document.addEventListener("visibilitychange", start);
    const onScroll = () => {
      if (reduced && shown && !raf) raf = requestAnimationFrame(tick);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    const unwatch = watchPalette(canvas, () => {
      readColour();
      draw(performance.now());
    });
    draw(performance.now());

    return () => {
      cancelAnimationFrame(raf);
      onScreen.disconnect();
      sizer.disconnect();
      unwatch();
      document.removeEventListener("visibilitychange", start);
      window.removeEventListener("scroll", onScroll);
    };
  }, [line]);

  return <canvas ref={canvasRef} aria-hidden="true" className={twMerge("kit-contour pointer-events-none absolute inset-0 block size-full", className)} />;
}

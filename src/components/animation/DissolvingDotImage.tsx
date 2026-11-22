"use client";

import { useEffect, useRef, useState } from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

interface DissolvingDotImageProps {
  imageSrc?: string;
  dotSize?: number;
  gap?: number;
  radius?: number;
  className?: string;
}

const SPRING = 0.055;
const DAMPING = 0.86;
const SCATTER = 5.5;
const PUSH = 0.35;
const MAX_DOTS = 90000;

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

const readPixels = (img: HTMLImageElement, cols: number, rows: number) => {
  const canvas = document.createElement("canvas");
  canvas.width = cols;
  canvas.height = rows;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  const scale = Math.max(cols / img.naturalWidth, rows / img.naturalHeight);
  const w = img.naturalWidth * scale;
  const h = img.naturalHeight * scale;
  ctx.drawImage(img, (cols - w) / 2, (rows - h) / 2, w, h);
  return ctx.getImageData(0, 0, cols, rows).data;
};

const DissolvingDotImage = ({ imageSrc = "https://images.pexels.com/photos/1179863/pexels-photo-1179863.jpeg?auto=compress&cs=tinysrgb&w=1200",dotSize = 1.6, gap = 2.5, radius = 200, className = "" }: DissolvingDotImageProps) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ratio, setRatio] = useState(4 / 5);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!wrap || !canvas || !ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mobile = window.matchMedia("(max-width: 768px)");
    let img: HTMLImageElement | null = null;
    let cancelled = false;
    let frame = 0;
    let visible = false;
    let awake = 0;
    let width = 0;
    let height = 0;
    let hx = new Float32Array(0);
    let hy = new Float32Array(0);
    let x = new Float32Array(0);
    let y = new Float32Array(0);
    let vx = new Float32Array(0);
    let vy = new Float32Array(0);
    let size = new Float32Array(0);
    let buckets: { color: string; dots: number[] }[] = [];
    const pointer = { x: 0, y: 0, active: false };
    let lastScroll = window.scrollY;

    const build = () => {
      if (!img) return;
      width = wrap.clientWidth;
      height = wrap.clientHeight;
      if (!width || !height) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const step = Math.max(gap, Math.sqrt((width * height) / MAX_DOTS));
      const cols = Math.floor(width / step);
      const rows = Math.floor(height / step);
      const data = readPixels(img, cols, rows);
      if (!data) return;

      const homes: number[] = [];
      const sizes: number[] = [];
      const groups = new Map<string, number[]>();
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const i = (row * cols + col) * 4;
          if (data[i + 3] < 40) continue;
          const r = data[i] & 0xf0;
          const g = data[i + 1] & 0xf0;
          const b = data[i + 2] & 0xf0;
          const lum = (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255;
          const key = `#${(((r + 8) << 16) | ((g + 8) << 8) | (b + 8)).toString(16).padStart(6, "0")}`;
          const index = homes.length / 2;
          homes.push((col + 0.5 + (Math.random() - 0.5) * 0.35) * step, (row + 0.5 + (Math.random() - 0.5) * 0.35) * step);
          sizes.push((Math.max(dotSize, step * 0.85) / 2) * (0.85 + 0.2 * Math.sqrt(lum)));
          const group = groups.get(key);
          if (group) group.push(index);
          else groups.set(key, [index]);
        }
      }

      const count = sizes.length;
      hx = new Float32Array(count);
      hy = new Float32Array(count);
      for (let i = 0; i < count; i++) {
        hx[i] = homes[i * 2];
        hy[i] = homes[i * 2 + 1];
      }
      x = hx.slice();
      y = hy.slice();
      vx = new Float32Array(count);
      vy = new Float32Array(count);
      size = Float32Array.from(sizes);
      buckets = Array.from(groups, ([color, dots]) => ({ color, dots }));

      draw();
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      for (const { color, dots } of buckets) {
        ctx.fillStyle = color;
        ctx.beginPath();
        for (const i of dots) {
          ctx.moveTo(x[i] + size[i], y[i]);
          ctx.arc(x[i], y[i], size[i], 0, Math.PI * 2);
        }
        ctx.fill();
      }
    };

    const step = () => {
      frame = 0;
      let moving = false;
      const r2 = radius * radius;
      for (let i = 0; i < x.length; i++) {
        if (pointer.active) {
          const dx = x[i] - pointer.x;
          const dy = y[i] - pointer.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < r2 && d2 > 0.01) {
            const d = Math.sqrt(d2);
            const near = 1 - d / radius;
            const ux = dx / d;
            const uy = dy / d;
            vx[i] += (ux * PUSH + (Math.random() - 0.5) * SCATTER) * near;
            vy[i] += (uy * PUSH + (Math.random() - 0.5) * SCATTER) * near;
          }
        }
        vx[i] = (vx[i] + (hx[i] - x[i]) * SPRING) * DAMPING;
        vy[i] = (vy[i] + (hy[i] - y[i]) * SPRING) * DAMPING;
        x[i] += vx[i];
        y[i] += vy[i];
        if (Math.abs(vx[i]) < 0.02 && Math.abs(vy[i]) < 0.02 && Math.abs(hx[i] - x[i]) < 0.1 && Math.abs(hy[i] - y[i]) < 0.1) {
          x[i] = hx[i];
          y[i] = hy[i];
          vx[i] = 0;
          vy[i] = 0;
        } else moving = true;
      }
      draw();
      if (moving || pointer.active) awake = 30;
      else awake -= 1;
      if (awake > 0 && visible) frame = requestAnimationFrame(step);
    };

    const wake = () => {
      if (reduceMotion || !visible) return;
      awake = 30;
      if (!frame) frame = requestAnimationFrame(step);
    };

    const onPointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
      pointer.active = true;
      wake();
    };

    const onPointerLeave = () => {
      pointer.active = false;
    };

    const onScroll = () => {
      const delta = window.scrollY - lastScroll;
      lastScroll = window.scrollY;
      if (!mobile.matches || !visible) return;
      const strength = Math.min(Math.abs(delta), 60) * 0.12;
      for (let i = 0; i < x.length; i++) {
        const dx = hx[i] - width / 2;
        const dy = hy[i] - height / 2;
        const d = Math.hypot(dx, dy) || 1;
        const kick = strength * (0.4 + Math.random() * 0.6);
        vx[i] += (dx / d) * kick;
        vy[i] += (dy / d) * kick;
      }
      wake();
    };

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) wake();
    });

    const resize = new ResizeObserver(() => build());

    const init = async () => {
      try {
        img = await loadImage(imageSrc);
        if (cancelled) return;
        setRatio(img.naturalWidth / img.naturalHeight);
        try {
          readPixels(img, 1, 1);
        } catch {
          img = await loadImage(`${imageSrc}${imageSrc.includes("?") ? "&" : "?"}dots=1`);
          if (cancelled) return;
        }
        build();
        observer.observe(wrap);
        resize.observe(wrap);
      } catch {
        img = null;
      }
    };

    init();
    if (!reduceMotion) {
      canvas.addEventListener("pointermove", onPointerMove);
      canvas.addEventListener("pointerleave", onPointerLeave);
      canvas.addEventListener("pointercancel", onPointerLeave);
      window.addEventListener("scroll", onScroll, { passive: true });
    }

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      resize.disconnect();
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerleave", onPointerLeave);
      canvas.removeEventListener("pointercancel", onPointerLeave);
      window.removeEventListener("scroll", onScroll);
    };
  }, [imageSrc, dotSize, gap, radius]);

  return (
    <div ref={wrapRef} style={{ aspectRatio: ratio }} className={cn("relative w-full touch-pan-y", className)}>
      <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 w-full h-full" />
    </div>
  );
};

export default DissolvingDotImage;

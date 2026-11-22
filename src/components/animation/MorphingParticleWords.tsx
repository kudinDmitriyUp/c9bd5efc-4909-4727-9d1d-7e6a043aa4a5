"use client";

import { useEffect, useRef } from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

interface MorphingParticleWordsProps {
  words?: string[];
  interval?: number;
  className?: string;
}

const MORPH = 1.5;
const RADIUS = 160;
const PUSH = 0.35;
const SCATTER = 5.5;
const SPRING = 0.055;
const DAMPING = 0.86;

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

const DEFAULT_WORDS = ["Design", "Build", "Ship", "Grow"];

const MorphingParticleWords = ({ words = DEFAULT_WORDS,interval = 2.8, className = "" }: MorphingParticleWordsProps) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!wrap || !canvas || !ctx || !words.length) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const pointer = { x: 0, y: 0, active: false };
    let width = 0;
    let height = 0;
    let dot = 2;
    let count = 0;
    let sx = new Float32Array(0);
    let sy = new Float32Array(0);
    let tx = new Float32Array(0);
    let ty = new Float32Array(0);
    let bend = new Float32Array(0);
    let delay = new Float32Array(0);
    let ox = new Float32Array(0);
    let oy = new Float32Array(0);
    let vx = new Float32Array(0);
    let vy = new Float32Array(0);
    let px = new Float32Array(0);
    let py = new Float32Array(0);
    let targets: Float32Array[] = [];
    let wordIndex = 0;
    let morphStart = -Infinity;
    let frame = 0;
    let awake = 0;
    let visible = false;
    let started = false;
    let timer = 0;
    let color = "";

    const sample = (word: string) => {
      const style = getComputedStyle(wrap);
      const off = document.createElement("canvas");
      off.width = Math.max(1, Math.floor(width / dot));
      off.height = Math.max(1, Math.floor(height / dot));
      const octx = off.getContext("2d", { willReadFrequently: true });
      if (!octx) return new Float32Array(0);
      const font = (size: number) => `700 ${size}px ${style.fontFamily}`;
      octx.font = font(100);
      const measured = octx.measureText(word).width || 1;
      const size = Math.min(off.height * 0.78, (off.width * 0.92 * 100) / measured);
      octx.font = font(size);
      octx.textAlign = "center";
      octx.textBaseline = "middle";
      octx.fillText(word, off.width / 2, off.height / 2);
      const data = octx.getImageData(0, 0, off.width, off.height).data;
      const points: number[] = [];
      for (let row = 0; row < off.height; row++) {
        for (let col = 0; col < off.width; col++) {
          if (data[(row * off.width + col) * 4 + 3] > 128) points.push((col + 0.5) * dot, (row + 0.5) * dot);
        }
      }
      return Float32Array.from(points);
    };

    const assign = (index: number) => {
      const points = targets[index];
      const total = points.length / 2;
      if (!total) return;
      const order = new Uint32Array(count);
      for (let i = 0; i < count; i++) order[i] = i;
      for (let i = count - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const swap = order[i];
        order[i] = order[j];
        order[j] = swap;
      }
      for (let i = 0; i < count; i++) {
        const p = Math.floor((order[i] * total) / count);
        tx[i] = points[p * 2] + (Math.random() - 0.5) * dot * 0.6;
        ty[i] = points[p * 2 + 1] + (Math.random() - 0.5) * dot * 0.6;
      }
    };

    const build = () => {
      width = wrap.clientWidth;
      height = wrap.clientHeight;
      if (!width || !height) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      color = getComputedStyle(wrap).color;
      dot = Math.max(2.5, Math.sqrt((width * height) / 60000));
      targets = words.map(sample);
      count = Math.max(...targets.map((points) => points.length / 2), 1);
      sx = new Float32Array(count);
      sy = new Float32Array(count);
      tx = new Float32Array(count);
      ty = new Float32Array(count);
      px = new Float32Array(count);
      py = new Float32Array(count);
      ox = new Float32Array(count);
      oy = new Float32Array(count);
      vx = new Float32Array(count);
      vy = new Float32Array(count);
      bend = Float32Array.from({ length: count }, () => (Math.random() - 0.5) * 0.6);
      delay = Float32Array.from({ length: count }, () => Math.random() * 0.35);
      assign(wordIndex);
      for (let i = 0; i < count; i++) {
        if (started) {
          px[i] = tx[i];
          py[i] = ty[i];
        } else {
          px[i] = Math.random() * width;
          py[i] = Math.random() * height;
        }
      }
      draw();
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      if (!started && !reduceMotion) return;
      ctx.fillStyle = color;
      ctx.beginPath();
      const size = dot * 0.7;
      for (let i = 0; i < count; i++) ctx.rect(px[i] + ox[i] - size / 2, py[i] + oy[i] - size / 2, size, size);
      ctx.fill();
    };

    const morphTo = (index: number) => {
      for (let i = 0; i < count; i++) {
        sx[i] = px[i];
        sy[i] = py[i];
      }
      wordIndex = index;
      assign(index);
      morphStart = performance.now();
      wake();
    };

    const step = (now: number) => {
      frame = 0;
      let moving = false;
      const elapsed = (now - morphStart) / 1000;
      const morphing = elapsed < MORPH + 0.4;
      const isPointing = pointer.active;
      const rect = canvas.getBoundingClientRect();
      const cx = pointer.x - rect.left;
      const cy = pointer.y - rect.top;
      for (let i = 0; i < count; i++) {
        if (morphing) {
          const t = easeInOut(Math.min(Math.max((elapsed - delay[i]) / MORPH, 0), 1));
          const mx = (sx[i] + tx[i]) / 2 - (ty[i] - sy[i]) * bend[i];
          const my = (sy[i] + ty[i]) / 2 + (tx[i] - sx[i]) * bend[i];
          const u = 1 - t;
          px[i] = u * u * sx[i] + 2 * u * t * mx + t * t * tx[i];
          py[i] = u * u * sy[i] + 2 * u * t * my + t * t * ty[i];
        }
        if (isPointing) {
          const dx = px[i] + ox[i] - cx;
          const dy = py[i] + oy[i] - cy;
          const d2 = dx * dx + dy * dy;
          if (d2 < RADIUS * RADIUS && d2 > 0.01) {
            const d = Math.sqrt(d2);
            const near = 1 - d / RADIUS;
            vx[i] += ((dx / d) * PUSH + (Math.random() - 0.5) * SCATTER) * near;
            vy[i] += ((dy / d) * PUSH + (Math.random() - 0.5) * SCATTER) * near;
          }
        }
        if (vx[i] !== 0 || vy[i] !== 0 || ox[i] !== 0 || oy[i] !== 0) {
          vx[i] = (vx[i] - ox[i] * SPRING) * DAMPING;
          vy[i] = (vy[i] - oy[i] * SPRING) * DAMPING;
          ox[i] += vx[i];
          oy[i] += vy[i];
          if (Math.abs(vx[i]) + Math.abs(vy[i]) < 0.02 && Math.abs(ox[i]) + Math.abs(oy[i]) < 0.1) {
            vx[i] = vy[i] = ox[i] = oy[i] = 0;
          } else moving = true;
        }
      }
      draw();
      if (moving || morphing || isPointing) awake = 20;
      else awake -= 1;
      if (awake > 0 && visible) frame = requestAnimationFrame(step);
    };

    const wake = () => {
      if (reduceMotion || !visible || !started) return;
      awake = 20;
      if (!frame) frame = requestAnimationFrame(step);
    };

    const schedule = () => {
      window.clearTimeout(timer);
      if (words.length < 2 || reduceMotion) return;
      timer = window.setTimeout(() => {
        if (visible && !document.hidden) morphTo((wordIndex + 1) % words.length);
        schedule();
      }, (interval + MORPH) * 1000);
    };

    const point = (clientX: number, clientY: number) => {
      pointer.x = clientX;
      pointer.y = clientY;
      pointer.active = true;
      wake();
    };
    const release = () => {
      pointer.active = false;
    };
    const onPointerMove = (event: PointerEvent) => point(event.clientX, event.clientY);
    const onTouchMove = (event: TouchEvent) => point(event.touches[0].clientX, event.touches[0].clientY);

    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (!visible) return;
        if (!started && entry.intersectionRatio >= 0.3) {
          started = true;
          morphTo(0);
          schedule();
        } else wake();
      },
      { threshold: [0, 0.3] }
    );
    const resize = new ResizeObserver(build);

    const init = () => {
      build();
      if (reduceMotion) {
        started = true;
        for (let i = 0; i < count; i++) {
          px[i] = tx[i];
          py[i] = ty[i];
        }
        draw();
      }
      observer.observe(wrap);
      resize.observe(wrap);
    };

    let cancelled = false;
    document.fonts.ready.then(() => !cancelled && init()).catch(() => !cancelled && init());
    if (!reduceMotion) {
      canvas.addEventListener("pointermove", onPointerMove);
      canvas.addEventListener("touchmove", onTouchMove, { passive: true });
      canvas.addEventListener("pointerleave", release);
      canvas.addEventListener("touchend", release);
    }

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
      observer.disconnect();
      resize.disconnect();
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("touchmove", onTouchMove);
      canvas.removeEventListener("pointerleave", release);
      canvas.removeEventListener("touchend", release);
    };
  }, [words, interval]);

  return (
    <div ref={wrapRef} role="img" aria-label={words.join(", ")} className={cn("relative w-full aspect-[5/2] md:aspect-[3/1] text-foreground", className)}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full touch-pan-y" />
    </div>
  );
};

export default MorphingParticleWords;

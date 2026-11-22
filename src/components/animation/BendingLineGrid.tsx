"use client";

import { useEffect, useRef } from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

interface BendingLineGridProps {
  children?: React.ReactNode;
  className?: string;
}

const SPRING = 0.08;
const DAMPING = 0.82;
const PULL = 0.32;
const LEVELS = 6;

const BendingLineGrid = ({ children, className = "" }: BendingLineGridProps) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!wrap || !canvas || !ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mobile = window.matchMedia("(max-width: 768px)");
    const styles = getComputedStyle(wrap);
    const lineColor = styles.getPropertyValue("--color-foreground").trim() || "currentColor";
    const glowColor = styles.getPropertyValue("--color-primary").trim() || lineColor;

    let width = 0;
    let height = 0;
    let cols = 0;
    let rows = 0;
    let gap = 44;
    let hx = new Float32Array(0);
    let hy = new Float32Array(0);
    let x = new Float32Array(0);
    let y = new Float32Array(0);
    let vx = new Float32Array(0);
    let vy = new Float32Array(0);
    let frame = 0;
    let awake = 0;
    let visible = false;
    let reveal = reduceMotion ? 1 : 0;
    let revealing = false;
    let lastScroll = window.scrollY;
    let clock = 0;
    const well = { x: 0, y: 0, tx: 0, ty: 0, power: 0, target: 0, touching: false };

    const build = () => {
      width = wrap.clientWidth;
      height = wrap.clientHeight;
      if (!width || !height) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      gap = mobile.matches ? 32 : 44;
      cols = Math.ceil(width / gap) + 3;
      rows = Math.ceil(height / gap) + 3;
      const ox = (width - (cols - 1) * gap) / 2;
      const oy = (height - (rows - 1) * gap) / 2;
      const count = cols * rows;
      hx = new Float32Array(count);
      hy = new Float32Array(count);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const i = r * cols + c;
          hx[i] = ox + c * gap;
          hy[i] = oy + r * gap;
        }
      }
      x = hx.slice();
      y = hy.slice();
      vx = new Float32Array(count);
      vy = new Float32Array(count);
      well.x = well.tx = width / 2;
      well.y = well.ty = height / 2;
      draw();
    };

    const segment = (a: number, b: number, highlight: number[][]) => {
      const mx = (x[a] + x[b]) / 2;
      const my = (y[a] + y[b]) / 2;
      ctx.moveTo(x[a], y[a]);
      ctx.lineTo(x[b], y[b]);
      if (well.power <= 0.01) return;
      const d = Math.hypot(mx - well.x, my - well.y);
      const glow = well.power * Math.exp(-(d * d) / (2 * (gap * 2.6) ** 2));
      const level = Math.floor(glow * LEVELS);
      if (level > 0) highlight[Math.min(level, LEVELS) - 1].push(a, b);
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      if (!cols) return;
      if (reveal <= 0) return;
      ctx.save();
      if (reveal < 1) {
        ctx.beginPath();
        ctx.arc(width / 2, height / 2, reveal * Math.hypot(width, height) * 0.55, 0, Math.PI * 2);
        ctx.clip();
      }
      const highlight: number[][] = Array.from({ length: LEVELS }, () => []);
      ctx.beginPath();
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const i = r * cols + c;
          if (c < cols - 1) segment(i, i + 1, highlight);
          if (r < rows - 1) segment(i, i + cols, highlight);
        }
      }
      ctx.strokeStyle = lineColor;
      ctx.globalAlpha = 0.14;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.strokeStyle = glowColor;
      ctx.lineWidth = 1.4;
      highlight.forEach((list, level) => {
        if (!list.length) return;
        ctx.globalAlpha = ((level + 1) / LEVELS) * 0.9;
        ctx.beginPath();
        for (let k = 0; k < list.length; k += 2) {
          const a = list[k];
          const b = list[k + 1];
          ctx.moveTo(x[a], y[a]);
          ctx.lineTo(x[b], y[b]);
        }
        ctx.stroke();
      });
      ctx.globalAlpha = 1;
      ctx.restore();
    };

    const step = () => {
      frame = 0;
      clock += 1 / 60;
      if (revealing) {
        reveal = Math.min(reveal + 1 / 70, 1);
        if (reveal >= 1) revealing = false;
      }
      if (mobile.matches && !well.touching) {
        well.tx = width / 2 + Math.sin(clock * 0.5) * width * 0.25;
        well.ty = height / 2 + Math.sin(clock * 0.37 + 1) * height * 0.2;
        well.target = 0.8;
      }
      well.x += (well.tx - well.x) * 0.18;
      well.y += (well.ty - well.y) * 0.18;
      well.power += (well.target - well.power) * 0.1;

      let moving = revealing || Math.abs(well.target - well.power) > 0.005;
      const sigma2 = 2 * (gap * 3.2) ** 2;
      for (let i = 0; i < hx.length; i++) {
        const dx = well.x - hx[i];
        const dy = well.y - hy[i];
        const f = well.power * PULL * Math.exp(-(dx * dx + dy * dy) / sigma2);
        const tx = hx[i] + dx * f;
        const ty = hy[i] + dy * f;
        vx[i] = (vx[i] + (tx - x[i]) * SPRING) * DAMPING;
        vy[i] = (vy[i] + (ty - y[i]) * SPRING) * DAMPING;
        x[i] += vx[i];
        y[i] += vy[i];
        if (Math.abs(vx[i]) > 0.01 || Math.abs(vy[i]) > 0.01) moving = true;
      }
      draw();
      if (moving || mobile.matches) awake = 20;
      else awake -= 1;
      if (awake > 0 && visible) frame = requestAnimationFrame(step);
    };

    const wake = () => {
      if (reduceMotion || !visible) return;
      awake = 20;
      if (!frame) frame = requestAnimationFrame(step);
    };

    const local = (event: PointerEvent) => {
      const rect = wrap.getBoundingClientRect();
      well.tx = event.clientX - rect.left;
      well.ty = event.clientY - rect.top;
    };

    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" && !well.touching) return;
      local(event);
      well.target = 1;
      wake();
    };

    const onDown = (event: PointerEvent) => {
      if (event.pointerType === "mouse") return;
      well.touching = true;
      local(event);
      well.target = 1;
      wake();
    };

    const onUp = (event: PointerEvent) => {
      if (event.pointerType === "mouse") return;
      well.touching = false;
      wake();
    };

    const onLeave = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      well.target = 0;
      wake();
    };

    const onScroll = () => {
      const delta = window.scrollY - lastScroll;
      lastScroll = window.scrollY;
      if (!visible || !mobile.matches) return;
      const kick = Math.max(Math.min(delta, 40), -40) * 0.12;
      for (let i = 0; i < vx.length; i++) vy[i] += kick * Math.sin(hx[i] * 0.02 + clock * 3);
      wake();
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (!visible) return;
        if (!reduceMotion && reveal === 0 && entry.intersectionRatio >= 0.2) revealing = true;
        wake();
      },
      { threshold: [0, 0.2] }
    );
    const resize = new ResizeObserver(() => build());

    build();
    observer.observe(wrap);
    resize.observe(wrap);
    if (!reduceMotion) {
      wrap.addEventListener("pointermove", onMove);
      wrap.addEventListener("pointerdown", onDown);
      wrap.addEventListener("pointerup", onUp);
      wrap.addEventListener("pointercancel", onUp);
      wrap.addEventListener("pointerleave", onLeave);
      window.addEventListener("scroll", onScroll, { passive: true });
    }

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      resize.disconnect();
      wrap.removeEventListener("pointermove", onMove);
      wrap.removeEventListener("pointerdown", onDown);
      wrap.removeEventListener("pointerup", onUp);
      wrap.removeEventListener("pointercancel", onUp);
      wrap.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <div ref={wrapRef} className={cn("relative w-full overflow-hidden mask-[linear-gradient(to_bottom,transparent,black_12%,black_88%,transparent)]", className)}>
      <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 w-full h-full pointer-events-none" />
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1/5 backdrop-blur-md pointer-events-none mask-[linear-gradient(to_bottom,black,transparent)]" />
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1/5 backdrop-blur-md pointer-events-none mask-[linear-gradient(to_top,black,transparent)]" />
      <div className="relative z-10 w-full h-full">{children}</div>
    </div>
  );
};

export default BendingLineGrid;

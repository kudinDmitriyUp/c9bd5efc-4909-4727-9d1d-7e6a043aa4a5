"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { useKitMotion } from "@/components/kit/kitMotion";

type LoaderSignalDotProps = {
  readout?: string;
  brand?: string;
  introDelay?: number;
  onComplete?: () => void;
};

type Frame = { left: number; top: number; width: number; height: number };

const CORNERS = [
  { key: "tl", fx: 0, fy: 0, edge: "border-l border-t" },
  { key: "tr", fx: 1, fy: 0, edge: "border-r border-t" },
  { key: "bl", fx: 0, fy: 1, edge: "border-b border-l" },
  { key: "br", fx: 1, fy: 1, edge: "border-b border-r" },
];

const TICK = 12;

const inOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const out = (t: number) => 1 - Math.pow(1 - t, 3);
const clamp = (t: number) => Math.min(1, Math.max(0, t));

const runDust = (canvas: HTMLCanvasElement, introDelay: number) => {
  const ctx = canvas.getContext("2d");
  if (!ctx) return () => {};
  const w = innerWidth;
  const h = innerHeight;
  const dpr = Math.min(devicePixelRatio, 1.5);
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.scale(dpr, dpr);
  const cs = getComputedStyle(canvas);
  const lime = cs.getPropertyValue("--accent").trim() || "white";
  const ink = cs.getPropertyValue("--deep-foreground").trim() || "white";
  const cx = w / 2;
  const cy = h / 2;
  const r0 = Math.min(w, h) * 0.1;
  const reach = Math.hypot(w, h) * 0.65;
  const n = w < 880 ? 520 : 1100;
  const dots = Array.from({ length: n }, () => {
    const a = Math.random() * Math.PI * 2;
    const ring = Math.random() < 0.7;
    return {
      sx: Math.random() * w,
      sy: Math.random() * h,
      a,
      r: ring ? r0 * (0.92 + Math.random() * 0.16) : r0 * Math.sqrt(Math.random()) * 0.85,
      lag: Math.random() * 0.25,
      fly: reach * (0.45 + Math.random() * 0.75),
      size: 0.6 + Math.random() * 1.3,
      lime: Math.random() < 0.22,
    };
  });
  const burst = introDelay - 0.12;
  const born = performance.now();
  let raf = 0;
  const frame = (now: number) => {
    const t = (now - born) / 1000;
    ctx.clearRect(0, 0, w, h);
    const spin = t * 0.5;
    const q = out(clamp((t - burst) / 0.75));
    for (const d of dots) {
      const p = inOut(clamp((t - d.lag) / 0.85));
      const a = d.a + spin + (1 - p) * 1.4;
      const breathe = 1 + Math.sin(t * 6 + d.a * 3) * 0.04 * p;
      const tx = cx + Math.cos(a) * d.r * breathe;
      const ty = cy + Math.sin(a) * d.r * breathe;
      const x = d.sx + (tx - d.sx) * p + Math.cos(a) * d.fly * q;
      const y = d.sy + (ty - d.sy) * p + Math.sin(a) * d.fly * q;
      ctx.globalAlpha = (0.35 + 0.65 * p) * (1 - q) * (d.lime ? 1 : 0.75);
      ctx.fillStyle = d.lime ? lime : ink;
      ctx.fillRect(x, y, d.size * (1 + q), d.size * (1 + q));
    }
    if (t < burst + 0.8) raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  return () => cancelAnimationFrame(raf);
};

const LoaderSignalDot = ({ readout = "00.0 tCO2e", brand, introDelay = 1.4, onComplete }: LoaderSignalDotProps) => {
  const reduce = useReducedMotion();
  const { ease } = useKitMotion();
  const [frame, setFrame] = useState<Frame | null>(null);
  const [gone, setGone] = useState(false);
  const finish = useRef(onComplete);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    finish.current = onComplete;
  });

  useEffect(() => {
    if (reduce) {
      finish.current?.();
      const end = setTimeout(() => setGone(true), 300);
      return () => clearTimeout(end);
    }
    const target = document.querySelector<HTMLElement>("[data-hero-callout]")?.getBoundingClientRect();
    const w = innerWidth;
    const h = innerHeight;
    setFrame(target && target.width > 8 ? { left: target.left, top: target.top, width: target.width, height: target.height } : { left: w / 2 - 64, top: h / 2 - 48, width: 128, height: 96 });
    const stop = canvasRef.current ? runDust(canvasRef.current, introDelay) : () => {};
    const done = setTimeout(() => finish.current?.(), (introDelay + 0.5) * 1000);
    const end = setTimeout(() => setGone(true), (introDelay + 1) * 1000);
    return () => {
      stop();
      clearTimeout(done);
      clearTimeout(end);
    };
  }, [reduce, introDelay]);

  if (gone) return null;

  if (reduce)
    return (
      <motion.div
        aria-hidden="true"
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="pointer-events-none fixed inset-0 z-[100000] bg-[color-mix(in_oklab,var(--deep),black_72%)]"
      />
    );

  const cx = typeof window === "undefined" ? 0 : innerWidth / 2;
  const cy = typeof window === "undefined" ? 0 : innerHeight / 2;

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[100000]">
      <motion.div
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.5, delay: introDelay, ease }}
        className="absolute inset-0 bg-[color-mix(in_oklab,var(--deep),black_72%)]"
      >
        <motion.div
          initial={{ transform: "translateY(-10vh)", opacity: 0 }}
          animate={{ transform: "translateY(110vh)", opacity: [0, 1, 1, 0] }}
          transition={{ duration: 0.95, delay: 0.1, ease: [0.65, 0, 0.35, 1], opacity: { duration: 0.95, delay: 0.1, times: [0, 0.1, 0.85, 1] } }}
          className="absolute inset-x-0 top-0 h-[22vh] bg-[linear-gradient(to_bottom,transparent,color-mix(in_srgb,var(--accent)_10%,transparent))]"
        >
          <div className="absolute inset-x-0 bottom-0 h-px bg-accent" />
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 1, 0] }}
          transition={{ duration: introDelay, times: [0, 0.45, 0.88, 1] }}
          className="absolute left-1/2 top-1/2 -ml-[0.1875rem] -mt-[0.1875rem]"
        >
          <motion.div
            animate={{ transform: ["scale(1)", "scale(1.6)", "scale(1)"] }}
            transition={{ duration: 0.7, repeat: Infinity, ease: "easeInOut" }}
            className="size-[0.375rem] rounded-full bg-accent"
          />
        </motion.div>
        {brand && (
          <motion.p
            initial={{ opacity: 0, clipPath: "inset(0 100% 0 0)" }}
            animate={{ opacity: [0, 1, 1, 0], clipPath: "inset(0 0% 0 0)" }}
            transition={{ duration: introDelay - 0.55, delay: 0.55, times: [0, 0.2, 0.85, 1], clipPath: { duration: 0.45, delay: 0.55, ease } }}
            className="absolute left-1/2 top-[calc(50%+min(100vw,100vh)*0.1+1.5rem)] -translate-x-1/2 whitespace-nowrap font-mono text-[length:var(--text-label)] uppercase tracking-[0.2em] text-deep-foreground"
          >
            {brand}
          </motion.p>
        )}
      </motion.div>

      <canvas ref={canvasRef} className="absolute inset-0 block size-full" />

      {frame && (
        <motion.div
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.35, delay: introDelay + 0.35 }}
          className="absolute inset-0"
        >
          {CORNERS.map((c) => {
            const x = frame.left + c.fx * (frame.width - TICK);
            const y = frame.top + c.fy * (frame.height - TICK);
            return (
              <motion.div
                key={c.key}
                initial={{ opacity: 0, x: cx - x - TICK / 2, y: cy - y - TICK / 2 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                transition={{ duration: 0.5, delay: introDelay - 0.35, ease }}
                className={`absolute size-[0.75rem] border-[color-mix(in_srgb,var(--deep-foreground)_55%,transparent)] ${c.edge}`}
                style={{ left: x, top: y }}
              />
            );
          })}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0.3, 1] }}
            transition={{ duration: 0.4, delay: introDelay - 0.1, times: [0, 0.3, 0.6, 1] }}
            className="absolute whitespace-nowrap rounded-[calc(var(--radius)*0.5)] bg-deep-foreground px-[0.4rem] py-[0.2rem] font-mono text-[length:0.6875rem] uppercase leading-none tabular-nums text-deep"
            style={{ left: frame.left + frame.width + 12, top: frame.top + frame.height * 0.55 }}
          >
            {readout}
          </motion.p>
        </motion.div>
      )}
    </div>
  );
};

export default LoaderSignalDot;

"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";

type LoaderNotchSplitProps = {
  brand?: string;
  onComplete?: () => void;
};

type Point = [number, number, number];

const OPEN_AT = 1.45;
const OPEN = 1.2;
const POP = 0.6;
const EXTRA = 48;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const expoOut = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
const expoInOut = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2);

const rounded = (points: Point[]) => {
  const n = points.length;
  const d: string[] = [];
  points.forEach((p, i) => {
    const prev = points[(i - 1 + n) % n];
    const next = points[(i + 1) % n];
    const inLen = Math.hypot(p[0] - prev[0], p[1] - prev[1]);
    const outLen = Math.hypot(next[0] - p[0], next[1] - p[1]);
    const r = Math.min(p[2], inLen / 2, outLen / 2);
    const a = inLen ? [p[0] + ((prev[0] - p[0]) / inLen) * r, p[1] + ((prev[1] - p[1]) / inLen) * r] : p;
    const b = outLen ? [p[0] + ((next[0] - p[0]) / outLen) * r, p[1] + ((next[1] - p[1]) / outLen) * r] : p;
    d.push(`${i ? "L" : "M"}${a[0].toFixed(1)} ${a[1].toFixed(1)}`, `Q${p[0].toFixed(1)} ${p[1].toFixed(1)} ${b[0].toFixed(1)} ${b[1].toFixed(1)}`);
  });
  return `path("${d.join(" ")} Z")`;
};

const LoaderNotchSplit = ({ brand = "Studio", onComplete }: LoaderNotchSplitProps) => {
  const reduce = useReducedMotion();
  const [done, setDone] = useState(false);
  const finish = useRef(onComplete);
  const top = useRef<HTMLDivElement>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const topInner = useRef<HTMLDivElement>(null);
  const bottomInner = useRef<HTMLDivElement>(null);
  const chars = useRef<(HTMLDivElement | null)[][]>([[], []]);
  const cursors = useRef<(HTMLDivElement | null)[]>([]);
  const letters = Array.from(brand);

  useEffect(() => {
    finish.current = onComplete;
  });

  useEffect(() => {
    if (reduce) {
      setDone(true);
      finish.current?.();
      return;
    }
    const w = window.innerWidth;
    const h = window.innerHeight;
    const half = h / 2;
    const depthMax = w >= 880 ? 40 : 20;
    const slant = Math.max(12, w * 0.0125);
    const radius = w >= 880 ? 20 : 12;

    const shape = (depth: number, size: number, side: "top" | "bottom") => {
      const x1 = w * (0.5 - size / 2);
      const x2 = w * (0.5 + size / 2);
      if (side === "top") {
        const y = half;
        return rounded([
          [0, 0, 0],
          [w, 0, 0],
          [w, y, 0],
          [x2, y, radius],
          [x2 - slant, y - depth, radius],
          [x1 + slant, y - depth, radius],
          [x1, y, radius],
          [0, y, 0],
        ]);
      }
      const y = EXTRA;
      return rounded([
        [0, y, 0],
        [x1, y, radius],
        [x1 + slant, y + depth, radius],
        [x2 - slant, y + depth, radius],
        [x2, y, radius],
        [w, y, 0],
        [w, half + EXTRA, 0],
        [0, half + EXTRA, 0],
      ]);
    };

    const styles = top.current ? getComputedStyle(top.current) : null;
    const ink = styles?.getPropertyValue("--foreground").trim() || "#052424";
    const paper = styles?.getPropertyValue("--card").trim() || "#f0f0f0";
    const animations: Animation[] = [];
    chars.current.forEach((row) =>
      row.forEach((el, i) => {
        if (!el) return;
        const delay = 250 + i * 55;
        const flash = i % 2 === 0;
        animations.push(
          el.animate(
            flash
              ? [
                  { opacity: 0, backgroundColor: ink, color: paper },
                  { opacity: 1, backgroundColor: ink, color: paper, offset: 0.02 },
                  { opacity: 1, backgroundColor: ink, color: paper, offset: 0.5 },
                  { opacity: 1, backgroundColor: "transparent", color: ink, offset: 0.51 },
                  { opacity: 1, backgroundColor: "transparent", color: ink },
                ]
              : [{ opacity: 0 }, { opacity: 1, offset: 0.02 }, { opacity: 1 }],
            { duration: flash ? 140 : 60, delay, fill: "both", easing: "linear" },
          ),
        );
      }),
    );
    const typed = 250 + letters.length * 55;
    cursors.current.forEach((el) => {
      if (!el) return;
      animations.push(
        el.animate([{ opacity: 0 }, { opacity: 1, offset: 0.01 }, { opacity: 1, offset: 0.5 }, { opacity: 0, offset: 0.51 }, { opacity: 0 }], {
          duration: 380,
          delay: 200,
          iterations: Math.ceil((OPEN_AT * 1000 - 200) / 380),
          fill: "none",
        }),
      );
      animations.push(el.animate([{ left: "0ch" }, { left: `${letters.length}ch` }], { duration: Math.max(1, typed - 250), delay: 250, fill: "both", easing: `steps(${Math.max(1, letters.length)}, end)` }));
    });

    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = (now - start) / 1000;
      const pop = expoOut(clamp01((t - OPEN_AT) / POP));
      const flip = expoOut(clamp01((t - OPEN_AT - POP) / POP));
      const depth = depthMax * pop - 2 * depthMax * flip;
      const size = 0.5 + 0.4 * pop;
      const p = expoInOut(clamp01((t - OPEN_AT) / OPEN));
      if (top.current && bottom.current) {
        top.current.style.clipPath = shape(depth, size, "top");
        bottom.current.style.clipPath = shape(depth, size, "bottom");
        top.current.style.transform = `translate3d(0, ${-(half + EXTRA) * p}px, 0)`;
        bottom.current.style.transform = `translate3d(0, ${(half + EXTRA) * p}px, 0)`;
      }
      if (topInner.current && bottomInner.current) {
        topInner.current.style.transform = `translate3d(0, ${half * 0.5 * p}px, 0)`;
        bottomInner.current.style.transform = `translate3d(0, ${-half * 0.5 * p}px, 0)`;
      }
      if (t < OPEN_AT + OPEN) {
        frame = requestAnimationFrame(tick);
        return;
      }
      setDone(true);
      finish.current?.();
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      animations.forEach((a) => a.cancel());
    };
  }, [reduce, letters.length]);

  if (reduce || done) return null;

  const face = (index: 0 | 1) => (
    <>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative whitespace-nowrap font-mono text-[length:clamp(1.25rem,1rem+1vw,1.75rem)] font-semibold uppercase leading-none tracking-[0.12em] text-foreground">
          {letters.map((char, i) => (
            <div key={i} ref={(el) => void (chars.current[index][i] = el)} className="inline-block w-[1ch] text-center opacity-0">
              {char}
            </div>
          ))}
          <div
            ref={(el) => void (cursors.current[index] = el)}
            className="absolute top-1/2 h-[1.1em] w-[0.7ch] -translate-y-1/2 bg-accent opacity-0"
          />
        </div>
      </div>
    </>
  );

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[100000]">
      <div ref={top} className="absolute inset-x-0 top-0 h-[calc(50%+3rem)] overflow-hidden bg-card will-change-transform">
        <div ref={topInner} className="absolute inset-x-0 top-0 h-svh">
          {face(0)}
        </div>
      </div>
      <div ref={bottom} className="absolute inset-x-0 bottom-0 h-[calc(50%+3rem)] overflow-hidden bg-card will-change-transform">
        <div ref={bottomInner} className="absolute inset-x-0 bottom-0 h-svh">
          {face(1)}
        </div>
      </div>
    </div>
  );
};

export default LoaderNotchSplit;

"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import ScrambleLabel from "@/components/kit/ScrambleLabel";

type LoaderCrosshairLockProps = {
  brand?: string;
  logoSrc?: string;
  coordinates?: string;
  onComplete?: () => void;
};

type Geometry = { w: number; h: number; fw: number; fh: number; g: number };

const LOCK = 0.9;
const LINE_AT = 1.3;
const OPEN_AT = 1.6;
const OPEN = 1.1;
const TICK = 12;
const TICKS = 25;
const EASE = [0.16, 1, 0.3, 1] as const;
const WIPE = [0.65, 0, 0.35, 1] as const;

const CORNERS = [
  { place: "border-l border-t", left: true, top: true },
  { place: "border-r border-t", left: false, top: true },
  { place: "border-b border-l", left: true, top: false },
  { place: "border-b border-r", left: false, top: false },
];

const LoaderCrosshairLock = ({ brand = "Northfield Labs", logoSrc, coordinates = "N 59.33 / E 18.06", onComplete }: LoaderCrosshairLockProps) => {
  const reduce = useReducedMotion();
  const finish = useRef(onComplete);
  const [geo, setGeo] = useState<Geometry | null>(null);
  const [phase, setPhase] = useState<"lock" | "line" | "open">("lock");
  const [done, setDone] = useState(false);

  useEffect(() => {
    finish.current = onComplete;
  });

  useEffect(() => {
    if (reduce) {
      window.dispatchEvent(new CustomEvent("kit:intro"));
      setDone(true);
      finish.current?.();
      return;
    }
    const w = window.innerWidth;
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    setGeo({ w, h: window.innerHeight, fw: Math.min(w - 3 * rem, 20 * rem), fh: 9 * rem, g: w >= 880 ? 1.5 * rem : rem });
    const line = window.setTimeout(() => setPhase("line"), LINE_AT * 1000);
    const open = window.setTimeout(() => {
      setPhase("open");
      window.dispatchEvent(new CustomEvent("kit:intro"));
    }, OPEN_AT * 1000);
    const end = window.setTimeout(() => {
      setDone(true);
      finish.current?.();
    }, (OPEN_AT + OPEN) * 1000);
    return () => {
      window.clearTimeout(line);
      window.clearTimeout(open);
      window.clearTimeout(end);
    };
  }, [reduce]);

  if (reduce || done) return null;

  const opening = phase === "open";
  const fading = phase !== "lock";

  const screenAt = (c: (typeof CORNERS)[number], g: Geometry, out: number) => ({
    x: c.left ? g.g - out : g.w - g.g - TICK + out,
    y: c.top ? g.g - out : g.h - g.g - TICK + out,
  });
  const frameAt = (c: (typeof CORNERS)[number], g: Geometry) => ({
    x: c.left ? g.w / 2 - g.fw / 2 : g.w / 2 + g.fw / 2 - TICK,
    y: c.top ? g.h / 2 - g.fh / 2 : g.h / 2 + g.fh / 2 - TICK,
  });

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[100000]">
      <motion.div
        className="absolute inset-0 bg-background"
        style={{
          maskImage: "radial-gradient(ellipse 120% 90% at 50% 62%, transparent var(--r), black calc(var(--r) + 35%))",
          WebkitMaskImage: "radial-gradient(ellipse 120% 90% at 50% 62%, transparent var(--r), black calc(var(--r) + 35%))",
        }}
        initial={{ "--r": "-35%", opacity: 1 } as Record<string, string | number>}
        animate={(opening ? { "--r": "100%", opacity: 0 } : { "--r": "-35%", opacity: 1 }) as Record<string, string | number>}
        transition={{ duration: OPEN, ease: WIPE, opacity: { duration: OPEN, ease: [0.5, 0, 0.75, 0] } }}
      />

      <motion.div
        className="absolute inset-0 flex flex-col items-center justify-center gap-[1rem] px-[var(--gutter)]"
        animate={{ opacity: fading ? 0 : 1 }}
        transition={{ duration: 0.3, ease: EASE }}
      >
        <div className="overflow-hidden pb-[0.15em] -mb-[0.15em]">
          <motion.div initial={{ y: "110%" }} animate={{ y: "0%" }} transition={{ duration: 0.8, delay: 0.35, ease: EASE }}>
            {logoSrc ? (
              <img src={logoSrc} alt="" loading="eager" decoding="async" className="h-[clamp(1.75rem,1.4rem+1.2vw,2.5rem)] w-auto max-w-[16rem] object-contain" />
            ) : (
              <p className="whitespace-nowrap font-[family-name:var(--font-heading)] text-[length:var(--text-h2)] leading-none tracking-[-0.03em] text-foreground">{brand}</p>
            )}
          </motion.div>
        </div>
        <ScrambleLabel text={coordinates} duration={0.6} delay={0.5} className="whitespace-nowrap font-mono text-[length:var(--text-label)] uppercase leading-none text-muted-foreground" />
        <div className="flex h-[0.75rem] items-end gap-[0.3125rem]">
          {Array.from({ length: TICKS }, (_, i) => (
            <motion.div
              key={i}
              className={`w-px bg-foreground ${i % 6 === 0 ? "h-full" : "h-1/2"}`}
              initial={{ opacity: 0.18 }}
              animate={{ opacity: 0.9 }}
              transition={{ duration: 0.08, delay: 0.3 + (i / TICKS) * 0.9 }}
            />
          ))}
        </div>
      </motion.div>

      {geo &&
        CORNERS.map((c) => {
          const from = screenAt(c, geo, 0);
          const to = frameAt(c, geo);
          return (
            <motion.div
              key={c.place}
              className={`absolute left-0 top-0 transition-colors duration-200 ${fading ? "border-accent" : "border-foreground/70"} ${c.place}`}
              style={{ width: TICK, height: TICK }}
              initial={{ x: from.x, y: from.y, opacity: 0 }}
              animate={opening ? { x: from.x, y: from.y, opacity: 0 } : { x: to.x, y: to.y, opacity: 1 }}
              transition={
                opening
                  ? { x: { duration: 0.8, ease: WIPE }, y: { duration: 0.8, ease: WIPE }, opacity: { duration: 0.4, delay: 0.6 } }
                  : { duration: fading ? 0.2 : LOCK, delay: fading ? 0 : 0.1, ease: EASE }
              }
            />
          );
        })}
    </div>
  );
};

export default LoaderCrosshairLock;

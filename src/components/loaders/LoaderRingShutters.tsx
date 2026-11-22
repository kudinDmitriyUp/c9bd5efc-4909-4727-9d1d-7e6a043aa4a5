"use client";

import { useEffect, useRef, useState } from "react";
import { animate, motion, useReducedMotion } from "motion/react";

type LoaderRingShuttersProps = {
  label?: string;
  onComplete?: () => void;
};

const power1Out = [0.25, 0.46, 0.45, 0.94] as const;
const power2InOut = [0.455, 0.03, 0.515, 0.955] as const;

const INTRO = 1;
const EXIT_AT = 1;
const OPEN_AT = 2.3;
const FADE = 0.7;
const DONE_AT = OPEN_AT + FADE + 0.05;

const RINGS = [50, 64, 78, 92];
const THIN = Array.from({ length: 16 }, (_, i) => 59 + i);
const TICKS = Array.from({ length: 72 }, (_, i) => i * 5);

const LoaderRingShutters = ({ label = "Loading", onComplete }: LoaderRingShuttersProps) => {
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState<"in" | "out" | "open" | "done">("in");
  const [count, setCount] = useState(0);
  const done = useRef(onComplete);

  useEffect(() => {
    done.current = onComplete;
  });

  useEffect(() => {
    if (reduce) {
      setPhase("done");
      done.current?.();
      return;
    }
    const counter = animate(0, 100, { duration: INTRO, ease: "linear", onUpdate: (value) => setCount(Math.round(value)) });
    const timers = [
      window.setTimeout(() => setPhase("out"), EXIT_AT * 1000),
      window.setTimeout(() => setPhase("open"), OPEN_AT * 1000),
      window.setTimeout(() => {
        setPhase("done");
        done.current?.();
      }, DONE_AT * 1000),
    ];
    return () => {
      counter.stop();
      timers.forEach(window.clearTimeout);
    };
  }, [reduce]);

  if (reduce || phase === "done") return null;

  const open = phase === "open";
  const out = phase === "out" || open;

  return (
    <motion.div
      aria-hidden="true"
      initial={{ opacity: 1 }}
      animate={{ opacity: open ? 0 : 1 }}
      transition={{ duration: FADE, ease: power1Out }}
      className={`pointer-events-none fixed inset-0 z-[100000] overflow-hidden text-deep-foreground ${open ? "bg-background" : "bg-deep"}`}
    >
      <div className={`absolute left-1/2 top-1/2 size-[min(100svh,100vw)] -translate-x-1/2 -translate-y-1/2 ${open ? "hidden" : ""}`}>
        {THIN.map((size, i) => (
          <motion.div
            key={`thin-${size}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: out ? 0 : 1 }}
            transition={out ? { duration: 0.4, ease: power1Out } : { duration: 0.4, ease: power1Out, delay: 0.25 + i * 0.015 }}
            style={{ width: `${size}%`, height: `${size}%` }}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[color-mix(in_srgb,var(--deep-foreground)_10%,transparent)]"
          />
        ))}
        {RINGS.map((size, i) => (
          <div key={`ring-${size}`} style={{ width: `${size}%`, height: `${size}%` }} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: out ? 0 : 1 }}
              transition={out ? { duration: 0.8, ease: power1Out, delay: (RINGS.length - 1 - i) * 0.03 } : { duration: 0.7, ease: power1Out, delay: i * 0.05 }}
              className={
                i === 0
                  ? "flex size-full items-center justify-center rounded-full bg-background text-foreground"
                  : "relative size-full rounded-full border border-[color-mix(in_srgb,var(--deep-foreground)_60%,transparent)]"
              }
            >
              {i === 0 && (
                <div className="flex items-start gap-[0.25em]">
                  <p className="font-[family-name:var(--font-script,var(--font-heading))] text-[length:var(--text-h2)] leading-[1.3]">{label}</p>
                  <p className="whitespace-nowrap pt-[0.4em] text-[length:var(--text-label)] leading-none tabular-nums">({count}%)</p>
                </div>
              )}
              {i === 2 && (
                <motion.svg
                  viewBox="0 0 100 100"
                  animate={{ rotate: -360 }}
                  transition={{ duration: 40, ease: "linear", repeat: Infinity }}
                  className="absolute inset-0 size-full text-[color-mix(in_srgb,var(--deep-foreground)_35%,transparent)]"
                >
                  {TICKS.map((angle) => (
                    <line key={angle} x1="50" y1="1.5" x2="50" y2={angle % 45 === 0 ? "5" : "3"} stroke="currentColor" strokeWidth="0.2" transform={`rotate(${angle} 50 50)`} />
                  ))}
                </motion.svg>
              )}
            </motion.div>
          </div>
        ))}
      </div>
      <div className="absolute inset-0 flex">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex h-full basis-1/5 justify-center">
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: out ? 1.02 : 0 }}
              transition={{ duration: 0.9, ease: power2InOut, delay: out ? 0.25 + i * 0.03 : 0 }}
              className="h-full w-full bg-background"
            />
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default LoaderRingShutters;

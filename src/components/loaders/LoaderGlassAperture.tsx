"use client";

import { useEffect, useId, useRef, useState } from "react";
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";

type LoaderGlassApertureProps = {
  exitAt?: number;
  onComplete?: () => void;
};

const FADE = 0.7;
const EASE = [0.19, 1, 0.22, 1] as const;
const IN_OUT = [0.76, 0, 0.24, 1] as const;

const LoaderGlassAperture = ({ exitAt = 1.55, onComplete }: LoaderGlassApertureProps) => {
  const reduce = useReducedMotion();
  const id = useId();
  const [phase, setPhase] = useState<"in" | "out" | "done">("in");
  const finish = useRef(onComplete);
  const count = useMotionValue(0);
  const shown = useTransform(count, (v) => String(Math.round(v)));
  const progress = useTransform(count, (v) => v / 100);

  useEffect(() => {
    finish.current = onComplete;
  });

  useEffect(() => {
    if (reduce) {
      setPhase("done");
      window.dispatchEvent(new CustomEvent("kit:intro"));
      finish.current?.();
      return;
    }
    const run = animate(count, 100, { duration: exitAt - 0.3, delay: 0.15, ease: [0.45, 0, 0.2, 1] });
    const out = window.setTimeout(() => {
      setPhase("out");
      window.dispatchEvent(new CustomEvent("kit:intro"));
    }, exitAt * 1000);
    const done = window.setTimeout(() => {
      setPhase("done");
      finish.current?.();
    }, (exitAt + FADE) * 1000);
    return () => {
      run.stop();
      window.clearTimeout(out);
      window.clearTimeout(done);
    };
  }, [reduce, exitAt, count]);

  if (reduce || phase === "done") return null;

  return (
    <motion.div
      aria-hidden="true"
      initial={{ opacity: 1 }}
      animate={{ opacity: phase === "out" ? 0 : 1 }}
      transition={{ duration: FADE, ease: IN_OUT }}
      className={`fixed inset-0 z-[100000] flex items-center justify-center bg-background text-foreground ${phase === "out" ? "pointer-events-none" : ""}`}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={phase === "out" ? { opacity: 0, scale: 1.25 } : { opacity: 1, scale: 1 }}
        transition={{ duration: phase === "out" ? FADE : 1, ease: phase === "out" ? IN_OUT : EASE }}
        className="relative flex size-[min(20rem,72vw)] items-center justify-center"
      >
        <motion.svg
          viewBox="0 0 100 100"
          animate={{ rotate: 360 }}
          transition={{ duration: 3.2, ease: "linear", repeat: Infinity }}
          className="absolute inset-0 size-full overflow-visible"
        >
          <defs>
            <linearGradient id={`${id}-ring`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.55" />
              <stop offset="45%" stopColor="currentColor" stopOpacity="0.08" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          <circle cx="50" cy="50" r="49.5" fill="none" stroke={`url(#${id}-ring)`} strokeWidth="0.35" vectorEffect="non-scaling-stroke" />
        </motion.svg>
        <svg viewBox="0 0 100 100" className="absolute inset-0 size-full -rotate-90 overflow-visible">
          <motion.circle
            cx="50"
            cy="50"
            r="49.5"
            fill="none"
            stroke="currentColor"
            strokeOpacity="0.7"
            strokeWidth="0.4"
            style={{ pathLength: progress }}
          />
        </svg>
        <motion.p
          initial={{ opacity: 0, y: "0.4em" }}
          animate={{ opacity: 1, y: "0em" }}
          transition={{ duration: 0.8, ease: EASE, delay: 0.1 }}
          className="text-[clamp(2.75rem,5vw,3.75rem)] font-semibold leading-none tracking-[-0.05em] [font-variant-numeric:tabular-nums]"
        >
          {shown}
        </motion.p>
      </motion.div>
    </motion.div>
  );
};

export default LoaderGlassAperture;

"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { useProgress } from "@react-three/drei";

type LoaderRingProgressProps = {
  exitAt?: number;
  maxWait?: number;
  onComplete?: () => void;
};

const FADE = 0.6;

const LoaderRingProgress = ({ exitAt = 2.6, maxWait = 15, onComplete }: LoaderRingProgressProps) => {
  const reduce = useReducedMotion();
  const { active, progress } = useProgress();
  const [minDone, setMinDone] = useState(false);
  const [capped, setCapped] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [done, setDone] = useState(false);
  const [count, setCount] = useState(0);
  const finish = useRef(onComplete);
  const loaded = !active || capped;
  const target = loaded ? 100 : Math.min(99, progress);
  const ready = loaded && count >= 100;

  useEffect(() => {
    finish.current = onComplete;
  });

  const start = useRef(0);
  const targetRef = useRef(target);

  useEffect(() => {
    targetRef.current = target;
  }, [target]);

  useEffect(() => {
    let frame = 0;
    let last = performance.now();
    if (!start.current) start.current = last;
    const pace = Math.max(0.8, reduce ? 0.8 : exitAt - 0.2);
    const step = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      const t = Math.min(1, (now - start.current) / 1000 / pace);
      const ramp = 100 * (1 - Math.pow(1 - t, 2));
      setCount((value) => {
        const goal = Math.min(targetRef.current, Math.max(ramp, value));
        if (value >= goal) return value;
        return Math.min(goal, value + Math.max(dt * 30, (goal - value) * (1 - Math.exp(-dt * 10))));
      });
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [reduce, exitAt]);

  useEffect(() => {
    const min = window.setTimeout(() => setMinDone(true), (reduce ? 0 : exitAt) * 1000);
    const cap = window.setTimeout(() => setCapped(true), maxWait * 1000);
    return () => {
      window.clearTimeout(min);
      window.clearTimeout(cap);
    };
  }, [reduce, exitAt, maxWait]);

  useEffect(() => {
    if (!minDone || !ready || leaving) return;
    setLeaving(true);
    window.dispatchEvent(new CustomEvent("kit:intro"));
  }, [minDone, ready, leaving]);

  useEffect(() => {
    if (!leaving) return;
    const timer = window.setTimeout(
      () => {
        setDone(true);
        finish.current?.();
      },
      (reduce ? 0 : FADE) * 1000,
    );
    return () => window.clearTimeout(timer);
  }, [leaving, reduce]);

  if (done) return null;

  return (
    <motion.div
      aria-hidden="true"
      initial={{ opacity: 1 }}
      animate={{ opacity: leaving ? 0 : 1 }}
      transition={{ duration: reduce ? 0 : FADE, ease: "linear" }}
      className={`${leaving ? "pointer-events-none" : "pointer-events-auto"} fixed inset-0 z-[100000] flex items-center justify-center bg-background text-foreground`}
    >
      <svg viewBox="0 0 700 700" fill="none" className="absolute left-1/2 top-1/2 size-[max(31.25rem,min(95vw,95svh))] -translate-x-1/2 -translate-y-1/2 lg:size-[max(31.25rem,min(80vw,80svh))]">
        <circle cx="350" cy="350" r="345" stroke="currentColor" strokeOpacity="0.07" />
        <motion.circle
          cx="350"
          cy="350"
          r="345"
          stroke="currentColor"
          strokeOpacity="0.1"
          strokeWidth="3"
          transform="rotate(-90 350 350)"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: Math.max(0.02, count / 100) }}
          transition={{ duration: 0.2, ease: "linear" }}
        />
      </svg>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, ease: "linear" }}
        className="relative text-[length:clamp(var(--text-label),0.8333vw,var(--text-small))] leading-none [font-variant-numeric:tabular-nums]"
      >
        {Math.floor(count)}
      </motion.p>
    </motion.div>
  );
};

export default LoaderRingProgress;

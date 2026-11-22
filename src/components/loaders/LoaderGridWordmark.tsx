"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { useProgress } from "@react-three/drei";

type LoaderGridWordmarkProps = {
  brand?: string;
  status?: string;
  minWait?: number;
  maxWait?: number;
  onComplete?: () => void;
};

const FADE = 0.25;

const LoaderGridWordmark = ({ brand = "Studio", status = "Loading", minWait = 0.8, maxWait = 4, onComplete }: LoaderGridWordmarkProps) => {
  const reduce = useReducedMotion();
  const { active, progress } = useProgress();
  const [minDone, setMinDone] = useState(false);
  const [capped, setCapped] = useState(false);
  const [done, setDone] = useState(false);
  const finish = useRef(onComplete);
  const leaving = minDone && ((!active && progress === 100) || capped);

  useEffect(() => {
    finish.current = onComplete;
  });

  useEffect(() => {
    const min = window.setTimeout(() => setMinDone(true), minWait * 1000);
    const cap = window.setTimeout(() => setCapped(true), maxWait * 1000);
    return () => {
      window.clearTimeout(min);
      window.clearTimeout(cap);
    };
  }, [minWait, maxWait]);

  useEffect(() => {
    if (!leaving) return;
    const wait = reduce ? 0 : FADE;
    const start = window.setTimeout(() => window.dispatchEvent(new CustomEvent("kit:intro")), wait * 1000);
    const end = window.setTimeout(() => {
      setDone(true);
      finish.current?.();
    }, wait * 2000);
    return () => {
      window.clearTimeout(start);
      window.clearTimeout(end);
    };
  }, [leaving, reduce]);

  if (done) return null;

  return (
    <motion.div
      aria-hidden="true"
      initial={{ opacity: 1 }}
      animate={{ opacity: leaving ? 0 : 1 }}
      transition={{ duration: reduce ? 0 : FADE, delay: reduce ? 0 : FADE, ease: [0.445, 0.05, 0.55, 0.95] }}
      className={`${leaving ? "pointer-events-none" : "pointer-events-auto"} fixed inset-0 z-[100000] flex items-center justify-center bg-background bg-[linear-gradient(to_right,color-mix(in_srgb,var(--foreground)_5%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_srgb,var(--foreground)_5%,transparent)_1px,transparent_1px)] bg-[length:10vw_10vw] text-foreground lg:bg-[length:2.5vw_2.5vw]`}
    >
      <motion.div
        initial={reduce ? false : { opacity: 0, y: "50%" }}
        animate={{ opacity: 1, y: "0%" }}
        transition={{ duration: 1.25, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="relative flex max-w-[var(--container)] flex-col items-center gap-[1rem] px-[clamp(1.75rem,3vw,3rem)] py-[clamp(1.5rem,3vw,2.5rem)]"
      >
        <div className="absolute left-0 top-0 size-2.5 border-l border-t border-foreground/40" />
        <div className="absolute right-0 top-0 size-2.5 border-r border-t border-foreground/40" />
        <div className="absolute bottom-0 left-0 size-2.5 border-b border-l border-foreground/40" />
        <div className="absolute bottom-0 right-0 size-2.5 border-b border-r border-foreground/40" />
        <p className="bg-[linear-gradient(90deg,color-mix(in_srgb,var(--foreground)_10%,transparent),var(--foreground),color-mix(in_srgb,var(--foreground)_10%,transparent))] bg-[length:300%_100%] bg-clip-text text-center text-[length:var(--text-h2)] uppercase leading-[0.9] text-transparent [animation:kit-gradient-run_2s_ease-in-out_infinite_alternate] [font-family:var(--font-heading)] [font-weight:var(--heading-weight)] [overflow-wrap:anywhere] motion-reduce:[animation:none]">
          {brand}
        </p>
        {status && (
          <div className="flex items-center gap-[0.5em] font-mono text-[length:var(--text-small)] text-muted-foreground">
            <div className="size-[0.5em] shrink-0 bg-accent [animation:kit-status-blink_1s_steps(2,jump-none)_infinite] motion-reduce:[animation:none]" />
            <p className="whitespace-nowrap uppercase leading-none">{status}</p>
          </div>
        )}
      </motion.div>
      <style>{"@keyframes kit-gradient-run{from{background-position:0% 0%}to{background-position:100% 100%}}@keyframes kit-status-blink{from{opacity:1}to{opacity:0.2}}"}</style>
    </motion.div>
  );
};

export default LoaderGridWordmark;

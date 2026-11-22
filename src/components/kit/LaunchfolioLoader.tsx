"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];
const EASE_IN_OUT: [number, number, number, number] = [0.65, 0, 0.35, 1];
const RUN = 1.6;

type LaunchfolioLoaderProps = {
  name: string;
  role?: string;
};

const QUIET = "text-[color:var(--heading-quiet,color-mix(in_srgb,var(--foreground)_49%,var(--background)))]";
const RAILS = "absolute inset-y-0 left-1/2 w-[min(100%_-_var(--gutter),calc(var(--max-w)_+_2*var(--gutter)))] -translate-x-1/2";

const Words = ({ text, start, className }: { text: string; start: number; className: string }) => (
  <div className={className}>
    {text.split(/\s+/).map((word, i) => (
      <motion.div
        key={i}
        initial={{ opacity: 0.001, filter: "blur(6px)", y: 12 }}
        animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
        transition={{ duration: 0.6, ease: EASE_OUT, delay: start + i * 0.06 }}
        className="inline-block [&:not(:last-child)]:mr-[0.25em]"
      >
        {word}
      </motion.div>
    ))}
  </div>
);

const LaunchfolioLoader = ({ name, role = "Portfolio" }: LaunchfolioLoaderProps) => {
  const reduce = useReducedMotion();
  const [gone, setGone] = useState(false);

  useEffect(() => {
    if (reduce) return;
    const timer = window.setTimeout(() => setGone(true), RUN * 1000);
    return () => window.clearTimeout(timer);
  }, [reduce]);

  if (reduce || gone) return null;

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 z-[100] h-svh overflow-clip">
      <motion.div initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ duration: 0.5, ease: "linear", delay: 1.1 }} className="absolute inset-0 bg-background">
        <div className={`${RAILS} border-x border-border`} />
      </motion.div>
      <motion.div
        initial={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        animate={{ opacity: 0, y: -28, filter: "blur(6px)" }}
        transition={{ duration: 0.4, ease: [0.55, 0, 1, 0.45], delay: 0.9 }}
        className="absolute inset-0 flex flex-col items-center justify-center"
      >
        <div className="text-center text-[length:var(--text-h1)] leading-[0.95] tracking-[var(--heading-tracking)] [font-family:var(--font-heading)] [font-weight:var(--heading-weight)]">
          <Words text={role} start={0.05} className={QUIET} />
          <Words text={name} start={0.2} className="text-foreground" />
        </div>
      </motion.div>
      <div className="absolute left-1/2 top-[calc(50%_+_var(--text-h1)*1.3)] w-[min(100%_-_var(--gutter),calc(var(--max-w)_+_2*var(--gutter)))] -translate-x-1/2">
        <motion.div
          initial={{ scaleX: 0, opacity: 1 }}
          animate={{ scaleX: 1, opacity: 0 }}
          transition={{ scaleX: { duration: 0.7, ease: EASE_IN_OUT, delay: 0.15 }, opacity: { duration: 0.3, ease: "linear", delay: 0.95 } }}
          className="h-px origin-left bg-foreground/25"
        />
      </div>
    </div>
  );
};

export default LaunchfolioLoader;

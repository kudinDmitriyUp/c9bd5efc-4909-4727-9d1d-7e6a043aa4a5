"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { useKitMotion } from "@/components/kit/kitMotion";

type LoaderFrameDrawProps = {
  introDelay?: number;
  onComplete?: () => void;
};

const EDGES = [
  { className: "inset-x-0 top-0 border-t", from: "inset(0 100% 0 0)" },
  { className: "inset-y-0 right-0 border-r", from: "inset(0 0 100% 0)" },
  { className: "inset-x-0 bottom-0 border-b", from: "inset(0 0 0 100%)" },
  { className: "inset-y-0 left-0 border-l", from: "inset(100% 0 0 0)" },
];

const LoaderFrameDraw = ({ introDelay = 1, onComplete }: LoaderFrameDrawProps) => {
  const reduce = useReducedMotion();
  const { ease } = useKitMotion();
  const [done, setDone] = useState(false);
  const finish = useRef(onComplete);
  const chipRef = useRef<HTMLDivElement>(null);
  const chipText = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    finish.current = onComplete;
  });

  useEffect(() => {
    if (reduce) {
      finish.current?.();
      return;
    }
    const source = document.querySelector<HTMLElement>("[data-hero-chip]");
    const chip = chipRef.current;
    if (!source || !chip || !chipText.current) return;
    const r = source.getBoundingClientRect();
    chip.style.left = `${r.left}px`;
    chip.style.top = `${r.top}px`;
    chip.style.display = "flex";
    chipText.current.textContent = source.querySelector("p")?.textContent ?? "";
  }, [reduce]);

  if (reduce || done) return null;

  const leave = Math.max(0.8, introDelay - 0.1);

  return (
    <motion.div
      aria-hidden="true"
      initial={{ opacity: 1 }}
      animate={{ opacity: 0 }}
      transition={{ duration: 0.5, ease, delay: leave }}
      onAnimationComplete={() => {
        setDone(true);
        finish.current?.();
      }}
      className="pointer-events-none fixed inset-0 z-[100000] bg-background"
    >
      <div className="absolute inset-x-0 top-[4rem] bottom-[clamp(1rem,3svh,1.5rem)] mx-auto w-[var(--container)]">
        {EDGES.map((edge, i) => (
          <motion.div
            key={i}
            initial={{ clipPath: edge.from }}
            animate={{ clipPath: "inset(0 0 0 0)" }}
            transition={{ duration: 0.7, ease }}
            className={`absolute border-dashed border-border ${edge.className}`}
          />
        ))}
      </div>
      <motion.div
        ref={chipRef}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, ease, delay: 0.35 }}
        className="absolute hidden items-center gap-[0.75rem] whitespace-nowrap rounded-full bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] py-[0.3125rem] pl-[0.625rem] pr-[0.3125rem] text-accent"
      >
        <p ref={chipText} className="font-mono text-[length:var(--text-label)] uppercase leading-[1.6] tracking-[0.02em]" />
        <div className="grid size-[1rem] place-items-center rounded-full bg-accent text-accent-foreground">
          <svg viewBox="0 0 12 12" className="size-[0.5rem]" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M3.5 8.5 8.5 3.5M4.5 3.5h4v4" />
          </svg>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default LoaderFrameDraw;

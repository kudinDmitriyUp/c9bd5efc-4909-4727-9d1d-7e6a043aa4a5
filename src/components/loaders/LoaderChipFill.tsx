"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";

type LoaderChipFillProps = {
  label?: string;
  onComplete?: () => void;
  target?: string;
};

type Box = { top: number; left: number; width: number; height: number; borderRadius: number };

const FILL_AT = 0.3;
const GROW_AT = 1.1;
const GROW = 0.9;
const spring = { type: "spring", bounce: 0.2, duration: 0.8 } as const;
const calm = [0.22, 1, 0.36, 1] as const;
const grow = [0.65, 0, 0.35, 1] as const;

const boxOf = (element: Element, radius: number): Box => {
  const rect = element.getBoundingClientRect();
  return { top: rect.top, left: rect.left, width: rect.width, height: rect.height, borderRadius: radius };
};

const LoaderChipFill = ({ label = "Loading", onComplete, target = "[data-hero-board]" }: LoaderChipFillProps) => {
  const reduce = useReducedMotion();
  const [visible, setVisible] = useState(true);
  const [filled, setFilled] = useState(false);
  const [morph, setMorph] = useState<{ from: Box; to: Box } | null>(null);
  const [leaving, setLeaving] = useState(false);
  const chipRef = useRef<HTMLDivElement>(null);
  const done = useRef(onComplete);

  useEffect(() => {
    done.current = onComplete;
  });

  useEffect(() => {
    if (reduce) {
      setVisible(false);
      done.current?.();
      return;
    }
    const timers = [
      window.setTimeout(() => setFilled(true), FILL_AT * 1000),
      window.setTimeout(() => {
        const chip = chipRef.current;
        const board = document.querySelector(target);
        if (chip && board) {
          const radius = parseFloat(getComputedStyle(board).borderTopLeftRadius) || 24;
          setMorph({ from: boxOf(chip, 20), to: boxOf(board, radius) });
        }
        setLeaving(true);
      }, GROW_AT * 1000),
      window.setTimeout(() => {
        setVisible(false);
        done.current?.();
      }, (GROW_AT + GROW + 0.2) * 1000),
    ];
    return () => timers.forEach(window.clearTimeout);
  }, [reduce, target]);

  if (!visible || reduce) return null;

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[100]">
      <motion.div
        initial={false}
        animate={{ opacity: leaving ? 0 : 1 }}
        transition={{ duration: 0.5, ease: calm, delay: leaving ? 0.1 : 0 }}
        className="absolute inset-0 bg-background"
      />
      {morph && (
        <motion.div
          initial={morph.from}
          animate={morph.to}
          transition={{ duration: GROW, ease: grow }}
          className="absolute overflow-hidden bg-card"
        >
          <motion.div initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ duration: 0.5, ease: calm }} className="absolute inset-0 bg-accent" />
        </motion.div>
      )}
      <div className="absolute inset-0 flex items-center justify-center px-[var(--gutter)]">
        <motion.div
          ref={chipRef}
          initial={{ opacity: 0, y: 16, scale: 0.92 }}
          animate={leaving ? { opacity: 0, y: 0, scale: 1 } : { opacity: 1, y: 0, scale: 1 }}
          transition={leaving ? { duration: 0.25, ease: calm } : spring}
          className="relative isolate flex h-[4rem] max-w-full items-center gap-[1.5rem] overflow-hidden rounded-[1.25rem] bg-card pl-[5rem] pr-[1.75rem] text-card-foreground shadow-[0_1.5rem_3rem_-1.5rem_color-mix(in_srgb,var(--deep)_30%,transparent)]"
        >
          <div
            className={`absolute bottom-[0.25rem] left-[0.25rem] top-[0.25rem] -z-1 rounded-[1rem] bg-accent transition-[width] duration-700 ease-[cubic-bezier(0.65,0,0.35,1)] ${filled ? "w-[calc(100%-0.5rem)]" : "w-[3.5rem]"}`}
          />
          <motion.svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ x: -10, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ ...spring, delay: 0.15 }}
            className="absolute left-[1.25rem] top-1/2 size-[1.5rem] -translate-y-1/2 text-accent-foreground"
          >
            <path d="M4 12h16M13 5l7 7-7 7" />
          </motion.svg>
          <div className="overflow-hidden">
            <motion.p
              initial={{ y: "110%" }}
              animate={{ y: "0%" }}
              transition={{ ...spring, delay: 0.12 }}
              className={`truncate font-[family-name:var(--font-heading)] text-[length:var(--text-body-lg)] leading-[1.4] tracking-[-0.02em] transition-colors duration-700 ${filled ? "text-accent-foreground" : ""}`}
            >
              {label}
            </motion.p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default LoaderChipFill;

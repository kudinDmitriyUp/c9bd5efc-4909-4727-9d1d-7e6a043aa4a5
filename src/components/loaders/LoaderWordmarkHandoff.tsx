"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";

type LoaderWordmarkHandoffProps = {
  brand?: string;
  mark?: string;
  introDelay?: number;
  onComplete?: () => void;
};

const EXPO_OUT = [0.19, 1, 0.22, 1] as const;

const LoaderWordmarkHandoff = ({ brand = "Ostra", mark, introDelay = 1.7, onComplete }: LoaderWordmarkHandoffProps) => {
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState<"in" | "out" | "done">("in");
  const finish = useRef(onComplete);
  const letters = Array.from(brand);

  useEffect(() => {
    finish.current = onComplete;
  });

  useEffect(() => {
    if (reduce) {
      window.dispatchEvent(new Event("kit:intro"));
      setPhase("done");
      finish.current?.();
      return;
    }
    const leave = window.setTimeout(() => {
      window.dispatchEvent(new Event("kit:intro"));
      setPhase("out");
    }, introDelay * 1000);
    const end = window.setTimeout(() => {
      setPhase("done");
      finish.current?.();
    }, (introDelay + 0.3) * 1000);
    return () => {
      window.clearTimeout(leave);
      window.clearTimeout(end);
    };
  }, [reduce, introDelay]);

  if (reduce || phase === "done") return null;

  const out = phase === "out";

  return (
    <motion.div
      aria-hidden="true"
      initial={{ clipPath: "inset(0% 0% 0% 0%)" }}
      animate={{ clipPath: out ? "inset(0% 0% 100% 0%)" : "inset(0% 0% 0% 0%)" }}
      transition={{ duration: 0.3, ease: [0.52, 0, 0, 1] }}
      className={`fixed inset-0 z-[60] flex items-center justify-center bg-background text-foreground ${out ? "pointer-events-none" : ""}`}
    >
      <motion.div
        animate={out ? { y: -24, opacity: 0 } : { y: 0, opacity: 1 }}
        transition={{ duration: 0.3, ease: EXPO_OUT }}
        className="flex items-start"
      >
        <div className="flex overflow-hidden pb-[0.15em] -mb-[0.15em] text-[length:var(--text-h3)] leading-none tracking-[-0.04em]">
          {letters.map((char, i) => (
            <motion.div
              key={i}
              initial={{ y: "110%" }}
              animate={{ y: "0%" }}
              transition={{ duration: 0.9, ease: EXPO_OUT, delay: 0.15 + i * 0.05 }}
              className="whitespace-pre"
            >
              {char}
            </motion.div>
          ))}
        </div>
        {mark && (
          <motion.p
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: EXPO_OUT, delay: 0.25 + letters.length * 0.05 }}
            className="ml-[0.15em] text-[length:calc(var(--text-h3)*0.55)] leading-none text-accent"
          >
            {mark}
          </motion.p>
        )}
      </motion.div>
    </motion.div>
  );
};

export default LoaderWordmarkHandoff;

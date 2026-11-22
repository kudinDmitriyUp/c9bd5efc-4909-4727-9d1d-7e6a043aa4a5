"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";

type LoaderGlyphColumnsProps = {
  brand?: string;
  introDelay?: number;
  onComplete?: () => void;
};

const COLUMNS = 12;
const POOL = " .:*+<>/oO#";
const EASE_IN_OUT = [0.52, 0, 0, 1] as const;
const hash = (n: number) => {
  const v = Math.sin(n * 12.9898 + 4.1) * 43758.5453;
  return v - Math.floor(v);
};

const LoaderGlyphColumns = ({ brand = "Northvane", introDelay = 1.4, onComplete }: LoaderGlyphColumnsProps) => {
  const reduce = useReducedMotion();
  const [done, setDone] = useState(false);
  const [label, setLabel] = useState("");
  const finish = useRef(onComplete);

  useEffect(() => {
    finish.current = onComplete;
  });

  useEffect(() => {
    if (reduce) {
      setDone(true);
      finish.current?.();
      return;
    }
    const chars = Array.from(brand.toUpperCase());
    const steps = Math.round(500 / 30);
    let step = 0;
    let interval = 0;
    const begin = window.setTimeout(() => {
      interval = window.setInterval(() => {
        step++;
        const settled = Math.floor((step / steps) * chars.length);
        setLabel(chars.map((c, i) => (i < settled || c === " " ? c : POOL[(i * 5 + step) % POOL.length])).join(""));
        if (step >= steps) window.clearInterval(interval);
      }, 30);
    }, 600);
    const end = window.setTimeout(() => {
      setDone(true);
      finish.current?.();
    }, (introDelay + 1) * 1000);
    return () => {
      window.clearTimeout(begin);
      window.clearTimeout(end);
      window.clearInterval(interval);
    };
  }, [reduce, brand, introDelay]);

  if (reduce || done) return null;

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[100000]">
      {Array.from({ length: COLUMNS }, (_, c) => {
        const h = hash(c + 1);
        const speed = 1.2 + h;
        return (
          <motion.div
            key={c}
            initial={{ y: "0%" }}
            animate={{ y: "-101%" }}
            transition={{ duration: 0.75 / (speed / 1.2), delay: introDelay + hash(c + 31) * 0.15, ease: EASE_IN_OUT }}
            className="absolute inset-y-0 overflow-hidden bg-background will-change-transform"
            style={{ left: `${(c * 100) / COLUMNS}%`, width: `${100 / COLUMNS}%` }}
          >
            <div className="absolute inset-y-0 flex flex-col items-center justify-center gap-[1rem]" style={{ left: `${-c * 100}%`, width: `${COLUMNS * 100}%` }}>
              <div className="flex gap-[0.1875rem]">
                {Array.from({ length: 5 }, (_, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0.15 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.05, delay: 0.1 + i * 0.1 }}
                    className="size-[0.3125rem] bg-accent"
                  />
                ))}
              </div>
              <p className="h-[1em] whitespace-pre tabular-nums text-[length:var(--text-label)] uppercase leading-none tracking-[var(--label-tracking)] text-foreground">{label}</p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

export default LoaderGlyphColumns;

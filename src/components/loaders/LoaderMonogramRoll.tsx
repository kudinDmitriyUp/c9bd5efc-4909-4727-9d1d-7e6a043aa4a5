"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

interface LoaderMonogramRollProps {
  text?: string;
  caption?: string;
  className?: string;
}

const LoaderMonogramRoll = ({ text = "Northwind", caption, className = "" }: LoaderMonogramRollProps) => {
  const [done, setDone] = useState(false);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (done || reduce) return;
    document.body.style.overflow = "hidden";
    const release = window.setTimeout(() => setDone(true), 2600);
    return () => {
      window.clearTimeout(release);
      document.body.style.overflow = "";
    };
  }, [done, reduce]);

  if (done || reduce) return null;

  return (
    <motion.div
      aria-hidden="true"
      initial={{ opacity: 1 }}
      animate={{ opacity: 0 }}
      transition={{ delay: 1.6, duration: 0.35, ease: [0.53, 0.23, 0.25, 1] }}
      onAnimationComplete={() => setDone(true)}
      className={cn("fixed inset-0 z-[99999] h-svh bg-foreground text-background", className)}
    >
      <div className="absolute inset-x-0 top-0 h-[0.3rem] overflow-hidden">
        <motion.div
          initial={{ x: "-100%" }}
          animate={{ x: ["-100%", "-42%", "-42%", "0%"] }}
          transition={{ duration: 2.2, times: [0, 0.45, 0.55, 1], ease: [0.76, 0, 0.24, 1] }}
          className="size-full bg-background"
        />
      </div>
      <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-end gap-x-6 gap-y-3 px-[var(--site-margin)] pb-[var(--site-margin)]">
        <div className="flex text-[min(16rem,38vw)] font-[650] leading-[0.8] tracking-[-0.03em]">
          {[...text].map((char, i) => (
            <div key={i} className="relative overflow-hidden">
              <motion.p
                initial={{ y: "0%" }}
                animate={{ y: "-100%" }}
                transition={{ duration: 0.875, ease: [0.83, 0, 0.17, 1] }}
                className="whitespace-pre"
              >
                {char}
              </motion.p>
              <motion.p
                initial={{ y: "100%" }}
                animate={{ y: "0%" }}
                transition={{ duration: 0.875, ease: [0.83, 0, 0.17, 1] }}
                className="absolute inset-0 whitespace-pre"
              >
                {char}
              </motion.p>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 pb-[0.4em] text-sm uppercase font-[650] leading-none">
          <motion.svg
            viewBox="0 0 16 16"
            animate={{ rotate: 360 }}
            transition={{ duration: 0.6, ease: "linear", repeat: Infinity }}
            className="size-[1em]"
          >
            <circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="28 41" strokeLinecap="round" />
          </motion.svg>
          {caption && <p>{caption}</p>}
        </div>
      </div>
    </motion.div>
  );
};

export default LoaderMonogramRoll;

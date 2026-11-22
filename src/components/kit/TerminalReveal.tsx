"use client";

import { useRef, type ReactNode } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

const EXPO_OUT = [0.19, 1, 0.22, 1] as const;

type TerminalRevealProps = {
  children?: ReactNode;
  delay?: number;
  className?: string;
  innerClassName?: string;
};

const DEFAULT_CHILDREN = (
  <div className="bg-card text-foreground rounded-theme p-6">
    <h3 className="text-2xl font-medium">Design that ships</h3>
    <p className="text-sm opacity-70">Built for the long run</p>
  </div>
);

const TerminalReveal = ({ children = DEFAULT_CHILDREN,delay = 0, className, innerClassName }: TerminalRevealProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const inView = useInView(ref, { once: true, margin: "0px 0px -6% 0px" });
  const shown = !!reduce || inView;

  return (
    <div ref={ref} className={cn("relative", className)}>
      <motion.div
        initial={reduce ? false : { clipPath: "inset(14% 8% 14% 8% round 0.75rem)", opacity: 0 }}
        animate={shown ? { clipPath: "inset(0% 0% 0% 0% round 0rem)", opacity: 1 } : undefined}
        transition={{ duration: 1.3, ease: EXPO_OUT, delay, opacity: { duration: 0.4, delay } }}
        className={cn("size-full", innerClassName)}
      >
        <motion.div
          initial={reduce ? false : { scale: 1.18 }}
          animate={shown ? { scale: 1 } : undefined}
          transition={{ duration: 1.6, ease: EXPO_OUT, delay }}
          className="size-full"
        >
          {children}
        </motion.div>
      </motion.div>
    </div>
  );
};

export default TerminalReveal;

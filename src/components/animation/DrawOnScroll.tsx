"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

interface DrawOnScrollProps {
  d: string | string[];
  viewBox: string;
  className?: string;
  strokeWidth?: number;
  scrub?: boolean;
}

const DrawOnScroll = ({ d, viewBox, className = "", strokeWidth = 2, scrub = true }: DrawOnScrollProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const paths = Array.isArray(d) ? d : [d];
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.8", "end 0.3"] });
  const opacity = useTransform(scrollYProgress, [0, 0.02], [0, 1]);
  const [, , width = 1, height = 1] = viewBox.split(/[\s,]+/).map(Number);
  const line = height / width < 0.05;

  return (
    <div ref={ref} aria-hidden="true" className={cn("relative w-full text-foreground", className)}>
      <svg viewBox={viewBox} fill="none" preserveAspectRatio={line ? "none" : undefined} className={cn("block w-full overflow-visible", line ? "h-px" : "h-full")}>
        {paths.map((path, i) =>
          reduce ? (
            <path key={i} d={path} stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
          ) : scrub ? (
            <motion.path
              key={i}
              d={path}
              stroke="currentColor"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ pathLength: scrollYProgress, opacity }}
            />
          ) : (
            <motion.path
              key={i}
              d={path}
              stroke="currentColor"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0, opacity: 0 }}
              whileInView={{ pathLength: 1, opacity: 1 }}
              viewport={{ once: true, margin: "0px 0px -20% 0px" }}
              transition={{
                pathLength: { duration: 1.6, delay: i * 0.15, ease: [0.65, 0, 0.35, 1] },
                opacity: { duration: 0.01, delay: i * 0.15 },
              }}
            />
          )
        )}
      </svg>
    </div>
  );
};

export default DrawOnScroll;

"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

const PATHS = {
  wave: "M-60 260C300 120 520 520 860 420S1300 80 1500 160",
  swoop: "M-60 140C380 220 700 700 1040 760S1400 600 1500 420",
  loop: "M-60 620C300 520 560 860 760 640S700 180 1000 260S1380 520 1500 360",
  coil: "M-60 780C300 860 760 900 1060 660S1180 120 720 110S220 360 420 620S1060 860 1500 640",
};

type MoreRibbonProps = {
  shape?: keyof typeof PATHS;
  flip?: boolean;
  className?: string;
};

const MoreRibbon = ({ shape = "wave", flip = false, className }: MoreRibbonProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const pathLength = useTransform(scrollYProgress, (v) => Math.min(1, Math.max(0.02, v * 1.6)));

  return (
    <div ref={ref} aria-hidden="true" className={cn("pointer-events-none absolute inset-0", className)}>
    <svg
      viewBox="0 0 1440 900"
      preserveAspectRatio="none"
      className={cn("h-full w-full text-secondary", flip && "-scale-x-100")}
    >
      <motion.path
        d={PATHS[shape]}
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        style={{ pathLength: reduce ? 1 : pathLength, strokeWidth: "clamp(18px, 2.2vw, 36px)" }}
      />
    </svg>
    </div>
  );
};

export default MoreRibbon;

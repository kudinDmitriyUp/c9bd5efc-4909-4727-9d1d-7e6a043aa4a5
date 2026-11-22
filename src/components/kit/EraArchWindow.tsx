"use client";

import { useRef, type ReactNode } from "react";
import { motion, useMotionTemplate, useReducedMotion, useScroll, useTransform } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

type EraArchWindowProps = {
  children?: ReactNode;
  className?: string;
};

const EraArchWindow = ({ children, className }: EraArchWindowProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const top = useTransform(scrollYProgress, [0, 0.5], [38, -45], { clamp: true });
  const side = useTransform(scrollYProgress, [0, 0.5], [24, -45], { clamp: true });
  const clipPath = useMotionTemplate`inset(${top}% ${side}% 0% ${side}% round 9999px 9999px 0px 0px)`;
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [1.2, 1.05, 1]);
  const y = useTransform(scrollYProgress, [0, 1], ["-4%", "4%"]);

  return (
    <div ref={ref} className={cn("relative overflow-hidden", className)}>
      <motion.div style={reduce ? undefined : { clipPath }} className="absolute inset-0">
        <motion.div style={reduce ? undefined : { scale, y }} className="absolute inset-0">
          {children}
        </motion.div>
      </motion.div>
    </div>
  );
};

export default EraArchWindow;

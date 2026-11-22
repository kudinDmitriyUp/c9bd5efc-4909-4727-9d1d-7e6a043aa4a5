"use client";

import { useRef } from "react";
import type { CSSProperties } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

interface SectionGradientEdgeProps {
  from?: string;
  to?: string;
  accent?: string;
  position?: "top" | "bottom";
  animate?: boolean;
  className?: string;
}

const SectionGradientEdge = ({
  from = "var(--background)",
  to = "var(--foreground)",
  accent = "var(--primary)",
  position = "top",
  animate = true,
  className = "",
}: SectionGradientEdgeProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const width = useTransform(scrollYProgress, [0, 1], ["100%", "120%"]);
  const moving = animate && !reduce;
  const origin = position === "top" ? "50% 0%" : "50% 100%";

  const style = {
    "--from": from,
    "--to": to,
    "--accent-color": accent,
    "--edge-w": moving ? width : "120%",
    background: `linear-gradient(${position === "top" ? "to bottom" : "to top"}, var(--from), transparent 30%), radial-gradient(var(--edge-w) 100% at ${origin}, var(--from) 35%, var(--from) 45%, color-mix(in oklab, var(--accent-color) 25%, var(--from)) 58%, color-mix(in oklab, var(--accent-color) 70%, var(--from)) 68%, var(--accent-color) 75%, color-mix(in oklab, var(--accent-color) 55%, var(--to)) 85%, color-mix(in oklab, var(--accent-color) 20%, var(--to)) 93%, var(--to) 100%)`,
  } as unknown as CSSProperties;

  return (
    <motion.div
      ref={ref}
      aria-hidden="true"
      className={cn("pointer-events-none relative h-[50svh] w-full select-none", className)}
      style={style}
    />
  );
};

export default SectionGradientEdge;

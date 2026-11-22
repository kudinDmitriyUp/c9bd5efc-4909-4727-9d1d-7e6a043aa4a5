"use client";

import { useRef } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";
import { useKitMotion } from "@/components/kit/kitMotion";

type CornerTicksProps = {
  className?: string;
  delay?: number;
  show?: boolean;
  size?: string;
};

const CORNERS = [
  { place: "left-0 top-0 border-l border-t", x: -1, y: -1 },
  { place: "right-0 top-0 border-r border-t", x: 1, y: -1 },
  { place: "bottom-0 left-0 border-b border-l", x: -1, y: 1 },
  { place: "bottom-0 right-0 border-b border-r", x: 1, y: 1 },
];

const CornerTicks = ({ className, delay = 0, show, size = "0.75rem" }: CornerTicksProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -8% 0px" });
  const reduce = useReducedMotion();
  const { ease } = useKitMotion();
  const on = Boolean(reduce) || (show ?? inView);

  return (
    <div ref={ref} aria-hidden="true" className={`pointer-events-none absolute inset-0 z-[2] overflow-x-clip ${className ?? ""}`}>
      {CORNERS.map((corner) => (
        <motion.div
          key={corner.place}
          className={`absolute border-[color-mix(in_srgb,var(--foreground)_55%,transparent)] ${corner.place}`}
          style={{ width: size, height: size }}
          initial={reduce ? false : { opacity: 0, x: `${corner.x * 1.5}rem`, y: `${corner.y * 1.5}rem` }}
          animate={on ? { opacity: 1, x: "0rem", y: "0rem" } : { opacity: 0, x: `${corner.x * 1.5}rem`, y: `${corner.y * 1.5}rem` }}
          transition={{ duration: 0.5, delay, ease }}
        />
      ))}
    </div>
  );
};

export default CornerTicks;

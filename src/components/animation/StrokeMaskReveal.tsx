"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

const strokes = [
  "M -0.1 0.08 L 1.1 -0.12",
  "M 1.1 0.18 L -0.1 0.38",
  "M -0.1 0.68 L 1.1 0.48",
  "M 1.1 0.78 L -0.1 0.98",
  "M -0.1 1.28 L 1.1 1.08",
];

interface StrokeMaskRevealProps {
  children: ReactNode;
  className?: string;
  duration?: number;
  stagger?: number;
}

const StrokeMaskReveal = ({ children, className = "", duration = 2.4, stagger = 0.3 }: StrokeMaskRevealProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const id = `stroke-mask-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const enter = useInView(ref, { margin: "0px 0px -35% 0px" });
  const near = useInView(ref, { margin: "0px 0px -15% 0px" });
  const [played, setPlayed] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (enter) setPlayed(true);
  }, [enter]);

  useEffect(() => {
    if (near || !ref.current) return;
    if (ref.current.getBoundingClientRect().top > window.innerHeight * 0.85) {
      setPlayed(false);
      setDone(false);
    }
  }, [near]);

  const masked = !reduce && !done;

  return (
    <div
      ref={ref}
      style={masked ? { maskImage: `url(#${id})`, WebkitMaskImage: `url(#${id})` } : undefined}
      className={cn("relative", className)}
    >
      {!reduce && (
        <svg aria-hidden="true" width="0" height="0" className="absolute">
          <mask id={id} maskUnits="objectBoundingBox" maskContentUnits="objectBoundingBox" x="0" y="0" width="1" height="1">
            {strokes.map((d, i) => (
              <motion.path
                key={i}
                d={d}
                fill="none"
                stroke="#fff"
                strokeWidth={0.36}
                strokeLinecap="butt"
                pathLength={1}
                strokeDasharray="1 1"
                initial={{ strokeDashoffset: 1 }}
                animate={{ strokeDashoffset: played ? 0 : 1 }}
                transition={played ? { duration, delay: i * stagger, ease: [0.65, 0, 0.35, 1] } : { duration: 0 }}
                onAnimationComplete={() => {
                  if (played && i === strokes.length - 1) setDone(true);
                }}
              />
            ))}
          </mask>
        </svg>
      )}
      {children}
    </div>
  );
};

export default StrokeMaskReveal;

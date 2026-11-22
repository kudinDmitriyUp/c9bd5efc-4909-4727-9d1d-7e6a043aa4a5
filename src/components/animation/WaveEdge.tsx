"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useSpring, useTime, useTransform, type MotionValue } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

const LOOP = 2.4;
const TRACKS = [
  { delay: 0, duration: 1, from: [135, 65, 155], to: [155, 45, 175] },
  { delay: 0.3, duration: 2, from: [105, 137], to: [85, 160] },
  { delay: 0.6, duration: 1.8, from: [105, 105], to: [130, 80] },
];

const sineInOut = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;

// eslint-disable-next-line react-refresh/only-export-components
export const waveValues = (seconds: number) => {
  const phase = seconds % (LOOP * 2);
  const tau = phase > LOOP ? LOOP * 2 - phase : phase;
  return TRACKS.flatMap((track) => {
    const p = sineInOut(Math.min(1, Math.max(0, (tau - track.delay) / track.duration)));
    return track.from.map((from, i) => from + (track.to[i] - from) * p);
  });
};

// eslint-disable-next-line react-refresh/only-export-components
export const wavePath = (values: number[], side: "top" | "bottom", width = 1536, height = 300, depth = 1, offsetY = 0) => {
  const [v, s1c, s1e, s2c, s2e, s3c, s3e] = values.map((n) => (n / 300) * height * depth);
  const k = width / 1536;
  const y = (n: number) => offsetY + (side === "bottom" ? n : height - n);
  const base = offsetY + (side === "bottom" ? 0 : height);
  return `M${width},${base} H${-1 * k} V${y(v)} S${184.32 * k},${y(s1c)} ${460.8 * k},${y(s1e)} S${860.16 * k},${y(s2c)} ${1121.28 * k},${y(s2e)} S${1413.12 * k},${y(s3c)} ${width},${y(s3e)} V${base} Z`;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useWaveClock = (): MotionValue<number[]> => {
  const time = useTime();
  const reduce = useReducedMotion();
  return useTransform(time, (ms) => waveValues(reduce ? 0 : ms / 1000));
};

type WaveEdgeProps = {
  side?: "top" | "bottom";
  inside?: boolean;
  color?: string;
  className?: string;
};

const WaveEdge = ({ side = "bottom",inside = false, color, className }: WaveEdgeProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const values = useWaveClock();
  const shape = inside ? (side === "top" ? "bottom" : "top") : side;
  const d = useTransform(values, (v) => wavePath(v, shape));
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.9", "end 0.1"] });
  const stretch = useSpring(useTransform(scrollYProgress, [0, 1], [1, 1.5]), { stiffness: 120, damping: 30 });

  return (
    <motion.div
      ref={ref}
      aria-hidden="true"
      style={{ scaleY: reduce ? 1 : stretch, originY: shape === "bottom" ? 0 : 1, color }}
      className={cn(
        "pointer-events-none absolute inset-x-0 z-10 h-[var(--wave-h,clamp(5rem,16vw,18.75rem))]",
        inside ? (side === "top" ? "-top-px" : "-bottom-px") : side === "top" ? "bottom-[calc(100%-1px)]" : "top-[calc(100%-1px)]",
        className
      )}
    >
      <svg viewBox="0 0 1536 300" preserveAspectRatio="none" className="block size-full">
        <motion.path d={d} fill="currentColor" />
      </svg>
    </motion.div>
  );
};

export default WaveEdge;

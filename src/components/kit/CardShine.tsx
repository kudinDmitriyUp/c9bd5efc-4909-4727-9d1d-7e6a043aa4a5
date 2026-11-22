"use client";

import { useRef, type ReactNode } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";
import { useKitMotion } from "@/components/kit/kitMotion";

type Ring = { inset: string; className?: string };

export const HaloRings = ({ rings, breathe = true, delay = 0, className, children }: { rings: Ring[]; breathe?: boolean; delay?: number; className?: string; children?: ReactNode }) => {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const kit = useKitMotion();
  const inView = useInView(ref, { margin: "10% 0px 10% 0px" });

  return (
    <div ref={ref} aria-hidden="true" data-live={breathe && inView && !reduce ? "" : undefined} className={`halo-rings pointer-events-none ${className ?? ""}`}>
      {rings.map((ring, index) => (
        <svg key={index} viewBox="0 0 100 100" style={{ inset: ring.inset, animationDelay: `${index * -3}s` }} className={`absolute overflow-visible ${breathe ? "halo-ring" : ""} ${ring.className ?? "text-border"}`}>
          <motion.circle
            cx="50"
            cy="50"
            r="49.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
            transform="rotate(-90 50 50)"
            initial={reduce ? false : { pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true }}
            transition={{ duration: kit.slow * 2, ease: kit.ease, delay: delay + index * 0.18 }}
          />
        </svg>
      ))}
      {children}
    </div>
  );
};

const light = (amount: number) => `color-mix(in srgb, var(--foreground) ${amount}%, transparent)`;

export const CardReveal = ({ index = 0, className, children }: { index?: number; className?: string; children?: ReactNode }) => {
  const reduce = useReducedMotion();
  const kit = useKitMotion();

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, scale: 0.92, rotateX: 16, y: 48 }}
      whileInView={{ opacity: 1, scale: 1, rotateX: 0, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -8% 0px" }}
      transition={{ duration: kit.slow, ease: kit.ease, delay: index * 0.09 }}
      style={{ transformPerspective: 1200, transformOrigin: "50% 100%" }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

const CardShine = () => (
  <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-[1] overflow-hidden rounded-[inherit]">
    <div style={{ background: `linear-gradient(180deg, ${light(4)}, transparent 40%)` }} className="absolute inset-0" />
    <div style={{ background: `linear-gradient(90deg, transparent, ${light(32)} 30%, ${light(32)} 70%, transparent)` }} className="absolute inset-x-0 top-0 h-px" />
  </div>
);

export default CardShine;

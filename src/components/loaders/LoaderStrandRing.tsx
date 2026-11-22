"use client";

import { useEffect, useRef, useState } from "react";
import { cubicBezier, useReducedMotion } from "motion/react";
import { introSignal } from "@/components/kit/introSignal";
import LoaderStackLayers from "@/components/loaders/LoaderStackLayers";

type LoaderStrandRingProps = {
  brand?: string;
  introDelay?: number;
  onComplete?: () => void;
};

const drawEase = cubicBezier(0.33, 1, 0.68, 1);
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const RING = 2 * Math.PI * 47;

const RingCount = ({ brand, fillEnd }: { brand: string; fillEnd: number }) => {
  const mark = useRef<HTMLDivElement>(null);
  const arc = useRef<SVGCircleElement>(null);
  const number = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    let frame = 0;
    let t = 0;
    let last = -1;
    let shown = -1;
    const tick = (now: number) => {
      t += last < 0 ? 0 : Math.min(1 / 30, (now - last) / 1000);
      last = now;
      const d = drawEase(clamp01((t - 0.05) / (fillEnd - 0.05)));
      if (arc.current) arc.current.style.strokeDashoffset = String(RING * (1 - d));
      const value = Math.round(d * 100);
      if (number.current && value !== shown) {
        shown = value;
        number.current.textContent = String(value);
      }
      if (mark.current) mark.current.style.opacity = String(clamp01(t / 0.2));
      if (t < fillEnd) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [fillEnd]);

  return (
    <div ref={mark} className="relative flex size-[6.75rem] items-center justify-center opacity-0">
      <p className="sr-only">{brand}</p>
      <svg viewBox="0 0 100 100" fill="none" className="absolute inset-0 size-full -rotate-90">
        <circle cx="50" cy="50" r="47" stroke="currentColor" strokeWidth="0.75" className="text-foreground/10" />
        <circle ref={arc} cx="50" cy="50" r="47" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeDasharray={RING} strokeDashoffset={RING} className="text-primary" />
      </svg>
      <p ref={number} className="text-[length:var(--text-h3)] font-normal leading-none tracking-[-0.02em] tabular-nums text-foreground">
        0
      </p>
    </div>
  );
};

export default function LoaderStrandRing({ brand = "Switchyard", introDelay = 1.4, onComplete }: LoaderStrandRingProps) {
  const reduce = useReducedMotion();
  const [playing] = useState(() => {
    if (typeof window === "undefined" || introSignal.isRevealed()) return false;
    introSignal.claim();
    return true;
  });
  const finish = useRef(onComplete);
  const liftAt = Math.max(0.6, introDelay - 0.45);
  const fillEnd = liftAt - 0.1;

  useEffect(() => {
    finish.current = onComplete;
  });

  useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(() => introSignal.reveal(), (reduce ? 0 : introDelay) * 1000);
    return () => window.clearTimeout(timer);
  }, [playing, reduce, introDelay]);

  if (!playing) return null;

  return (
    <LoaderStackLayers
      onComplete={() => finish.current?.()}
      liftAt={liftAt}
      doneAt={liftAt + 0.95}
      coverClassName="bg-[color-mix(in_oklab,var(--primary)_8%,var(--background))]"
      curtainClassNames={["text-[color-mix(in_oklab,var(--primary)_45%,var(--background))]", "text-primary", "text-[color-mix(in_oklab,var(--primary)_8%,var(--background))]"]}
      intro={<RingCount brand={brand} fillEnd={fillEnd} />}
    />
  );
}

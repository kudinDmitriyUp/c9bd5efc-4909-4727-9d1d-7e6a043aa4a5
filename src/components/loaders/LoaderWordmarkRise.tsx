"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useFitWidth } from "@/components/kit/useFitWidth";
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import LoaderStackLayers from "@/components/loaders/LoaderStackLayers";

type LoaderWordmarkRiseProps = {
  brand?: string;
  introDelay?: number;
  onComplete?: () => void;
};

const EASE = [0.19, 1, 0.22, 1] as const;

const Letters = ({ letters }: { letters: string[] }) => (
  <>
    {letters.map((char, i) => (
      <div key={i} className="inline-block overflow-hidden pb-[0.15em] -mb-[0.15em]">
        <motion.div
          initial={{ y: "110%" }}
          animate={{ y: "0%" }}
          transition={{ duration: 0.9, ease: EASE, delay: 0.1 + i * 0.06 }}
          className="whitespace-pre"
        >
          {char}
        </motion.div>
      </div>
    ))}
  </>
);

const LoaderWordmarkRise = ({ brand = "Verde", introDelay = 1.6, onComplete }: LoaderWordmarkRiseProps) => {
  const reduce = useReducedMotion();
  const [top, setTop] = useState<number | null>(null);
  const count = useMotionValue(0);
  const label = useTransform(count, (v) => `${String(Math.round(v)).padStart(3, "0")}%`);
  const fill = useTransform(count, (v) => `inset(${100 - v}% 0% -20% 0%)`);
  const letters = Array.from(brand);
  const box = useRef<HTMLDivElement>(null);
  const row = useRef<HTMLDivElement>(null);
  useFitWidth(box, row, brand, top !== null);

  useLayoutEffect(() => {
    const mark = document.querySelector("[data-hero-wordmark]");
    setTop(mark ? mark.getBoundingClientRect().top : window.innerHeight * 0.38);
  }, []);

  useEffect(() => {
    if (reduce) {
      window.dispatchEvent(new CustomEvent("kit:intro"));
      return;
    }
    const counting = animate(count, 100, { duration: Math.max(introDelay - 0.25, 0.4), delay: 0.15, ease: [0.6, 0, 0.2, 1] });
    const intro = window.setTimeout(() => window.dispatchEvent(new CustomEvent("kit:intro")), introDelay * 1000);
    return () => {
      counting.stop();
      window.clearTimeout(intro);
    };
  }, [reduce, introDelay, count]);

  return (
    <LoaderStackLayers
      coverClassName="bg-card"
      onComplete={onComplete}
      liftAt={introDelay}
      doneAt={introDelay + 0.95}
      curtainClassNames={["text-accent", "text-secondary", "text-primary"]}
      intro={
        <>
          {top !== null && (
            <div ref={box} style={{ top }} className="absolute left-1/2 w-[calc(var(--container)*0.7)] -translate-x-1/2 whitespace-nowrap lg:w-[calc(var(--container)/2)] text-center font-[family-name:var(--font-heading)] text-[length:10rem] font-semibold leading-[0.8] tracking-[-0.03em]">
              <div ref={row} className="relative inline-flex text-card-foreground/20">
                <Letters letters={letters} />
                <motion.div style={{ clipPath: fill }} className="absolute inset-0 flex text-card-foreground">
                  <Letters letters={letters} />
                </motion.div>
              </div>
            </div>
          )}
          <div className="absolute inset-x-[var(--gutter)] bottom-[clamp(1.25rem,3vw,2.5rem)] flex items-end justify-between font-[family-name:var(--font-heading)] font-semibold uppercase leading-[0.8] tracking-[-0.02em] text-card-foreground">
            <motion.p className="text-[length:var(--text-h3)] tabular-nums">{label}</motion.p>
            <p className="text-[length:var(--text-label)]">{brand}</p>
          </div>
        </>
      }
    />
  );
};

export default LoaderWordmarkRise;

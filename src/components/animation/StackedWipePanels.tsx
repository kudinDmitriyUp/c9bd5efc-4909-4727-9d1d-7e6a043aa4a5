"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform, type MotionValue } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

type StackedWipePanel = {
  src?: string;
  videoSrc?: string;
  alt?: string;
  title: string;
  text: string;
};

interface StackedWipePanelsProps {
  panels?: StackedWipePanel[];
  className?: string;
  captionClassName?: string;
}

const EASE = [0.65, 0, 0.35, 1] as const;

const query = "(min-width: 768px)";
const subscribe = (onChange: () => void) => {
  const list = window.matchMedia(query);
  list.addEventListener("change", onChange);
  return () => list.removeEventListener("change", onChange);
};
const useDesktop = () => useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => false);

const pad = (value: number) => String(value).padStart(2, "0");

const Media = ({ panel }: { panel: StackedWipePanel }) =>
  panel.videoSrc ? (
    <video src={panel.videoSrc} aria-label={panel.alt || undefined} className="absolute inset-0 h-full w-full object-cover" autoPlay loop muted playsInline />
  ) : (
    <img src={panel.src} alt={panel.alt || ""} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
  );

const HOLD = 0.4;
const WIPE_SVH = 70;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

const WipePanel = ({ panel, index, count, steps }: { panel: StackedWipePanel; index: number; count: number; steps: MotionValue<number> }) => {
  const last = index === count - 1;
  const local = useTransform(steps, (value) => (last ? 0 : clamp01(value - index)));
  const clipPath = useTransform(local, (value) => `inset(0% 0% ${(value * 100).toFixed(3)}% 0%)`);
  const scale = useTransform(steps, (value) => (index === 0 ? 1 : 1.06 - 0.06 * clamp01(value - index + 1)));

  return (
    <motion.div style={{ clipPath, zIndex: count - index }} className="absolute inset-0 overflow-hidden">
      <motion.div style={{ scale }} className="absolute inset-0 will-change-transform">
        <Media panel={panel} />
      </motion.div>
    </motion.div>
  );
};

const DEFAULT_PANELS: StackedWipePanel[] = [
  { src: "https://images.pexels.com/photos/1179863/pexels-photo-1179863.jpeg?auto=compress&cs=tinysrgb&w=1200", alt: "Sample", title: "Design that ships", text: "Built for the long run" },
  { src: "https://images.pexels.com/photos/10499488/pexels-photo-10499488.jpeg?auto=compress&cs=tinysrgb&w=1200", alt: "Sample", title: "Clear structure", text: "Built for the long run" },
  { src: "https://images.pexels.com/photos/10923534/pexels-photo-10923534.jpeg?auto=compress&cs=tinysrgb&w=1200", alt: "Sample", title: "Quiet details", text: "Built for the long run" },
];

const StackedWipePanels = ({ panels = DEFAULT_PANELS,className = "", captionClassName = "" }: StackedWipePanelsProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const count = panels.length;
  const [active, setActive] = useState(0);
  const reduce = useReducedMotion();
  const scene = useDesktop() && !reduce;
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });

  const span = Math.max(1, count - 1);
  const steps = useTransform(scrollYProgress, (value) => value * (span + HOLD));
  const toIndex = (value: number) => Math.min(count - 1, Math.max(0, Math.round(value * (span + HOLD))));
  const ring = useTransform(steps, (value) => (value >= span ? 1 : value - Math.floor(value)));

  useMotionValueEvent(scrollYProgress, "change", (value) => setActive(toIndex(value)));
  useEffect(() => {
    setActive(toIndex(scrollYProgress.get()));
  }, [count]);

  if (count === 0) return null;

  return (
    <div className={cn("relative w-full", className)}>
      {scene ? (
      <div ref={ref} style={{ height: `${(span + HOLD) * WIPE_SVH + 100}svh` }} className="relative hidden md:block motion-reduce:md:hidden">
        <div className="sticky top-0 h-[100svh] w-full overflow-hidden">
          {panels.map((panel, index) => (
            <WipePanel key={index} panel={panel} index={index} count={count} steps={steps} />
          ))}
          <div className={cn("absolute bottom-8 left-8 z-50 w-[calc(100%-4rem)] max-w-sm rounded-xl bg-card p-6 text-card-foreground", captionClassName)}>
            <div className="flex items-center gap-3">
              <svg viewBox="0 0 40 40" aria-hidden="true" className="h-9 w-9 -rotate-90">
                <circle cx="20" cy="20" r="17" fill="none" strokeWidth="2" className="stroke-border" />
                <motion.circle cx="20" cy="20" r="17" fill="none" strokeWidth="2" strokeLinecap="round" style={{ pathLength: ring }} className="stroke-primary" />
              </svg>
              <p className="font-mono text-sm tabular-nums text-muted-foreground">
                {pad(active + 1)} / {pad(count)}
              </p>
            </div>
            <div aria-live="polite" className="mt-5 h-36 overflow-hidden">
              <motion.div animate={{ y: `${-active * 100}%` }} transition={{ duration: 0.8, ease: EASE }} className="flex h-full flex-col">
                {panels.map((panel, index) => (
                  <div key={index} aria-hidden={index !== active} className="flex h-full shrink-0 flex-col gap-2">
                    <h3 className="line-clamp-2 shrink-0 text-2xl font-medium leading-tight tracking-tight">{panel.title}</h3>
                    <p className="line-clamp-3 text-base leading-snug text-muted-foreground">{panel.text}</p>
                  </div>
                ))}
              </motion.div>
            </div>
          </div>
        </div>
      </div>
      ) : (
      <div className="flex flex-col gap-6 md:hidden motion-reduce:md:flex motion-reduce:md:gap-8">
        {panels.map((panel, index) => (
          <div key={index} className="flex flex-col gap-4">
            <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl md:aspect-video">
              <Media panel={panel} />
            </div>
            <div className={cn("flex flex-col gap-2 rounded-xl bg-card p-5 text-card-foreground", captionClassName)}>
              <p className="font-mono text-sm tabular-nums text-muted-foreground">
                {pad(index + 1)} / {pad(count)}
              </p>
              <h3 className="text-2xl font-medium leading-tight tracking-tight">{panel.title}</h3>
              <p className="text-base leading-snug text-muted-foreground">{panel.text}</p>
            </div>
          </div>
        ))}
      </div>
      )}
    </div>
  );
};

export default StackedWipePanels;

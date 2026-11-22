"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";

type LoaderPanelFlickProps = {
  images?: string[];
  label?: string;
  caption?: string;
  onComplete?: () => void;
  liftAt?: number;
  doneAt?: number;
};

const EASE_OUT = [0.22, 1, 0.36, 1] as const;
const EASE_IN_OUT = [0.65, 0, 0.35, 1] as const;
const EASE_PANEL = [0.83, 0, 0.17, 1] as const;

const DEFAULT_IMAGES = [
  "https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&w=1200",
  "https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&w=1200",
  "https://images.pexels.com/photos/1813466/pexels-photo-1813466.jpeg?auto=compress&w=1200",
  "https://images.pexels.com/photos/70497/pexels-photo-70497.jpeg?auto=compress&w=1200",
  "https://images.pexels.com/photos/1639557/pexels-photo-1639557.jpeg?auto=compress&w=1200",
];

const STRIPE_REM = 2.25;
const TARGET_PANELS = 10;
const PANEL = 0.9;
const SWEEP = 0.4;
const MAX_WAIT = 0.35;
const OPEN = 0.45;
const HOLD = 0.2;
const MIN_STEP = 0.09;
const MAX_STEP = 0.11;

const measurePanels = () => {
  if (typeof window === "undefined") return { count: TARGET_PANELS, width: 9 };
  const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  const stripe = STRIPE_REM * rem;
  const stripes = Math.max(2, Math.round(window.innerWidth / TARGET_PANELS / stripe));
  const width = stripes * STRIPE_REM;
  return { count: Math.ceil(window.innerWidth / (width * rem)), width };
};

const LoaderPanelFlick = ({
  images = DEFAULT_IMAGES,
  label = "/Warming the grill",
  caption = "/Fresh buns daily",
  onComplete,
  liftAt = 2.1,
  doneAt = 3.45,
}: LoaderPanelFlickProps) => {
  const reduce = useReducedMotion();
  const [visible, setVisible] = useState(true);
  const [shown, setShown] = useState(0);
  const [phase, setPhase] = useState<"wait" | "in" | "close" | "lift">("wait");
  const [panels] = useState(measurePanels);
  const done = useRef(onComplete);
  const imgs = useRef<(HTMLImageElement | null)[]>([]);
  const sources = images.join("\n");

  useEffect(() => {
    done.current = onComplete;
  });

  useEffect(() => {
    if (reduce) {
      setVisible(false);
      done.current?.();
      return;
    }
    const start = performance.now();
    const closeAt = liftAt - 0.3;
    const count = sources.split("\n").length;
    const timers: number[] = [];
    let cancelled = false;

    const ready = (i: number) => {
      const img = imgs.current[i];
      return !!img && img.complete && img.naturalWidth > 0;
    };
    const latestReady = (target: number, from: number) => {
      for (let j = target; j > from; j -= 1) if (ready(j)) return j;
      return from;
    };

    const run = () => {
      if (cancelled) return;
      const t0 = (performance.now() - start) / 1000;
      const flickAt = t0 + OPEN * 0.5;
      const room = Math.max(closeAt - HOLD - flickAt, 0);
      const fit = Math.min(count, Math.floor(room / MIN_STEP) + 1);
      const first = count - fit;
      const step = fit > 1 ? Math.min(MAX_STEP, room / (fit - 1)) : 0;
      let firstReady = first;
      while (firstReady < count - 1 && !ready(firstReady)) firstReady += 1;
      setShown(ready(firstReady) ? firstReady : first);
      setPhase("in");
      for (let i = 1; i < fit; i += 1) {
        timers.push(window.setTimeout(() => setShown((prev) => latestReady(first + i, prev)), (flickAt + i * step - t0) * 1000));
      }
    };

    const decoded = Promise.all(imgs.current.map((img) => (img ? img.decode().catch(() => undefined) : undefined)));
    const capped = new Promise((resolve) => timers.push(window.setTimeout(resolve, MAX_WAIT * 1000)));
    Promise.race([decoded, capped]).then(run);

    timers.push(
      window.setTimeout(() => setPhase("close"), closeAt * 1000),
      window.setTimeout(() => setPhase("lift"), liftAt * 1000),
      window.setTimeout(() => {
        setVisible(false);
        done.current?.();
      }, doneAt * 1000),
    );
    return () => {
      cancelled = true;
      timers.forEach(window.clearTimeout);
    };
  }, [reduce, sources, liftAt, doneAt]);

  if (!visible || reduce) return null;

  const lifting = phase === "lift";
  const lag = (i: number) => (panels.count > 1 ? (i / (panels.count - 1)) * SWEEP : 0);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[100000] overflow-hidden">
      {Array.from({ length: panels.count }, (_, i) => (
        <motion.div
          key={i}
          initial={false}
          animate={{ transform: lifting ? "translateY(-101%)" : "translateY(0%)" }}
          transition={{ duration: PANEL, ease: EASE_PANEL, delay: lag(i) }}
          style={{ left: `${i * panels.width}rem`, width: `calc(${panels.width}rem + 1px)` }}
          className="absolute inset-y-0 bg-primary"
        />
      ))}

      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          initial={{ clipPath: "inset(50% 0% 50% 0%)" }}
          animate={{ clipPath: phase === "in" ? "inset(0% 0% 0% 0%)" : "inset(50% 0% 50% 0%)" }}
          transition={phase === "in" ? { duration: OPEN, ease: EASE_IN_OUT } : { duration: 0.3, ease: EASE_IN_OUT }}
          className="relative aspect-[3/2] w-[clamp(15rem,44vw,36rem)] overflow-hidden bg-deep"
        >
          <motion.div
            initial={{ transform: "scale(1.12)" }}
            animate={{ transform: phase === "wait" ? "scale(1.12)" : "scale(1)" }}
            transition={{ duration: liftAt, ease: EASE_OUT }}
            className="absolute inset-0"
          >
            {images.map((src, i) => (
              <img
                key={`${i}-${src}`}
                ref={(el) => {
                  imgs.current[i] = el;
                }}
                src={src}
                alt=""
                loading="eager"
                decoding="sync"
                style={{ opacity: i === shown ? 1 : 0, visibility: i === shown ? "visible" : "hidden" }}
                className="absolute inset-0 size-full object-cover"
              />
            ))}
          </motion.div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: phase === "in" ? 1 : 0 }}
        transition={{ duration: 0.35, ease: EASE_OUT }}
        className="absolute inset-[var(--gutter)] flex flex-col items-center justify-between gap-[1rem] text-center lg:flex-row lg:items-end lg:text-left font-mono text-[length:var(--text-label)] uppercase leading-none tracking-[var(--label-tracking)] text-primary-foreground"
      >
        <p>{label}</p>
        <p>{caption}</p>
      </motion.div>
    </div>
  );
};

export default LoaderPanelFlick;

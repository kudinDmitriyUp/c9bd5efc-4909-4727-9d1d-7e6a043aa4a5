"use client";

import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

type ScrambleLabelProps = {
  text?: string;
  className?: string;
  duration?: number;
  delay?: number;
  chars?: string;
  hover?: boolean;
  start?: boolean;
  prefix?: string;
  suffix?: string;
  decorative?: boolean;
};

const ScrambleLabel = ({ text: label = "Design that ships", className, duration = 2, delay = 0, chars, hover = false, start = true, prefix = "", suffix = "", decorative = false }: ScrambleLabelProps) => {
  const text = prefix + label + suffix;
  const ref = useRef<HTMLDivElement>(null);
  const raf = useRef(0);
  const timer = useRef(0);
  const reduce = useReducedMotion();
  const inView = useInView(ref, { once: true });
  const [display, setDisplay] = useState("_");
  const [played, setPlayed] = useState(false);

  const play = (wait: number, length: number) => {
    cancelAnimationFrame(raf.current);
    window.clearTimeout(timer.current);
    const source = Array.from(text);
    const pool = Array.from(new Set(Array.from(chars ?? `x&${text.toLowerCase().replace(/[^a-z]/g, "")}`))).filter((c) => c.trim());
    if (!pool.length) pool.push("x");
    timer.current = window.setTimeout(() => {
      const t0 = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - t0) / (length * 1000));
        const p = 1 - Math.pow(1 - t, 4);
        const resolved = Math.floor(p * source.length);
        const shown = Math.min(source.length, Math.ceil(Math.min(1, t * 3) * source.length));
        const frame = Math.floor(now / 45);
        setDisplay(
          source
            .slice(0, shown)
            .map((c, i) => (i < resolved || !c.trim() ? c : pool[(i * 7 + frame) % pool.length]))
            .join("") || "_",
        );
        if (t < 1) raf.current = requestAnimationFrame(tick);
      };
      raf.current = requestAnimationFrame(tick);
    }, wait * 1000);
  };

  useEffect(() => {
    if (reduce) {
      setDisplay(text);
      return;
    }
    if (!inView || !start) return;
    play(played ? 0 : delay, played ? Math.min(duration, 0.5) : duration);
    setPlayed(true);
    return () => {
      cancelAnimationFrame(raf.current);
      window.clearTimeout(timer.current);
    };
  }, [inView, start, text, reduce]);

  return (
    <div ref={ref} aria-hidden={decorative ? true : undefined} className={cn("relative", className)} onPointerEnter={hover && !reduce && played ? () => play(0, 0.5) : undefined}>
      <p className="sr-only">{label}</p>
      <p aria-hidden="true" className="invisible">
        {text}
      </p>
      <p aria-hidden="true" className="absolute inset-0">
        {display}
      </p>
    </div>
  );
};

export default ScrambleLabel;

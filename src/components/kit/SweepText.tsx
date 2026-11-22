"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { animate, useInView, useMotionValue, useMotionValueEvent, useReducedMotion, useScroll } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

const BASE = "color-mix(in srgb, var(--foreground) 24%, var(--background))";
const BAND = "color-mix(in srgb, var(--foreground) 8%, var(--background))";
const BAND_WIDTH = 8;

type SweepTextProps = {
  text?: string;
  tag?: "h1" | "h2" | "h3" | "p";
  scrub?: boolean;
  delay?: number;
  final?: string;
  className?: string;
  style?: CSSProperties;
};

const colourAt = (t: number, final: string) => {
  if (t <= 0) return BASE;
  if (t >= 1) return final;
  if (t < 0.5) return `color-mix(in srgb, ${BAND} ${Math.round(t * 200)}%, ${BASE})`;
  return `color-mix(in srgb, ${final} ${Math.round((t - 0.5) * 200)}%, ${BAND})`;
};

const SweepText = ({ text = "Design that ships and is built for the long run", tag = "p", scrub = false, delay = 0, final = "var(--foreground)", className, style }: SweepTextProps) => {
  const ref = useRef<HTMLElement>(null);
  const chars = useRef<(HTMLElement | null)[]>([]);
  const reduce = useReducedMotion();
  const [wide, setWide] = useState(false);
  const inView = useInView(ref, { once: true, amount: 0.2 });
  const timed = useMotionValue(0);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.9", "end 0.45"] });
  const words = text.split(/\s+/).filter(Boolean);
  const total = words.join(" ").length;
  const useScrub = scrub && wide && !reduce;

  const paint = (v: number) => {
    const span = BAND_WIDTH / (total + BAND_WIDTH);
    chars.current.forEach((el, i) => {
      if (!el) return;
      const start = i / (total + BAND_WIDTH);
      el.style.color = colourAt((v - start) / span, final);
    });
  };

  useEffect(() => {
    const query = window.matchMedia("(min-width: 880px)");
    const update = () => setWide(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (reduce) {
      paint(1);
      return;
    }
    if (useScrub) {
      paint(scrollYProgress.get());
      return;
    }
    paint(timed.get());
    if (!inView) return;
    const controls = animate(timed, 1, { duration: Math.min(1.8, Math.max(0.6, total / 60)), delay, ease: [0.22, 1, 0.36, 1] });
    return () => controls.stop();
  }, [inView, useScrub, reduce, text]);

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    if (useScrub) paint(v);
  });
  useMotionValueEvent(timed, "change", (v) => {
    if (!useScrub) paint(v);
  });

  let index = 0;
  const Tag = tag === "p" ? "div" : tag;

  return (
    <Tag ref={ref as never} className={cn(className)} style={style}>
      <p className="sr-only !whitespace-normal">{text}</p>
      <div aria-hidden="true">
      {words.map((word, w) => {
        const nodes = Array.from(word).map((char) => {
          const i = index++;
          return (
            <div key={i} aria-hidden="true" ref={(el) => void (chars.current[i] = el)} className="inline" style={{ color: BASE }}>
              {char}
            </div>
          );
        });
        index++;
        return (
          <div key={w} aria-hidden="true" className="inline">
            <div className="inline-block whitespace-nowrap">{nodes}</div>
            {w < words.length - 1 ? " " : null}
          </div>
        );
      })}
      </div>
    </Tag>
  );
};

export default SweepText;

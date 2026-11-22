"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { useInView, useReducedMotion } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

type TerminalTitleSweepProps = {
  text?: string;
  tag?: "h1" | "h2" | "h3" | "p";
  from?: string;
  flash?: string;
  final?: string;
  className?: string;
  style?: CSSProperties;
  delay?: number;
};

const resolve = (probe: HTMLElement, value: string) => {
  probe.style.color = value;
  return getComputedStyle(probe).color;
};

const TerminalTitleSweep = ({
  text = "Design that ships and is built for the long run",
  tag = "h2",
  from = "color-mix(in srgb, var(--foreground) 16%, var(--background))",
  flash = "var(--accent)",
  final = "var(--foreground)",
  className,
  style,
  delay = 0,
}: TerminalTitleSweepProps) => {
  const ref = useRef<HTMLElement>(null);
  const chars = useRef<(HTMLElement | null)[]>([]);
  const reduce = useReducedMotion();
  const inView = useInView(ref, { once: true, margin: "0px 0px -12% 0px" });
  const words = text.split(/\s+/).filter(Boolean);

  useEffect(() => {
    const root = ref.current;
    const list = chars.current.filter((el): el is HTMLElement => !!el);
    if (!root || !list.length) return;
    if (reduce) {
      list.forEach((el) => (el.style.color = final));
      return;
    }
    if (!inView) {
      list.forEach((el) => (el.style.color = from));
      return;
    }
    const stagger = Math.min(0.05, 1.6 / list.length);
    let animations: Animation[] = [];
    const start = () => {
      const probe = list[0];
      const frames = [resolve(probe, from), resolve(probe, flash), resolve(probe, final)];
      probe.style.color = from;
      animations = list.map((el, i) => {
        el.style.color = final;
        return el.animate(
          [{ color: frames[0] }, { color: frames[1], offset: 0.45 }, { color: frames[2] }],
          { duration: 750, delay: i * stagger * 1000, easing: "cubic-bezier(0.45, 0, 0.55, 1)", fill: "backwards" },
        );
      });
    };
    const timer = window.setTimeout(start, delay * 1000);
    return () => {
      window.clearTimeout(timer);
      animations.forEach((animation) => animation.cancel());
    };
  }, [inView, reduce, text, from, flash, final, delay]);

  let index = 0;
  const Tag = tag === "p" ? "div" : tag;

  return (
    <Tag ref={ref as never} className={cn(className)} style={style}>
      <p className="sr-only !whitespace-normal">{text}</p>
      <div aria-hidden="true">
        {words.map((word, w) => (
          <div key={w} className="inline">
            <div className="inline-block whitespace-nowrap">
              {Array.from(word).map((char) => {
                const i = index++;
                return (
                  <div key={i} ref={(el) => void (chars.current[i] = el)} className="inline" style={{ color: from }}>
                    {char}
                  </div>
                );
              })}
            </div>
            {w < words.length - 1 ? " " : null}
          </div>
        ))}
      </div>
    </Tag>
  );
};

export default TerminalTitleSweep;

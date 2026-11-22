"use client";

import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

type MakroTitleProps = {
  text?: string;
  highlight?: string;
  tag?: "h1" | "h2" | "h3";
  className?: string;
  markClassName?: string;
  delay?: number;
  immediate?: boolean;
  byLine?: boolean;
};

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const SWEEP =
  "linear-gradient(90deg, currentColor 0%, currentColor 34%, color-mix(in oklch, var(--accent) 72%, currentColor) 44%, color-mix(in oklch, var(--accent) 72%, currentColor) 52%, color-mix(in srgb, currentColor 24%, transparent) 64%, color-mix(in srgb, currentColor 24%, transparent) 100%)";

const MakroTitle = ({ text = "Design that ships", highlight, tag = "h2", className, markClassName, delay = 0, immediate = false, byLine = false }: MakroTitleProps) => {
  const ref = useRef<HTMLHeadingElement>(null);
  const reduce = useReducedMotion();
  const inView = useInView(ref, { once: true, margin: "0px 0px -8% 0px" });
  const [mounted, setMounted] = useState(false);
  const [lines, setLines] = useState<number[]>([]);

  useEffect(() => {
    const root = ref.current;
    if (byLine && root) {
      const tops = Array.from(root.querySelectorAll("[aria-hidden='true']"), (child) => (child.lastElementChild as HTMLElement | null)?.offsetTop ?? 0);
      const rows = [...new Set(tops)].sort((a, b) => a - b);
      setLines(tops.map((top) => rows.indexOf(top)));
    }
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, [byLine, text]);

  const shown = reduce || (immediate ? mounted : inView);
  const words = (value: string) => value.split(/\s+/).filter(Boolean).map((word) => ({ word, mark: false }));
  const at = highlight ? text.indexOf(highlight) : -1;
  const segments = !highlight
    ? [{ value: text, units: words(text) }]
    : at >= 0
      ? [
          { value: text.slice(0, at), units: words(text.slice(0, at)) },
          { value: highlight, units: [{ word: highlight, mark: true }] },
          { value: text.slice(at + highlight.length), units: words(text.slice(at + highlight.length)) },
        ]
      : [
          { value: text, units: words(text) },
          { value: highlight, units: [{ word: highlight, mark: true }] },
        ];
  const units = segments.flatMap((segment) => segment.units);
  const step = Math.min(0.06, 0.5 / Math.max(1, units.length));
  const rise = (i: number) => (byLine ? delay + (lines[i] ?? 0) * 0.14 + i * 0.015 : delay + i * step);
  const sweepStep = Math.min(0.09, 0.9 / Math.max(1, units.length));
  const Tag = tag;

  return (
    <Tag ref={ref} className={cn("text-balance [overflow-wrap:anywhere]", className)}>
      {segments.map((segment, s) => {
        const offset = segments.slice(0, s).reduce((n, g) => n + g.units.length, 0);
        if (!segment.units.length) return null;
        return (
      <div key={s} className="inline">
      <div className="sr-only">{segment.value.trim()}</div>
      {segment.units.map((unit, k) => {
        const i = offset + k;
        return (
        <div key={i} aria-hidden="true" className="inline">
          {i > 0 && " "}
          <div className="inline-block max-w-full overflow-hidden pb-[0.12em] -mb-[0.12em] align-bottom">
            <div
              className={cn(
                "inline-block max-w-full",
                !unit.mark && "pb-[0.12em] -mb-[0.12em]",
                unit.mark && "rounded-[0.22em] bg-no-repeat px-[0.18em] text-accent-foreground",
                unit.mark && markClassName,
              )}
              style={
                unit.mark
                  ? {
                      backgroundImage: "linear-gradient(var(--accent), var(--accent))",
                      backgroundSize: shown ? "100% 100%" : "0% 100%",
                      transform: shown ? "translateY(0%)" : "translateY(110%)",
                      transition: reduce
                        ? "none"
                        : `transform 0.9s ${EASE} ${rise(i)}s, background-size 0.8s ${EASE} ${delay + 0.35 + i * sweepStep}s`,
                    }
                  : {
                      backgroundImage: reduce ? undefined : SWEEP,
                      backgroundSize: "300% 100%",
                      backgroundPosition: shown ? "0% 0%" : "100% 0%",
                      WebkitBackgroundClip: reduce ? undefined : "text",
                      backgroundClip: reduce ? undefined : "text",
                      WebkitTextFillColor: reduce ? undefined : "transparent",
                      transform: shown ? "translateY(0%)" : "translateY(110%)",
                      transition: reduce
                        ? "none"
                        : `transform 0.9s ${EASE} ${rise(i)}s, background-position 1.3s cubic-bezier(0.45, 0, 0.2, 1) ${delay + 0.2 + i * sweepStep}s`,
                    }
              }
            >
              {unit.word}
            </div>
          </div>
        </div>
        );
      })}
      </div>
        );
      })}
    </Tag>
  );
};

export default MakroTitle;

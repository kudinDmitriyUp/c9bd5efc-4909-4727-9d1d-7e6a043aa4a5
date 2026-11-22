"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

interface FitTextProps {
  lines?: ReactNode[];
  ariaLabel?: string;
  className?: string;
  lineClassName?: string;
}

const FitText = ({
  lines = ["Fit to width", "Every line", "fills the box"],
  ariaLabel,
  className,
  lineClassName,
}: FitTextProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<(HTMLHeadingElement | null)[]>([]);

  useEffect(() => {
    const parent = containerRef.current;
    if (!parent) return;
    const els = lineRefs.current.filter((el): el is HTMLHeadingElement => !!el);
    let frame = 0;
    let alive = true;

    const fit = (el: HTMLElement, available: number) => {
      if (available <= 0) return;
      let size = parseFloat(getComputedStyle(el).fontSize) || 16;
      for (let i = 0; i < 5; i++) {
        const width = el.getBoundingClientRect().width;
        if (width <= 0) break;
        const ratio = available / width;
        if (Math.abs(ratio - 1) < 0.002) break;
        size *= ratio;
        el.style.fontSize = `${size}px`;
      }
    };

    const refit = () => {
      const cs = getComputedStyle(parent);
      const available = parent.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      els.forEach((el) => fit(el, available));
    };

    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        refit();
      });
    };

    const ro = new ResizeObserver(schedule);
    ro.observe(parent);
    refit();
    document.fonts?.ready.then(() => {
      if (alive) refit();
    });

    return () => {
      alive = false;
      cancelAnimationFrame(frame);
      ro.disconnect();
      els.forEach((el) => {
        el.style.fontSize = "";
      });
    };
  }, [lines]);

  return (
    <div ref={containerRef} aria-label={ariaLabel} className={cn("w-full text-foreground", className)}>
      {lines.map((line, i) => (
        <div key={i}>
          <h2
            ref={(el) => {
              lineRefs.current[i] = el;
            }}
            className={cn("m-0 inline-block whitespace-nowrap text-6xl font-semibold uppercase leading-[0.9] tracking-tight", lineClassName)}
          >
            {line}
          </h2>
        </div>
      ))}
    </div>
  );
};

export default FitText;

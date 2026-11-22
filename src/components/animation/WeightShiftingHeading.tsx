"use client";

import { Fragment, useEffect, useRef } from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

interface WeightShiftingHeadingProps {
  title?: string;
  min?: number;
  max?: number;
  radius?: number;
  className?: string;
}

const WeightShiftingHeading = ({ title = "Design that ships", min = 200, max = 900, radius = 400, className = "" }: WeightShiftingHeadingProps) => {
  const ref = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const canHover = !reduceMotion && !window.matchMedia("(hover: none), (pointer: coarse)").matches;
    if (!canHover) return;

    const start = parseFloat(getComputedStyle(el).fontWeight) || 400;
    const chars = Array.from(el.querySelectorAll<HTMLElement>("[data-char]")).map((char) => {
      char.style.fontVariationSettings = `'wght' ${start}`;
      return { char, x: 0, y: 0, current: start, target: start, written: start };
    });

    const pointer = { x: -1e6, y: -1e6 };
    let measured = false;
    let inView = false;
    let dirty = false;
    let frame = 0;

    const measure = () => {
      chars.forEach((item) => {
        const rect = item.char.getBoundingClientRect();
        item.x = rect.left + rect.width / 2 + window.scrollX;
        item.y = rect.top + rect.height / 2 + window.scrollY;
      });
      measured = true;
    };

    const tick = () => {
      frame = 0;
      if (dirty) {
        dirty = false;
        const px = pointer.x + window.scrollX;
        const py = pointer.y + window.scrollY;
        chars.forEach((item) => {
          const distance = Math.hypot(px - item.x, py - item.y);
          item.target = distance >= radius ? min : min + (max - min) * (1 - distance / radius);
        });
      }
      let moving = false;
      chars.forEach((item) => {
        const diff = item.target - item.current;
        if (Math.abs(diff) < 0.5) {
          item.current = item.target;
        } else {
          item.current += diff * 0.18;
          moving = true;
        }
        const rounded = Math.round(item.current);
        if (rounded !== item.written) {
          item.written = rounded;
          item.char.style.fontVariationSettings = `'wght' ${rounded}`;
        }
      });
      if (moving) frame = requestAnimationFrame(tick);
    };

    const schedule = () => {
      dirty = true;
      if (!frame && inView) frame = requestAnimationFrame(tick);
    };

    const onMove = (event: PointerEvent) => {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      if (!measured) measure();
      schedule();
    };

    const onResize = () => {
      measured = false;
    };

    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      if (inView) schedule();
    });
    observer.observe(el);

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });
    document.fonts?.ready.then(onResize).catch(() => {});

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", onResize);
      chars.forEach(({ char }) => {
        char.style.fontVariationSettings = "";
      });
    };
  }, [min, max, radius]);

  const words = title.split(" ");

  return (
    <h2 ref={ref} aria-label={title} className={cn("text-6xl md:text-8xl font-medium leading-none tracking-tight [contain:layout]", className)}>
      {words.map((word, wordIndex) => (
        <Fragment key={wordIndex}>
          <span aria-hidden="true" className="inline-block whitespace-nowrap">
            {Array.from(word, (letter, index) => (
              <span key={index} data-char className="inline-block">
                {letter}
              </span>
            ))}
          </span>
          {wordIndex < words.length - 1 && " "}
        </Fragment>
      ))}
    </h2>
  );
};

export default WeightShiftingHeading;

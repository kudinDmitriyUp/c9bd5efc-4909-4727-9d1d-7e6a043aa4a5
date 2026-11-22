"use client";

import { useLayoutEffect, useState, type RefObject } from "react";

export const useWordLines = (ref: RefObject<HTMLElement | null>, key: string) => {
  const [lines, setLines] = useState<number[]>([]);
  useLayoutEffect(() => {
    const box = ref.current;
    if (!box) return;
    let frame = 0;
    let alive = true;
    const measure = () => {
      const out: number[] = [];
      let last = Number.NaN;
      let line = -1;
      box.querySelectorAll<HTMLElement>("[data-word]").forEach((el) => {
        if (line < 0 || Math.abs(el.offsetTop - last) > 2) {
          line++;
          last = el.offsetTop;
        }
        out.push(line);
      });
      setLines((prev) => (prev.join() === out.join() ? prev : out));
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    measure();
    document.fonts.ready.then(() => alive && schedule());
    const observer = new ResizeObserver(schedule);
    observer.observe(box);
    return () => {
      alive = false;
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [ref, key]);
  return lines;
};

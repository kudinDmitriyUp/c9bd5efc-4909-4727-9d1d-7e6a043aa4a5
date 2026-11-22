/* eslint-disable react-hooks/immutability */
import { useLayoutEffect, type RefObject } from "react";

export const useFitWidth = (box: RefObject<HTMLElement | null>, row: RefObject<HTMLElement | null>, text: string, on = true, maxScale = Infinity) => {
  useLayoutEffect(() => {
    const el = box.current;
    const inner = row.current;
    if (!on || !el || !inner) return;
    let frame = 0;
    const fit = () => {
      el.style.removeProperty("font-size");
      const cs = getComputedStyle(el);
      const max = parseFloat(cs.fontSize) * maxScale;
      const available = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      let size = parseFloat(cs.fontSize);
      for (let i = 0; i < 4; i++) {
        const width = inner.offsetWidth;
        if (!width || available <= 0) return;
        const next = Math.min(max, size * (available / width));
        if (Math.abs(next / size - 1) < 0.002) return;
        size = next;
        el.style.fontSize = `${size}px`;
      }
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(fit);
    };
    fit();
    const observer = new ResizeObserver(schedule);
    observer.observe(el);
    document.fonts?.ready.then(schedule);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      el.style.removeProperty("font-size");
    };
  }, [box, row, text, on, maxScale]);
};

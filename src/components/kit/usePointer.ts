"use client";

import { useEffect, type RefObject } from "react";
import { useMotionValue, useReducedMotion, useSpring, type MotionValue } from "motion/react";

export type Pointer = { x: MotionValue<number>; y: MotionValue<number> };

export const usePointer = (ref: RefObject<HTMLElement | null>): Pointer => {
  const reduce = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 110, damping: 16, mass: 0.7 });
  const sy = useSpring(y, { stiffness: 110, damping: 16, mass: 0.7 });

  useEffect(() => {
    const el = ref.current;
    if (!el || reduce) return;
    const query = window.matchMedia("(min-width: 880px) and (hover: hover) and (pointer: fine)");
    const move = (event: PointerEvent) => {
      if (!query.matches) return;
      const box = el.getBoundingClientRect();
      const top = Math.max(box.top, 0);
      const bottom = Math.min(box.bottom, window.innerHeight);
      x.set(Math.max(-1, Math.min(1, ((event.clientX - box.left) / box.width) * 2 - 1)));
      y.set(Math.max(-1, Math.min(1, ((event.clientY - top) / Math.max(1, bottom - top)) * 2 - 1)));
    };
    const leave = () => {
      x.set(0);
      y.set(0);
    };
    el.addEventListener("pointermove", move, { passive: true });
    el.addEventListener("pointerleave", leave);
    return () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
    };
  }, [ref, reduce, x, y]);

  return { x: sx, y: sy };
};

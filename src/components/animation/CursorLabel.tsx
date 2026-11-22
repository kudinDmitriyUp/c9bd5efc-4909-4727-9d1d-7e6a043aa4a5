"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

interface CursorLabelProps {
  label?: string;
  active?: boolean;
  tone?: "light" | "dark";
  className?: string;
}

const CursorLabel = ({ label = "View", active, tone = "dark", className = "" }: CursorLabelProps) => {
  const reduce = useReducedMotion();
  const anchorRef = useRef<HTMLDivElement>(null);
  const [hovering, setHovering] = useState(false);
  const shown = active ?? hovering;
  const shownRef = useRef(shown);
  const rawX = useMotionValue(-200);
  const rawY = useMotionValue(-200);
  const x = useSpring(rawX, { stiffness: 300, damping: 30 });
  const y = useSpring(rawY, { stiffness: 300, damping: 30 });

  useEffect(() => {
    shownRef.current = shown;
  }, [shown]);

  useEffect(() => {
    const area = anchorRef.current?.parentElement;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      rawX.set(e.clientX);
      rawY.set(e.clientY);
      if (reduce || !shownRef.current) {
        x.jump(e.clientX);
        y.jump(e.clientY);
      }
      if (active === undefined && area) setHovering(area.contains(e.target as Node));
    };
    const onLeave = () => setHovering(false);
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, [rawX, rawY, x, y, reduce, active]);

  return (
    <div ref={anchorRef} className="contents">
      <motion.div
        aria-hidden="true"
        style={{ x, y }}
        className="pointer-events-none fixed left-0 top-0 z-[1002] hidden [@media(hover:hover)]:block"
      >
        <motion.div
          initial={false}
          animate={{ scale: shown ? 1 : 0.4, opacity: shown ? 1 : 0 }}
          transition={{ duration: shown ? 0.45 : 0.3, ease: [0.22, 1, 0.36, 1] }}
          className={cn(
            "-translate-x-1/2 -translate-y-1/2 flex items-center justify-center rounded-full size-[max(96px,8.854vw)]",
            tone === "dark" ? "bg-primary text-primary-foreground" : "bg-background text-foreground",
            className
          )}
        >
          <p className="text-[length:var(--text-h3)] leading-none">{label}</p>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default CursorLabel;

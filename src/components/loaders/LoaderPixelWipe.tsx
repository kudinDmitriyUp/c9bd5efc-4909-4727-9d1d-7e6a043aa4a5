"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence, useAnimate } from "motion/react";

interface LoaderPixelWipeProps {
  onComplete?: () => void;
}

const LINES = 12;
const HOLD = 0.15;
const STEP = 0.05;
const PIXEL_FADE = 0.2;

const LoaderPixelWipe = ({ onComplete }: LoaderPixelWipeProps) => {
  const [isVisible, setIsVisible] = useState(true);
  const [grid, setGrid] = useState<{ columns: number; rows: number; portrait: boolean } | null>(null);
  const [scope, animate] = useAnimate();

  useEffect(() => {
    const portrait = window.innerHeight > window.innerWidth;
    const size = (portrait ? window.innerHeight : window.innerWidth) / LINES;
    setGrid(
      portrait
        ? { columns: Math.ceil(window.innerWidth / size), rows: LINES, portrait }
        : { columns: LINES, rows: Math.ceil(window.innerHeight / size), portrait }
    );
  }, []);

  useEffect(() => {
    if (!grid) return;
    const pixels = scope.current.querySelectorAll("[data-pixel]");
    const delays = Array.from(pixels, (_, index) => {
      const line = grid.portrait ? Math.floor(index / grid.columns) : index % grid.columns;
      return HOLD + line * STEP + Math.random() * PIXEL_FADE;
    });
    const controls = animate(pixels, { opacity: 0 }, { duration: PIXEL_FADE / 2, ease: "linear", delay: (index) => delays[index] });
    controls.then(() => setIsVisible(false));
    return () => controls.stop();
  }, [grid, animate, scope]);

  return (
    <AnimatePresence onExitComplete={onComplete}>
      {isVisible && (
        <motion.div
          ref={scope}
          className="fixed inset-0 z-100 grid overflow-clip"
          style={{ gridTemplateColumns: `repeat(${grid?.columns ?? 1}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${grid?.rows ?? 1}, minmax(0, 1fr))` }}
        >
          {grid ? (
            Array.from({ length: grid.columns * grid.rows }, (_, index) => <div key={index} data-pixel className="bg-foreground" />)
          ) : (
            <div className="bg-foreground" />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LoaderPixelWipe;

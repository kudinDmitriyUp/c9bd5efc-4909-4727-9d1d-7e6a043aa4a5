"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence, useAnimate } from "motion/react";

interface LoaderPixelsProps {
  onComplete?: () => void;
}

const HOLD = 0.15;
const PIXEL_FADE = 0.05;
const STAGGER_AMOUNT = 0.6;

const getColumns = () => {
  const width = window.innerWidth;
  const landscape = width > window.innerHeight;
  if (width <= 479) return 8;
  if (width <= 767) return landscape ? 10 : 8;
  if (width <= 991) return 12;
  return 16;
};

const LoaderPixels = ({ onComplete }: LoaderPixelsProps) => {
  const [isVisible, setIsVisible] = useState(true);
  const [grid, setGrid] = useState<{ columns: number; rows: number } | null>(null);
  const [scope, animate] = useAnimate();

  useEffect(() => {
    const columns = getColumns();
    setGrid({ columns, rows: Math.ceil(window.innerHeight / (window.innerWidth / columns)) });
  }, []);

  useEffect(() => {
    if (!grid) return;
    const pixels = scope.current.querySelectorAll("[data-pixel]");
    const delays = Array.from(pixels, () => HOLD + Math.random() * STAGGER_AMOUNT);
    const controls = animate(pixels, { opacity: 0 }, { duration: PIXEL_FADE, ease: "linear", delay: (index) => delays[index] });
    controls.then(() => setIsVisible(false));
    return () => controls.stop();
  }, [grid, animate, scope]);

  return (
    <AnimatePresence onExitComplete={onComplete}>
      {isVisible && (
        <motion.div
          ref={scope}
          className="fixed inset-0 z-100 grid content-start overflow-clip"
          style={{ gridTemplateColumns: `repeat(${grid?.columns ?? 1}, minmax(0, 1fr))` }}
        >
          {grid ? (
            Array.from({ length: grid.columns * grid.rows }, (_, index) => (
              <div key={index} data-pixel className="aspect-square bg-foreground" />
            ))
          ) : (
            <div className="h-svh bg-foreground" />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LoaderPixels;

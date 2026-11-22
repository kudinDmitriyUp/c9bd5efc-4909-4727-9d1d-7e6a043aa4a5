"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence, useAnimate } from "motion/react";

interface LoaderTilesProps {
  onComplete?: () => void;
}

const HOLD = 0.15;
const RIPPLE = 0.05;
const EASE = [0.65, 0, 0.35, 1] as const;

const LoaderTiles = ({ onComplete }: LoaderTilesProps) => {
  const [isVisible, setIsVisible] = useState(true);
  const [grid, setGrid] = useState<{ columns: number; rows: number } | null>(null);
  const [scope, animate] = useAnimate();

  useEffect(() => {
    const columns = window.innerWidth < 768 ? 5 : 10;
    setGrid({ columns, rows: Math.ceil(window.innerHeight / (window.innerWidth / columns)) });
  }, []);

  useEffect(() => {
    if (!grid) return;
    const tiles = scope.current.querySelectorAll("[data-tile]");
    const centerX = (grid.columns - 1) / 2;
    const centerY = (grid.rows - 1) / 2;
    const delays = Array.from(tiles, (_, index) => HOLD + Math.hypot((index % grid.columns) - centerX, Math.floor(index / grid.columns) - centerY) * RIPPLE);
    const controls = animate(tiles, { scale: 0 }, { duration: 0.7, ease: EASE, delay: (index) => delays[index] });
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
            Array.from({ length: grid.columns * grid.rows }, (_, index) => <div key={index} data-tile className="scale-[1.02] bg-foreground" />)
          ) : (
            <div className="bg-foreground" />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LoaderTiles;

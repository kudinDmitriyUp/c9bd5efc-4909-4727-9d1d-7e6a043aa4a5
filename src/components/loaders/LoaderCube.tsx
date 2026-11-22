"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence, useAnimate } from "motion/react";

interface LoaderCubeProps {
  onComplete?: () => void;
}

const HOLD = 0.15;
const EASE = [0.625, 0.05, 0, 1] as const;

const LoaderCube = ({ onComplete }: LoaderCubeProps) => {
  const [isVisible, setIsVisible] = useState(true);
  const [height, setHeight] = useState<number | null>(null);
  const [scope, animate] = useAnimate();

  useEffect(() => {
    setHeight(window.innerHeight);
  }, []);

  useEffect(() => {
    if (!height) return;
    const controls = animate([
      ["[data-cube]", { z: [-height * 0.5, -height * 0.8, -height * 0.5] }, { duration: 2, times: [0, 0.4, 1], ease: [[0.45, 0, 0.55, 1], EASE], at: HOLD }],
      ["[data-cube]", { rotateX: -90 }, { duration: 1.2, ease: EASE, at: HOLD + 0.1 }],
    ]);
    controls.then(() => setIsVisible(false));
    return () => controls.stop();
  }, [height, animate]);

  return (
    <AnimatePresence onExitComplete={onComplete}>
      {isVisible && (
        <motion.div
          ref={scope}
          className="fixed inset-0 z-100 overflow-hidden perspective-[100vw]"
          style={{ perspectiveOrigin: `50% ${(height ?? 0) * 0.5}px` }}
        >
          {height ? (
            <div data-cube className="absolute inset-0 transform-3d" style={{ transform: `translateZ(${-height * 0.5}px)` }}>
              <div className="absolute inset-0 bg-foreground backface-hidden" style={{ transform: `translateZ(${height * 0.5}px)` }} />
            </div>
          ) : (
            <div className="absolute inset-0 bg-foreground" />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LoaderCube;

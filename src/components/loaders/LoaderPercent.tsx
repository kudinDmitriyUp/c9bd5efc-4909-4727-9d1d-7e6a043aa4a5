"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, useMotionValueEvent, animate } from "motion/react";

interface LoaderPercentProps {
  duration?: number;
  onComplete?: () => void;
}

const EASE = [0.33, 0, 0.2, 1] as const;
const EXIT_EASE = [0.625, 0.05, 0, 1] as const;
const CURVE = 12;

const LoaderPercent = ({ duration = 1.8, onComplete }: LoaderPercentProps) => {
  const [isVisible, setIsVisible] = useState(true);
  const [value, setValue] = useState(0);
  const [depth, setDepth] = useState(CURVE);
  const progress = useMotionValue(0);
  const exit = useMotionValue(0);
  useMotionValueEvent(progress, "change", (latest) => setValue(Math.round(latest * 100)));
  const scaleY = useTransform(progress, [0, 1], [0, 1]);
  const contentY = useTransform(exit, [0, 1], ["0vh", "-100vh"]);
  const path = useTransform(exit, (value) => {
    const edge = 100 * (1 - value);
    const control = edge + depth * Math.sin((1 - value) * Math.PI) * 2;
    return `M0 0 L0 ${edge} Q50 ${control} 100 ${edge} L100 0 Z`;
  });

  useEffect(() => {
    setDepth(CURVE * (window.innerWidth / window.innerHeight));
    let exitControls: ReturnType<typeof animate> | undefined;
    const controls = animate(progress, 1, { duration, ease: EASE });
    controls.then(() => {
      exitControls = animate(exit, 1, { duration: 0.7, ease: EXIT_EASE });
      exitControls.then(() => setIsVisible(false));
    });
    return () => {
      controls.stop();
      exitControls?.stop();
    };
  }, [progress, exit, duration]);

  return (
    <AnimatePresence onExitComplete={onComplete}>
      {isVisible && (
        <div className="fixed inset-0 z-100 text-foreground">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 block w-full h-full" aria-hidden="true">
            <motion.path d={path} fill="currentColor" />
          </svg>
          <motion.div style={{ y: contentY }} className="absolute inset-0 text-background">
            <motion.div style={{ scaleY }} className="absolute left-0 inset-y-0 w-2 origin-bottom bg-background" />
            <p className="absolute bottom-[0.1em] left-[0.23em] text-[calc(7vw+7vh)] font-bold leading-none tabular-nums">{value}%</p>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default LoaderPercent;

"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, useMotionValueEvent, animate } from "motion/react";

interface LoaderCounterProps {
  duration?: number;
  onComplete?: () => void;
  fillClassName?: string;
  contentClassName?: string;
  numberClassName?: string;
  exit?: "wipe" | "fade";
  showBar?: boolean;
}

const EASE = [0.33, 0, 0.2, 1] as const;
const EXIT_EASE = [0.625, 0.05, 0, 1] as const;
const CURVE = 12;

const LoaderCounter = ({ duration = 1.8, onComplete, fillClassName = "text-foreground", contentClassName = "text-background", numberClassName = "text-7xl md:text-8xl font-medium", exit: exitMode = "wipe", showBar = true }: LoaderCounterProps) => {
  const fade = exitMode === "fade";
  const [isVisible, setIsVisible] = useState(true);
  const [value, setValue] = useState(0);
  const [depth, setDepth] = useState(CURVE);
  const progress = useMotionValue(0);
  const exit = useMotionValue(0);
  useMotionValueEvent(progress, "change", (latest) => setValue(Math.round(latest * 100)));
  const scaleX = useTransform(progress, [0, 1], [0, 1]);
  const contentY = useTransform(exit, [0, 1], ["0vh", fade ? "0vh" : "-100vh"]);
  const layerOpacity = useTransform(exit, [0, 1], [1, fade ? 0 : 1]);
  const path = useTransform(exit, (value) => {
    if (fade) return "M0 0 L0 100 L100 100 L100 0 Z";
    const edge = 100 * (1 - value);
    const control = edge + depth * Math.sin((1 - value) * Math.PI) * 2;
    return `M0 0 L0 ${edge} Q50 ${control} 100 ${edge} L100 0 Z`;
  });

  useEffect(() => {
    setDepth(CURVE * (window.innerWidth / window.innerHeight));
    let exitControls: ReturnType<typeof animate> | undefined;
    const controls = animate(progress, 1, { duration, ease: EASE });
    controls.then(() => {
      exitControls = animate(exit, 1, { duration: 0.7, ease: fade ? "easeInOut" : EXIT_EASE });
      exitControls.then(() => setIsVisible(false));
    });
    return () => {
      controls.stop();
      exitControls?.stop();
    };
  }, [progress, exit, duration, fade]);

  return (
    <AnimatePresence onExitComplete={onComplete}>
      {isVisible && (
        <motion.div style={{ opacity: layerOpacity }} className={`fixed inset-0 z-100 ${fillClassName}`}>
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 block w-full h-full" aria-hidden="true">
            <motion.path d={path} fill="currentColor" />
          </svg>
          <motion.div style={{ y: contentY }} className={`absolute inset-0 flex items-center justify-center ${contentClassName}`}>
            {showBar && <motion.div style={{ scaleX }} className="absolute inset-x-0 top-0 h-1 origin-left bg-current" />}
            <p className={`${numberClassName} leading-none tabular-nums`}>{String(value).padStart(2, "0")}</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LoaderCounter;

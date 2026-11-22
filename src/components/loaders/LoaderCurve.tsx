"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from "motion/react";

interface LoaderCurveProps {
  onComplete?: () => void;
}

const HOLD = 0.15;
const CURVE = 12;

const LoaderCurve = ({ onComplete }: LoaderCurveProps) => {
  const [isVisible, setIsVisible] = useState(true);
  const [depth, setDepth] = useState(CURVE);
  const progress = useMotionValue(0);
  const path = useTransform(progress, (value) => {
    const fill = 1 - value;
    const edge = 100 * fill;
    const control = edge + depth * Math.sin(fill * Math.PI) * 2;
    return `M0 0 L0 ${edge} Q50 ${control} 100 ${edge} L100 0 Z`;
  });

  useEffect(() => {
    setDepth(CURVE * (window.innerWidth / window.innerHeight));
    const controls = animate(progress, 1, { duration: 1.2, ease: [0.625, 0.05, 0, 1], delay: HOLD });
    controls.then(() => setIsVisible(false));
    return () => controls.stop();
  }, [progress]);

  return (
    <AnimatePresence onExitComplete={onComplete}>
      {isVisible && (
        <motion.div className="fixed inset-0 z-100 text-foreground">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="block w-full h-full" aria-hidden="true">
            <motion.path d={path} fill="currentColor" />
          </svg>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LoaderCurve;

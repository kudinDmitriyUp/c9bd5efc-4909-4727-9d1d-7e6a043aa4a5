"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence, useAnimate, useMotionValue, useMotionTemplate } from "motion/react";

interface LoaderCircleProps {
  onComplete?: () => void;
}

const HOLD = 0.15;
const EASE = [0.625, 0.05, 0, 1] as const;

const LoaderCircle = ({ onComplete }: LoaderCircleProps) => {
  const [isVisible, setIsVisible] = useState(true);
  const [scope, animate] = useAnimate();
  const radius = useMotionValue(0);
  const mask = useMotionTemplate`radial-gradient(circle at center, transparent ${radius}px, black ${radius}px)`;

  useEffect(() => {
    const maxRadius = Math.hypot(window.innerWidth, window.innerHeight) / 2 + 2;
    const controls = animate(radius, maxRadius, { duration: 1.1, ease: EASE, delay: HOLD });
    controls.then(() => setIsVisible(false));
    return () => controls.stop();
  }, [animate, radius]);

  return (
    <AnimatePresence onExitComplete={onComplete}>
      {isVisible && (
        <motion.div ref={scope} style={{ maskImage: mask, WebkitMaskImage: mask }} className="fixed inset-0 z-100 bg-foreground" />
      )}
    </AnimatePresence>
  );
};

export default LoaderCircle;

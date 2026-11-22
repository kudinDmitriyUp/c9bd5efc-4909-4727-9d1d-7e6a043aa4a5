"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence, useAnimate, stagger } from "motion/react";

interface LoaderShutterProps {
  onComplete?: () => void;
}

const SHUTTERS = 10;
const HOLD = 0.15;
const DURATION = 0.75;
const STAGGER_AMOUNT = 0.3;

const LoaderShutter = ({ onComplete }: LoaderShutterProps) => {
  const [isVisible, setIsVisible] = useState(true);
  const [scope, animate] = useAnimate();

  useEffect(() => {
    const controls = animate(
      "[data-shutter]",
      { clipPath: "inset(0% 0% 102% 0%)", y: "-50%" },
      { duration: DURATION, ease: [0.16, 1, 0.3, 1], delay: stagger(STAGGER_AMOUNT / (SHUTTERS - 1), { startDelay: HOLD, from: "last" }) }
    );
    controls.then(() => setIsVisible(false));
    return () => controls.stop();
  }, [animate]);

  return (
    <AnimatePresence onExitComplete={onComplete}>
      {isVisible && (
        <motion.div ref={scope} className="fixed inset-0 z-100 flex flex-col overflow-clip">
          {Array.from({ length: SHUTTERS }, (_, index) => (
            <div key={index} data-shutter className="flex-1 scale-y-[1.02] bg-foreground" style={{ clipPath: "inset(0% 0% 0% 0%)" }} />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LoaderShutter;

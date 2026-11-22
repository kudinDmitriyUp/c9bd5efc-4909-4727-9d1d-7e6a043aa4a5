"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence, useAnimate, stagger } from "motion/react";

interface LoaderColumnsProps {
  onComplete?: () => void;
}

const COLUMNS = 5;
const HOLD = 0.15;
const EASE = [0.625, 0.05, 0, 1] as const;

const LoaderColumns = ({ onComplete }: LoaderColumnsProps) => {
  const [isVisible, setIsVisible] = useState(true);
  const [scope, animate] = useAnimate();

  useEffect(() => {
    const lines = animate("[data-lines]", { opacity: 0 }, { duration: 0.6, delay: HOLD });
    const controls = animate("[data-column]", { y: "100%" }, { duration: 0.6, ease: EASE, delay: stagger(0.06, { startDelay: HOLD }) });
    controls.then(() => setIsVisible(false));
    return () => {
      lines.stop();
      controls.stop();
    };
  }, [animate]);

  return (
    <AnimatePresence onExitComplete={onComplete}>
      {isVisible && (
        <motion.div ref={scope} className="fixed inset-0 z-100 overflow-clip">
          <div className="absolute inset-0 flex">
            {Array.from({ length: COLUMNS }, (_, index) => (
              <div key={index} data-column className="flex-1 bg-foreground" />
            ))}
          </div>
          <div data-lines className="absolute inset-0 flex opacity-10">
            {Array.from({ length: COLUMNS }, (_, index) => (
              <div key={index} className="flex-1 border-r border-background last:border-r-0" />
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LoaderColumns;

"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence, useAnimate, stagger } from "motion/react";

interface LoaderLettersProps {
  title?: string;
  onComplete?: () => void;
}

const HOLD = 0.15;
const EASE = [0.76, 0, 0.24, 1] as const;

const LoaderLetters = ({ title = "Studio", onComplete }: LoaderLettersProps) => {
  const [isVisible, setIsVisible] = useState(true);
  const [scope, animate] = useAnimate();

  useEffect(() => {
    const controls = animate([
      ["[data-letter]", { y: "0%" }, { duration: 0.6, ease: EASE, delay: stagger(Math.min(0.04, 0.5 / title.length)), at: HOLD }],
      ["[data-letter]", { y: "-110%" }, { duration: 0.5, ease: EASE, delay: stagger(Math.min(0.025, 0.3 / title.length)), at: "+0.2" }],
      [scope.current, { y: "-101%" }, { duration: 0.7, ease: EASE, at: "-0.4" }],
    ]);
    controls.then(() => setIsVisible(false));
    return () => controls.stop();
  }, [animate, scope, title]);

  return (
    <AnimatePresence onExitComplete={onComplete}>
      {isVisible && (
        <motion.div ref={scope} className="fixed inset-0 z-100 flex items-center justify-center px-6 bg-foreground text-background">
          <h2 aria-label={title} className="flex flex-wrap justify-center overflow-hidden text-5xl md:text-8xl font-semibold leading-[1.1] tracking-tight">
            {Array.from(title, (letter, index) => (
              <span key={index} aria-hidden="true" className="overflow-hidden">
                <motion.span data-letter initial={{ y: "110%" }} className="inline-block whitespace-pre">
                  {letter}
                </motion.span>
              </span>
            ))}
          </h2>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LoaderLetters;

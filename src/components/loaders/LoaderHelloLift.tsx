"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

const lift = [0.86, 0, 0.07, 1] as const;
const FADE_IN = 0.35;
const WORD_TIME = 0.1;
const HOLD = 0.1;

interface LoaderHelloLiftProps {
  words?: string[];
  onComplete?: () => void;
}

const DEFAULT_WORDS = ["Hello", "Bonjour", "Hola", "Ciao"];

const LoaderHelloLift = ({ words = DEFAULT_WORDS,onComplete }: LoaderHelloLiftProps) => {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const count = words.length;

  useEffect(() => {
    if (reduce) {
      setVisible(false);
      return;
    }
    const timers = Array.from({ length: count }, (_, i) => window.setTimeout(() => setIndex(i), (FADE_IN + i * WORD_TIME) * 1000));
    timers.push(window.setTimeout(() => setVisible(false), (FADE_IN + count * WORD_TIME + HOLD) * 1000));
    return () => timers.forEach(window.clearTimeout);
  }, [count, reduce]);

  return (
    <AnimatePresence onExitComplete={onComplete}>
      {visible && !reduce && (
        <motion.div
          key="loader"
          aria-hidden="true"
          exit={{ y: "-100%" }}
          transition={{ duration: 0.7, ease: lift }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-deep text-deep-foreground"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: FADE_IN, ease: [0.23, 1, 0.32, 1] }}
            className="flex items-center gap-[0.35em] text-[length:calc(var(--text-h1)*0.62)] leading-none"
          >
            <div className="size-[0.2em] rounded-full bg-current" />
            <p>{words[index]}</p>
          </motion.div>
          <motion.div
            initial={{ height: "10vh" }}
            exit={{ height: "0vh" }}
            transition={{ duration: 0.9, ease: lift }}
            className="absolute inset-x-0 top-full h-[10vh] overflow-hidden"
          >
            <div className="absolute left-1/2 top-0 h-[745%] w-[150%] -translate-x-1/2 -translate-y-[86.666%] rounded-[50%] bg-deep" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LoaderHelloLift;

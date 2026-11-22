"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence, useAnimate } from "motion/react";

interface LoaderWordsProps {
  words?: string[];
  onComplete?: () => void;
}

const WORD_TIME = 0.15;
const DEFAULT_WORDS = ["Design", "Build", "Launch", "Grow"];

const LoaderWords = ({ words = DEFAULT_WORDS, onComplete }: LoaderWordsProps) => {
  const [isVisible, setIsVisible] = useState(true);
  const [index, setIndex] = useState(0);
  const [scope, animate] = useAnimate();

  useEffect(() => {
    let cancelled = false;
    const timers: number[] = [];
    const run = async () => {
      await animate("[data-words]", { opacity: 1, y: "0%" }, { duration: 0.6, ease: [0.87, 0, 0.13, 1] });
      words.forEach((_, wordIndex) => {
        timers.push(window.setTimeout(() => !cancelled && setIndex(wordIndex), (wordIndex + 1) * WORD_TIME * 1000));
      });
      timers.push(
        window.setTimeout(() => {
          if (cancelled) return;
          animate("[data-words]", { opacity: 0, y: "-75%" }, { duration: 0.8, ease: [0.7, 0, 0.84, 0] });
          timers.push(window.setTimeout(() => !cancelled && setIsVisible(false), 400));
        }, (words.length + 1) * WORD_TIME * 1000)
      );
    };
    run();
    return () => {
      cancelled = true;
      timers.forEach(window.clearTimeout);
    };
  }, [animate, words]);

  return (
    <AnimatePresence onExitComplete={onComplete}>
      {isVisible && (
        <motion.div
          ref={scope}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: [0.45, 0, 0.55, 1] }}
          className="fixed inset-0 z-100 flex items-center justify-center bg-foreground text-background"
        >
          <motion.div data-words initial={{ opacity: 0, y: "50%" }} className="flex items-center gap-8">
            <div className="size-3 rounded-full bg-background" />
            <p className="text-5xl md:text-7xl font-medium leading-none">{words[index]}</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LoaderWords;

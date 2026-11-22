"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";

type LoaderTypingBubbleProps = {
  word?: string;
  onComplete?: () => void;
};

const WIPE = [0.52, 0, 0, 1] as const;
const START = 0.3;
const LETTER = 0.07;
const LEAVE_AT = 1.6;
const LEAVE = 0.7;

const LoaderTypingBubble = ({ word = "Hey there!", onComplete }: LoaderTypingBubbleProps) => {
  const reduce = useReducedMotion();
  const [count, setCount] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const [done, setDone] = useState(false);
  const finish = useRef(onComplete);
  const letters = Array.from(word);

  useEffect(() => {
    finish.current = onComplete;
  });

  useEffect(() => {
    if (reduce) {
      setDone(true);
      finish.current?.();
      return;
    }
    let typed = 0;
    let interval = 0;
    const begin = window.setTimeout(() => {
      interval = window.setInterval(() => {
        typed += 1;
        setCount(typed);
        if (typed >= letters.length) window.clearInterval(interval);
      }, LETTER * 1000);
    }, START * 1000);
    const leave = window.setTimeout(() => setLeaving(true), LEAVE_AT * 1000);
    const end = window.setTimeout(() => {
      setDone(true);
      finish.current?.();
    }, (LEAVE_AT + LEAVE) * 1000);
    return () => {
      window.clearTimeout(begin);
      window.clearInterval(interval);
      window.clearTimeout(leave);
      window.clearTimeout(end);
    };
  }, [reduce, letters.length]);

  if (reduce || done) return null;

  return (
    <motion.div
      aria-hidden="true"
      initial={{ clipPath: "inset(0 0 0% 0)" }}
      animate={{ clipPath: leaving ? "inset(0 0 100% 0)" : "inset(0 0 0% 0)" }}
      transition={{ duration: LEAVE, ease: WIPE }}
      className="pointer-events-none fixed inset-0 z-[100000] bg-background"
    >
      <div className="absolute inset-0 bg-[linear-gradient(to_right,color-mix(in_srgb,var(--foreground)_5%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_srgb,var(--foreground)_5%,transparent)_1px,transparent_1px)] bg-[length:6.25rem_6.25rem] bg-[position:center_top]" />
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          initial={{ y: "0svh", scale: 1 }}
          animate={leaving ? { y: "-40svh", scale: 0.6 } : { y: "0svh", scale: 1 }}
          transition={{ duration: LEAVE, ease: WIPE }}
          className="will-change-transform"
        >
          <motion.div
            initial={{ scale: 0.2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ scale: { type: "spring", stiffness: 520, damping: 18 }, opacity: { duration: 0.12 } }}
            className="flex min-w-[4.5rem] origin-bottom-left items-center justify-center rounded-[var(--radius-card)] rounded-bl-none border-2 border-foreground bg-secondary px-[1.1rem] py-[0.85rem] text-secondary-foreground"
          >
            <p className="whitespace-nowrap text-[length:var(--text-h3)] leading-[1.1]">{letters.slice(0, count).join("")}</p>
            <motion.div
              animate={{ opacity: [1, 1, 0, 0] }}
              transition={{ duration: 0.8, times: [0, 0.5, 0.51, 1], repeat: Infinity, ease: "linear" }}
              className="ml-[0.08em] h-[1.1em] w-[2px] bg-foreground text-[length:var(--text-h3)]"
            />
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default LoaderTypingBubble;

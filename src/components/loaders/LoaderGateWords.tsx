"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";

type LoaderGateWordsProps = {
  label?: string;
  onComplete?: () => void;
};

const power3Out = [0.215, 0.61, 0.355, 1] as const;
const power2In = [0.55, 0.085, 0.68, 0.53] as const;
const power2InOut = [0.45, 0, 0.55, 1] as const;

const START = 0.4;
const WORDS_SPAN = 1.25;
const WORD_IN = 0.65;
const HOLD = 0.05;
const WORD_OUT = 0.6;
const LAYER_FADE = 0.7;

const LoaderGateWords = ({ label = "Built on distinction, desire and identity.", onComplete }: LoaderGateWordsProps) => {
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState<"in" | "out" | "fade" | "done">("in");
  const words = label.split(/\s+/).filter(Boolean);

  const raw: number[] = [];
  let t = 0;
  words.forEach((word, i) => {
    raw.push(t);
    t += 0.11 + (/[.!?]$/.test(word) && i < words.length - 1 ? 0.42 : /[,;:]$/.test(word) ? 0.25 : 0);
  });
  const last = raw[raw.length - 1] ?? 0;
  const squeeze = last > WORDS_SPAN ? WORDS_SPAN / last : 1;
  const delays = raw.map((d) => START + d * squeeze);
  const textEnd = (delays[delays.length - 1] ?? START) + WORD_IN;
  const outAt = textEnd + HOLD;
  const fadeAt = outAt + 0.15;
  const doneAt = fadeAt + LAYER_FADE;

  const done = useRef(onComplete);

  useEffect(() => {
    done.current = onComplete;
  });

  useEffect(() => {
    if (reduce) {
      setPhase("done");
      done.current?.();
      return;
    }
    const timers = [
      window.setTimeout(() => setPhase("out"), outAt * 1000),
      window.setTimeout(() => setPhase("fade"), fadeAt * 1000),
      window.setTimeout(() => {
        setPhase("done");
        done.current?.();
      }, doneAt * 1000),
    ];
    return () => timers.forEach(window.clearTimeout);
  }, [reduce, outAt, fadeAt, doneAt]);

  if (reduce || phase === "done") return null;

  const leaving = phase === "out" || phase === "fade";

  return (
    <motion.div
      aria-hidden="true"
      initial={false}
      animate={{ opacity: phase === "fade" ? 0 : 1 }}
      transition={{ duration: LAYER_FADE, ease: power2InOut }}
      className="pointer-events-none fixed inset-0 z-[100000] bg-deep text-deep-foreground"
    >
      <div className="absolute inset-0 flex items-center justify-center px-[var(--gutter)]">
        <div className="max-w-[28rem] text-center font-[family-name:var(--font-body)] text-[length:var(--text-label)] font-semibold uppercase leading-[2] tracking-[var(--label-tracking)]">
          {words.flatMap((word, i) => [
            <motion.div
              key={`${i}-${word}`}
              className="inline-block"
              initial={{ opacity: 0, y: 12, filter: "blur(8px)" }}
              animate={leaving ? { opacity: 0, y: -12, filter: "blur(8px)" } : { opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={leaving ? { duration: WORD_OUT, ease: power2In, delay: i * 0.03 } : { duration: WORD_IN, ease: power3Out, delay: delays[i] }}
            >
              {word}
            </motion.div>,
            i < words.length - 1 ? " " : null,
          ])}
        </div>
      </div>
      <motion.div
        animate={leaving ? { opacity: 0, y: 16 } : { opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: power2In }}
        className="absolute inset-x-0 bottom-[4rem] flex justify-center"
      >
        <div className="h-[2px] w-[16rem] max-w-[60vw] bg-[color-mix(in_srgb,var(--deep-foreground)_10%,transparent)]">
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: textEnd - START, ease: "linear", delay: START }}
            className="h-full w-full origin-left bg-foreground"
          />
        </div>
      </motion.div>
    </motion.div>
  );
};

export default LoaderGateWords;

"use client";

import { Fragment, useRef } from "react";
import { motion, useReducedMotion } from "motion/react";
import { useWordLines } from "@/components/kit/useWordLines";

type Ease = [number, number, number, number];

const HERO: Ease = [0.616, 0.007, 0.132, 1.002];
const POWER3_IN: Ease = [0.32, 0, 0.67, 0];

type UnmaskCharsProps = {
  text: string;
  shown: boolean;
  from?: "bottom" | "top";
  delay?: number;
  duration?: number;
  ease?: Ease;
  charStagger?: number;
  lineStagger?: number;
  className?: string;
};

export default function UnmaskChars({ text, shown, from, delay = 0, duration = 1.2, ease = HERO, charStagger = 0.02, lineStagger = 0.12, className }: UnmaskCharsProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const lines = useWordLines(ref, text);
  const lengths = new Map<number, number>();
  const words = text.split(" ").map((word, index) => {
    const line = lines[index] ?? 0;
    const start = lengths.get(line) ?? 0;
    lengths.set(line, start + word.length);
    return { word, line, start };
  });
  const visible = shown || !!reduce;

  return (
    <div ref={ref} className={className}>
      <div className="sr-only">{text}</div>
      <div aria-hidden="true">
        {words.map(({ word, line, start }, index) => {
          const sign = (from ?? (line % 2 === 0 ? "bottom" : "top")) === "bottom" ? 1 : -1;
          const total = lengths.get(line) ?? 1;
          return (
            <Fragment key={index}>
              {index > 0 && " "}
              <div data-word className="inline-block overflow-hidden whitespace-nowrap align-top">
                {Array.from(word).map((char, charIndex) => {
                  const order = start + charIndex;
                  return (
                    <motion.div
                      key={charIndex}
                      initial={reduce ? false : { y: `${sign * 100}%` }}
                      animate={{ y: visible ? "0%" : `${sign * 100}%` }}
                      transition={
                        visible
                          ? { duration, ease, delay: delay + line * lineStagger + order * charStagger }
                          : { duration: duration * 0.5, ease: POWER3_IN, delay: line * lineStagger * 0.5 + (total - 1 - order) * charStagger * 0.5 }
                      }
                      className="inline-block will-change-transform"
                    >
                      {char}
                    </motion.div>
                  );
                })}
              </div>
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}

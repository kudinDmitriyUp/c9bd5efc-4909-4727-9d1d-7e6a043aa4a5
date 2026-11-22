"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

interface WordSwapHeadlineProps {
  before?: string;
  words?: string[];
  after?: string;
  interval?: number;
  delay?: number;
  as?: "h1" | "h2" | "h3" | "p" | "div";
  reserveLongest?: boolean;
  className?: string;
  wordClassName?: string;
}

const DEFAULT_WORDS = ["ships", "scales", "lasts", "converts"];

const EASE = [0.77, 0, 0.175, 1] as const;

const WordSwapHeadline = ({
  before = "Design that",
  words = DEFAULT_WORDS,
  after,
  interval = 1.75,
  delay = 0,
  as: Tag = "h2",
  reserveLongest = false,
  className = "",
  wordClassName = "",
}: WordSwapHeadlineProps) => {
  const [step, setStep] = useState(0);
  const index = step % Math.max(words.length, 1);
  const [widths, setWidths] = useState<number[]>([]);
  const wordRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const previous = (index - 1 + words.length) % words.length;
  const slotWidth = reserveLongest ? Math.max(0, ...widths) : widths[index];
  const x = reserveLongest ? "-50%" : "0%";

  useEffect(() => {
    const measure = () => setWidths(wordRefs.current.map((word) => word?.offsetWidth ?? 0));
    measure();
    document.fonts?.ready.then(measure).catch(() => {});
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [words]);

  useEffect(() => {
    if (words.length < 2) return;
    let timer = 0;
    const wait = window.setTimeout(() => {
      timer = window.setInterval(() => setStep((current) => current + 1), interval * 1000);
    }, delay * 1000);
    return () => {
      window.clearTimeout(wait);
      window.clearInterval(timer);
    };
  }, [words.length, interval, delay]);

  return (
    <Tag className={cn("text-5xl md:text-7xl font-medium leading-none tracking-tight text-center text-balance", className)}>
      {before && `${before} `}
      <motion.span
        initial={false}
        animate={{ width: slotWidth || "auto" }}
        transition={{ duration: 0.75, ease: EASE }}
        className="relative inline-block align-bottom overflow-x-visible overflow-y-clip pb-[0.15em] -mb-[0.15em] text-primary"
      >
        <span className="sr-only">{words[index]}</span>
        <span aria-hidden="true" className="invisible">&nbsp;</span>
        {words.map((word, wordIndex) => (
          <motion.span
            key={word}
            ref={(el) => {
              wordRefs.current[wordIndex] = el;
            }}
            aria-hidden="true"
            initial={{ x, y: wordIndex === 0 ? "0%" : "150%", opacity: wordIndex === 0 ? 1 : 0 }}
            animate={
              wordIndex === index
                ? { x, y: "0%", opacity: 1, transition: { duration: 0.75, ease: EASE } }
                : wordIndex === previous && step > 0
                  ? { x, y: "-150%", opacity: 0, transition: { duration: 0.6, ease: EASE } }
                  : { x, y: "150%", opacity: 0, transition: { duration: 0 } }
            }
            className={cn("absolute top-0 whitespace-nowrap", reserveLongest ? "left-1/2" : "left-0", wordClassName)}
          >
            {word}
          </motion.span>
        ))}
      </motion.span>
      {after && ` ${after}`}
    </Tag>
  );
};

export default WordSwapHeadline;

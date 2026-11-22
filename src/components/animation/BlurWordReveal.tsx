"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import type { MotionValue } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

interface BlurWordRevealProps {
  text?: string;
  tag?: "h1" | "h2" | "h3" | "p";
  className?: string;
  scrub?: boolean;
  delay?: number;
}

const ScrubWord = ({ word, index, total, progress }: { word: string; index: number; total: number; progress: MotionValue<number> }) => {
  const start = (index / total) * 0.7;
  const range = [start, start + 0.3];
  const opacity = useTransform(progress, range, [0, 1]);
  const y = useTransform(progress, range, ["0.3em", "0em"]);
  const filter = useTransform(progress, range, ["blur(10px)", "blur(0px)"]);
  return (
    <motion.div className="inline-block indent-0 will-change-[filter,transform]" style={{ opacity, y, filter }}>
      {word}
    </motion.div>
  );
};

const BlurWordReveal = ({ text = "Design that ships and is built for the long run", tag = "p", className = "", scrub = false, delay = 0 }: BlurWordRevealProps) => {
  const ref = useRef<HTMLHeadingElement>(null);
  const reduce = useReducedMotion();
  const words = text.split(/\s+/).filter(Boolean);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.85", "start 0.35"] });
  const Tag = tag === "p" ? "div" : tag;

  return (
    <Tag ref={ref} aria-label={text} className={cn(className, !/(^|\s)leading-/.test(className) && "leading-[1.2]")}>
      {words.map((word, i) => (
        <div key={i} aria-hidden="true" className="inline">
          {i > 0 && " "}
          {reduce ? (
            <div className="inline-block indent-0">{word}</div>
          ) : scrub ? (
            <ScrubWord word={word} index={i} total={words.length} progress={scrollYProgress} />
          ) : (
            <motion.div
              className="inline-block indent-0"
              initial={{ opacity: 0, y: "0.3em", filter: "blur(10px)" }}
              whileInView={{ opacity: 1, y: "0em", filter: "blur(0px)" }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5, delay: delay + i * Math.min(0.05, 0.3 / Math.max(1, words.length - 1)), ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              {word}
            </motion.div>
          )}
        </div>
      ))}
    </Tag>
  );
};

export default BlurWordReveal;

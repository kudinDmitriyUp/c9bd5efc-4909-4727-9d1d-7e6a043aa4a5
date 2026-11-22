"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import type { MotionValue, UseScrollOptions } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

interface TextColorFillOnScrollProps {
  text?: string;
  tag?: "h1" | "h2" | "h3" | "h4" | "p" | "span" | "div";
  dimmed?: number;
  blur?: number;
  offset?: UseScrollOptions["offset"];
  className?: string;
}

const Word = ({
  word,
  index,
  total,
  progress,
  dimmed,
  blur,
}: {
  word: string;
  index: number;
  total: number;
  progress: MotionValue<number>;
  dimmed: number;
  blur: number;
}) => {
  const t = useTransform(progress, (v) => Math.min(1, Math.max(0, v * total - index)));
  const opacity = useTransform(t, (v) => dimmed + (1 - dimmed) * v);
  const filter = useTransform(t, (v) => `blur(${blur * (1 - v)}px)`);
  return (
    <motion.span className="inline-block indent-0" style={blur ? { opacity, filter } : { opacity }}>
      {word}
    </motion.span>
  );
};

const TextColorFillOnScroll = ({ text = "Design that ships and stays sharp, built for the long run",tag = "p", dimmed = 0.15, blur = 0, offset = ["start 0.8", "start 0.2"], className = "" }: TextColorFillOnScrollProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const words = text.split(" ");

  const { scrollYProgress } = useScroll({
    target: ref,
    offset,
  });

  const Tag = tag;

  return (
    <div ref={ref}>
      <Tag className={cn("leading-[1.2]", className)}>
        {words.map((word, i) => (
          <span key={i}>
            {i > 0 && " "}
            <Word word={word} index={i} total={words.length} progress={scrollYProgress} dimmed={dimmed} blur={blur} />
          </span>
        ))}
      </Tag>
    </div>
  );
};

export default TextColorFillOnScroll;

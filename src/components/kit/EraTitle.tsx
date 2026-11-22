"use client";

import { useRef } from "react";
import { motion, useReducedMotion, type Variants } from "motion/react";
import { useWordLines } from "@/components/kit/useWordLines";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import DrawOnScroll from "@/components/animation/DrawOnScroll";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

type EraTitleProps = {
  text?: string;
  script?: string;
  as?: "h1" | "h2" | "h3" | "p";
  align?: "center" | "left";
  rule?: boolean;
  delay?: number;
  play?: boolean;
  className?: string;
  scriptClassName?: string;
};

const EASE: [number, number, number, number] = [0.25, 1, 0.5, 1];

const EraTitle = ({ text, script, as = "h2", align = "center", rule = false, delay = 0, play, className, scriptClassName }: EraTitleProps) => {
  const reduce = useReducedMotion();
  const Tag = as;
  const wordsRef = useRef<HTMLDivElement>(null);
  const words = (text ?? "").split(/\s+/).filter(Boolean);
  const lineOf = useWordLines(wordsRef, text ?? "");
  const lineCount = words.length ? Math.max(0, ...lineOf) + 1 : 0;
  if (!words.length && !script) return null;
  const trigger =
    play === undefined
      ? { initial: reduce ? false : ("hidden" as const), whileInView: "show", viewport: { once: true, amount: 0.3 } }
      : { initial: reduce ? false : ("hidden" as const), animate: play ? "show" : "hidden" };
  const lineVariants = (i: number): Variants => ({
    hidden: { y: "105%" },
    show: { y: "0%", transition: { duration: 1.2, ease: EASE, delay: delay + i * 0.08 } },
  });
  const scriptVariants: Variants = {
    hidden: { clipPath: "inset(-20% 100% -20% 0%)" },
    show: { clipPath: "inset(-20% 0% -20% 0%)", transition: { duration: 1.2, ease: [0.75, 0, 0.25, 1], delay: delay + 0.35 + lineCount * 0.08 } },
  };

  return (
    <div className={cn("flex w-full flex-col", align === "center" ? "items-center text-center" : "items-start text-left")}>
      <motion.div className="relative" {...trigger}>
        {words.length > 0 && (
          <Tag aria-label={text} className={cn("text-[length:var(--text-h1)] [overflow-wrap:anywhere]", className)}>
            <div ref={wordsRef} aria-hidden="true">
              {words.flatMap((word, i) => [
                <div key={i} data-word className="inline-block overflow-hidden pb-[0.06em] align-top">
                  <motion.div className="block" variants={lineVariants(lineOf[i] ?? 0)}>
                    {word}
                  </motion.div>
                </div>,
                i < words.length - 1 ? " " : null,
              ])}
            </div>
          </Tag>
        )}
        {script && (
          <motion.p
            aria-hidden={words.length ? true : undefined}
            className={cn(
              "pointer-events-none font-[family-name:var(--font-script)] text-[length:calc(var(--text-h1)*0.62)] leading-none tracking-normal normal-case",
              words.length ? "ml-auto mt-[0.1em] w-max -rotate-6" : "relative",
              scriptClassName,
            )}
            variants={scriptVariants}
          >
            {script}
          </motion.p>
        )}
      </motion.div>
      {rule && (
        <div className={cn("h-12 w-px", script ? "mt-10" : "mt-6")}>
          <DrawOnScroll d="M0.5 0 V48" viewBox="0 0 1 48" strokeWidth={1} className="h-12 text-current opacity-50" />
        </div>
      )}
    </div>
  );
};

export default EraTitle;

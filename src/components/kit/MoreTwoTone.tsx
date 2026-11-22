"use client";

import { motion, useReducedMotion } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { useKitMotion } from "@/components/kit/kitMotion";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

type MoreTwoToneProps = {
  title?: string;
  accent?: string;
  accentFirst?: boolean;
  tag?: "h1" | "h2" | "h3";
  delay?: number;
  balance?: boolean;
  accentClassName?: string;
  className?: string;
};

const MoreTwoTone = ({ title = "You deserve more.", accent, accentFirst = false, tag = "h2", delay = 0, balance = false, accentClassName = "text-accent", className }: MoreTwoToneProps) => {
  const reduce = useReducedMotion();
  const { ease, slow } = useKitMotion();
  const Tag = tag;
  const main = { text: title, tone: "" };
  const quiet = { text: accent ?? "", tone: accentClassName };
  const lines = (accentFirst ? [quiet, main] : [main, quiet]).filter((line) => line.text.trim());
  let count = 0;

  return (
    <Tag className={cn("text-balance text-[length:var(--text-h2)] leading-[1]", className)}>
      {lines.map((line, l) => (
        <div key={l} className="[justify-content:inherit]">
        <div className="sr-only">{line.text}</div>
        <motion.div
          aria-hidden="true"
          initial={reduce ? false : "hidden"}
          whileInView="shown"
          viewport={{ once: true, margin: "0px 0px -8% 0px" }}
          className={cn(balance ? "block text-balance" : "flex flex-wrap [justify-content:inherit] gap-x-[0.2em]", line.tone)}
        >
          {line.text.split(/\s+/).filter(Boolean).map((word, i, words) => {
            const index = count++;
            return (
              <div key={i} className={cn("overflow-hidden pb-[0.15em] -mb-[0.15em]", balance && "inline-block align-top", balance && i < words.length - 1 && "mr-[0.2em]")}>
                <motion.div
                  variants={{ hidden: { y: "110%" }, shown: { y: "0%", transition: { duration: slow, ease, delay: delay + index * 0.045 } } }}
                  className="whitespace-nowrap"
                >
                  {word}
                </motion.div>
              </div>
            );
          })}
        </motion.div>
        </div>
      ))}
    </Tag>
  );
};

export default MoreTwoTone;

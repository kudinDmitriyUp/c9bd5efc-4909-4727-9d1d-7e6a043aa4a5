"use client";

import { Fragment } from "react";
import { motion, useReducedMotion, type Variants } from "motion/react";
import { useKitMotion } from "@/components/kit/kitMotion";

type LaunchfolioTwoToneProps = {
  as?: "h1" | "h2" | "h3";
  quiet?: string;
  strong: string;
  onLoad?: boolean;
  delay?: number;
  className?: string;
};

const LaunchfolioTwoTone = ({ as = "h2", quiet, strong, onLoad = false, delay = 0, className }: LaunchfolioTwoToneProps) => {
  const reduce = useReducedMotion();
  const { ease, slow } = useKitMotion();
  const Tag = as === "h1" ? motion.h1 : as === "h3" ? motion.h3 : motion.h2;
  const lines = [
    { text: quiet ?? "", tone: "text-[color:var(--heading-quiet,color-mix(in_srgb,var(--foreground)_49%,var(--background)))]" },
    { text: strong, tone: "text-foreground" },
  ].filter((line) => line.text.trim());

  const word: Variants = {
    hidden: { opacity: 0.001, filter: "blur(5px)", y: 10 },
    show: (index: number) => ({ opacity: 1, filter: "blur(0px)", y: 0, transition: { duration: slow, ease, delay: delay + index * 0.05 } }),
  };

  const trigger = reduce ? { initial: false as const } : onLoad ? { initial: "hidden", animate: "show" } : { initial: "hidden", whileInView: "show", viewport: { once: true, amount: 0.5 } };

  const split = lines.map((line) => line.text.trim().split(/\s+/));
  const offsets = split.map((_, l) => split.slice(0, l).reduce((sum, words) => sum + words.length, 0));

  return (
    <Tag {...trigger} className={className}>
      {lines.map((line, l) => (
        <div key={l} className={`block text-balance [overflow-wrap:anywhere] ${line.tone}`}>
          <div className="sr-only">{line.text}</div>
          <div aria-hidden="true" className="contents">
            {split[l].map((text, w) => (
              <Fragment key={w}>
                {w > 0 && " "}
                <motion.div custom={offsets[l] + w} variants={word} className="inline-block">
                  {text}
                </motion.div>
              </Fragment>
            ))}
          </div>
        </div>
      ))}
    </Tag>
  );
};

export default LaunchfolioTwoTone;

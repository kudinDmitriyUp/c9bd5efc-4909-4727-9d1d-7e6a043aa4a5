"use client";

import { Fragment, useRef, type CSSProperties } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";

type GradientWordRiseProps = {
  text: string;
  fade?: number;
  tag?: "h1" | "h2" | "h3" | "p";
  delay?: number;
  className?: string;
  style?: CSSProperties;
};

const rise = { duration: 1, ease: [0.165, 0.84, 0.44, 1] } as const;

const GradientWordRise = ({ text, fade = 2, tag = "h2", delay = 0, className, style }: GradientWordRiseProps) => {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const inView = useInView(ref, { once: true, margin: "0px 0px -5% 0px" });
  const words = text.split(/\s+/).filter(Boolean);
  const shown = reduce || inView;
  const start = Math.max(1, words.length - fade);
  const Tag = tag === "p" ? "div" : tag;

  return (
    <Tag ref={ref as never} className={className} style={style}>
      <p className="sr-only !whitespace-normal">{text}</p>
      <div aria-hidden="true">
        {words.map((word, index) => (
          <Fragment key={index}>
            <div className="-mb-[0.12em] inline-flex overflow-hidden pb-[0.12em]">
              <motion.div
                initial={reduce ? false : { y: "110%" }}
                animate={{ y: shown ? "0%" : "110%" }}
                transition={{ ...rise, delay: delay + (index + 1) * 0.02 }}
                className={index >= start ? "bg-[linear-gradient(180deg,var(--foreground)_10%,color-mix(in_srgb,var(--foreground)_38%,transparent)_95%)] bg-clip-text pb-[0.08em] text-transparent" : undefined}
              >
                {word}
              </motion.div>
            </div>
            {index < words.length - 1 ? " " : null}
          </Fragment>
        ))}
      </div>
    </Tag>
  );
};

export default GradientWordRise;

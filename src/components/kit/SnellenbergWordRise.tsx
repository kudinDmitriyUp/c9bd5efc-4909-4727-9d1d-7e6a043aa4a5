"use client";

import { Fragment, useRef, type CSSProperties, type ReactNode } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";

type SnellenbergWordRiseProps = {
  text?: string;
  tag?: "h1" | "h2" | "h3" | "p";
  lead?: ReactNode;
  delay?: number;
  className?: string;
  style?: CSSProperties;
};

const rise = { duration: 1, ease: [0.165, 0.84, 0.44, 1] } as const;

const SnellenbergWordRise = ({ text = "Design that ships", tag = "p", lead, delay = 0, className, style }: SnellenbergWordRiseProps) => {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const inView = useInView(ref, { once: true, margin: "0px 0px -5% 0px" });
  const words = text.split(/\s+/).filter(Boolean);
  const shown = reduce || inView;
  const Tag = tag === "p" ? "div" : tag;

  return (
    <Tag ref={ref as never} className={className} style={style}>
      <p className="sr-only !whitespace-normal">{text}</p>
      <div aria-hidden="true">
        {lead && (
          <>
            <div className="-mb-[0.12em] inline-flex overflow-hidden pb-[0.12em] align-middle">
              <motion.div initial={reduce ? false : { y: "110%" }} animate={{ y: shown ? "0%" : "110%" }} transition={{ ...rise, delay }}>
                {lead}
              </motion.div>
            </div>{" "}
          </>
        )}
        {words.map((word, index) => (
          <Fragment key={index}>
            <div className="-mb-[0.12em] inline-flex overflow-hidden pb-[0.12em]">
              <motion.div
                initial={reduce ? false : { y: "110%" }}
                animate={{ y: shown ? "0%" : "110%" }}
                transition={{ ...rise, delay: delay + (index + 1) * 0.01 }}
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

export default SnellenbergWordRise;

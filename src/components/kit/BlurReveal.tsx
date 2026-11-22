"use client";

import type { ReactNode, Ref } from "react";
import { motion, useReducedMotion } from "motion/react";

const EASE: [number, number, number, number] = [0.33, 1, 0.68, 1];

const TAGS = { div: motion.div, p: motion.p, h1: motion.h1, h2: motion.h2, h3: motion.h3, li: motion.li, ul: motion.ul, article: motion.article, form: motion.form, a: motion.a } as const;

type BlurRevealProps = {
  as?: keyof typeof TAGS;
  words?: string;
  children?: ReactNode;
  className?: string;
  wordClassName?: string | ((word: string) => string);
  delay?: number;
  x?: number;
  y?: number;
  once?: boolean;
  margin?: string;
  duration?: number;
  stagger?: number;
  ref?: Ref<HTMLElement>;
  onSubmit?: React.FormEventHandler<HTMLFormElement>;
  show?: boolean;
  blur?: boolean;
};

const BlurReveal = ({ as = "div", words, children, className, wordClassName, delay = 0, x = 0, y = 16, once = true, margin = "0px 0px -10% 0px", duration, stagger = 0.06, ref, onSubmit, show, blur = true }: BlurRevealProps) => {
  const reduce = useReducedMotion();
  const noIO = typeof IntersectionObserver === "undefined" && show === undefined;
  const off = reduce || noIO;
  const Tag = TAGS[as] as typeof motion.div;
  const hidden = { opacity: 0, x, y, ...(blur ? { filter: "blur(8px)" } : {}) };
  const shown = { opacity: 1, x: 0, y: 0, ...(blur ? { filter: "blur(0px)" } : {}) };
  const viewport = { once, margin };
  const gate = show === undefined;

  if (words !== undefined) {
    const list = words.split(/\s+/).filter(Boolean);
    return (
      <Tag
        ref={ref as Ref<HTMLDivElement>}
        aria-label={words}
        initial={off ? false : "hidden"}
        whileInView={gate ? "show" : undefined}
        animate={gate ? undefined : show || off ? "show" : "hidden"}
        viewport={viewport}
        transition={{ staggerChildren: stagger, delayChildren: delay }}
        className={className}
      >
        {list.map((word, i) => (
          <motion.div
            key={i}
            aria-hidden="true"
            variants={{ hidden, show: shown }}
            transition={{ duration: duration ?? 0.9, ease: EASE }}
            className={`inline-block${i < list.length - 1 ? " mr-[0.25em]" : ""}${wordClassName ? ` ${typeof wordClassName === "function" ? wordClassName(word) : wordClassName}` : ""}`}
          >
            {word}
          </motion.div>
        ))}
      </Tag>
    );
  }

  return (
    <Tag
      ref={ref as Ref<HTMLDivElement>}
      initial={off ? false : hidden}
      whileInView={gate ? shown : undefined}
      animate={gate ? undefined : show || off ? shown : hidden}
      viewport={viewport}
      transition={{ duration: duration ?? 1.2, ease: EASE, delay }}
      onSubmit={onSubmit as never}
      className={className}
    >
      {children}
    </Tag>
  );
};

export default BlurReveal;

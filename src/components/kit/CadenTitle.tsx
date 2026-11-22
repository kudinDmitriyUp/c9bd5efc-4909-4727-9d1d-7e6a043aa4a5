"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion, type Variants } from "motion/react";

type CadenTitleProps = {
  label?: string;
  title?: string;
  description?: string;
  align?: "center" | "left";
  as?: "h1" | "h2";
  size?: "h1" | "h2";
  className?: string;
  children?: ReactNode;
};

const FADE: Variants = {
  hidden: { opacity: 0 },
  show: (i: number) => ({ opacity: 1, transition: { duration: 1.2, ease: [0.25, 0.1, 0.25, 1], delay: i * 0.1 } }),
};

const CadenTitle = ({ label, title, description, align = "center", as = "h2", size = "h1", className = "", children }: CadenTitleProps) => {
  const reduce = useReducedMotion() ?? false;
  const center = align === "center";
  const Heading = as === "h1" ? motion.h1 : motion.h2;
  if (!label && !title && !description && !children) return null;

  return (
    <motion.div
      initial={reduce ? false : "hidden"}
      whileInView="show"
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
      className={`flex flex-col gap-4 ${center ? "items-center text-center" : "items-start text-left"} ${className}`}
    >
      {label && (
        <motion.p custom={0} variants={FADE} className="w-fit text-[length:var(--text-label)] font-medium uppercase leading-[1.3] tracking-[var(--label-tracking)]">
          {label}
        </motion.p>
      )}
      {title && (
        <Heading custom={1} variants={FADE} className={`${size === "h2" ? "text-[length:var(--text-h2)]" : "text-[length:var(--text-h1)]"} leading-[1] tracking-[-0.035em] text-balance [overflow-wrap:anywhere] ${center ? "lg:max-w-[80%]" : ""}`}>
          {title}
        </Heading>
      )}
      {description && (
        <motion.p custom={2} variants={FADE} className={`text-[length:var(--text-body)] font-normal leading-[1.55] text-balance opacity-70 ${center ? "lg:max-w-[60%]" : "max-w-[36rem]"}`}>
          {description}
        </motion.p>
      )}
      {children && (
        <motion.div custom={3} variants={FADE} className="pt-3">
          {children}
        </motion.div>
      )}
    </motion.div>
  );
};

export default CadenTitle;

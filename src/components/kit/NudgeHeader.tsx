"use client";

import { motion, useReducedMotion } from "motion/react";
import { useKitMotion } from "@/components/kit/kitMotion";

type NudgeHeaderProps = {
  note?: string;
  title?: string;
  description?: string;
  align?: "center" | "left";
  tone?: "page" | "deep";
  className?: string;
};

const NudgeHeader = ({ note, title = "Featured works", description, align = "center", tone = "page", className = "" }: NudgeHeaderProps) => {
  const reduce = useReducedMotion();
  const { ease, base } = useKitMotion();
  const words = title.split(/\s+/).filter(Boolean);
  const centered = align === "center";
  const stickyTone = tone === "deep" ? "bg-secondary text-secondary-foreground" : "bg-muted text-foreground";
  return (
    <motion.div
      initial="hidden"
      whileInView="shown"
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
      className={`flex flex-col gap-[clamp(0.75rem,1.5vw,1.25rem)] ${centered ? "items-center text-center" : "items-start text-left"} ${className}`}
    >
      {note && (
        <div className="relative flex flex-col items-center">
          <motion.p
            variants={{ hidden: { clipPath: "inset(0 100% 0 0)" }, shown: { clipPath: "inset(0 0% 0 0)" } }}
            transition={reduce ? { duration: 0 } : { duration: base, ease }}
            className="font-[family-name:var(--font-script,var(--font-heading))] text-[length:var(--text-h3)] leading-[1.1] -rotate-[3deg]"
          >
            {note}
          </motion.p>
          <svg viewBox="0 0 80 10" aria-hidden="true" className="h-[0.6rem] w-[4.5rem]" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
            <motion.path
              d="M2 3.5 C 25 2, 55 2, 78 3"
              variants={{ hidden: { pathLength: 0 }, shown: { pathLength: 1 } }}
              transition={reduce ? { duration: 0 } : { duration: base * 0.6, ease, delay: base * 0.5 }}
            />
            <motion.path
              d="M6 7.5 C 30 6, 52 6.2, 74 7"
              variants={{ hidden: { pathLength: 0 }, shown: { pathLength: 1 } }}
              transition={reduce ? { duration: 0 } : { duration: base * 0.6, ease, delay: base * 0.65 }}
            />
          </svg>
        </div>
      )}
      <h2 className={`flex max-w-[16ch] flex-wrap font-[family-name:var(--font-heading)] text-[length:var(--text-h1)] uppercase leading-[0.95] ${centered ? "justify-center" : "justify-start"}`}>
        <div className="sr-only">{title}</div>
        <div aria-hidden="true" className={`flex w-full flex-wrap ${centered ? "justify-center" : "justify-start"}`}>
          {words.map((word, index) => (
            <div key={`${word}-${index}`} className={`min-w-0 max-w-full overflow-hidden [overflow-wrap:anywhere] pb-[0.15em] -mb-[0.15em] ${index < words.length - 1 ? "mr-[0.3em]" : ""}`}>
              <motion.div
                variants={{ hidden: { y: "105%" }, shown: { y: "0%" } }}
                transition={reduce ? { duration: 0 } : { duration: base, ease, delay: 0.08 + index * 0.06 }}
              >
                {word}
              </motion.div>
            </div>
          ))}
        </div>
      </h2>
      {description && (
        <motion.p
          variants={{ hidden: { scale: 0.6, rotate: -8, opacity: 0 }, shown: { scale: 1, rotate: -2, opacity: 1 } }}
          transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 16, delay: 0.25 }}
          className={`mt-[0.5rem] max-w-[24rem] px-[1rem] py-[0.75rem] text-[length:var(--text-body)] leading-[1.4] text-balance ${stickyTone}`}
        >
          {description}
        </motion.p>
      )}
    </motion.div>
  );
};

export default NudgeHeader;

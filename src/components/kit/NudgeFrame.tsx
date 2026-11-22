"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { useKitMotion } from "@/components/kit/kitMotion";

type NudgeFrameProps = {
  children?: ReactNode;
  tone?: "secondary" | "foreground" | "background";
  delay?: number;
  inset?: string;
  className?: string;
};

const CORNERS = [
  "left-0 top-0 -translate-x-1/2 -translate-y-1/2",
  "right-0 top-0 translate-x-1/2 -translate-y-1/2",
  "left-0 bottom-0 -translate-x-1/2 translate-y-1/2",
  "right-0 bottom-0 translate-x-1/2 translate-y-1/2",
];

const LINE = {
  secondary: "bg-secondary",
  foreground: "bg-foreground",
  background: "bg-background",
};

const HANDLE = {
  secondary: "bg-secondary border-foreground",
  foreground: "bg-background border-foreground",
  background: "bg-background border-foreground",
};

const NudgeFrame = ({ children, tone = "secondary", delay = 0, inset = "0px", className = "" }: NudgeFrameProps) => {
  const reduce = useReducedMotion();
  const { ease, base } = useKitMotion();
  const on = reduce ? { duration: 0 } : { duration: base, ease, delay };
  const line = LINE[tone];
  return (
    <motion.div initial="hidden" whileInView="shown" viewport={{ once: true, margin: "0px 0px -10% 0px" }} className={`relative ${className}`}>
      {children}
      <div aria-hidden="true" className="pointer-events-none absolute" style={{ inset }}>
        <motion.div variants={{ hidden: { scaleX: 0 }, shown: { scaleX: 1 } }} transition={on} className={`absolute inset-x-0 top-0 h-[2px] origin-center ${line}`} />
        <motion.div variants={{ hidden: { scaleX: 0 }, shown: { scaleX: 1 } }} transition={on} className={`absolute inset-x-0 bottom-0 h-[2px] origin-center ${line}`} />
        <motion.div variants={{ hidden: { scaleY: 0 }, shown: { scaleY: 1 } }} transition={on} className={`absolute inset-y-0 left-0 w-[2px] origin-center ${line}`} />
        <motion.div variants={{ hidden: { scaleY: 0 }, shown: { scaleY: 1 } }} transition={on} className={`absolute inset-y-0 right-0 w-[2px] origin-center ${line}`} />
        {CORNERS.map((corner, index) => (
          <div key={corner} className={`absolute ${corner}`}>
            <motion.div
              variants={{ hidden: { scale: 0 }, shown: { scale: 1 } }}
              transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 520, damping: 18, delay: delay + 0.05 * index }}
              className={`size-[0.75rem] border-[1.5px] ${HANDLE[tone]}`}
            />
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default NudgeFrame;

"use client";

import { useState, type PointerEvent, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";

type NudgeOnLeaveProps = {
  rotate?: number;
  wobble?: boolean;
  className?: string;
  children?: ReactNode;
};

const DEFAULT_CHILDREN = (
  <div className="bg-card text-foreground rounded-theme p-6">
    <h3 className="text-xl font-semibold">Design that ships</h3>
    <p className="text-sm">Built for the long run.</p>
  </div>
);

const spring = { type: "spring" as const, stiffness: 260, damping: 14, mass: 0.8 };

const NudgeOnLeave = ({ rotate: base = 0, className, children = DEFAULT_CHILDREN }: NudgeOnLeaveProps) => {
  const reduce = useReducedMotion();
  const [hover, setHover] = useState(false);
  const extra = base < 0 ? -3 : 3;

  const onEnter = (event: PointerEvent) => {
    if (reduce || event.pointerType !== "mouse") return;
    setHover(true);
  };

  return (
    <motion.div
      initial={false}
      animate={hover ? { rotate: base + extra, y: -4 } : { rotate: base, y: 0 }}
      transition={spring}
      onPointerEnter={onEnter}
      onPointerLeave={() => setHover(false)}
      className={className}
    >
      {children}
    </motion.div>
  );
};

export default NudgeOnLeave;

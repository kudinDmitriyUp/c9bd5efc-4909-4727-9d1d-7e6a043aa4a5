"use client";

import { motion, useReducedMotion } from "motion/react";

type RiseInProps = {
  children?: React.ReactNode;
  delay?: number;
  className?: string;
};

const DEFAULT_CHILDREN = (
  <div className="bg-card text-foreground rounded-theme p-6">
    <h3 className="text-xl font-semibold">Design that ships</h3>
    <p className="text-sm">Built for the long run.</p>
  </div>
);

const RiseIn = ({ children = DEFAULT_CHILDREN, delay = 0, className }: RiseInProps) => {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 36, scale: 0.97 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "0px 0px -12% 0px" }}
      transition={{ duration: 0.9, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

export default RiseIn;

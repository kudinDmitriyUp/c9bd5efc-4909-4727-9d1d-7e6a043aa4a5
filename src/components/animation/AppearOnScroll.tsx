"use client";

import { motion } from "motion/react";
import { useRevealStyle } from "@/components/animation/RevealStyle";

type Variant = "slide-up" | "fade-blur" | "fade" | "rotate-scale";

interface AppearOnScrollProps {
  children?: React.ReactNode;
  variant?: Variant;
  delay?: number;
  className?: string;
}

const VARIANTS = {
  "slide-up": {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  },
  "fade-blur": {
    hidden: { opacity: 0, filter: "blur(10px)" },
    visible: { opacity: 1, filter: "blur(0px)" },
  },
  "fade": {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  },
  "rotate-scale": {
    hidden: { opacity: 0, y: 60, scale: 0.85, rotate: -6 },
    visible: { opacity: 1, y: 0, scale: 1, rotate: 0 },
  },
};

const DEFAULT_CHILDREN = (
  <div className="bg-card text-foreground rounded-theme p-6">
    <h3 className="text-xl font-semibold">Design that ships</h3>
    <p className="text-sm">Built for the long run.</p>
  </div>
);

const AppearOnScroll = ({ children = DEFAULT_CHILDREN, variant = "slide-up", delay = 0, className = "" }: AppearOnScrollProps) => {
  const style = useRevealStyle();
  if (style.boxes === "opacity") {
    return (
      <motion.div
        data-appear=""
        initial={{ "--appear": 0 } as never}
        whileInView={{ "--appear": 1 } as never}
        viewport={{ once: true, margin: "0px 0px -8% 0px" }}
        transition={{ duration: 1.3, delay: Math.min(delay, 0.3), ease: [0.22, 1, 0.36, 1] }}
        className={className}
      >
        {children}
      </motion.div>
    );
  }
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      variants={VARIANTS[variant]}
      transition={variant === "rotate-scale" ? { duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] } : { duration: 0.6, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

export default AppearOnScroll;

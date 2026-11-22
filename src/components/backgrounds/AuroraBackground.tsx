"use client";

import { motion, useReducedMotion } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

type AuroraBackgroundProps = {
  className?: string;
  blobClassName?: string;
  animated?: boolean;
  soft?: boolean;
};

const AuroraBackground = ({ className = "", blobClassName: blobIn, animated = false, soft = false }: AuroraBackgroundProps) => {
  const reduce = useReducedMotion();
  const moving = animated && !reduce;
  const blobClassName = soft ? cn(blobIn, "[mask-image:radial-gradient(closest-side,black,transparent)]") : blobIn;

  return (
    <div className={cn("@container-size inset-0 -z-10 w-full h-full overflow-hidden bg-background pointer-events-none", className)}>
      <motion.div
        animate={moving ? { x: ["0%", "6%", "-4%"], y: ["0%", "-5%", "4%"], rotate: [0, 6, -4] } : undefined}
        transition={moving ? { duration: 48, ease: "easeInOut", repeat: Infinity, repeatType: "mirror" } : undefined}
        className={cn("absolute inset-0", animated && !soft && "blur-3xl", animated && "will-change-transform")}
      >
        <div className={cn("absolute top-0 left-1/2 -translate-y-1/2 translate-x-[-120%] w-[9cqw] h-[110cqh] bg-primary/15 rotate-[-52.5deg] rounded-[100%]", blobClassName)} />
        <div className={cn("absolute top-[-20cqh] right-[2.5cqw] w-[12.5cqw] h-[100cqh] bg-primary/15 -rotate-60 rounded-[100%]", blobClassName)} />
        <div className={cn("absolute top-[-20cqh] left-[2cqw] w-[15cqw] h-[150cqh] bg-primary/20 -rotate-45 rounded-[100%]", blobClassName)} />
        <div className={cn("absolute top-[-30cqh] left-0 w-[10cqw] h-[70cqh] bg-primary/15 -rotate-45 rounded-[100%]", blobClassName)} />
        <div className={cn("absolute bottom-[-40cqh] left-0 w-[120cqw] h-[50cqh] bg-primary/10 -rotate-20 rounded-[100%]", blobClassName)} />
      </motion.div>
      {!animated && <div className="absolute inset-0 backdrop-blur-3xl"></div>}
    </div>
  );
};

export default AuroraBackground;

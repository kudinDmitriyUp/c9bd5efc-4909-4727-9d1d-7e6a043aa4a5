"use client";

import { useRef } from "react";
import { motion, cubicBezier, useInView, useMotionTemplate, useReducedMotion, useScroll, useTransform } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { useImageReady, usePreloadImages } from "@/components/kit/kitMotion";
import Media from "@/components/kit/Media";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

const curve = "cubic-bezier(0.16, 1, 0.35, 1)";

interface CoverImageRevealProps {
  src: string;
  alt?: string;
  className?: string;
  imgClassName?: string;
  slit?: boolean;
  scale?: number;
  delay?: number;
}

const CoverImageReveal = ({ src, alt = "", className = "", imgClassName = "", slit = false, scale = 1.05, delay = 0 }: CoverImageRevealProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -10% 0px" });
  const loaded = useImageReady(ref, inView);
  usePreloadImages(ref, "100%");
  const reduce = useReducedMotion();
  const shown = Boolean(reduce) || (inView && loaded);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "center center"] });
  const gap = useTransform(scrollYProgress, [0, 1], [50, 0], { ease: cubicBezier(0.33, 1, 0.68, 1) });
  const clipPath = useMotionTemplate`inset(${gap}% 0% ${gap}% 0%)`;

  return (
    <motion.div
      ref={ref}
      style={slit && !reduce ? { clipPath } : undefined}
      className={cn("relative overflow-hidden", className)}
    >
      <Media
        src={src}
        alt={alt}
        aria-hidden={!alt}
        loading="lazy"
        decoding="async"
        style={{
          transform: shown ? "scale(1)" : `scale(${scale})`,
          transition: reduce ? "none" : `transform 1.2s ${curve} ${delay}s`,
        }}
        className={cn("absolute inset-0 size-full object-cover", imgClassName)}
      />
      <div
        aria-hidden="true"
        style={{
          opacity: shown ? 0 : 1,
          transition: reduce ? "none" : `opacity 0.6s ${curve} ${delay}s`,
        }}
        className="absolute inset-0 z-10 bg-foreground pointer-events-none"
      />
    </motion.div>
  );
};

export default CoverImageReveal;

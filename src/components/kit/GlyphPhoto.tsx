"use client";

import { useRef, type ReactNode } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";
import { useImageReady } from "@/components/kit/kitMotion";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import Media from "@/components/kit/Media";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

type GlyphPhotoProps = {
  src: string;
  alt?: string;
  className?: string;
  imageClassName?: string;
  eager?: boolean;
  priority?: boolean;
  children?: ReactNode;
};

const GlyphPhoto = ({ src, alt = "", className, imageClassName, eager = false, priority = false, children }: GlyphPhotoProps) => {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.15 });
  const ready = useImageReady(ref, inView);

  return (
    <div ref={ref} className={cn("relative overflow-hidden bg-background", className)}>
      <motion.div
        initial={reduce ? false : { opacity: 0 }}
        animate={inView && ready ? { opacity: 1 } : undefined}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="absolute inset-0"
      >
        {children ?? (
          <Media
            src={src}
            alt={alt}
            draggable={false}
            loading={eager ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : "auto"}
            decoding="async"
            className={cn("absolute inset-0 size-full object-cover", imageClassName)}
          />
        )}
      </motion.div>
    </div>
  );
};

export default GlyphPhoto;

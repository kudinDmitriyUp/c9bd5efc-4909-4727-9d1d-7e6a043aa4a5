"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

interface DuotoneImageProps {
  src: string;
  alt: string;
  dark?: string;
  light?: string;
  clearOnHover?: boolean;
  develop?: boolean;
  className?: string;
  imageClassName?: string;
}

const EASE = [0.22, 1, 0.36, 1] as const;

const luminance = (color: string) => {
  const ctx = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  if (!ctx || !color) return 0;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const DuotoneImage = ({
  src,
  alt,
  dark = "var(--primary)",
  light = "var(--background)",
  clearOnHover = false,
  develop = false,
  className = "",
  imageClassName = "",
}: DuotoneImageProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.35 });
  const reduce = useReducedMotion();
  const [swap, setSwap] = useState(false);

  useEffect(() => {
    if (develop || !ref.current) return;
    const style = getComputedStyle(ref.current);
    setSwap(luminance(style.getPropertyValue("--duo-light").trim()) < luminance(style.getPropertyValue("--duo-dark").trim()));
  }, [dark, light, develop]);

  if (develop) {
    const shown = inView || reduce;
    return (
      <div ref={ref} className={cn("relative isolate h-full w-full overflow-hidden", className)}>
        <motion.img
          src={src}
          alt={alt}
          loading="lazy"
          initial={false}
          animate={{ filter: shown ? "grayscale(0) sepia(0) contrast(1)" : "grayscale(0.55) sepia(0.25) contrast(0.94)" }}
          transition={{ duration: 1.1, ease: EASE }}
          className={cn("absolute inset-0 h-full w-full object-cover", imageClassName)}
        />
        <motion.div
          aria-hidden="true"
          initial={false}
          animate={{ opacity: shown ? 0 : 0.18 }}
          transition={{ duration: 1.1, ease: EASE }}
          style={{ backgroundColor: light }}
          className="pointer-events-none absolute inset-0 mix-blend-screen"
        />
      </div>
    );
  }

  return (
    <div ref={ref} style={{ "--duo-dark": dark, "--duo-light": light } as CSSProperties} className={cn("group/duotone relative isolate h-full w-full overflow-hidden", className)}>
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className={cn(
          "absolute inset-0 h-full w-full object-cover grayscale contrast-[1.1] transition-[filter] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]",
          clearOnHover && "group-hover/duotone:grayscale-0 group-hover/duotone:contrast-100",
          imageClassName
        )}
      />
      <div
        aria-hidden="true"
        style={{ backgroundColor: swap ? dark : light }}
        className={cn("pointer-events-none absolute inset-0 mix-blend-multiply transition-opacity duration-700", clearOnHover && "group-hover/duotone:opacity-0")}
      />
      <div
        aria-hidden="true"
        style={{ backgroundColor: swap ? light : dark }}
        className={cn("pointer-events-none absolute inset-0 mix-blend-screen transition-opacity duration-700", clearOnHover && "group-hover/duotone:opacity-0")}
      />
    </div>
  );
};

export default DuotoneImage;

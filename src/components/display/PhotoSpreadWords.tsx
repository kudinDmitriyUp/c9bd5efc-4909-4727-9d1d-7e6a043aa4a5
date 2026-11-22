"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

interface PhotoSpreadWordsProps {
  imageSrc: string;
  imageAlt?: string;
  words: string[];
  tone?: "light" | "dark";
  className?: string;
  wordClassName?: string;
}

const EASE = [0.22, 1, 0.36, 1] as const;

const PhotoSpreadWords = ({ imageSrc, imageAlt = "", words, tone = "light", className = "", wordClassName = "" }: PhotoSpreadWordsProps) => {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, (v) => (reduce ? "0%" : `${(v - 0.5) * 8}%`));
  const word = {
    hidden: { y: reduce ? "0%" : "110%" },
    show: (i: number) => ({ y: "0%", transition: { duration: 0.9, ease: EASE, delay: reduce ? 0 : i * 0.18 } }),
  };

  return (
    <section ref={ref} className={cn("relative h-svh w-full overflow-hidden", className)}>
      <motion.img src={imageSrc} alt={imageAlt} loading="lazy" style={{ y, scale: reduce ? 1 : 1.08 }} className="absolute inset-0 h-full w-full object-cover" />
      <div aria-hidden="true" className={cn("pointer-events-none absolute inset-0", tone === "light" ? "bg-black/25" : "bg-background/25")} />
      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.5 }}
        className={cn("absolute inset-0 z-10 flex items-center justify-between gap-4 px-6 md:px-12", tone === "light" ? "text-white [text-shadow:0_1px_16px_rgb(0_0_0/0.35)]" : "text-foreground")}
      >
        {words.slice(0, 3).map((w, i) => (
          <div key={i} className="overflow-hidden py-1">
            <motion.p custom={i} variants={word} className={cn("whitespace-nowrap text-xs uppercase tracking-[0.2em] font-medium sm:text-sm md:text-base", wordClassName)}>
              {w}
            </motion.p>
          </div>
        ))}
      </motion.div>
    </section>
  );
};

export default PhotoSpreadWords;

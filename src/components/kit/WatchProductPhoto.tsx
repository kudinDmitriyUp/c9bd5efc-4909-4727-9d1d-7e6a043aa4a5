"use client";

import { motion, useReducedMotion } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import ImageScrollParallax from "@/components/animation/ImageScrollParallax";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

const EASE = [0.19, 1, 0.22, 1] as const;

const CORNERS = ["-left-[4.5px] -top-[4.5px]", "-right-[4.5px] -top-[4.5px]", "-bottom-[4.5px] -left-[4.5px]", "-bottom-[4.5px] -right-[4.5px]"];

type WatchProductPhotoProps = {
  imageSrc: string;
  imageAlt?: string;
  ticks?: boolean;
  delay?: number;
  className?: string;
};

export default function WatchProductPhoto({ imageSrc, imageAlt = "", ticks = true, delay = 0, className }: WatchProductPhotoProps) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : "hidden"}
      whileInView="shown"
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
      className={cn("relative", className)}
    >
      <motion.div
        variants={{
          hidden: { clipPath: "inset(50% 0% 50% 0%)" },
          shown: { clipPath: "inset(0% 0% 0% 0%)", transition: { duration: 1.6, ease: EASE, delay } },
        }}
        className="absolute inset-0 overflow-hidden rounded-[var(--photo-radius,0px)] bg-secondary"
      >
        <motion.div
          variants={{
            hidden: { scale: 1.18 },
            shown: { scale: 1, transition: { duration: 2.2, ease: EASE, delay } },
          }}
          className="size-full"
        >
          <ImageScrollParallax imageSrc={imageSrc} imageAlt={imageAlt} strength={0.08} className="aspect-auto size-full rounded-none [&_img]:saturate-[var(--photo-saturate,0.55)]" />
        </motion.div>
      </motion.div>
      {ticks &&
        CORNERS.map((corner) => (
          <motion.svg
            key={corner}
            aria-hidden="true"
            width="9"
            height="9"
            viewBox="0 0 8 8"
            fill="none"
            variants={{ hidden: { opacity: 0 }, shown: { opacity: 1, transition: { duration: 1, ease: EASE, delay: delay + 0.6 } } }}
            className={cn("pointer-events-none absolute text-foreground/50 [display:var(--photo-ticks,inline)]", corner)}
          >
            <path fill="currentColor" d="M3.5 0h1v8h-1z" />
            <path fill="currentColor" d="M8 3.5v1H0v-1z" />
          </motion.svg>
        ))}
    </motion.div>
  );
}

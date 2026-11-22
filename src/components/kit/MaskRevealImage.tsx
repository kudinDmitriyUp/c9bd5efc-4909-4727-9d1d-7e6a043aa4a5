"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { animate, cubicBezier, motion, useInView, useMotionTemplate, useMotionValue, useReducedMotion, useScroll, useTransform, type MotionValue } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import ImageScrollParallax from "@/components/animation/ImageScrollParallax";
import { useKitMotion } from "@/components/kit/kitMotion";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

type MaskRevealImageProps = {
  imageSrc: string;
  imageAlt?: string;
  strength?: number;
  trigger?: "scroll" | "view";
  delay?: number;
  className?: string;
  children?: ReactNode;
  progress?: MotionValue<number>;
};

const settle = cubicBezier(0.33, 1, 0.68, 1);

export default function MaskRevealImage({ imageSrc, imageAlt = "", strength = 0.1, trigger = "scroll", delay = 0, className, children, progress: driven }: MaskRevealImageProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { ease, slow } = useKitMotion();
  const timed = useMotionValue(0);
  const inView = useInView(ref, { once: true, margin: "0px 0px -8% 0px" });
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 1", "start 0.22"] });
  const own = useTransform([scrollYProgress, timed], ([s, t]: number[]) => (trigger === "scroll" ? settle(Math.min(1, Math.max(0, s))) : t));
  const progress = driven ?? own;
  const insetY = useTransform(progress, [0, 1], [24, 0]);
  const insetX = useTransform(progress, [0, 1], [17, 0]);
  const scale = useTransform(progress, [0, 1], [1.32, 1]);
  const clipPath = useMotionTemplate`inset(${insetY}% ${insetX}% ${insetY}% ${insetX}% round var(--mask-radius, var(--radius-image)))`;

  useEffect(() => {
    if (driven || trigger !== "view" || !inView) return;
    const controls = animate(timed, 1, { duration: slow * 1.8, ease, delay });
    return () => controls.stop();
  }, [driven, trigger, inView, timed, slow, ease, delay]);

  return (
    <motion.div ref={ref} style={reduce ? undefined : { clipPath }} className={cn("relative overflow-hidden rounded-[var(--mask-radius,var(--radius-image))]", className)}>
      <motion.div style={reduce ? undefined : { scale }} className="absolute inset-0 will-change-transform">
        {children ?? <ImageScrollParallax imageSrc={imageSrc} imageAlt={imageAlt} strength={strength} className="aspect-auto h-full rounded-none" />}
      </motion.div>
    </motion.div>
  );
}

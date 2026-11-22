"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import ButtonTextLink from "@/components/buttons/ButtonTextLink";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

interface HeroStillProps {
  title: string;
  imageSrc?: string;
  videoSrc?: string;
  imageAlt?: string;
  cta?: { text: string; href: string };
  secondaryCta?: { text: string; href: string };
  className?: string;
  titleClassName?: string;
  exit?: "inset" | "parallax";
}

const HeroStill = ({ title, imageSrc, videoSrc, imageAlt = "", cta, secondaryCta, className = "", titleClassName = "", exit = "inset" }: HeroStillProps) => {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const inset = useTransform(scrollYProgress, (v) => (reduce || exit === "parallax" ? 0 : Math.min(1, v * 1.6)));
  const clipPath = useTransform(inset, (p) => `inset(${p * 6}% ${p * 4}% 0% ${p * 4}% round calc(var(--radius) * ${p.toFixed(3)}))`);
  const scale = useTransform(scrollYProgress, (v) => (reduce ? 1 : exit === "parallax" ? 1.15 : 1.06 - Math.min(1, v * 1.6) * 0.06));
  const imageY = useTransform(scrollYProgress, (v) => (reduce || exit === "inset" ? "0%" : `${v * 7}%`));
  const textY = useTransform(scrollYProgress, (v) => (reduce ? 0 : v * -60));

  return (
    <section ref={ref} className={cn("relative h-svh w-full overflow-hidden", className)}>
      <motion.div style={{ clipPath }} className="absolute inset-0 overflow-hidden">
        {videoSrc ? (
          <motion.video src={videoSrc} poster={imageSrc} aria-label={imageAlt || undefined} style={{ scale, y: imageY }} className="absolute inset-0 h-full w-full object-cover" autoPlay loop muted playsInline />
        ) : (
          <motion.img src={imageSrc} alt={imageAlt} style={{ scale, y: imageY }} className="absolute inset-0 h-full w-full object-cover" />
        )}
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-3/5 bg-linear-to-t from-black/60 via-black/25 to-transparent" />
      </motion.div>
      <motion.div style={{ y: textY }} className="absolute inset-x-0 bottom-0 z-10">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-start gap-6 px-6 pb-12 md:pb-16">
          <h1 className={cn("max-w-3xl text-4xl leading-[1.05] md:text-6xl", titleClassName, "text-white")}>{title}</h1>
          {(cta || secondaryCta) && (
            <div className="flex flex-wrap items-center gap-6 text-white">
              {cta && <ButtonTextLink text={cta.text} href={cta.href} />}
              {secondaryCta && <ButtonTextLink text={secondaryCta.text} href={secondaryCta.href} arrow={false} />}
            </div>
          )}
        </div>
      </motion.div>
    </section>
  );
};

export default HeroStill;

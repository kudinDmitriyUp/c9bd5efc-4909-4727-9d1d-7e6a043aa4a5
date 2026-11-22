"use client";

import { motion, useReducedMotion } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import ButtonTextLink from "@/components/buttons/ButtonTextLink";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

interface ClosingPanelProps {
  title: string;
  description?: string;
  imageSrc?: string;
  imageAlt?: string;
  tone?: "primary" | "secondary" | "foreground";
  cta?: { text: string; href: string };
  secondaryCta?: { text: string; href: string };
  className?: string;
  titleClassName?: string;
}

const tones = {
  primary: "bg-primary text-primary-foreground",
  secondary: "bg-secondary text-secondary-foreground",
  foreground: "bg-foreground text-background",
};

const ClosingPanel = ({ title, description, imageSrc, imageAlt = "", tone = "primary", cta, secondaryCta, className = "", titleClassName = "" }: ClosingPanelProps) => {
  const reduce = useReducedMotion();
  const rise = reduce ? {} : { initial: { opacity: 0, y: 24 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: "-15%" }, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] as const } };

  return (
    <section className={cn("w-full py-20 md:py-28", className)}>
      <div className="mx-auto w-full max-w-6xl px-6">
        <motion.div {...rise} className={cn("grid overflow-hidden rounded-[var(--radius)]", imageSrc ? "md:grid-cols-2" : "")}>
          {imageSrc && (
            <div className="relative aspect-[4/5] md:aspect-auto md:min-h-[32rem]">
              <img src={imageSrc} alt={imageAlt} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
            </div>
          )}
          <div className={cn("flex flex-col justify-end gap-5 p-8 md:p-12", tones[tone], !imageSrc && "md:min-h-[26rem]")}>
            <h2 className={cn("max-w-md text-3xl leading-[1.1] md:text-4xl", titleClassName)}>{title}</h2>
            {description && <p className="max-w-md text-base leading-[1.55] opacity-85">{description}</p>}
            {(cta || secondaryCta) && (
              <div className="mt-3 flex flex-wrap items-center gap-6">
                {cta && <ButtonTextLink text={cta.text} href={cta.href} />}
                {secondaryCta && <ButtonTextLink text={secondaryCta.text} href={secondaryCta.href} arrow={false} />}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default ClosingPanel;

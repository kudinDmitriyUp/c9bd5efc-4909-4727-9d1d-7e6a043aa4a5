"use client";

import { motion, useReducedMotion } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import DuotoneImage from "@/components/display/DuotoneImage";
import ButtonTextLink from "@/components/buttons/ButtonTextLink";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

interface DuotonePairTile {
  imageSrc: string;
  imageAlt?: string;
  label: string;
  description?: string;
  link?: { text: string; href: string };
}

interface DuotonePairProps {
  tiles: DuotonePairTile[];
  tone?: "light" | "dark";
  className?: string;
  labelClassName?: string;
}

const DuotonePair = ({ tiles, tone = "light", className = "", labelClassName = "" }: DuotonePairProps) => {
  const reduce = useReducedMotion();
  const rise = reduce ? {} : { initial: { opacity: 0, y: 16 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: "-10%" }, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] as const } };

  return (
    <section className={cn("grid w-full md:grid-cols-2", className)}>
      {tiles.slice(0, 2).map((tile, i) => (
        <div key={i} className="group/duotone relative h-[80svh] md:h-svh">
          <div className="absolute inset-0">
            <DuotoneImage src={tile.imageSrc} alt={tile.imageAlt ?? tile.label} clearOnHover />
          </div>
          <div aria-hidden="true" className={cn("pointer-events-none absolute inset-0", tone === "light" ? "bg-black/20" : "bg-background/40")} />
          <div className="pointer-events-none absolute inset-0 px-6 pt-[40svh] pb-12 md:pt-[50svh]">
            <motion.div {...rise} className={cn("pointer-events-auto sticky top-1/2 flex -translate-y-1/2 flex-col items-center gap-3 text-center", tone === "light" ? "text-white" : "text-foreground")}>
              <h3 className={cn("font-sans text-sm uppercase tracking-[0.2em] font-medium md:text-base", labelClassName)}>{tile.label}</h3>
              {tile.description && <p className="max-w-xs text-sm leading-[1.5] opacity-85">{tile.description}</p>}
              {tile.link && <ButtonTextLink text={tile.link.text} href={tile.link.href} />}
            </motion.div>
          </div>
        </div>
      ))}
    </section>
  );
};

export default DuotonePair;

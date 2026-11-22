"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { ArrowUpRight, Sparkle, type LucideIcon } from "lucide-react";
import GradientWordRise from "@/components/kit/GradientWordRise";
import { useKitMotion } from "@/components/kit/kitMotion";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

type DialedHeaderProps = {
  tag?: string;
  tagIcon?: LucideIcon;
  title: string;
  fade?: number;
  description?: string;
  primaryButton?: { text: string; href: string };
  secondaryButton?: { text: string; href: string };
  align?: "center" | "left";
  titleTag?: "h1" | "h2";
  children?: ReactNode;
  className?: string;
};

const DialedHeader = ({ tag, tagIcon: TagIcon = Sparkle, title, fade = 2, description, primaryButton, secondaryButton, align = "center", titleTag = "h2", children, className }: DialedHeaderProps) => {
  const reduce = useReducedMotion();
  const kit = useKitMotion();
  const left = align === "left";
  const rise = (delay: number) => ({
    initial: reduce ? false : { opacity: 0, y: 12 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: kit.base, ease: kit.ease, delay },
  });

  return (
    <div className={cn("flex flex-col gap-[var(--header-gap)]", left ? "items-start text-left" : "items-center text-center", className)}>
      {tag && (
        <motion.div {...rise(0)} className="kit-chip">
          <TagIcon aria-hidden="true" strokeWidth={2} />
          <p>{tag}</p>
        </motion.div>
      )}
      <GradientWordRise tag={titleTag} text={title} fade={fade} delay={0.05} className="max-w-[45rem] text-balance text-[length:var(--text-h1)] [overflow-wrap:anywhere]" />
      {description && (
        <motion.p {...rise(0.2)} className="max-w-[40rem] text-balance text-[length:var(--text-body)] leading-[var(--body-leading)] text-muted-foreground">
          {description}
        </motion.p>
      )}
      {(primaryButton || secondaryButton) && (
        <motion.div {...rise(0.3)} className={cn("mt-[0.5625rem] flex flex-wrap items-center gap-[0.75rem]", left ? "justify-start" : "justify-center")}>
          {primaryButton && (
            <a href={primaryButton.href} className="btn-primary">
              <p className="btn-label">{primaryButton.text}</p>
            </a>
          )}
          {secondaryButton && (
            <a href={secondaryButton.href} className="btn-secondary">
              <p className="btn-label">{secondaryButton.text}</p>
              <ArrowUpRight aria-hidden="true" strokeWidth={1.75} />
            </a>
          )}
        </motion.div>
      )}
      {children}
    </div>
  );
};

export default DialedHeader;

"use client";

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import WordByWordReveal from "@/components/animation/WordByWordReveal";
import AppearOnScroll from "@/components/animation/AppearOnScroll";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

type JoesHeaderProps = {
  tag?: string;
  title?: string;
  description?: string;
  primaryButton?: { text: string; href: string };
  secondaryButton?: { text: string; href: string };
  align?: "center" | "left";
  className?: string;
};

const JoesHeader = ({ tag, title, description, primaryButton, secondaryButton, align = "center", className }: JoesHeaderProps) => {
  const left = align === "left";
  return (
    <div className={cn("flex flex-col gap-2", left ? "items-start" : "items-center", className)}>
      {tag && (
        <AppearOnScroll variant="fade">
          <div className="px-3 py-1 mb-1 text-sm card rounded w-fit">
            <p>{tag}</p>
          </div>
        </AppearOnScroll>
      )}
      {title && (
        <WordByWordReveal
          text={title}
          variant="fade-blur"
          tag="h2"
          className={cn("text-4xl md:text-6xl 2xl:text-7xl leading-[1.15] font-semibold text-balance", left ? "text-left" : "md:max-w-8/10 text-center")}
        />
      )}
      {description && (
        <WordByWordReveal
          text={description}
          variant="fade-blur"
          tag="p"
          className={cn("text-base md:text-lg 2xl:text-xl leading-snug text-balance", left ? "text-left" : "md:max-w-7/10 text-center")}
        />
      )}
      {(primaryButton || secondaryButton) && (
        <AppearOnScroll variant="slide-up" delay={0.15}>
          <div className={cn("flex flex-wrap gap-3 mt-2 md:mt-3", left ? "justify-start" : "justify-center")}>
            {primaryButton && <a href={primaryButton.href} className="flex items-center justify-center h-10 px-6 text-sm rounded-lg cursor-pointer btn-primary bg-primary text-primary-foreground">{primaryButton.text}</a>}
            {secondaryButton && <a href={secondaryButton.href} className="flex items-center justify-center h-10 px-6 text-sm rounded-lg cursor-pointer btn-secondary bg-secondary text-secondary-foreground">{secondaryButton.text}</a>}
          </div>
        </AppearOnScroll>
      )}
    </div>
  );
};

export default JoesHeader;

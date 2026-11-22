"use client";

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

interface ButtonRollDotProps {
  text?: string;
  href?: string;
  onClick?: () => void;
  variant?: "dark" | "light";
  surface?: "primary" | "secondary";
  fit?: boolean;
  className?: string;
}

const ButtonRollDot = ({ text = "Get started", href = "#", onClick, variant = "dark", surface, fit = false, className = "" }: ButtonRollDotProps) => {
  return (
    <a
      href={href}
      onClick={onClick}
      className={cn(
        "group inline-flex items-center gap-4 w-fit px-5 py-4 uppercase leading-none font-[650] tracking-[-0.01em] cursor-pointer",
        surface ? `btn-${surface} max-w-full text-[length:var(--text-label)]` : "rounded-full text-sm",
        !surface && (variant === "dark" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"),
        className
      )}
    >
      <div
        className="h-[1em] min-w-0 overflow-hidden"
        style={fit ? { fontSize: `min(1em, calc((100cqw - 4.5rem) / ${(text.length * 0.7).toFixed(2)}))` } : undefined}
      >
        <p className="whitespace-nowrap transition-transform duration-[545ms] ease-[cubic-bezier(0.16,1,0.3,1)] [text-shadow:0_1em_0_currentColor] md:group-hover:-translate-y-[1em]">
          {text}
        </p>
      </div>
      <div
        aria-hidden="true"
        className="size-2 shrink-0 rounded-full border border-current transition-[transform,background-color] duration-[545ms,300ms] ease-[cubic-bezier(0.16,1,0.3,1)] md:group-hover:scale-60 md:group-hover:bg-current"
      />
    </a>
  );
};

export default ButtonRollDot;

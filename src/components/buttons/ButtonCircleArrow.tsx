"use client";

import { ArrowUpRight } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

interface ButtonCircleArrowProps {
  text?: string;
  href?: string;
  onClick?: () => void;
  className?: string;
}

const ButtonCircleArrow = ({ text, href = "#", onClick, className = "" }: ButtonCircleArrowProps) => {
  return (
    <a
      href={href}
      onClick={onClick}
      aria-label={text ? undefined : "Open"}
      className={cn("btn-link group inline-flex items-center gap-3 text-sm text-current cursor-pointer", className.replace(/(^|\s)btn-(primary|secondary)(?=\s|$)/g, " "))}
    >
      {text && <p className="transition-opacity duration-300 group-hover:opacity-70">{text}</p>}
      <i className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-current">
        <i aria-hidden="true" className="absolute inset-0 scale-0 rounded-full bg-foreground transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-100" />
        <ArrowUpRight
          aria-hidden="true"
          strokeWidth={1.5}
          className="relative size-4 transition-[transform,color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:rotate-45 group-hover:text-background"
        />
      </i>
    </a>
  );
};

export default ButtonCircleArrow;

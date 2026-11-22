"use client";

import { ArrowRight } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

interface ButtonTextLinkProps {
  text?: string;
  href?: string;
  onClick?: () => void;
  arrow?: boolean;
  className?: string;
}

const ButtonTextLink = ({ text = "Learn more", href = "#", onClick, arrow = true, className = "" }: ButtonTextLinkProps) => {
  return (
    <a
      href={href}
      onClick={onClick}
      className={cn("btn-link group relative inline-flex items-center gap-2 py-2 text-sm text-current cursor-pointer", className.replace(/(^|\s)btn-(primary|secondary)(?=\s|$)/g, " "))}
    >
      <p className="relative">
        {text}
        <i aria-hidden="true" className="absolute inset-x-0 -bottom-0.5 h-px bg-current origin-left transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] scale-x-100 group-hover:scale-x-0 group-hover:origin-right" />
      </p>
      {arrow && (
        <ArrowRight
          aria-hidden="true"
          strokeWidth={1.5}
          className="size-4 shrink-0 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-1"
        />
      )}
    </a>
  );
};

export default ButtonTextLink;

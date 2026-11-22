"use client";

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

interface ButtonBounceProps {
  text?: string;
  href?: string;
  onClick?: () => void;
  className?: string;
}

const ButtonBounce = ({ text = "Get started", href = "#", onClick, className = "" }: ButtonBounceProps) => {
  return (
    <a
      href={href}
      onClick={onClick}
      className={cn("group flex items-center justify-center h-10 px-6 text-sm rounded-lg cursor-pointer transition-transform duration-300 ease-out md:hover:scale-90 md:hover:-rotate-3 bg-primary text-primary-foreground", className)}
    >
      <span className="truncate overflow-hidden">
        {[...text].map((char, index) => (
          <span
            key={index}
            className="inline-block transition-transform duration-300 ease-out md:group-hover:-translate-y-[1.25em] md:group-hover:rotate-3"
            style={{ textShadow: "0 1.25em currentColor", whiteSpace: char === " " ? "pre" : undefined }}
          >
            {char}
          </span>
        ))}
      </span>
    </a>
  );
};

export default ButtonBounce;

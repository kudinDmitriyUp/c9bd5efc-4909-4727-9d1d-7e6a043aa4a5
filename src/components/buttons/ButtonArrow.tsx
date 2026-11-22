"use client";

import { ArrowRight } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

interface ButtonArrowProps {
  text?: string;
  href?: string;
  onClick?: () => void;
  className?: string;
}

const ButtonArrow = ({ text = "Get started", href = "#", onClick, className = "" }: ButtonArrowProps) => {
  return (
    <a
      href={href}
      onClick={onClick}
      className={cn("group flex items-center justify-between gap-2 h-10 px-6 text-sm rounded-lg cursor-pointer bg-primary text-primary-foreground", className)}
    >
      <span className="truncate md:transition-transform md:duration-300 md:ease-out md:group-hover:translate-x-2">
        {text}
      </span>
      <div className="size-5 flex items-center justify-center rounded-lg md:transition-all md:duration-300 md:ease-out md:group-hover:scale-[0.2] md:group-hover:rotate-90 bg-secondary text-secondary-foreground">
        <ArrowRight className="size-3 md:transition-opacity md:duration-700 md:group-hover:opacity-0" />
      </div>
    </a>
  );
};

export default ButtonArrow;

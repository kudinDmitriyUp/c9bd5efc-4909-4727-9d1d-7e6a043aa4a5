"use client";

import { ArrowDownRight } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

interface ButtonBubbleProps {
  text?: string;
  href?: string;
  onClick?: () => void;
  className?: string;
}

const ButtonBubble = ({ text = "Get started", href = "#", onClick, className = "" }: ButtonBubbleProps) => {
  return (
    <a
      href={href}
      onClick={onClick}
      className={cn("group relative flex items-center min-w-0 max-w-full text-sm rounded-lg cursor-pointer", className)}
    >
      <div className="flex items-center justify-center size-10 rounded-lg relative scale-0 md:transition-transform md:duration-500 md:ease-out md:origin-left md:group-hover:scale-100 bg-primary text-primary-foreground">
        <ArrowDownRight className="size-3.5 md:transition-transform md:duration-500 md:group-hover:-rotate-45" />
      </div>
      <div className="flex items-center justify-between flex-1 h-10 px-4 min-w-0 max-w-full rounded-lg relative -translate-x-10 md:transition-transform md:duration-500 md:ease-out md:group-hover:translate-x-0 bg-primary text-primary-foreground">
        <span className="truncate">{text}</span>
      </div>
      <div className="flex items-center justify-center size-10 rounded-lg absolute right-0 z-20 scale-100 md:transition-transform md:duration-500 md:ease-out md:origin-right md:group-hover:scale-0 bg-primary text-primary-foreground">
        <ArrowDownRight className="size-3.5 md:transition-transform md:duration-500 md:group-hover:-rotate-45" />
      </div>
    </a>
  );
};

export default ButtonBubble;

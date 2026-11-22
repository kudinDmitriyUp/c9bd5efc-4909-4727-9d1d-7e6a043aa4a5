"use client";

import { ArrowUpRight } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

interface ButtonExpandProps {
  text?: string;
  href?: string;
  onClick?: () => void;
  className?: string;
}

const ButtonExpand = ({ text = "Get started", href = "#", onClick, className = "" }: ButtonExpandProps) => {
  return (
    <a
      href={href}
      onClick={onClick}
      className={cn("group relative flex items-center gap-3 min-w-0 w-fit max-w-full py-0.5 pl-5 pr-0.5 text-sm rounded-lg cursor-pointer bg-primary text-primary-foreground", className)}
    >
      <span className="relative z-10 flex-1 truncate md:transition-colors md:duration-500 md:ease-out text-primary-foreground md:group-hover:text-secondary-foreground">{text}</span>
      <div className="relative z-10 flex items-center justify-center size-8 rounded-lg text-secondary-foreground">
        <ArrowUpRight className="size-4" strokeWidth={1.5} />
      </div>
      <div className="absolute inset-0.5 z-0 overflow-hidden rounded-lg pointer-events-none">
        <div className="h-full w-full rounded-lg -translate-x-[calc(-100%+2rem)] md:transition-transform md:duration-500 md:ease-out md:group-hover:translate-x-0 bg-secondary text-secondary-foreground" />
      </div>
    </a>
  );
};

export default ButtonExpand;

"use client";

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

type NickhoRollLabelProps = {
  text?: string;
  suffix?: string;
  className?: string;
};

const NickhoRollLabel = ({ text = "Get started", suffix = "", className }: NickhoRollLabelProps) => {
  const letters = Array.from(text + suffix);

  return (
    <div className={cn("relative inline-flex min-w-0 overflow-x-clip", className)}>
      <p className="sr-only">{text}</p>
      <div aria-hidden="true" className="flex min-w-0 flex-wrap">
        {letters.map((char, i) => (
          <div
            key={`a-${i}`}
            style={{ transitionDelay: `${0.05 + i * 0.018}s` }}
            className="inline-block whitespace-pre transition-[translate,rotate,transform,opacity] duration-[600ms] ease-[cubic-bezier(0.19,1,0.22,1)] group-hover:-translate-x-[1.35rem] group-hover:-skew-x-[28deg] group-hover:opacity-0 motion-reduce:transition-none"
          >
            {char}
          </div>
        ))}
      </div>
      <div aria-hidden="true" className="absolute inset-0 flex flex-wrap">
        {letters.map((char, i) => (
          <div
            key={`b-${i}`}
            style={{ transitionDelay: `${0.2 + i * 0.018}s` }}
            className="inline-block translate-x-[1.35rem] -skew-x-[28deg] whitespace-pre opacity-0 transition-[translate,rotate,transform,opacity] duration-[600ms] ease-[cubic-bezier(0.19,1,0.22,1)] group-hover:translate-x-0 group-hover:skew-x-0 group-hover:opacity-100 motion-reduce:transition-none"
          >
            {char}
          </div>
        ))}
      </div>
    </div>
  );
};

export default NickhoRollLabel;

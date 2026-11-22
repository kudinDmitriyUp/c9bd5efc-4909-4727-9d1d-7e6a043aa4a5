"use client";

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import TerminalTitleSweep from "@/components/kit/TerminalTitleSweep";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

type TwoToneSweepTitleProps = {
  title?: string;
  muted?: string;
  tag?: "h1" | "h2" | "h3";
  delay?: number;
  className?: string;
};

export default function TwoToneSweepTitle({ title = "Built to run itself.", muted, tag = "h2", delay = 0, className }: TwoToneSweepTitleProps) {
  const Tag = tag;
  return (
    <Tag className={cn("text-balance", className)}>
      <TerminalTitleSweep tag="p" text={title} flash="var(--primary)" delay={delay} className="block" />
      {muted && <TerminalTitleSweep tag="p" text={muted} flash="var(--primary)" final="var(--muted-foreground)" delay={delay + 0.2} className="block" />}
    </Tag>
  );
}

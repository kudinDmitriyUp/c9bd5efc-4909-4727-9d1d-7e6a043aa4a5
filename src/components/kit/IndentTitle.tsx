"use client";

import MaskedLineReveal from "@/components/animation/MaskedLineReveal";
import { useKitMotion } from "@/components/kit/kitMotion";

type IndentTitleProps = {
  text: string;
  tag?: "h1" | "h2" | "h3" | "p";
  delay?: number;
  className?: string;
};

const IndentTitle = ({ text, tag = "h2", delay = 0, className }: IndentTitleProps) => {
  const kit = useKitMotion();
  return (
    <MaskedLineReveal
      text={text}
      tag={tag}
      delay={delay}
      stagger={0.08}
      duration={kit.slow}
      ease={kit.ease}
      margin="0px 0px -6% 0px"
      className={`text-balance leading-[var(--heading-leading)] ${className ?? ""}`}
    />
  );
};

export default IndentTitle;

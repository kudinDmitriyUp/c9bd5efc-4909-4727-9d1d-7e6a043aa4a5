"use client";

import type { CSSProperties } from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import ButtonMagneticFill from "@/components/buttons/ButtonMagneticFill";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

type SnellenbergMagneticCircleProps = {
  text?: string;
  href?: string;
  type?: "button" | "submit";
  tone?: "primary" | "accent";
  className?: string;
};

const SnellenbergMagneticCircle = ({ text = "Get started", href, type, tone = "primary", className }: SnellenbergMagneticCircleProps) => (
  <ButtonMagneticFill
    href={href}
    type={type}
    strength={100}
    labelStrength={50}
    fillClassName={tone === "accent" ? "bg-[color-mix(in_srgb,var(--accent)_82%,var(--foreground))]" : "bg-accent"}
    className={cn(
      "btn-primary @container !size-[clamp(calc(var(--text-body)*9),12vw,calc(var(--text-body)*11))] !min-h-0 !min-w-0 shrink-0 !rounded-full !p-0",
      tone === "accent" && "!bg-accent !text-accent-foreground before:!bg-[color-mix(in_srgb,var(--accent)_82%,var(--foreground))]",
      className,
    )}
  >
    <p style={{ "--chars": text.length } as CSSProperties} className="whitespace-nowrap text-[length:min(var(--text-body),calc(76cqw/(var(--chars)*0.6)))]">
      {text}
    </p>
  </ButtonMagneticFill>
);

export default SnellenbergMagneticCircle;

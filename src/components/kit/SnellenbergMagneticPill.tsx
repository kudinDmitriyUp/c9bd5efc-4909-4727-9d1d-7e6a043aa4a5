"use client";

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import ButtonMagneticFill from "@/components/buttons/ButtonMagneticFill";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

type SnellenbergMagneticPillProps = {
  text?: string;
  href?: string;
  count?: number;
  className?: string;
};

const SnellenbergMagneticPill = ({ text = "Get started", href, count, className }: SnellenbergMagneticPillProps) => (
  <ButtonMagneticFill href={href} strength={40} labelStrength={20} labelClassName="items-start" className={cn("btn-secondary before:hidden", className)}>
    <p className="leading-none">{text}</p>
    {count !== undefined && <p className="-mt-[0.35em] text-[0.6em] leading-none tabular-nums">{count}</p>}
  </ButtonMagneticFill>
);

export default SnellenbergMagneticPill;

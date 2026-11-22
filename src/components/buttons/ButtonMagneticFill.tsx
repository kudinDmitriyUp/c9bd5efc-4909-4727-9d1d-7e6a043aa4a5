"use client";

import { useRef, type MouseEvent, type ReactNode } from "react";
import { motion, animate, useMotionValue, useReducedMotion } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

const follow = { duration: 1.5, ease: [0.23, 1, 0.32, 1] } as const;
const release = { type: "spring", stiffness: 150, damping: 8 } as const;
const wipe = { duration: 0.6, ease: [0.645, 0.045, 0.355, 1] } as const;

interface ButtonMagneticFillProps {
  children?: ReactNode;
  href?: string;
  type?: "button" | "submit";
  onClick?: () => void;
  ariaLabel?: string;
  ariaExpanded?: boolean;
  strength?: number;
  labelStrength?: number;
  className?: string;
  fillClassName?: string;
  labelClassName?: string;
}

const ButtonMagneticFill = ({
  children = "Get started",
  href,
  type = "button",
  onClick,
  ariaLabel,
  ariaExpanded,
  strength = 25,
  labelStrength = 15,
  className,
  fillClassName = "bg-accent",
  labelClassName,
}: ButtonMagneticFillProps) => {
  const ref = useRef<HTMLElement | null>(null);
  const reduceMotion = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const labelX = useMotionValue(0);
  const labelY = useMotionValue(0);
  const fillY = useMotionValue("76%");

  const onMove = (event: MouseEvent) => {
    const el = ref.current;
    if (!el || reduceMotion || window.innerWidth <= 540) return;
    const rect = el.getBoundingClientRect();
    const relX = (event.clientX - rect.left) / rect.width - 0.5;
    const relY = (event.clientY - rect.top) / rect.height - 0.5;
    animate(x, relX * strength, follow);
    animate(y, relY * strength, follow);
    animate(labelX, relX * labelStrength, follow);
    animate(labelY, relY * labelStrength, follow);
  };

  const onEnter = () => {
    if (reduceMotion) return;
    fillY.jump("76%");
    animate(fillY, "0%", wipe);
  };

  const onLeave = () => {
    [x, y, labelX, labelY].forEach((value) => animate(value, 0, release));
    if (!reduceMotion) animate(fillY, "-76%", wipe);
  };

  const inner = (
    <>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[inherit]">
        <motion.div style={{ y: fillY }} className={cn("absolute left-1/2 top-[-50%] h-[200%] w-[150%] -translate-x-1/2 rounded-[50%]", fillClassName)} />
      </div>
      <motion.div style={{ x: labelX, y: labelY }} className={cn("relative flex items-center justify-center gap-[0.35em] transition-colors duration-300 group-hover:text-accent-foreground", labelClassName)}>
        {children}
      </motion.div>
    </>
  );

  const shared = {
    onMouseMove: onMove,
    onMouseEnter: onEnter,
    onMouseLeave: onLeave,
    onClick,
    "aria-label": ariaLabel,
    "aria-expanded": ariaExpanded,
    style: { x, y },
    className: cn("group relative isolate overflow-hidden", className),
  };

  if (href) {
    return (
      <motion.a ref={(node: HTMLAnchorElement | null) => void (ref.current = node)} href={href} {...shared}>
        {inner}
      </motion.a>
    );
  }
  return (
    <motion.button ref={(node: HTMLButtonElement | null) => void (ref.current = node)} type={type} {...shared}>
      {inner}
    </motion.button>
  );
};

export default ButtonMagneticFill;

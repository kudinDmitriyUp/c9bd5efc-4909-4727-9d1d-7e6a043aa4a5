"use client";

import { useRef } from "react";
import { motion, useMotionValue, useSpring } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

interface ButtonMagneticProps {
  text?: string;
  href?: string;
  onClick?: () => void;
  className?: string;
}

const ButtonMagnetic = ({ text = "Get started", href = "#", onClick, className = "" }: ButtonMagneticProps) => {
  const ref = useRef<HTMLAnchorElement>(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 150, damping: 15 });
  const springY = useSpring(y, { stiffness: 150, damping: 15 });

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!ref.current || window.innerWidth < 768) return;
    const rect = ref.current.getBoundingClientRect();
    const offsetX = (e.clientX - rect.left - rect.width / 2) * 0.15;
    const offsetY = (e.clientY - rect.top - rect.height / 2) * 0.15;
    x.set(offsetX);
    y.set(offsetY);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.a
      ref={ref}
      href={href}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ x: springX, y: springY }}
      className={cn("flex items-center justify-center h-10 px-6 text-sm rounded-lg cursor-pointer bg-primary text-primary-foreground", className)}
    >
      {text}
    </motion.a>
  );
};

export default ButtonMagnetic;

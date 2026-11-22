"use client";

import { motion, useSpring, useTransform } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

interface ButtonElasticProps {
  text?: string;
  href?: string;
  onClick?: () => void;
  className?: string;
}

const ButtonElastic = ({ text = "Get started", href = "#", onClick, className = "" }: ButtonElasticProps) => {
  const scale = useSpring(1, { stiffness: 300, damping: 10 });
  const scaleX = useTransform(scale, [1, 1.08], [1, 1.08]);
  const scaleY = useTransform(scale, [1, 1.08], [1, 0.95]);

  const handleMouseEnter = () => {
    if (window.innerWidth < 768) return;
    scale.set(1.08);
    setTimeout(() => scale.set(1), 100);
  };

  return (
    <motion.a
      href={href}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      style={{ scaleX, scaleY }}
      className={cn("flex items-center justify-center h-10 px-6 text-sm rounded-lg cursor-pointer bg-primary text-primary-foreground", className)}
    >
      {text}
    </motion.a>
  );
};

export default ButtonElastic;

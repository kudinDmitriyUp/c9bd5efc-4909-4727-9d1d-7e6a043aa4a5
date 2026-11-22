"use client";

import { motion } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { useState } from "react";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

interface ButtonFlipProps {
  text?: string;
  href?: string;
  onClick?: () => void;
  className?: string;
}

const ButtonFlip = ({ text = "Get started", href = "#", onClick, className = "" }: ButtonFlipProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const maxIndex = Math.max(text.length - 1, 1);

  const getCharValues = (index: number) => {
    const t = index / maxIndex;
    const signedIndex = index - maxIndex / 2;
    const curve = Math.sin(t * 1.5 * (Math.PI / 180));
    const rotCurve = Math.sin(t * 30 * (Math.PI / 180));
    const rotSign = Math.max(-1, Math.min(1, signedIndex));
    const delay = 0.05 + curve * 2.9;
    const rotateZ = rotSign * rotCurve * 36 * -1;
    const translateX = signedIndex * 0.125;
    return { delay, rotateZ, translateX };
  };

  return (
    <a
      href={href}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn("group flex items-center justify-center h-10 px-6 text-sm rounded-lg cursor-pointer active:scale-[0.96] bg-primary text-primary-foreground", className)}
    >
      <span className="grid">
        <span className="col-start-1 row-start-1 perspective-[10em] transform-3d">
          {[...text].map((char, index) => {
            const { delay, rotateZ, translateX } = getCharValues(index);
            return (
              <motion.span
                key={index}
                className="inline-block"
                initial={false}
                animate={isHovered ? {
                  x: `${translateX}em`,
                  y: "-1.25em",
                  rotateX: 72,
                  rotateZ,
                  scale: 0.65,
                  opacity: 0,
                } : {
                  x: 0,
                  y: 0,
                  rotateX: 0,
                  rotateZ: 0,
                  scale: 1,
                  opacity: 1,
                }}
                transition={{
                  duration: 0.35,
                  delay: isHovered ? delay : 0,
                  ease: [0.675, 0.15, 0.1, 1],
                }}
                style={{ whiteSpace: char === " " ? "pre" : undefined }}
              >
                {char}
              </motion.span>
            );
          })}
        </span>
        <span aria-hidden="true" className="col-start-1 row-start-1 perspective-[10em] transform-3d">
          {[...text].map((char, index) => {
            const { delay, rotateZ, translateX } = getCharValues(index);
            return (
              <motion.span
                key={index}
                className="inline-block"
                initial={false}
                animate={isHovered ? {
                  x: 0,
                  y: 0,
                  rotateX: 0,
                  rotateZ: 0,
                  scale: 1,
                  opacity: 1,
                } : {
                  x: `${translateX}em`,
                  y: "1.25em",
                  rotateX: -72,
                  rotateZ,
                  scale: 0.65,
                  opacity: 0,
                }}
                transition={{
                  duration: 0.35,
                  delay: isHovered ? delay + 0.05 : 0,
                  ease: [0.675, 0.15, 0.1, 1],
                }}
                style={{ whiteSpace: char === " " ? "pre" : undefined }}
              >
                {char}
              </motion.span>
            );
          })}
        </span>
      </span>
    </a>
  );
};

export default ButtonFlip;

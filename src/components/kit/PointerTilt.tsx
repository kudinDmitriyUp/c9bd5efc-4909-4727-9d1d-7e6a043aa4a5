"use client";

import type { ReactNode } from "react";
import { motion, useTransform } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Pointer } from "@/components/kit/usePointer";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

type PointerTiltProps = {
  pointer: Pointer;
  depth?: number;
  className?: string;
  children: ReactNode;
};

const PointerTilt = ({ pointer, depth = 1, className, children }: PointerTiltProps) => {
  const rotateY = useTransform(pointer.x, (v) => v * 5 * depth);
  const rotateX = useTransform(pointer.y, (v) => v * -5 * depth);
  const x = useTransform(pointer.x, (v) => `${v * 4 * depth}%`);
  const y = useTransform(pointer.y, (v) => `${v * 4 * depth}%`);

  return (
    <motion.div style={{ rotateX, rotateY, x, y, transformPerspective: 900 }} className={cn("will-change-transform", className)}>
      {children}
    </motion.div>
  );
};

export default PointerTilt;

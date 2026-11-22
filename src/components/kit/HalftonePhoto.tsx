"use client";

import type { MotionValue } from "motion/react";
import { twMerge } from "tailwind-merge";
import Media from "@/components/kit/Media";

type HalftonePhotoProps = {
  src: string;
  alt?: string;
  eager?: boolean;
  clear?: MotionValue<number>;
  className?: string;
  imageClassName?: string;
};

export default function HalftonePhoto({ src, alt = "", eager = false, className, imageClassName }: HalftonePhotoProps) {
  return (
    <div className={twMerge("relative overflow-hidden", className)}>
      <Media src={src} alt={alt} loading={eager ? "eager" : "lazy"} decoding="async" className={`absolute inset-0 size-full object-cover ${imageClassName ?? ""}`} />
    </div>
  );
}

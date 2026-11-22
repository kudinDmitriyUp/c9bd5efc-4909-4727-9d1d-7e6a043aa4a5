"use client";

import { motion, useReducedMotion } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { useKitMotion } from "@/components/kit/kitMotion";
import ImageScrollParallax from "@/components/animation/ImageScrollParallax";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

type MoreProductPhotoProps = {
  imageSrc: string;
  imageAlt?: string;
  tilt?: number;
  className?: string;
};

const MoreProductPhoto = ({ imageSrc, imageAlt = "", tilt = -3, className }: MoreProductPhotoProps) => {
  const reduce = useReducedMotion();
  const { slow, ease } = useKitMotion();
  const sign = tilt < 0 ? -1 : 1;
  return (
    <div className={cn("flex size-full items-center justify-center [container-type:size]", className)}>
      <motion.div
        initial={reduce ? false : "hidden"}
        whileInView="shown"
        viewport={{ once: true, margin: "0px 0px -8% 0px" }}
        variants={{
          hidden: { rotate: tilt + sign * 8, y: 40 },
          shown: { rotate: tilt, y: 0, transition: { duration: slow, ease } },
        }}
        style={{ rotate: tilt }}
        className="aspect-[4/5] w-[min(92cqw,73.6cqh)] rounded-[var(--radius-image)] bg-secondary p-[clamp(0.5rem,0.9vw,0.9rem)]"
      >
        <motion.div
          variants={{
            hidden: { clipPath: "inset(100% 0% 0% 0%)" },
            shown: { clipPath: "inset(0% 0% 0% 0%)", transition: { duration: slow, ease, delay: 0.1 } },
          }}
          className="h-full w-full overflow-hidden rounded-[calc(var(--radius-image)-0.25rem)]"
        >
          <ImageScrollParallax imageSrc={imageSrc} imageAlt={imageAlt} strength={0.12} className="aspect-auto h-full rounded-none" />
        </motion.div>
      </motion.div>
    </div>
  );
};

export default MoreProductPhoto;

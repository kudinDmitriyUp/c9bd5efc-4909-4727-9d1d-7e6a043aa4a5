"use client";

import { motion } from "motion/react";
import LoaderStackLayers from "@/components/loaders/LoaderStackLayers";

type Cta = { text: string; href?: string };

type ArchHeroHeadProps = {
  label?: string;
  title?: string;
  description?: string;
  rotatingWords?: string[];
  rotateIn?: "title" | "label" | "middle";
  primaryButton?: Cta;
  secondaryButton?: Cta;
  brand?: string;
  mark?: string;
  tagline?: string;
  taglineWords?: string[];
};

type ArchImage = { imageSrc: string; imageAlt?: string };

type LoaderArchRiseProps = ArchHeroHeadProps & {
  items?: ArchImage[];
  onComplete?: () => void;
};

const ARCHES = ["bg-tint-1", "bg-tint-2", "bg-tint-3", "bg-tint-1", "bg-tint-2"];

const LoaderArchRise = ({ label, title, brand, onComplete }: LoaderArchRiseProps) => {
  const text = brand || label || title;

  return (
    <LoaderStackLayers
      onComplete={onComplete}
      liftAt={1.1}
      doneAt={2}
      curtainClassNames={["text-tint-1", "text-tint-3", "text-foreground"]}
      intro={
        <>
          {text && (
            <div className="overflow-clip px-[var(--gutter)]">
              <motion.p
                initial={{ y: "110%" }}
                animate={{ y: "0%" }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
                className="text-center font-[family-name:var(--font-heading)] text-[length:max(1.5rem,var(--text-h3))] leading-[1.1] tracking-[var(--heading-tracking)] text-primary-foreground"
              >
                {text}
              </motion.p>
            </div>
          )}
          <div className="flex h-[min(24vw,7.5rem)] items-end gap-[min(1.6vw,0.5rem)] overflow-clip">
            {ARCHES.map((tint, i) => (
              <motion.div
                key={i}
                initial={{ y: "102%" }}
                animate={{ y: "0%" }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.15 + i * 0.07 }}
                className={`h-full w-[min(12vw,3.75rem)] rounded-t-full ${tint}`}
              />
            ))}
          </div>
        </>
      }
    />
  );
};

export default LoaderArchRise;

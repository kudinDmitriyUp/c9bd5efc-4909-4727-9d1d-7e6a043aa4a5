"use client";

import { useRef, type ReactNode } from "react";
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import Media from "@/components/kit/Media";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

type ChapterImage = string | { imageSrc: string; imageAlt?: string };

export type StickyChaptersProps = {
  images?: ChapterImage[];
  className?: string;
  chapterClassName?: string;
  renderChapter?: (index: number) => ReactNode;
};

const pexels = (id: number) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=1000`;

const DEFAULT_IMAGES: ChapterImage[] = [1179863, 10499488, 3184465, 1640777, 2079249].map(pexels);

const Chapter = ({ src, alt, index, reduce, className, children }: { src: string; alt: string; index: number; reduce: boolean; className?: string; children?: ReactNode }) => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const p = useSpring(scrollYProgress, { stiffness: 200, damping: 30, mass: 0.3, restDelta: 0.0001 });
  const side = index % 2 ? -1 : 1;
  const rotateX = useTransform(p, (v) => (reduce ? 0 : (0.5 - v) * 70));
  const rotateY = useTransform(p, (v) => (reduce ? 0 : (v - 0.5) * 36 * side));
  const z = useTransform(p, (v) => (reduce ? 0 : -Math.abs(v - 0.5) * 520));
  const opacity = useTransform(p, (v) => (reduce ? 1 : Math.max(0.25, 1 - Math.abs(v - 0.5) * 1.8)));

  return (
    <motion.div
      ref={ref}
      style={{ rotateX, rotateY, z, opacity, transformPerspective: 1000 }}
      className={cn("relative aspect-square w-full overflow-hidden rounded-theme will-change-transform", className)}
    >
      {children ?? <Media src={src} alt={alt} decoding="async" className="absolute inset-0 size-full object-cover" />}
    </motion.div>
  );
};

const StickyChapters = ({ images = DEFAULT_IMAGES, className, chapterClassName, renderChapter }: StickyChaptersProps) => {
  const reduce = useReducedMotion() ?? false;

  return (
    <div className={cn("relative mx-auto flex w-[min(100%,clamp(15rem,24vw,22rem))] flex-col gap-[clamp(3rem,6vw,6rem)] px-4 py-[calc(50svh-clamp(15rem,24vw,22rem)/2)]", className)}>
      {images.map((image, index) => (
        <Chapter
          key={index}
          src={typeof image === "string" ? image : image.imageSrc}
          alt={typeof image === "string" ? "" : (image.imageAlt ?? "")}
          index={index}
          reduce={reduce}
          className={chapterClassName}
        >
          {renderChapter?.(index)}
        </Chapter>
      ))}
    </div>
  );
};

export default StickyChapters;

"use client";

import { useId } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Award, Clock, Coffee, Flame, Heart, Leaf, MapPin, Smile, Sparkles, Star, Sun, ThumbsUp, type LucideIcon } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

const ICONS = {
  star: Star,
  heart: Heart,
  smile: Smile,
  sparkles: Sparkles,
  coffee: Coffee,
  sun: Sun,
  leaf: Leaf,
  flame: Flame,
  "thumbs-up": ThumbsUp,
  "map-pin": MapPin,
  clock: Clock,
  award: Award,
} satisfies Record<string, LucideIcon>;

export type StickerIcon = keyof typeof ICONS;

type ToastedStickerProps = {
  text?: string;
  glyph?: StickerIcon | string;
  delay?: number;
  spin?: boolean;
  className?: string;
};

const ToastedSticker = ({ text = "made with care", glyph = "star", delay = 0, spin = true, className }: ToastedStickerProps) => {
  const id = useId().replace(/:/g, "");
  const reduce = useReducedMotion();
  const label = `${text} · ${text} · ${text} · `;
  const Icon = ICONS[glyph as StickerIcon] ?? Star;

  return (
    <motion.div
      aria-hidden="true"
      initial={reduce ? false : { scale: 0.6, rotate: -12, opacity: 0 }}
      whileInView={{ scale: 1, rotate: 0, opacity: 1 }}
      viewport={{ once: true, margin: "-10%" }}
      transition={{ type: "spring", stiffness: 260, damping: 16, delay }}
      className={cn("pointer-events-none relative z-20 size-24", className)}
    >
      <svg viewBox="-60 -60 120 120" className="absolute inset-0 size-full drop-shadow-[0_6px_10px_rgb(0_0_0/0.12)]">
        <circle r="56" className="fill-[var(--tint-1)] stroke-[var(--brand,var(--deep))]" strokeWidth="2.5" />
      </svg>
      <svg
        viewBox="-60 -60 120 120"
        className={cn("absolute inset-0 size-full", !reduce && spin && "animate-[spin_40s_linear_infinite]")}
      >
        <defs>
          <path id={`ring-${id}`} d="M0 -40 A40 40 0 1 1 -0.01 -40" />
        </defs>
        <text className="fill-[var(--brand,var(--deep))] font-mono uppercase" fontSize="10.5" letterSpacing="1.5">
          <textPath href={`#ring-${id}`}>{label}</textPath>
        </text>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-[var(--brand,var(--deep))]">
        <Icon strokeWidth={2} className="size-[34%]" />
      </div>
    </motion.div>
  );
};

export default ToastedSticker;

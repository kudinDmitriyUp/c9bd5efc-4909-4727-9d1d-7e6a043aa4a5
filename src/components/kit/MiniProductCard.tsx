"use client";

import { useRef, type ReactNode } from "react";
import { AnimatePresence, motion, useInView, useReducedMotion } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import Media from "@/components/kit/Media";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

type Ease = [number, number, number, number];

const CARD: Ease = [0.813, 0.007, 0.072, 0.993];
const IMAGE: Ease = [0.317, 0.311, 0.111, 0.924];
const TEXT: Ease = [0.681, 0.002, 0.219, 0.994];
const ROLL: Ease = [0.84, 0.075, 0.161, 1.002];
const EXPO_OUT: Ease = [0.16, 1, 0.3, 1];

export type MiniProduct = {
  name: string;
  pack?: string;
  price: string;
  imageSrc: string;
  imageAlt?: string;
  href?: string;
};

type MiniProductCardProps = {
  items?: MiniProduct[];
  index?: number;
  buttonText?: string;
  className?: string;
};

const MEDIA = "https://storage.googleapis.com/webild/default/templates/prebiotic-soda";

function Line({ shown, order, reduce, roll, className, children }: { shown: boolean; order: number; reduce: boolean; roll: number; className?: string; children: ReactNode }) {
  return (
    <div className={cn("grid overflow-hidden", className)}>
      <motion.div
        initial={reduce ? false : { y: "100%" }}
        animate={{ y: shown || reduce ? "0%" : "100%" }}
        transition={{ duration: 1, ease: TEXT, delay: 0.35 + order * 0.1 }}
        className="grid"
      >
        <AnimatePresence initial={false}>
          <motion.div
            key={roll}
            initial={{ y: "100%" }}
            animate={{ y: "0%" }}
            exit={{ y: "-100%" }}
            transition={{ duration: reduce ? 0 : 0.6, ease: ROLL }}
            className="[grid-area:1/1]"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

export default function MiniProductCard({
  items = [
    { name: "Red Berry", pack: "12 pack", price: "$45.99", imageSrc: `${MEDIA}/img/weeby-berry-card.webp`, imageAlt: "Can of Red Berry prebiotic soda", href: "#products" },
    { name: "Guava Kiwi", pack: "12 pack", price: "$45.99", imageSrc: `${MEDIA}/img/weeby-guava-card.webp`, imageAlt: "Can of Guava Kiwi prebiotic soda", href: "#products" },
    { name: "Lemon Lime", pack: "12 pack", price: "$45.99", imageSrc: `${MEDIA}/img/weeby-lemon-card.webp`, imageAlt: "Can of Lemon Lime prebiotic soda", href: "#products" },
  ],
  index = 0,
  buttonText = "Buy Now",
  className,
}: MiniProductCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.2 });
  const reduce = !!useReducedMotion();
  const count = Math.max(items.length, 1);
  const active = ((index % count) + count) % count;
  const item = items[active];
  if (!item) return null;

  return (
    <div ref={ref} className={cn("w-full [--u:clamp(0.85rem,0.8071rem+0.2143vw,1rem)]", className)}>
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 64, clipPath: "inset(0% 67% 0% 0% round 4px)" }}
        animate={inView || reduce ? { opacity: 1, y: 0, clipPath: "inset(0% 0% 0% 0% round 4px)" } : undefined}
        transition={{ opacity: { duration: 0.75, ease: "easeOut" }, default: { duration: 1, ease: CARD } }}
        className="flex min-h-[calc(var(--u)*6.25)] w-full gap-[calc(var(--u)*0.5)] rounded-[calc(var(--u)*0.25)] bg-card p-[calc(var(--u)*0.25)] text-card-foreground"
      >
        <motion.div
          initial={reduce ? false : { clipPath: "inset(100% 0% 0% 0%)", opacity: 0 }}
          animate={inView || reduce ? { clipPath: "inset(0% 0% 0% 0%)", opacity: 1 } : undefined}
          transition={{ clipPath: { duration: 1, ease: IMAGE, delay: 0.35 }, opacity: { duration: 0.6, ease: IMAGE, delay: 0.35 } }}
          className="relative w-[calc(var(--u)*5.625)] flex-none overflow-hidden rounded-[calc(var(--u)*0.125)]"
        >
          <AnimatePresence initial={false}>
            <motion.div
              key={active}
              initial={{ y: "100%" }}
              animate={{ y: "0%" }}
              exit={{ opacity: 0.99 }}
              transition={{ duration: reduce ? 0 : 0.9, ease: EXPO_OUT }}
              className="absolute inset-0"
            >
              <Media src={item.imageSrc} alt={item.imageAlt ?? item.name} loading="lazy" decoding="async" className="size-full object-cover" />
            </motion.div>
          </AnimatePresence>
        </motion.div>
        <div className="flex w-full min-w-0 flex-col justify-between p-[calc(var(--u)*0.125)] text-[length:var(--text-label)] font-medium leading-none">
          <div className="flex items-start justify-between gap-[calc(var(--u)*0.5)]">
            <Line shown={inView} order={0} reduce={reduce} roll={active}>
              <p className="max-w-[11ch]">{item.name}</p>
            </Line>
            {item.pack && (
              <Line shown={inView} order={1} reduce={reduce} roll={active} className="opacity-60">
                <p className="whitespace-nowrap">{item.pack}</p>
              </Line>
            )}
          </div>
          <div className="flex items-end justify-between gap-[calc(var(--u)*0.5)]">
            <Line shown={inView} order={2} reduce={reduce} roll={active}>
              <p className="whitespace-nowrap">{item.price}</p>
            </Line>
            <Line shown={inView} order={3} reduce={reduce} roll={active}>
              <a href={item.href ?? "#"} className="block whitespace-nowrap text-card-foreground/65 transition-colors duration-300 hover:text-card-foreground">
                <p>{buttonText}</p>
              </a>
            </Line>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

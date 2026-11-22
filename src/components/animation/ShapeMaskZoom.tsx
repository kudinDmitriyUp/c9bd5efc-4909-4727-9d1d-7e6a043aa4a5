"use client";

import { useRef, type ReactNode } from "react";
import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

type MaskShape = "star4" | "circle" | "arch" | "diamond";

type ShapeMaskZoomItem = { title: string; description?: string; imageSrc?: string; imageAlt?: string };

interface ShapeMaskZoomProps {
  imageSrc?: string;
  imageAlt?: string;
  marqueeText?: string;
  shape?: MaskShape;
  variant?: "short" | "cards";
  items?: ShapeMaskZoomItem[];
  children?: ReactNode;
  className?: string;
}

const SHAPES: Record<MaskShape, string> = {
  star4: '<path d="M50 0Q58 42 100 50Q58 58 50 100Q42 58 0 50Q42 42 50 0Z"/>',
  circle: '<circle cx="50" cy="50" r="50"/>',
  arch: '<path d="M0 100V50A50 50 0 0 1 100 50V100Z"/>',
  diamond: '<path d="M50 0L100 50L50 100L0 50Z"/>',
};

const END_SIZE: Record<MaskShape, string> = {
  star4: "((100vw + 100svh) * 1.56)",
  circle: "(hypot(100vw, 100svh) * 1.02)",
  arch: "(hypot(100vw, 100svh) * 1.02)",
  diamond: "((100vw + 100svh) * 1.02)",
};

const maskUrl = (shape: MaskShape) =>
  `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${SHAPES[shape]}</svg>`)}")`;

const easeIn = (t: number) => Math.pow(t, 2.5);
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const range = (value: number, from: number, to: number) => Math.min(1, Math.max(0, (value - from) / (to - from)));

const START_SIZE = "min(14rem, 38vw)";

const TIMING = {
  short: { height: "h-[180svh]", growEnd: 1, cardStart: 1, cardEnd: 1 },
  cards: { height: "h-[260svh]", growEnd: 0.5, cardStart: 0.5, cardEnd: 0.82 },
};

const px = (id: number) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=900`;

const DEFAULT_ITEMS: ShapeMaskZoomItem[] = [
  { title: "Plan", description: "Map the work in an afternoon, not a month.", imageSrc: px(3184465), imageAlt: "Team planning at a table" },
  { title: "Build", description: "Small steps, shipped every week, checked by real people.", imageSrc: px(1571460), imageAlt: "Bright room with a sofa" },
  { title: "Grow", description: "Keep what works, drop what does not, and repeat.", imageSrc: px(258154), imageAlt: "Pool at dusk" },
];

const Card = ({ item, index, progress, start, end }: { item: ShapeMaskZoomItem; index: number; progress: MotionValue<number>; start: number; end: number }) => {
  const from = start + index * 0.06;
  const to = Math.min(1, end + index * 0.06);
  const y = useTransform(progress, (value) => `${(1 - easeOut(range(value, from, to))) * 110}svh`);
  return (
    <motion.div style={{ y }} className="flex w-full flex-row gap-4 overflow-hidden rounded-xl bg-card p-3 text-card-foreground will-change-transform md:flex-1 md:flex-col md:p-4">
      {item.imageSrc && <img src={item.imageSrc} alt={item.imageAlt ?? ""} loading="lazy" className="aspect-square w-24 shrink-0 rounded-xl object-cover md:aspect-[4/3] md:w-full" />}
      <div className="flex flex-col justify-center gap-1 md:gap-2 md:px-1 md:pb-2">
        <h3 className="text-xl font-semibold leading-tight md:text-3xl">{item.title}</h3>
        {item.description && <p className="text-sm text-card-foreground/70 md:text-base">{item.description}</p>}
      </div>
    </motion.div>
  );
};

const ShapeMaskZoom = ({
  imageSrc = "https://images.pexels.com/photos/1179863/pexels-photo-1179863.jpeg?auto=compress&cs=tinysrgb&w=1600",
  imageAlt = "",
  marqueeText = "Design that ships",
  shape = "star4",
  variant = "short",
  items = DEFAULT_ITEMS,
  children,
  className = "",
}: ShapeMaskZoomProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const mask = maskUrl(shape);
  const timing = TIMING[variant];
  const withCards = variant === "cards";

  const grow = useTransform(scrollYProgress, (value) => easeIn(range(value, 0, timing.growEnd)));
  const maskSize = useTransform(grow, (value) => `calc(${START_SIZE} + (${END_SIZE[shape]} - ${START_SIZE}) * ${value.toFixed(4)})`);
  const maskImage = useTransform(scrollYProgress, (value) => (value >= timing.growEnd ? "none" : mask));
  const imageScale = useTransform(scrollYProgress, (value) => 1.04 + value * 0.12);
  const dim = useTransform(scrollYProgress, (value) => range(value, timing.cardStart, timing.cardEnd) * 0.4);
  const childY = useTransform(scrollYProgress, (value) => `${(1 - easeOut(range(value, timing.cardStart, timing.cardEnd))) * 110}svh`);

  const words = Array.from({ length: 4 }, (_, index) => (
    <p key={index} className="shrink-0 pr-[0.4em]">
      {marqueeText}
    </p>
  ));

  const staticCards = children ?? (
    <div className="flex w-full max-w-6xl flex-col px-6 gap-3 md:flex-row md:gap-6">
      {items.map((item) => (
        <div key={item.title} className="flex w-full flex-row gap-4 overflow-hidden rounded-xl bg-card p-3 text-card-foreground md:flex-1 md:flex-col md:p-4">
          {item.imageSrc && <img src={item.imageSrc} alt={item.imageAlt ?? ""} loading="lazy" className="aspect-square w-24 shrink-0 rounded-xl object-cover md:aspect-[4/3] md:w-full" />}
          <div className="flex flex-col justify-center gap-1 md:gap-2 md:px-1 md:pb-2">
            <h3 className="text-xl font-semibold leading-tight md:text-3xl">{item.title}</h3>
            {item.description && <p className="text-sm text-card-foreground/70 md:text-base">{item.description}</p>}
          </div>
        </div>
      ))}
    </div>
  );

  if (reduce) {
    return (
      <div className={cn("relative grid min-h-svh w-full place-items-center overflow-hidden p-6", className)}>
        <img src={imageSrc} alt={imageAlt} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
        {withCards && <div className="absolute inset-0 bg-black/40" />}
        {withCards && <div className="relative flex w-full justify-center">{staticCards}</div>}
      </div>
    );
  }

  return (
    <div ref={ref} className={cn("relative w-full", timing.height, className)}>
      <div className="sticky top-0 h-svh w-full overflow-hidden bg-background">
        <div aria-hidden="true" className="absolute inset-0 flex items-center overflow-hidden">
          <motion.div
            animate={{ x: ["0%", "-50%"] }}
            transition={{ duration: 28, ease: "linear", repeat: Infinity }}
            className="flex shrink-0 whitespace-nowrap text-[18vw] font-semibold uppercase leading-none tracking-tight text-foreground md:text-[13vw]"
          >
            {words}
            {words}
          </motion.div>
        </div>
        <p className="sr-only">{marqueeText}</p>
        <motion.div
          style={{
            maskImage,
            WebkitMaskImage: maskImage,
            maskSize,
            WebkitMaskSize: maskSize,
            maskPosition: "center",
            WebkitMaskPosition: "center",
            maskRepeat: "no-repeat",
            WebkitMaskRepeat: "no-repeat",
          }}
          className="absolute inset-0 overflow-hidden"
        >
          <motion.img src={imageSrc} alt={imageAlt} style={{ scale: imageScale }} className="absolute inset-0 h-full w-full object-cover will-change-transform" />
          {withCards && <motion.div style={{ opacity: dim }} className="absolute inset-0 bg-black" />}
        </motion.div>
        {withCards &&
          (children ? (
            <motion.div style={{ y: childY }} className="absolute inset-0 flex items-center justify-center p-4 will-change-transform md:p-8">
              {children}
            </motion.div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex w-full max-w-6xl flex-col px-6 gap-3 md:flex-row md:gap-6">
                {items.map((item, index) => (
                  <Card key={item.title} item={item} index={index} progress={scrollYProgress} start={timing.cardStart} end={timing.cardEnd} />
                ))}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
};

export default ShapeMaskZoom;

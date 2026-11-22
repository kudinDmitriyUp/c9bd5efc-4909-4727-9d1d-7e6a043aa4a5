"use client";

import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import { motion, useAnimationFrame, useInView, useMotionValue, useReducedMotion, useScroll, useSpring, useVelocity } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import Media from "@/components/kit/Media";
import { usePreloadImages } from "@/components/kit/kitMotion";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

interface CardCylinderItem {
  src?: string;
  videoSrc?: string;
  alt?: string;
  title?: string;
  text?: string;
}

interface CardCylinderProps {
  items?: CardCylinderItem[];
  count?: number;
  duration?: number;
  direction?: 1 | -1;
  radius?: string;
  cardWidth?: string;
  perspective?: string;
  speedOnScroll?: boolean;
  edgeFade?: boolean;
  rise?: boolean;
  cardClassName?: string;
  className?: string;
}

const MASK = "linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%)";

const DEFAULT_ITEMS: CardCylinderItem[] = [
  { src: "https://images.pexels.com/photos/1179863/pexels-photo-1179863.jpeg?auto=compress&cs=tinysrgb&w=1200", alt: "Sample", title: "Design that ships", text: "Built for the long run" },
  { src: "https://images.pexels.com/photos/10499488/pexels-photo-10499488.jpeg?auto=compress&cs=tinysrgb&w=1200", alt: "Sample", title: "Clear structure", text: "Built for the long run" },
  { src: "https://images.pexels.com/photos/10923534/pexels-photo-10923534.jpeg?auto=compress&cs=tinysrgb&w=1200", alt: "Sample", title: "Quiet details", text: "Built for the long run" },
  { src: "https://images.pexels.com/photos/11979193/pexels-photo-11979193.jpeg?auto=compress&cs=tinysrgb&w=1200", alt: "Sample", title: "Honest craft", text: "Built for the long run" },
];

const CardCylinder = ({
  items = DEFAULT_ITEMS,
  count = 12,
  duration = 60,
  direction = 1,
  radius,
  cardWidth,
  perspective,
  speedOnScroll = false,
  edgeFade = true,
  rise = false,
  cardClassName,
  className,
}: CardCylinderProps) => {
  const ref = useRef<HTMLDivElement>(null);
  usePreloadImages(ref, "150%");
  const inView = useInView(ref);
  const reduce = useReducedMotion();
  const angle = useMotionValue(0);
  const { scrollY } = useScroll();
  const velocity = useSpring(useVelocity(scrollY), { damping: 50, stiffness: 400 });
  const step = 360 / count;
  const cards = items.length ? Array.from({ length: count }, (_, i) => items[i % items.length]) : [];
  const labelled = items.some((item) => item.title || item.text);

  useEffect(() => {
    ref.current?.querySelectorAll("video").forEach((video) => {
      if (inView) video.play().catch(() => {});
      else video.pause();
    });
  }, [inView]);

  useAnimationFrame((_, delta) => {
    if (!inView || reduce) return;
    const boost = speedOnScroll ? Math.min(Math.abs(velocity.get()) / 400, 5) : 0;
    angle.set(angle.get() - direction * (360 / duration) * (delta / 1000) * (1 + boost));
  });

  const vars = {
    ...(radius && { "--cc-r": radius }),
    ...(cardWidth && { "--cc-w": cardWidth }),
    ...(perspective && { "--cc-p": perspective }),
    perspective: "var(--cc-p)",
    ...(edgeFade && { maskImage: MASK, WebkitMaskImage: MASK }),
  } as CSSProperties;

  return (
    <motion.div
      ref={ref}
      aria-hidden={labelled ? undefined : true}
      initial={rise && !reduce ? { opacity: 0, y: 90 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "flex w-full items-center justify-center overflow-hidden [--cc-p:145vw] [--cc-r:140vw] [--cc-w:72vw] md:[--cc-p:77vw] md:[--cc-r:52vw] md:[--cc-w:26.5vw] 2xl:[--cc-p:71vw] 2xl:[--cc-r:48vw] 2xl:[--cc-w:24.5vw]",
        className,
      )}
      style={vars}
    >
      <motion.div
        className="relative aspect-[2/3] w-[var(--cc-w)]"
        style={{ rotateY: angle, transformStyle: "preserve-3d" }}
      >
        {cards.map((item, i) => (
          <div
            key={i}
            aria-hidden={labelled && i < items.length && (item.title || item.text) ? undefined : true}
            className="absolute inset-0 flex items-center justify-center"
            style={{ transform: `rotateY(${-i * step}deg) translateZ(calc(var(--cc-r) * -1))`, backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}
          >
            <div
              className={cn(
                "flex h-full w-full flex-col gap-[0.44em] overflow-hidden rounded-[var(--radius,1.25rem)] bg-card p-[0.22em] text-[3.9vw] text-card-foreground md:text-[1.22vw] 2xl:text-[0.98vw]",
                cardClassName,
              )}
            >
              <div className={cn("relative w-full overflow-hidden rounded-[calc(var(--radius,1.25rem)*0.75)] bg-foreground/5", item.title || item.text ? "aspect-[4/5] shrink-0" : "h-full")}>
                {item.videoSrc ? (
                  <video src={item.videoSrc} poster={item.src} autoPlay loop muted playsInline preload="metadata" aria-hidden className="h-full w-full object-cover" />
                ) : item.src ? (
                  <Media src={item.src} alt={item.alt ?? ""} draggable={false} loading="lazy" decoding="async" className="h-full w-full object-cover" />
                ) : null}
              </div>
              {(item.title || item.text) && (
                <div className="flex min-h-0 flex-col gap-[0.35em] px-[0.68em] pt-[0.3em] pb-[0.68em]">
                  {item.title && <p className="truncate text-[1em] font-medium leading-tight">{item.title}</p>}
                  {item.text && <p className="line-clamp-3 text-[0.85em] leading-snug opacity-70">{item.text}</p>}
                </div>
              )}
            </div>
          </div>
        ))}
      </motion.div>
    </motion.div>
  );
};

export default CardCylinder;

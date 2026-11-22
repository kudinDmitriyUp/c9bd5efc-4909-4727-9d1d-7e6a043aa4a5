"use client";

import { Children, useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useMotionValueEvent, useReducedMotion, useScroll, type MotionValue } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import Media from "@/components/kit/Media";
import { usePreloadImages } from "@/components/kit/kitMotion";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

type HorizontalScrollItem = { title?: string; imageSrc: string; imageAlt?: string };

type HorizontalScrollSectionProps = {
  items?: HorizontalScrollItem[];
  children?: React.ReactNode;
  header?: React.ReactNode;
  className?: string;
  trackClassName?: string;
  progress?: boolean;
  compact?: boolean;
  headerClassName?: string;
  bodyClassName?: string;
  x?: MotionValue<number>;
};

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

const distance = (rel: number, travel: number, view: number) => {
  if (rel < 0) {
    const u = clamp((rel + view) / view, 0, 1);
    return -(view / 2) * (1 - u * u);
  }
  if (rel > travel) {
    const u = clamp((rel - travel) / view, 0, 1);
    return travel + (view / 2) * (1 - (1 - u) * (1 - u));
  }
  return rel;
};

const px = (id: number) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=1200`;

const DEFAULT_ITEMS: HorizontalScrollItem[] = [
  { title: "Sea Suite", imageSrc: px(271624) },
  { title: "Garden Room", imageSrc: px(1571460) },
  { title: "Spa", imageSrc: px(3993449) },
  { title: "Pool", imageSrc: px(261102) },
  { title: "Lounge", imageSrc: px(1571463) },
  { title: "Terrace", imageSrc: px(258154) },
];

const HorizontalScene = ({ children, header, className = "", trackClassName = "", progress = true, compact = false, headerClassName, bodyClassName, x: trackX }: HorizontalScrollSectionProps) => {
  const outerRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const geo = useRef({ travel: 0, view: 0 });
  const ownX = useMotionValue(0);
  const x = trackX ?? ownX;
  const done = useMotionValue(0);
  const [height, setHeight] = useState<number>();
  const [moves, setMoves] = useState(false);
  const { scrollYProgress } = useScroll({ target: outerRef, offset: ["start end", "end start"] });
  usePreloadImages(outerRef, "150%");

  const sync = () => {
    const { travel, view } = geo.current;
    const rel = -(outerRef.current?.getBoundingClientRect().top ?? 0);
    x.set(-distance(rel, travel, view));
    done.set(travel > 0 ? clamp(rel / travel, 0, 1) : 0);
  };

  useEffect(() => {
    const box = boxRef.current;
    const track = trackRef.current;
    if (!box || !track) return;
    const update = () => {
      const travel = Math.max(0, track.scrollWidth - box.clientWidth);
      const view = box.clientHeight;
      geo.current = { travel, view };
      setHeight(travel + view);
      setMoves(travel > 0);
      sync();
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(box);
    observer.observe(track);
    return () => observer.disconnect();
  }, []);

  useMotionValueEvent(scrollYProgress, "change", sync);

  return (
    <div ref={outerRef} style={{ height }} className={cn("relative w-full", className)}>
      <div ref={boxRef} className={cn("sticky top-0 ml-[calc(50%-50vw)] flex h-svh w-[100vw] flex-col overflow-hidden", compact && "justify-center")}>
        {header && <div className={cn("relative z-10 mx-auto w-full max-w-6xl px-6", compact ? "pt-[clamp(4rem,9svh,6rem)]" : "pt-8", headerClassName)}>{header}</div>}
        <div className={cn("flex items-center", compact ? "mt-[clamp(2rem,4vw,3.5rem)]" : "min-h-0 flex-1", bodyClassName)}>
          <motion.div ref={trackRef} style={{ x }} className={cn("flex w-max gap-4 px-[max(1.5rem,calc((100vw-72rem)/2+1.5rem))] will-change-transform md:gap-6", trackClassName)}>
            {Children.map(children, (child) => (
              <div className="shrink-0">{child}</div>
            ))}
          </motion.div>
        </div>
        {progress && moves && (
          <div className="absolute inset-x-[max(1.5rem,calc((100vw-72rem)/2+1.5rem))] bottom-8 h-px bg-foreground/20">
            <motion.div style={{ scaleX: done }} className="h-full w-full origin-left bg-foreground" />
          </div>
        )}
      </div>
    </div>
  );
};

const HorizontalScrollSection = ({ items = DEFAULT_ITEMS, children, ...rest }: HorizontalScrollSectionProps) => {
  const reduce = useReducedMotion();
  const content =
    children ??
    items.map((item, index) => (
      <div key={index} className="w-[75vw] md:w-[32vw]">
        <Media src={item.imageSrc} alt={item.imageAlt ?? item.title ?? ""} loading="lazy" className="aspect-[4/5] w-full rounded-xl object-cover md:aspect-auto md:h-[60svh]" />
        {item.title && <p className="mt-3 text-lg text-foreground">{item.title}</p>}
      </div>
    ));

  if (!reduce) return <HorizontalScene {...rest}>{content}</HorizontalScene>;

  return (
    <div className={cn("relative w-full py-8", rest.className)}>
      {rest.header && <div className={cn("mx-auto w-full max-w-6xl px-6 pb-6", rest.headerClassName)}>{rest.header}</div>}
      <div className={cn("flex snap-x snap-mandatory scroll-px-6 gap-4 overflow-x-auto px-6 pb-4", rest.trackClassName)}>
        {Children.map(content, (child) => (
          <div className="shrink-0 snap-start">{child}</div>
        ))}
      </div>
    </div>
  );
};

export default HorizontalScrollSection;

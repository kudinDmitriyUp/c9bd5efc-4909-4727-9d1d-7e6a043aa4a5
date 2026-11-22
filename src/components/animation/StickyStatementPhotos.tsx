"use client";

import { useRef, useSyncExternalStore } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

type Photo = {
  src?: string;
  videoSrc?: string;
  alt?: string;
  caption?: string;
};

interface StickyStatementPhotosProps {
  title?: string;
  description?: string;
  tag?: "h2" | "h3";
  photos?: Photo[];
  className?: string;
  titleClassName?: string;
}

const widths = [
  "w-[clamp(12.5rem,24vw,24rem)]",
  "w-[clamp(12.5rem,16vw,16rem)]",
  "w-[clamp(12.5rem,20vw,20rem)]",
  "w-[clamp(12.5rem,14vw,14rem)]",
  "w-[clamp(12.5rem,22vw,22rem)]",
  "w-[clamp(12.5rem,17vw,17rem)]",
  "w-[clamp(12.5rem,19vw,19rem)]",
  "w-[clamp(12.5rem,15vw,15rem)]",
];
const lefts = ["left-[5vw]", "left-[11vw]", "left-[3vw]", "left-[8vw]"];
const rights = ["right-[9vw]", "right-[4vw]", "right-[12vw]", "right-[6vw]"];
const aspects = ["aspect-[4/5]", "aspect-[3/4]", "aspect-square", "aspect-[4/5]", "aspect-[5/4]", "aspect-[3/4]", "aspect-[4/5]", "aspect-square"];
const rotations = [-2.5, 2, 0, -1.5, 3, -3, 1, 0];
const tilts = ["-rotate-[1.5deg]", "rotate-[1.2deg]", "rotate-0", "-rotate-[1deg]", "rotate-[1.8deg]", "-rotate-[1.8deg]", "rotate-[0.6deg]", "rotate-0"];
const drifts =[90, -50, 130, -30, 70, -80, 110, -40];

const query = "(min-width: 768px)";
const subscribe = (onChange: () => void) => {
  const list = window.matchMedia(query);
  list.addEventListener("change", onChange);
  return () => list.removeEventListener("change", onChange);
};
const useDesktop = () => useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => false);

const Media = ({ photo, className }: { photo: Photo; className: string }) =>
  photo.videoSrc ? (
    <video src={photo.videoSrc} aria-label={photo.alt || undefined} className={className} autoPlay loop muted playsInline />
  ) : photo.src ? (
    <img src={photo.src} alt={photo.alt ?? ""} loading="lazy" className={className} />
  ) : null;

const FloatingPhoto = ({ photo, index }: { photo: Photo; index: number }) => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const drift = drifts[index % drifts.length];
  const y = useTransform(scrollYProgress, [0, 1], [drift, -drift]);
  const side = index % 2 === 0 ? lefts[Math.floor(index / 2) % lefts.length] : rights[Math.floor(index / 2) % rights.length];

  return (
    <div ref={ref} className="relative h-[60svh]">
      <motion.div style={{ y, rotate: rotations[index % rotations.length] }} className={cn("absolute top-0 rounded-sm bg-card p-[9px] shadow-2xl shadow-background/40", side, widths[index % widths.length])}>
        <div className={cn("relative w-full overflow-hidden", aspects[index % aspects.length])}>
          <Media photo={photo} className="absolute inset-0 h-full w-full object-cover" />
        </div>
        <div className="flex min-h-[28px] items-end pt-2">
          {photo.caption && <p className="line-clamp-3 text-xs leading-snug text-card-foreground/70">{photo.caption}</p>}
        </div>
      </motion.div>
    </div>
  );
};

const DEFAULT_PHOTOS: Photo[] = [
  { src: "https://images.pexels.com/photos/1179863/pexels-photo-1179863.jpeg?auto=compress&cs=tinysrgb&w=1200", alt: "Sample", caption: "Clear structure" },
  { src: "https://images.pexels.com/photos/10499488/pexels-photo-10499488.jpeg?auto=compress&cs=tinysrgb&w=1200", alt: "Sample", caption: "Quiet details" },
  { src: "https://images.pexels.com/photos/10923534/pexels-photo-10923534.jpeg?auto=compress&cs=tinysrgb&w=1200", alt: "Sample", caption: "Honest craft" },
  { src: "https://images.pexels.com/photos/11979193/pexels-photo-11979193.jpeg?auto=compress&cs=tinysrgb&w=1200", alt: "Sample", caption: "Lasting finish" },
];

const StickyStatementPhotos = ({ title = "Design that ships", description = "Built for the long run", tag = "h2", photos = DEFAULT_PHOTOS,className = "", titleClassName = "" }: StickyStatementPhotosProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const desktop = useDesktop();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const fade = (v: number) => Math.min(1, Math.max(0, (v - 0.75) / 0.25));
  const opacity = useTransform(scrollYProgress, (v) => 1 - fade(v) * 0.4);
  const filter = useTransform(scrollYProgress, (v) => `blur(${fade(v) * 2}px)`);
  const Tag = tag;
  const leading = !/(^|\s)leading-/.test(titleClassName) && "leading-[1.05]";

  return (
    <div className={cn("relative w-full", className)}>
      {!reduce && desktop ? (
        <div ref={ref} className="relative hidden md:block">
          <div className="sticky top-0 flex h-svh items-center justify-center px-[clamp(2rem,6vw,6rem)]">
            <motion.div style={{ opacity, filter }} className="flex max-w-[clamp(20rem,46vw,46rem)] flex-col items-center gap-[clamp(1.25rem,1.6vw,1.75rem)] text-center">
              <Tag className={cn("text-[clamp(2.5rem,4.5vw,4.5rem)] font-medium tracking-[-0.02em] text-foreground", titleClassName, leading)}>{title}</Tag>
              {description && <p className="max-w-[clamp(18rem,32vw,32rem)] text-[clamp(1rem,1.1vw,1.125rem)] leading-relaxed text-foreground/70">{description}</p>}
            </motion.div>
          </div>
          <div className="relative z-10 -mt-[100svh] pt-[70svh] pb-[30svh]">
            {photos.map((photo, i) => (
              <FloatingPhoto key={i} photo={photo} index={i} />
            ))}
          </div>
        </div>
      ) : (
      <div className={cn("flex flex-col gap-[10vw] px-[5vw] py-[12vw]", !reduce && "md:hidden", reduce && "md:gap-16 md:px-[6vw] md:py-24")}>
        <div className="flex flex-col items-center gap-[4vw] text-center md:gap-6">
          <Tag className={cn("text-[9vw] font-medium tracking-[-0.02em] text-foreground md:text-[clamp(2.5rem,4.5vw,4.5rem)]", titleClassName, leading)}>{title}</Tag>
          {description && <p className="text-[4.2vw] leading-relaxed text-foreground/70 md:max-w-[32rem] md:text-base">{description}</p>}
        </div>
        <div className="grid grid-cols-2 items-start gap-x-[4vw] md:mx-auto md:w-full md:max-w-[56rem] md:grid-cols-3 md:gap-x-8">
          {photos.map((photo, i) => (
            <div key={i} className={cn(tilts[i % tilts.length], "mb-[6vw] rounded-sm bg-card p-[2vw] shadow-xl shadow-background/40 md:mb-10 md:p-[9px]", i % 2 === 1 && "mt-[16vw] md:mt-24")}>
              <div className={cn("relative w-full overflow-hidden", aspects[i % aspects.length])}>
                <Media photo={photo} className="absolute inset-0 h-full w-full object-cover" />
              </div>
              <div className="flex min-h-[7vw] items-end pt-[1.5vw] md:min-h-[28px] md:pt-2">
                {photo.caption && <p className="line-clamp-3 text-[3vw] leading-snug text-card-foreground/70 md:text-xs">{photo.caption}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
      )}
    </div>
  );
};

export default StickyStatementPhotos;

"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

type HeroZoomCardProps = {
  src?: string;
  videoSrc?: string;
  alt?: string;
  intro?: React.ReactNode;
  children?: React.ReactNode;
  caption?: React.ReactNode;
  cardWidth?: string;
  cardHeight?: string;
  radius?: number;
  length?: number;
  marquee?: string[];
  className?: string;
};

const MarqueeRow = ({ text, reverse = false, still = false }: { text: string; reverse?: boolean; still?: boolean }) => (
  <motion.div
    animate={still ? undefined : { x: reverse ? ["-50%", "0%"] : ["0%", "-50%"] }}
    transition={{ duration: 30, ease: "linear", repeat: Infinity }}
    style={still ? { x: reverse ? "-35%" : "-10%" } : undefined}
    className="flex w-max shrink-0 whitespace-nowrap font-semibold uppercase leading-[1.1] tracking-tight text-foreground will-change-transform">
    {Array.from({ length: 6 }, (_, index) => (
      <p key={index} className="shrink-0 pr-[0.4em]">
        {text}
      </p>
    ))}
  </motion.div>
);

const query = "(min-width: 768px)";
const subscribe = (onChange: () => void) => {
  const list = window.matchMedia(query);
  list.addEventListener("change", onChange);
  return () => list.removeEventListener("change", onChange);
};
const useDesktop = () => useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => false);

const lift = 0.62;

const defaultSrc = "https://images.pexels.com/photos/1179863/pexels-photo-1179863.jpeg?auto=compress&cs=tinysrgb&w=1600";

const Media = ({ src, videoSrc, alt, style }: { src?: string; videoSrc?: string; alt: string; style?: React.ComponentProps<typeof motion.img>["style"] }) =>
  videoSrc ? (
    <motion.video src={videoSrc} poster={src} aria-label={alt || undefined} style={style} className="absolute inset-0 h-full w-full object-cover" autoPlay loop muted playsInline />
  ) : src ? (
    <motion.img src={src} alt={alt} style={style} className="absolute inset-0 h-full w-full object-cover" />
  ) : null;

const ZoomScene = ({ src = defaultSrc, videoSrc, alt = "", intro, children, caption, cardWidth: width, cardHeight: height, radius = 24, length = 1.7, marquee, className = "" }: HeroZoomCardProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [room, setRoom] = useState(0);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const shrink = useTransform(scrollYProgress, (v) => 1 - Math.pow(1 - Math.min(1, Math.max(0, v)), 1.4));
  const rows = marquee?.slice(0, 2) ?? [];
  const square = "min(40vw, 28rem, 70svh)";
  const cardWidth = width ?? (rows.length ? square : "min(54vw, 50rem)");
  const cardHeight = height ?? (rows.length ? square : "min(48svh, 28rem)");
  const below = rows.length ? `(100% - ${cardHeight}) * 0.5` : `max(${room}px, (100% - ${cardHeight}) * ${1 - lift})`;
  const clipPath = useTransform(shrink, (p) => `inset(calc((100% - ${cardHeight} - ${below}) * ${p}) calc((100% - ${cardWidth}) * ${p / 2}) calc(${below} * ${p}) round ${p * radius}px)`);
  const scale = useTransform(shrink, (p) => 1.15 - 0.15 * p);
  const introOpacity = useTransform(scrollYProgress, (v) => Math.max(0, 1 - v / 0.3));
  const captionOpacity = useTransform(shrink, (p) => Math.min(1, Math.max(0, (p - 0.55) / 0.35)));

  useEffect(() => {
    const text = textRef.current;
    if (!text) return;
    const update = () => setRoom(text.offsetHeight);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(text);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} style={{ height: `${length * 100}svh` }} className={cn("relative w-full", className)}>
      <div className="sticky top-0 h-[100svh] w-full overflow-hidden">
        {rows.length > 0 && (
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex flex-col justify-center overflow-hidden text-[min(11vw,15svh)]">
            <MarqueeRow text={rows[0]} />
            <MarqueeRow text={rows[1] ?? rows[0]} reverse />
          </div>
        )}
        {rows.length > 0 && <p className="sr-only">{rows.join(". ")}</p>}
        <motion.div style={{ clipPath }} className="absolute inset-0 overflow-hidden">
          <Media src={src} videoSrc={videoSrc} alt={alt} style={{ scale }} />
          {(intro || children) && (
            <motion.div style={{ opacity: introOpacity }} className="absolute inset-0 z-10">
              {intro}
              {children}
            </motion.div>
          )}
        </motion.div>
        {caption && (
          <motion.div ref={textRef} style={{ opacity: captionOpacity }} className="absolute inset-x-0 bottom-0 z-10 flex justify-center px-8 pb-10 pt-6">
            {caption}
          </motion.div>
        )}
      </div>
    </div>
  );
};

const StaticScene = (props: HeroZoomCardProps) => {
  const reduce = useReducedMotion() ?? false;
  const rows = props.marquee?.slice(0, 2) ?? [];

  return (
    <div className={cn("relative w-full", props.className)}>
      <div className="relative h-[100svh] w-full overflow-hidden">
        <Media src={props.src ?? defaultSrc} videoSrc={props.videoSrc} alt={props.alt ?? ""} />
        {(props.intro || props.children) && (
          <div className="absolute inset-0 z-10">
            {props.intro}
            {props.children}
          </div>
        )}
      </div>
      {rows.length > 0 && (
        <div aria-hidden="true" className="flex flex-col gap-2 overflow-hidden py-6 text-[16vw]">
          <MarqueeRow text={rows[0]} still={reduce} />
          <MarqueeRow text={rows[1] ?? rows[0]} reverse still={reduce} />
        </div>
      )}
      {rows.length > 0 && <p className="sr-only">{rows.join(". ")}</p>}
      {props.caption && <div className="px-6 py-8">{props.caption}</div>}
    </div>
  );
};

const HeroZoomCard = (props: HeroZoomCardProps) => {
  const desktop = useDesktop();
  const reduce = useReducedMotion();
  return desktop && !reduce ? <ZoomScene {...props} /> : <StaticScene {...props} />;
};

export default HeroZoomCard;

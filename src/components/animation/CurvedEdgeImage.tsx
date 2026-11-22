"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { motion, useMotionValue, useReducedMotion, useScroll, useTransform } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

type CurvedEdgeImageProps = {
  src?: string;
  videoSrc?: string;
  alt?: string;
  edge?: "bottom" | "top";
  depth?: number;
  className?: string;
  children?: React.ReactNode;
};

const query = "(min-width: 768px)";
const subscribe = (onChange: () => void) => {
  const list = window.matchMedia(query);
  list.addEventListener("change", onChange);
  return () => list.removeEventListener("change", onChange);
};
const useDesktop = () => useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => false);

const curve = (edge: "bottom" | "top", w: number, h: number, d: number) =>
  edge === "bottom"
    ? `path("M 0 0 L ${w} 0 L ${w} ${h - d} Q ${w / 2} ${h + d} 0 ${h - d} Z")`
    : `path("M 0 ${d} Q ${w / 2} ${-d} ${w} ${d} L ${w} ${h} L 0 ${h} Z")`;

const Media = ({ src, videoSrc, alt, style }: { src?: string; videoSrc?: string; alt: string; style?: React.ComponentProps<typeof motion.img>["style"] }) =>
  videoSrc ? (
    <motion.video src={videoSrc} poster={src} aria-label={alt || undefined} style={style} className="absolute inset-0 h-full w-full object-cover" autoPlay loop muted playsInline />
  ) : src ? (
    <motion.img src={src} alt={alt} style={style} className="absolute inset-0 h-full w-full object-cover" />
  ) : null;

const CurvedScene = ({ src, videoSrc, alt = "", edge = "bottom", depth = 160, className = "", children }: CurvedEdgeImageProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const width = useMotionValue(0);
  const height = useMotionValue(0);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const update = () => {
      width.set(element.offsetWidth);
      height.set(element.offsetHeight);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [width, height]);

  const { scrollYProgress: bend } = useScroll({ target: ref, offset: edge === "top" ? ["start end", "start start"] : ["end end", "end 0.35"] });
  const { scrollYProgress: pass } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const clipPath = useTransform([bend, width, height], ([p, w, h]: number[]) => (w ? curve(edge, w, h, (edge === "top" ? 1 - p : p) * depth) : "none"));
  const y = useTransform(pass, [0, 1], ["0%", "-12%"]);
  const scale = useTransform(pass, [0, 1], [1, 1.1]);

  return (
    <motion.div ref={ref} style={{ clipPath }} className={cn("relative h-[100svh] w-full overflow-hidden", className)}>
      <div className="absolute inset-x-0 top-0 h-[115%]">
        <Media src={src} videoSrc={videoSrc} alt={alt} style={{ y, scale }} />
      </div>
      {children && <div className="relative z-10 h-full">{children}</div>}
    </motion.div>
  );
};

const CurvedEdgeImage = (props: CurvedEdgeImageProps) => {
  const desktop = useDesktop();
  const reduce = useReducedMotion();

  if (desktop && !reduce) return <CurvedScene {...props} />;

  return (
    <div className={cn("relative h-[100svh] w-full overflow-hidden", props.className)}>
      <Media src={props.src} videoSrc={props.videoSrc} alt={props.alt ?? ""} />
      {props.children && <div className="relative z-10 h-full">{props.children}</div>}
    </div>
  );
};

export default CurvedEdgeImage;

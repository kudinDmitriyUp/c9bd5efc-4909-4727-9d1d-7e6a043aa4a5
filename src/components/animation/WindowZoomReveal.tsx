"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { motion, useMotionValue, useReducedMotion, useScroll, useTransform, type MotionValue } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

type WindowShape = "arch" | "circle" | "rounded" | "pill" | "square" | { d: string; height: number };

type WindowZoomRevealProps = {
  src?: string;
  videoSrc?: string;
  alt?: string;
  shape?: WindowShape;
  children?: React.ReactNode;
  after?: React.ReactNode;
  revealTitle?: string;
  wallClassName?: string;
  length?: number;
  className?: string;
};

const query = "(min-width: 768px)";
const subscribe = (onChange: () => void) => {
  const list = window.matchMedia(query);
  list.addEventListener("change", onChange);
  return () => list.removeEventListener("change", onChange);
};
const useDesktop = () => useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => false);

const shapes = {
  arch: { height: 140, d: "M0 140V50A50 50 0 0 1 100 50V140Z" },
  circle: { height: 100, d: "M0 50A50 50 0 1 1 100 50A50 50 0 1 1 0 50Z" },
  rounded: { height: 125, d: "M10 0H90A10 10 0 0 1 100 10V115A10 10 0 0 1 90 125H10A10 10 0 0 1 0 115V10A10 10 0 0 1 10 0Z" },
  pill: { height: 150, d: "M0 50A50 50 0 0 1 100 50V100A50 50 0 0 1 0 100Z" },
  square: { height: 125, d: "M0 0H100V125H0Z" },
};

const resolve = (shape: WindowShape) => (typeof shape === "string" ? shapes[shape] : shape);

const shapeUrl = ({ d, height }: { d: string; height: number }) =>
  `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 ${height}'><path d='${d}'/></svg>`)}")`;

const drop = 0.6;

const coverScale = ({ d, height }: { d: string; height: number }, width: number, viewHeight: number) => {
  const context = document.createElement("canvas").getContext("2d");
  if (!context || !width || !viewHeight) return 12;
  const path = new Path2D(d);
  const windowWidth = Math.min(width * 0.28, (viewHeight * 55) / height);
  const windowHeight = (windowWidth * height) / 100;
  const centerY = (viewHeight - windowHeight) * drop + windowHeight / 2;
  const unit = 100 / windowWidth;
  const points: [number, number][] = [];
  for (let i = 0; i <= 16; i += 1) {
    const f = i / 16;
    points.push([f * width, 0], [f * width, viewHeight], [0, f * viewHeight], [width, f * viewHeight]);
  }
  const covers = (scale: number) =>
    points.every(([x, y]) => context.isPointInPath(path, ((x - width / 2) * unit) / scale + 50, ((y - centerY) * unit) / scale + height / 2));
  let low = 1;
  let high = 80;
  for (let i = 0; i < 24; i += 1) {
    const mid = (low + high) / 2;
    if (covers(mid)) high = mid;
    else low = mid;
  }
  return high * 1.04;
};

const Media = ({ src, videoSrc, alt, style }: { src?: string; videoSrc?: string; alt: string; style?: React.ComponentProps<typeof motion.img>["style"] }) =>
  videoSrc ? (
    <motion.video src={videoSrc} poster={src} aria-label={alt || undefined} style={style} className="absolute inset-0 h-full w-full object-cover" autoPlay loop muted playsInline />
  ) : src ? (
    <motion.img src={src} alt={alt} style={style} className="absolute inset-0 h-full w-full object-cover" />
  ) : null;

const defaultSrc = "https://images.pexels.com/photos/323780/pexels-photo-323780.jpeg?auto=compress&cs=tinysrgb&w=1600";

const RiseWord = ({ word, index, count, progress }: { word: string; index: number; count: number; progress: MotionValue<number> }) => {
  const from = 0.7 + (index / Math.max(count, 1)) * 0.15;
  const y = useTransform(progress, [from, from + 0.12], ["110%", "0%"]);
  const rotate = useTransform(progress, [from, from + 0.12], [8, 0]);
  return (
    <div className="-mb-[0.15em] inline-block overflow-hidden pb-[0.15em] align-top">
      <motion.div style={{ y, rotate }} className="inline-block origin-bottom-left whitespace-nowrap">
        {word}
      </motion.div>
    </div>
  );
};

const WindowScene = ({ src = defaultSrc, videoSrc, alt = "", shape = "arch", children, after, revealTitle, wallClassName = "bg-background", length = 2.5, className = "" }: WindowZoomRevealProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const frame = resolve(shape);
  const { d, height } = frame;
  const maxScale = useMotionValue(12);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const zoom = useTransform(scrollYProgress, [0, 0.8], [0, 1]);
  const wallScale = useTransform(() => Math.pow(maxScale.get(), zoom.get()));
  const mediaScale = useTransform(zoom, [0, 1], [1.25, 1]);
  const textOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const textY = useTransform(scrollYProgress, [0, 0.2], [0, -60]);
  const afterOpacity = useTransform(scrollYProgress, [0.8, 1], [0, 1]);
  const afterY = useTransform(scrollYProgress, [0.8, 1], [30, 0]);
  const shade = useTransform(scrollYProgress, [0.65, 0.85], [0, 1]);
  const words = revealTitle ? revealTitle.split(" ") : [];

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const update = () => maxScale.set(coverScale({ d, height }, stage.clientWidth, stage.clientHeight));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(stage);
    return () => observer.disconnect();
  }, [d, height, maxScale]);

  const windowWidth = `min(28vw, ${5500 / frame.height}svh)`;
  const windowHeight = `(${windowWidth} * ${frame.height / 100})`;
  const mask = `linear-gradient(black, black), ${shapeUrl(frame)}`;

  return (
    <div ref={ref} style={{ height: `${length * 100}svh` }} className={cn("relative w-full", className)}>
      <div ref={stageRef} className="sticky top-0 h-[100svh] w-full overflow-hidden">
        <Media src={src} videoSrc={videoSrc} alt={alt} style={{ scale: mediaScale }} />
        {words.length > 0 && (
          <>
            <motion.div aria-hidden="true" style={{ opacity: shade }} className="pointer-events-none absolute inset-0 bg-black/40" />
            <div className="absolute inset-0 z-10 flex items-center justify-center p-8">
              <h3 aria-label={revealTitle} className="m-0 max-w-[14em] text-center text-6xl font-medium leading-[1.05] text-white md:text-8xl">
                {words.map((word, i) => (
                  <div key={i} aria-hidden="true" className="inline">
                    <RiseWord word={word} index={i} count={words.length} progress={scrollYProgress} />
                    {i < words.length - 1 && " "}
                  </div>
                ))}
              </h3>
            </div>
          </>
        )}
        {after && (
          <motion.div style={{ opacity: afterOpacity, y: afterY }} className="absolute inset-0 z-10">
            {after}
          </motion.div>
        )}
        <motion.div
          aria-hidden="true"
          style={{
            scale: wallScale,
            transformOrigin: `50% calc((100% - ${windowHeight}) * ${drop} + ${windowHeight} / 2)`,
            maskImage: mask,
            WebkitMaskImage: mask,
            maskSize: `100% 100%, ${windowWidth} auto`,
            WebkitMaskSize: `100% 100%, ${windowWidth} auto`,
            maskPosition: `0 0, 50% ${drop * 100}%`,
            WebkitMaskPosition: `0 0, 50% ${drop * 100}%`,
            maskRepeat: "no-repeat",
            WebkitMaskRepeat: "no-repeat",
            maskComposite: "exclude",
            WebkitMaskComposite: "xor",
          }}
          className={cn("pointer-events-none absolute inset-0 z-20", wallClassName)}
        />
        {children && (
          <motion.div
            style={{ opacity: textOpacity, y: textY, height: `calc((100% - ${windowHeight}) * ${drop})` }}
            className="absolute inset-x-0 top-0 z-30 flex items-center justify-center px-8"
          >
            {children}
          </motion.div>
        )}
      </div>
    </div>
  );
};

const WindowZoomReveal = (input: WindowZoomRevealProps) => {
  const desktop = useDesktop();
  const reduce = useReducedMotion();
  const props = { ...input, revealTitle: input.revealTitle ?? (input.after ? undefined : "Step inside") };

  if (desktop && !reduce) return <WindowScene {...props} />;

  const frame = resolve(props.shape ?? "arch");
  const url = shapeUrl(frame);

  return (
    <div className={cn("relative flex w-full flex-col items-center gap-8 py-8", props.wallClassName ?? "bg-background", props.className)}>
      {props.children && <div className="w-full px-6">{props.children}</div>}
      <div
        style={{ aspectRatio: `100 / ${frame.height}`, maskImage: url, WebkitMaskImage: url, maskSize: "100% 100%", WebkitMaskSize: "100% 100%" }}
        className="relative w-[70vw] max-w-md overflow-hidden"
      >
        <Media src={props.src ?? defaultSrc} videoSrc={props.videoSrc} alt={props.alt ?? ""} />
      </div>
      {props.revealTitle && <h3 className="m-0 w-full px-6 text-center text-5xl font-medium text-foreground">{props.revealTitle}</h3>}
      {props.after && <div className="w-full px-6">{props.after}</div>}
    </div>
  );
};

export default WindowZoomReveal;

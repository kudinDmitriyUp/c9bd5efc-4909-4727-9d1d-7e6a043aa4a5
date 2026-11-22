"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { animate, motion, useInView, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform, type MotionStyle, type MotionValue } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

const natureSway = [0.08, 0.494, 0.14, 1] as const;
const sineOut = [0.61, 1, 0.88, 1] as const;

const noiseTile = (seed: number) => {
  let s = seed;
  const rand = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
  let d = "";
  for (let y = 0; y < 12; y++) {
    for (let x = 0; x < 12; x++) {
      if (rand() < 0.5) d += `M${x} ${y}h1v1h-1z`;
    }
  }
  return `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12' shape-rendering='crispEdges'><path d='${d}'/></svg>`)}")`;
};

const tileA = noiseTile(7);
const tileB = noiseTile(31);
const angle = "100deg";
const band = "9%";

const whiteMask = [
  `linear-gradient(${angle}, #000 calc(var(--p) - ${band}), transparent calc(var(--p) - ${band}))`,
  `linear-gradient(${angle}, transparent calc(var(--p) - ${band}), #000 calc(var(--p) - ${band}), #000 var(--p), transparent var(--p))`,
  tileA,
].join(", ");

const edgeMask = [`linear-gradient(${angle}, transparent var(--p), #000 var(--p), #000 calc(var(--p) + ${band}), transparent calc(var(--p) + ${band}))`, tileB].join(", ");

const whiteStyle = {
  maskImage: whiteMask,
  WebkitMaskImage: whiteMask,
  maskSize: "100% 100%, 100% 100%, 0.84em 0.84em",
  WebkitMaskSize: "100% 100%, 100% 100%, 0.84em 0.84em",
  maskRepeat: "no-repeat, no-repeat, repeat",
  WebkitMaskRepeat: "no-repeat, no-repeat, repeat",
  maskComposite: "add, intersect",
  WebkitMaskComposite: "source-over, source-in",
};

const edgeStyle = {
  maskImage: edgeMask,
  WebkitMaskImage: edgeMask,
  maskSize: "100% 100%, 0.84em 0.84em",
  WebkitMaskSize: "100% 100%, 0.84em 0.84em",
  maskRepeat: "no-repeat, repeat",
  WebkitMaskRepeat: "no-repeat, repeat",
  maskComposite: "intersect",
  WebkitMaskComposite: "source-in",
};

interface PixelTextRevealProps {
  text?: string;
  as?: "h1" | "h2" | "h3" | "p";
  className?: string;
  scrub?: boolean;
  progress?: MotionValue<number>;
  ghost?: boolean;
  children?: ReactNode;
}

const PixelTextReveal = ({ text = "Design that ships",as = "h2", className, scrub = false, progress, ghost, children }: PixelTextRevealProps) => {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -35% 0px" });
  const timed = useMotionValue(0);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.9", "end 0.25"] });
  const smooth = useSpring(scrollYProgress, { stiffness: 90, damping: 26, restDelta: 0.0005 });
  const source = progress ?? (scrub ? smooth : timed);
  const p = useTransform(source, (v) => `${-10 + Math.min(1, Math.max(0, v)) * 120}%`);
  const shadow = scrub || Boolean(progress);
  const Tag = as;

  useEffect(() => {
    if (shadow || reduce || !inView) return;
    const controls = animate(timed, 1, { duration: 1.75, ease: sineOut });
    return () => controls.stop();
  }, [shadow, reduce, inView, timed]);

  if (reduce) {
    return (
      <div ref={ref}>
        <Tag className={className}>{text}</Tag>
      </div>
    );
  }

  return (
    <motion.div
      ref={ref}
      initial={shadow ? false : { y: "0.35em", opacity: 0 }}
      animate={shadow || inView ? { y: 0, opacity: 1 } : undefined}
      transition={{ duration: 1.4, ease: natureSway }}
      style={{ "--p": p } as unknown as MotionStyle}
      className="grid"
    >
      {(ghost ?? shadow) && (
        <Tag aria-hidden="true" className={cn(className, "pointer-events-none opacity-25 [grid-area:1/1] select-none")}>
          {children ?? text}
        </Tag>
      )}
      <Tag aria-label={children ? text : undefined} className={cn(className, "[grid-area:1/1]")} style={whiteStyle}>
        {children ?? text}
      </Tag>
      <Tag aria-hidden="true" className={cn(className, "pointer-events-none text-accent [grid-area:1/1] select-none")} style={edgeStyle}>
        {children ?? text}
      </Tag>
    </motion.div>
  );
};

export default PixelTextReveal;

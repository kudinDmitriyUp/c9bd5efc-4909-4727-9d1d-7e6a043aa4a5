"use client";

import { useEffect, useRef } from "react";
import { animate, motion, useInView, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { backOut } from "@/components/animation/PopWords";
import Media from "@/components/kit/Media";
import { useImageReady } from "@/components/kit/kitMotion";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

type PeelStickerProps = {
  imageSrc?: string;
  imageAlt?: string;
  cutout?: boolean;
  rotate?: number;
  delay?: number;
  scrub?: [number, number];
  className?: string;
};

const OUTLINE = "var(--title-stroke-color, var(--card))";
const outlineFilter = `drop-shadow(0.35vw 0 0 ${OUTLINE}) drop-shadow(-0.35vw 0 0 ${OUTLINE}) drop-shadow(0 0.35vw 0 ${OUTLINE}) drop-shadow(0 -0.35vw 0 ${OUTLINE})`;
const liftFilter = "drop-shadow(0 0.6vw 0.8vw color-mix(in srgb, var(--foreground) 28%, transparent))";

const RoundSticker = ({ imageSrc, imageAlt = "", rotate = 0, delay = 0, className }: PeelStickerProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const seen = useInView(ref, { once: true, margin: "0px 0px -5% 0px" });
  const inView = useImageReady(ref, seen) && seen;

  return (
    <div
      ref={ref}
      role={imageAlt ? "img" : undefined}
      aria-label={imageAlt || undefined}
      aria-hidden={imageAlt ? undefined : true}
      className={cn("relative select-none", className)}
    >
      <motion.div
        initial={reduce ? false : { scale: 0, rotate: rotate + 18, opacity: 0 }}
        animate={inView || reduce ? { scale: 1, rotate, opacity: 1 } : { scale: 0, rotate: rotate + 18, opacity: 0 }}
        transition={{ duration: 0.6, delay, ease: backOut(2.35), opacity: { duration: 0.2, delay } }}
        className="size-full overflow-hidden rounded-full shadow-[0_0_0_0.6vw_var(--title-stroke-color,var(--card))]"
      >
        <Media src={imageSrc} alt="" draggable={false} className="size-full object-cover" />
      </motion.div>
    </div>
  );
};

const CutoutSticker = ({ imageSrc, imageAlt = "", rotate = 0, delay = 0, scrub, className }: PeelStickerProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const timed = useMotionValue(1);
  const { scrollYProgress } = useScroll({ target: ref, offset: [[scrub?.[0] ?? 0, 0.5], [scrub?.[1] ?? 1, 0.5]] });
  const scrolled = useSpring(useTransform(scrollYProgress, [0, 1], [1, 0]), { stiffness: 120, damping: 30 });
  const peel = scrub && !reduce ? scrolled : timed;
  const seen = useInView(ref, { once: true, margin: "0px 0px -30% 0px" });
  const inView = useImageReady(ref, seen) && seen;
  const faceClip = useTransform(peel, (p) => `inset(${p * 100}% -30% -30% -30%)`);
  const flapClip = useTransform(peel, (p) => `inset(-30% -30% ${100 - p * 100}% -30%)`);
  const flapOrigin = useTransform(peel, (p) => p / 2);
  const lift = useTransform(peel, [0, 1], [1, 1.06]);

  useEffect(() => {
    if (reduce) {
      timed.set(0);
      return;
    }
    if (!inView || scrub) return;
    const controls = animate(timed, 0, { duration: 0.8, delay, ease: [0.33, 1, 0.68, 1] });
    return () => controls.stop();
  }, [inView, reduce, delay, timed, scrub]);

  const art = <Media src={imageSrc} alt="" draggable={false} style={{ filter: outlineFilter }} className="size-full object-contain" />;

  return (
    <motion.div
      ref={ref}
      role={imageAlt ? "img" : undefined}
      aria-label={imageAlt || undefined}
      aria-hidden={imageAlt ? undefined : true}
      style={{ rotate, scale: lift }}
      className={cn("relative select-none", className)}
    >
      <motion.div style={{ clipPath: faceClip, filter: liftFilter }} className="absolute inset-0">
        {art}
      </motion.div>
      <motion.div
        aria-hidden="true"
        style={{ clipPath: flapClip, scaleY: -1, originY: flapOrigin, filter: `brightness(0) invert(0.7) ${liftFilter}` }}
        className="pointer-events-none absolute inset-0"
      >
        {art}
      </motion.div>
    </motion.div>
  );
};

const DEFAULT_IMAGE = "https://images.pexels.com/photos/1179863/pexels-photo-1179863.jpeg?auto=compress&cs=tinysrgb&w=1200";

const PeelSticker = (rawProps: PeelStickerProps) => {
  const props = { ...rawProps, imageSrc: rawProps.imageSrc ?? DEFAULT_IMAGE };
  return props.cutout ? <CutoutSticker {...props} /> : <RoundSticker {...props} />;
};

export default PeelSticker;

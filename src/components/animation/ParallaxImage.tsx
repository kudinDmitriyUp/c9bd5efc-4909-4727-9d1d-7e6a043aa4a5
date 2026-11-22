"use client";

import { useEffect, useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { queueEarlyImages } from "@/components/kit/earlyImages";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { MotionMedia } from "@/components/kit/Media";
import { localMediaSrc } from "@/components/kit/mediaSrc";
import "@/components/kit/videoPlayback";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

type ParallaxImageProps = {
  src?: string;
  videoSrc?: string;
  alt?: string;
  className?: string;
  zoom?: number;
  drift?: number;
  priority?: boolean;
  poster?: string;
};

/**
 * Drop-in <img> replacement that scales down as it scrolls through view.
 * Fills its nearest positioned ancestor, which must clip (overflow-hidden).
 * Scale never drops below 1, so the box stays covered at every scroll position.
 * Pass videoSrc to render a muted autoplay loop instead of the image.
 */
const ParallaxImage = ({ src, videoSrc, alt = "", className = "", zoom = 11, drift, priority = false, poster }: ParallaxImageProps) => {
  const ref = useRef<HTMLImageElement & HTMLVideoElement>(null);
  useEffect(queueEarlyImages, []);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const zoomScale = useTransform(scrollYProgress, [0, 1], [1 + zoom / 100, 1]);
  const driftY = useTransform(scrollYProgress, [0, 1], [`${-(drift ?? 0) / 2}%`, `${(drift ?? 0) / 2}%`]);
  const scale = drift ? 1 + drift / 100 : zoomScale;
  const y = drift ? driftY : 0;

  const classes = cn("absolute inset-0 w-full h-full object-cover", className);

  if (videoSrc) {
    return (
      <motion.video
        ref={ref}
        src={localMediaSrc(videoSrc)}
        poster={localMediaSrc(poster)}
        aria-label={alt || undefined}
        style={{ scale, y }}
        className={classes}
        data-webild-media=""
        preload={priority ? "metadata" : "none"}
        autoPlay={priority}
        loop
        muted
        playsInline
      />
    );
  }

  return (
    <MotionMedia
      ref={ref}
      src={src}
      alt={alt}
      loading={priority ? undefined : "lazy"}
      decoding="async"
      fetchPriority={priority ? "high" : undefined}
      style={{ scale, y }}
      className={classes}
    />
  );
};

export default ParallaxImage;

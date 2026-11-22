"use client";

import { useRef } from "react";
import { motion, useMotionValue, useSpring, type MotionValue } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import Media from "@/components/kit/Media";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

// eslint-disable-next-line react-refresh/only-export-components
export const useHoverFollow = <T extends HTMLElement>() => {
  const ref = useRef<T>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 220, damping: 28, mass: 0.6 });
  const sy = useSpring(y, { stiffness: 220, damping: 28, mass: 0.6 });

  const onPointerMove = (event: React.PointerEvent<T>) => {
    if (event.pointerType !== "mouse" || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    x.set(event.clientX - rect.left);
    y.set(event.clientY - rect.top);
  };

  return { ref, onPointerMove, x: sx, y: sy };
};

type HoverFollowImageProps = {
  x?: MotionValue<number>;
  y?: MotionValue<number>;
  show?: boolean;
  active?: string | null;
  images?: { key: string; src?: string }[];
  className?: string;
  frameClassName?: string;
};

const DEFAULT_IMAGES = [
  { key: "a", src: "https://images.pexels.com/photos/39219673/pexels-photo-39219673.jpeg?auto=compress&cs=tinysrgb&w=1200" },
  { key: "b", src: "https://images.pexels.com/photos/8436617/pexels-photo-8436617.jpeg?auto=compress&cs=tinysrgb&w=1200" },
  { key: "c", src: "https://images.pexels.com/photos/10499488/pexels-photo-10499488.jpeg?auto=compress&cs=tinysrgb&w=1200" },
];

const HoverFollowImage = ({ x, y, show = true, active = "a", images = DEFAULT_IMAGES, className, frameClassName }: HoverFollowImageProps) => {
  const fallbackX = useMotionValue(40);
  const fallbackY = useMotionValue(40);
  return (
  <motion.div
    aria-hidden="true"
    style={{ x: x ?? fallbackX, y: y ?? fallbackY }}
    animate={{ opacity: show ? 1 : 0, scale: show ? 1 : 0.92 }}
    transition={{ duration: 0.35, ease: [0.17, 0.17, 0, 1] }}
    className={cn("pointer-events-none absolute left-0 top-0 z-10 hidden md:block", className)}
  >
    <div className={cn("relative -translate-y-1/2 aspect-[4/5] overflow-hidden", frameClassName)}>
      {images.filter((image) => image.src).map((image) => (
        <Media
          key={image.key}
          src={image.src}
          loading="lazy"
          decoding="async"
          alt=""
          className={cn("absolute inset-0 size-full object-cover transition-opacity duration-300", active === image.key ? "opacity-100" : "opacity-0")}
        />
      ))}
    </div>
  </motion.div>
  );
};

export default HoverFollowImage;

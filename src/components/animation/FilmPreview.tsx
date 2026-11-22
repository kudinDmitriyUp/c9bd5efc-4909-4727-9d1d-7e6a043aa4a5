"use client";

import { useRef, useState, type ReactNode } from "react";
import { motion, useAnimationFrame, useMotionValue, useReducedMotion, type MotionValue } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import Media from "@/components/kit/Media";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

const openEase = [0.34, 1, 0.64, 1] as const;
const closeEase = [0.36, 0, 0.66, 0] as const;
const stripEase = [0.645, 0.045, 0.355, 1] as const;

// eslint-disable-next-line react-refresh/only-export-components
export const useFilmPreview = <T extends HTMLElement>() => {
  const reduce = useReducedMotion();
  const listRef = useRef<T>(null);
  const pointer = useRef({ x: 0, y: 0, tracking: false });
  const [active, setActive] = useState<number | null>(null);
  const [shown, setShown] = useState(0);
  const [pressed, setPressed] = useState(false);

  const imageX = useMotionValue(0);
  const imageY = useMotionValue(0);
  const circleX = useMotionValue(0);
  const circleY = useMotionValue(0);
  const labelX = useMotionValue(0);
  const labelY = useMotionValue(0);

  const local = () => {
    const rect = listRef.current?.getBoundingClientRect();
    return rect ? { x: pointer.current.x - rect.left, y: pointer.current.y - rect.top } : { x: 0, y: 0 };
  };

  useAnimationFrame(() => {
    if (!pointer.current.tracking) return;
    const { x, y } = local();
    const step = (value: MotionValue<number>, target: number, lag: number) => value.set(reduce ? target : value.get() + (target - value.get()) / lag);
    step(imageX, x, 12);
    step(imageY, y, 12);
    step(circleX, x, 7);
    step(circleY, y, 7);
    step(labelX, x, 6);
    step(labelY, y, 6);
  });

  const listProps = {
    ref: listRef,
    onMouseEnter: (event: React.MouseEvent) => {
      pointer.current = { x: event.clientX, y: event.clientY, tracking: true };
      const { x, y } = local();
      [imageX, circleX, labelX].forEach((value) => value.jump(x));
      [imageY, circleY, labelY].forEach((value) => value.jump(y));
    },
    onMouseMove: (event: React.MouseEvent) => {
      pointer.current.x = event.clientX;
      pointer.current.y = event.clientY;
    },
    onMouseLeave: () => {
      pointer.current.tracking = false;
      setActive(null);
      setPressed(false);
    },
    onMouseDown: () => setPressed(true),
    onMouseUp: () => setPressed(false),
  };

  const enterRow = (index: number) => {
    setActive(index);
    setShown(index);
  };

  const layers = { reduce: Boolean(reduce), open: active !== null, shown, pressed, imageX, imageY, circleX, circleY, labelX, labelY };

  return { listProps, active, enterRow, layers };
};

type FilmPreviewLayersProps = {
  layers?: ReturnType<typeof useFilmPreview>["layers"];
  count?: number;
  renderSlide?: (index: number) => ReactNode;
  viewText?: string;
  frameClassName?: string;
  circleClassName?: string;
  labelClassName?: string;
};

const DEFAULT_SLIDES = [
  "https://images.pexels.com/photos/39219673/pexels-photo-39219673.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/8436617/pexels-photo-8436617.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/10499488/pexels-photo-10499488.jpeg?auto=compress&cs=tinysrgb&w=1200",
];

const defaultRenderSlide = (index: number) => (
  <Media key={index} src={DEFAULT_SLIDES[index % DEFAULT_SLIDES.length]} alt="" className="aspect-square w-full object-cover" />
);

const FilmPreviewLayers = ({ layers, count = DEFAULT_SLIDES.length, renderSlide = defaultRenderSlide, viewText = "View", frameClassName, circleClassName, labelClassName }: FilmPreviewLayersProps) => {
  if (!layers) return null;
  const { reduce, open, shown, pressed, imageX, imageY, circleX, circleY, labelX, labelY } = layers;
  const popTransition = { duration: 0.4, ease: open ? openEase : closeEase };

  return (
    <>
      <motion.div aria-hidden="true" style={{ x: imageX, y: imageY }} className="pointer-events-none absolute left-0 top-0 z-20">
        <motion.div
          initial={false}
          animate={{ scale: open ? 1 : 0 }}
          transition={popTransition}
          className={cn("aspect-square w-[clamp(10rem,27.5vw,25rem)] -translate-x-1/2 -translate-y-[52%] overflow-hidden", frameClassName)}
        >
          <motion.div
            initial={false}
            animate={{ y: `-${(shown * 100) / Math.max(count, 1)}%` }}
            transition={{ duration: reduce ? 0 : 0.6, ease: stripEase }}
            className="flex w-full flex-col"
          >
            {Array.from({ length: count }, (_, index) => renderSlide(index))}
          </motion.div>
        </motion.div>
      </motion.div>

      <motion.div aria-hidden="true" style={{ x: circleX, y: circleY }} className="pointer-events-none absolute left-0 top-0 z-30">
        <motion.div
          initial={false}
          animate={{ scale: open ? (pressed ? 1.4 : 1) : 0 }}
          transition={popTransition}
          className={cn("size-[clamp(3.75rem,5.5vw,5rem)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent", circleClassName)}
        />
      </motion.div>
      <motion.div aria-hidden="true" style={{ x: labelX, y: labelY }} className="pointer-events-none absolute left-0 top-0 z-40">
        <motion.p
          initial={false}
          animate={{ scale: open ? 1 : 0 }}
          transition={popTransition}
          className={cn("-translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-[length:var(--text-body)] leading-none text-accent-foreground", labelClassName)}
        >
          {viewText}
        </motion.p>
      </motion.div>
    </>
  );
};

export default FilmPreviewLayers;

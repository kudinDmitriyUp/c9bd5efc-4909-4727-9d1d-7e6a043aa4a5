"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";

type LoaderEstateKeyProps = {
  brand?: string;
  tagline?: string;
  loadingText?: string;
  onComplete?: () => void;
};

const EXPAND: [number, number, number, number] = [0.76, 0, 0.24, 1];
const SOFT: [number, number, number, number] = [0.25, 0.1, 0.25, 1];
const TOTAL = 3.1;
export const KEYHOLE = "M11 81.3A50 50 0 1 1 89 81.3L94.4 212L5.6 212Z";
const GROUND = `M-20000 -40000H20100V40212H-20000Z${KEYHOLE}`;

const LoaderEstateKey = ({
  brand = "Marlow & Keane",
  tagline = "Eleanor Marlow, private real estate, Austin TX",
  loadingText = "Loading",
  onComplete,
}: LoaderEstateKeyProps) => {
  const reduce = useReducedMotion();
  const [show, setShow] = useState(true);
  const finish = useRef(onComplete);
  const count = useMotionValue(0);
  const countText = useTransform(count, (v) => String(Math.round(v)).padStart(2, "0"));

  useEffect(() => {
    finish.current = onComplete;
  });

  useEffect(() => {
    if (reduce) {
      finish.current?.();
      return;
    }
    window.scrollTo(0, 0);
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    const counter = animate(count, 100, { duration: 1.8, ease: SOFT });
    const hide = window.setTimeout(() => setShow(false), (TOTAL + 1) * 1000);
    return () => {
      counter.stop();
      window.clearTimeout(hide);
      root.style.overflow = previous;
    };
  }, [reduce, count]);

  useEffect(() => {
    if (!show) document.documentElement.style.overflow = "";
  }, [show]);

  const chrome = {
    initial: { opacity: 0 },
    animate: { opacity: [0, 1, 1, 0] },
    transition: { duration: TOTAL, times: [0, 0.1, 0.645, 0.75], ease: "linear" as const },
  };

  return (
    <AnimatePresence onExitComplete={() => finish.current?.()}>
      {show && !reduce && (
        <motion.div
          key="loader"
          aria-hidden="true"
          exit={{ opacity: 1 }}
          transition={{ duration: 0 }}
          className="pointer-events-none fixed inset-0 z-[100000] overflow-hidden"
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.svg
              viewBox="0 0 100 212"
              overflow="visible"
              initial={{ scale: 0.15 }}
              animate={{ scale: [0.15, 0.15, 1, 1, 30] }}
              transition={{ duration: TOTAL, times: [0, 0.1, 0.55, 0.645, 1], ease: [SOFT, SOFT, "linear", EXPAND] }}
              onAnimationComplete={() => setShow(false)}
              className="aspect-[100/212] w-[clamp(6rem,11vw,10rem)] shrink-0 overflow-visible"
            >
              <path d={GROUND} fillRule="evenodd" className="fill-deep" />
              <motion.path
                d={KEYHOLE}
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0, 1, 1, 0] }}
                transition={{ duration: TOTAL, times: [0, 0.2, 0.4, 0.645, 0.72], ease: "linear" }}
                strokeWidth={0.7}
                className="fill-none stroke-accent"
              />
            </motion.svg>
          </div>

          <motion.div {...chrome} className="absolute inset-x-0 top-0 mx-auto flex w-[var(--container)] items-center justify-between gap-[1rem] pt-[1.75rem] text-deep-foreground lg:pt-[2.25rem]">
            <p className="truncate font-[family-name:var(--font-heading)] text-[length:var(--text-body)] uppercase leading-none tracking-[0.3em] lg:text-[length:var(--text-h3)]">{brand}</p>
            <div className="flex shrink-0 items-center gap-[1rem]">
              <p className="text-[length:var(--text-label)] uppercase leading-none tracking-[0.12em] text-deep-foreground/55">{loadingText}</p>
              <motion.p className="min-w-[3ch] text-right text-[length:var(--text-label)] leading-none tracking-[0.12em] tabular-nums">{countText}</motion.p>
            </div>
          </motion.div>

          <motion.div {...chrome} className="absolute inset-x-0 bottom-0 mx-auto flex w-[var(--container)] flex-col items-center gap-[1.5rem] pb-[2.25rem] text-center text-deep-foreground lg:pb-[2.5rem]">
            <p className="text-balance text-[length:var(--text-label)] uppercase leading-[1.5] tracking-[0.12em] text-deep-foreground/75">{tagline}</p>
            <div className="h-px w-[min(15rem,60%)] bg-deep-foreground/20" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LoaderEstateKey;

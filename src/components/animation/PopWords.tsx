"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

// eslint-disable-next-line react-refresh/only-export-components
export const backOut = (s: number) => (t: number) => {
  const u = t - 1;
  return u * u * ((s + 1) * u + s) + 1;
};

const noise = (i: number, seed: number) => {
  const x = Math.sin(i * 12.9898 + seed * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

type PopWordsProps = {
  text?: string;
  tag?: "h1" | "h2" | "h3" | "p";
  split?: "words" | "chars";
  className?: string;
  delay?: number;
  stagger?: number;
  duration?: number;
  overshoot?: number;
  immediate?: boolean;
  margin?: string;
  size?: string;
};

const PopWords = ({
  text = "Design that ships",
  tag = "h2",
  split = "words",
  className,
  delay = 0,
  stagger,
  duration = 0.72,
  overshoot = 2.35,
  immediate = false,
  margin = "0px 0px -12% 0px",
  size,
}: PopWordsProps) => {
  const ref = useRef<HTMLHeadingElement>(null);
  const [fit, setFit] = useState(1);
  const reduce = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || !size) return;
    let frame = 0;
    const measure = () => {
      const avail = el.clientWidth;
      const widest = Math.max(0, ...Array.from(el.querySelectorAll<HTMLElement>("[data-pop-word]")).map((w) => w.offsetWidth));
      if (!avail || !widest) return;
      setFit((prev) => {
        const next = Math.min(1, (prev * avail) / widest);
        return Math.abs(next - prev) > 0.01 ? Math.max(0.3, next * 0.99) : prev;
      });
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    let alive = true;
    document.fonts?.ready.then(() => alive && schedule());
    const observer = new ResizeObserver(schedule);
    observer.observe(el);
    return () => {
      alive = false;
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [text, size]);
  const inView = useInView(ref, { once: true, margin: margin as NonNullable<Parameters<typeof useInView>[1]>["margin"] });
  const show = immediate || inView;
  const words = text.split(/\s+/).filter(Boolean);
  const step = stagger ?? (split === "chars" ? 0.03 : 0.055);
  const ease = backOut(overshoot);
  const Tag = tag;
  let index = 0;

  const piece = (content: string, key: string, word = false) => {
    const i = index++;
    const from = { opacity: 0, scale: 0, y: 18 + noise(i, 1) * 22, rotate: -16 + noise(i, 2) * 32 };
    return (
      <motion.span
        key={key}
        aria-hidden="true"
        data-pop-word={word || undefined}
        className="inline-block origin-[50%_90%] will-change-transform"
        initial={reduce ? { opacity: 0 } : from}
        animate={show ? { opacity: 1, scale: 1, y: 0, rotate: 0 } : reduce ? { opacity: 0 } : from}
        transition={reduce ? { duration: 0.4, delay } : { duration, ease, delay: delay + i * step, opacity: { duration: duration * 0.4, delay: delay + i * step } }}
      >
        {content}
      </motion.span>
    );
  };

  return (
    <Tag ref={ref} aria-label={text} style={size ? { fontSize: `calc(${size} * ${fit})` } : undefined} className={cn(className)}>
      {words.map((word, w) => (
        <Fragment key={w}>
          {split === "chars" ? (
            <span aria-hidden="true" data-pop-word className="inline-block whitespace-nowrap">
              {Array.from(word).map((char, c) => piece(char, `${w}-${c}`))}
            </span>
          ) : (
            piece(word, `${w}`, true)
          )}
          {w < words.length - 1 ? " " : null}
        </Fragment>
      ))}
    </Tag>
  );
};

export default PopWords;

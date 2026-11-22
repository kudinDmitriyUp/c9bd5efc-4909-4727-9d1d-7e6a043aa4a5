"use client";

import { useEffect, useRef, useState } from "react";
import { animate, motion, useReducedMotion } from "motion/react";

type LoaderStackExpandProps = {
  brand?: string;
  images?: string[];
  imageClassName?: string;
  onComplete?: () => void;
};

const riseEase = [0.16, 1, 0.3, 1] as const;
const growEase = [0.76, 0, 0.24, 1] as const;

const START = 0.1;
const STEP = 0.18;
const RISE = 1.2;
const GROW_AFTER = 0.55;
const GROW = 1.3;
const FADE = 0.25;
const WAIT = 2;

const TILES = ["bg-card", "bg-secondary", "bg-accent", "bg-foreground"];

const LoaderStackExpand = ({ brand = "Studio", images, imageClassName = "", onComplete }: LoaderStackExpandProps) => {
  const reduce = useReducedMotion();
  const [done, setDone] = useState(false);
  const [ready, setReady] = useState(false);
  const [view] = useState(() => {
    if (typeof window === "undefined") return { h: 800, wide: true };
    return { h: window.innerHeight, wide: window.matchMedia("(min-width: 768px)").matches };
  });
  const complete = useRef(onComplete);
  const root = useRef<HTMLDivElement>(null);
  const cards = useRef<(HTMLDivElement | null)[]>([]);
  const frames = (images ?? []).slice(0, 5);
  const count = frames.length || TILES.length;
  const base = view.wide ? 0.3 : 0.5;
  const step = view.wide ? 0.035 : 0.04;
  const front = view.wide ? 0.56 : 0.72;
  const scaleOf = (i: number) => (i === count - 1 ? front : base + step * i);
  const below = (i: number) => (view.h * (1 + scaleOf(i))) / 2 + 24;
  const restOf = (i: number) => -(count - 1 - i) * view.h * 0.024;

  useEffect(() => {
    complete.current = onComplete;
  });

  const sources = frames.join("|");

  useEffect(() => {
    if (reduce) return;
    const list = sources ? sources.split("|") : [];
    let alive = true;
    const decode = Promise.all(
      list.map((src) => {
        const img = new Image();
        img.src = src;
        return img.decode().catch(() => undefined);
      }),
    );
    const cap = new Promise((resolve) => window.setTimeout(resolve, WAIT * 1000));
    Promise.race([decode, cap]).then(() => {
      if (alive) setReady(true);
    });
    return () => {
      alive = false;
    };
  }, [reduce, sources]);

  useEffect(() => {
    if (reduce) {
      setDone(true);
      complete.current?.();
      return;
    }
    if (!ready) return;
    const els = cards.current.slice(0, count);
    if (!root.current || els.some((el) => !el)) return;
    const startOf = (i: number) => START + i * STEP;
    const growAt = startOf(count - 1) + GROW_AFTER;
    const end = growAt + GROW;
    const controls = els.map((el, i) =>
      animate(el as HTMLDivElement, { y: restOf(i) }, { delay: startOf(i), duration: RISE, ease: riseEase }),
    );
    controls.push(animate(els[count - 1] as HTMLDivElement, { scale: 1 }, { delay: growAt, duration: GROW, ease: growEase }));
    controls.push(animate(root.current, { opacity: 0 }, { delay: end, duration: FADE, ease: "easeOut" }));
    let alive = true;
    Promise.all(controls).then(() => {
      if (!alive) return;
      setDone(true);
      complete.current?.();
    });
    return () => {
      alive = false;
      controls.forEach((c) => c.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduce, ready, count]);

  if (reduce || done) return null;

  return (
    <div ref={root} aria-hidden="true" className="pointer-events-none fixed inset-0 z-[100000] overflow-hidden bg-background">
      {brand && (
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: riseEase }}
          className="absolute left-[var(--gutter,1.5rem)] top-[1.5rem] font-[family-name:var(--font-heading)] text-[length:clamp(1rem,0.9rem+0.4vw,1.25rem)] [font-weight:var(--heading-weight)] leading-none tracking-[var(--heading-tracking)] text-foreground"
        >
          {brand}
        </motion.p>
      )}
      {Array.from({ length: count }, (_, i) => (
        <motion.div
          key={i}
          ref={(el) => void (cards.current[i] = el)}
          initial={{ y: below(i), scale: scaleOf(i) }}
          className={frames.length ? "absolute inset-0 overflow-hidden bg-card will-change-transform" : `absolute inset-0 will-change-transform ${TILES[i]}`}
        >
          {frames[i] && <img src={frames[i]} alt="" loading="eager" decoding="async" className={`size-full object-cover ${imageClassName}`} />}
        </motion.div>
      ))}
    </div>
  );
};

export default LoaderStackExpand;

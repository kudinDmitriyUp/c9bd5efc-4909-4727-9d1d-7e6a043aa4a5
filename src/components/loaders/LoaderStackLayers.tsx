"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

type LoaderStackLayersProps = {
  label?: string;
  onComplete?: () => void;
  layerClassNames?: string[];
  curtainClassNames?: [string, string, string];
  coverClassName?: string;
  intro?: ReactNode;
  liftAt?: number;
  doneAt?: number;
};

const CURTAINS: [string, string, string] = ["text-secondary", "text-accent", "text-primary"];

const LIFT_AT = 0.7;
const DONE_AT = 1.6;

const LAYERS = [
  { shape: "h-[18%] w-[92%] rounded-full bg-accent", rest: 0 },
  { shape: "h-[18%] w-[78%] rounded-full bg-card", rest: -4 },
  { shape: "h-[18%] w-[100%] rounded-full bg-secondary", rest: 3 },
  { shape: "h-[18%] w-[70%] rounded-full bg-background", rest: -2 },
  { shape: "h-[18%] w-[86%] rounded-full bg-accent", rest: 5 },
];

const Curtain = ({ delay, className }: { delay: number; className: string }) => {
  const left = useMotionValue(101);
  const right = useMotionValue(101);
  const centre = useMotionValue(101);
  const d = useTransform(() => `M -1 -1 L 101 -1 L 101 ${right.get()} Q 50 ${centre.get()} -1 ${left.get()} Z`);

  useEffect(() => {
    const corners = { duration: 0.55, delay, ease: [0.645, 0.045, 0.355, 1] as [number, number, number, number] };
    const a = animate(left, -1, corners);
    const b = animate(right, -1, corners);
    const c = animate(centre, -12, { duration: 0.72, delay, ease: [0.86, 0, 0.07, 1] });
    return () => [a, b, c].forEach((x) => x.stop());
  }, [delay, left, right, centre]);

  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className={cn("absolute inset-0 size-full", className)}>
      <motion.path d={d} fill="currentColor" />
    </svg>
  );
};

const LoaderStackLayers = ({ label, onComplete, layerClassNames, curtainClassNames = CURTAINS, coverClassName = "bg-primary", intro, liftAt = LIFT_AT, doneAt = DONE_AT }: LoaderStackLayersProps) => {
  const reduce = useReducedMotion();
  const [visible, setVisible] = useState(true);
  const [lifting, setLifting] = useState(false);
  const stack = useRef<HTMLDivElement>(null);
  const done = useRef(onComplete);

  useEffect(() => {
    done.current = onComplete;
  });

  useEffect(() => {
    if (reduce) {
      setVisible(false);
      done.current?.();
      return;
    }
    const timers = LAYERS.map((_, i) =>
      window.setTimeout(() => {
        if (stack.current) animate(stack.current, { scaleY: [1, 0.88, 1.03, 1], scaleX: [1, 1.06, 0.98, 1] }, { duration: 0.26, times: [0, 0.23, 0.54, 1] });
      }, (i * 0.09 + 0.28) * 1000)
    );
    timers.push(window.setTimeout(() => setLifting(true), liftAt * 1000));
    timers.push(
      window.setTimeout(() => {
        setVisible(false);
        done.current?.();
      }, doneAt * 1000)
    );
    return () => timers.forEach(window.clearTimeout);
  }, [reduce, liftAt, doneAt]);

  if (!visible || reduce) return null;

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[100000] overflow-hidden">
      {lifting ? (
        <>
          <Curtain delay={0.16} className={curtainClassNames[0]} />
          <Curtain delay={0.08} className={curtainClassNames[1]} />
          <Curtain delay={0} className={curtainClassNames[2]} />
        </>
      ) : (
        <div className={cn("absolute inset-0", coverClassName)} />
      )}
      <motion.div
        animate={lifting ? { y: "-70vh", scale: 0.9, opacity: 0 } : { y: 0 }}
        transition={{ duration: 0.4, ease: [0.55, 0.055, 0.675, 0.19] }}
        className="absolute inset-0 flex flex-col items-center justify-center gap-[1.5rem]"
      >
        {intro ?? (
        <>
        <div ref={stack} className="flex aspect-[1/0.9] w-[min(46vw,15rem)] origin-bottom flex-col-reverse items-center">
          {LAYERS.map((layer, i) => (
            <motion.div
              key={i}
              initial={{ y: "-80vh", scale: 0.8, opacity: 0, rotate: layer.rest + 12 }}
              animate={{ y: 0, scale: 1, opacity: 1, rotate: layer.rest }}
              transition={{
                y: { duration: 0.28, delay: i * 0.09, ease: [0.55, 0.085, 0.68, 0.53] },
                scale: { duration: 0.28, delay: i * 0.09 },
                opacity: { duration: 0.12, delay: i * 0.09 },
                rotate: { duration: 0.45, delay: i * 0.09 + 0.28, ease: [0.34, 1.9, 0.64, 1] },
              }}
              className={cn("shrink-0 shadow-[0_0_0_3px_var(--primary)]", layerClassNames?.[i] ?? layer.shape)}
            />
          ))}
        </div>
        {label && <p className="px-[var(--gutter)] text-center font-[family-name:var(--font-heading)] text-[length:max(1.5rem,var(--text-h3))] leading-[1] uppercase text-primary-foreground">{label}</p>}
        </>
        )}
      </motion.div>
    </div>
  );
};

export default LoaderStackLayers;

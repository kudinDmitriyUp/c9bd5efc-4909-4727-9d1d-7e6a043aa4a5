"use client";

import { useRef, useSyncExternalStore } from "react";
import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

type Step = {
  title: string;
  text: string;
  src?: string;
  videoSrc?: string;
  alt?: string;
};

interface StickyMediaStepsProps {
  steps?: Step[];
  side?: "left" | "right";
  backdrop?: boolean;
  className?: string;
  titleClassName?: string;
}

const px = (id: number) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=1600`;

const DEFAULT_STEPS: Step[] = [
  { title: "Identity", text: "Every project starts with the people behind it, shaped around their taste, their habits and how they want to be seen.", src: px(3184465) },
  { title: "Insight", text: "We study the details others skip, so each choice has a reason you can point to.", src: px(1571460) },
  { title: "Craft", text: "Made by hand, checked twice, and finished to a standard we would put our own name on.", src: px(10499488) },
];

const query = "(min-width: 768px)";
const subscribe = (onChange: () => void) => {
  const list = window.matchMedia(query);
  list.addEventListener("change", onChange);
  return () => list.removeEventListener("change", onChange);
};
const useDesktop = () => useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => false);

const clamp = (v: number) => Math.min(1, Math.max(0, v));
const pad = (n: number) => String(n).padStart(2, "0");

const StepMedia = ({ step, className }: { step: Step; className: string }) =>
  step.videoSrc ? (
    <video src={step.videoSrc} poster={step.src} aria-label={step.alt || undefined} className={className} autoPlay loop muted playsInline />
  ) : step.src ? (
    <img src={step.src} alt={step.alt ?? ""} className={className} />
  ) : null;

const CardLayer = ({ step, index, at }: { step: Step; index: number; at: MotionValue<number> }) => {
  const clipPath = useTransform(at, (s) => (index === 0 ? "inset(0%)" : `inset(${50 * (1 - clamp(s - index))}%)`));
  const scale = useTransform(at, (s) => (index === 0 ? 1 : 1.25 - 0.25 * clamp(s - index)));
  return (
    <motion.div style={{ clipPath, zIndex: index }} className="absolute inset-0 overflow-hidden">
      <motion.div style={{ scale }} className="absolute inset-0">
        <StepMedia step={step} className="absolute inset-0 h-full w-full object-cover" />
      </motion.div>
    </motion.div>
  );
};

const BackdropLayer = ({ step, index, count, at }: { step: Step; index: number; count: number; at: MotionValue<number> }) => {
  const opacity = useTransform(at, (s) => (index === count - 1 ? 1 : 1 - clamp(s - index - 1)));
  const y = useTransform(at, (s) => `${(index === 0 ? -50 * (1 - clamp(s)) : 0) + (index === count - 1 ? 50 * clamp(s - count) : 0)}%`);
  return (
    <motion.div style={{ opacity, y, zIndex: count - index }} className="absolute inset-0">
      <StepMedia step={step} className="absolute inset-0 h-full w-full object-cover" />
    </motion.div>
  );
};

const StepCopy = ({ step, index, count, titleClassName }: { step: Step; index: number; count: number; titleClassName: string }) => (
  <motion.div
    className="flex flex-col gap-6"
    initial={{ opacity: 0, y: 48 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ amount: 0.4 }}
    transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
  >
    <div className="flex items-baseline gap-2 text-2xl tabular-nums text-foreground">
      <p>{pad(index + 1)}</p>
      <p className="text-foreground/60">/ {pad(count)}</p>
    </div>
    <h3 className={cn("text-6xl font-medium text-foreground", titleClassName, !/(^|\s)leading-/.test(titleClassName) && "leading-[1.05]")}>{step.title}</h3>
    <p className="max-w-[28rem] text-lg leading-relaxed text-foreground/80">{step.text}</p>
  </motion.div>
);

const MobileStep = ({ step, index, count, titleClassName }: { step: Step; index: number; count: number; titleClassName: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "center center"] });
  const scale = useTransform(scrollYProgress, [0, 1], [reduce ? 1 : 1.5, 1]);
  return (
    <div data-index={index} className="flex flex-col gap-5">
      <div ref={ref} className="relative aspect-square w-full overflow-hidden rounded-xl bg-card">
        <motion.div style={{ scale }} className="absolute inset-0">
          <StepMedia step={step} className="absolute inset-0 h-full w-full object-cover" />
        </motion.div>
      </div>
      <StepCopy step={step} index={index} count={count} titleClassName={cn("text-4xl", titleClassName)} />
    </div>
  );
};

const StickyMediaSteps = ({ steps = DEFAULT_STEPS, side = "left", backdrop = true, className = "", titleClassName = "" }: StickyMediaStepsProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const desktop = useDesktop();
  const count = steps.length;
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const at = useTransform(scrollYProgress, (p) => p * (count + 1));
  const float = useTransform(at, (s) => (reduce ? "0svh" : `${-25 * (1 - clamp(s)) + 25 * clamp(s - count)}svh`));

  if (!desktop) {
    return (
      <div ref={ref} className={cn("relative flex w-full flex-col gap-[4rem]", className)}>
        {steps.map((step, i) => (
          <MobileStep key={i} step={step} index={i} count={count} titleClassName={titleClassName} />
        ))}
      </div>
    );
  }

  return (
    <div ref={ref} className={cn("relative w-full overflow-clip", className)}>
      {backdrop && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="sticky top-0 h-svh overflow-hidden">
            <div className="absolute -inset-6 opacity-40 blur-[0.8rem]">
              {steps.map((step, i) => (
                <BackdropLayer key={i} step={{ ...step, alt: "" }} index={i} count={count} at={at} />
              ))}
            </div>
          </div>
        </div>
      )}
      <div className={cn("relative flex gap-[6vw]", side === "right" && "flex-row-reverse")}>
        <div className="sticky top-0 flex h-svh w-1/2 items-center justify-center">
          <motion.div style={{ y: float }} className="relative aspect-square w-full max-w-[72svh] overflow-hidden rounded-xl bg-card">
            {steps.map((step, i) => (
              <CardLayer key={i} step={step} index={i} at={at} />
            ))}
          </motion.div>
        </div>
        <div className="w-1/2">
          {steps.map((step, i) => (
            <div key={i} data-index={i} className="flex h-svh min-h-[36rem] flex-col justify-center">
              <StepCopy step={step} index={i} count={count} titleClassName={titleClassName} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StickyMediaSteps;

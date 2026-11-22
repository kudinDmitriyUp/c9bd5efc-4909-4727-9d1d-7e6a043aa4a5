"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

interface RoundedCardRiseProps {
  under?: React.ReactNode;
  over?: React.ReactNode;
  inset?: number;
  startScale?: number;
  radius?: string;
  className?: string;
  overClassName?: string;
}

const query = "(min-width: 768px)";
const subscribe = (onChange: () => void) => {
  const list = window.matchMedia(query);
  list.addEventListener("change", onChange);
  return () => list.removeEventListener("change", onChange);
};
const useDesktop = () => useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => false);

const RisingScene = ({ under, over, inset = 25, startScale = 0.95, radius = "calc(var(--radius) * 3)", className = "", overClassName = "" }: RoundedCardRiseProps) => {
  const underRef = useRef<HTMLDivElement>(null);
  const overRef = useRef<HTMLDivElement>(null);
  const [top, setTop] = useState(0);

  useEffect(() => {
    const element = underRef.current;
    if (!element) return;
    const update = () => setTop(Math.min(0, window.innerHeight - element.offsetHeight));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  const { scrollYProgress } = useScroll({ target: overRef, offset: ["start end", "start start"] });
  const fromScale = Math.min(startScale, 1 - (inset / 100) * 0.7);
  const scale = useTransform(scrollYProgress, [0, 1], [fromScale, 1]);
  const clipPath = useTransform(scrollYProgress, (progress) =>
    progress >= 1 ? "inset(0% 0%)" : `inset(0% 0% round ${radius} ${radius} 0 0)`
  );

  return (
    <div className={cn("relative", className)}>
      <div ref={underRef} style={{ top }} className="sticky">
        {under}
      </div>
      <motion.div ref={overRef} style={{ scale, clipPath, marginTop: top < 0 ? "35svh" : "20svh" }} className={cn("relative z-10 origin-top bg-background", overClassName)}>
        {over}
      </motion.div>
    </div>
  );
};

const DEFAULT_UNDER = (
  <div className="flex h-svh items-center justify-center bg-card text-foreground">
    <h3 className="text-4xl font-semibold">Design that ships</h3>
  </div>
);

const DEFAULT_OVER = (
  <div className="flex h-svh items-center justify-center bg-background text-foreground">
    <p className="text-xl">Built for the long run.</p>
  </div>
);

const RoundedCardRise = (rawProps: RoundedCardRiseProps) => {
  const props = { ...rawProps, under: rawProps.under ?? DEFAULT_UNDER, over: rawProps.over ?? DEFAULT_OVER };
  const desktop = useDesktop();
  const reduce = useReducedMotion();

  if (desktop && !reduce) return <RisingScene {...props} />;

  return (
    <div className={cn("relative", props.className)}>
      {props.under}
      <div className={cn("relative bg-background", props.overClassName)}>{props.over}</div>
    </div>
  );
};

export default RoundedCardRise;

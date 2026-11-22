"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

interface SlideOverSectionsProps {
  under?: React.ReactNode;
  over?: React.ReactNode;
  shrink?: number;
  shade?: number;
  className?: string;
  overClassName?: string;
}

const DEFAULT_UNDER = (
  <div className="bg-card text-foreground rounded-theme p-6 h-svh flex flex-col justify-center">
    <h3 className="text-4xl font-medium">Design that ships</h3>
    <p className="text-base opacity-70">Scroll to slide the next section over</p>
  </div>
);

const DEFAULT_OVER = (
  <div className="bg-background text-foreground rounded-theme p-6 h-svh flex flex-col justify-center">
    <h3 className="text-4xl font-medium">Built for the long run</h3>
    <p className="text-base opacity-70">This section slides over the first</p>
  </div>
);

const SlideOverSections = ({ under = DEFAULT_UNDER, over = DEFAULT_OVER,shrink = 0.06, shade = 0.35, className = "", overClassName = "" }: SlideOverSectionsProps) => {
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
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1 - shrink]);
  const opacity = useTransform(scrollYProgress, [0, 1], [0, shade]);

  return (
    <div className={cn("relative", className)}>
      <motion.div ref={underRef} style={{ top, scale }} className="sticky origin-top">
        {under}
        <motion.div aria-hidden="true" style={{ opacity }} className="absolute inset-0 bg-foreground pointer-events-none" />
      </motion.div>
      <div ref={overRef} className={cn("relative z-10 bg-background", overClassName)}>
        {over}
      </div>
    </div>
  );
};

export default SlideOverSections;

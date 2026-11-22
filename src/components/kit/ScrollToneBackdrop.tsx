"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "motion/react";

type LayerProps = {
  tone: string;
  index: number;
  tops: RefObject<number[]>;
  scrollY: MotionValue<number>;
  span: number;
  reduce: boolean;
};

const toneOf = (element: Element) => element.getAttribute("data-tone") || "background";

const Layer = ({ tone, index, tops, scrollY, span, reduce }: LayerProps) => {
  const opacity = useTransform(scrollY, (y) => {
    if (index === 0) return 1;
    const top = tops.current[index];
    if (top === undefined) return 0;
    const vh = window.innerHeight;
    const progress = (y + vh - top) / (vh * span);
    if (reduce) return progress >= 0.5 ? 1 : 0;
    return Math.min(1, Math.max(0, progress));
  });
  return <motion.div style={{ opacity, backgroundColor: `var(--${tone})` }} className="absolute inset-0" />;
};

const ScrollToneBackdrop = ({ span = 0.3 }: { span?: number }) => {
  const reduce = useReducedMotion() ?? false;
  const { scrollY } = useScroll();
  const rootRef = useRef<HTMLDivElement>(null);
  const starts = useRef<Element[]>([]);
  const tops = useRef<number[]>([]);
  const [tones, setTones] = useState<string[]>([]);

  useEffect(() => {
    const scope = rootRef.current?.parentElement ?? document.body;
    const sections = Array.from(scope.querySelectorAll("[data-section]"));
    const zones: Element[] = [];
    sections.forEach((section, i) => {
      if (i === 0 || toneOf(section) !== toneOf(sections[i - 1])) zones.push(section);
    });
    starts.current = zones;
    const measure = () => {
      tops.current = starts.current.map((element) => element.getBoundingClientRect().top + window.scrollY);
    };
    measure();
    setTones(zones.map(toneOf));
    const observer = new ResizeObserver(measure);
    observer.observe(document.body);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={rootRef} aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10">
      {tones.map((tone, index) => (
        <Layer key={`${index}-${tone}`} tone={tone} index={index} tops={tops} scrollY={scrollY} span={span} reduce={reduce} />
      ))}
    </div>
  );
};

export default ScrollToneBackdrop;

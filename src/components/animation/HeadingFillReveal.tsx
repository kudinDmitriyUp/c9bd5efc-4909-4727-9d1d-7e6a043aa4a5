"use client";

import { useEffect, useRef, useState } from "react";
import { animate, motion, useInView, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

const expoOut = [0.16, 1, 0.3, 1] as const;

interface HeadingFillRevealProps {
  text?: string;
  tag?: "h1" | "h2" | "h3" | "p";
  className?: string;
  edgeColor?: string;
  delay?: number;
  margin?: string;
  play?: boolean;
}

const FillLine = ({ text, edgeColor, start, play, still }: { text: string; edgeColor: string; start: number; play: boolean; still: boolean }) => {
  const pos = useMotionValue(still ? 111 : -16);
  const backgroundImage = useTransform(
    pos,
    (p) =>
      `linear-gradient(97deg, currentColor 0%, currentColor ${p - 8}%, ${edgeColor} ${p}%, color-mix(in srgb, currentColor 40%, transparent) ${p + 8}%, color-mix(in srgb, currentColor 40%, transparent) 100%)`,
  );

  useEffect(() => {
    if (!play || still) return;
    const controls = animate(pos, 111, { duration: 1.5, ease: expoOut, delay: start });
    return () => controls.stop();
  }, [play, still, pos, start]);

  return (
    <motion.div
      className="inline-block whitespace-nowrap bg-clip-text pb-[0.12em] -mb-[0.12em] [-webkit-background-clip:text] [-webkit-text-fill-color:transparent]"
      style={{ backgroundImage }}
    >
      {text}
    </motion.div>
  );
};

const HeadingFillReveal = ({ text = "Design that ships and is built for the long run", tag = "h2", className = "", edgeColor = "var(--destructive, var(--accent))", delay = 0, margin = "0px 0px -8% 0px", play: playProp }: HeadingFillRevealProps) => {
  const ref = useRef<HTMLHeadingElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const reduce = Boolean(useReducedMotion());
  const inView = useInView(ref, { once: true, margin: margin as NonNullable<Parameters<typeof useInView>[1]>["margin"] });
  const [lines, setLines] = useState<string[] | null>(null);
  const words = text.split(/\s+/).filter(Boolean);

  useEffect(() => {
    const box = measureRef.current;
    if (!box) return;
    let frame = 0;
    const measure = () => {
      const groups: string[] = [];
      let lastTop = Number.NaN;
      Array.from(box.children).forEach((child) => {
        const el = child as HTMLElement;
        const word = (el.textContent ?? "").trim();
        if (!groups.length || Math.abs(el.offsetTop - lastTop) > 2) {
          groups.push(word);
          lastTop = el.offsetTop;
        } else {
          groups[groups.length - 1] += ` ${word}`;
        }
      });
      setLines((prev) => (prev && prev.join("\n") === groups.join("\n") ? prev : groups));
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    schedule();
    let alive = true;
    document.fonts.ready.then(() => alive && schedule());
    const observer = new ResizeObserver(schedule);
    observer.observe(box);
    return () => {
      alive = false;
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [text]);

  const play = playProp ?? inView;
  const Tag = tag === "p" ? "div" : tag;

  return (
    <Tag ref={ref} aria-label={text} className={cn("relative", className)}>
      <div
        ref={measureRef}
        aria-hidden="true"
        className={cn("pointer-events-none", lines ? "invisible" : "text-[color-mix(in_srgb,currentColor_40%,transparent)]")}
      >
        {words.flatMap((word, i) => [
          <div key={i} className="inline-block">
            {word}
          </div>,
          i < words.length - 1 ? " " : null,
        ])}
      </div>
      {lines && (
        <div aria-hidden="true" className="absolute inset-x-0 top-0">
          {lines.map((row, i) => (
            <div key={`${i}-${row}`} className="block">
              <FillLine text={row} edgeColor={edgeColor} start={delay + i * 0.1} play={play} still={reduce} />
            </div>
          ))}
        </div>
      )}
    </Tag>
  );
};

export default HeadingFillReveal;

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

interface ScrambleTextProps {
  text?: string;
  tag?: "h1" | "h2" | "h3" | "p";
  className?: string;
  trigger?: "view" | "hover";
  duration?: number;
}

const GLYPHS = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#%&*+=/<>";

const glyphFor = (char: string, index: number, frame: number) => {
  const hash = Math.abs(Math.sin((index + 1) * 12.9898 + frame * 78.233) * 43758.5453);
  const glyph = GLYPHS[Math.floor(hash) % GLYPHS.length];
  return char !== char.toUpperCase() ? glyph.toLowerCase() : glyph;
};

const ScrambleText = ({ text = "Design that ships",tag = "p", className = "", trigger = "view", duration = 0.8 }: ScrambleTextProps) => {
  const ref = useRef<HTMLHeadingElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef(0);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(trigger === "hover");
  const inView = useInView(ref, { once: true, amount: 0.2 });
  const reduce = useReducedMotion();

  const play = useCallback(() => {
    const output = outputRef.current;
    if (!output || reduce) {
      setDone(true);
      return;
    }
    cancelAnimationFrame(rafRef.current);
    setRunning(true);
    setDone(false);
    const start = performance.now();
    const chars = Array.from(text);
    const total = duration * 1000;
    const tick = (now: number) => {
      const progress = Math.min((now - start) / total, 1);
      const resolved = Math.floor(progress * chars.length);
      const frame = Math.floor((now - start) / 50);
      output.textContent = chars
        .map((char, i) => (i < resolved || char.trim() === "" ? char : glyphFor(char, i, frame)))
        .join("");
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setRunning(false);
        setDone(true);
      }
    };
    tick(start);
  }, [text, duration, reduce]);

  useEffect(() => {
    if (trigger === "view" && inView) play();
  }, [trigger, inView, play]);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const Tag = tag === "p" ? "div" : tag;

  return (
    <Tag
      ref={ref}
      aria-label={text}
      className={cn("relative", className)}
      onMouseEnter={trigger === "hover" && !running ? play : undefined}
    >
      <div aria-hidden="true" className={cn("block", !done && !reduce && "invisible")}>
        {text}
      </div>
      <div
        ref={outputRef}
        aria-hidden="true"
        className={cn("pointer-events-none absolute inset-0 block whitespace-pre-wrap", (done || !running) && "hidden")}
      />
    </Tag>
  );
};

export default ScrambleText;

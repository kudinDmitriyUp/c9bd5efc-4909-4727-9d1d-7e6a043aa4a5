"use client";

import { useLayoutEffect, useRef } from "react";
import { motion } from "motion/react";

type FitWordmarkProps = {
  words: string[];
  heightRatio?: number;
  rise?: { delay: number; stagger?: number };
  keepCase?: boolean;
  className?: string;
};

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const GAP = 0.28;

export default function FitWordmark({ words, heightRatio = 0.24, rise, keepCase = false, className }: FitWordmarkProps) {
  const ref = useRef<HTMLDivElement>(null);
  const parts = words.filter((w) => w.trim());
  const key = parts.join("|");

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ctx = document.createElement("canvas").getContext("2d");
    const fit = () => {
      const marks = [...el.querySelectorAll<HTMLElement>("[data-fit-word]")];
      const width = el.clientWidth;
      const current = parseFloat(getComputedStyle(el).fontSize);
      if (!marks.length || !width || !current || !ctx) return;
      const cs = getComputedStyle(marks[0]);
      ctx.font = `${cs.fontWeight} 100px ${cs.fontFamily}`;
      const sample = key.replace(/\|/g, "");
      const m = ctx.measureText(keepCase ? sample : sample.toUpperCase());
      const inkTop = m.actualBoundingBoxAscent / 100;
      const inkBottom = m.actualBoundingBoxDescent / 100;
      const ascent = (m.fontBoundingBoxAscent || m.actualBoundingBoxAscent) / 100;
      const descent = (m.fontBoundingBoxDescent || 0) / 100;
      const ink = inkTop + inkBottom;
      const wordsEm = marks.reduce((sum, mark) => sum + mark.offsetWidth, 0) / current;
      const room = Math.min(Math.max(innerHeight, 560) * heightRatio, width * 0.3);
      const size = Math.min(width / (wordsEm + GAP * (marks.length - 1)), room / ink);
      el.style.fontSize = `${Math.floor(size * 10) / 10}px`;
      el.style.setProperty("--fit-lh", `${ascent + descent}`);
      el.style.setProperty("--fit-top", `${inkTop - ascent + 0.02}em`);
      el.style.setProperty("--fit-bottom", `${inkBottom - descent + 0.02}em`);
    };
    fit();
    let alive = true;
    document.fonts?.ready.then(() => alive && fit());
    document.fonts?.addEventListener("loadingdone", fit);
    const observer = new ResizeObserver(fit);
    observer.observe(el);
    addEventListener("resize", fit);
    return () => {
      alive = false;
      observer.disconnect();
      document.fonts?.removeEventListener("loadingdone", fit);
      removeEventListener("resize", fit);
    };
  }, [key, heightRatio, keepCase]);

  if (!parts.length) return null;

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className={`pointer-events-none flex items-end text-[length:var(--text-wordmark)] ${parts.length > 1 ? "justify-between" : "justify-center"} ${className ?? ""}`}
    >
      {parts.map((word, i) => (
        <div key={word + i} className="shrink-0 overflow-y-clip">
          <motion.p
            data-fit-word
            initial={rise ? { y: "100%" } : false}
            animate={{ y: "0%" }}
            transition={rise ? { duration: 0.9, delay: rise.delay + i * (rise.stagger ?? 0.12), ease: EASE } : undefined}
            className="facet-wordmark w-max mb-[var(--fit-bottom)] mt-[var(--fit-top)] whitespace-nowrap leading-[var(--fit-lh)]"
          >
            {word}
          </motion.p>
        </div>
      ))}
    </div>
  );
}

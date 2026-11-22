"use client";

import { useEffect, useId, useRef, useState } from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

interface ArchedScrollingTextProps {
  text?: string;
  separator?: string;
  speed?: number;
  curve?: number;
  className?: string;
}

const PAD = " ";

const ArchedScrollingText = ({ text = "Design that ships", separator = "—", speed = 2, curve = 8, className = "" }: ArchedScrollingTextProps) => {
  const id = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGTextPathElement>(null);
  const measureRef = useRef<SVGTextElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0, fontSize: 16 });
  const [repeat, setRepeat] = useState(12);

  const bleed = size.fontSize * 2;
  const width = size.width + bleed * 2;
  const half = width / 2;
  const level = Math.min(Math.max(curve, 0), 10) / 10;
  const radius = level <= 0 ? half * 200 : Math.max(half * (1.01 + (1 - level) ** 2 * 16.99), half + 0.001);
  const drop = Math.max(radius - Math.sqrt(Math.max(radius * radius - half * half, 0)), 0);
  const edge = size.width / 2;
  const visibleDrop = level <= 0 ? 0 : Math.max(radius - Math.sqrt(Math.max(radius * radius - edge * edge, 0)), 0);
  const d = level <= 0 ? `M 0 ${drop} L ${width} ${drop}` : `M 0 ${drop} A ${radius} ${radius} 0 0 1 ${width} ${drop}`;

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const measure = () =>
      setSize({ width: wrap.clientWidth, height: wrap.clientHeight, fontSize: parseFloat(getComputedStyle(wrap).fontSize) || 16 });
    const observer = new ResizeObserver(measure);
    observer.observe(wrap);
    document.fonts?.ready.then(measure).catch(() => {});
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const wrap = wrapRef.current;
    const textPath = pathRef.current;
    const measureText = measureRef.current;
    if (!wrap || !textPath || !measureText || !size.width) return;

    const loop = Math.max(measureText.getComputedTextLength(), 1);
    const needed = Math.ceil((width * 1.6) / loop) + 2;
    if (needed > repeat) {
      setRepeat(needed);
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const widthFactor = 0.5 + 0.5 * Math.min(Math.max((window.innerWidth - 250) / 1750, 0), 1);
    const pxPerSecond = Math.max(speed * 100 * widthFactor, 1);
    let offset = 0;
    let last = performance.now();
    let frame = 0;
    let inView = true;

    const tick = (now: number) => {
      offset = (offset + ((now - last) / 1000) * pxPerSecond) % loop;
      last = now;
      textPath.setAttribute("startOffset", `${-offset}px`);
      frame = requestAnimationFrame(tick);
    };

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting === inView) return;
      inView = entry.isIntersecting;
      cancelAnimationFrame(frame);
      if (inView) {
        last = performance.now();
        frame = requestAnimationFrame(tick);
      }
    });
    observer.observe(wrap);
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [size, width, repeat, speed, text, separator]);

  const run = (count: number) =>
    Array.from({ length: count }, (_, index) => (
      <tspan key={index}>
        {text}
        {PAD}
        <tspan className="fill-primary">{separator}</tspan>
        {PAD}
      </tspan>
    ));

  return (
    <div
      ref={wrapRef}
      style={{ paddingBottom: visibleDrop }}
      className={cn("relative w-full overflow-x-clip text-7xl md:text-9xl font-medium tracking-tight whitespace-nowrap select-none", className)}
    >
      <p className="text-center opacity-0">{text}</p>
      <svg
        aria-hidden="true"
        focusable="false"
        width={width}
        height={size.height}
        viewBox={`0 0 ${width} ${size.height || 1}`}
        style={{ left: -bleed }}
        className="absolute top-0 block overflow-visible pointer-events-none"
      >
        <text ref={measureRef} className="invisible">
          {run(1)}
        </text>
        <path id={id} d={d} fill="none" />
        <g transform={`translate(0 ${size.fontSize})`}>
          <text className="fill-current" style={{ fontKerning: "none" }}>
            <textPath ref={pathRef} href={`#${id}`} startOffset="0px">
              {run(repeat)}
            </textPath>
          </text>
        </g>
      </svg>
    </div>
  );
};

export default ArchedScrollingText;

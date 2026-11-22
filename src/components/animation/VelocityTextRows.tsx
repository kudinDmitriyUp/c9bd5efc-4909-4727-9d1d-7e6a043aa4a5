"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

gsap.registerPlugin(ScrollTrigger);

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

interface VelocityTextRowsProps {
  rows?: string[];
  speed?: number;
  className?: string;
  textClassName?: string;
}

const COPIES = 6;
const MAX_SKEW = 12;

const DEFAULT_ROWS = ["Design that ships", "Built for the long run", "Clear structure"];

const VelocityTextRows = ({ rows = DEFAULT_ROWS,speed = 60, className = "", textClassName = "" }: VelocityTextRowsProps) => {
  const sized = /(^|\s)((sm|md|lg|xl|2xl):)?text-(\d|xs|sm|base|lg|xl|\[(length:|[\d.]|calc\(|clamp\(|min\(|max\())/.test(className);
  const weighted = /(^|\s)font-(thin|extralight|light|normal|medium|semibold|bold|black)/.test(className);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rowEls = Array.from(el.querySelectorAll<HTMLElement>("[data-row]"));
    const tracks = rowEls.map((row) => row.firstElementChild as HTMLElement);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let widths: number[] = [];
    const measure = () => {
      widths = tracks.map((track) => (track.firstElementChild as HTMLElement).offsetWidth);
    };
    measure();

    const offsets = tracks.map((_, index) => (index % 2 === 0 ? 0 : (widths[index] || 0) / 2));
    let velocity = 0;
    let direction = 1;
    let skew = 0;
    let lastY = window.scrollY;
    let visible = false;

    const tick = (_time: number, delta: number) => {
      if (!visible) return;
      const dt = Math.min(delta, 50) / 1000;
      const scrolled = window.scrollY - lastY;
      lastY = window.scrollY;
      const raw = dt > 0 ? scrolled / dt : 0;
      velocity += (raw - velocity) * 0.12;
      if (Math.abs(raw) > 20) direction = raw > 0 ? 1 : -1;
      const boost = 1 + Math.min(Math.abs(velocity) / 250, 8);
      skew += (gsap.utils.clamp(-MAX_SKEW, MAX_SKEW, -velocity / 120) - skew) * 0.1;
      tracks.forEach((track, index) => {
        const width = widths[index];
        if (!width) return;
        const sign = index % 2 === 0 ? -1 : 1;
        offsets[index] = (((offsets[index] + sign * direction * speed * boost * dt) % width) + width) % width;
        gsap.set(track, { x: -offsets[index], skewX: skew * sign });
      });
    };

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      lastY = window.scrollY;
    });
    const resize = new ResizeObserver(measure);

    const ctx = gsap.context(() => {
      tracks.forEach((track, index) => gsap.set(track, { x: -offsets[index] }));
      if (reduceMotion) return;
      observer.observe(el);
      resize.observe(el);
      gsap.ticker.add(tick);
      gsap.from(rowEls, {
        xPercent: (index) => (index % 2 === 0 ? -40 : 40),
        opacity: 0,
        duration: 1.4,
        ease: "expo.out",
        stagger: 0.1,
        scrollTrigger: { trigger: el, start: "top 80%", once: true },
      });
    }, el);

    return () => {
      gsap.ticker.remove(tick);
      observer.disconnect();
      resize.disconnect();
      ctx.revert();
    };
  }, [rows, speed]);

  return (
    <div ref={ref} className={cn("flex w-full flex-col gap-2 md:gap-4 overflow-x-clip select-none", className)}>
      {rows.map((row, index) => (
        <div key={index} data-row aria-label={row} className="w-full">
          <div aria-hidden="true" className="flex w-max will-change-transform">
            {Array.from({ length: COPIES }, (_, copy) => (
              <span key={copy} className={cn("flex items-center gap-6 md:gap-10 pr-6 md:pr-10 leading-tight tracking-tight whitespace-nowrap", !sized && "text-6xl md:text-9xl", !weighted && "font-semibold", textClassName)}>
                {row}
                <span className="text-primary">•</span>
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default VelocityTextRows;
